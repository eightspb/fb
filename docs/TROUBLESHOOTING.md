# Устранение проблем

Руководство по решению типичных проблем при разработке и деплое.

---

## 🐳 Проблемы с Docker

### Docker не запущен

**Ошибка:** `unable to get image` или `Cannot connect to the Docker daemon`

**Решение:**
1. Запустите Docker Desktop
2. Дождитесь полной загрузки (зеленая иконка в трее)
3. Проверьте: `docker ps`

### Контейнер PostgreSQL не запускается

**Решение:**
```bash
# Проверьте логи
docker logs fb-net-postgres

# Остановите и удалите контейнер
docker compose down -v

# Запустите заново
bun run docker:up
```

### Порт уже занят

**Ошибка:** `port is already allocated`

**Решение:**
```bash
# Найдите процесс на порту 54322
netstat -ano | findstr :54322

# Остановите процесс или измените порт в docker-compose.yml
```

---

## 💾 Проблемы с базой данных

### Ошибка подключения к БД

**Ошибка:** `ECONNREFUSED` или `connect ECONNREFUSED 127.0.0.1:54322`

**Решение:**
1. Убедитесь что Docker запущен: `docker ps`
2. Проверьте контейнер БД: `docker ps | grep postgres`
3. Перезапустите: `bun run docker:up`
4. Проверьте `DATABASE_URL` в `.env.local`

### Таблицы не найдены

**Ошибка:** `relation "news" does not exist`

**Решение:**
```bash
# Для dev окружения
docker exec -i fb-net-postgres psql -U postgres -d postgres < database-schema.sql

# Для production окружения
docker exec -i fb-net-db psql -U postgres -d postgres < database-schema.sql

# Или через docker compose
cat database-schema.sql | docker compose exec -T postgres psql -U postgres -d postgres
```

### Миграции не применились

**Решение:**
```bash
# Подключитесь к БД
bun run docker:psql

# Проверьте таблицу миграций
SELECT * FROM schema_migrations;

# Примените миграцию вручную
\i migrations/your-migration.sql
INSERT INTO schema_migrations (name) VALUES ('your-migration');
```

### Проверка данных в БД

```sql
-- Проверить количество новостей
SELECT COUNT(*) FROM news;

-- Проверить изображения
SELECT id, image_url, 
       CASE WHEN image_data IS NULL THEN 'NO DATA' ELSE 'HAS DATA' END 
FROM news_images LIMIT 5;

-- Проверить конференции
SELECT id, title, date, status FROM conferences;
```

---

## 🚀 Проблемы с запуском приложения

### Dev сервер не запускается

**Решение:**
```bash
# Очистите кэш Next.js
rm -rf .next

# Переустановите зависимости
rm -rf node_modules
bun install

# Запустите снова
bun run dev
```

### Страницы не открываются

**Решение:**
1. Проверьте запущен ли сервер: `bun run dev`
2. Проверьте порт: http://localhost:3000
3. Смотрите консоль на ошибки
4. Проверьте файлы в `src/app/`

### TypeScript ошибки

**Решение:**
```bash
# Проверьте ошибки
bun run lint

# Или
tsc --noEmit

# Очистите кэш
rm -rf .next
bun run dev
```

### Build падает с ошибкой

**Решение:**
```bash
# Проверьте логи сборки
bun run build

# Очистите кэш
rm -rf .next

# Проверьте переменные окружения
cat .env.local
```

---

## 🔐 Проблемы с аутентификацией

### Не могу войти в админ-панель

**Решение:**
1. Проверьте `ADMIN_USERNAME` и `ADMIN_PASSWORD` в `.env.local`
2. Убедитесь что `JWT_SECRET` установлен (минимум 32 символа)
3. Очистите cookies браузера
4. Попробуйте в режиме инкогнито

### JWT токен истек

**Решение:**
- Перезайдите в админ-панель через `/admin/login`
- Токены действительны 24 часа

### CSRF ошибка

**Ошибка:** `Invalid CSRF token`

**Решение:**
1. Обновите страницу (F5)
2. Очистите cookies
3. Проверьте что CSRF endpoint работает: `/api/csrf`

---

## 📧 Проблемы с Email

### Ошибки SMTP

**Ошибка:** `socket disconnected` или `TLS connection failed`

**Решение:**
1. Используйте **пароль приложения**, не обычный пароль
2. Для Mail.ru: **Настройки** → **Пароль и безопасность** → **Пароли для внешних приложений**
3. Проверьте настройки в `.env.local`:
```env
SMTP_HOST=smtp.mail.ru
SMTP_PORT=587
SMTP_USER=your_email@mail.ru
SMTP_PASSWORD=app_password_here
```
4. Попробуйте порт 587 вместо 465

### Письма не отправляются

**Решение:**
1. Проверьте логи сервера
2. Проверьте SMTP credentials
3. Попробуйте отправить тестовое письмо:
```bash
curl http://localhost:3000/api/test-smtp
```

---

## 📸 Проблемы с изображениями

### Изображения не загружаются

**Причина:** Изображения хранятся в БД и отдаются через `/api/images/{id}`

**Решение:**
```sql
-- Подключитесь к БД
bun run docker:psql

-- Проверьте наличие данных
SELECT id, image_url, LENGTH(image_data) as data_size 
FROM news_images 
WHERE image_data IS NOT NULL 
LIMIT 5;
```

### Загрузка изображений падает

**Решение:**
1. Проверьте размер изображения (максимум ~10MB)
2. Проверьте формат (PNG, JPG, WebP)
3. Проверьте логи при загрузке

---

## 🚀 Проблемы с деплоем

### Скрипт деплоя падает

**Ошибка:** `Failed to connect to server`

**Решение:**
```powershell
# Проверьте подключение к серверу
ssh root@your-server.com

# Проверьте SSH ключи
ssh-add -l

# Попробуйте с явным указанием ключа
ssh -i ~/.ssh/id_rsa root@your-server.com
```

### Контейнеры не запускаются на сервере

**Решение:**
```bash
# Подключитесь к серверу
ssh root@155.212.217.60

# Проверьте статус
cd /opt/fb-net
docker compose -f docker-compose.ssl.yml ps

# Посмотрите логи site (основное приложение + API)
docker compose -f docker-compose.ssl.yml logs site --tail=50

# Проверьте переменные окружения
cat .env
```

### База данных не запускается после деплоя

**Решение:**
```bash
# Проверьте логи БД
docker compose -f docker-compose.ssl.yml logs postgres --tail=50

# Проверьте volume
docker volume ls | grep postgres

# Перезапустите только БД
docker compose -f docker-compose.ssl.yml restart postgres
```

### Приложение работает, но 502 ошибка

**Решение:**
1. Проверьте что контейнеры `site` и `admin` запущены
2. Проверьте логи nginx
3. Проверьте порты в docker-compose.ssl.yml (site:3000, admin:3001)
4. Убедитесь что приложения слушают нужные порты

### Быстрый деплой (AppOnly) не работает

**Решение:**
```powershell
# Попробуйте полный деплой
.\scripts\deploy-from-github.ps1

# Или на сервере вручную
ssh root@155.212.217.60
cd /opt/fb-net
git pull
docker compose -f docker-compose.ssl.yml build --no-cache site admin
docker compose -f docker-compose.ssl.yml up -d site admin
```

---

## 🤖 Проблемы с Telegram Bot

### Бот не отвечает

**Решение:**
1. Проверьте `TELEGRAM_BOT_TOKEN` в `.env`
2. Проверьте webhook: `/api/telegram/webhook`
3. Проверьте логи сервера
4. Убедитесь что бот запущен у @BotFather

### Команды бота не работают

**Решение:**
1. Отправьте `/start` боту (или `/reset` для сброса зависшей сессии)
2. Проверьте что вы в списке админов (`TELEGRAM_ADMIN_CHAT_ID`)
3. Проверьте логи: `docker compose -f docker-compose.ssl.yml logs site | grep telegram`

---

## 📊 Проблемы с аналитикой

### Аналитика не собирается

**Решение:**
```sql
-- Проверьте таблицы аналитики
SELECT COUNT(*) FROM analytics_sessions;
SELECT COUNT(*) FROM analytics_page_views;

-- Проверьте последние записи
SELECT * FROM analytics_sessions ORDER BY created_at DESC LIMIT 5;
```

### Статистика не обновляется

**Решение:**
1. Очистите кэш браузера
2. Проверьте `/api/analytics/track` endpoint
3. Проверьте консоль браузера на ошибки

---

## 🔧 Общие команды для диагностики

### Локальная разработка

```bash
# Проверить статус Docker
docker ps

# Логи PostgreSQL
docker logs fb-net-postgres --tail=50

# Подключиться к БД
bun run docker:psql

# Перезапустить всё
bun run docker:down
bun run docker:up
bun run dev
```

### На продакшен сервере

```bash
# Подключиться к серверу
ssh root@155.212.217.60

# Перейти в папку проекта
cd /opt/fb-net

# Статус контейнеров
docker compose -f docker-compose.ssl.yml ps

# Логи сайта/API (основной контейнер)
docker compose -f docker-compose.ssl.yml logs site --tail=100

# Логи adminки
docker compose -f docker-compose.ssl.yml logs admin --tail=50

# Логи БД
docker compose -f docker-compose.ssl.yml logs postgres --tail=50

# Логи nginx
docker compose -f docker-compose.ssl.yml logs nginx --tail=50

# Перезапустить сайт и adminку
docker compose -f docker-compose.ssl.yml restart site admin

# Полный перезапуск
docker compose -f docker-compose.ssl.yml down
docker compose -f docker-compose.ssl.yml up -d
```

### Проверка переменных окружения

```bash
# Локально
cat .env.local

# На сервере
ssh root@your-server.com "cat /opt/fb-net/.env"
```

---

## 📝 Логирование

### Где смотреть логи

**Локально:**
- В консоли dev сервера
- В DevTools браузера (Console, Network)

**На сервере:**
```bash
# Все логи
docker compose -f docker-compose.ssl.yml logs -f

# Только site (приложение + API)
docker compose -f docker-compose.ssl.yml logs site -f

# Только БД
docker compose -f docker-compose.ssl.yml logs postgres -f

# Последние 100 строк
docker compose -f docker-compose.ssl.yml logs site --tail=100
```

---

## 🆘 Если ничего не помогло

1. **Проверьте переменные окружения** - самая частая причина проблем
2. **Очистите кэш** - `.next`, `node_modules`, Docker volumes
3. **Проверьте логи** - они обычно содержат причину проблемы
4. **Попробуйте чистую установку**:
```bash
# Локально
rm -rf node_modules .next
bun install
bun run docker:down -v
bun run docker:up
bun run dev
```

5. **Восстановите из бэкапа** (если проблема с БД):
```bash
# На сервере
cd /opt/fb-net
cat backups/db_backup_YYYYMMDD_HHMMSS.sql | docker compose -f docker-compose.production.yml exec -T postgres psql -U postgres -d postgres
```

---

## 📚 Дополнительная документация

- [README.md](../README.md) - общая информация
- [DEVELOPMENT.md](./DEVELOPMENT.md) - руководство разработчика
- [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) - инструкции по деплою
