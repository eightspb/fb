# 🤖 Руководство по автоматизации

## Обзор

Проект полностью автоматизирован! Все что нужно - запустить один скрипт деплоя, и все остальное произойдет автоматически.

## 🚀 Быстрый старт

### Обычный деплой (обновление кода)

```powershell
.\scripts\deploy-from-github.ps1 -AppOnly
```

**Что произойдет автоматически:**

1. ✅ **Подключение к серверу** - проверка SSH доступа
2. ✅ **Бэкап БД** - автоматическая резервная копия
3. ✅ **Обновление кода** - `git pull` на сервере
4. ✅ **Установка зависимостей** - jq, curl и другие утилиты
5. ✅ **Проверка .env** - добавление недостающих переменных
6. ✅ **Применение миграций БД** - только новые миграции
7. ✅ **Перезапуск приложения** - без остановки БД
8. ✅ **Настройка Telegram webhook** - автоматическая установка
9. ✅ **Проверка логов** - вывод последних 20 строк

### Первый деплой на новый сервер

```powershell
.\scripts\deploy-from-github.ps1 -Init
```

После этого создайте `.env` файл на сервере и запустите обычный деплой.

## 📋 Автоматические скрипты

### На сервере (выполняются автоматически)

#### 1. `setup-server-dependencies.sh`

Автоматически проверяет и устанавливает:
- `jq` - для парсинга JSON
- `curl` - для HTTP запросов
- `git` - для работы с репозиторием
- Docker и Docker Compose
- Проверяет переменные окружения в `.env`
- Добавляет `TELEGRAM_WEBHOOK_URL` если отсутствует
- Создает необходимые директории
- Устанавливает права на скрипты

**Запуск вручную:**
```bash
bash scripts/setup-server-dependencies.sh
```

#### 2. `fix-telegram-now.sh`

Автоматически настраивает Telegram webhook:
- Проверяет доступность endpoint
- Удаляет старый webhook
- Устанавливает новый webhook
- Очищает необработанные сообщения
- Отправляет тестовое сообщение

**Особенность:** Работает с `jq` и без него!

**Запуск вручную:**
```bash
bash scripts/fix-telegram-now.sh
```

#### 3. `diagnose-telegram.sh`

Полная диагностика Telegram бота:
- Проверяет доступность бота
- Проверяет статус webhook
- Проверяет endpoint
- Проверяет Docker контейнеры
- Проверяет переменные окружения
- Выводит отчет о проблемах

**Запуск:**
```bash
bash scripts/diagnose-telegram.sh
```

### На локальном компьютере

#### 1. `deploy-from-github.ps1`

Главный скрипт деплоя - автоматизирует весь процесс.

**Параметры:**
- `-AppOnly` - только приложение (БД не пересобирается) ⚡
- `-SkipBackup` - без бэкапа БД
- `-Branch dev` - деплой из другой ветки
- `-Init` - первоначальная настройка сервера

**Примеры:**
```powershell
# Быстрый деплой (90% случаев)
.\scripts\deploy-from-github.ps1 -AppOnly

# Полный деплой (все контейнеры)
.\scripts\deploy-from-github.ps1

# Деплой без бэкапа
.\scripts\deploy-from-github.ps1 -AppOnly -SkipBackup

# Деплой из другой ветки
.\scripts\deploy-from-github.ps1 -Branch dev
```

#### 2. `commit-and-push.ps1`

Автоматический коммит и push.

```powershell
.\scripts\commit-and-push.ps1 -Message "Описание изменений"
```

## 🔧 Типичный рабочий процесс

### Разработка и деплой

```powershell
# 1. Внесли изменения в код
# Редактировали файлы...

# 2. Коммит и push
.\scripts\commit-and-push.ps1 -Message "Добавил новую функцию"

# 3. Деплой
.\scripts\deploy-from-github.ps1 -AppOnly

# Готово! ✅
```

### Первый запуск на новом сервере

```powershell
# 1. Первоначальная настройка
.\scripts\deploy-from-github.ps1 -Init

# 2. Подключитесь к серверу и создайте .env
ssh root@your-server.com
cd /opt/fb-net
nano .env  # Скопируйте содержимое из ENV_EXAMPLE.txt

# 3. Запустите полный деплой
.\scripts\deploy-from-github.ps1

# Всё работает! ✅
```

## 🐛 Решение проблем

### Telegram бот не отвечает

**Автоматически:**
```powershell
.\scripts\deploy-from-github.ps1 -AppOnly
```

**Вручную на сервере:**
```bash
# Быстрое исправление
bash scripts/fix-telegram-now.sh

# Или полная диагностика
bash scripts/diagnose-telegram.sh
```

### Проблемы с зависимостями

**Автоматически:**
Скрипт `setup-server-dependencies.sh` запускается при каждом деплое.

**Вручную:**
```bash
ssh root@your-server.com
cd /opt/fb-net
bash scripts/setup-server-dependencies.sh
```

### Проблемы с БД

**Восстановление из бэкапа:**
```bash
ssh root@your-server.com
cd /opt/fb-net

# Посмотреть доступные бэкапы
ls -lh backups/

# Восстановить бэкап
cat backups/db_backup_YYYYMMDD_HHMMSS.sql | \
  docker compose -f docker-compose.ssl.yml exec -T postgres \
  psql -U postgres -d postgres
```

## 📝 Переменные окружения

Скрипт `setup-server-dependencies.sh` автоматически проверяет и добавляет:

### Обязательные переменные

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_chat_id
DATABASE_URL=postgresql://...
```

### Автоматически добавляемые

```env
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
```

Скрипт автоматически определяет ваш домен из `NEXT_PUBLIC_SITE_URL` и добавляет правильный webhook URL.

## 🔐 SSL сертификаты

Скрипт деплоя автоматически определяет, какой docker-compose файл использовать:

- **Если SSL сертификат есть** → `docker-compose.ssl.yml`
- **Если сертификата нет** → `docker-compose.production.yml`

Настройка SSL: см. [SSL_QUICKSTART.md](SSL_QUICKSTART.md)

## 📊 Логи и мониторинг

### Просмотр логов

```bash
# Логи приложения
docker-compose logs -f app

# Логи с фильтром
docker-compose logs -f app | grep -i "webhook\|telegram\|error"

# Логи nginx
docker-compose logs nginx

# Все логи
docker-compose logs -f
```

### Статус контейнеров

```bash
docker-compose ps
```

## 🎯 Лучшие практики

1. **Всегда используйте `-AppOnly`** для обычных деплоев
   - Быстрее
   - Безопаснее (БД не перезапускается)
   - Достаточно в 90% случаев

2. **Не пропускайте бэкапы** без веской причины
   - Бэкапы создаются быстро
   - Могут спасти в критической ситуации

3. **Проверяйте логи** после деплоя
   - Скрипт автоматически показывает последние 20 строк
   - Убедитесь, что нет критических ошибок

4. **Используйте автоматические скрипты**
   - Они проверяют всё необходимое
   - Меньше шансов что-то забыть

## 📚 Дополнительная документация

- [TELEGRAM_DEBUG.md](TELEGRAM_DEBUG.md) - Детальная диагностика Telegram
- [TELEGRAM_FIX_QUICK.md](TELEGRAM_FIX_QUICK.md) - Быстрое решение проблем Telegram
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) - Полное руководство по деплою
- [SSL_QUICKSTART.md](SSL_QUICKSTART.md) - Быстрая настройка SSL
- [scripts/README.md](../scripts/README.md) - Описание всех скриптов

## 🆘 Помощь

Если что-то пошло не так:

1. **Запустите диагностику:**
   ```bash
   bash scripts/diagnose-telegram.sh > debug.txt
   ```

2. **Соберите информацию:**
   ```bash
   docker-compose ps >> debug.txt
   docker-compose logs --tail 100 app >> debug.txt
   ```

3. **Проверьте документацию** в папке проекта

## 🎉 Заключение

Вся инфраструктура автоматизирована! Просто запускайте:

```powershell
.\scripts\deploy-from-github.ps1 -AppOnly
```

И всё остальное произойдет автоматически. Наслаждайтесь! 🚀
