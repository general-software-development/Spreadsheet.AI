from __future__ import annotations

import base64
import binascii
import json
import logging
import secrets
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import anyio
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from backend.config import Settings
from backend.crypto import TokenHasher
from backend.models import UserView
from backend.repositories import SessionRepository, UserRepository


_logger = logging.getLogger(__name__)
_GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


class GoogleIdentityUnavailableError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class GoogleProfile:
    subject: str
    email: str
    name: str


@dataclass(frozen=True, slots=True)
class GoogleKeySet:
    keys: tuple[dict[str, Any], ...]
    max_age_seconds: int


class JwtCodec:
    @staticmethod
    def decode_segment(segment: str) -> bytes:
        _padding = "=" * (-len(segment) % 4)
        try:
            return base64.urlsafe_b64decode((segment + _padding).encode("ascii"))
        except (ValueError, UnicodeEncodeError, binascii.Error) as _error:
            raise ValueError("Invalid Google ID token encoding") from _error

    @classmethod
    def decode_json_segment(cls, segment: str) -> dict[str, Any]:
        try:
            _value = json.loads(cls.decode_segment(segment).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as _error:
            raise ValueError("Invalid Google ID token JSON") from _error
        if not isinstance(_value, dict):
            raise ValueError("Invalid Google ID token JSON")
        return _value


class GoogleIdentityClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._key_set: tuple[dict[str, Any], ...] = ()
        self._key_set_expires_at = 0.0
        self._key_lock = anyio.Lock()

    async def verify_credential(self, credential: str) -> GoogleProfile:
        if not self._settings.google_client_id:
            raise RuntimeError("Sign in with Google is not configured")

        _header = self._decode_header(credential)
        _key_id = str(_header.get("kid") or "")
        if not _key_id:
            raise ValueError("Google ID token is missing a key identifier")

        _key_set = await self._get_key_set()
        if not self._has_key(_key_set, _key_id):
            _key_set = await self._get_key_set(force_refresh=True)
        return await anyio.to_thread.run_sync(self._verify_credential_sync, credential, _key_set)

    def _decode_header(self, credential: str) -> dict[str, Any]:
        _parts = credential.split(".")
        if len(_parts) != 3:
            raise ValueError("Invalid Google ID token")
        return JwtCodec.decode_json_segment(_parts[0])

    async def _get_key_set(self, force_refresh: bool = False) -> tuple[dict[str, Any], ...]:
        async with self._key_lock:
            if not force_refresh and self._key_set and time.monotonic() < self._key_set_expires_at:
                return self._key_set
            _result = await anyio.to_thread.run_sync(self._fetch_key_set_sync)
            self._key_set = _result.keys
            self._key_set_expires_at = time.monotonic() + max(_result.max_age_seconds, 60)
            return self._key_set

    def _fetch_key_set_sync(self) -> GoogleKeySet:
        _request = urllib.request.Request(_GOOGLE_JWKS_URL, headers={"Accept": "application/json"})
        try:
            with urllib.request.urlopen(_request, timeout=10) as _response:
                _payload = json.loads(_response.read().decode("utf-8"))
                _cache_control = _response.headers.get("Cache-Control", "")
        except (urllib.error.URLError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError) as _error:
            raise GoogleIdentityUnavailableError("Google signing keys are unavailable") from _error
        _keys_value = _payload.get("keys") if isinstance(_payload, dict) else None
        if not isinstance(_keys_value, list) or not _keys_value:
            raise GoogleIdentityUnavailableError("Google signing keys are unavailable")
        _keys = tuple(_key for _key in _keys_value if isinstance(_key, dict))
        if not _keys:
            raise GoogleIdentityUnavailableError("Google signing keys are unavailable")
        return GoogleKeySet(keys=_keys, max_age_seconds=self._parse_max_age(_cache_control))

    @staticmethod
    def _parse_max_age(cache_control: str) -> int:
        for _directive in cache_control.split(","):
            _name, _separator, _value = _directive.strip().partition("=")
            if _separator and _name.lower() == "max-age" and _value.isdigit():
                return int(_value)
        return 300

    @staticmethod
    def _has_key(key_set: tuple[dict[str, Any], ...], key_id: str) -> bool:
        return any(str(_key.get("kid") or "") == key_id for _key in key_set)

    def _verify_credential_sync(
        self,
        credential: str,
        key_set: tuple[dict[str, Any], ...],
    ) -> GoogleProfile:
        _parts = credential.split(".")
        if len(_parts) != 3:
            raise ValueError("Invalid Google ID token")

        _header = JwtCodec.decode_json_segment(_parts[0])
        _claims = JwtCodec.decode_json_segment(_parts[1])
        if _header.get("alg") != "RS256":
            raise ValueError("Unsupported Google ID token signature algorithm")

        _key_id = str(_header.get("kid") or "")
        _jwk = next((_key for _key in key_set if str(_key.get("kid") or "") == _key_id), None)
        if _jwk is None:
            raise ValueError("Google signing key was not found")

        self._verify_signature(_parts, _jwk)
        self._verify_claims(_claims)

        _subject = str(_claims.get("sub") or "").strip()
        _email = str(_claims.get("email") or "").strip()
        _name = str(_claims.get("name") or _email).strip()
        if not _subject or not _email:
            raise ValueError("Google ID token is missing required profile claims")
        if _claims.get("email_verified") is not True:
            raise ValueError("Google account email is not verified")

        return GoogleProfile(subject=_subject, email=_email, name=_name or _email)

    def _verify_signature(self, parts: list[str], jwk: dict[str, Any]) -> None:
        if jwk.get("kty") != "RSA":
            raise ValueError("Unsupported Google signing key")
        if jwk.get("alg") not in (None, "RS256") or jwk.get("use") not in (None, "sig"):
            raise ValueError("Unsupported Google signing key")
        _modulus = self._decode_unsigned_int(str(jwk.get("n") or ""))
        _exponent = self._decode_unsigned_int(str(jwk.get("e") or ""))
        if _modulus <= 0 or _exponent <= 0:
            raise ValueError("Invalid Google signing key")
        _public_key = rsa.RSAPublicNumbers(_exponent, _modulus).public_key()
        _signed_data = f"{parts[0]}.{parts[1]}".encode("ascii")
        _signature = JwtCodec.decode_segment(parts[2])
        try:
            _public_key.verify(_signature, _signed_data, padding.PKCS1v15(), hashes.SHA256())
        except InvalidSignature as _error:
            raise ValueError("Invalid Google ID token signature") from _error

    def _verify_claims(self, claims: dict[str, Any]) -> None:
        _issuer = str(claims.get("iss") or "")
        if _issuer not in _GOOGLE_ISSUERS:
            raise ValueError("Invalid Google ID token issuer")

        _audience = claims.get("aud")
        if _audience != self._settings.google_client_id:
            raise ValueError("Invalid Google ID token audience")

        _now = int(datetime.now(UTC).timestamp())
        try:
            _expires_at = int(claims["exp"])
        except (KeyError, TypeError, ValueError) as _error:
            raise ValueError("Google ID token is missing a valid expiration") from _error
        if _expires_at <= _now:
            raise ValueError("Google ID token has expired")

        _not_before = claims.get("nbf")
        if _not_before is not None:
            try:
                _not_before_value = int(_not_before)
            except (TypeError, ValueError) as _error:
                raise ValueError("Google ID token has an invalid not-before claim") from _error
            if _not_before_value > _now + 60:
                raise ValueError("Google ID token is not valid yet")

    @staticmethod
    def _decode_unsigned_int(value: str) -> int:
        if not value:
            return 0
        return int.from_bytes(JwtCodec.decode_segment(value), "big")


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        sessions: SessionRepository,
        google: GoogleIdentityClient,
    ) -> None:
        self._users = users
        self._sessions = sessions
        self._google = google

    async def sign_in_with_google(self, credential: str) -> tuple[UserView, str]:
        _profile = await self._google.verify_credential(credential)
        _user = await self._users.upsert_google_user(_profile.subject, _profile.email, _profile.name)
        _session_token = secrets.token_urlsafe(48)
        await self._sessions.create(
            await TokenHasher.digest(_session_token),
            _user.id,
            datetime.now(UTC) + timedelta(days=30),
        )
        _logger.info("Sign in with Google completed for user_id=%s", _user.id)
        return _user, _session_token

    async def user_for_session(self, session_token: str) -> UserView | None:
        return await self._sessions.get_user(await TokenHasher.digest(session_token))

    async def logout(self, session_token: str) -> None:
        await self._sessions.delete(await TokenHasher.digest(session_token))
