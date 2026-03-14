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

## Skill Routing Memory

- Treat this section as repo memory for future sessions: when the task matches one of the flows below, proactively use the listed skill(s).
- If the change scope is unclear, start with `fb-change-impact-gate` before choosing tests, deploy mode, or follow-up skills.

### Default orchestration

- Unclear diff / need impact analysis / need release scope:
  - use `fb-change-impact-gate`
- Need tests / CI verdict / pre-merge or pre-deploy validation:
  - use `fb-test-gatekeeper`
- Need deploy / release / rollout / rollback decision:
  - use `fb-deploy-operator`
- Need post-deploy sanity validation:
  - use `fb-release-smoke-operator`

### Admin and security flows

- Any admin UI or admin API mutate flow, especially `/api/admin/*` non-GET:
  - use `fb-admin-csrf-guard`
- Security-sensitive changes in auth, cookies, headers, uploads, public forms, integrations, or admin API:
  - use `fb-security-gate`
- Any env/secrets work (`JWT_SECRET`, `ADMIN_PASSWORD`, SMTP, Telegram, OpenRouter, Polza, Upstash, Yandex, `.env*`, GitHub/VPS secrets):
  - use `fb-env-secrets-keeper`

### Data and integration flows

- Schema/database changes, migration files, `database-schema.sql`, indexes, backfills:
  - use `fb-migrations-maintainer`
- External provider issues or provider-facing changes (SMTP, IMAP, OpenRouter, Polza, Upstash, Yandex):
  - use `fb-integrations-watchdog`
- Telegram bot incidents, webhook failures, pending updates, 502/503 from Telegram path:
  - use `fb-telegram-incident-runbook`

### Practical route map

- Admin UI only in `apps/admin/**`:
  - start with `fb-change-impact-gate`
  - then `fb-test-gatekeeper`
  - add `fb-admin-csrf-guard` if any save/mutate flow is touched
- `src/app/api/admin/**` or admin auth/cookies/session work:
  - use `fb-change-impact-gate`
  - then `fb-admin-csrf-guard`
  - then `fb-security-gate`
  - then `fb-test-gatekeeper`
- `migrations/**` or `database-schema.sql`:
  - use `fb-migrations-maintainer`
  - then `fb-test-gatekeeper`
  - then `fb-deploy-operator`
  - then `fb-release-smoke-operator`
- Deploy/release requests:
  - use `fb-change-impact-gate` if scope is not already classified
  - then `fb-test-gatekeeper`
  - then `fb-deploy-operator`
  - then `fb-release-smoke-operator`
- Production issue after rollout:
  - use `fb-release-smoke-operator`
  - then route to `fb-telegram-incident-runbook`, `fb-integrations-watchdog`, `fb-admin-csrf-guard`, or `fb-security-gate` based on the failing surface

### Canonical skill map

- Extended operator map lives in `.agents/SKILL_ROUTING.md`.
- Keep `AGENTS.md` short and operational; put longer playbooks and examples in `.agents/SKILL_ROUTING.md`.
