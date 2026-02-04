# Инструкция по деплою на VPS

## 1. Подготовка сервера

Убедитесь, что на сервере установлены Docker и Docker Compose.

```bash
# Обновите пакеты
sudo apt update && sudo apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавьте пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

## 2. Деплой из GitHub (рекомендуется)

### Первый деплой (клонирование репозитория)

```powershell
.\scripts\deploy-from-github.ps1 -Init
```

### Последующие обновления

```powershell
.\scripts\deploy-from-github.ps1
```

**Параметры:**
- `-SkipBackup` - пропустить бэкап БД (быстрый деплой)
- `-Branch dev` - деплой из другой ветки

## 3. Альтернатива: деплой через rsync

```powershell
.\scripts\deploy-to-server.ps1 -Server user@server -RemotePath /opt/fb-net
```

## 4. Настройка окружения

Создайте файл `.env` на сервере:

```bash
nano /opt/fb-net/.env
```

Содержимое:

```env
# Database
POSTGRES_PASSWORD=ваш-сложный-пароль

# Admin authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=пароль-для-админки
JWT_SECRET=минимум-32-символа-для-jwt

# Site URL
NEXT_PUBLIC_SITE_URL=http://ваш-домен-или-ip

# Email (optional)
SMTP_HOST=smtp.mail.ru
SMTP_PORT=587
SMTP_USER=email@domain.com
SMTP_PASSWORD=пароль
TARGET_EMAIL=куда-присылать

# Telegram (optional)
TELEGRAM_BOT_TOKEN=ваш-токен
TELEGRAM_ADMIN_CHAT_ID=ваш-chat-id
```

## 5. Запуск

```bash
cd /opt/fb-net
docker compose -f docker-compose.production.yml up -d --build
```

## 6. Проверка

```bash
# Статус контейнеров
docker compose -f docker-compose.production.yml ps

# Логи
docker compose -f docker-compose.production.yml logs -f

# Проверка сайта
curl http://localhost:3000
```

Сайт будет доступен на порту 3000.

## 7. Бэкапы

### Создание бэкапа

```powershell
.\scripts\backup-database.ps1
```

Бэкапы сохраняются в папку `backups/`.

### Автоматический бэкап

Скрипт `deploy-from-github.ps1` автоматически создает бэкап перед каждым обновлением.

## 8. Полезные команды

```bash
# Остановить всё
docker compose -f docker-compose.production.yml down

# Перезапустить
docker compose -f docker-compose.production.yml up -d --build

# Подключиться к БД
docker exec -it fb-net-db psql -U postgres -d postgres

# Логи конкретного контейнера
docker logs fb-net-app -f
```

## 9. Устранение проблем

### Контейнеры не запускаются

```bash
# Проверьте логи
docker compose -f docker-compose.production.yml logs

# Убедитесь что порты свободны
netstat -tlnp | grep -E '3000|5432'
```

### Ошибки базы данных

```bash
# Проверьте подключение
docker exec -it fb-net-db psql -U postgres -c "SELECT 1"

# Проверьте таблицы
docker exec -it fb-net-db psql -U postgres -d postgres -c "\dt"
```

### Сайт недоступен

```bash
# Проверьте что контейнер запущен
docker ps | grep fb-net-app

# Проверьте логи
docker logs fb-net-app --tail 100
```
