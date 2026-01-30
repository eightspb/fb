#!/bin/bash
set -e

echo "🔧 Жесткое исправление переменных окружения..."

cd /opt/fibroadenoma.net

# 1. Находим исходный файл
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Файл .env.production или .env не найден!"
    exit 1
fi

echo "📄 Читаем из: $ENV_FILE"

# 2. Читаем пароль
RAW_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

if [ -z "$RAW_PASSWORD" ]; then
    echo "❌ POSTGRES_PASSWORD не найден"
    exit 1
fi

echo "🔑 Пароль найден: ${RAW_PASSWORD:0:5}..."

# 3. Экранируем пароль (для URL)
ENCODED_PASSWORD=$(echo "$RAW_PASSWORD" | sed 's|%|%25|g' | sed 's|/|%2F|g' | sed 's|:|%3A|g' | sed 's|@|%40|g' | sed 's|#|%23|g' | sed 's|?|%3F|g' | sed 's|&|%26|g')

echo "🔒 Экранированный пароль: ${ENCODED_PASSWORD:0:5}..."

# 4. Создаем специальный .env файл для Docker
# Это гарантирует, что Docker получит именно эти значения
cat "$ENV_FILE" > .env.docker
# Удаляем старые определения если есть
sed -i '/^POSTGRES_PASSWORD_URL_ENCODED=/d' .env.docker
# Добавляем правильное
echo "" >> .env.docker
echo "POSTGRES_PASSWORD_URL_ENCODED=$ENCODED_PASSWORD" >> .env.docker

echo "✅ Создан файл .env.docker с правильными переменными"

# 5. Обновляем docker-compose.production.yml чтобы использовать .env.docker
# (Хотя docker-compose по умолчанию читает .env, мы можем явно указать файл при запуске)

echo "🔄 Перезапуск с явным указанием env-файла..."

# Останавливаем и удаляем контейнеры
docker compose -f docker-compose.production.yml --env-file .env.docker down

# Запускаем заново
docker compose -f docker-compose.production.yml --env-file .env.docker up -d

echo "⏳ Ждем 10 секунд..."
sleep 10

# 6. Проверка
echo "📊 Статус контейнеров:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep fb-net

echo ""
echo "📋 Логи Storage:"
docker logs fb-net-storage --tail 10

echo ""
echo "📋 Логи Auth:"
docker logs fb-net-auth --tail 10











