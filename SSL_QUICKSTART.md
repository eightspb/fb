# SSL Быстрый старт для fibroadenoma.net

## Пререквизиты

Перед началом убедитесь:
- ✅ Домен `fibroadenoma.net` направлен на IP сервера
- ✅ Порты 80 и 443 открыты
- ✅ Код загружен на сервер в `/opt/fb-net`

## Команды для настройки SSL

```bash
# 1. Перейдите в директорию проекта
cd /opt/fb-net

# 2. Загрузите последние изменения
git pull

# 3. Убедитесь, что .env файл настроен
# (должны быть POSTGRES_PASSWORD, ADMIN_PASSWORD, JWT_SECRET)
cat .env

# 4. Запустите скрипт настройки SSL
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh your@email.com

# Email опциональный, но рекомендуется
```

## Что произойдет

1. Остановится текущий HTTP деплой (если есть)
2. Создадутся директории для сертификатов
3. Запустится временный HTTP сервер
4. Получится SSL сертификат от Let's Encrypt
5. Обновится .env с HTTPS URL
6. Запустятся все сервисы с HTTPS

## Время выполнения

**~2-3 минуты** (зависит от скорости сервера)

## После выполнения

Сайт будет доступен: **https://fibroadenoma.net**

## Проверка

```bash
# Проверить статус
docker compose -f docker-compose.ssl.yml ps

# Проверить сертификат
curl -I https://fibroadenoma.net

# Посмотреть логи
docker compose -f docker-compose.ssl.yml logs -f
```

## Если что-то пошло не так

```bash
# Посмотреть логи скрипта выше

# Или откатиться на HTTP версию:
docker compose -f docker-compose.ssl.yml down
docker compose -f docker-compose.production.yml up -d
```

## Подробная документация

См. [SSL_SETUP.md](SSL_SETUP.md) для детальной информации.
