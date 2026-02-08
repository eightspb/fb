# Настройка Telegram Webhook

## Проблема

Бот не отвечает на сообщения. Причина: **ngrok endpoint офлайн** (ERR_NGROK_3200).

## Текущее состояние

- ✅ Webhook endpoint работает локально: `http://localhost:3000/api/telegram/webhook`
- ✅ Сервер работает на: `http://155.212.217.60:3000`
- ❌ Ngrok не запущен: `https://your-ngrok-url.ngrok-free.dev`
- ⚠️ 3 необработанных сообщения в очереди

## Решения

### Вариант 1: Запустить ngrok (для разработки)

```bash
# 1. Установите ngrok если еще не установлен
# Скачайте с https://ngrok.com/download

# 2. Авторизуйтесь (получите токен на ngrok.com)
ngrok config add-authtoken YOUR_TOKEN

# 3. Запустите ngrok на порт 3000
ngrok http 3000

# 4. Скопируйте HTTPS URL (например: https://abc123.ngrok-free.app)

# 5. Обновите .env.local
TELEGRAM_WEBHOOK_URL=https://abc123.ngrok-free.app/api/telegram/webhook

# 6. Установите webhook
powershell -File .\scripts\check-telegram-webhook.ps1
```

### Вариант 2: Использовать публичный сервер с HTTPS (рекомендуется)

**Требования:**
- ✅ Публичный IP: `155.212.217.60`
- ❌ SSL сертификат (Telegram требует HTTPS!)

**Шаги:**

#### 1. Настройте SSL с помощью Caddy (автоматический SSL)

```bash
# На сервере установите Caddy
curl https://caddyserver.com/api/download | sh

# Создайте Caddyfile
cat > Caddyfile <<EOF
your-domain.com {
    reverse_proxy localhost:3000
}
EOF

# Запустите Caddy (автоматически получит SSL от Let's Encrypt)
caddy run
```

#### 2. Или используйте nginx + certbot

```bash
# Установите certbot
sudo apt install certbot python3-certbot-nginx

# Получите SSL сертификат
sudo certbot --nginx -d your-domain.com

# Nginx уже настроен в docker-compose.ssl.yml
docker-compose -f docker-compose.ssl.yml up -d
```

#### 3. Обновите webhook

```bash
# Обновите .env.local на сервере
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook

# Установите webhook
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

### Вариант 3: Использовать Cloudflare Tunnel (бесплатно, без домена)

```bash
# 1. Установите cloudflared
# Windows: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/#windows

# 2. Запустите tunnel
cloudflared tunnel --url http://localhost:3000

# 3. Скопируйте HTTPS URL
# Например: https://abc-123.trycloudflare.com

# 4. Обновите .env.local
TELEGRAM_WEBHOOK_URL=https://abc-123.trycloudflare.com/api/telegram/webhook

# 5. Установите webhook
powershell -File .\scripts\check-telegram-webhook.ps1
```

## Быстрое решение (прямо сейчас)

### Используйте Cloudflare Tunnel:

1. **Скачайте cloudflared:**
   https://github.com/cloudflare/cloudflared/releases/latest

2. **Запустите:**
   ```powershell
   cloudflared tunnel --url http://localhost:3000
   ```

3. **Скопируйте URL** из вывода (например: `https://abc-123.trycloudflare.com`)

4. **Обновите .env.local:**
   ```
   TELEGRAM_WEBHOOK_URL=https://abc-123.trycloudflare.com/api/telegram/webhook
   ```

5. **Установите webhook:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\check-telegram-webhook.ps1
   ```
   Ответьте "y" на вопрос об установке webhook.

6. **Отправьте `/start` боту** в Telegram

## Проверка работоспособности

После настройки webhook проверьте:

```powershell
# 1. Проверка webhook info
$BOT_TOKEN = "YOUR_BOT_TOKEN"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"

# 2. Отправьте тестовое сообщение
# Откройте бота в Telegram и напишите: /start

# 3. Проверьте логи
docker-compose logs -f app
# или для локальной разработки
bun run dev
```

## Отладка

### Если бот все еще не отвечает:

1. **Проверьте логи сервера:**
   ```bash
   docker-compose logs -f app | grep -i webhook
   # или
   bun run dev
   ```

2. **Проверьте, доступен ли endpoint:**
   ```bash
   curl https://your-webhook-url/api/telegram/webhook
   # Должен вернуть: {"status":"ok","message":"Telegram webhook endpoint is active"}
   ```

3. **Проверьте pending updates:**
   ```powershell
   $BOT_TOKEN = "YOUR_BOT_TOKEN"
   Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/getUpdates"
   ```

4. **Очистите pending updates (если нужно):**
   ```powershell
   $BOT_TOKEN = "YOUR_BOT_TOKEN"
   Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" `
     -Method Post `
     -Body (@{ url = "https://your-webhook-url/api/telegram/webhook"; drop_pending_updates = $true } | ConvertTo-Json) `
     -ContentType "application/json"
   ```

## Важные замечания

- ⚠️ Telegram **требует HTTPS** для webhook (не работает с HTTP)
- ⚠️ Ngrok URL меняется при каждом перезапуске (бесплатная версия)
- ✅ Cloudflare Tunnel бесплатный и стабильный
- ✅ Для продакшена используйте свой домен с SSL
- 💡 Можно использовать polling вместо webhook для разработки (но это не рекомендуется)

## Альтернатива: Polling mode (только для разработки)

Если не хотите настраивать webhook, можно использовать polling:

**Внимание:** Это требует изменения кода и не рекомендуется для продакшена.

```typescript
// src/lib/telegram-bot.ts
export const bot = botToken 
  ? new TelegramBot(botToken, { polling: true }) // Изменить на true
  : null;
```

Но тогда webhook endpoint не будет использоваться, и нужно будет удалить webhook:

```powershell
$BOT_TOKEN = "YOUR_BOT_TOKEN"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook"
```

## Резюме

**Самое быстрое решение для тестирования:**
1. Скачайте cloudflared
2. Запустите `cloudflared tunnel --url http://localhost:3000`
3. Обновите webhook URL
4. Тестируйте бота

**Для продакшена:**
1. Настройте домен с SSL (Caddy/nginx + certbot)
2. Установите webhook на `https://your-domain.com/api/telegram/webhook`
3. Деплойте через Docker с SSL
