#!/bin/bash
# Скрипт для смены пароля PostgreSQL
# Использование: ./scripts/change-postgres-password.sh NEW_PASSWORD

set -e

cd /opt/fibroadenoma.net

NEW_PASSWORD="${1:-8mdJhdzeAGTVOtLawXK1lZ2ba5T3VhAd}"

if [ -z "$NEW_PASSWORD" ]; then
    echo "❌ Укажите новый пароль"
    echo "Использование: $0 NEW_PASSWORD"
    exit 1
fi

echo "🔐 Смена пароля PostgreSQL..."
echo "   Новый пароль: ${NEW_PASSWORD:0:10}..."

# Определяем текущий пароль из .env.production или .env
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

if [ -f "$ENV_FILE" ]; then
    OLD_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    echo "   Старый пароль найден в $ENV_FILE"
else
    echo "⚠️  Файл .env.production не найден, используем дефолтный пароль"
    OLD_PASSWORD="postgres"
fi

# Проверяем, что контейнер БД запущен
if ! docker ps | grep -q fb-net-db; then
    echo "❌ Контейнер БД не запущен!"
    echo "   Запустите: docker compose -f docker-compose.production.yml up -d supabase-db"
    exit 1
fi

echo ""
echo "📝 Шаг 1: Меняем пароль в PostgreSQL..."

# Меняем пароль для всех пользователей
docker exec -i fb-net-db psql -U supabase_admin -d postgres <<EOF
-- Меняем пароль для основного пользователя
ALTER USER supabase_admin WITH PASSWORD '$NEW_PASSWORD';

-- Меняем пароль для всех пользователей Supabase
ALTER USER supabase_auth_admin WITH PASSWORD '$NEW_PASSWORD';
ALTER USER authenticator WITH PASSWORD '$NEW_PASSWORD';
ALTER USER supabase_storage_admin WITH PASSWORD '$NEW_PASSWORD';

-- Проверяем, что пользователи существуют, если нет - создаем
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin WITH LOGIN PASSWORD '$NEW_PASSWORD';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator WITH LOGIN PASSWORD '$NEW_PASSWORD' NOINHERIT;
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin WITH LOGIN PASSWORD '$NEW_PASSWORD';
  END IF;
END
\$\$;

SELECT 'Пароли успешно изменены' as status;
EOF

echo ""
echo "📝 Шаг 2: Обновляем .env.production..."

# Обновляем или создаем .env.production
if [ ! -f ".env.production" ]; then
    echo "POSTGRES_PASSWORD=$NEW_PASSWORD" > .env.production
    echo "✅ Создан файл .env.production"
else
    # Обновляем пароль в файле
    if grep -q "^POSTGRES_PASSWORD=" .env.production; then
        sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$NEW_PASSWORD|g" .env.production
    else
        echo "POSTGRES_PASSWORD=$NEW_PASSWORD" >> .env.production
    fi
    echo "✅ Обновлен POSTGRES_PASSWORD в .env.production"
fi

# Добавляем экранированную версию для URL (на всякий случай)
ESCAPED_PASSWORD=$(echo "$NEW_PASSWORD" | sed 's|/|%2F|g' | sed 's|@|%40|g' | sed 's|#|%23|g' | sed 's|:|%3A|g' | sed 's| |%20|g')
if grep -q "^POSTGRES_PASSWORD_URL_ENCODED=" .env.production; then
    sed -i "s|^POSTGRES_PASSWORD_URL_ENCODED=.*|POSTGRES_PASSWORD_URL_ENCODED=$ESCAPED_PASSWORD|g" .env.production
else
    echo "POSTGRES_PASSWORD_URL_ENCODED=$ESCAPED_PASSWORD" >> .env.production
fi

echo ""
echo "📝 Шаг 3: Перезапускаем сервисы с новым паролем..."

# Перезапускаем все сервисы, которые используют пароль
docker compose -f docker-compose.production.yml restart supabase-auth supabase-rest supabase-realtime supabase-storage

echo ""
echo "⏳ Ожидание запуска сервисов..."
sleep 10

echo ""
echo "📊 Проверка статуса контейнеров:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(NAME|fb-net)"

echo ""
echo "✅ Пароль успешно изменен!"
echo ""
echo "📋 Проверьте логи сервисов:"
echo "   docker logs fb-net-storage --tail 20"
echo "   docker logs fb-net-auth --tail 20"
echo "   docker logs fb-net-rest --tail 20"

