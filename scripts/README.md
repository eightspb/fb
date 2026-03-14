# Скрипты проекта

Актуальный список скриптов из папки `scripts/`.

## Основные (macOS/Linux, локально)

### `deploy-from-github.sh`
Главный скрипт деплоя по SSH.
По умолчанию автоматически определяет default branch удалённого репозитория; для другой ветки используйте `--branch <name>`.
Запускается локально, но обновляет код и контейнеры на продакшн-сервере.

```bash
bash scripts/deploy-from-github.sh --site-only
bash scripts/deploy-from-github.sh --admin-only
bash scripts/deploy-from-github.sh --app-only
bash scripts/deploy-from-github.sh
```

### `commit-and-push.sh`
Автоматизирует `git add`, commit, push.
Пушит в текущую checkout-ветку, которая активна локально в момент запуска.

```bash
bash scripts/commit-and-push.sh
bash scripts/commit-and-push.sh --message "feat: update docs"
```

### `backup-database.sh`
Ручной бэкап PostgreSQL (локально или production-параметрами).

```bash
bash scripts/backup-database.sh
```

### `dev-remote.sh`
Локальная разработка с SSH-туннелем к удаленной БД. Запускает `site` (порт 3000) и `admin` (порт 3001) параллельно. Ctrl+C корректно завершает процессы и туннель.

```bash
bash scripts/dev-remote.sh
# или через package.json:
bun run dev:remote
```

### `clear-all-caches.sh`
Очистка локальных кэшей (`.next`, `.turbo` и временных файлов).

```bash
bash scripts/clear-all-caches.sh
```

### `check-telegram-webhook.sh`
Проверка/настройка webhook Telegram через bash.

```bash
bash scripts/check-telegram-webhook.sh
```

### `apply-migration-on-server.sh`
Точечная проверка и применение legacy-миграции `006_fix_app_logs_rls` на сервере.

## Что запускать и когда

- `bun run dev:remote` — когда нужна локальная разработка с удалённой БД.
- `bash scripts/commit-and-push.sh --message "..."` — когда изменения готовы к отправке в GitHub.
- `bash scripts/deploy-from-github.sh --app-only` — когда уже запушенный код нужно выкатить на продакшн-сервер.
- `bash scripts/deploy-from-github.sh` — когда нужен полный деплой с миграциями.

## Legacy PowerShell (Windows, deprecated)

Эти скрипты оставлены в репозитории для обратной совместимости, но больше не считаются основным путём запуска. На этой машине они не проверялись, потому что `pwsh`/`powershell` здесь не установлен.

- `check-env.ps1` — legacy вариант для `check-env.sh`
- `scripts/dev-remote.ps1` — legacy вариант для `scripts/dev-remote.sh`
- `scripts/deploy-from-github.ps1` — legacy вариант для `scripts/deploy-from-github.sh`
- `scripts/commit-and-push.ps1` — legacy вариант для `scripts/commit-and-push.sh`
- `scripts/backup-database.ps1` — legacy вариант для `scripts/backup-database.sh`
- `scripts/clear-all-caches.ps1` — legacy вариант для `scripts/clear-all-caches.sh`
- `scripts/check-telegram-webhook.ps1` — legacy вариант для `scripts/check-telegram-webhook.sh`
- `scripts/apply-migration-on-server.ps1` — legacy вариант для `scripts/apply-migration-on-server.sh`

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
- `tunnel-start.sh` — SSH-туннель к remote PostgreSQL

### Legacy/точечные скрипты поддержки

- `fix-logs-table.sh` — ручная настройка `app_logs`
- `check-logs-migration.sh` — проверка legacy-миграции логов

## TypeScript утилиты (bun)

### `research-contacts-without-notes.ts`
Bulk AI-исследование контактов без заметок (параллельно, с Telegram уведомлениями).

```bash
cd /opt/fb-net && bun scripts/research-contacts-without-notes.ts
```

### `index-embeddings.ts`
Индексация embeddings для семантического поиска по заметкам контактов. Находит незаиндексированные/обновлённые заметки и генерирует для них вектора через OpenRouter (text-embedding-3-small).

```bash
cd /opt/fb-net && bun scripts/index-embeddings.ts
```

- Требует: `pgvector` расширение (образ `pgvector/pgvector:pg15`), миграция `019_vector_search.sql`
- Concurrency: 3, timeout: 30s на embedding
- Пропускает заметки с неизменённым content_hash

### `tag-contacts-by-formname.ts`
Тегирование контактов по имени формы.

## JS/Node утилиты

- `check-env.js` — проверка env-переменных
- `apply-migration.js` — применить один SQL файл (Node + pg)
- `test-logs-api.js` — проверка таблицы/доступа логов

## Смежная документация

- [Деплой](../docs/DEPLOY_GUIDE.md)
- [Удаленная БД](../docs/REMOTE_DB_SETUP.md)
- [Troubleshooting](../docs/TROUBLESHOOTING.md)
