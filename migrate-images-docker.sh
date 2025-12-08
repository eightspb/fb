#!/bin/bash
# Скрипт для миграции изображений через Docker
# Использование: ./migrate-images-docker.sh

set -e

cd /opt/fibroadenoma.net

# Загружаем переменные из .env.production или .env
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

if [ -f "$ENV_FILE" ]; then
    echo "📄 Загружаем переменные из $ENV_FILE"
    export $(cat "$ENV_FILE" | grep -v '^#' | grep -v '^$' | xargs)
else
    echo "⚠️  Файл .env.production или .env не найден"
fi

# Определяем имя сети Docker
NETWORK_NAME=$(docker network ls | grep fb-net-prod-network | awk '{print $1}' | head -1)

if [ -z "$NETWORK_NAME" ]; then
    echo "❌ Сеть fb-net-prod-network не найдена"
    echo "Доступные сети:"
    docker network ls
    exit 1
fi

echo "📦 Используется сеть: $NETWORK_NAME"
echo "🚀 Запуск миграции изображений..."

# Используем значения по умолчанию если не заданы
SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-http://supabase-kong:8000}
SERVICE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}
DB_URL=${DATABASE_URL:-postgresql://supabase_admin:${POSTGRES_PASSWORD:-postgres}@supabase-db:5432/postgres}

echo "🔧 Конфигурация:"
echo "   SUPABASE_URL: $SUPABASE_URL"
echo "   DATABASE_URL: $DB_URL"
echo ""

# Запускаем скрипт в временном контейнере
docker run --rm -it \
  --network $NETWORK_NAME \
  -v $(pwd):/app \
  -w /app \
  -e NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY" \
  -e DATABASE_URL="$DB_URL" \
  node:20-alpine sh -c "
    echo '📥 Установка глобальных зависимостей...'
    npm install -g tsx
    echo '✅ Глобальные зависимости установлены'
    echo '📦 Установка зависимостей проекта...'
    npm install --legacy-peer-deps --no-save @supabase/supabase-js pg dotenv
    echo '✅ Зависимости проекта установлены'
    echo '🚀 Запуск скрипта миграции...'
    tsx scripts/migrate-images-to-storage.ts
  "

echo ""
echo "✅ Миграция завершена!"

