# Руководство по деплою

## Стандартный цикл

```bash
# 1. Коммит и push
bash scripts/commit-and-push.sh --message "Описание изменений"

# 2. Деплой (только site + admin, без затрагивания БД) — 90% случаев
bash scripts/deploy-from-github.sh --app-only

# 3. С миграциями БД (при изменении схемы)
bash scripts/deploy-from-github.sh
```

## Что делает каждый скрипт

- `bun run dev:remote` — локальная разработка с SSH-туннелем к удалённой БД. Продакшн-сервер не обновляет.
- `bash scripts/commit-and-push.sh --message "..."` — делает `git add`, `git commit` и `git push` в текущую локальную ветку.
- `bash scripts/deploy-from-github.sh ...` — подключается по SSH к продакшн-серверу, обновляет там код из GitHub и перезапускает контейнеры.

Если сказать совсем просто: сначала вы готовите и пушите код, потом отдельной командой деплоите его на сервер.

## Параметры deploy-from-github.sh

| Параметр | Что делает | Время |
|----------|-----------|-------|
| `--app-only` | `site` + `admin`, БД не трогается | ~2-3 мин |
| `--site-only` | Только `site` (сайт + API) | ~2 мин |
| `--admin-only` | Только `admin` (UI панели) | ~2 мин |
| (без флагов) | Полный деплой + миграции | ~5-7 мин |
| `--skip-backup` | Без автоматического бэкапа БД | — |
| `--skip-migrations` | Без применения миграций | — |
| `--branch dev` | Деплой из явно указанной ветки | — |
| `--init` | Первый запуск на новом сервере | — |

По умолчанию `bash scripts/deploy-from-github.sh` пытается автоматически определить default branch удалённого репозитория.
Если нужен не default branch, а конкретная ветка, укажите её явно через `--branch <name>`.

**При `--app-only`:** git pull → build site + admin → up -d → restart nginx

**При полном деплое:** backup БД → git pull → миграции → rebuild all containers

> **ВАЖНО:** После `up -d site admin` всегда делать `restart nginx` — иначе 502 (nginx кэширует старые IP контейнеров).

## Ручной деплой (на сервере)

```bash
ssh -p 2222 root@155.212.217.60
cd /opt/fb-net
git fetch origin
git pull origin "$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD | sed 's#^origin/##')"
docker compose -f docker-compose.ssl.yml build --no-cache site admin
docker compose -f docker-compose.ssl.yml up -d site admin
docker compose -f docker-compose.ssl.yml restart nginx  # обязательно!
```

## Первый запуск на новом сервере

```bash
bash scripts/deploy-from-github.sh --init
```

На сервере создать `.env`:

```bash
ssh -p 2222 root@155.212.217.60
cd /opt/fb-net
cp ENV_EXAMPLE.txt .env
nano .env  # заполнить все переменные
```

Затем: `bash scripts/deploy-from-github.sh`

## Бэкап и восстановление

```bash
# Ручной бэкап
bash scripts/backup-database.sh
```

```bash
# Восстановление (на сервере, в /opt/fb-net)
cat backups/db_backup_YYYYMMDD.sql | \
  docker compose -f docker-compose.ssl.yml exec -T postgres psql -U postgres -d postgres
```

## Логи и диагностика

```bash
# На сервере
docker compose -f docker-compose.ssl.yml ps
docker compose -f docker-compose.ssl.yml logs site --tail=100
docker compose -f docker-compose.ssl.yml logs admin --tail=50
docker compose -f docker-compose.ssl.yml logs nginx --tail=50
```

## Telegram бот

```bash
# На сервере
bash scripts/fix-telegram-now.sh      # быстрое исправление webhook
bash scripts/diagnose-telegram.sh     # полная диагностика
```

## Серверные скрипты (запускаются автоматически при деплое)

- `setup-server-dependencies.sh` — проверка/установка `jq`, `curl`, `git`, Docker, проверка `.env`
- `fix-telegram-now.sh` — сброс и настройка Telegram webhook
- `apply-migrations-remote.sh` — применение SQL-миграций из `migrations/`

---

→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — решение проблем
→ [SSL_QUICKSTART.md](SSL_QUICKSTART.md) — настройка SSL
→ [TELEGRAM_DEBUG.md](TELEGRAM_DEBUG.md) — диагностика Telegram
→ [scripts/README.md](../scripts/README.md) — все скрипты
