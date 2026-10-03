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


class UserView(BaseModel):
    id: int
    email: str
    display_name: str
