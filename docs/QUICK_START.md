# ⚡ БЫСТРЫЙ СТАРТ

## 🚀 Деплой (90% случаев)

На вашем компьютере запустите:

```powershell
.\scripts\deploy-from-github.ps1 -AppOnly
```

**Всё! Готово!** 🎉

Скрипт автоматически:
- ✅ Обновит код на сервере
- ✅ Установит все зависимости (jq и др.)
- ✅ Проверит и добавит недостающие переменные в .env
- ✅ Применит миграции БД
- ✅ Перезапустит приложение (БД продолжит работать)
- ✅ Настроит Telegram webhook
- ✅ Покажет логи

## 📝 Если вносили изменения в код

```powershell
# 1. Коммит и push
.\scripts\commit-and-push.ps1 -Message "Описание изменений"

# 2. Деплой
.\scripts\deploy-from-github.ps1 -AppOnly
```

## 🐛 Если Telegram бот не работает

Деплой скрипт автоматически настроит webhook, но если нужна диагностика:

**На сервере:**
```bash
ssh root@155.212.217.60
cd /opt/fb-net

# Быстрое исправление
bash scripts/fix-telegram-now.sh

# Или диагностика
bash scripts/diagnose-telegram.sh
```

**Или просто запустите деплой снова:**
```powershell
.\scripts\deploy-from-github.ps1 -AppOnly
```

## 📚 Подробная документация

- [AUTOMATION_GUIDE.md](AUTOMATION_GUIDE.md) - Полное руководство по автоматизации
- [TELEGRAM_DEBUG.md](TELEGRAM_DEBUG.md) - Решение проблем с Telegram
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) - Детальное руководство по деплою

## 💡 Полезные команды

### Просмотр логов (на сервере)

```bash
# Логи приложения
docker compose -f docker-compose.ssl.yml logs site | grep -i "webhook\|telegram"

# Статус контейнеров
docker compose -f docker-compose.ssl.yml ps
```

### Ручная установка jq (если нужно)

```bash
apt-get update && apt-get install -y jq
```

### Проверка Telegram webhook (на сервере)

```bash
source .env
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" | jq '.'
```

---

**Вот и всё!** Для 90% задач достаточно одной команды:

```powershell
.\scripts\deploy-from-github.ps1 -AppOnly
```

🚀 Наслаждайтесь автоматизацией!
