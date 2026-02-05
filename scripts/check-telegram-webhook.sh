#!/bin/bash

# Скрипт проверки и настройки Telegram webhook для Linux

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         ПРОВЕРКА TELEGRAM WEBHOOK                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Загружаем переменные окружения из .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo "[OK] .env файл загружен"
else
    echo "[ERROR] .env файл не найден!"
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

# Проверяем текущий webhook
echo "[1] Проверка текущего webhook..."
response=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")

if [ $? -eq 0 ]; then
    url=$(echo $response | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    pending=$(echo $response | grep -o '"pending_update_count":[0-9]*' | cut -d':' -f2)
    last_error=$(echo $response | grep -o '"last_error_message":"[^"]*' | cut -d'"' -f4)
    
    echo ""
    echo "[OK] Ответ получен:"
    echo "   URL: $url"
    echo "   Pending Updates: $pending"
    if [ -n "$last_error" ]; then
        echo "   Last Error: $last_error"
    fi
    
    if [ -z "$url" ] || [ "$url" = "null" ]; then
        echo ""
        echo "[WARNING] Webhook не настроен!"
    elif [ "$url" != "$WEBHOOK_URL" ]; then
        echo ""
        echo "[WARNING] Webhook указывает на другой URL!"
        echo "   Текущий: $url"
        echo "   Ожидаемый: $WEBHOOK_URL"
    else
        echo ""
        echo "[OK] Webhook настроен правильно!"
    fi
else
    echo "[ERROR] Ошибка при проверке webhook"
    exit 1
fi

# Спрашиваем, нужно ли установить webhook
echo ""
read -p "[?] Установить/обновить webhook? (y/n): " answer

if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    echo ""
    echo "[2] Установка webhook..."
    
    if [ -z "$WEBHOOK_URL" ]; then
        echo "[ERROR] TELEGRAM_WEBHOOK_URL не установлен в .env!"
        echo "[INFO] Добавьте в .env строку:"
        echo "   TELEGRAM_WEBHOOK_URL=https://ваш-домен.com/api/telegram/webhook"
        exit 1
    fi
    
    response=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$WEBHOOK_URL\", \"drop_pending_updates\": false, \"allowed_updates\": [\"message\", \"callback_query\"]}")
    
    ok=$(echo $response | grep -o '"ok":[^,]*' | cut -d':' -f2)
    description=$(echo $response | grep -o '"description":"[^"]*' | cut -d'"' -f4)
    
    if [ "$ok" = "true" ]; then
        echo "[OK] Webhook установлен успешно!"
        if [ -n "$description" ]; then
            echo "   Description: $description"
        fi
    else
        echo "[ERROR] Не удалось установить webhook!"
        echo "   $description"
        exit 1
    fi
    
    # Проверяем ещё раз
    echo ""
    echo "[3] Повторная проверка..."
    sleep 2
    
    response=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
    url=$(echo $response | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    if [ -n "$url" ] && [ "$url" != "null" ]; then
        echo "[OK] Webhook URL: $url"
    fi
fi

# Проверяем pending updates
echo ""
echo "[4] Проверка необработанных сообщений..."
response=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getUpdates?limit=1")

if [ $? -eq 0 ]; then
    result_count=$(echo $response | grep -o '"result":\[.*\]' | grep -o 'update_id' | wc -l)
    if [ "$result_count" -gt 0 ]; then
        echo "[WARNING] Есть необработанные сообщения"
        echo "[INFO] Проверьте через Telegram API или отправьте /start боту"
    else
        echo "[OK] Нет необработанных сообщений"
    fi
fi

# Тестовое сообщение
echo ""
read -p "[5] Отправить тестовое сообщение себе? (y/n): " answer

if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    ADMIN_CHAT_ID=$TELEGRAM_ADMIN_CHAT_ID
    
    if [ -z "$ADMIN_CHAT_ID" ]; then
        echo "[ERROR] TELEGRAM_ADMIN_CHAT_ID не установлен в .env!"
        exit 1
    fi
    
    current_time=$(date '+%Y-%m-%d %H:%M:%S')
    response=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{\"chat_id\": $ADMIN_CHAT_ID, \"text\": \"🤖 Тест Telegram бота\\n\\nБот работает корректно!\\nВремя: $current_time\", \"parse_mode\": \"Markdown\"}")
    
    ok=$(echo $response | grep -o '"ok":[^,]*' | cut -d':' -f2)
    if [ "$ok" = "true" ]; then
        echo "[OK] Тестовое сообщение отправлено!"
    else
        echo "[ERROR] Ошибка при отправке"
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
