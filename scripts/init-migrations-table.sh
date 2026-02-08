#!/bin/bash
# Скрипт для инициализации таблицы миграций

set -e

COMPOSE_FILE="${1:-docker-compose.ssl.yml}"

echo "Инициализация таблицы schema_migrations..."

# Создаем/нормализуем таблицу миграций
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
  ) THEN
    CREATE TABLE schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'name'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'migration'
      ) THEN
        ALTER TABLE schema_migrations RENAME COLUMN migration TO name;
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'version'
      ) THEN
        ALTER TABLE schema_migrations RENAME COLUMN version TO name;
      ELSE
        ALTER TABLE schema_migrations ADD COLUMN name VARCHAR(255);
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'applied_at'
    ) THEN
      ALTER TABLE schema_migrations ADD COLUMN applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
  END IF;
END
$$;
SQL

echo "✅ Таблица schema_migrations готова"
