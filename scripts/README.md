# Скрипты проекта

Актуальный список скриптов из папки `scripts/`.

## Основные (Windows, локально)

### `deploy-from-github.ps1`
Главный скрипт деплоя по SSH.

```powershell
.\scripts\deploy-from-github.ps1 -SiteOnly
.\scripts\deploy-from-github.ps1 -AdminOnly
.\scripts\deploy-from-github.ps1 -AppOnly
.\scripts\deploy-from-github.ps1
```

### `commit-and-push.ps1`
Автоматизирует `git add`, commit, push.

```powershell
.\scripts\commit-and-push.ps1
.\scripts\commit-and-push.ps1 -Message "feat: update docs"
```

### `backup-database.ps1`
Ручной бэкап PostgreSQL (локально или production-параметрами).

```powershell
.\scripts\backup-database.ps1
```

### `dev-remote.ps1`
Локальная разработка с SSH-туннелем к удаленной БД. Запускает `site` (порт 3000) и `admin` (порт 3001) параллельно. Ctrl+C корректно завершает все дочерние процессы (рекурсивный `Stop-ProcessTree`).

```powershell
.\scripts\dev-remote.ps1
# или через package.json:
bun run dev:remote
```

### `clear-all-caches.ps1`
Очистка локальных кэшей (`.next`, `.turbo` и временных файлов).

```powershell
.\scripts\clear-all-caches.ps1
```

### `check-telegram-webhook.ps1`
Проверка/настройка webhook Telegram из Windows.

```powershell
.\scripts\check-telegram-webhook.ps1
```

### `apply-migration-on-server.ps1`
Точечная проверка и применение legacy-миграции `006_fix_app_logs_rls` на сервере.

## Серверные (Linux, на сервере)

### `setup-server-dependencies.sh`
Установка/проверка серверных зависимостей (`jq`, `curl`, `git`, Docker) и проверка `.env`.

### `apply-migrations-remote.sh`
Применение всех SQL миграций из `migrations/` с учетом `schema_migrations`.

```bash
bash scripts/apply-migrations-remote.sh docker-compose.ssl.yml
```

### `init-migrations-table.sh`
Инициализация/нормализация таблицы `schema_migrations`.

### `apply-migrations.sh`
Локальное применение миграций из папки `migrations/` к контейнерной БД.

### `setup-ssl.sh`
Первичная настройка HTTPS через Let's Encrypt.

### `clear-server-caches.sh`
Очистка серверных Docker/Next.js кешей.

```bash
bash scripts/clear-server-caches.sh
bash scripts/clear-server-caches.sh --rebuild
```

### Telegram и диагностика

- `fix-telegram-now.sh` — быстрое исправление webhook
- `diagnose-telegram.sh` — диагностика Telegram интеграции
- `check-telegram-webhook.sh` — проверка webhook через bash

### Legacy/точечные скрипты поддержки

- `fix-logs-table.sh` — ручная настройка `app_logs`
- `check-logs-migration.sh` — проверка legacy-миграции логов

## JS/Node утилиты

- `check-env.js` — проверка env-переменных
- `apply-migration.js` — применить один SQL файл (Node + pg)
- `test-logs-api.js` — проверка таблицы/доступа логов

## Смежная документация

- [Деплой](../docs/DEPLOY_GUIDE.md)
- [Автоматизация](../docs/AUTOMATION_GUIDE.md)
- [Удаленная БД](../docs/REMOTE_DB_SETUP.md)
- [Troubleshooting](../docs/TROUBLESHOOTING.md)
