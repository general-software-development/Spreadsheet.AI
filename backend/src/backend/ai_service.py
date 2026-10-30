from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from backend.ai import (
    AssistMutationService,
    FreeGeminiModelPolicy,
    GeminiAuthenticationError,
    GeminiGateway,
    GeminiPromptFactory,
    GeminiQuotaError,
    GeminiResponseError,
    GeminiUnavailableError,
)
from backend.crypto import TokenHasher
from backend.models import (
    AIAccessGrantView,
    AICreateSpreadsheetResponse,
    AIMessageRequest,
    AIMessageResponse,
    GeminiSettingsView,
    SpreadsheetCreate,
    SpreadsheetUpdate,
    SheetData,
    WorkbookData,
)
from backend.repositories import AIAccessGrantRepository, GeminiSettingsRepository, SpreadsheetRepository


class AIKeyNotConfiguredError(RuntimeError):
    pass


class AIAccessDeniedError(RuntimeError):
    pass


class AIResourceNotFoundError(RuntimeError):
    pass


class AIAssistantService:
    def __init__(
        self,
        gemini_settings: GeminiSettingsRepository,
        grants: AIAccessGrantRepository,
        spreadsheets: SpreadsheetRepository,
        gateway: GeminiGateway,
    ) -> None:
        self._gemini_settings = gemini_settings
        self._grants = grants
        self._spreadsheets = spreadsheets
        self._gateway = gateway
        self._mutations = AssistMutationService()

    async def settings_view(self, user_id: int) -> GeminiSettingsView:
        _status = await self._gemini_settings.status(user_id)
        return GeminiSettingsView(
            configured=_status is not None,
            status=_status[0] if _status else "not_configured",
            primary_model=FreeGeminiModelPolicy.PRIMARY,
            fallback_model=FreeGeminiModelPolicy.FALLBACK,
            validated_at=_status[1] if _status else None,
        )

    async def save_api_key(self, user_id: int, api_key: str) -> GeminiSettingsView:
        await self._gateway.validate_key(api_key)
        await self._gemini_settings.save(user_id, api_key, "valid")
        return await self.settings_view(user_id)

    async def test_api_key(self, user_id: int) -> GeminiSettingsView:
        _api_key = await self._require_key(user_id)
        try:
            await self._gateway.validate_key(_api_key)
        except GeminiAuthenticationError:
            await self._gemini_settings.mark_status(user_id, "invalid")
            raise
        except (GeminiQuotaError, GeminiUnavailableError, GeminiResponseError):
            await self._gemini_settings.mark_status(user_id, "unavailable")
            raise
        await self._gemini_settings.mark_status(user_id, "valid")
        return await self.settings_view(user_id)

    async def remove_api_key(self, user_id: int) -> None:
        await self._gemini_settings.delete(user_id)

    async def create_spreadsheet_grant(self, user_id: int, spreadsheet_id: str) -> AIAccessGrantView:
        if await self._spreadsheets.get(user_id, spreadsheet_id) is None:
            raise AIResourceNotFoundError("Spreadsheet not found")
        return await self._create_grant(user_id, spreadsheet_id, "read_write")

    async def create_new_spreadsheet_grant(self, user_id: int) -> AIAccessGrantView:
        return await self._create_grant(user_id, None, "create")

    async def revoke_grant(self, user_id: int, raw_token: str) -> None:
        _token_hash = await TokenHasher.digest(raw_token)
        await self._grants.revoke(_token_hash, user_id)

    async def message(self, user_id: int, request: AIMessageRequest) -> AIMessageResponse:
        _api_key = await self._require_key(user_id)
        _document = await self._spreadsheets.get(user_id, request.spreadsheet_id)
        if _document is None:
            raise AIResourceNotFoundError("Spreadsheet not found")

        if request.mode == "assist":
            await self._require_grant(user_id, request.access_token, request.spreadsheet_id, "read_write")
            _system, _prompt, _schema = GeminiPromptFactory.assist(
                _document.title,
                _document.workbook,
                request.message,
                request.selected_cell,
                request.context_scope,
            )
            _result = await self._gateway.generate_json(_api_key, _system, _prompt, _schema)
            _actions = _result.payload.get("actions", [])
            if not isinstance(_actions, list):
                _actions = []
            _default_sheet_id = _document.workbook.activeSheetId if request.context_scope == "current_sheet" else None
            _updated_workbook, _changed_ranges = self._mutations.apply(
                _document.workbook,
                _actions,
                default_sheet_id=_default_sheet_id,
            )
            _updated_document = _document
            _sections: dict[str, list[str]] = {}
            _message = str(_result.payload.get("message", "")).strip()
            if _changed_ranges:
                _saved = await self._spreadsheets.update(
                    user_id,
                    _document.id,
                    SpreadsheetUpdate(title=_document.title, workbook=_updated_workbook),
                )
                if _saved is None:
                    raise AIResourceNotFoundError("Spreadsheet not found")
                _updated_document = _saved
                _sections["status"] = [f"Applied {len(_changed_ranges)} spreadsheet change(s)."]
            else:
                _sections["status"] = ["No spreadsheet changes were applied."]
                if _actions:
                    _message = (
                        "Gemini proposed spreadsheet changes, but Spreadsheet.AI could not apply them safely. "
                        "No spreadsheet was modified. Try naming the target sheet or range more explicitly."
                    )
            return AIMessageResponse(
                mode="assist",
                model=_result.model,
                message=_message,
                sections=_sections,
                changed_ranges=_changed_ranges,
                spreadsheet=_updated_document if _changed_ranges else None,
            )

        if request.mode == "interpret":
            _system, _prompt, _schema = GeminiPromptFactory.interpret(
                _document.title,
                _document.workbook,
                request.message,
                request.selected_cell,
                request.context_scope,
            )
            _result = await self._gateway.generate_json(_api_key, _system, _prompt, _schema)
            return AIMessageResponse(
                mode="interpret",
                model=_result.model,
                message=str(_result.payload.get("answer", "")),
                sections=self._list_sections(_result.payload, ("calculations", "observations", "conclusions", "limitations")),
            )

        _system, _prompt, _schema = GeminiPromptFactory.explain(
            _document.title,
            _document.workbook,
            request.message,
            request.selected_cell,
            request.context_scope,
        )
        _result = await self._gateway.generate_json(_api_key, _system, _prompt, _schema)
        return AIMessageResponse(
            mode="explain",
            model=_result.model,
            message=str(_result.payload.get("overview", "")),
            sections=self._list_sections(_result.payload, ("steps", "concepts", "checks")),
        )

    async def create_spreadsheet_from_ai(self, user_id: int, raw_token: str, message: str) -> AICreateSpreadsheetResponse:
        _api_key = await self._require_key(user_id)
        await self._require_grant(user_id, raw_token, None, "create")
        _system, _prompt, _schema = GeminiPromptFactory.create_spreadsheet(message)
        _result = await self._gateway.generate_json(_api_key, _system, _prompt, _schema, max_output_tokens=8192)
        _workbook = self._workbook_from_result(_result.payload)
        _title = str(_result.payload.get("title", "AI spreadsheet")).strip()[:160] or "AI spreadsheet"
        _document = await self._spreadsheets.create(user_id, SpreadsheetCreate(title=_title, workbook=_workbook))
        await self.revoke_grant(user_id, raw_token)
        return AICreateSpreadsheetResponse(
            model=_result.model,
            message=str(_result.payload.get("message", "Spreadsheet created.")),
            spreadsheet=_document,
        )

    async def _create_grant(self, user_id: int, spreadsheet_id: str | None, permission: str) -> AIAccessGrantView:
        _raw_token = secrets.token_urlsafe(32)
        _token_hash = await TokenHasher.digest(_raw_token)
        _expires_at = datetime.now(UTC) + timedelta(minutes=30)
        await self._grants.create(user_id, spreadsheet_id, permission, _token_hash, _expires_at)
        return AIAccessGrantView(
            token=_raw_token,
            spreadsheet_id=spreadsheet_id,
            permission=permission,
            expires_at=_expires_at,
        )

    async def _require_key(self, user_id: int) -> str:
        _api_key = await self._gemini_settings.get_key(user_id)
        if not _api_key:
            raise AIKeyNotConfiguredError("Gemini is not configured. Add an API key in Settings.")
        return _api_key

    async def _require_grant(
        self,
        user_id: int,
        raw_token: str | None,
        spreadsheet_id: str | None,
        permission: str,
    ) -> None:
        if not raw_token:
            raise AIAccessDeniedError("Explicit AI access permission is required")
        _token_hash = await TokenHasher.digest(raw_token)
        if not await self._grants.validate(_token_hash, user_id, spreadsheet_id, permission):
            raise AIAccessDeniedError("AI access permission is missing, expired, or revoked")

    @staticmethod
    def _list_sections(payload: dict[str, Any], names: tuple[str, ...]) -> dict[str, list[str]]:
        _sections: dict[str, list[str]] = {}
        for _name in names:
            _value = payload.get(_name, [])
            if isinstance(_value, list):
                _sections[_name] = [str(_item) for _item in _value if str(_item).strip()]
        return _sections

    @staticmethod
    def _workbook_from_result(payload: dict[str, Any]) -> WorkbookData:
        _sheets_input = payload.get("sheets")
        if not isinstance(_sheets_input, list) or not _sheets_input:
            raise ValueError("Gemini did not return any spreadsheet sheets")
        _sheets: list[SheetData] = []
        for _index, _sheet_input in enumerate(_sheets_input[:10], start=1):
            if not isinstance(_sheet_input, dict):
                continue
            _name = str(_sheet_input.get("name", f"Sheet {_index}")).strip()[:80] or f"Sheet {_index}"
            _cells: dict[str, str] = {}
            for _cell_id, _value in AssistMutationService.parse_cell_entries(_sheet_input.get("cells", [])):
                if AssistMutationService.is_valid_cell(_cell_id):
                    _cells[_cell_id] = _value[:10_000]
                    if len(_cells) >= AssistMutationService.MAX_MUTATED_CELLS:
                        break
            _sheets.append(SheetData(id=f"ai-sheet-{_index}", name=_name, cells=_cells))
        if not _sheets:
            raise ValueError("Gemini did not return a usable spreadsheet")
        return WorkbookData(version=1, activeSheetId=_sheets[0].id, sheets=_sheets)
