# Быстрое исправление Storage

## Проблема
Storage падает из-за неэкранированного пароля в URL. Пароль содержит `/`, которые нужно заменить на `%2F`.

## Решение (выполните на сервере)

```bash
cd /opt/fibroadenoma.net

# 1. Найдите пароль
PASSWORD=$(grep POSTGRES_PASSWORD .env.production 2>/dev/null | cut -d'=' -f2 || grep POSTGRES_PASSWORD .env 2>/dev/null | cut -d'=' -f2)

if [ -z "$PASSWORD" ]; then
    echo "❌ Пароль не найден. Проверьте файл .env.production или .env"
    exit 1
fi

# 2. Экранируем пароль (заменяем / на %2F, @ на %40, : на %3A, # на %23)
ESCAPED_PASSWORD=$(echo "$PASSWORD" | sed 's|/|%2F|g' | sed 's|@|%40|g' | sed 's|#|%23|g' | sed 's|:|%3A|g' | sed 's| |%20|g')

echo "Пароль: ${PASSWORD:0:10}..."
echo "Экранированный: ${ESCAPED_PASSWORD:0:20}..."

# 3. Добавляем экранированный пароль в .env.production
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

if ! grep -q "POSTGRES_PASSWORD_URL_ENCODED" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# Экранированный пароль для URL" >> "$ENV_FILE"
    echo "POSTGRES_PASSWORD_URL_ENCODED=$ESCAPED_PASSWORD" >> "$ENV_FILE"
else
    sed -i "s|^POSTGRES_PASSWORD_URL_ENCODED=.*|POSTGRES_PASSWORD_URL_ENCODED=$ESCAPED_PASSWORD|g" "$ENV_FILE"
fi

echo "✅ Добавлен POSTGRES_PASSWORD_URL_ENCODED в $ENV_FILE"

# 4. Перезапускаем Storage
echo ""
echo "🔄 Перезапуск Storage..."
docker compose -f docker-compose.production.yml stop supabase-storage
docker compose -f docker-compose.production.yml up -d supabase-storage

# 5. Ждем и проверяем
sleep 5
echo ""
echo "📋 Логи Storage:"
docker logs fb-net-storage --tail 30

# 6. Проверяем статус
echo ""
echo "📊 Статус контейнеров:"
docker ps | grep -E "(storage|kong)"
```

## Альтернатива: Исправить напрямую в docker-compose

Если скрипт не работает, исправьте вручную:

```bash
cd /opt/fibroadenoma.net

# Экранируем пароль
PASSWORD=$(grep POSTGRES_PASSWORD .env.production | cut -d'=' -f2)
ESCAPED_PASSWORD=$(echo "$PASSWORD" | sed 's|/|%2F|g')

# Заменяем в docker-compose.production.yml
sed -i "s|postgres://supabase_storage_admin:\${POSTGRES_PASSWORD}@|postgres://supabase_storage_admin:${ESCAPED_PASSWORD}@|g" docker-compose.production.yml

# Перезапускаем
docker compose -f docker-compose.production.yml up -d supabase-storage
```

