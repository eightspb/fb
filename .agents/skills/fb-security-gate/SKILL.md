---
name: fb-security-gate
description: "Делает project-specific security review для fibroadenoma.net. Активируй при запросах про безопасность, security review, auth, cookies, headers, hardening, SSRF, SQL injection, uploads, rate limit, captcha, secure-by-default, а также перед merge/deploy чувствительных изменений в auth, admin API, integrations, migrations, email, AI и webhook flows."
---

# fb-security-gate

## Цель
Проверять не только абстрактные best practices, а реальные доверительные границы этого репо: `site`, `admin`, `/api/admin/*`, публичные формы, внешние интеграции и секреты.

## Что читать
1. Используй этот `SKILL.md`.
2. Для чеклиста загрузи `references/SECURITY_CHECKLIST.md`.

## Фокус-зоны проекта
1. Admin auth/session/JWT
2. CSRF на `/api/admin/*`
3. Public write endpoints: contact/request/subscribe/conference registration
4. Upload/image/attachments flows
5. SQL/query construction в `src/lib/**` и route handlers
6. Outbound calls: Telegram, SMTP/IMAP, OpenRouter, Polza, Yandex, Upstash
7. Security headers и cookie flags

## Рабочий процесс

### Шаг 1. Определи тип security review
1. auth/admin
2. public input/form
3. schema/data sensitivity
4. integration/secret
5. release hardening

### Шаг 2. Проверь repo-specific guardrails
Минимум:
1. admin routes -> auth + CSRF
2. cookies -> `httpOnly`, `sameSite`, `secure` policy там, где нужно
3. public inputs -> validation, abuse control, captcha/rate limit при необходимости
4. DB queries -> parameterized, без string interpolation для user input
5. external calls -> URL/input не дают SSRF-like surprises

### Шаг 3. Не ограничивайся dependency audit
`bun pm audit` полезен, но этого недостаточно.
Ищи архитектурные риски в коде и в deploy/setup scripts.

### Шаг 4. Привяжи findings к impact
Каждый finding классифицируй:
1. exploitability
2. user impact
3. mitigations already present
4. required follow-up skill

## Обязательные handoff
1. Admin CSRF/path contract -> `fb-admin-csrf-guard`
2. Env/secret hygiene -> `fb-env-secrets-keeper`
3. Schema/data sensitivity -> `fb-migrations-maintainer`
4. Release-time validation -> `fb-release-smoke-operator`
5. Provider/API failures or secret-driven outages -> `fb-integrations-watchdog`

## Anti-patterns
1. Считать security review завершённым после `bun pm audit`.
2. Проверять только route handlers и игнорировать deploy/scripts/env.
3. Не различать public endpoints и admin-only flows.
4. Проглатывать raw findings без severity/practical impact.

## Итоговый отчет

```text
[SECURITY REVIEW]
scope:
high_risk_areas:
findings:
required_fixes:
follow_up_skills:
ship_blocker: yes/no
```
