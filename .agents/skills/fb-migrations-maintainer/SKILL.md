---
name: fb-migrations-maintainer
description: "Управляет миграциями базы данных FreshBurger. Активируй при: 'новая таблица', 'новая колонка', 'изменить схему', 'миграция', 'migration', 'ALTER TABLE', 'CREATE TABLE', 'добавить поле', 'удалить поле', 'изменить тип колонки', 'database schema', 'schema change', 'apply migration', 'schema_migrations', 'database-schema.sql', 'нужна связь между таблицами', 'new entity in db'. Также активируй, если новая фича явно требует изменений БД."
---

# fb-migrations-maintainer

## Цель
Создавай и применяй миграции безопасно и повторяемо, чтобы схема БД эволюционировала без поломок прода.

## Прогрессивная загрузка (не читай всё сразу)
1. Сначала используй этот `SKILL.md`.
2. Для соглашений по SQL/именованию/порядку применения загрузи `references/migrations/README.md`.
3. Не загружай reference-файл, если задача не касается схемы БД.

## Принцип: каждая миграция идемпотентна
Используй `IF NOT EXISTS`/`IF EXISTS`, потому что повторный запуск миграции не должен ломать окружение.

## Алгоритм работы

### Шаг 1. Определи, нужна ли миграция
Проверь, затрагивают ли изменения схему БД, потому что не каждая backend-правка требует SQL-миграции.

Примеры сигналов:
1. Новая сущность -> новая таблица.
2. Новое поле в UI/API -> новая колонка.
3. Новой выборке нужен индекс -> `CREATE INDEX`.

Пример обнаружения:
```bash
git diff --name-only main...HEAD
# Ожидаемый результат: список файлов; если есть changes в model/schema/sql, почти всегда нужна миграция
```

### Шаг 2. Создай файл миграции
Создай timestamp-файл, потому что строгий порядок применения критичен для воспроизводимости.

Формат имени:
```text
YYYYMMDDHHMMSS_<description>.sql
```

Пример:
```text
20260306120000_add_loyalty_points_to_users.sql
```

Шаблон:
```sql
-- Migration: add_loyalty_points_to_users
-- Description: Add loyalty_points column to users
-- Author: Claude
-- Date: 2026-03-06

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_loyalty_points ON users (loyalty_points);

COMMIT;
```

### Шаг 3. Обнови `database-schema.sql`
Обнови snapshot схемы, потому что он нужен для ревью, onboarding и диффа структуры без выполнения миграций.

Пример:
```bash
rg -n "loyalty_points" database-schema.sql
# Ожидаемый результат: новая колонка и, если применимо, индекс отражены в файле
```

### Шаг 4. Примени миграцию
Сначала локально, затем удаленно, потому что локальная проверка уменьшает риск прод-инцидента.

Локально:
```bash
psql -d freshburger -f migrations/20260306120000_add_loyalty_points_to_users.sql
# Ожидаемый результат: ALTER TABLE / CREATE INDEX / COMMIT
```

Удаленно:
```bash
./scripts/apply-migrations-remote.sh 20260306120000_add_loyalty_points_to_users.sql
# Ожидаемый результат: migration applied on remote
```

### Шаг 5. Проверь факт применения
Проверь журнал миграций и схему, потому что успешный exit code сам по себе не гарантирует корректную структуру.

Пример:
```sql
SELECT version, applied_at
FROM schema_migrations
ORDER BY version DESC
LIMIT 5;
```

Ожидаемый результат:
```text
Новая версия миграции присутствует, applied_at не NULL
```

Пример структуры таблицы:
```sql
\d users
```

Ожидаемый результат:
```text
Есть колонка loyalty_points integer default 0
```

## Правила безопасности
1. Никогда не выполняй `DROP TABLE`/`DROP COLUMN` без явного подтверждения пользователя.
2. Для деструктивных изменений требуй двойное подтверждение.
3. Для таблиц >1M строк предупреждай о lock-risk.
4. При создании индексов на больших таблицах предлагай `CREATE INDEX CONCURRENTLY`.

Пример безопасного варианта:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders (created_at);
```

## Идемпотентность
1. Любая миграция должна быть безопасна при повторном запуске.
2. Скрипт remote apply должен корректно обрабатывать уже примененную версию.
3. Проверка результата должна быть read-only.

## Взаимодействие с другими скилами
1. Если обнаружено, что миграция нужна перед релизом, передай управление скилу `fb-deploy-operator` — он лучше справится с полным релизным сценарием после применения схемы.
2. Если обнаружено, что перед применением миграции нужно прогнать обязательный набор тестов, передай управление скилу `fb-test-gatekeeper` — он лучше справится с тестовой матрицей.

## Когда НЕ использовать этот скил
1. Деплой кода без изменения схемы: используй `fb-deploy-operator`.
2. Seed/инициализация справочников без изменения структуры: это не schema migration.
3. Исправление CSRF в admin API: используй `fb-admin-csrf-guard`.
4. Инциденты Telegram: используй `fb-telegram-incident-runbook`.

## Decision Tree: нужна ли миграция
```text
START
  |
  |-- Изменяется структура данных (таблица/колонка/индекс/constraint)?
  |     |-- Нет -> миграция не нужна
  |     |-- Да -> миграция нужна
  |
  |-- Изменение потенциально деструктивно?
  |     |-- Да -> запроси явное подтверждение + rollback plan
  |     |-- Нет -> стандартный flow
  |
  |-- Таблица крупная (>1M строк)?
  |     |-- Да -> оцени lock-risk + CONCURRENTLY для индексов
  |     |-- Нет -> стандартный apply
  |
  |-- Локальный apply успешен?
  |     |-- Нет -> исправь SQL, не иди в remote
  |     |-- Да -> remote apply
  |
  |-- remote apply успешен?
        |-- Нет -> инцидент, rollback/mitigation
        |-- Да -> verify schema + schema_migrations
```

### Decision Tree: тип изменения
1. Additive change (новая колонка/индекс/таблица) -> низкий риск, стандартный процесс.
2. Transform change (изменение типа, constraint) -> средний риск, доппроверка данных.
3. Destructive change (`DROP`, массовый rewrite) -> высокий риск, только с явным approve.

### Decision Tree: rollback strategy
1. Если миграция additive и не ломает совместимость, часто rollback не нужен.
2. Если миграция изменила тип/ограничения и вызвала ошибки, нужен rollback plan.
3. Если миграция частично применилась, фиксируй состояние и не повторяй blindly.

## Стандарт проектирования миграции
1. Пиши верхние комментарии: `Migration`, `Description`, `Date`.
2. Оборачивай изменения в `BEGIN/COMMIT`, если DDL допускает транзакцию.
3. Добавляй `IF EXISTS/IF NOT EXISTS`.
4. Избегай долгих блокировок.
5. Сохраняй фокус миграции на одной логической цели.

Пример:
```sql
BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders (source);
COMMIT;
```

## Anti-patterns и как исправлять
1. Anti-pattern: несколько несвязанных изменений в одной миграции.
   Почему плохо: сложнее откат и ревью.
   Исправление: одна миграция = одна цель.

2. Anti-pattern: отсутствие `IF NOT EXISTS`.
   Почему плохо: повторный apply падает.
   Исправление: делай миграции идемпотентными.

3. Anti-pattern: `DROP COLUMN` без явного approve.
   Почему плохо: риск потери данных.
   Исправление: запрашивай подтверждение и план восстановления.

4. Anti-pattern: создание тяжелого индекса без `CONCURRENTLY` на больших таблицах.
   Почему плохо: длительный lock.
   Исправление: используй `CREATE INDEX CONCURRENTLY`.

5. Anti-pattern: применить remote без локальной проверки.
   Почему плохо: прод-инцидент из-за синтаксиса/логики.
   Исправление: сначала локальный apply.

6. Anti-pattern: не обновлять `database-schema.sql`.
   Почему плохо: snapshot устаревает.
   Исправление: обновляй schema snapshot в том же change set.

7. Anti-pattern: не проверять `schema_migrations`.
   Почему плохо: нельзя доказать факт применения.
   Исправление: фиксируй версию и `applied_at`.

8. Anti-pattern: backfill и schema change в одной тяжелой транзакции.
   Почему плохо: long-running locks.
   Исправление: разделяй schema и data migration.

9. Anti-pattern: игнорировать несоответствие окружений.
   Почему плохо: локально работает, удаленно падает.
   Исправление: валидируй версию PostgreSQL и extension-ы.

10. Anti-pattern: использовать `SELECT *` в валидации.
    Почему плохо: шум и неопределенность.
    Исправление: проверяй точечно структуру и индексы.

## Протокол pre-migration check
1. Подтверди необходимость миграции.
2. Оцени риск (low/medium/high).
3. Подтверди наличие backup/restore опции.
4. Подтверди окно обслуживания, если нужно.
5. Проверь, что миграция идемпотентна.

Шаблон:
```text
[MIGRATION PRECHECK]
migration_file:
risk_level:
destructive: yes/no
table_size_estimate:
concurrently_required: yes/no
backup_ready: yes/no
approval_received: yes/no
decision: proceed/block
```

## Протокол post-migration verify
1. Проверь запись в `schema_migrations`.
2. Проверь наличие новой структуры (`\d`/`information_schema`).
3. Проверь ключевые запросы приложения.
4. Зафиксируй результат.

Пример SQL:
```sql
SELECT version, applied_at
FROM schema_migrations
WHERE version = '20260306120000'
LIMIT 1;
```

## Шаблоны отчетов
### Шаблон: migration apply report
```text
[MIGRATION APPLY]
file:
local_apply: pass/fail
remote_apply: pass/fail
apply_start_utc:
apply_end_utc:
errors:
```

### Шаблон: migration verification report
```text
[MIGRATION VERIFY]
version_present: yes/no
applied_at_present: yes/no
schema_snapshot_updated: yes/no
functional_smoke: pass/fail
result: pass/fail
```

### Шаблон: destructive change confirmation
```text
[DESTRUCTIVE CHANGE CONFIRMATION]
operation:
impact:
data_loss_risk:
rollback_plan:
user_confirmation: yes/no
```

### Шаблон: handoff в deploy skill
```text
[HANDOFF]
from_skill: fb-migrations-maintainer
to_skill: fb-deploy-operator
reason: migration applied and verified, ready for release
required_checks: post-deploy API + DB smoke
```

## Stop-conditions
1. Нет явного подтверждения для деструктивной операции.
2. Локальный apply не проходит.
3. Нельзя подтвердить запись в `schema_migrations`.
4. Нельзя обновить `database-schema.sql`.
5. Отсутствует доступ к целевой БД/окружению.

## Критерии готовности
1. Миграция создана по шаблону именования.
2. Миграция идемпотентна.
3. `database-schema.sql` обновлен.
4. Локальный и/или remote apply подтвержден.
5. `schema_migrations` содержит новую версию.
6. Заполнен минимум один migration report шаблон.

## Формат финального ответа пользователю
1. Что изменено в схеме.
2. Какая миграция создана/применена.
3. Что проверено.
4. Есть ли риски/дальнейшие шаги.

Пример:
```text
Добавлена колонка users.loyalty_points и индекс idx_users_loyalty_points
Миграция: 20260306120000_add_loyalty_points_to_users.sql
Проверка: schema_migrations и \d users подтверждают изменение
Риск: низкий, destructive операций нет
```
