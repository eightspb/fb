# Пошаговая инструкция миграции изображений

## Шаг 1: Проверка готовности

```bash
cd /opt/fibroadenoma.net

# 1. Проверьте, что Storage запущен
docker ps | grep storage
# Должен быть статус "Up" (не "Restarting")

# 2. Проверьте логи Storage
docker logs fb-net-storage --tail 20
# Не должно быть ошибок подключения к БД

# 3. Проверьте, что Kong запущен
docker ps | grep kong

# 4. Проверьте, что папка с изображениями существует
ls -la public/images/trainings/ | head -10
```

## Шаг 2: Проверка подключения к Storage

```bash
# Проверьте, что Storage доступен через Kong
curl -I http://localhost:8000/storage/v1/bucket 2>&1 | head -5

# Или из Docker сети
docker run --rm --network $(docker network ls | grep fb-net-prod-network | awk '{print $2}') curlimages/curl:latest curl -I http://supabase-kong:8000/storage/v1/bucket
```

## Шаг 3: Запуск миграции

```bash
cd /opt/fibroadenoma.net

# Обновите код (если нужно)
git pull origin master

# Сделайте скрипт исполняемым
chmod +x migrate-images-docker.sh

# Запустите миграцию
./migrate-images-docker.sh
```

## Шаг 4: Проверка результатов

После завершения миграции:

```bash
# Проверьте отчет
cat migration-report.json | jq '.successful, .errorCount'

# Проверьте несколько записей в БД
docker exec -i fb-net-db psql -U supabase_admin -d postgres -c "SELECT image_url FROM news_images LIMIT 5;"

# Пути должны начинаться с http://.../storage/v1/object/public/public_files/...
```

## Troubleshooting

### Если Storage не запускается

```bash
# Проверьте логи
docker logs fb-net-storage --tail 50

# Перезапустите Storage
docker compose -f docker-compose.production.yml restart supabase-storage
```

### Если Kong не запущен

```bash
# Запустите Kong
docker compose -f docker-compose.production.yml up -d supabase-kong

# Проверьте логи
docker logs fb-net-kong --tail 20
```

### Если миграция падает с "fetch failed"

1. Проверьте, что Storage доступен: `docker ps | grep storage`
2. Проверьте URL в скрипте: должен быть `http://supabase-kong:8000` (внутри Docker сети)
3. Проверьте, что bucket создан: `docker exec -i fb-net-db psql -U supabase_admin -d postgres -c "SELECT * FROM storage.buckets;"`

