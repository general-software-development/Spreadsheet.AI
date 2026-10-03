from __future__ import annotations

import json
import logging
import secrets
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import anyio

from backend.config import Settings
from backend.crypto import TokenHasher
from backend.models import UserView
from backend.repositories import OAuthStateRepository, SessionRepository, UserRepository


_logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class GoogleProfile:
    subject: str
    email: str
    name: str


class GoogleOAuthClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def authorization_url(self, state: str) -> str:
        _query = urllib.parse.urlencode(
            {
                "client_id": self._settings.google_client_id,
                "redirect_uri": self._settings.google_redirect_uri,
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "access_type": "online",
                "prompt": "select_account",
            }
        )
        return f"https://accounts.google.com/o/oauth2/v2/auth?{_query}"

    async def exchange_code(self, code: str) -> GoogleProfile:
        if not self._settings.google_client_id or not self._settings.google_client_secret:
            raise RuntimeError("Google OAuth is not configured")
        return await anyio.to_thread.run_sync(self._exchange_code_sync, code)

    def _exchange_code_sync(self, code: str) -> GoogleProfile:
        _body = urllib.parse.urlencode(
            {
                "code": code,
                "client_id": self._settings.google_client_id,
                "client_secret": self._settings.google_client_secret,
                "redirect_uri": self._settings.google_redirect_uri,
                "grant_type": "authorization_code",
            }
        ).encode("utf-8")
        _request = urllib.request.Request(
            "https://oauth2.googleapis.com/token",
            data=_body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        with urllib.request.urlopen(_request, timeout=10) as _response:
            _token_payload = json.loads(_response.read().decode("utf-8"))
        _access_token = str(_token_payload["access_token"])
        _profile_request = urllib.request.Request(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {_access_token}"},
        )
        with urllib.request.urlopen(_profile_request, timeout=10) as _profile_response:
            _profile = json.loads(_profile_response.read().decode("utf-8"))
        if not _profile.get("email_verified", False):
            raise RuntimeError("Google account email is not verified")
        return GoogleProfile(
            subject=str(_profile["sub"]),
            email=str(_profile["email"]),
            name=str(_profile.get("name") or _profile["email"]),
        )


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        sessions: SessionRepository,
        oauth_states: OAuthStateRepository,
        google: GoogleOAuthClient,
    ) -> None:
        self._users = users
        self._sessions = sessions
        self._oauth_states = oauth_states
        self._google = google

    async def begin_google_login(self, return_path: str) -> tuple[str, str]:
        _state = secrets.token_urlsafe(32)
        _state_hash = await TokenHasher.digest(_state)
        await self._oauth_states.create(
            _state_hash,
            return_path,
            datetime.now(UTC) + timedelta(minutes=10),
        )
        return _state, await self._google.authorization_url(_state)

    async def finish_google_login(self, code: str, state: str) -> tuple[UserView, str, str]:
        _state_hash = await TokenHasher.digest(state)
        _return_path = await self._oauth_states.consume(_state_hash)
        if _return_path is None:
            raise ValueError("OAuth state is invalid or expired")
        _profile = await self._google.exchange_code(code)
        _user = await self._users.upsert_google_user(_profile.subject, _profile.email, _profile.name)
        _session_token = secrets.token_urlsafe(48)
        await self._sessions.create(
            await TokenHasher.digest(_session_token),
            _user.id,
            datetime.now(UTC) + timedelta(days=30),
        )
        _logger.info("Google login completed for user_id=%s", _user.id)
        return _user, _session_token, _return_path

    async def user_for_session(self, session_token: str) -> UserView | None:
        return await self._sessions.get_user(await TokenHasher.digest(session_token))

    async def logout(self, session_token: str) -> None:
        await self._sessions.delete(await TokenHasher.digest(session_token))
