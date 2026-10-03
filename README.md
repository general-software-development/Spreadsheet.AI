# Spreadsheet.AI

A full-stack spreadsheet web app with a Next.js/React frontend and FastAPI/SQLite backend. Users authenticate with Google OAuth, create multiple workbooks and sheets, edit cells and formulas, and have changes autosaved. Workbook payloads are encrypted before being stored in SQLite.

## Development

1. Copy `.env.example` to `.env` and configure a Google OAuth Web client. Add `http://localhost:8000/auth/google/callback` as an authorised redirect URI.
2. Install Python dependencies with `uv sync --all-groups`.
3. Start the backend with `uv run --env-file .env uvicorn backend.app:app --app-dir backend/src --reload --port 8000`.
4. Install frontend dependencies with Bun: `bun install`.
5. Start the site with `bun run dev`. The script runs the Next.js development server through `tsx`; there is no production build step in the development workflow.

## Tests

- Backend: `uv run pytest backend/tests`
- Site: `bun run test`
- TypeScript: `bun run typecheck`

## Security and privacy

Only the Google subject identifier, email address, display name, session metadata, encrypted spreadsheet title, and encrypted workbook payload are persisted. OAuth access tokens are used only during the callback to fetch the Google profile and are not stored. Session and OAuth-state tokens are stored as SHA3-512 hashes. Spreadsheet titles and workbook payloads are encrypted at rest with AES-GCM using a key derived from `SPREADSHEET_ENCRYPTION_KEY` via SHA3-512.

> Dependency lockfiles are regenerated on first setup (`uv sync` and `bun install`) because the implementation changed both dependency sets.
