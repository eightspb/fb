# 🚀 БЫСТРОЕ ИСПРАВЛЕНИЕ TELEGRAM БОТА

## Проблема
Бот не отвечает на сообщения.

## Решение (3 минуты)

### Автоматически (рекомендуется)

**С вашего компьютера запустите деплой скрипт:**

```bash
bash scripts/deploy-from-github.sh --app-only
```

Скрипт автоматически:
- ✅ Обновит код на сервере
- ✅ Установит все зависимости (jq и другие)
- ✅ Проверит переменные окружения
- ✅ Настроит Telegram webhook
- ✅ Перезапустит приложение

### Вручную (если нужна диагностика)

#### Шаг 1: Подключитесь к серверу

```bash
ssh root@fibroadenoma.net
# или
ssh root@155.212.217.60
```

#### Шаг 2: Перейдите в директорию проекта

```bash
cd /opt/fb-net  # или где у вас проект
```

#### Шаг 3: Запустите скрипт исправления

```bash
bash scripts/fix-telegram-now.sh
```

Скрипт автоматически:
- ✅ Проверит endpoint
- ✅ Удалит старый webhook
- ✅ Установит новый webhook на `https://fibroadenoma.net/api/telegram/webhook`
- ✅ Очистит необработанные сообщения
- ✅ Отправит тестовое сообщение

### Шаг 4: Протестируйте бота

1. Откройте бота в Telegram
2. Отправьте команду `/start`
3. Бот должен ответить приветственным сообщением

---

## Если скрипт не помог

### Вариант A: Диагностика

```bash
bash scripts/diagnose-telegram.sh
```

Это покажет все проблемы с подробным описанием.

### Вариант B: Проверка логов

```bash
# Проверьте логи приложения
docker compose -f docker-compose.ssl.yml logs site | grep -i "webhook\|telegram"

# Проверьте логи nginx
docker compose -f docker-compose.ssl.yml logs nginx | tail -50
```

### Вариант C: Ручная проверка

```bash
# Загрузите переменные окружения
source .env

# Проверьте webhook
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" | jq '.'

# Проверьте endpoint
curl https://fibroadenoma.net/api/telegram/webhook

# Должно вернуть:
# {"status":"ok","message":"Telegram webhook endpoint is active"}
```

---

## Частые проблемы

### 1. Endpoint недоступен (502/503)

**Решение:**

```bash
# Проверьте, запущены ли контейнеры
docker compose -f docker-compose.ssl.yml ps

# Если нет, запустите
docker compose -f docker-compose.ssl.yml up -d

# Проверьте логи
docker compose -f docker-compose.ssl.yml logs site
```

### 2. Webhook не устанавливается

**Причина:** Неправильный URL или SSL проблемы

**Решение:**

```bash
# Проверьте SSL
curl -I https://fibroadenoma.net

# Проверьте, что в .env правильный URL
cat .env | grep TELEGRAM_WEBHOOK_URL

# Должно быть:
# TELEGRAM_WEBHOOK_URL=https://fibroadenoma.net/api/telegram/webhook
```

### 3. Бот не обрабатывает сообщения

**Причина:** Токен не загружен в контейнер

**Решение:**

```bash
# Проверьте переменные в контейнере
docker exec fb-net-site env | grep TELEGRAM

# Если пусто, перезапустите контейнеры
docker compose -f docker-compose.ssl.yml down
docker compose -f docker-compose.ssl.yml up -d
```

---

## Проверка что всё работает

### 1. Webhook установлен

```bash
source .env
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" | jq '.result.url'
```

**Ожидаемый результат:**
```
"https://fibroadenoma.net/api/telegram/webhook"
```

### 2. Endpoint доступен

```bash
curl https://fibroadenoma.net/api/telegram/webhook
```

**Ожидаемый результат:**
```json
{"status":"ok","message":"Telegram webhook endpoint is active"}
```

### 3. Бот отвечает

Отправьте `/start` в Telegram → бот должен ответить приветствием.

### 4. Логи чистые

```bash
docker compose -f docker-compose.ssl.yml logs --tail 20 site | grep WEBHOOK
```

**Не должно быть ошибок типа:**
- `❌ TELEGRAM_BOT_TOKEN не установлен`
- `❌ Ошибка при обработке webhook`
- `Connection refused`

---

## Команды для копирования

Если вы на сервере прямо сейчас:

```bash
# Полная последовательность
cd /opt/fb-net
bash scripts/fix-telegram-now.sh

# Или вручную:
source .env
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://fibroadenoma.net/api/telegram/webhook", "drop_pending_updates": true, "allowed_updates": ["message", "callback_query"]}'

# Проверка
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" | jq '.'
```

---

## Полная документация

См. [TELEGRAM_DEBUG.md](TELEGRAM_DEBUG.md) для детальной диагностики и решения всех проблем.
