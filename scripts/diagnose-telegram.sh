#!/bin/bash

# Скрипт быстрой диагностики Telegram бота

echo ""
echo "🔍 Диагностика Telegram бота..."
echo ""

# Загружаем переменные окружения (с поддержкой CRLF)
load_env() {
    local env_file="$1"
    while IFS='=' read -r key value; do
        key=$(echo "$key" | tr -d '\r')
        value=$(echo "$value" | tr -d '\r')
        [ -z "$key" ] && continue
        [[ "$key" == \#* ]] && continue
        export "$key=$value"
    done < "$env_file"
}

if [ -f .env ]; then
    load_env .env
elif [ -f .env.local ]; then
    load_env .env.local
else
    echo "❌ .env файл не найден!"
    exit 1
fi

BOT_TOKEN=$TELEGRAM_BOT_TOKEN
WEBHOOK_URL=$TELEGRAM_WEBHOOK_URL

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN не найден в .env"
    exit 1
fi

echo "📋 Конфигурация:"
echo "   Bot Token: ${BOT_TOKEN:0:15}..."
echo "   Webhook URL: $WEBHOOK_URL"
echo ""

# 1. Проверка бота
echo "1️⃣ Проверка бота..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe")
BOT_OK=$(echo "$BOT_INFO" | jq -r '.ok')

if [ "$BOT_OK" = "true" ]; then
    BOT_USERNAME=$(echo "$BOT_INFO" | jq -r '.result.username')
    BOT_NAME=$(echo "$BOT_INFO" | jq -r '.result.first_name')
    echo "✅ Бот доступен: @$BOT_USERNAME ($BOT_NAME)"
else
    echo "❌ Бот недоступен! Проверьте токен."
    exit 1
fi

# 2. Проверка webhook
echo ""
echo "2️⃣ Проверка webhook..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
CURRENT_URL=$(echo "$WEBHOOK_INFO" | jq -r '.result.url')
PENDING_COUNT=$(echo "$WEBHOOK_INFO" | jq -r '.result.pending_update_count')
LAST_ERROR=$(echo "$WEBHOOK_INFO" | jq -r '.result.last_error_message')
LAST_ERROR_DATE=$(echo "$WEBHOOK_INFO" | jq -r '.result.last_error_date')

if [ -z "$CURRENT_URL" ] || [ "$CURRENT_URL" = "null" ] || [ "$CURRENT_URL" = "" ]; then
    echo "❌ Webhook НЕ установлен!"
    echo "   Нужно установить: $WEBHOOK_URL"
else
    echo "✅ Webhook установлен: $CURRENT_URL"
    
    if [ "$CURRENT_URL" != "$WEBHOOK_URL" ]; then
        echo "⚠️  Несоответствие!"
        echo "   Ожидалось: $WEBHOOK_URL"
    fi
fi

if [ "$PENDING_COUNT" != "0" ] && [ "$PENDING_COUNT" != "null" ]; then
    echo "⚠️  Необработанных сообщений: $PENDING_COUNT"
fi

if [ "$LAST_ERROR" != "null" ] && [ -n "$LAST_ERROR" ]; then
    echo "⚠️  Последняя ошибка:"
    echo "   $LAST_ERROR"
    if [ "$LAST_ERROR_DATE" != "null" ]; then
        ERROR_TIME=$(date -d @$LAST_ERROR_DATE '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $LAST_ERROR_DATE '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "unknown")
        echo "   Время: $ERROR_TIME"
    fi
fi

# 3. Проверка доступности endpoint
if [ -n "$WEBHOOK_URL" ] && [ "$WEBHOOK_URL" != "null" ]; then
    echo ""
    echo "3️⃣ Проверка endpoint..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEBHOOK_URL" 2>/dev/null)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Endpoint доступен (HTTP $HTTP_CODE)"
        
        # Проверяем, что возвращает endpoint
        RESPONSE=$(curl -s "$WEBHOOK_URL")
        STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
        if [ "$STATUS" = "ok" ]; then
            echo "✅ Endpoint отвечает корректно"
        fi
    else
        echo "❌ Endpoint недоступен (HTTP $HTTP_CODE)"
        echo "   Возможные причины:"
        echo "   - Сервер не запущен"
        echo "   - URL неверный"
        echo "   - Проблемы с SSL/HTTPS"
        echo "   - Firewall блокирует доступ"
    fi
fi

# 4. Проверка логов Docker (если используется)
if command -v docker &> /dev/null; then
    echo ""
    echo "4️⃣ Проверка логов Docker..."
    
    CONTAINER_ID=$(docker ps -q -f name=fb.net-app)
    if [ -n "$CONTAINER_ID" ]; then
        echo "✅ Контейнер запущен: $CONTAINER_ID"
        
        # Проверяем последние логи на наличие ошибок webhook
        WEBHOOK_ERRORS=$(docker logs --tail 50 $CONTAINER_ID 2>&1 | grep -i "webhook\|telegram" | tail -5)
        if [ -n "$WEBHOOK_ERRORS" ]; then
            echo "📋 Последние логи webhook:"
            echo "$WEBHOOK_ERRORS"
        fi
    else
        echo "⚠️  Контейнер не найден (возможно, используется bun run dev)"
    fi
fi

# Итого
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 РЕЗЮМЕ:"
echo ""

# Собираем проблемы
PROBLEMS=()

if [ "$BOT_OK" != "true" ]; then
    PROBLEMS+=("Бот недоступен (проверьте токен)")
fi

if [ -z "$CURRENT_URL" ] || [ "$CURRENT_URL" = "null" ] || [ "$CURRENT_URL" = "" ]; then
    PROBLEMS+=("Webhook не установлен")
fi

if [ "$CURRENT_URL" != "$WEBHOOK_URL" ] && [ -n "$WEBHOOK_URL" ]; then
    PROBLEMS+=("Webhook указывает на другой URL")
fi

if [ "$HTTP_CODE" != "200" ]; then
    PROBLEMS+=("Endpoint недоступен")
fi

if [ ${#PROBLEMS[@]} -eq 0 ]; then
    echo "✅ Всё настроено правильно!"
    echo ""
    echo "Если бот всё равно не отвечает:"
    echo "   1. Отправьте команду /start в Telegram"
    echo "   2. Проверьте логи сервера на ошибки"
    echo "   3. Убедитесь, что TELEGRAM_BOT_TOKEN в .env правильный"
else
    echo "❌ Обнаружены проблемы:"
    for problem in "${PROBLEMS[@]}"; do
        echo "   • $problem"
    done
    echo ""
    echo "🔧 Решение:"
    
    if [[ " ${PROBLEMS[@]} " =~ "Webhook не установлен" ]] || [[ " ${PROBLEMS[@]} " =~ "Webhook указывает на другой URL" ]]; then
        echo ""
        echo "Установите webhook командой:"
        echo ""
        echo "curl -X POST \"https://api.telegram.org/bot$BOT_TOKEN/setWebhook\" \\"
        echo "  -H \"Content-Type: application/json\" \\"
        echo "  -d '{\"url\": \"$WEBHOOK_URL\"}'"
        echo ""
        echo "Или используйте скрипт:"
        echo "  bash scripts/check-telegram-webhook.sh"
    fi
    
    if [[ " ${PROBLEMS[@]} " =~ "Endpoint недоступен" ]]; then
        echo ""
        echo "Убедитесь, что:"
        echo "  1. Сервер запущен (docker-compose up -d)"
        echo "  2. SSL настроен правильно"
        echo "  3. URL доступен из интернета"
    fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
