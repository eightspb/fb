# Исправление проблемы с Storage

## Проблема

Storage контейнер падает с ошибкой:
```
TypeError: Invalid URL
input: 'postgres://supabase_storage_admin:8mdJhdzeAGTVOtL/wXK1lZ2b/5T3VhAd@supabase-db:5432/postgres'
```

**Причина:** Пароль содержит символы `/`, которые нужно экранировать в URL как `%2F`.

## Решение

### Вариант 1: Экранировать пароль в docker-compose (рекомендуется)

Используйте функцию для экранирования пароля в `docker-compose.production.yml`:

```yaml
supabase-storage:
  environment:
    DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
```

Но Docker Compose не экранирует автоматически. Нужно использовать переменную с уже экранированным паролем.

### Вариант 2: Использовать переменную окружения с экранированным паролем

Создайте скрипт для экранирования пароля:

```bash
# На сервере
cd /opt/fibroadenoma.net

# Экранируем пароль
PASSWORD=$(cat .env.production | grep POSTGRES_PASSWORD | cut -d'=' -f2)
ESCAPED_PASSWORD=$(echo "$PASSWORD" | sed 's|/|%2F|g' | sed 's|@|%40|g' | sed 's|#|%23|g' | sed 's|:|%3A|g')

# Обновляем docker-compose.production.yml
sed -i "s|postgres://supabase_storage_admin:\${POSTGRES_PASSWORD}@|postgres://supabase_storage_admin:${ESCAPED_PASSWORD}@|g" docker-compose.production.yml
```

### Вариант 3: Использовать отдельную переменную для экранированного пароля

В `.env.production` добавьте:

```env
POSTGRES_PASSWORD=8mdJhdzeAGTVOtL/wXK1lZ2b/5T3VhAd
POSTGRES_PASSWORD_ESCAPED=8mdJhdzeAGTVOtL%2FwXK1lZ2b%2F5T3VhAd
```

И в `docker-compose.production.yml` используйте:

```yaml
DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD_ESCAPED}@supabase-db:5432/postgres
```

### Вариант 4: Исправить через переменную окружения напрямую (быстрое решение)

```bash
# На сервере
cd /opt/fibroadenoma.net

# Остановите Storage
docker compose -f docker-compose.production.yml stop supabase-storage

# Экранируем пароль
PASSWORD=$(grep POSTGRES_PASSWORD .env.production | cut -d'=' -f2)
ESCAPED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PASSWORD', safe=''))")

# Обновляем docker-compose.production.yml
sed -i "s|DATABASE_URL: postgres://supabase_storage_admin:\${POSTGRES_PASSWORD}@|DATABASE_URL: postgres://supabase_storage_admin:${ESCAPED_PASSWORD}@|g" docker-compose.production.yml

# Перезапустите Storage
docker compose -f docker-compose.production.yml up -d supabase-storage

# Проверьте логи
docker logs fb-net-storage --tail 20
```

## Также проверьте Kong

Kong должен быть запущен. Проверьте:

```bash
docker ps | grep kong
docker logs fb-net-kong --tail 20
```

Если Kong не запущен:

```bash
docker compose -f docker-compose.production.yml up -d supabase-kong
```

