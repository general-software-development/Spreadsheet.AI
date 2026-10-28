from __future__ import annotations

from pathlib import Path

import httpx
import pytest

from backend.ai import AssistMutationService, FreeGeminiModelPolicy, GeminiResult
from backend.app import create_app
from backend.config import Settings
from backend.models import SheetData, WorkbookData


@pytest.fixture
def anyio_backend():
    return "asyncio"


class FakeGeminiGateway:
    def __init__(self) -> None:
        self.generate_calls = 0

    async def validate_key(self, api_key: str) -> None:
        if api_key != "valid-gemini-key-123":
            raise ValueError("unexpected test key")

    async def generate_json(
        self,
        api_key: str,
        system_instruction: str,
        user_text: str,
        response_schema: dict[str, object],
        max_output_tokens: int = 4096,
    ) -> GeminiResult:
        assert api_key == "valid-gemini-key-123"
        assert response_schema
        assert max_output_tokens > 0
        assert user_text
        self.generate_calls += 1
        if "Spreadsheet.AI Assist creating" in system_instruction:
            return GeminiResult(
                model=FreeGeminiModelPolicy.PRIMARY,
                payload={
                    "title": "Imported data",
                    "message": "Created a structured spreadsheet.",
                    "sheets": [{"name": "Data", "cells": {"A1": "Income", "A2": "1000"}}],
                },
            )
        if "Spreadsheet.AI Assist" in system_instruction:
            return GeminiResult(
                model=FreeGeminiModelPolicy.PRIMARY,
                payload={
                    "message": "I added a calculated value in B1.",
                    "actions": [{"type": "set_cells", "sheet_id": "sheet-1", "cells": {"B1": "=A1*2"}}],
                },
            )
        if "Spreadsheet.AI Interpret" in system_instruction:
            return GeminiResult(
                model=FreeGeminiModelPolicy.PRIMARY,
                payload={
                    "summary": "The sheet contains one numeric observation.",
                    "observations": ["A1 contains 42."],
                    "conclusions": ["The available sample is very small.", "More observations are needed for a trend."],
                    "limitations": ["Only one populated cell is available."],
                },
            )
        return GeminiResult(
            model=FreeGeminiModelPolicy.FALLBACK,
            payload={
                "overview": "Start by identifying the populated cells.",
                "steps": ["Read A1.", "Check its unit or header."],
                "concepts": ["A single value has no trend by itself."],
                "checks": ["Verify what A1 represents."],
            },
        )


class TestAIMutationUnit:
    def test_applies_only_valid_grid_mutations(self) -> None:
        _workbook = WorkbookData(
            version=1,
            activeSheetId="sheet-1",
            sheets=[SheetData(id="sheet-1", name="Sheet 1", cells={"A1": "1"})],
        )
        _service = AssistMutationService()
        _updated, _changes = _service.apply(
            _workbook,
            [{"type": "set_cells", "sheet_id": "sheet-1", "cells": {"B2": "2", "Z99": "blocked"}}],
        )
        assert _updated.sheets[0].cells["B2"] == "2"
        assert "Z99" not in _updated.sheets[0].cells
        assert _changes == ["Sheet 1!B2"]
        assert _workbook.sheets[0].cells == {"A1": "1"}

    def test_free_model_policy_rejects_non_allowlisted_models(self) -> None:
        assert FreeGeminiModelPolicy.is_allowed("gemini-3.8-flash")
        assert FreeGeminiModelPolicy.is_allowed("gemini-3.5-flash-lite")
        assert not FreeGeminiModelPolicy.is_allowed("gemini-4-argon")


class TestAIIntegration:
    @pytest.mark.anyio
    async def test_settings_permissions_modes_and_ai_creation(self, tmp_path: Path) -> None:
        _settings = Settings(
            database_path=tmp_path / "ai.db",
            encryption_secret="ai-integration-secret",
            frontend_origin="http://localhost:3000",
            google_client_id="test-google-client-id",
            secure_cookies=False,
            testing=True,
        )
        _app = create_app(_settings)
        _gateway = FakeGeminiGateway()
        _app.state.services.ai._gateway = _gateway
        async with _app.router.lifespan_context(_app):
            _transport = httpx.ASGITransport(app=_app)
            async with httpx.AsyncClient(transport=_transport, base_url="http://test") as _client:
                _headers = {"X-Test-User": "ai-user@example.com"}
                _settings_before = await _client.get("/api/settings/gemini", headers=_headers)
                assert _settings_before.json()["configured"] is False

                _saved_settings = await _client.put(
                    "/api/settings/gemini",
                    json={"api_key": "valid-gemini-key-123"},
                    headers=_headers,
                )
                assert _saved_settings.status_code == 200
                assert _saved_settings.json()["primary_model"] == "gemini-3.8-flash"
                assert "valid-gemini-key-123" not in _settings.database_path.read_bytes().decode("latin1")

                _payload = {
                    "title": "Research data",
                    "workbook": {
                        "version": 1,
                        "activeSheetId": "sheet-1",
                        "sheets": [{"id": "sheet-1", "name": "Sheet 1", "cells": {"A1": "42"}}],
                    },
                }
                _created = await _client.post("/api/spreadsheets", json=_payload, headers=_headers)
                _spreadsheet_id = _created.json()["id"]

                _denied = await _client.post(
                    "/api/ai/messages",
                    json={"mode": "assist", "message": "Double A1", "spreadsheet_id": _spreadsheet_id},
                    headers=_headers,
                )
                assert _denied.status_code == 403
                assert _gateway.generate_calls == 0

                _interpret = await _client.post(
                    "/api/ai/messages",
                    json={"mode": "interpret", "message": "What can I conclude?", "spreadsheet_id": _spreadsheet_id},
                    headers=_headers,
                )
                assert _interpret.status_code == 200
                assert len(_interpret.json()["sections"]["conclusions"]) == 2
                assert _interpret.json()["spreadsheet"] is None

                _explain = await _client.post(
                    "/api/ai/messages",
                    json={"mode": "explain", "message": "Teach me how to read this", "spreadsheet_id": _spreadsheet_id},
                    headers=_headers,
                )
                assert _explain.status_code == 200
                assert "steps" in _explain.json()["sections"]
                assert _explain.json()["spreadsheet"] is None

                _wrong_user_grant = await _client.post(
                    "/api/ai/access-grants",
                    json={"spreadsheet_id": _spreadsheet_id},
                    headers={"X-Test-User": "other@example.com"},
                )
                assert _wrong_user_grant.status_code == 404

                _grant = await _client.post(
                    "/api/ai/access-grants",
                    json={"spreadsheet_id": _spreadsheet_id},
                    headers=_headers,
                )
                assert _grant.status_code == 201
                _grant_token = _grant.json()["token"]
                assert _grant_token not in _settings.database_path.read_bytes().decode("latin1")

                _assist = await _client.post(
                    "/api/ai/messages",
                    json={
                        "mode": "assist",
                        "message": "Double A1",
                        "spreadsheet_id": _spreadsheet_id,
                        "access_token": _grant_token,
                        "selected_cell": "A1",
                    },
                    headers=_headers,
                )
                assert _assist.status_code == 200
                assert _assist.json()["spreadsheet"]["workbook"]["sheets"][0]["cells"]["B1"] == "=A1*2"

                _revoked = await _client.post(
                    "/api/ai/access-grants/revoke",
                    json={"token": _grant_token},
                    headers=_headers,
                )
                assert _revoked.status_code == 204
                _denied_after_revoke = await _client.post(
                    "/api/ai/messages",
                    json={
                        "mode": "assist",
                        "message": "Change it again",
                        "spreadsheet_id": _spreadsheet_id,
                        "access_token": _grant_token,
                    },
                    headers=_headers,
                )
                assert _denied_after_revoke.status_code == 403

                _create_grant = await _client.post("/api/ai/create-grants", headers=_headers)
                _ai_created = await _client.post(
                    "/api/ai/create-spreadsheet",
                    json={"message": "Income\n1000", "access_token": _create_grant.json()["token"]},
                    headers=_headers,
                )
                assert _ai_created.status_code == 201
                assert _ai_created.json()["spreadsheet"]["title"] == "Imported data"
                _reused_create_grant = await _client.post(
                    "/api/ai/create-spreadsheet",
                    json={"message": "Try again", "access_token": _create_grant.json()["token"]},
                    headers=_headers,
                )
                assert _reused_create_grant.status_code == 403

                _removed = await _client.delete("/api/settings/gemini", headers=_headers)
                assert _removed.status_code == 204
                _settings_after = await _client.get("/api/settings/gemini", headers=_headers)
                assert _settings_after.json()["configured"] is False
