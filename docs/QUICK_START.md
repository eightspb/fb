# Быстрый старт

## Что запускать и когда

- `bun run dev:remote` — локальная разработка: поднимает SSH-туннель к удалённой БД и запускает локально `site` + `admin`.
- `bash scripts/commit-and-push.sh --message "..."` — коммитит и пушит ваш локальный код в текущую git-ветку.
- `bash scripts/deploy-from-github.sh --app-only` — берёт уже запушенный код из GitHub и выкатывает его на продакшн-сервер.
- `bash scripts/deploy-from-github.sh` — делает полный продакшн-деплой, включая миграции.

## Деплой (90% случаев)

```bash
# Коммит и push
bash scripts/commit-and-push.sh --message "Описание изменений"

# Деплой
bash scripts/deploy-from-github.sh --app-only
```

## Локальная разработка

```bash
bun run dev:remote
```

`bun run dev:remote` не деплоит код на сервер. Он нужен только для локальной разработки.

Открыть: `http://localhost:3001/admin/login` (в форме входа нужен только пароль `admin123` из `.env.local`)

## Если Telegram бот не работает

```bash
ssh -p 2222 root@155.212.217.60
bash /opt/fb-net/scripts/fix-telegram-now.sh
```

## Подробная документация

- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) — деплой, параметры, бэкап
- [DEVELOPMENT.md](DEVELOPMENT.md) — стек, архитектура, API
- [REMOTE_DB_SETUP.md](REMOTE_DB_SETUP.md) — разработка с удалённой БД
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — решение проблем
- [TELEGRAM_DEBUG.md](TELEGRAM_DEBUG.md) — диагностика Telegram бота
