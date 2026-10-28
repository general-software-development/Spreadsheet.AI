from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field


CellValue = Annotated[str, Field(max_length=10_000)]


class SheetData(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=80)
    cells: dict[str, CellValue] = Field(default_factory=dict)


class WorkbookData(BaseModel):
    version: int = 1
    activeSheetId: str = Field(min_length=1, max_length=80)
    sheets: list[SheetData] = Field(min_length=1, max_length=100)


class SpreadsheetCreate(BaseModel):
    title: str = Field(default="Untitled spreadsheet", min_length=1, max_length=160)
    workbook: WorkbookData


class SpreadsheetUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    workbook: WorkbookData


class SpreadsheetSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class SpreadsheetDocument(SpreadsheetSummary):
    workbook: WorkbookData


class GoogleSignInRequest(BaseModel):
    credential: str = Field(min_length=1, max_length=10_000)


class UserView(BaseModel):
    id: int
    email: str
    display_name: str


class GeminiSettingsUpdate(BaseModel):
    api_key: str = Field(min_length=10, max_length=500)


class GeminiSettingsView(BaseModel):
    configured: bool
    status: str
    primary_model: str
    fallback_model: str
    validated_at: datetime | None = None


class AIAccessGrantRequest(BaseModel):
    spreadsheet_id: str = Field(min_length=1, max_length=80)


class AIAccessGrantView(BaseModel):
    token: str
    spreadsheet_id: str | None = None
    permission: str
    expires_at: datetime


class AIMessageRequest(BaseModel):
    mode: str = Field(pattern="^(assist|interpret|explain)$")
    message: str = Field(min_length=1, max_length=20_000)
    spreadsheet_id: str = Field(min_length=1, max_length=80)
    access_token: str | None = Field(default=None, max_length=500)
    selected_cell: str | None = Field(default=None, max_length=16)
    context_scope: str = Field(default="current_sheet", pattern="^(current_sheet|workbook)$")


class AIMessageResponse(BaseModel):
    mode: str
    model: str
    message: str
    sections: dict[str, list[str]] = Field(default_factory=dict)
    changed_ranges: list[str] = Field(default_factory=list)
    spreadsheet: SpreadsheetDocument | None = None


class AICreateSpreadsheetRequest(BaseModel):
    message: str = Field(min_length=1, max_length=30_000)
    access_token: str = Field(min_length=1, max_length=500)


class AICreateSpreadsheetResponse(BaseModel):
    model: str
    message: str
    spreadsheet: SpreadsheetDocument


class AIAccessGrantRevokeRequest(BaseModel):
    token: str = Field(min_length=1, max_length=500)
