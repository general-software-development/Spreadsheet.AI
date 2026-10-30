from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

from backend.ai import (
    AssistMutationService,
    FreeGeminiModelPolicy,
    GeminiGateway,
    GeminiPromptFactory,
    GeminiResult,
    GeminiRetryPolicy,
    GeminiUnavailableError,
)
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
                    "sheets": [{"name": "Data", "cells": [{"cell": "A1", "value": "Income"}, {"cell": "A2", "value": "1000"}]}],
                },
            )
        if "Spreadsheet.AI Assist" in system_instruction:
            return GeminiResult(
                model=FreeGeminiModelPolicy.PRIMARY,
                payload={
                    "message": "I added a calculated value in B1.",
                    "actions": [
                        {
                            "type": "set_cells",
                            "sheet_id": "Sheet 1",
                            "name": "",
                            "cells": [{"cell": "b1", "value": 84}],
                        }
                    ],
                },
            )
        if "Spreadsheet.AI Interpret" in system_instruction:
            if "Calculate my taxes" in user_text:
                return GeminiResult(
                    model=FreeGeminiModelPolicy.PRIMARY,
                    payload={
                        "answer": "I need the tax jurisdiction and tax year before I can calculate a reliable tax amount.",
                        "calculations": ["Spreadsheet income available for calculation: 42."],
                        "observations": ["A1 contains 42."],
                        "conclusions": [],
                        "limitations": ["No jurisdiction, tax year, filing status, or tax brackets are supplied."],
                    },
                )
            return GeminiResult(
                model=FreeGeminiModelPolicy.PRIMARY,
                payload={
                    "answer": "The sheet contains one numeric observation.",
                    "calculations": [],
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

    def test_applies_gemini_cell_entry_arrays(self) -> None:
        _workbook = WorkbookData(
            version=1,
            activeSheetId="sheet-1",
            sheets=[SheetData(id="sheet-1", name="Sheet 1", cells={})],
        )
        _service = AssistMutationService()
        _updated, _changes = _service.apply(
            _workbook,
            [
                {
                    "type": "set_cells",
                    "sheet_id": "sheet-1",
                    "cells": [
                        {"cell": "A1", "value": "Header"},
                        {"cell": "B2", "value": "=1+1"},
                        {"cell": "Z99", "value": "blocked"},
                    ],
                }
            ],
        )
        assert _updated.sheets[0].cells == {"A1": "Header", "B2": "=1+1"}
        assert _changes == ["Sheet 1!A1", "Sheet 1!B2"]

    def test_resolves_visible_sheet_name_normalizes_cells_and_accepts_scalar_values(self) -> None:
        _workbook = WorkbookData(
            version=1,
            activeSheetId="internal-tab-id",
            sheets=[SheetData(id="internal-tab-id", name="Revenue 2026", cells={})],
        )
        _service = AssistMutationService()
        _updated, _changes = _service.apply(
            _workbook,
            [
                {
                    "type": "set_cells",
                    "sheet_id": "revenue 2026",
                    "cells": [
                        {"cell": " b2 ", "value": 125},
                        {"cell": "c2", "value": True},
                    ],
                }
            ],
        )
        assert _updated.sheets[0].cells == {"B2": "125", "C2": "TRUE"}
        assert _changes == ["Revenue 2026!B2", "Revenue 2026!C2"]

    def test_current_sheet_default_applies_when_model_omits_or_misstates_sheet_reference(self) -> None:
        _workbook = WorkbookData(
            version=1,
            activeSheetId="active-tab",
            sheets=[
                SheetData(id="active-tab", name="Current", cells={}),
                SheetData(id="other-tab", name="Other", cells={}),
            ],
        )
        _service = AssistMutationService()
        _updated, _changes = _service.apply(
            _workbook,
            [{"type": "set_cells", "sheet_id": "not-a-real-sheet", "cells": [{"cell": "a1", "value": "ok"}]}],
            default_sheet_id="active-tab",
        )
        assert _updated.sheets[0].cells["A1"] == "ok"
        assert _updated.sheets[1].cells == {}
        assert _changes == ["Current!A1"]

    def test_structured_cell_schemas_avoid_dynamic_object_properties(self) -> None:
        _assist_schema = GeminiPromptFactory.assist(
            "Sheet",
            WorkbookData(
                version=1,
                activeSheetId="sheet-1",
                sheets=[SheetData(id="sheet-1", name="Sheet 1", cells={})],
            ),
            "Update A1",
            "A1",
            "current_sheet",
        )[2]
        _create_schema = GeminiPromptFactory.create_spreadsheet("A,B\n1,2")[2]

        for _schema in (_assist_schema, _create_schema):
            _encoded = json.dumps(_schema)
            assert "additionalProperties" not in _encoded

        _assist_cells = _assist_schema["properties"]["actions"]["items"]["properties"]["cells"]
        assert _assist_cells["type"] == "array"
        assert _assist_cells["items"]["required"] == ["cell", "value"]
        assert _assist_schema["properties"]["actions"]["items"]["required"] == ["type", "sheet_id", "name", "cells"]

        _create_cells = _create_schema["properties"]["sheets"]["items"]["properties"]["cells"]
        assert _create_cells["type"] == "array"
        assert _create_cells["items"]["required"] == ["cell", "value"]

    def test_interpret_is_question_first_and_allows_read_only_calculations(self) -> None:
        _system, _prompt, _schema = GeminiPromptFactory.interpret(
            "Income",
            WorkbookData(
                version=1,
                activeSheetId="sheet-1",
                sheets=[SheetData(id="sheet-1", name="Income", cells={"A1": "Income", "A2": "50000"})],
            ),
            "Calculate my taxes based on this spreadsheet",
            "A2",
            "current_sheet",
        )

        assert "answer the exact question directly" in _system
        assert "does not limit calculations or analysis" in _system
        assert "jurisdiction" in _system and "tax year" in _system
        assert "Calculate my taxes based on this spreadsheet" in _prompt
        assert "answer" in _schema["properties"]
        assert "calculations" in _schema["properties"]
        assert _schema["properties"]["conclusions"].get("minItems") is None

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

                _tax_interpret = await _client.post(
                    "/api/ai/messages",
                    json={"mode": "interpret", "message": "Calculate my taxes based on this spreadsheet", "spreadsheet_id": _spreadsheet_id},
                    headers=_headers,
                )
                assert _tax_interpret.status_code == 200
                assert "jurisdiction and tax year" in _tax_interpret.json()["message"]
                assert _tax_interpret.json()["sections"]["calculations"] == ["Spreadsheet income available for calculation: 42."]
                assert _tax_interpret.json()["sections"]["conclusions"] == []
                assert _tax_interpret.json()["spreadsheet"] is None

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
                assert _assist.json()["spreadsheet"]["workbook"]["sheets"][0]["cells"]["B1"] == "84"
                assert _assist.json()["changed_ranges"] == ["Sheet 1!B1"]
                assert _assist.json()["sections"]["status"] == ["Applied 1 spreadsheet change(s)."]
                _persisted_after_assist = await _client.get(
                    f"/api/spreadsheets/{_spreadsheet_id}",
                    headers=_headers,
                )
                assert _persisted_after_assist.status_code == 200
                assert _persisted_after_assist.json()["workbook"]["sheets"][0]["cells"]["B1"] == "84"

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


class _FakeGeminiHTTPClient:
    responses: list[httpx.Response] = []
    request_bodies: list[dict[str, object]] = []

    def __init__(self, timeout: float) -> None:
        self._timeout = timeout

    async def __aenter__(self) -> "_FakeGeminiHTTPClient":
        return self

    async def __aexit__(self, exc_type, exc_value, traceback) -> None:
        return None

    async def post(
        self,
        url: str,
        headers: dict[str, str],
        json: dict[str, object],
    ) -> httpx.Response:
        assert url.startswith("https://generativelanguage.googleapis.com/")
        assert headers["x-goog-api-key"] == "test-key"
        self.request_bodies.append(json)
        return self.responses.pop(0)


class TestGeminiGatewayUnit:
    @pytest.mark.anyio
    async def test_uses_current_generation_config_and_falls_back_on_model_format_error(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        _success_payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": '{"ok": true}'}],
                    }
                }
            ]
        }
        _FakeGeminiHTTPClient.responses = [
            httpx.Response(
                400,
                json={"error": {"message": "Model-specific request format rejected"}},
            ),
            httpx.Response(200, json=_success_payload),
        ]
        _FakeGeminiHTTPClient.request_bodies = []
        monkeypatch.setattr("backend.ai.httpx.AsyncClient", _FakeGeminiHTTPClient)

        _gateway = GeminiGateway()
        _result = await _gateway.generate_json(
            "test-key",
            "System instruction",
            "Return ok",
            {
                "type": "object",
                "properties": {"ok": {"type": "boolean"}},
                "required": ["ok"],
            },
            max_output_tokens=32,
        )

        assert _result.model == FreeGeminiModelPolicy.FALLBACK
        assert _result.payload == {"ok": True}
        assert len(_FakeGeminiHTTPClient.request_bodies) == 2
        for _body in _FakeGeminiHTTPClient.request_bodies:
            _generation_config = _body["generationConfig"]
            assert isinstance(_generation_config, dict)
            assert "temperature" not in _generation_config
            assert "topP" not in _generation_config
            assert "topK" not in _generation_config
            assert "responseSchema" not in _generation_config
            _response_format = _generation_config["responseFormat"]
            assert isinstance(_response_format, dict)
            _text_format = _response_format["text"]
            assert isinstance(_text_format, dict)
            assert _text_format["mimeType"] == "APPLICATION_JSON"
            assert "additionalProperties" not in json.dumps(_text_format["schema"])

    @pytest.mark.anyio
    async def test_retries_transient_503_before_falling_back(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        _success_payload = {
            "candidates": [{"content": {"parts": [{"text": '{"ok": true}'}]}}]
        }
        _FakeGeminiHTTPClient.responses = [
            httpx.Response(503, json={"error": {"message": "High demand"}}),
            httpx.Response(503, json={"error": {"message": "High demand"}}),
            httpx.Response(503, json={"error": {"message": "High demand"}}),
            httpx.Response(200, json=_success_payload),
        ]
        _FakeGeminiHTTPClient.request_bodies = []

        async def _skip_sleep(_delay: float) -> None:
            return None

        monkeypatch.setattr("backend.ai.httpx.AsyncClient", _FakeGeminiHTTPClient)
        monkeypatch.setattr("backend.ai.anyio.sleep", _skip_sleep)

        _gateway = GeminiGateway()
        _result = await _gateway.generate_json(
            "test-key",
            "System instruction",
            "Return ok",
            {
                "type": "object",
                "properties": {"ok": {"type": "boolean"}},
                "required": ["ok"],
            },
            max_output_tokens=32,
        )

        assert _result.model == FreeGeminiModelPolicy.FALLBACK
        assert _result.payload == {"ok": True}
        assert len(_FakeGeminiHTTPClient.request_bodies) == GeminiRetryPolicy.MAX_ATTEMPTS_PER_MODEL + 1

    @pytest.mark.anyio
    async def test_reports_temporary_overload_after_all_free_model_retries_fail(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        _total_attempts = GeminiRetryPolicy.MAX_ATTEMPTS_PER_MODEL * len(FreeGeminiModelPolicy.ALLOWED)
        _FakeGeminiHTTPClient.responses = [
            httpx.Response(503, json={"error": {"message": "High demand"}})
            for _index in range(_total_attempts)
        ]
        _FakeGeminiHTTPClient.request_bodies = []

        async def _skip_sleep(_delay: float) -> None:
            return None

        monkeypatch.setattr("backend.ai.httpx.AsyncClient", _FakeGeminiHTTPClient)
        monkeypatch.setattr("backend.ai.anyio.sleep", _skip_sleep)

        _gateway = GeminiGateway()
        with pytest.raises(GeminiUnavailableError, match="temporarily overloaded"):
            await _gateway.generate_json(
                "test-key",
                "System instruction",
                "Return ok",
                {
                    "type": "object",
                    "properties": {"ok": {"type": "boolean"}},
                    "required": ["ok"],
                },
                max_output_tokens=32,
            )

        assert len(_FakeGeminiHTTPClient.request_bodies) == _total_attempts

