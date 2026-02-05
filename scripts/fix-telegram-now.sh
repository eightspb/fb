#!/bin/bash

# Быстрое исправление Telegram webhook

echo ""
echo "🔧 БЫСТРОЕ ИСПРАВЛЕНИЕ TELEGRAM БОТА"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Загружаем переменные окружения
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo "✅ Загружен .env"
elif [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
    echo "✅ Загружен .env.local"
else
    echo "❌ .env файл не найден!"
    exit 1
fi

BOT_TOKEN=$TELEGRAM_BOT_TOKEN
WEBHOOK_URL=${TELEGRAM_WEBHOOK_URL:-"https://fibroadenoma.net/api/telegram/webhook"}

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN не найден!"
    echo ""
    echo "Добавьте в .env:"
    echo "TELEGRAM_BOT_TOKEN=your_bot_token_here"
    exit 1
fi

echo "📋 Конфигурация:"
echo "   Bot Token: ${BOT_TOKEN:0:20}...${BOT_TOKEN: -5}"
echo "   Webhook URL: $WEBHOOK_URL"
echo ""

# 1. Проверяем доступность endpoint
echo "1️⃣ Проверка endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEBHOOK_URL" 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Endpoint доступен (HTTP $HTTP_CODE)"
else
    echo "❌ Endpoint недоступен (HTTP $HTTP_CODE)"
    echo ""
    echo "Убедитесь что:"
    echo "  - Сервер запущен: docker-compose ps"
    echo "  - SSL настроен: curl -I https://fibroadenoma.net"
    echo ""
    read -p "Продолжить установку webhook? (y/n): " answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
        exit 1
    fi
fi

# 2. Удаляем старый webhook (если есть)
echo ""
echo "2️⃣ Удаление старого webhook..."
DELETE_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook")
DELETE_OK=$(echo "$DELETE_RESPONSE" | jq -r '.ok')

if [ "$DELETE_OK" = "true" ]; then
    echo "✅ Старый webhook удалён"
else
    echo "⚠️  Webhook уже был удалён или не существовал"
fi

# Пауза для надёжности
sleep 2

# 3. Устанавливаем новый webhook
echo ""
echo "3️⃣ Установка нового webhook..."
SET_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{
        \"url\": \"$WEBHOOK_URL\",
        \"drop_pending_updates\": true,
        \"allowed_updates\": [\"message\", \"callback_query\"]
    }")

SET_OK=$(echo "$SET_RESPONSE" | jq -r '.ok')
SET_DESCRIPTION=$(echo "$SET_RESPONSE" | jq -r '.description')

if [ "$SET_OK" = "true" ]; then
    echo "✅ Webhook установлен успешно!"
    echo "   $SET_DESCRIPTION"
else
    echo "❌ Ошибка установки webhook:"
    echo "$SET_RESPONSE" | jq '.'
    exit 1
fi

# Пауза
sleep 2

# 4. Проверяем установку
echo ""
echo "4️⃣ Проверка установки..."
CHECK_RESPONSE=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
CURRENT_URL=$(echo "$CHECK_RESPONSE" | jq -r '.result.url')
PENDING=$(echo "$CHECK_RESPONSE" | jq -r '.result.pending_update_count')

if [ "$CURRENT_URL" = "$WEBHOOK_URL" ]; then
    echo "✅ Webhook установлен правильно!"
    echo "   URL: $CURRENT_URL"
    echo "   Pending updates: $PENDING"
else
    echo "❌ Что-то пошло не так!"
    echo "   Ожидалось: $WEBHOOK_URL"
    echo "   Получено: $CURRENT_URL"
    exit 1
fi

# 5. Отправляем тестовое сообщение (опционально)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ WEBHOOK УСТАНОВЛЕН УСПЕШНО!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$TELEGRAM_ADMIN_CHAT_ID" ]; then
    read -p "Отправить тестовое сообщение? (y/n): " answer
    
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        echo ""
        echo "Отправка тестового сообщения..."
        
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        TEST_MSG="🎉 Telegram бот настроен!\n\n✅ Webhook: установлен\n⏰ Время: $TIMESTAMP\n\nТеперь можете отправить /start"
        
        SEND_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
            -H "Content-Type: application/json" \
            -d "{
                \"chat_id\": \"$TELEGRAM_ADMIN_CHAT_ID\",
                \"text\": \"$TEST_MSG\"
            }")
        
        SEND_OK=$(echo "$SEND_RESPONSE" | jq -r '.ok')
        if [ "$SEND_OK" = "true" ]; then
            echo "✅ Тестовое сообщение отправлено!"
        else
            echo "⚠️  Не удалось отправить сообщение:"
            echo "$SEND_RESPONSE" | jq '.'
        fi
    fi
else
    echo "⚠️  TELEGRAM_ADMIN_CHAT_ID не установлен в .env"
    echo "   Не могу отправить тестовое сообщение"
fi

echo ""
echo "🎯 СЛЕДУЮЩИЕ ШАГИ:"
echo "   1. Откройте бота в Telegram"
echo "   2. Отправьте команду /start"
echo "   3. Бот должен ответить приветственным сообщением"
echo ""
echo "Если бот не отвечает, проверьте логи:"
echo "   docker-compose logs -f app | grep WEBHOOK"
echo ""
