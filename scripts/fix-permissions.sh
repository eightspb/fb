#!/bin/bash
set -e

echo "🔧 Исправление прав доступа для пользователей Supabase..."

cd /opt/fibroadenoma.net

# Выполняем SQL команды
docker exec -i fb-net-db psql -U supabase_admin -d postgres <<EOF
-- 1. Права для Auth (GoTrue)
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
ALTER USER supabase_auth_admin SET search_path = auth;

-- 2. Права для Storage
GRANT USAGE ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO supabase_storage_admin;
ALTER USER supabase_storage_admin SET search_path = storage;

-- 3. Права для Authenticator (PostgREST)
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT USAGE ON SCHEMA storage TO authenticator;
GRANT USAGE ON SCHEMA auth TO authenticator;

-- Даем права роли anon и authenticated (через authenticator)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO anon, authenticated;

-- 4. Убедимся, что расширения включены
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

EOF

echo "✅ Права доступа обновлены"

echo "🔄 Перезапуск сервисов..."
docker compose -f docker-compose.production.yml restart supabase-storage supabase-auth

echo "⏳ Ждем 5 секунд..."
sleep 5

echo "📊 Статус:"
docker ps | grep -E "(storage|auth)"
echo ""
echo "📋 Логи Storage:"
docker logs fb-net-storage --tail 10

