---
name: fb-test-gatekeeper
description: "Определяет минимально достаточный набор тестов для fibroadenoma.net и выдаёт чёткий go/no-go. Активируй при запуске тестов, CI failures, pre-merge/pre-deploy checks, вопросах какие тесты прогнать, а также когда нужно связать diff с unit/e2e/docker/type-check/lint перед релизом."
---

# fb-test-gatekeeper

## Цель
Подбирать не “максимально возможный”, а минимально достаточный тестовый набор по реальному diff.
Это особенно важно в проекте с двумя приложениями, отдельной админкой, e2e и миграциями.

## Что сначала читать
1. Используй этот `SKILL.md`.
2. Для точных команд загрузи `references/TESTING.md`.
3. Для rerun/flaky policy загрузи `references/tests.md`.

## Базовая матрица
1. `apps/admin/**` UI only -> `type-check:admin`, `lint`, targeted `unit`, при необходимости admin e2e
2. `src/app/api/**` или `src/lib/**` -> `type-check`, `lint`, `test:unit`, при пользовательском флоу добавь `test:e2e`
3. `migrations/**` или `database-schema.sql` -> `type-check`, `lint`, `test:unit`, `test:e2e`, рассмотри `docker:test`
4. `Dockerfile*`, `docker-compose*`, `.github/workflows/**` -> `lint`, relevant build/test flow, иногда `docker:test`
5. Непонятный или широкий diff -> `bun run test:ci`

## Рабочий процесс

### Шаг 1. Классифицируй изменения
Если scope ещё не ясен, сначала handoff в `fb-change-impact-gate` или классифицируй сам по файлам.

### Шаг 2. Собери набор команд
Используй реальные entrypoints из репо:
1. `bun run type-check`
2. `bun run type-check:admin`
3. `bun run lint`
4. `bun run test:unit`
5. `bun run test:e2e`
6. `bun run docker:test`
7. `bun run test:ci`

### Шаг 3. Начинай с дешёвых сигналов
Обычно порядок такой:
1. type-check
2. lint
3. targeted unit
4. e2e
5. docker/ci-equivalent

### Шаг 4. Различай targeted и full run
Примеры targeted прогонов:

```bash
bunx vitest run tests/unit/admin-csrf-fetch.test.ts tests/unit/admin-csrf-client.test.ts
bunx playwright test tests/e2e/admin/contacts.spec.ts
```

Если diff широкий или релизный риск средний/высокий, не экономь и запускай полный релевантный набор.

### Шаг 5. Дай явный вердикт
Формат:

```text
[TEST GATE]
scope:
commands_run:
result: pass/fail
merge_ready: yes/no
deploy_ready: yes/no
residual_risk:
```

## Политика rerun
1. Не делай бесконечные rerun.
2. Один контролируемый rerun допустим для явной инфраструктурной нестабильности.
3. Повторяющийся fail считай реальной проблемой, пока не доказано обратное.

## Handoff-правила
1. Непонятно, что затронуто -> `fb-change-impact-gate`
2. Падает admin save flow с `403` -> `fb-admin-csrf-guard`
3. Есть schema changes -> `fb-migrations-maintainer`
4. После green tests готовимся к rollout -> `fb-deploy-operator`
5. Нужен post-deploy sanity smoke -> `fb-release-smoke-operator`

## Anti-patterns
1. Запускать только unit после изменения `/api/admin/*` и считать risk закрытым.
2. Не гонять `type-check:admin`, когда change ограничен `apps/admin`.
3. Гонять `docker:test` без причин на каждую мелочь.
4. Увеличивать набор тестов на каждом rerun без объяснения.
5. Выдавать “вроде всё ок” без чёткого go/no-go.
