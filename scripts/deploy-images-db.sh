#!/bin/bash
set -e

# Этот скрипт поможет обновить сервер до версии с изображениями в БД

echo "🚀 Начинаем обновление сервера..."

# 1. Применяем миграцию БД (добавляем колонку image_data)
echo "📦 Обновляем структуру базы данных..."
if [ -f "docker-compose.production.yml" ]; then
    DB_CONTAINER=$(docker compose -f docker-compose.production.yml ps -q supabase)
    APP_CONTAINER=$(docker compose -f docker-compose.production.yml ps -q app)
else
    # Fallback для простого docker-compose или локальной разработки
    DB_CONTAINER="fb-net-supabase-db" 
    APP_CONTAINER="fb-net-nextjs"
fi

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Контейнер базы данных не найден! Убедитесь, что docker compose запущен."
    exit 1
fi

# Проверяем, существует ли файл миграции
if [ ! -f "migrations/add_image_data_column.sql" ]; then
    echo "📝 Создаем файл миграции..."
    mkdir -p migrations
    echo "ALTER TABLE news_images ADD COLUMN IF NOT EXISTS image_data BYTEA;" > migrations/add_image_data_column.sql
    echo "ALTER TABLE news_images ADD COLUMN IF NOT EXISTS mime_type TEXT;" >> migrations/add_image_data_column.sql
fi

cat migrations/add_image_data_column.sql | docker exec -i $DB_CONTAINER psql -U postgres -d postgres
echo "✅ База данных обновлена."

# 2. Запускаем скрипт импорта изображений
echo "🖼️ Импортируем изображения в базу данных (это может занять время)..."

if [ -z "$APP_CONTAINER" ]; then
    echo "⚠️ Контейнер приложения не найден. Пробуем запустить локально через npm..."
    npm install
    npx tsx scripts/import-images-to-db.ts
else
    # Запускаем скрипт внутри контейнера приложения, где есть доступ к БД и файлам
    docker exec -i $APP_CONTAINER npx tsx scripts/import-images-to-db.ts
fi

echo "✅ Импорт завершен."
echo "🎉 Сервер обновлен! Теперь изображения хранятся в БД."

