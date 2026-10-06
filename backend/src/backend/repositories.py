from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from uuid import uuid4

from backend.crypto import DataCipher
from backend.database import Database
from backend.models import SpreadsheetCreate, SpreadsheetDocument, SpreadsheetSummary, SpreadsheetUpdate, UserView, WorkbookData


class UserRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    async def upsert_google_user(self, google_sub: str, email: str, display_name: str) -> UserView:
        def _upsert(_connection: sqlite3.Connection) -> UserView:
            _now = datetime.now(UTC).isoformat()
            _connection.execute(
                """
                INSERT INTO users(google_sub, email, display_name, created_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(google_sub) DO UPDATE SET
                    email = excluded.email,
                    display_name = excluded.display_name
                """,
                (google_sub, email, display_name, _now),
            )
            _row = _connection.execute(
                "SELECT id, email, display_name FROM users WHERE google_sub = ?",
                (google_sub,),
            ).fetchone()
            if _row is None:
                raise RuntimeError("User upsert failed")
            return UserView(id=_row["id"], email=_row["email"], display_name=_row["display_name"])

        return await self._database.run(_upsert)

    async def ensure_test_user(self, email: str) -> UserView:
        return await self.upsert_google_user(f"test:{email}", email, "Test User")


class SessionRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    async def create(self, token_hash: str, user_id: int, expires_at: datetime) -> None:
        def _create(_connection: sqlite3.Connection) -> None:
            _connection.execute(
                "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)",
                (token_hash, user_id, expires_at.isoformat()),
            )

        await self._database.run(_create)

    async def get_user(self, token_hash: str) -> UserView | None:
        def _get(_connection: sqlite3.Connection) -> UserView | None:
            _row = _connection.execute(
                """
                SELECT users.id, users.email, users.display_name, sessions.expires_at
                FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token_hash = ?
                """,
                (token_hash,),
            ).fetchone()
            if _row is None or datetime.fromisoformat(_row["expires_at"]) <= datetime.now(UTC):
                return None
            return UserView(id=_row["id"], email=_row["email"], display_name=_row["display_name"])

        return await self._database.run(_get)

    async def delete(self, token_hash: str) -> None:
        def _delete(_connection: sqlite3.Connection) -> None:
            _connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))

        await self._database.run(_delete)


class SpreadsheetRepository:
    def __init__(self, database: Database, cipher: DataCipher) -> None:
        self._database = database
        self._cipher = cipher

    async def list_for_user(self, user_id: int) -> list[SpreadsheetSummary]:
        def _list(_connection: sqlite3.Connection) -> list[sqlite3.Row]:
            return _connection.execute(
                """
                SELECT id, title, created_at, updated_at
                FROM spreadsheets
                WHERE user_id = ?
                ORDER BY updated_at DESC
                """,
                (user_id,),
            ).fetchall()

        _rows = await self._database.run(_list)
        _summaries: list[SpreadsheetSummary] = []
        for _row in _rows:
            _summaries.append(
                SpreadsheetSummary(
                    id=_row["id"],
                    title=await self._cipher.decrypt_text(_row["title"]),
                    created_at=datetime.fromisoformat(_row["created_at"]),
                    updated_at=datetime.fromisoformat(_row["updated_at"]),
                )
            )
        return _summaries

    async def create(self, user_id: int, payload: SpreadsheetCreate) -> SpreadsheetDocument:
        _spreadsheet_id = str(uuid4())
        _now = datetime.now(UTC)
        _encrypted = await self._cipher.encrypt_json(payload.workbook.model_dump())
        _encrypted_title = await self._cipher.encrypt_text(payload.title)

        def _create(_connection: sqlite3.Connection) -> None:
            _connection.execute(
                """
                INSERT INTO spreadsheets(id, user_id, title, encrypted_payload, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (_spreadsheet_id, user_id, _encrypted_title, _encrypted, _now.isoformat(), _now.isoformat()),
            )

        await self._database.run(_create)
        return SpreadsheetDocument(
            id=_spreadsheet_id,
            title=payload.title,
            workbook=payload.workbook,
            created_at=_now,
            updated_at=_now,
        )

    async def get(self, user_id: int, spreadsheet_id: str) -> SpreadsheetDocument | None:
        def _get(_connection: sqlite3.Connection) -> sqlite3.Row | None:
            return _connection.execute(
                """
                SELECT id, title, encrypted_payload, created_at, updated_at
                FROM spreadsheets
                WHERE id = ? AND user_id = ?
                """,
                (spreadsheet_id, user_id),
            ).fetchone()

        _row = await self._database.run(_get)
        if _row is None:
            return None
        _workbook = WorkbookData.model_validate(await self._cipher.decrypt_json(_row["encrypted_payload"]))
        return SpreadsheetDocument(
            id=_row["id"],
            title=await self._cipher.decrypt_text(_row["title"]),
            workbook=_workbook,
            created_at=datetime.fromisoformat(_row["created_at"]),
            updated_at=datetime.fromisoformat(_row["updated_at"]),
        )

    async def update(self, user_id: int, spreadsheet_id: str, payload: SpreadsheetUpdate) -> SpreadsheetDocument | None:
        _encrypted = await self._cipher.encrypt_json(payload.workbook.model_dump())
        _encrypted_title = await self._cipher.encrypt_text(payload.title)
        _now = datetime.now(UTC)

        def _update(_connection: sqlite3.Connection) -> bool:
            _cursor = _connection.execute(
                """
                UPDATE spreadsheets
                SET title = ?, encrypted_payload = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (_encrypted_title, _encrypted, _now.isoformat(), spreadsheet_id, user_id),
            )
            return _cursor.rowcount > 0

        if not await self._database.run(_update):
            return None
        return await self.get(user_id, spreadsheet_id)

    async def delete(self, user_id: int, spreadsheet_id: str) -> bool:
        def _delete(_connection: sqlite3.Connection) -> bool:
            _cursor = _connection.execute(
                "DELETE FROM spreadsheets WHERE id = ? AND user_id = ?",
                (spreadsheet_id, user_id),
            )
            return _cursor.rowcount > 0

        return await self._database.run(_delete)
