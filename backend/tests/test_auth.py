from __future__ import annotations

import base64
import json
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from backend.auth import GoogleIdentityClient
from backend.config import Settings


def _base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _unsigned_int(value: int) -> str:
    _size = max(1, (value.bit_length() + 7) // 8)
    return _base64url(value.to_bytes(_size, "big"))


class GoogleTokenFactory:
    def __init__(self) -> None:
        self._private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        _numbers = self._private_key.public_key().public_numbers()
        self.jwk: dict[str, Any] = {
            "kty": "RSA",
            "kid": "test-key",
            "alg": "RS256",
            "use": "sig",
            "n": _unsigned_int(_numbers.n),
            "e": _unsigned_int(_numbers.e),
        }

    def create(self, audience: str) -> str:
        _header = _base64url(json.dumps({"alg": "RS256", "kid": "test-key"}, separators=(",", ":")).encode())
        _claims = {
            "iss": "https://accounts.google.com",
            "aud": audience,
            "sub": "google-subject-1",
            "email": "person@example.com",
            "email_verified": True,
            "name": "Person Example",
            "exp": int((datetime.now(UTC) + timedelta(minutes=10)).timestamp()),
        }
        _payload = _base64url(json.dumps(_claims, separators=(",", ":")).encode())
        _signed = f"{_header}.{_payload}".encode("ascii")
        _signature = self._private_key.sign(_signed, padding.PKCS1v15(), hashes.SHA256())
        return f"{_header}.{_payload}.{_base64url(_signature)}"


class TestGoogleIdentityClient:
    @pytest.fixture
    def settings(self, tmp_path: Path) -> Settings:
        return Settings(
            database_path=tmp_path / "auth.db",
            encryption_secret="test-secret",
            frontend_origin="http://localhost:3000",
            google_client_id="test-client-id",
            secure_cookies=False,
            testing=True,
        )

    @pytest.mark.anyio
    async def test_verifies_signed_google_id_token(self, settings: Settings) -> None:
        _factory = GoogleTokenFactory()
        _client = GoogleIdentityClient(settings)
        _client._key_set = (_factory.jwk,)
        _client._key_set_expires_at = time.monotonic() + 60

        _profile = await _client.verify_credential(_factory.create("test-client-id"))

        assert _profile.subject == "google-subject-1"
        assert _profile.email == "person@example.com"
        assert _profile.name == "Person Example"

    @pytest.mark.anyio
    async def test_rejects_wrong_audience(self, settings: Settings) -> None:
        _factory = GoogleTokenFactory()
        _client = GoogleIdentityClient(settings)
        _client._key_set = (_factory.jwk,)
        _client._key_set_expires_at = time.monotonic() + 60

        with pytest.raises(ValueError, match="audience"):
            await _client.verify_credential(_factory.create("wrong-client-id"))
