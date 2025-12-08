# Миграция изображений через Docker

Если на сервере старая версия Node.js (v12), запустите скрипт миграции через Docker контейнер.

## Вариант 1: Через существующий контейнер app (если запущен)

```bash
# Проверьте, запущен ли контейнер
docker ps | grep fb-net-app

# Если контейнер запущен, выполните миграцию внутри него
docker exec -it fb-net-app npm run migrate:images
```

## Вариант 2: Через временный контейнер (рекомендуется)

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

## Вариант 3: Используя docker-compose exec (если контейнеры запущены)

```bash
cd /opt/fibroadenoma.net

# Установите tsx в контейнере app (если еще не установлен)
docker compose -f docker-compose.production.yml exec app npm install -g tsx

# Запустите миграцию
docker compose -f docker-compose.production.yml exec app npm run migrate:images
```

## Вариант 4: Создать отдельный скрипт-обертку

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

## Важно: Переменные окружения

Убедитесь, что в `.env.production` указаны правильные значения:

```env
NEXT_PUBLIC_SUPABASE_URL=http://your-server:8000
SUPABASE_SERVICE_ROLE_KEY=ваш-service-role-key
DATABASE_URL=postgresql://supabase_admin:пароль@supabase-db:5432/postgres
```

**Для Docker сети используйте имена контейнеров:**
- `supabase-db` вместо `localhost` для DATABASE_URL
- `supabase-kong:8000` вместо `your-server:8000` для NEXT_PUBLIC_SUPABASE_URL (внутри сети)

## Проверка сети Docker

Убедитесь, что контейнеры в одной сети:

```bash
docker network ls | grep fb-net-prod-network
docker network inspect fibroadenomanet_fb-net-prod-network
```

## Troubleshooting

### Ошибка: "network not found"

Используйте правильное имя сети:

```bash
# Посмотрите имя сети
docker network ls

# Используйте правильное имя в команде docker run
--network правильное-имя-сети
```

### Ошибка: "Cannot connect to database"

Проверьте, что контейнер `supabase-db` запущен:

```bash
docker ps | grep supabase-db
```

И используйте правильное имя хоста в DATABASE_URL: `supabase-db` (не `localhost`).

### Ошибка: "Cannot connect to Supabase"

Проверьте, что контейнер `supabase-kong` запущен:

```bash
docker ps | grep supabase-kong
```

И используйте правильный URL: `http://supabase-kong:8000` (внутри Docker сети).

