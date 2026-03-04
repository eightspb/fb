#!/bin/bash

# Быстрое исправление Telegram webhook

set -e  # Прерывать при критических ошибках (но не в curl)

# Неинтерактивный режим для запуска из автоматических скриптов (деплой)
NON_INTERACTIVE=false
AUTO_YES=false
CURL_ARGS=(--connect-timeout 10 --max-time 30)

for arg in "$@"; do
    case "$arg" in
        --non-interactive|--no-input)
            NON_INTERACTIVE=true
            ;;
        -y|--yes)
            NON_INTERACTIVE=true
            AUTO_YES=true
            ;;
    esac
done

if [ ! -t 0 ]; then
    NON_INTERACTIVE=true
fi

ask_yes_no() {
    local prompt="$1"
    local default_answer="${2:-n}"
    local answer=""

    if [ "$NON_INTERACTIVE" = true ]; then
        answer="$default_answer"
        if [ "$AUTO_YES" = true ]; then
            answer="y"
        fi

        echo "$prompt$answer (auto)"
        if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
            return 0
        fi
        return 1
    fi

    read -r -p "$prompt" answer
    if [ -z "$answer" ]; then
        answer="$default_answer"
    fi

    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        return 0
    fi
    return 1
}

echo ""
echo "🔧 БЫСТРОЕ ИСПРАВЛЕНИЕ TELEGRAM БОТА"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ═══════════════════════════════════════════════════════════════════
# ПРОВЕРКА ЗАВИСИМОСТЕЙ
# ═══════════════════════════════════════════════════════════════════

# Проверяем jq, если нет - предлагаем установить
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq не установлен (требуется для красивого вывода JSON)"
    echo ""
    if ask_yes_no "Установить jq автоматически? (y/n): " "n"; then
        echo "Установка jq..."
        if command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y jq
        elif command -v yum &> /dev/null; then
            yum install -y jq
        elif command -v dnf &> /dev/null; then
            dnf install -y jq
        else
            echo "❌ Не удалось определить менеджер пакетов"
            echo "   Установите jq вручную: apt-get install jq"
            echo ""
            echo "   Продолжаю без jq (вывод JSON будет без форматирования)..."
            echo ""
        fi
    else
        echo "   Продолжаю без jq (вывод JSON будет без форматирования)..."
        echo ""
    fi
fi

# Функция для парсинга JSON (работает с jq и без него)
# key должен быть jq-фильтром (например ".ok" или ".result.url")
# или простым именем поля (например "ok" или "url") для fallback
parse_json() {
    local json="$1"
    local key="$2"
    # Добавляем точку если ключ не начинается с точки (для совместимости)
    local jq_key="$key"
    [[ "$key" != .* ]] && jq_key=".$key"

    if command -v jq &> /dev/null; then
        echo "$json" | jq -r "$jq_key" 2>/dev/null || echo ""
    else
        # Простой парсинг без jq (работает для простых случаев)
        # Убираем точку для grep-based парсинга
        local grep_key="${key#.}"
        echo "$json" | grep -o "\"$grep_key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -1 | sed 's/.*"\([^"]*\)"/\1/'
    fi
}

# ═══════════════════════════════════════════════════════════════════
# ЗАГРУЗКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ
# ═══════════════════════════════════════════════════════════════════

# Загружаем переменные окружения (с поддержкой CRLF)
load_env() {
    local env_file="$1"
    while IFS='=' read -r key value; do
        # Убираем \r (CRLF) и пустые строки/комментарии
        key=$(echo "$key" | tr -d '\r')
        value=$(echo "$value" | tr -d '\r')
        [ -z "$key" ] && continue
        [[ "$key" == \#* ]] && continue
        export "$key=$value"
    done < "$env_file"
}

if [ -f .env ]; then
    load_env .env
    echo "✅ Загружен .env"
elif [ -f .env.local ]; then
    load_env .env.local
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
HTTP_CODE=$(curl -s "${CURL_ARGS[@]}" -o /dev/null -w "%{http_code}" "$WEBHOOK_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Endpoint доступен (HTTP $HTTP_CODE)"
else
    echo "❌ Endpoint недоступен (HTTP $HTTP_CODE)"
    echo ""
    echo "Убедитесь что:"
    echo "  - Сервер запущен: docker-compose ps"
    echo "  - SSL настроен: curl -I https://fibroadenoma.net"
    echo ""
    if ! ask_yes_no "Продолжить установку webhook? (y/n): " "y"; then
        exit 1
    fi
fi

# 2. Удаляем старый webhook (если есть)
echo ""
echo "2️⃣ Удаление старого webhook..."
DELETE_RESPONSE=$(curl -s "${CURL_ARGS[@]}" -X POST "https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook")
DELETE_OK=$(parse_json "$DELETE_RESPONSE" "ok")

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
SET_RESPONSE=$(curl -s "${CURL_ARGS[@]}" -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{
        \"url\": \"$WEBHOOK_URL\",
        \"drop_pending_updates\": true,
        \"allowed_updates\": [\"message\", \"callback_query\"]
    }")

SET_OK=$(parse_json "$SET_RESPONSE" "ok")
SET_DESCRIPTION=$(parse_json "$SET_RESPONSE" "description")

if [ "$SET_OK" = "true" ]; then
    echo "✅ Webhook установлен успешно!"
    if [ -n "$SET_DESCRIPTION" ]; then
        echo "   $SET_DESCRIPTION"
    fi
else
    echo "❌ Ошибка установки webhook:"
    if command -v jq &> /dev/null; then
        echo "$SET_RESPONSE" | jq '.'
    else
        echo "$SET_RESPONSE"
    fi
    exit 1
fi

# Пауза
sleep 2

# 4. Проверяем установку
echo ""
echo "4️⃣ Проверка установки..."
CHECK_RESPONSE=$(curl -s "${CURL_ARGS[@]}" "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
CURRENT_URL=$(parse_json "$CHECK_RESPONSE" ".result.url")
PENDING=$(parse_json "$CHECK_RESPONSE" ".result.pending_update_count")

# Если не удалось распарсить с jq, пробуем без точки
if [ -z "$CURRENT_URL" ]; then
    CURRENT_URL=$(parse_json "$CHECK_RESPONSE" "url")
fi

if [ "$CURRENT_URL" = "$WEBHOOK_URL" ]; then
    echo "✅ Webhook установлен правильно!"
    echo "   URL: $CURRENT_URL"
    if [ -n "$PENDING" ] && [ "$PENDING" != "null" ]; then
        echo "   Pending updates: $PENDING"
    fi
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
    if ask_yes_no "Отправить тестовое сообщение? (y/n): " "n"; then
        echo ""
        echo "Отправка тестового сообщения..."
        
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        TEST_MSG="🎉 Telegram бот настроен!\n\n✅ Webhook: установлен\n⏰ Время: $TIMESTAMP\n\nТеперь можете отправить /start"
        
        SEND_RESPONSE=$(curl -s "${CURL_ARGS[@]}" -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
            -H "Content-Type: application/json" \
            -d "{
                \"chat_id\": \"$TELEGRAM_ADMIN_CHAT_ID\",
                \"text\": \"$TEST_MSG\"
            }")
        
        SEND_OK=$(parse_json "$SEND_RESPONSE" "ok")
        if [ "$SEND_OK" = "true" ]; then
            echo "✅ Тестовое сообщение отправлено!"
        else
            echo "⚠️  Не удалось отправить сообщение:"
            if command -v jq &> /dev/null; then
                echo "$SEND_RESPONSE" | jq '.'
            else
                echo "$SEND_RESPONSE"
            fi
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
