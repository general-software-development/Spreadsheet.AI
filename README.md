# Spreadsheet.AI

A full-stack spreadsheet web app with a Next.js/React frontend and FastAPI/SQLite backend. Users authenticate with **Sign in with Google**, create multiple workbooks and sheets, edit cells and formulas, and optionally connect their own Gemini API key for spreadsheet assistance. Sensitive workbook data and saved Gemini keys are encrypted before being stored in SQLite.

## Google sign-in setup

Spreadsheet.AI uses the Google Identity Services Sign in with Google button. It does **not** use the redirect-based authorization-code login flow, and it does not need a Google client secret or an OAuth callback URL.

1. In Google Cloud Console, create or reuse a **Web application** client ID under Google Auth Platform / Credentials.
2. Add `http://localhost:3000` to the client's **Authorized JavaScript origins** for local development.
3. Put that same public Web client ID in both `GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
4. No `GOOGLE_CLIENT_SECRET` or `GOOGLE_REDIRECT_URI` is required for authentication.

Google still calls the credential a Web/OAuth client ID in Cloud Console, but Spreadsheet.AI uses Google Identity Services authentication: the browser receives a Google-signed ID token, the FastAPI backend verifies its signature and claims, and Spreadsheet.AI then creates its own HttpOnly session cookie. No Google access or refresh token is stored.

## Gemini AI

Gemini is optional and uses a per-user API key entered in **Settings → Gemini AI**. Do not put a Gemini API key in a `NEXT_PUBLIC_*` environment variable.

The backend currently hard-allowlists only:

- `gemini-3.8-flash` (primary)
- `gemini-3.5-flash-lite` (fallback)

These model IDs are currently documented by Google as supporting free-tier text input/output. Spreadsheet.AI does not automatically fall back to any model outside this allowlist. The user's own Google project still determines quota and billing configuration.

The UI exposes three modes:

- **Assist** — read/write, but only after a short-lived, user-specific, spreadsheet-specific capability grant is created by an explicit user action. The raw grant token exists only in the client session; SQLite stores only its SHA3-512 hash. The grant can be revoked.
- **Interpret** — read-only. Separates observations from multiple plausible conclusions and limitations.
- **Explain** — read-only. Teaches the user how to understand the spreadsheet step-by-step without drawing substantive conclusions for them.

**Create with AI** uses a separate one-time creation grant and never gives Gemini access to existing workbooks.

A standalone setup guide is available at `/gemini-setup` and Settings links to it directly.

### Gemini data handling

The Gemini API key is validated server-side, encrypted with an AES-GCM key derived specifically for Gemini-key storage, and never returned by the settings API. Spreadsheet data is sent to Gemini only when an AI action is invoked. AI chat history is kept only in frontend component state and is not persisted by Spreadsheet.AI. Google's free-tier terms currently state that submitted content may be used to improve Google products; this is disclosed in the setup guide and Privacy Policy.

## Development

1. Copy `.env.example` to `.env` and configure the Google Web client ID.
2. For Next.js, keep `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_API_URL` in `site/.env.local` if you run the custom site server from the repository root.
3. Install Python dependencies with `uv sync --all-groups`.
4. Start the backend with `uv run --env-file .env uvicorn backend.app:app --app-dir backend/src --reload --port 8000`.
5. Install frontend dependencies with Bun: `bun install`.
6. Start the site with `bun run dev`. The script runs the Next.js development server through `tsx`; there is no production build step in the development workflow.
7. Sign in, open **Settings**, and add your Gemini key if you want to use AI features.

## Tests

- Backend: `uv run pytest backend/tests`
- Site: `bun run test`
- TypeScript: `bun run typecheck`

## Security and privacy

Only the Google subject identifier, email address, display name, session metadata, encrypted spreadsheet titles, encrypted workbook payloads, and—when enabled—an encrypted Gemini API key are persisted. The Google ID token is verified during sign-in and is not stored. Session tokens and AI access-grant tokens are stored as SHA3-512 hashes. Spreadsheet titles, workbook payloads, and Gemini API keys are encrypted at rest with AES-GCM using keys derived from `SPREADSHEET_ENCRYPTION_KEY` via SHA3-512.

Assist authorization is enforced by backend access-control checks, not by a Gemini system prompt. Interpret and Explain have no backend mutation route.

<br>
<p align="center">&copy; Copyright 2026 bogdan-glitchm, Licensed under the <b>GNU AGPL-3</b> License.</p>
