#!/bin/bash
set -e

echo "🛠️  Начинаем полное исправление..."

cd /opt/fibroadenoma.net

# 1. Определяем файл с переменными
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Файл .env.production или .env не найден!"
    exit 1
fi

echo "📄 Используем файл окружения: $ENV_FILE"

# 2. Читаем пароль
# Используем grep и cut, чтобы получить "сырое" значение
RAW_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2-)
# Убираем кавычки если есть
RAW_PASSWORD=$(echo "$RAW_PASSWORD" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

if [ -z "$RAW_PASSWORD" ]; then
    echo "❌ POSTGRES_PASSWORD не найден в $ENV_FILE"
    exit 1
fi

echo "🔑 Пароль найден (первые символы): ${RAW_PASSWORD:0:5}..."

# 3. Экранируем пароль для URL (заменяем / на %2F и т.д.)
# Это критически важно для Auth и Storage
ENCODED_PASSWORD=$(echo "$RAW_PASSWORD" | sed 's|%|%25|g' | sed 's|/|%2F|g' | sed 's|:|%3A|g' | sed 's|@|%40|g' | sed 's|#|%23|g' | sed 's|?|%3F|g' | sed 's|&|%26|g')

echo "🔒 Экранированный пароль подготовлен"

# 4. Записываем экранированный пароль обратно в файл
# Удаляем старую запись если была
if grep -q "POSTGRES_PASSWORD_URL_ENCODED=" "$ENV_FILE"; then
    # Используем временный файл для замены, чтобы избежать проблем с sed
    grep -v "POSTGRES_PASSWORD_URL_ENCODED=" "$ENV_FILE" > "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
fi

echo "POSTGRES_PASSWORD_URL_ENCODED=$ENCODED_PASSWORD" >> "$ENV_FILE"
echo "✅ Переменная POSTGRES_PASSWORD_URL_ENCODED добавлена в $ENV_FILE"

# 5. Перезапускаем все контейнеры
echo "🔄 Перезапускаем контейнеры..."
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d

echo "⏳ Ждем 15 секунд инициализации..."
sleep 15

# 6. Проверяем статус
echo "📊 Статус контейнеров:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep fb-net

echo ""
echo "📋 Последние логи Storage (на предмет ошибок):"
docker logs fb-net-storage --tail 5

echo ""
echo "📋 Последние логи Auth (на предмет ошибок):"
docker logs fb-net-auth --tail 5

echo ""
echo "✅ Готово. Если статус всех контейнеров 'Up' (и не Restarting), можно запускать миграцию."











