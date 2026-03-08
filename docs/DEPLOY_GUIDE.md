# Руководство по деплою

## Стандартный цикл

```powershell
# 1. Коммит и push
.\scripts\commit-and-push.ps1 -Message "Описание изменений"

# 2. Деплой (только site + admin, без затрагивания БД) — 90% случаев
.\scripts\deploy-from-github.ps1 -AppOnly

# 3. С миграциями БД (при изменении схемы)
.\scripts\deploy-from-github.ps1
```

## Параметры deploy-from-github.ps1

| Параметр | Что делает | Время |
|----------|-----------|-------|
| `-AppOnly` | `site` + `admin`, БД не трогается | ~2-3 мин |
| `-SiteOnly` | Только `site` (сайт + API) | ~2 мин |
| `-AdminOnly` | Только `admin` (UI панели) | ~2 мин |
| (без флагов) | Полный деплой + миграции | ~5-7 мин |
| `-SkipBackup` | Без автоматического бэкапа БД | — |
| `-SkipMigrations` | Без применения миграций | — |
| `-Branch dev` | Деплой из другой ветки | — |
| `-Init` | Первый запуск на новом сервере | — |

**При `-AppOnly`:** git pull → build site + admin → up -d → restart nginx

**При полном деплое:** backup БД → git pull → миграции → rebuild all containers

> **ВАЖНО:** После `up -d site admin` всегда делать `restart nginx` — иначе 502 (nginx кэширует старые IP контейнеров).

## Ручной деплой (на сервере)

```bash
ssh -p 2222 root@155.212.217.60
cd /opt/fb-net
git pull origin master
docker compose -f docker-compose.ssl.yml build --no-cache site admin
docker compose -f docker-compose.ssl.yml up -d site admin
docker compose -f docker-compose.ssl.yml restart nginx  # обязательно!
```

## Первый запуск на новом сервере

```powershell
.\scripts\deploy-from-github.ps1 -Init
```

На сервере создать `.env`:

```bash
ssh -p 2222 root@155.212.217.60
cd /opt/fb-net
cp ENV_EXAMPLE.txt .env
nano .env  # заполнить все переменные
```

Затем: `.\scripts\deploy-from-github.ps1`

## Бэкап и восстановление

```powershell
# Ручной бэкап
.\scripts\backup-database.ps1
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
