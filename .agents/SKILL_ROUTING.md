# fb.net Skill Routing Map

This file is repo memory for how to actively orchestrate project-specific skills.
Use it to decide which skill to trigger first, which supporting skills to add, and what order gives the cleanest execution path.

## Core principle

If the task is not obviously single-domain, start with:

1. `fb-change-impact-gate`
2. then the narrow specialist skill(s)
3. then `fb-test-gatekeeper` or `fb-deploy-operator` when the task reaches validation/release

## Primary skill order by scenario

### 1. Admin UI work

Use when touching `apps/admin/**`, admin pages, admin components, admin data fetching, login, dashboard, contacts, requests, news, banner, settings.

Recommended order:
1. `fb-change-impact-gate`
2. `fb-admin-csrf-guard` if any mutate flow or `/api/admin/*` call exists
3. `fb-security-gate` if auth/session/cookies/headers or sensitive data are involved
4. `fb-test-gatekeeper`
5. `fb-release-smoke-operator` if the work is being released

### 2. Admin backend or auth work

Use when touching `src/app/api/admin/**`, `src/lib/auth.ts`, cookies, JWT/session handling, admin API contracts.

Recommended order:
1. `fb-change-impact-gate`
2. `fb-admin-csrf-guard`
3. `fb-security-gate`
4. `fb-test-gatekeeper`
5. `fb-deploy-operator` if rollout is requested
6. `fb-release-smoke-operator`

### 3. Schema or migration work

Use when touching `migrations/**`, `database-schema.sql`, DB structure, backfills, indexes, notes/contact embeddings, new entities.

Recommended order:
1. `fb-migrations-maintainer`
2. `fb-change-impact-gate`
3. `fb-test-gatekeeper`
4. `fb-security-gate` if data sensitivity or auth/PII is involved
5. `fb-deploy-operator`
6. `fb-release-smoke-operator`

Rule of thumb:
- any schema change implies deploy mode `full` unless proven otherwise

### 4. Release and deploy work

Use when the user wants deploy, release, rollout, rollback, or asks what to run before/after shipping.

Recommended order:
1. `fb-change-impact-gate` if scope is not already classified
2. `fb-test-gatekeeper`
3. `fb-deploy-operator`
4. `fb-release-smoke-operator`
5. add `fb-integrations-watchdog` if the release touches providers

### 5. Security-sensitive work

Use for auth, cookies, public form abuse, headers, uploads, SSRF risk, injection risk, secure-by-default reviews, admin API hardening.

Recommended order:
1. `fb-security-gate`
2. `fb-admin-csrf-guard` if `/api/admin/*` mutate flows are in scope
3. `fb-env-secrets-keeper` if secrets/env are involved
4. `fb-test-gatekeeper`
5. `fb-release-smoke-operator` for post-fix validation if shipped

### 6. Env and secrets work

Use for `.env`, `.env.local`, CI/CD secrets, VPS env, provider tokens, secret drift, client exposure checks.

Recommended order:
1. `fb-env-secrets-keeper`
2. `fb-security-gate` if exposure risk exists
3. `fb-integrations-watchdog` if the change affects provider health
4. `fb-deploy-operator` if production setup changes

### 7. External integrations

Use for SMTP, IMAP, OpenRouter, Polza, Upstash, Yandex, provider errors, quota issues, provider-specific regressions.

Recommended order:
1. `fb-integrations-watchdog`
2. `fb-env-secrets-keeper`
3. `fb-security-gate` if token handling or data exposure is involved
4. `fb-test-gatekeeper` if code changed
5. `fb-release-smoke-operator` after rollout/fix

### 8. Telegram incidents

Use for bot down, webhook errors, pending updates, Telegram 502/503, bot not responding.

Recommended order:
1. `fb-telegram-incident-runbook`
2. `fb-deploy-operator` if the incident started right after a release
3. `fb-env-secrets-keeper` if token/webhook env mismatch is suspected
4. `fb-security-gate` if the issue reveals a broader auth/exposure problem

## Quick trigger map by file path

- `apps/admin/**`
  - `fb-change-impact-gate`
  - `fb-admin-csrf-guard` if mutate flow exists
  - `fb-test-gatekeeper`
- `src/app/api/admin/**`
  - `fb-admin-csrf-guard`
  - `fb-security-gate`
  - `fb-test-gatekeeper`
- `src/lib/auth.ts`
  - `fb-security-gate`
  - `fb-admin-csrf-guard`
  - `fb-test-gatekeeper`
- `migrations/**`, `database-schema.sql`
  - `fb-migrations-maintainer`
  - `fb-test-gatekeeper`
  - `fb-deploy-operator`
- `scripts/deploy*`, `.github/workflows/**`, `docker-compose*`, `Dockerfile*`
  - `fb-change-impact-gate`
  - `fb-deploy-operator`
  - `fb-release-smoke-operator`
- `src/lib/email.ts`, `src/lib/imap-client.ts`, `src/lib/openrouter.ts`, `src/lib/yandex-direct/api.ts`
  - `fb-integrations-watchdog`
  - `fb-env-secrets-keeper`
- `src/app/api/telegram/webhook/route.ts`, `src/lib/telegram-*`
  - `fb-telegram-incident-runbook` for incidents
  - `fb-integrations-watchdog` for non-incident provider changes

## Release ladder

For most non-trivial changes, the ideal ladder is:

1. `fb-change-impact-gate`
2. specialist skill(s)
3. `fb-test-gatekeeper`
4. `fb-deploy-operator`
5. `fb-release-smoke-operator`

## Maintenance rule

When a new recurring class of work appears, either:
1. extend an existing project skill if it is truly the same domain
2. or create a new repo-specific skill and update this routing map
