from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class Settings:
    database_path: Path
    encryption_secret: str
    frontend_origin: str
    google_client_id: str
    secure_cookies: bool
    testing: bool = False


class SettingsLoader:
    @staticmethod
    def load() -> Settings:
        _database_path = Path(os.getenv("SPREADSHEET_DB_PATH", "backend/data/spreadsheet.db"))
        return Settings(
            database_path=_database_path,
            encryption_secret=os.getenv("SPREADSHEET_ENCRYPTION_KEY", "local-development-only-change-me"),
            frontend_origin=os.getenv("FRONTEND_ORIGIN", "http://localhost:3000"),
            google_client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
            secure_cookies=os.getenv("SECURE_COOKIES", "false").lower() == "true",
            testing=os.getenv("SPREADSHEET_TESTING", "false").lower() == "true",
        )
