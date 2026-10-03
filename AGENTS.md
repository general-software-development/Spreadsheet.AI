# Code Styling Rules
1. No unused variables, except for those starting with `_`
2. Temporary variables must start with `_`, end with `_`, or start with `tmp`
3. Use OOP (Object-Oriented Programming)

# Backend

The backend is to be coded in Python, with the CPython runtime, with the `uv` package manager, and with `FastAPI`.

All code needs to have unit tests **and** integration tests via `pytest`. Put all tests under `backend/tests`.

Make most functions async. Use `AnyIO` over raw asyncio.

Write logs via the `logging` library.

All data is to be stored with `SQLite`, and encrypted where sensitive.

Only use SHA3-512 and/or Argon2id hashes, except where another kind of hash is necesary.

Maintain a `/up/health` API endpoint that, when sent a `GET` request, returns either "online" if the service is functional, an error message if an error occurred and the service isn't functional, or "offline" is the service isn't functional due to an unknown issue.

Use context managers to scope variables, where possible. If needed, make a new context manager specifically for this, called `scoped()` that, if accessed after the scope ends, raises an `AccessError` (create this as well, inheriting from RuntimeError.)

# Site

The site is to be coded with the `Bun` runtime, with `React` and `next.js`.

Avoid making every function synchronous, and prefer using `async`.

It needs to be a nice, modern website.

All code needs to have integration tests; and, optionally, unit tests. Put all tests under `site/tests`, and use Vitest for testing.

Use TypeScript for all code. Use `tsx` to run it -- do NOT build.

For login, make users log in via Google OAuth.

For all code, use TABS. TABS are displayed in 4-space width.

# Legal

1. Do not collect, process, or store data that is unnecessary to the functionality of the service.
2. Write a Privacy Policy, and make it accessible on the website's login page. Make sure the Privacy Policy is GDPR-compliant.
3. Write Terms of Service, and make them accessible on the website's login page.
