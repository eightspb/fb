# Скрипты проекта

## Деплой (запускается локально на Windows)

### `deploy-from-github.ps1` — главный скрипт деплоя

Подключается к серверу по SSH, делает `git pull` и пересобирает нужные Docker-контейнеры.

**Архитектура контейнеров:**
- `site` — публичный сайт + весь backend/API, собирается из `./Dockerfile`
- `admin` — UI панели управления, собирается из `./apps/admin/Dockerfile`
- `postgres` — база данных

#### Режимы деплоя

```powershell
# Только сайт (изменения в src/)
.\scripts\deploy-from-github.ps1 -SiteOnly

# Только админка (изменения в apps/admin/)
.\scripts\deploy-from-github.ps1 -AdminOnly

# Оба приложения (БД не трогается)
.\scripts\deploy-from-github.ps1 -AppOnly

# Полный деплой (все контейнеры + миграции БД)
.\scripts\deploy-from-github.ps1

# Первый запуск (клонировать репозиторий)
.\scripts\deploy-from-github.ps1 -Init
```

#### Все параметры

| Параметр | Описание |
|----------|----------|
| `-SiteOnly` | Только контейнер `site` |
| `-AdminOnly` | Только контейнер `admin` |
| `-AppOnly` | `site` + `admin` (без пересборки БД) |
| `-SkipBackup` | Пропустить бэкап БД |
| `-SkipMigrations` | Пропустить применение миграций |
| `-Branch dev` | Деплой из другой ветки |
| `-Init` | Первоначальная настройка сервера |

---

### `commit-and-push.ps1` — коммит и push в GitHub

```powershell
.\scripts\commit-and-push.ps1
.\scripts\commit-and-push.ps1 -Message "Описание изменений"
```

### `backup-database.ps1` — ручной бэкап БД

```powershell
.\scripts\backup-database.ps1
```

---

## Серверные скрипты (Linux, запускаются на сервере)

### `setup-server-dependencies.sh`

Проверяет и устанавливает `jq`, `curl`, `git`, Docker. Добавляет недостающие переменные в `.env`.
Запускается автоматически при каждом деплое.

```bash
bash scripts/setup-server-dependencies.sh
```

### `apply-migrations-remote.sh`

Применяет SQL-миграции из папки `migrations/` к БД.

```bash
bash scripts/apply-migrations-remote.sh docker-compose.ssl.yml
```

### `fix-telegram-now.sh`

Настраивает Telegram webhook (удаляет старый, устанавливает новый).

```bash
bash scripts/fix-telegram-now.sh
```

### `diagnose-telegram.sh`

Полная диагностика Telegram бота.

```bash
bash scripts/diagnose-telegram.sh
```

### `setup-ssl.sh`

Первоначальная настройка SSL-сертификата Let's Encrypt.

```bash
bash scripts/setup-ssl.sh
```

### `clear-server-caches.sh`

Очищает Docker кеши и Next.js кеши. Не удаляет тома с данными БД.

```bash
bash scripts/clear-server-caches.sh
bash scripts/clear-server-caches.sh --rebuild  # + пересборка контейнеров
```

---

## Типичный рабочий процесс

```powershell
# Изменил страницы сайта
.\scripts\commit-and-push.ps1 -Message "Обновил главную"
.\scripts\deploy-from-github.ps1 -SiteOnly

# Изменил UI в панели управления
.\scripts\commit-and-push.ps1 -Message "Добавил фильтр"
.\scripts\deploy-from-github.ps1 -AdminOnly

# Изменил и то и другое
.\scripts\commit-and-push.ps1 -Message "Рефакторинг"
.\scripts\deploy-from-github.ps1 -AppOnly

# Добавил миграцию БД
.\scripts\commit-and-push.ps1 -Message "Новая таблица"
.\scripts\deploy-from-github.ps1
```

---

## Документация

- [Деплой подробно](../docs/DEPLOY_GUIDE.md)
- [Автоматизация](../docs/AUTOMATION_GUIDE.md)
- [SSL](../docs/SSL_QUICKSTART.md)
- [Troubleshooting](../docs/TROUBLESHOOTING.md)
