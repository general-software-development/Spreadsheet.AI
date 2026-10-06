# Spreadsheet.AI

A full-stack spreadsheet web app with a Next.js/React frontend and FastAPI/SQLite backend. Users authenticate with **Sign in with Google** through Google Identity Services, create multiple workbooks and sheets, edit cells and formulas, and have changes autosaved. Workbook payloads are encrypted before being stored in SQLite.

## Google sign-in setup

Spreadsheet.AI uses the Google Identity Services Sign in with Google button. It does **not** use the redirect-based authorization-code login flow, and it does not need a Google client secret or an OAuth callback URL.

1. In Google Cloud Console, create or reuse a **Web application** client ID under Google Auth Platform / Credentials.
2. Add `http://localhost:3000` to the client's **Authorized JavaScript origins** for local development.
3. Put that same public Web client ID in both `GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env`.
4. No `GOOGLE_CLIENT_SECRET` or `GOOGLE_REDIRECT_URI` is required for authentication.

Google still calls the credential a Web/OAuth client ID in Cloud Console, but Spreadsheet.AI uses Google Identity Services authentication: the browser receives a Google-signed ID token, the FastAPI backend verifies its signature and claims, and Spreadsheet.AI then creates its own HttpOnly session cookie. No Google access or refresh token is stored.

## Development

1. Copy `.env.example` to `.env` and configure the Google Web client ID as described above.
2. Install Python dependencies with `uv sync --all-groups`.
3. Start the backend with `uv run --env-file .env uvicorn backend.app:app --app-dir backend/src --reload --port 8000`.
4. Install frontend dependencies with Bun: `bun install`.
5. Start the site with `bun run dev`. The script runs the Next.js development server through `tsx`; there is no production build step in the development workflow.

## Tests

- Backend: `uv run pytest backend/tests`
- Site: `bun run test`
- TypeScript: `bun run typecheck`

## Security and privacy

Only the Google subject identifier, email address, display name, session metadata, encrypted spreadsheet title, and encrypted workbook payload are persisted. The Google ID token is verified during sign-in and is not stored. Session tokens are stored as SHA3-512 hashes. Spreadsheet titles and workbook payloads are encrypted at rest with AES-GCM using a key derived from `SPREADSHEET_ENCRYPTION_KEY` via SHA3-512.

<br>
<p align="center">&copy; Copyright 2026 bogdan-glitchm, Licensed under the <b>GNU AGPL-3</b> License.</p>

