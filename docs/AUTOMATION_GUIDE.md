# Руководство по автоматизации деплоя

## Архитектура

Проект состоит из двух отдельных Next.js приложений в одном репозитории:

- **`site`** — публичный сайт + весь backend/API (`/api/*`), включая `/api/admin/*`
- **`admin`** — UI панели управления (`/admin/*`), проксирует API в `site`

Оба приложения разворачиваются в отдельных Docker-контейнерах.

---

## Быстрый старт

### Деплой только сайта (самый частый случай)

```powershell
.\scripts\deploy-from-github.ps1 -SiteOnly
```

### Деплой только админки

```powershell
.\scripts\deploy-from-github.ps1 -AdminOnly
```

### Деплой обоих приложений

```powershell
.\scripts\deploy-from-github.ps1 -AppOnly
```

### Полный деплой (с миграциями БД)

```powershell
.\scripts\deploy-from-github.ps1
```

---

## Что происходит при каждом режиме

### `-SiteOnly` / `-AdminOnly` / `-AppOnly`

1. Подключение к серверу по SSH
2. Бэкап БД (если не указан `-SkipBackup`)
3. `git pull` из GitHub
4. Проверка и установка зависимостей сервера
5. Остановка нужных контейнеров
6. Пересборка нужных контейнеров (без кеша)
7. Запуск обновленных контейнеров
8. Настройка Telegram webhook
9. Вывод логов

**БД (`postgres`) не перезапускается** — работает без прерывания.

### Полный деплой (без флагов)

Всё то же самое, но дополнительно:
- Применяются миграции БД
- Перезапускаются **все** контейнеры, включая `postgres`

---

## Рабочий процесс разработки

### Стандартный цикл

```powershell
# 1. Внести изменения в код
# 2. Коммит и push в GitHub
.\scripts\commit-and-push.ps1 -Message "Описание изменений"

# 3. Деплой на сервер
.\scripts\deploy-from-github.ps1 -SiteOnly    # если менял src/
.\scripts\deploy-from-github.ps1 -AdminOnly   # если менял apps/admin/
.\scripts\deploy-from-github.ps1 -AppOnly     # если менял и то, и другое
```

### С миграцией БД

```powershell
.\scripts\commit-and-push.ps1 -Message "Добавил таблицу X"
.\scripts\deploy-from-github.ps1   # полный деплой применит миграции
```

---

## Параметры deploy-from-github.ps1

| Параметр | Что делает |
|----------|-----------|
| `-SiteOnly` | Только `site` (сайт + API) |
| `-AdminOnly` | Только `admin` (UI панели) |
| `-AppOnly` | `site` + `admin` (оба приложения) |
| `-SkipBackup` | Без бэкапа БД |
| `-SkipMigrations` | Без применения миграций |
| `-Branch dev` | Деплой из другой ветки |
| `-Init` | Первоначальная настройка сервера |

---

## Серверные скрипты (запускаются автоматически)

### `setup-server-dependencies.sh`

Запускается при каждом деплое. Проверяет и устанавливает:
- `jq`, `curl`, `git`, Docker
- Необходимые переменные в `.env` (в т.ч. `TELEGRAM_WEBHOOK_URL`)

Запуск вручную:
```bash
bash scripts/setup-server-dependencies.sh
```

### `fix-telegram-now.sh`

Настраивает Telegram webhook:
- Удаляет старый webhook
- Устанавливает новый
- Очищает необработанные сообщения
- Отправляет тестовое сообщение

Запуск вручную:
```bash
bash scripts/fix-telegram-now.sh
```

### `diagnose-telegram.sh`

Полная диагностика Telegram бота — проверяет бота, webhook, контейнеры, переменные окружения.

```bash
bash scripts/diagnose-telegram.sh
```

### `apply-migrations-remote.sh`

Применяет SQL-миграции из папки `migrations/` к БД.

```bash
bash scripts/apply-migrations-remote.sh docker-compose.ssl.yml
```

---

## Первый запуск на новом сервере

```powershell
# 1. Клонировать репозиторий
.\scripts\deploy-from-github.ps1 -Init

# 2. Создать .env на сервере
ssh root@155.212.217.60
cd /opt/fb-net
cp ENV_EXAMPLE.txt .env
nano .env

# 3. Полный деплой
.\scripts\deploy-from-github.ps1
```

---

## SSL

Скрипт автоматически определяет режим:
- Есть сертификат → использует `docker-compose.ssl.yml` (nginx на 80/443)
- Нет сертификата → использует `docker-compose.production.yml` (прямые порты)

Настройка SSL: [SSL_QUICKSTART.md](SSL_QUICKSTART.md)

---

## Логи и мониторинг

```bash
# На сервере
docker compose -f docker-compose.ssl.yml logs site --tail=50 -f
docker compose -f docker-compose.ssl.yml logs admin --tail=50 -f
docker compose -f docker-compose.ssl.yml ps
```

---

## Восстановление из бэкапа

```bash
ssh root@155.212.217.60
cd /opt/fb-net
ls -lh backups/

cat backups/db_backup_YYYYMMDD_HHMMSS.sql | \
  docker compose -f docker-compose.ssl.yml exec -T postgres \
  psql -U postgres -d postgres
```

---

## Решение проблем

### Telegram бот не отвечает

```bash
# Быстрое исправление
bash scripts/fix-telegram-now.sh

# Диагностика
bash scripts/diagnose-telegram.sh
```

### Проблемы с зависимостями

```bash
bash scripts/setup-server-dependencies.sh
```

### Сайт не открывается

```bash
docker compose -f docker-compose.ssl.yml restart site
docker compose -f docker-compose.ssl.yml logs site --tail=100
```

### Админка не открывается

```bash
docker compose -f docker-compose.ssl.yml restart admin
docker compose -f docker-compose.ssl.yml logs admin --tail=100
```

---

## Дополнительная документация

- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) — полное руководство по деплою
- [SSL_QUICKSTART.md](SSL_QUICKSTART.md) — настройка SSL
- [TELEGRAM_DEBUG.md](TELEGRAM_DEBUG.md) — диагностика Telegram
- [scripts/README.md](../scripts/README.md) — описание всех скриптов
