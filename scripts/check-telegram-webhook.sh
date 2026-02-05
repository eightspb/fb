#!/bin/bash

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         ПРОВЕРКА TELEGRAM WEBHOOK                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Загружаем переменные окружения из .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo "[OK] .env файл загружен"
elif [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
    echo "[OK] .env.local файл загружен"
else
    echo "[ERROR] .env или .env.local файл не найден!"
    exit 1
fi

BOT_TOKEN=$TELEGRAM_BOT_TOKEN
WEBHOOK_URL=$TELEGRAM_WEBHOOK_URL

if [ -z "$BOT_TOKEN" ]; then
    echo "[ERROR] TELEGRAM_BOT_TOKEN не найден в .env"
    exit 1
fi

echo ""
echo "[INFO] Bot Token: ${BOT_TOKEN:0:15}..."
echo "[INFO] Webhook URL: $WEBHOOK_URL"
echo ""

# 1. Проверяем текущий webhook
echo "[1] Проверка текущего webhook..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
echo "$WEBHOOK_INFO" | jq '.'

CURRENT_URL=$(echo "$WEBHOOK_INFO" | jq -r '.result.url')
PENDING_COUNT=$(echo "$WEBHOOK_INFO" | jq -r '.result.pending_update_count')
LAST_ERROR=$(echo "$WEBHOOK_INFO" | jq -r '.result.last_error_message')

echo ""
echo "[INFO] Текущий webhook URL: $CURRENT_URL"
echo "[INFO] Необработанных сообщений: $PENDING_COUNT"
if [ "$LAST_ERROR" != "null" ]; then
    echo "[WARNING] Последняя ошибка: $LAST_ERROR"
fi

# 2. Проверяем доступность endpoint
if [ -n "$WEBHOOK_URL" ]; then
    echo ""
    echo "[2] Проверка доступности endpoint..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEBHOOK_URL")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "[OK] Endpoint доступен (HTTP $HTTP_CODE)"
    else
        echo "[ERROR] Endpoint недоступен (HTTP $HTTP_CODE)"
        echo "[INFO] Проверьте, запущен ли сервер и доступен ли по URL: $WEBHOOK_URL"
    fi
fi

# 3. Спрашиваем, нужно ли установить webhook
echo ""
read -p "[?] Установить/обновить webhook? (y/n): " answer

if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    echo ""
    echo "[3] Установка webhook..."
    
    if [ -z "$WEBHOOK_URL" ]; then
        echo "[ERROR] TELEGRAM_WEBHOOK_URL не установлен в .env!"
        echo "[INFO] Добавьте в .env строку:"
        echo "   TELEGRAM_WEBHOOK_URL=https://fibroadenoma.net/api/telegram/webhook"
        exit 1
    fi
    
    RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$WEBHOOK_URL\", \"drop_pending_updates\": false, \"allowed_updates\": [\"message\", \"callback_query\"]}")
    
    echo "$RESPONSE" | jq '.'
    
    SUCCESS=$(echo "$RESPONSE" | jq -r '.ok')
    if [ "$SUCCESS" = "true" ]; then
        echo ""
        echo "[OK] Webhook установлен успешно!"
    else
        echo ""
        echo "[ERROR] Не удалось установить webhook!"
        exit 1
    fi
    
    # Проверяем ещё раз
    echo ""
    echo "[4] Повторная проверка..."
    sleep 2
    
    WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
    NEW_URL=$(echo "$WEBHOOK_INFO" | jq -r '.result.url')
    echo "[OK] Webhook URL: $NEW_URL"
fi

# 4. Проверяем pending updates
echo ""
echo "[5] Проверка необработанных сообщений..."
UPDATES=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getUpdates?limit=1")
UPDATE_COUNT=$(echo "$UPDATES" | jq -r '.result | length')

if [ "$UPDATE_COUNT" -gt 0 ]; then
    echo "[WARNING] Есть необработанные сообщения: $UPDATE_COUNT"
    echo "[INFO] Последнее сообщение:"
    echo "$UPDATES" | jq '.result[0]'
else
    echo "[OK] Нет необработанных сообщений"
fi

# 5. Тестовое сообщение
echo ""
read -p "[?] Отправить тестовое сообщение себе? (y/n): " answer

if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    ADMIN_CHAT_ID=$TELEGRAM_ADMIN_CHAT_ID
    
    if [ -z "$ADMIN_CHAT_ID" ]; then
        echo "[ERROR] TELEGRAM_ADMIN_CHAT_ID не установлен в .env!"
        exit 1
    fi
    
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    MESSAGE="🤖 Тест Telegram бота\n\nБот работает корректно!\nВремя: $TIMESTAMP"
    
    RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{\"chat_id\": \"$ADMIN_CHAT_ID\", \"text\": \"$MESSAGE\", \"parse_mode\": \"Markdown\"}")
    
    SUCCESS=$(echo "$RESPONSE" | jq -r '.ok')
    if [ "$SUCCESS" = "true" ]; then
        echo "[OK] Тестовое сообщение отправлено!"
    else
        echo "[ERROR] Ошибка при отправке:"
        echo "$RESPONSE" | jq '.'
    fi
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  ПРОВЕРКА ЗАВЕРШЕНА                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "[INFO] Если бот не отвечает, проверьте:"
echo "   1. Webhook URL доступен из интернета (не localhost)"
echo "   2. Сервер запущен и работает"
echo "   3. В логах нет ошибок (/api/telegram/webhook)"
echo "   4. Попробуйте команду /start в боте"
echo ""
