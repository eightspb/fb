---
name: fb-change-impact-gate
description: "Анализирует diff fibroadenoma.net и определяет impact: какие зоны затронуты, какие skills подключить, какие тесты запускать, какой режим deploy нужен и какие smoke-checks обязательны. Активируй при вопросах про scope, impact analysis, preflight, какой deploy mode, что проверить перед merge/release, а также автоматически перед релизом, если изменения ещё не классифицированы."
---

# fb-change-impact-gate

## Цель
Быстро превращать список изменённых файлов в операционный план.
Этот skill - первый слой orchestration перед тестами, миграциями, security review и deploy.

## Что читать
1. Используй этот `SKILL.md`.
2. Для быстрой матрицы загрузи `references/IMPACT_MATRIX.md`.

## Классификация зон
1. `apps/admin/**` -> admin UI
2. `src/app/api/admin/**` -> admin backend
3. `src/app/api/**` вне admin -> public/backend API
4. `src/components/**`, `src/app/**` -> public site UX/content
5. `src/lib/**` -> shared business logic/integrations/auth
6. `migrations/**`, `database-schema.sql` -> schema
7. `scripts/**`, `docker-compose*`, `Dockerfile*`, `.github/workflows/**` -> operations/release infra

## Рабочий процесс

### Шаг 1. Собери diff
```bash
git diff --name-only --cached
git diff --name-only
```

### Шаг 2. Сопоставь файлы с impact zones
Для каждой зоны ответь:
1. какой risk level
2. какие skills обязательны
3. какие тесты обязательны
4. какой deploy mode нужен
5. какие smoke-checks обязательны

### Шаг 3. Назначь обязательные skills
Типичные handoff:
1. admin non-GET или admin API -> `fb-admin-csrf-guard`
2. schema -> `fb-migrations-maintainer`
3. release/deploy -> `fb-deploy-operator`
4. testing -> `fb-test-gatekeeper`
5. secrets/env -> `fb-env-secrets-keeper`
6. security-sensitive зоны -> `fb-security-gate`
7. post-deploy validation -> `fb-release-smoke-operator`
8. external providers -> `fb-integrations-watchdog`

### Шаг 4. Сформируй verdict
Выдай краткий план:

```text
[IMPACT]
zones:
risk:
required_skills:
tests:
deploy_mode:
smoke_checks:
```

## Risk heuristics
1. `apps/admin/**` only -> medium, если есть mutate-flow
2. `src/lib/auth.ts`, cookies, middleware, `/api/admin/*` -> high
3. `migrations/**` -> high
4. `scripts/deploy*`, compose, workflows -> high
5. static content/style only -> low

## Anti-patterns
1. Видеть change в `apps/admin` и забывать, что backend всё равно может жить в `site`.
2. Видеть `/api/admin/*` и выбирать deploy mode `admin`.
3. Видеть migration file и не повышать risk/test/deploy requirements.
4. Не подключать `fb-env-secrets-keeper`, когда тронуты env-driven зоны.
