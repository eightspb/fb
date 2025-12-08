#!/bin/bash
# Скрипт для исправления пароля в DATABASE_URL для Storage
# Экранирует специальные символы в пароле для использования в URL

set -e

cd /opt/fibroadenoma.net

# Загружаем переменные из .env.production
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ POSTGRES_PASSWORD не найден в .env.production"
    exit 1
fi

# Экранируем пароль для URL (заменяем специальные символы)
# Используем Python для правильного URL encoding
ESCAPED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$POSTGRES_PASSWORD', safe=''))" 2>/dev/null)

# Если Python недоступен, используем sed (базовое экранирование)
if [ -z "$ESCAPED_PASSWORD" ]; then
    ESCAPED_PASSWORD=$(echo "$POSTGRES_PASSWORD" | sed 's|/|%2F|g' | sed 's|@|%40|g' | sed 's|#|%23|g' | sed 's|:|%3A|g' | sed 's| |%20|g')
fi

echo "🔧 Экранирование пароля для URL..."
echo "   Оригинал: ${POSTGRES_PASSWORD:0:10}..."
echo "   Экранированный: ${ESCAPED_PASSWORD:0:20}..."

# Добавляем экранированный пароль в .env.production
if ! grep -q "POSTGRES_PASSWORD_URL_ENCODED" .env.production; then
    echo "" >> .env.production
    echo "# Экранированный пароль для использования в URL" >> .env.production
    echo "POSTGRES_PASSWORD_URL_ENCODED=$ESCAPED_PASSWORD" >> .env.production
    echo "✅ Добавлен POSTGRES_PASSWORD_URL_ENCODED в .env.production"
else
    # Обновляем существующую переменную
    sed -i "s|^POSTGRES_PASSWORD_URL_ENCODED=.*|POSTGRES_PASSWORD_URL_ENCODED=$ESCAPED_PASSWORD|g" .env.production
    echo "✅ Обновлен POSTGRES_PASSWORD_URL_ENCODED в .env.production"
fi

echo ""
echo "🔄 Перезапуск Storage контейнера..."

# Перезапускаем Storage
docker compose -f docker-compose.production.yml stop supabase-storage
docker compose -f docker-compose.production.yml up -d supabase-storage

echo ""
echo "⏳ Ожидание запуска Storage..."
sleep 5

# Проверяем логи
echo ""
echo "📋 Последние логи Storage:"
docker logs fb-net-storage --tail 20

echo ""
echo "✅ Готово! Проверьте логи выше на наличие ошибок."

