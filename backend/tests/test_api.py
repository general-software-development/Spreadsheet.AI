from __future__ import annotations

from pathlib import Path

import httpx
import pytest

from backend.app import create_app
from backend.auth import GoogleIdentityClient, GoogleProfile
from backend.config import Settings


class TestApi:
    @pytest.fixture
    async def client(self, tmp_path: Path):
        _settings = Settings(
            database_path=tmp_path / "test.db",
            encryption_secret="integration-test-secret",
            frontend_origin="http://localhost:3000",
            google_client_id="test-google-client-id",
            secure_cookies=False,
            testing=True,
        )
        _app = create_app(_settings)
        async with _app.router.lifespan_context(_app):
            _transport = httpx.ASGITransport(app=_app)
            async with httpx.AsyncClient(transport=_transport, base_url="http://test") as _client:
                yield _client

    @pytest.mark.anyio
    async def test_health_and_spreadsheet_crud(self, client: httpx.AsyncClient) -> None:
        _headers = {"X-Test-User": "researcher@example.com"}
        _health = await client.get("/up/health")
        assert _health.status_code == 200
        assert _health.text == "online"

        _logout = await client.post("/auth/logout")
        assert _logout.status_code == 204
        assert "spreadsheet_session=" in _logout.headers.get("set-cookie", "")

        _payload = {
            "title": "Research data",
            "workbook": {
                "version": 1,
                "activeSheetId": "sheet-1",
                "sheets": [{"id": "sheet-1", "name": "Sheet 1", "cells": {"A1": "42"}}],
            },
        }
        _created = await client.post("/api/spreadsheets", json=_payload, headers=_headers)
        assert _created.status_code == 201
        _created_body = _created.json()
        _spreadsheet_id = _created_body["id"]
        assert _created_body["workbook"]["sheets"][0]["cells"]["A1"] == "42"

        _listed = await client.get("/api/spreadsheets", headers=_headers)
        assert _listed.status_code == 200
        assert len(_listed.json()) == 1

        _other_headers = {"X-Test-User": "other@example.com"}
        _other_list = await client.get("/api/spreadsheets", headers=_other_headers)
        assert _other_list.status_code == 200
        assert _other_list.json() == []
        _other_get = await client.get(f"/api/spreadsheets/{_spreadsheet_id}", headers=_other_headers)
        assert _other_get.status_code == 404

        _payload["title"] = "Updated research data"
        _payload["workbook"]["sheets"][0]["cells"]["B2"] = "=A1*2"
        _updated = await client.put(f"/api/spreadsheets/{_spreadsheet_id}", json=_payload, headers=_headers)
        assert _updated.status_code == 200
        assert _updated.json()["title"] == "Updated research data"

        _fetched = await client.get(f"/api/spreadsheets/{_spreadsheet_id}", headers=_headers)
        assert _fetched.status_code == 200
        assert _fetched.json()["workbook"]["sheets"][0]["cells"]["B2"] == "=A1*2"

        _deleted = await client.delete(f"/api/spreadsheets/{_spreadsheet_id}", headers=_headers)
        assert _deleted.status_code == 204
        _missing = await client.get(f"/api/spreadsheets/{_spreadsheet_id}", headers=_headers)
        assert _missing.status_code == 404

    @pytest.mark.anyio
    async def test_sign_in_with_google_creates_session(
        self,
        client: httpx.AsyncClient,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        async def _verify_credential(_client: GoogleIdentityClient, credential: str) -> GoogleProfile:
            assert credential == "signed-google-id-token"
            return GoogleProfile(
                subject="google-user-123",
                email="user@example.com",
                name="Example User",
            )

        monkeypatch.setattr(GoogleIdentityClient, "verify_credential", _verify_credential)

        _forbidden = await client.post("/auth/google", json={"credential": "signed-google-id-token"})
        assert _forbidden.status_code == 403

        _signed_in = await client.post(
            "/auth/google",
            json={"credential": "signed-google-id-token"},
            headers={"X-Google-Sign-In": "google-identity-services"},
        )
        assert _signed_in.status_code == 200
        assert _signed_in.json()["email"] == "user@example.com"
        assert "spreadsheet_session=" in _signed_in.headers.get("set-cookie", "")

        _me = await client.get("/auth/me")
        assert _me.status_code == 200
        assert _me.json()["display_name"] == "Example User"
