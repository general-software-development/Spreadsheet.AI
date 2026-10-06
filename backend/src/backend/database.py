from __future__ import annotations

import sqlite3
from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

import anyio


T = TypeVar("T")


class Database:
    def __init__(self, path: Path) -> None:
        self._path = path

    async def initialize(self) -> None:
        await anyio.to_thread.run_sync(self._initialize_sync)

    def _initialize_sync(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self._path) as _connection:
            _connection.execute("PRAGMA foreign_keys = ON")
            _connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    google_sub TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS spreadsheets (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    encrypted_payload TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_spreadsheets_user_updated
                    ON spreadsheets(user_id, updated_at DESC);
                DROP TABLE IF EXISTS oauth_states;
                """
            )

    async def run(self, callback: Callable[[sqlite3.Connection], T]) -> T:
        return await anyio.to_thread.run_sync(self._run_sync, callback)

    def _run_sync(self, callback: Callable[[sqlite3.Connection], T]) -> T:
        with sqlite3.connect(self._path) as _connection:
            _connection.row_factory = sqlite3.Row
            _connection.execute("PRAGMA foreign_keys = ON")
            return callback(_connection)

    async def healthcheck(self) -> bool:
        def _check(_connection: sqlite3.Connection) -> bool:
            _row = _connection.execute("SELECT 1 AS ok").fetchone()
            return bool(_row and _row["ok"] == 1)

        return await self.run(_check)
