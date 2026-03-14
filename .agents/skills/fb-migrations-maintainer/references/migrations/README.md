# fb.net Migration Conventions

## Naming
1. Используй `NNN_description.sql`.
2. Бери следующий свободный номер после максимального текущего.
3. Не копируй исторические дубли вроде `006_*`.

## Apply order
1. Серверный script проходит по `*.sql` в сортировке по имени.
2. Состояние фиксируется в `schema_migrations`.
3. Новая миграция должна быть безопасна при повторном запуске.

## Обязательные правила
1. `IF NOT EXISTS` / `IF EXISTS`, где возможно
2. минимальный scope на одну миграцию
3. синхронно обновляй `database-schema.sql`, если меняется базовая схема
4. destructive change - только с явным approve

## Проверки перед релизом
1. migration file создан
2. snapshot обновлён
3. deploy mode = `full`
4. тестовая матрица пересчитана

## Команды
```bash
bash scripts/apply-migrations.sh
bash scripts/apply-migrations-remote.sh docker-compose.ssl.yml
```
