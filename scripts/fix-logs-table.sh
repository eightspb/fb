#!/bin/bash
# Скрипт для создания таблицы app_logs на сервере

set -e

COMPOSE_FILE="docker-compose.ssl.yml"

echo ""
echo "=== Создание таблицы app_logs ==="
echo ""

echo "1. Проверка существования таблицы..."
TABLE_EXISTS=$(docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -tA -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_logs');")

if [ "$TABLE_EXISTS" = "t" ]; then
    echo "   ✅ Таблица app_logs уже существует"
else
    echo "   ❌ Таблица app_logs не существует, создаём..."
    
    docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres <<'SQL'
-- Создание таблицы app_logs
CREATE TABLE IF NOT EXISTS app_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  context TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_context ON app_logs(context);
CREATE INDEX IF NOT EXISTS idx_app_logs_path ON app_logs(path);

-- RLS отключен (безопасность через admin-session в API)
ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если они были
DROP POLICY IF EXISTS "Allow insert on app_logs" ON app_logs;
DROP POLICY IF EXISTS "Allow read for postgres on app_logs" ON app_logs;
SQL
    
    echo "   ✅ Таблица app_logs создана"
fi

echo ""
echo "2. Проверка структуры таблицы..."
docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -c "\d app_logs"

echo ""
echo "3. Проверка RLS..."
docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -c "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'app_logs';"

echo ""
echo "4. Тест INSERT..."
docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -c "INSERT INTO app_logs (level, message, context) VALUES ('info', 'Тест после создания таблицы', 'ServerSetup');"

echo ""
echo "5. Тест SELECT..."
docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -c "SELECT COUNT(*) as total_logs FROM app_logs;"

echo ""
echo "=== Таблица готова к использованию ==="
echo ""
