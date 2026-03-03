# Диагностика и исправление Telegram бота

## Быстрая диагностика

На сервере выполните:

```bash
cd /path/to/fb.net
bash scripts/diagnose-telegram.sh
```

Этот скрипт автоматически проверит:
- ✅ Доступность бота
- ✅ Статус webhook
- ✅ Доступность endpoint
- ✅ Логи сервера

## Частые проблемы и решения

### Проблема 1: Webhook не установлен

**Симптомы:**
- Бот не отвечает на сообщения
- `getWebhookInfo` показывает пустой URL

**Решение:**

```bash
# На сервере
cd /path/to/fb.net

# Загрузить переменные окружения
source .env

# Установить webhook
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$TELEGRAM_WEBHOOK_URL\", \"allowed_updates\": [\"message\", \"callback_query\"]}"
```

Или используйте скрипт:

```bash
bash scripts/check-telegram-webhook.sh
```

### Проблема 2: Webhook установлен, но endpoint недоступен

**Симптомы:**
- `getWebhookInfo` показывает ошибки
- `last_error_message`: "Wrong response from the webhook: 502 Bad Gateway"

**Решение:**

1. **Проверьте, запущен ли сервер:**

```bash
# Для Docker
docker ps | grep fb.net-app

# Если не запущен
docker-compose up -d

# Проверьте логи
docker-compose logs -f app
```

2. **Проверьте доступность endpoint:**

```bash
curl https://fibroadenoma.net/api/telegram/webhook

# Должно вернуть:
# {"status":"ok","message":"Telegram webhook endpoint is active"}
```

3. **Проверьте nginx:**

```bash
# Статус nginx
docker-compose ps nginx

# Логи nginx
docker-compose logs nginx | tail -50
```

4. **Проверьте SSL сертификат:**

```bash
# Проверка SSL
curl -v https://fibroadenoma.net 2>&1 | grep -i "SSL\|certificate"

# Или используйте
openssl s_client -connect fibroadenoma.net:443 -servername fibroadenoma.net
```

### Проблема 3: Endpoint доступен, но бот не обрабатывает сообщения

**Симптомы:**
- `curl` к endpoint возвращает 200 OK
- Webhook установлен правильно
- Бот всё равно не отвечает

**Решение:**

1. **Проверьте логи приложения:**

```bash
docker-compose logs -f app | grep -i "webhook\|telegram"
```

Ищите строки типа:
```
[YYYY-MM-DD HH:MM:SS] ===== TELEGRAM WEBHOOK RECEIVED =====
[WEBHOOK] 📥 Получено обновление: ...
[WEBHOOK] 💬 Обработка сообщения: ...
```

2. **Проверьте переменные окружения в контейнере:**

```bash
docker exec fb.net-app-1 env | grep TELEGRAM

# Должны быть:
# TELEGRAM_BOT_TOKEN=...
# TELEGRAM_WEBHOOK_URL=https://fibroadenoma.net/api/telegram/webhook
# TELEGRAM_ADMIN_CHAT_ID=...
```

3. **Проверьте pending updates:**

```bash
# Загрузите .env
source .env

# Проверьте необработанные сообщения
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates"
```

Если есть необработанные сообщения, очистите их:

```bash
# Получите последний update_id
LAST_ID=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates" | jq -r '.result[-1].update_id')

# Подтвердите обработку всех до этого ID
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates?offset=$((LAST_ID + 1))"
```

### Проблема 4: Бот работал, но перестал отвечать

**Причины:**
1. Изменился URL сервера
2. Истёк SSL сертификат
3. Контейнер перезапустился без правильных переменных окружения

**Решение:**

1. **Проверьте текущий webhook:**

```bash
source .env
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" | jq '.'
```

2. **Переустановите webhook:**

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$TELEGRAM_WEBHOOK_URL\", \"drop_pending_updates\": false, \"allowed_updates\": [\"message\", \"callback_query\"]}"
```

3. **Перезапустите контейнеры:**

```bash
docker-compose down
docker-compose up -d

# Проверьте логи
docker-compose logs -f app
```

## Пошаговая диагностика

### Шаг 1: Проверка бота

```bash
source .env

# Проверка токена и доступности бота
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"
```

**Ожидаемый результат:**
```json
{
  "ok": true,
  "result": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "Your Bot Name",
    "username": "your_bot_username"
  }
}
```

### Шаг 2: Проверка webhook

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" | jq '.'
```

**Правильная конфигурация:**
```json
{
  "ok": true,
  "result": {
    "url": "https://fibroadenoma.net/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40,
    "ip_address": "XXX.XXX.XXX.XXX"
  }
}
```

**Признаки проблем:**
- `url`: "" (пустой) - webhook не установлен
- `pending_update_count`: > 0 - есть необработанные сообщения
- `last_error_message` присутствует - есть ошибки

### Шаг 3: Проверка endpoint

```bash
# GET запрос (проверка доступности)
curl -v https://fibroadenoma.net/api/telegram/webhook

# POST запрос (тестовое сообщение)
curl -X POST https://fibroadenoma.net/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"message_id":1,"from":{"id":123,"is_bot":false,"first_name":"Test"},"chat":{"id":123,"type":"private"},"date":1234567890,"text":"/start"}}'
```

### Шаг 4: Проверка логов

```bash
# Логи приложения (последние 100 строк)
docker-compose logs --tail 100 app

# Логи с фильтром по Telegram
docker-compose logs -f app | grep -i "telegram\|webhook"

# Логи nginx
docker-compose logs --tail 50 nginx
```

### Шаг 5: Тестирование в Telegram

1. Откройте бота в Telegram
2. Отправьте команду `/start`
3. Проверьте логи сервера:

```bash
docker-compose logs -f app | grep "WEBHOOK"
```

Должны увидеть:
```
[YYYY-MM-DD] ===== TELEGRAM WEBHOOK RECEIVED =====
[WEBHOOK] 📥 Получено обновление: ...
[WEBHOOK] 🚀 Команда /start
[WEBHOOK] ✅ Команда /start обработана
```

## Команды для отладки

### Получить информацию о боте

```bash
source .env
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe" | jq '.'
```

### Получить webhook info

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" | jq '.'
```

### Установить webhook

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://fibroadenoma.net/api/telegram/webhook\"}"
```

### Удалить webhook

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"
```

### Получить необработанные сообщения

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates" | jq '.'
```

### Очистить необработанные сообщения

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://fibroadenoma.net/api/telegram/webhook\", \"drop_pending_updates\": true}"
```

### Отправить тестовое сообщение

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\": \"$TELEGRAM_ADMIN_CHAT_ID\", \"text\": \"Test message\"}"
```

## Чеклист для полной диагностики

- [ ] Бот доступен (`getMe` возвращает OK)
- [ ] Webhook установлен (`getWebhookInfo` показывает правильный URL)
- [ ] Endpoint доступен (GET возвращает 200)
- [ ] Сервер запущен (`docker ps` показывает контейнер)
- [ ] Переменные окружения установлены в контейнере
- [ ] SSL сертификат действителен
- [ ] Логи не показывают ошибок
- [ ] Нет необработанных сообщений в очереди
- [ ] Тестовая команда `/start` обрабатывается

## Контакты для помощи

Если проблема не решается:

1. Соберите диагностическую информацию:
```bash
bash scripts/diagnose-telegram.sh > telegram-debug.txt
docker-compose logs --tail 200 app >> telegram-debug.txt
docker-compose logs --tail 50 nginx >> telegram-debug.txt
```

2. Проверьте файл `telegram-debug.txt` на наличие ошибок

## Полезные ссылки

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Webhook Guide](https://core.telegram.org/bots/webhooks)
- [Troubleshooting](https://core.telegram.org/bots/faq)
