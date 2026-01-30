#!/bin/bash
# Скрипт для миграции НОВОСТЕЙ (текста) в Supabase через Docker
# Использование: ./migrate-news-docker.sh

set -e

cd /opt/fibroadenoma.net

# Загружаем переменные из .env.production если существует, иначе из .env
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

if [ -f "$ENV_FILE" ]; then
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
fi

# Определяем имя сети Docker
NETWORK_NAME=$(docker network ls | grep fb-net-prod-network | awk '{print $1}' | head -1)

if [ -z "$NETWORK_NAME" ]; then
    echo "❌ Сеть fb-net-prod-network не найдена"
    docker network ls
    exit 1
fi

echo "📦 Используется сеть: $NETWORK_NAME"
echo "🚀 Запуск миграции новостей (текстовые данные)..."

# Используем значения по умолчанию если не заданы
SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-http://supabase-kong:8000}
# Предпочитаем Service Role Key, но если нет - пробуем Anon Key (хотя для записи скорее всего нужен Service Role)
SERVICE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY}}

echo "🔧 Конфигурация:"
echo "   SUPABASE_URL: $SUPABASE_URL"
echo "   SERVICE_KEY: ${SERVICE_KEY:0:10}..."

# Запускаем скрипт в временном контейнере
docker run --rm -it \
  --network $NETWORK_NAME \
  -v $(pwd):/app \
  -w /app \
  -e NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY" \
  -e SUPABASE_URL="$SUPABASE_URL" \
  node:20-alpine sh -c "
    echo '📥 Установка зависимостей...'
    npm install -g tsx
    npm install --legacy-peer-deps --no-save @supabase/supabase-js dotenv
    
    echo '🚀 Запуск скрипта миграции новостей...'
    tsx scripts/migrate-news-to-supabase.ts
  "

echo ""
echo "✅ Миграция новостей завершена!"











