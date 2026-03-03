# AGENTS Rules (Project)

## Admin API Safety Rule

- For any non-GET request to `/api/admin/*` from client components, always send CSRF header:
  - header name: `x-csrf-token`
  - token source: `getCsrfToken()` from `src/lib/csrf-client.ts`
- If response is `403` with CSRF-related message, retry once with `refreshCsrfToken()`.
- Do not bypass CSRF checks by adding admin routes to middleware exemptions unless explicitly approved.

## Pre-Deploy Check

- Before finalizing admin UI changes, verify that every `POST/PUT/PATCH/DELETE` call to `/api/admin/*` includes CSRF handling.

