# Устранение проблем

---

## 💾 Проблемы с базой данных

### Ошибка подключения к БД

**Ошибка:** `ECONNREFUSED` или `connect ECONNREFUSED 127.0.0.1:54321`

При разработке с удалённой БД — убедитесь что туннель работает:
```bash
bun run dev:remote
# или вручную:
bun run tunnel:start
```

При локальной БД:
```bash
docker ps | grep fb-net-db
bun run docker:up
```

### Таблицы не найдены

**Ошибка:** `relation "news" does not exist`

```bash
# На продакшен сервере
docker exec -i fb-net-db psql -U postgres -d postgres < database-schema.sql
```

### Миграции не применились

```bash
# На сервере — проверить таблицу миграций
docker exec -it fb-net-db psql -U postgres -d postgres -c "SELECT * FROM schema_migrations;"

# Применить вручную
bash scripts/apply-migrations-remote.sh docker-compose.ssl.yml
```

---

## 🚀 Проблемы с запуском приложения (локально)

### Dev сервер не запускается

```bash
# Очистить кэш Next.js
rm -rf .next

# Переустановить зависимости
rm -rf node_modules
bun install

bun run dev:remote
```

### TypeScript ошибки / build падает

```bash
bun run lint    # или: tsc --noEmit
rm -rf .next
```

---

## 🔐 Проблемы с аутентификацией

### Не могу войти в админ-панель

1. Проверьте `ADMIN_USERNAME` и `ADMIN_PASSWORD` в `.env.local`
2. Убедитесь что `JWT_SECRET` установлен (минимум 32 символа)
3. Очистите cookies браузера / попробуйте инкогнито

### JWT токен истёк

Перезайдите через `/admin/login`. Токены действительны 24 часа.

### CSRF ошибка (`Invalid CSRF token`)

1. Обновите страницу (F5) — токен обновится автоматически
2. Очистите cookies
3. Проверьте что `/api/csrf` доступен

---

## 📧 Проблемы с Email (SMTP)

**Ошибка:** `socket disconnected` или `TLS connection failed`

1. Используйте **пароль приложения**, не обычный пароль (для Mail.ru: Настройки → Безопасность → Пароли для внешних приложений)
2. Проверьте в `.env`:
```env
SMTP_HOST=smtp.mail.ru
SMTP_PORT=587
SMTP_USER=your_email@mail.ru
SMTP_PASSWORD=app_password_here
```
3. Попробуйте порт 587 вместо 465

---

## 📸 Проблемы с изображениями

Изображения хранятся в БД и отдаются через `/api/images/{id}`:

```sql
-- Проверить наличие данных
SELECT id, image_url, LENGTH(image_data) as data_size
FROM news_images WHERE image_data IS NOT NULL LIMIT 5;
```

Максимальный размер ~10MB. Форматы: PNG, JPG, WebP.

---

## 🚀 Проблемы с деплоем

### Скрипт деплоя не подключается к серверу

```bash
ssh -p 2222 root@155.212.217.60
ssh-add -l
```

### Контейнеры не запускаются на сервере

```bash
ssh -p 2222 root@155.212.217.60
cd /opt/fb-net
docker compose -f docker-compose.ssl.yml ps
docker compose -f docker-compose.ssl.yml logs site --tail=50
cat .env  # проверить переменные окружения
```

### 502 Bad Gateway после деплоя

Nginx кэширует IP контейнеров — обязательно:
```bash
docker compose -f docker-compose.ssl.yml restart nginx
```

### Приложение не запускается

```bash
docker compose -f docker-compose.ssl.yml restart site admin
docker compose -f docker-compose.ssl.yml logs site --tail=100
```

### База данных не отвечает

```bash
docker compose -f docker-compose.ssl.yml restart postgres
docker compose -f docker-compose.ssl.yml logs postgres --tail=50
```

---

## 🤖 Проблемы с Telegram Bot

### Бот не отвечает

```bash
ssh -p 2222 root@155.212.217.60
cd /opt/fb-net
bash scripts/fix-telegram-now.sh      # сброс webhook
bash scripts/diagnose-telegram.sh     # полная диагностика
```

Проверить вручную:
```bash
source .env
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" | jq '.'
```

### Команды бота не работают

1. Отправьте `/reset` боту (сброс зависшей сессии)
2. Проверьте что ваш `TELEGRAM_ADMIN_CHAT_ID` указан в `.env`
3. Логи: `docker compose -f docker-compose.ssl.yml logs site | grep telegram`

→ Подробно: [TELEGRAM_DEBUG.md](TELEGRAM_DEBUG.md)

---

## 📊 Проблемы с аналитикой

```sql
-- Проверить таблицы
SELECT COUNT(*) FROM analytics_sessions;
SELECT COUNT(*) FROM analytics_page_views;
SELECT * FROM analytics_sessions ORDER BY created_at DESC LIMIT 5;
```

---

## 🔧 Диагностические команды

### На продакшен сервере

```bash
ssh -p 2222 root@155.212.217.60
cd /opt/fb-net

# Статус контейнеров
docker compose -f docker-compose.ssl.yml ps

# Логи
docker compose -f docker-compose.ssl.yml logs site --tail=100
docker compose -f docker-compose.ssl.yml logs admin --tail=50
docker compose -f docker-compose.ssl.yml logs postgres --tail=50
docker compose -f docker-compose.ssl.yml logs nginx --tail=50

# Перезапустить сайт и админку
docker compose -f docker-compose.ssl.yml restart site admin

# Переменные окружения
cat .env
```

### Локально

```bash
docker ps
bun run docker:psql    # подключиться к локальной БД
```

---

## 🆘 Если ничего не помогло

1. Проверьте переменные окружения — самая частая причина
2. Очистите кэш: `rm -rf .next node_modules && bun install`
3. Проверьте логи — обычно содержат точную причину
4. Восстановите БД из бэкапа:
```bash
cd /opt/fb-net
cat backups/db_backup_YYYYMMDD.sql | \
  docker compose -f docker-compose.ssl.yml exec -T postgres psql -U postgres -d postgres
```

---

→ [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)
→ [DEVELOPMENT.md](./DEVELOPMENT.md)
→ [TELEGRAM_DEBUG.md](./TELEGRAM_DEBUG.md)
