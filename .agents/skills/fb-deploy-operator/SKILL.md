---
name: fb-deploy-operator
description: "Управляет деплоем fibroadenoma.net через поддерживаемые bash-скрипты и проверяемые post-checks. Активируй при упоминаниях deploy, релиз, rollout, rollback, app/site/admin/full deploy, выкатить на прод, production rollout, post-deploy checks, release validation, а также когда нужно выбрать корректный режим выкладки по diff."
---

# fb-deploy-operator

## Цель
Делай релиз предсказуемым: правильный режим, правильный скрипт, обязательные post-checks.
Для этого проекта “правильный путь” - локальный запуск поддерживаемых bash-скриптов, а не импровизация через случайные `docker compose` команды.

## Что сначала читать
1. Используй этот `SKILL.md`.
2. Для быстрого операционного сценария загрузи `references/QUICK_START.md`.
3. Для детального режима выкладки загрузи `references/DEPLOY_GUIDE.md`.
4. Для CI/automation контекста загрузи `references/AUTOMATION_GUIDE.md`.
5. Для списка скриптов загрузи `scripts/README.md`.

## Репозиторные факты
1. `site` обслуживает публичный сайт и весь `/api/*`, включая `/api/admin/*`.
2. `admin` - отдельный UI-контейнер под `/admin`.
3. Основной entrypoint: `bash scripts/deploy.sh <mode>`.
4. Режимы: `app`, `site`, `admin`, `full`.
5. `app` = `site + admin` без миграций БД. Это основной сценарий в большинстве релизов.

## Рабочий процесс

### Шаг 1. Выбери режим деплоя
Если режим не указан, сначала классифицируй diff через `fb-change-impact-gate`.

Правило выбора:
1. Только `apps/admin/**` и нет API/schema changes -> `admin`
2. Только public site/runtime/API без admin UI -> `site`
3. Оба приложения без schema changes -> `app`
4. Любые миграции/schema changes -> `full`

### Шаг 2. Сделай pre-flight
Перед релизом подтверди:
1. branch/commit понятны
2. есть минимально достаточный test run
3. если есть миграции, выбран `full`
4. нет неосознанного дрейфа режима

Команды:

```bash
git status --short
git rev-parse --abbrev-ref HEAD
```

Если тесты не подтверждены, передай в `fb-test-gatekeeper`.
Если есть schema changes, передай в `fb-migrations-maintainer`.

### Шаг 3. Используй поддерживаемый entrypoint
Предпочитай:

```bash
bash scripts/deploy.sh app
bash scripts/deploy.sh site
bash scripts/deploy.sh admin
bash scripts/deploy.sh full
```

Низкоуровневый путь используй только если нужен явный флаг:

```bash
bash scripts/deploy-from-github.sh --app-only
bash scripts/deploy-from-github.sh --site-only
bash scripts/deploy-from-github.sh --admin-only
bash scripts/deploy-from-github.sh
```

### Шаг 4. Всегда делай post-checks
Минимум проверь:
1. `/` отвечает `200`
2. `/admin` отвечает `200`
3. `/api/health` отвечает `200` и JSON со `status: ok`
4. если релиз затрагивал Telegram/email/AI - проверь интеграцию или передай в профильный skill

### Шаг 5. Честно говори про rollback
В проекте нет одного универсального “волшебного” rollback-скрипта для локального оператора.
Если post-checks красные:
1. зафиксируй симптом
2. оцени, нужен ли немедленный redeploy предыдущей известной ветки/коммита
3. если это post-deploy incident по интеграции, handoff в профильный skill
4. не обещай автоматический rollback, которого нет в поддерживаемом bash flow

## Handoff-правила
1. Непонятно, что затронуто -> `fb-change-impact-gate`
2. Неясно, какие тесты обязательны -> `fb-test-gatekeeper`
3. Есть миграции/схема -> `fb-migrations-maintainer`
4. Нужны post-deploy smoke checks -> `fb-release-smoke-operator`
5. После релиза упал Telegram -> `fb-telegram-incident-runbook`
6. После релиза упала внешняя интеграция -> `fb-integrations-watchdog`

## Anti-patterns
1. Запускать произвольные `docker compose build/up` вместо поддерживаемого deploy entrypoint.
2. Делать `admin` deploy при изменениях в `/api/admin/*` и думать, что backend обновился.
3. Гонять `full`, когда нужен `app`, без причины.
4. Считать deploy успешным только по exit code.
5. Обещать rollback без проверки, что для этого есть реальный путь.

## Итоговый отчет

```text
[DEPLOY]
mode:
branch:
commit:
preflight_tests:
migrations_required: yes/no
command_used:
post_checks:
- /
- /admin
- /api/health
result: success/fail
next_action:
```
