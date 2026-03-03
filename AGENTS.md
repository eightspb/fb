# AGENTS Rules (Project)

## Admin API Safety Rule

- For any non-GET request to `/api/admin/*` from client components, always send CSRF header:
  - header name: `x-csrf-token`
  - token source: `getCsrfToken()` from `src/lib/csrf-client.ts`
- If response is `403` with CSRF-related message, retry once with `refreshCsrfToken()`.
- Current approved CSRF exemptions in middleware: `/api/admin/auth`, `/api/admin/banner`, `/api/admin/email-templates`, `/api/admin/direct` (session-auth only).
- Do not add new CSRF exemptions for other admin routes unless explicitly approved.

## Pre-Deploy Check

- Before finalizing admin UI changes, verify that every `POST/PUT/PATCH/DELETE` call to `/api/admin/*` includes CSRF handling.
