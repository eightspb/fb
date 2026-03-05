# Миграции базы данных

Папка содержит SQL-миграции, применяемые скриптом `scripts/apply-migrations-remote.sh`.

## Текущие файлы

- `001_add_request_fields.sql`
- `003_restructure_conferences.sql`
- `004_add_videos_to_conferences.sql`
- `005_add_email_templates.sql`
- `006_fix_app_logs_rls.sql`
- `006_update_conference_email_template.sql`
- `007_add_site_banner.sql`
- `008_add_direct_bidder.sql`
- `009_add_direct_templates_and_provisioning.sql`
- `010_remove_supabase_policies.sql`
- `011_add_crm_emails.sql`
- `012_add_imap_uid_to_attachments.sql`
- `013_fix_uid_bigint.sql`

## Как применяются миграции

1. На сервере вызывается `scripts/init-migrations-table.sh`.
2. Затем `scripts/apply-migrations-remote.sh` идет по файлам `*.sql` по имени (sort).
3. Для каждой миграции проверяется запись в `schema_migrations`.
4. Новые миграции применяются один раз и фиксируются в `schema_migrations`.

## Правила для новых миграций

- Используйте последовательную нумерацию: `014_some_change.sql`, `015_...`.
- Пишите идемпотентный SQL:
  - `CREATE TABLE IF NOT EXISTS`
  - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
  - `DROP ... IF EXISTS`
  - `CREATE INDEX IF NOT EXISTS`
- Если миграция меняет базовую схему для новых инсталляций, синхронно обновляйте `database-schema.sql`.

## Ручной запуск (если нужно)

```bash
# На сервере, из /opt/fb-net
bash scripts/apply-migrations-remote.sh docker-compose.ssl.yml
```

```bash
# Локально (если есть .env и контейнер БД)
bash scripts/apply-migrations.sh
```
