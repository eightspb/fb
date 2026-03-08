# Быстрый старт

## Деплой (90% случаев)

```powershell
# Коммит и push
.\scripts\commit-and-push.ps1 -Message "Описание изменений"

# Деплой
.\scripts\deploy-from-github.ps1 -AppOnly
```

## Локальная разработка

```powershell
bun run dev:remote
```

Открыть: `http://localhost:3001/admin` (пароль: `admin123` из `.env.local`)

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
