# Миграция изображений в Supabase Storage

Этот скрипт переносит все изображения из папки `/public/images/trainings/` в Supabase Storage и обновляет пути в базе данных.

## ⚠️ Важно: Node.js версия

Скрипт требует Node.js >= 18. Если на сервере старая версия Node.js, используйте Docker (см. [MIGRATE_IMAGES_DOCKER.md](./MIGRATE_IMAGES_DOCKER.md)).

## Подготовка

### 1. Убедитесь, что у вас есть переменные окружения

Создайте файл `.env.production` (или используйте существующий `.env.local`) с необходимыми переменными:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
# или для продакшена:
# NEXT_PUBLIC_SUPABASE_URL=http://your-server:8000

# Service Role Key (для обхода RLS при загрузке файлов)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# База данных (для обновления путей)
DATABASE_URL=postgresql://supabase_admin:password@localhost:54322/postgres
```

**Где взять Service Role Key?**

1. Если используете локальный Supabase (docker-compose):
   - Service Role Key по умолчанию: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`

2. Если используете продакшен:
   - Сгенерируйте JWT токен с ролью `service_role` используя ваш `JWT_SECRET`
   - Или используйте переменную `ANON_KEY` из `.env.production` (но это менее безопасно)

### 2. Убедитесь, что Storage bucket создан

Bucket `public_files` должен быть создан. Если вы еще не создали его, выполните:

```bash
# Подключитесь к БД
docker exec -it fb-net-db psql -U supabase_admin -d postgres

# Выполните скрипт инициализации Storage
\i scripts/init-storage.sql
```

Или просто запустите docker-compose - скрипт выполнится автоматически.

## Запуск миграции

### Вариант 1: Локально (рекомендуется для тестирования)

```bash
# Убедитесь, что папка с изображениями существует
ls public/images/trainings/

# Запустите миграцию
npm run migrate:images
```

### Вариант 2: На сервере

```bash
# 1. Скопируйте папку с изображениями на сервер (если еще не скопировали)
scp -r public/images/trainings user@your-server:/opt/fb-net/public/images/

# 2. Подключитесь к серверу
ssh user@your-server

# 3. Перейдите в папку проекта
cd /opt/fb-net

# 4. Убедитесь, что .env.production настроен правильно
cat .env.production

# 5. Запустите миграцию
npm run migrate:images
```

## Что делает скрипт?

1. **Сканирует папку** `/public/images/trainings/` рекурсивно
2. **Загружает каждый файл** в Supabase Storage в папку `trainings/`
3. **Получает публичный URL** для каждого файла
4. **Обновляет пути в БД**:
   - Ищет старые пути вида `/images/trainings/...`
   - Заменяет их на Storage URLs вида `http://.../storage/v1/object/public/public_files/trainings/...`
5. **Создает отчет** `migration-report.json` с результатами

## Пример вывода

```
🚀 Начало миграции изображений в Supabase Storage...

📁 Сканирование папки: /opt/fb-net/public/images/trainings
✅ Найдено файлов: 150

[1/150] 2025.11.06/image_1762451338150_0.jpg
  Загрузка: trainings/2025.11.06/image_1762451338150_0.jpg...
  ✅ Загружено: http://your-server:8000/storage/v1/object/public/public_files/trainings/2025.11.06/image_1762451338150_0.jpg

[2/150] 2025.11.06/image_1762451338897_1.jpg
  ...

============================================================
📊 Итоги миграции:
============================================================
✅ Успешно загружено: 150
❌ Ошибок: 0

📄 Отчет сохранен: migration-report.json
```

## Проверка результатов

### 1. Проверьте Storage через API

```bash
# Получите список файлов в bucket
curl "http://your-server:8000/storage/v1/object/list/public_files?prefix=trainings/"
```

### 2. Проверьте БД

```bash
# Подключитесь к БД
docker exec -it fb-net-db psql -U supabase_admin -d postgres

# Проверьте несколько записей
SELECT image_url FROM news_images LIMIT 5;
```

Пути должны начинаться с `http://.../storage/v1/object/public/public_files/...`

### 3. Проверьте на сайте

Откройте любую новость с изображениями - они должны загружаться из Storage.

## Откат изменений (если что-то пошло не так)

Если нужно вернуться к локальным файлам:

```sql
-- Восстановите пути из backup или из migration-report.json
UPDATE news_images 
SET image_url = '/images/trainings/...' 
WHERE image_url LIKE '%/storage/v1/object/public/public_files/trainings/%';
```

## Удаление старых файлов

**ВНИМАНИЕ:** Удаляйте локальные файлы только после проверки, что всё работает!

```bash
# Создайте backup на всякий случай
tar -czf trainings-backup.tar.gz public/images/trainings/

# Удалите локальные файлы (после проверки!)
rm -rf public/images/trainings/*
```

## Troubleshooting

### Ошибка: "new row violates row-level security"

**Причина:** Service Role Key не настроен или неправильный.

**Решение:** 
- Проверьте `SUPABASE_SERVICE_ROLE_KEY` в `.env.production`
- Убедитесь, что используете правильный ключ с ролью `service_role`

### Ошибка: "Bucket 'public_files' not found"

**Причина:** Bucket не создан.

**Решение:**
```bash
docker exec -i fb-net-db psql -U supabase_admin -d postgres < scripts/init-storage.sql
```

### Ошибка: "Connection refused"

**Причина:** Supabase не запущен или неправильный URL.

**Решение:**
- Проверьте, что контейнеры запущены: `docker compose ps`
- Проверьте `NEXT_PUBLIC_SUPABASE_URL` в `.env.production`

### Файлы загрузились, но не отображаются на сайте

**Причина:** Пути в БД не обновились или кэш.

**Решение:**
- Проверьте пути в БД: `SELECT image_url FROM news_images LIMIT 5;`
- Очистите кэш Next.js: удалите `.next` и пересоберите проект
- Проверьте, что Storage bucket публичный

---

## 🐳 Миграция изображений через Docker

Если на сервере старая версия Node.js (v12), запустите скрипт миграции через Docker контейнер.

### Вариант 1: Через существующий контейнер app (если запущен)

```bash
# Проверьте, запущен ли контейнер
docker ps | grep fb-net-app

# Если контейнер запущен, выполните миграцию внутри него
docker exec -it fb-net-app npm run migrate:images
```

### Вариант 2: Через временный контейнер (рекомендуется)

```bash
cd /opt/fibroadenoma.net

# Запустите скрипт в временном контейнере с Node.js 20
docker run --rm -it \
  --network fibroadenomanet_fb-net-prod-network \
  -v $(pwd):/app \
  -w /app \
  -e NEXT_PUBLIC_SUPABASE_URL=http://supabase-kong:8000 \
  -e SUPABASE_SERVICE_ROLE_KEY="ваш-service-role-key" \
  -e DATABASE_URL="postgresql://supabase_admin:ваш-пароль@supabase-db:5432/postgres" \
  node:20-alpine sh -c "npm install -g tsx && tsx scripts/migrate-images-to-storage.ts"
```

### Вариант 3: Используя docker-compose exec (если контейнеры запущены)

```bash
cd /opt/fibroadenoma.net

# Установите tsx в контейнере app (если еще не установлен)
docker compose -f docker-compose.production.yml exec app npm install -g tsx

# Запустите миграцию
docker compose -f docker-compose.production.yml exec app npm run migrate:images
```

### Вариант 4: Создать отдельный скрипт-обертку

Создайте файл `migrate-images-docker.sh`:

```bash
#!/bin/bash
cd /opt/fibroadenoma.net

# Загружаем переменные из .env.production
source .env.production

docker run --rm -it \
  --network fibroadenomanet_fb-net-prod-network \
  -v $(pwd):/app \
  -w /app \
  -e NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-http://supabase-kong:8000}" \
  -e SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}" \
  -e DATABASE_URL="${DATABASE_URL}" \
  node:20-alpine sh -c "npm install -g tsx && tsx scripts/migrate-images-to-storage.ts"
```

Сделайте его исполняемым и запустите:

```bash
chmod +x migrate-images-docker.sh
./migrate-images-docker.sh
```

### Важно: Переменные окружения

Убедитесь, что в `.env.production` указаны правильные значения:

```env
NEXT_PUBLIC_SUPABASE_URL=http://your-server:8000
SUPABASE_SERVICE_ROLE_KEY=ваш-service-role-key
DATABASE_URL=postgresql://supabase_admin:пароль@supabase-db:5432/postgres
```

**Для Docker сети используйте имена контейнеров:**
- `supabase-db` вместо `localhost` для DATABASE_URL
- `supabase-kong:8000` вместо `your-server:8000` для NEXT_PUBLIC_SUPABASE_URL (внутри сети)

### Проверка сети Docker

Убедитесь, что контейнеры в одной сети:

```bash
docker network ls | grep fb-net-prod-network
docker network inspect fibroadenomanet_fb-net-prod-network
```

### Troubleshooting

#### Ошибка: "network not found"

Используйте правильное имя сети:

```bash
# Посмотрите имя сети
docker network ls

# Используйте правильное имя в команде docker run
--network правильное-имя-сети
```

#### Ошибка: "Cannot connect to database"

Проверьте, что контейнер `supabase-db` запущен:

```bash
docker ps | grep supabase-db
```

И используйте правильное имя хоста в DATABASE_URL: `supabase-db` (не `localhost`).

#### Ошибка: "Cannot connect to Supabase"

Проверьте, что контейнер `supabase-kong` запущен:

```bash
docker ps | grep supabase-kong
```

И используйте правильный URL: `http://supabase-kong:8000` (внутри Docker сети).

