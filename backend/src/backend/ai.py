from __future__ import annotations

import json
import logging
import random
import re
from dataclasses import dataclass
from typing import Any, Final

import anyio
import httpx

from backend.models import SheetData, WorkbookData


_logger = logging.getLogger(__name__)


class GeminiError(RuntimeError):
    pass


class GeminiAuthenticationError(GeminiError):
    pass


class GeminiQuotaError(GeminiError):
    pass


class GeminiUnavailableError(GeminiError):
    pass


class GeminiModelCompatibilityError(GeminiUnavailableError):
    pass


class GeminiResponseError(GeminiError):
    pass


@dataclass(frozen=True, slots=True)
class GeminiResult:
    model: str
    payload: dict[str, Any]


class FreeGeminiModelPolicy:
    PRIMARY: Final[str] = "gemini-3.8-flash"
    FALLBACK: Final[str] = "gemini-3.5-flash-lite"
    ALLOWED: Final[tuple[str, ...]] = (PRIMARY, FALLBACK)

    @classmethod
    def is_allowed(cls, model: str) -> bool:
        return model in cls.ALLOWED




class GeminiRetryPolicy:
    MAX_ATTEMPTS_PER_MODEL: Final[int] = 3
    BASE_DELAY_SECONDS: Final[float] = 0.75
    MAX_DELAY_SECONDS: Final[float] = 4.0

    @classmethod
    async def wait_before_retry(cls, failed_attempt: int) -> None:
        _base_delay = min(cls.BASE_DELAY_SECONDS * (2 ** max(failed_attempt - 1, 0)), cls.MAX_DELAY_SECONDS)
        _jitter_multiplier = random.uniform(0.85, 1.15)
        await anyio.sleep(_base_delay * _jitter_multiplier)


class GeminiGateway:
    _base_url: Final[str] = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self, timeout_seconds: float = 30.0) -> None:
        self._timeout_seconds = timeout_seconds

    async def validate_key(self, api_key: str) -> None:
        _schema = {
            "type": "object",
            "properties": {"ok": {"type": "boolean"}},
            "required": ["ok"],
        }
        _result = await self.generate_json(
            api_key,
            system_instruction="Return valid JSON matching the schema. This is a connectivity check.",
            user_text="Return {\"ok\": true}.",
            response_schema=_schema,
            max_output_tokens=32,
        )
        if _result.payload.get("ok") is not True:
            raise GeminiResponseError("Gemini returned an unexpected validation response")

    async def generate_json(
        self,
        api_key: str,
        system_instruction: str,
        user_text: str,
        response_schema: dict[str, Any],
        max_output_tokens: int = 4096,
    ) -> GeminiResult:
        _last_error: GeminiError | None = None
        for _model in FreeGeminiModelPolicy.ALLOWED:
            for _attempt in range(1, GeminiRetryPolicy.MAX_ATTEMPTS_PER_MODEL + 1):
                try:
                    _payload = await self._generate_for_model(
                        api_key,
                        _model,
                        system_instruction,
                        user_text,
                        response_schema,
                        max_output_tokens,
                    )
                    return GeminiResult(model=_model, payload=_payload)
                except GeminiModelCompatibilityError as _error:
                    _last_error = _error
                    _logger.warning("Free Gemini model %s incompatible with this request: %s", _model, _error)
                    break
                except GeminiQuotaError as _error:
                    _last_error = _error
                    _logger.warning("Free Gemini model %s quota unavailable: %s", _model, _error)
                    break
                except GeminiUnavailableError as _error:
                    _last_error = _error
                    if _attempt >= GeminiRetryPolicy.MAX_ATTEMPTS_PER_MODEL:
                        _logger.warning(
                            "Free Gemini model %s unavailable after %s attempt(s): %s",
                            _model,
                            _attempt,
                            _error,
                        )
                        break
                    _logger.warning(
                        "Free Gemini model %s transiently unavailable on attempt %s/%s: %s; retrying",
                        _model,
                        _attempt,
                        GeminiRetryPolicy.MAX_ATTEMPTS_PER_MODEL,
                        _error,
                    )
                    await GeminiRetryPolicy.wait_before_retry(_attempt)
        if isinstance(_last_error, GeminiQuotaError):
            raise _last_error
        raise GeminiUnavailableError(
            "Gemini's free-tier models are temporarily overloaded or unavailable. "
            "Spreadsheet.AI retried both free models; try again in a moment."
        ) from _last_error

    async def _generate_for_model(
        self,
        api_key: str,
        model: str,
        system_instruction: str,
        user_text: str,
        response_schema: dict[str, Any],
        max_output_tokens: int,
    ) -> dict[str, Any]:
        if not FreeGeminiModelPolicy.is_allowed(model):
            raise GeminiUnavailableError("Requested Gemini model is not on the free-model allowlist")
        _body = {
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": user_text}]}],
            "generationConfig": {
                "responseFormat": {
                    "text": {
                        "mimeType": "APPLICATION_JSON",
                        "schema": response_schema,
                    }
                },
                "maxOutputTokens": max_output_tokens,
            },
        }
        _url = f"{self._base_url}/models/{model}:generateContent"
        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as _client:
                _response = await _client.post(
                    _url,
                    headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                    json=_body,
                )
        except httpx.HTTPError as _error:
            raise GeminiUnavailableError("Could not reach the Gemini API") from _error
        _error_text = _response.text
        if _response.status_code in {401, 403} or (
            _response.status_code == 400
            and ("API_KEY_INVALID" in _error_text or "API key" in _error_text or "api key" in _error_text)
        ):
            raise GeminiAuthenticationError("Gemini rejected this API key")
        if _response.status_code == 429:
            raise GeminiQuotaError("Gemini free-tier quota is currently exhausted")
        if _response.status_code >= 500 or _response.status_code == 404:
            _detail = self._safe_error_detail(_response)
            raise GeminiUnavailableError(
                f"Gemini model is unavailable ({_response.status_code}): {_detail}"
            )
        if _response.status_code == 400:
            _detail = self._safe_error_detail(_response)
            raise GeminiModelCompatibilityError(
                f"Gemini model {model} rejected the request format: {_detail}"
            )
        if _response.status_code >= 400:
            _detail = self._safe_error_detail(_response)
            raise GeminiResponseError(
                f"Gemini request failed ({_response.status_code}): {_detail}"
            )
        try:
            _data = _response.json()
            _parts = _data["candidates"][0]["content"]["parts"]
            _text = "".join(_part.get("text", "") for _part in _parts if isinstance(_part, dict))
            _decoded = json.loads(_text)
        except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as _error:
            raise GeminiResponseError("Gemini returned an invalid structured response") from _error
        if not isinstance(_decoded, dict):
            raise GeminiResponseError("Gemini response must be a JSON object")
        return _decoded

    @staticmethod
    def _safe_error_detail(response: httpx.Response) -> str:
        try:
            _payload = response.json()
        except ValueError:
            return f"HTTP {response.status_code}"
        _error = _payload.get("error") if isinstance(_payload, dict) else None
        _message = _error.get("message") if isinstance(_error, dict) else None
        if not isinstance(_message, str) or not _message.strip():
            return f"HTTP {response.status_code}"
        return _message.strip()[:500]


class WorkbookProjection:
    MAX_CELLS: Final[int] = 3000

    @classmethod
    def to_ai_context(cls, workbook: WorkbookData, context_scope: str = "workbook") -> dict[str, Any]:
        _remaining = cls.MAX_CELLS
        _sheets: list[dict[str, Any]] = []
        _truncated = False
        _source_sheets = workbook.sheets
        if context_scope == "current_sheet":
            _source_sheets = [
                _sheet for _sheet in workbook.sheets if _sheet.id == workbook.activeSheetId
            ] or workbook.sheets[:1]
        for _sheet in _source_sheets:
            _cells: dict[str, str] = {}
            for _cell_id, _value in _sheet.cells.items():
                if not _value:
                    continue
                if _remaining <= 0:
                    _truncated = True
                    break
                _cells[_cell_id] = _value
                _remaining -= 1
            _sheets.append({"id": _sheet.id, "name": _sheet.name, "cells": _cells})
            if _remaining <= 0:
                break
        return {
            "activeSheetId": workbook.activeSheetId,
            "sheets": _sheets,
            "truncated": _truncated,
        }


class AssistMutationService:
    _cell_pattern: Final[re.Pattern[str]] = re.compile(r"^(?:[A-T])(?:[1-9]|[1-5][0-9]|60)$")
    MAX_MUTATED_CELLS: Final[int] = 500

    @classmethod
    def normalize_cell_id(cls, cell_id: str) -> str | None:
        _normalized = cell_id.strip().upper()
        return _normalized if cls._cell_pattern.fullmatch(_normalized) is not None else None

    @classmethod
    def is_valid_cell(cls, cell_id: str) -> bool:
        return cls.normalize_cell_id(cell_id) is not None

    def apply(
        self,
        workbook: WorkbookData,
        actions: list[dict[str, Any]],
        default_sheet_id: str | None = None,
    ) -> tuple[WorkbookData, list[str]]:
        _data = workbook.model_copy(deep=True)
        _changed_ranges: list[str] = []
        _mutated_cells = 0
        for _action in actions[:25]:
            if not isinstance(_action, dict):
                continue
            _action_type = str(_action.get("type", "")).strip()
            if _action_type == "set_cells":
                _sheet_ref = str(_action.get("sheet_id", "")).strip()
                _cells = self.parse_cell_entries(_action.get("cells"))
                _sheet = self._resolve_sheet(_data, _sheet_ref, default_sheet_id)
                if _sheet is None:
                    continue
                for _cell_id, _value in _cells:
                    _normalized_cell = self.normalize_cell_id(_cell_id)
                    if _normalized_cell is None or len(_value) > 10_000:
                        continue
                    _mutated_cells += 1
                    if _mutated_cells > self.MAX_MUTATED_CELLS:
                        raise ValueError("Gemini attempted to change too many cells at once")
                    if _sheet.cells.get(_normalized_cell) == _value:
                        continue
                    _sheet.cells[_normalized_cell] = _value
                    _changed_ranges.append(f"{_sheet.name}!{_normalized_cell}")
            elif _action_type == "add_sheet":
                if len(_data.sheets) >= 100:
                    continue
                _name = str(_action.get("name", "New sheet")).strip()[:80] or "New sheet"
                _sheet_id = self._unique_sheet_id(_data, str(_action.get("sheet_id", "ai-sheet"))[:80])
                _cells: dict[str, str] = {}
                for _cell_id, _value in self.parse_cell_entries(_action.get("cells")):
                    _normalized_cell = self.normalize_cell_id(_cell_id)
                    if _normalized_cell is None:
                        continue
                    _mutated_cells += 1
                    if _mutated_cells > self.MAX_MUTATED_CELLS:
                        raise ValueError("Gemini attempted to change too many cells at once")
                    _cells[_normalized_cell] = _value[:10_000]
                _data.sheets.append(SheetData(id=_sheet_id, name=_name, cells=_cells))
                _changed_ranges.append(f"Added sheet: {_name}")
            elif _action_type == "rename_sheet":
                _sheet_ref = str(_action.get("sheet_id", "")).strip()
                _sheet = self._resolve_sheet(_data, _sheet_ref, default_sheet_id)
                _name = str(_action.get("name", "")).strip()[:80]
                if _sheet is not None and _name and _sheet.name != _name:
                    _sheet.name = _name
                    _changed_ranges.append(f"Renamed sheet: {_name}")
        return _data, list(dict.fromkeys(_changed_ranges))

    @staticmethod
    def parse_cell_entries(cells: Any) -> list[tuple[str, str]]:
        _entries: list[tuple[str, str]] = []
        if isinstance(cells, dict):
            for _cell_id, _value in cells.items():
                _converted = AssistMutationService._cell_value_to_text(_value)
                if isinstance(_cell_id, str) and _converted is not None:
                    _entries.append((_cell_id, _converted))
            return _entries
        if not isinstance(cells, list):
            return _entries
        for _item in cells:
            if not isinstance(_item, dict):
                continue
            _cell_id = _item.get("cell")
            _converted = AssistMutationService._cell_value_to_text(_item.get("value"))
            if isinstance(_cell_id, str) and _converted is not None:
                _entries.append((_cell_id, _converted))
        return _entries

    @staticmethod
    def _cell_value_to_text(value: Any) -> str | None:
        if isinstance(value, str):
            return value
        if isinstance(value, bool):
            return "TRUE" if value else "FALSE"
        if isinstance(value, (int, float)):
            return str(value)
        return None

    @staticmethod
    def _find_sheet(workbook: WorkbookData, sheet_ref: str) -> SheetData | None:
        _ref = sheet_ref.strip().casefold()
        if not _ref:
            return None
        return next(
            (
                _sheet
                for _sheet in workbook.sheets
                if _sheet.id.casefold() == _ref or _sheet.name.casefold() == _ref
            ),
            None,
        )

    @classmethod
    def _resolve_sheet(
        cls,
        workbook: WorkbookData,
        sheet_ref: str,
        default_sheet_id: str | None,
    ) -> SheetData | None:
        _sheet = cls._find_sheet(workbook, sheet_ref)
        if _sheet is not None:
            return _sheet
        if default_sheet_id:
            return cls._find_sheet(workbook, default_sheet_id)
        if len(workbook.sheets) == 1:
            return workbook.sheets[0]
        return None

    @staticmethod
    def _unique_sheet_id(workbook: WorkbookData, requested: str) -> str:
        _base = re.sub(r"[^A-Za-z0-9_-]", "-", requested).strip("-") or "ai-sheet"
        _existing = {_sheet.id for _sheet in workbook.sheets}
        if _base not in _existing:
            return _base
        _index = 2
        while f"{_base}-{_index}" in _existing:
            _index += 1
        return f"{_base}-{_index}"


class GeminiPromptFactory:
    @staticmethod
    def assist(spreadsheet_title: str, workbook: WorkbookData, message: str, selected_cell: str | None, context_scope: str) -> tuple[str, str, dict[str, Any]]:
        _system = (
            "You are Spreadsheet.AI Assist. Help with spreadsheet work and related calculations. "
            "You are receiving spreadsheet data only because the application has already verified a real read-write access grant. "
            "When edits are useful, return minimal actions. Never claim an edit happened unless you include an action. "
            "For set_cells/add_sheet, cells is an array of objects shaped {cell, value}. "
            "For set_cells/rename_sheet, copy an existing sheet id exactly; the backend also accepts the visible sheet name as a safe fallback. "
            "Every action must include type, sheet_id, name, and cells; use an empty string or empty array for fields that do not apply. "
            "Cell coordinates must stay within A1:T60. "
            "For taxes or regulated calculations, state assumptions such as jurisdiction and tax year when those are missing."
        )
        _context = {
            "spreadsheet": {"title": spreadsheet_title, **WorkbookProjection.to_ai_context(workbook, context_scope)},
            "selectedCell": selected_cell,
            "contextScope": context_scope,
            "request": message,
        }
        _schema = {
            "type": "object",
            "properties": {
                "message": {"type": "string"},
                "actions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "enum": ["set_cells", "add_sheet", "rename_sheet"]},
                            "sheet_id": {"type": "string"},
                            "name": {"type": "string"},
                            "cells": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "cell": {"type": "string"},
                                        "value": {"type": "string"},
                                    },
                                    "required": ["cell", "value"],
                                },
                            },
                        },
                        "required": ["type", "sheet_id", "name", "cells"],
                    },
                },
            },
            "required": ["message", "actions"],
        }
        return _system, json.dumps(_context, ensure_ascii=False), _schema

    @staticmethod
    def interpret(spreadsheet_title: str, workbook: WorkbookData, message: str, selected_cell: str | None, context_scope: str) -> tuple[str, str, dict[str, Any]]:
        _system = (
            "You are Spreadsheet.AI Interpret. You have read-only spreadsheet access. Read-only means you cannot modify the workbook; "
            "it does not limit calculations or analysis. The user's request is your primary task: answer the exact question directly from the "
            "supplied spreadsheet data instead of replacing it with a generic interpretation. Perform arithmetic, percentages, statistics, "
            "comparisons, projections, or other calculations when the question calls for them. For tax or other regulated calculations, use "
            "rates/rules only when they are supplied in the spreadsheet or user request. If a reliable answer requires missing external facts such "
            "as jurisdiction, tax year, filing status, or tax brackets, explicitly say what is missing and ask for it rather than inventing rules. "
            "When the user asks an interpretive question, draw multiple reasonable evidence-linked conclusions; for a purely computational question, "
            "the conclusions list may be empty. Separate calculations and direct observations from conclusions, avoid unsupported causal claims, "
            "state limitations, and never propose or describe edits as completed."
        )
        _context = {
            "spreadsheet": {"title": spreadsheet_title, **WorkbookProjection.to_ai_context(workbook, context_scope)},
            "selectedCell": selected_cell,
            "contextScope": context_scope,
            "request": message,
        }
        _schema = {
            "type": "object",
            "properties": {
                "answer": {"type": "string"},
                "calculations": {"type": "array", "items": {"type": "string"}},
                "observations": {"type": "array", "items": {"type": "string"}},
                "conclusions": {"type": "array", "items": {"type": "string"}},
                "limitations": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["answer", "calculations", "observations", "conclusions", "limitations"],
        }
        return _system, json.dumps(_context, ensure_ascii=False), _schema

    @staticmethod
    def explain(spreadsheet_title: str, workbook: WorkbookData, message: str, selected_cell: str | None, context_scope: str) -> tuple[str, str, dict[str, Any]]:
        _system = (
            "You are Spreadsheet.AI Explain. You have read-only spreadsheet access. "
            "Teach the user how to understand and interpret the supplied spreadsheet step-by-step. "
            "Describe what values, formulas, comparisons, and checks mean, but do not draw substantive conclusions from the data. "
            "Do not say what the data ultimately suggests; teach the reasoning process the user can apply themselves."
        )
        _context = {
            "spreadsheet": {"title": spreadsheet_title, **WorkbookProjection.to_ai_context(workbook, context_scope)},
            "selectedCell": selected_cell,
            "contextScope": context_scope,
            "request": message,
        }
        _schema = {
            "type": "object",
            "properties": {
                "overview": {"type": "string"},
                "steps": {"type": "array", "items": {"type": "string"}},
                "concepts": {"type": "array", "items": {"type": "string"}},
                "checks": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["overview", "steps", "concepts", "checks"],
        }
        return _system, json.dumps(_context, ensure_ascii=False), _schema

    @staticmethod
    def create_spreadsheet(message: str) -> tuple[str, str, dict[str, Any]]:
        _system = (
            "You are Spreadsheet.AI Assist creating a new spreadsheet from user-provided data. "
            "Return a compact workbook that preserves the supplied data faithfully and adds useful headings or formulas when appropriate. "
            "Each sheet's cells must be an array of objects shaped {cell, value}. "
            "Keep all cell coordinates within A1:T60 and create no more than 10 sheets. Never invent missing source data."
        )
        _schema = {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "sheets": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 10,
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "cells": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "cell": {"type": "string"},
                                        "value": {"type": "string"},
                                    },
                                    "required": ["cell", "value"],
                                },
                            },
                        },
                        "required": ["name", "cells"],
                    },
                },
                "message": {"type": "string"},
            },
            "required": ["title", "sheets", "message"],
        }
        return _system, message, _schema
