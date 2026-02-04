# Очистка миграций - 04.02.2026

## Проблема

При деплое возникали ошибки:
```
ERROR: relation "schema_migrations" does not exist
psql: error: migrations/add-conference-slug.sql: No such file or directory
[INFO]   [APPLY] add-conference-slug
```

## Причина

1. **Дублирование изменений**: Миграции добавляли поля и индексы, которые **уже были** в `database-schema.sql`:
   - `conferences.slug` - уже в схеме
   - `conferences.date_end`, `cover_image`, `speakers` - уже в схеме
   - Индексы для новостей - уже в схеме
   - Таблицы аналитики - были только в миграции

2. **Таблица schema_migrations не создавалась**: В `database-schema.sql` не было создания служебной таблицы для отслеживания миграций

3. **Лишние проверки**: При каждом деплое скрипт тратил ~10-20 секунд на проверку миграций, даже если они уже применены

## Что сделано

### 1. Удалены избыточные миграции
- ❌ `add-conference-slug.sql` - поле уже в схеме
- ❌ `add-news-indexes.sql` - индексы уже в схеме  
- ❌ `update-conferences-table.sql` - поля уже в схеме
- ❌ `analytics-tables.sql` - перенесено в основную схему

### 2. Обновлен `database-schema.sql`
Добавлены таблицы аналитики, которых раньше не было:
- `visitor_sessions` - активные сессии посетителей
- `page_visits` - история посещений
- `ip_geolocation_cache` - кэш геолокации
- Функции очистки: `cleanup_old_sessions()`, `cleanup_old_geo_cache()`

### 3. Добавлен флаг `-SkipMigrations` в скрипт деплоя
Теперь можно пропустить проверку миграций:
```powershell
.\scripts\deploy-from-github.ps1 -AppOnly -SkipMigrations
```

### 4. Улучшена обработка пустой папки миграций
Скрипт теперь корректно работает, если в `migrations/` нет .sql файлов.

## Как использовать

### Быстрый деплой (обычное обновление кода)
```powershell
.\scripts\deploy-from-github.ps1 -AppOnly -SkipMigrations
```
**Результат**: БД работает, миграции не проверяются, ~30 секунд

### Деплой с проверкой миграций (если добавили новые)
```powershell
.\scripts\deploy-from-github.ps1 -AppOnly
```
**Результат**: БД работает, новые миграции применятся, ~45 секунд

### Полный деплой (первый запуск или большие изменения)
```powershell
.\scripts\deploy-from-github.ps1
```
**Результат**: Все контейнеры пересобираются, ~2 минуты

## Что нужно сделать на сервере?

### Если БД создана недавно из `database-schema.sql`
**Ничего!** Все таблицы уже есть, включая аналитику.

### Если БД старая и в ней нет таблиц аналитики
Выполните на сервере:
```bash
ssh root@155.212.217.60
cd /opt/fb-net

# Применяем обновленную схему (создаст только недостающие таблицы)
docker compose -f docker-compose.production.yml exec -T postgres psql -U postgres -d postgres < database-schema.sql
```

Все команды с `IF NOT EXISTS` безопасны - не перезапишут существующие данные.

## Преимущества нового подхода

✅ Нет дублирования изменений  
✅ Нет ошибок при деплое  
✅ Быстрее деплой (можно пропустить проверку миграций)  
✅ Все изменения в одном месте (`database-schema.sql`)  
✅ Новые установки получают актуальную схему сразу  

## Работа с миграциями в будущем

См. подробности в `migrations/README.md`

**Вкратце:**
- Для новых таблиц - добавляйте в `database-schema.sql` с `IF NOT EXISTS`
- Для изменения существующих таблиц - создавайте миграцию + обновляйте схему
- Всегда используйте безопасные команды: `IF NOT EXISTS`, `IF EXISTS`, `ADD COLUMN IF NOT EXISTS`
