---
name: fb-migrations-maintainer
description: "Управляет безопасными SQL-миграциями fibroadenoma.net. Активируй при schema changes, новой таблице/колонке/индексе, изменении database-schema.sql, работе с migrations/, apply migration, schema_migrations, backfill, zero-downtime, lock-risk, pgvector и любых фичах, где структура БД меняется вместе с кодом."
---

# fb-migrations-maintainer

## Цель
Меняй схему БД так, чтобы код, миграции и snapshot схемы оставались согласованными.
Для этого репо важны не абстрактные “best practices”, а точная дисциплина вокруг `migrations/`, `database-schema.sql` и deploy mode `full`.

## Что сначала читать
1. Используй этот `SKILL.md`.
2. Для правил по naming/apply order загрузи `references/migrations/README.md`.

## Репозиторные факты
1. Миграции лежат в `migrations/*.sql`.
2. Текущий формат имени: `NNN_description.sql`.
3. Исторически есть дубли (`006_*`), но новые файлы должны брать следующий свободный номер после максимального текущего.
4. Базовый snapshot схемы: `database-schema.sql`.
5. На проде миграции применяются через `scripts/apply-migrations-remote.sh`.

## Рабочий процесс

### Шаг 1. Подтверди, что schema change действительно нужен
Сигналы:
1. новая сущность
2. новое поле, которое хранится в БД
3. новый индекс/constraint
4. pgvector/search/storage changes

Если change только в коде без структуры данных, миграция не нужна.

### Шаг 2. Выбери следующий номер
Не используй timestamp naming и не повторяй исторические номера.
Ориентируйся на текущий максимум в `migrations/`.

```bash
ls migrations/*.sql | sed 's#.*/##' | sort
```

### Шаг 3. Дизайн миграции
Правила:
1. одна логическая цель на файл
2. additive changes предпочитай destructive
3. `IF EXISTS/IF NOT EXISTS` везде, где возможно
4. backfill отделяй от тяжелого schema rewrite
5. если таблица большая и нужен индекс - думай про lock-risk и `CONCURRENTLY`

### Шаг 4. Обнови snapshot схемы
Если меняется структура, вместе с миграцией обнови `database-schema.sql`.

### Шаг 5. Проверь путь релиза
Если миграция появилась:
1. deploy mode почти всегда `full`
2. тестовая матрица должна стать строже
3. нужен handoff в `fb-test-gatekeeper` и `fb-deploy-operator`

## Безопасность и риск
1. `DROP TABLE` и `DROP COLUMN` - только с явным approve.
2. Изменение типа колонок - medium/high risk, особенно на populated tables.
3. Большие backfill'ы не смешивай с коротким релизным окном без причины.
4. Если change ломает backwards compatibility, зафиксируй rollout order.

## Проверки
Минимум:
1. SQL review
2. `database-schema.sql` sync
3. проверка `schema_migrations` strategy
4. правильный deploy mode

Если средний/высокий риск:
1. targeted validation queries
2. handoff в `fb-security-gate`, если затронуты auth/PII/attachments/notes

## Handoff-правила
1. Непонятно, насколько change широкий -> `fb-change-impact-gate`
2. Нужно выбрать тесты -> `fb-test-gatekeeper`
3. Нужно релизить -> `fb-deploy-operator`
4. Нужно усиленное security review -> `fb-security-gate`
5. Нужен post-deploy smoke по read/write flows -> `fb-release-smoke-operator`

## Anti-patterns
1. Делать schema + heavy backfill + app logic rewrite в одном большом шаге.
2. Забывать обновлять `database-schema.sql`.
3. Использовать timestamp naming, которого в репо нет.
4. Повторять старый номер миграции.
5. Деплоить schema change режимом `app`.

## Итоговый отчет

```text
[MIGRATION]
change:
new_file:
risk: low/medium/high
destructive: yes/no
snapshot_updated: yes/no
backfill_required: yes/no
deploy_mode: full
tests_required:
```
