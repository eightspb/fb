#!/bin/bash
# Скрипт для проверки и применения миграции на сервере

set -e

COMPOSE_FILE="docker-compose.ssl.yml"

echo ""
echo "=== Проверка миграции 006_fix_app_logs_rls ==="
echo ""

# 1. Проверяем, применена ли миграция
echo "1. Проверка применённых миграций..."
MIGRATION_EXISTS=$(docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -tA -c "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = '006_fix_app_logs_rls');")

if [ "$MIGRATION_EXISTS" = "t" ]; then
    echo "   ✅ Миграция применена"
else
    echo "   ❌ Миграция НЕ применена, применяем..."
    docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f migrations/006_fix_app_logs_rls.sql
    docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -c "INSERT INTO schema_migrations (name) VALUES ('006_fix_app_logs_rls');"
    echo "   ✅ Миграция применена успешно"
fi

# 2. Проверяем статус RLS
echo ""
echo "2. Проверка статуса RLS для app_logs..."
docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -c "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'app_logs';"

# 3. Проверяем политики
echo ""
echo "3. Проверка политик RLS..."
POLICIES=$(docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -tA -c "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'app_logs';")
echo "   Найдено политик: $POLICIES"

if [ "$POLICIES" -gt "0" ]; then
    echo "   ⚠️  ПРОБЛЕМА: Политики RLS все еще существуют!"
    docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -c "SELECT * FROM pg_policies WHERE tablename = 'app_logs';"
else
    echo "   ✅ Политики RLS удалены"
fi

# 4. Тестируем SELECT
echo ""
echo "4. Тест SELECT запроса..."
LOGS_COUNT=$(docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -tA -c "SELECT COUNT(*) FROM app_logs;")
echo "   Всего логов в БД: $LOGS_COUNT"

if [ "$LOGS_COUNT" -gt "0" ]; then
    echo "   Последние 3 лога:"
    docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d postgres -c "SELECT id, level, substring(message, 1, 50) as msg, created_at FROM app_logs ORDER BY created_at DESC LIMIT 3;"
fi

echo ""
echo "=== Проверка завершена ==="
echo ""
