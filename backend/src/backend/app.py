from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator

from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from backend.auth import AuthService, GoogleIdentityClient, GoogleIdentityUnavailableError
from backend.config import Settings, SettingsLoader
from backend.crypto import DataCipher
from backend.database import Database
from backend.models import (
    GoogleSignInRequest,
    SpreadsheetCreate,
    SpreadsheetDocument,
    SpreadsheetSummary,
    SpreadsheetUpdate,
    UserView,
)
from backend.repositories import SessionRepository, SpreadsheetRepository, UserRepository


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
_logger = logging.getLogger(__name__)


class AppServices:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.database = Database(settings.database_path)
        self.users = UserRepository(self.database)
        self.sessions = SessionRepository(self.database)
        self.spreadsheets = SpreadsheetRepository(self.database, DataCipher(settings.encryption_secret))
        self.auth = AuthService(
            self.users,
            self.sessions,
            GoogleIdentityClient(settings),
        )


class AuthDependency:
    async def __call__(
        self,
        request: Request,
        spreadsheet_session: Annotated[str | None, Cookie()] = None,
        x_test_user: Annotated[str | None, Header()] = None,
    ) -> UserView:
        _services: AppServices = request.app.state.services
        if _services.settings.testing and x_test_user:
            return await _services.users.ensure_test_user(x_test_user)
        if not spreadsheet_session:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        _user = await _services.auth.user_for_session(spreadsheet_session)
        if _user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
        return _user


_current_user = AuthDependency()


def create_app(settings: Settings | None = None) -> FastAPI:
    _settings = settings or SettingsLoader.load()
    _services = AppServices(_settings)

    @asynccontextmanager
    async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
        await _services.database.initialize()
        yield

    _app = FastAPI(title="Spreadsheet.AI API", version="1.0.0", lifespan=_lifespan)
    _app.state.services = _services
    _app.add_middleware(
        CORSMiddleware,
        allow_origins=[_settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "X-Test-User", "X-Google-Sign-In"],
    )

    @_app.get("/up/health", response_class=PlainTextResponse)
    async def health() -> str:
        try:
            return "online" if await _services.database.healthcheck() else "offline"
        except Exception as _error:
            _logger.exception("Health check failed")
            return f"error: {_error}"

    @_app.post("/auth/google", response_model=UserView)
    async def google_sign_in(
        payload: GoogleSignInRequest,
        response: Response,
        x_google_sign_in: Annotated[str | None, Header()] = None,
    ) -> UserView:
        if not _settings.google_client_id:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Sign in with Google is not configured",
            )
        if x_google_sign_in != "google-identity-services":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid sign-in request")
        try:
            _user, _session_token = await _services.auth.sign_in_with_google(payload.credential)
        except GoogleIdentityUnavailableError as _error:
            _logger.error("Google identity verification is unavailable: %s", _error)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(_error)) from _error
        except ValueError as _error:
            _logger.warning("Sign in with Google failed: %s", _error)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(_error)) from _error
        response.set_cookie(
            "spreadsheet_session",
            _session_token,
            max_age=60 * 60 * 24 * 30,
            httponly=True,
            secure=_settings.secure_cookies,
            samesite="lax",
        )
        _logger.info("Session created for user_id=%s", _user.id)
        return _user

    @_app.get("/auth/me", response_model=UserView)
    async def me(user: Annotated[UserView, Depends(_current_user)]) -> UserView:
        return user

    @_app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
    async def logout(
        spreadsheet_session: Annotated[str | None, Cookie()] = None,
    ) -> Response:
        if spreadsheet_session:
            await _services.auth.logout(spreadsheet_session)
        _response = Response(status_code=status.HTTP_204_NO_CONTENT)
        _response.delete_cookie(
            "spreadsheet_session",
            httponly=True,
            secure=_settings.secure_cookies,
            samesite="lax",
        )
        return _response

    @_app.get("/api/spreadsheets", response_model=list[SpreadsheetSummary])
    async def list_spreadsheets(user: Annotated[UserView, Depends(_current_user)]) -> list[SpreadsheetSummary]:
        return await _services.spreadsheets.list_for_user(user.id)

    @_app.post("/api/spreadsheets", response_model=SpreadsheetDocument, status_code=status.HTTP_201_CREATED)
    async def create_spreadsheet(
        payload: SpreadsheetCreate,
        user: Annotated[UserView, Depends(_current_user)],
    ) -> SpreadsheetDocument:
        return await _services.spreadsheets.create(user.id, payload)

    @_app.get("/api/spreadsheets/{spreadsheet_id}", response_model=SpreadsheetDocument)
    async def get_spreadsheet(
        spreadsheet_id: str,
        user: Annotated[UserView, Depends(_current_user)],
    ) -> SpreadsheetDocument:
        _document = await _services.spreadsheets.get(user.id, spreadsheet_id)
        if _document is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spreadsheet not found")
        return _document

    @_app.put("/api/spreadsheets/{spreadsheet_id}", response_model=SpreadsheetDocument)
    async def update_spreadsheet(
        spreadsheet_id: str,
        payload: SpreadsheetUpdate,
        user: Annotated[UserView, Depends(_current_user)],
    ) -> SpreadsheetDocument:
        _document = await _services.spreadsheets.update(user.id, spreadsheet_id, payload)
        if _document is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spreadsheet not found")
        return _document

    @_app.delete("/api/spreadsheets/{spreadsheet_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_spreadsheet(
        spreadsheet_id: str,
        user: Annotated[UserView, Depends(_current_user)],
    ) -> Response:
        if not await _services.spreadsheets.delete(user.id, spreadsheet_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spreadsheet not found")
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return _app


app = create_app()
