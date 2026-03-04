# Руководство по деплою

## Архитектура проекта

Проект использует **multi-zone** архитектуру из двух отдельных Next.js приложений:

| Контейнер | Порт | Назначение | Dockerfile |
|-----------|------|------------|------------|
| `site` | 3000 | Публичный сайт + весь backend/API (`/api/*`) | `./Dockerfile` |
| `admin` | 3001 | UI панели управления (`/admin/*`) | `./apps/admin/Dockerfile` |
| `postgres` | — | База данных PostgreSQL | образ postgres:15 |
| `nginx` | 80/443 | Reverse proxy + SSL (только в SSL-режиме) | образ nginx:alpine |

**Важно:** API-запросы (`/api/admin/*`) обрабатываются контейнером `site`, а не `admin`. Контейнер `admin` — только UI, который проксирует API-вызовы в `site`.

---

## Docker Compose конфигурации

| Файл | Когда используется |
|------|--------------------|
| `docker-compose.ssl.yml` | Продакшен с SSL (есть сертификат Let's Encrypt) |
| `docker-compose.production.yml` | Продакшен без SSL (прямые порты 3000/3001) |
| `docker-compose.yml` | Локальная разработка |

Скрипт деплоя **автоматически** определяет нужный файл по наличию SSL-сертификата на сервере.

---

## Скрипты деплоя

### Основные скрипты (запускаются локально)

| Скрипт | Назначение |
|--------|------------|
| `scripts/deploy-from-github.ps1` | Главный скрипт деплоя на сервер |
| `scripts/commit-and-push.ps1` | Коммит и push в GitHub |
| `scripts/backup-database.ps1` | Ручной бэкап базы данных |

---

## Режимы деплоя

### Только сайт (сайт + API)

**Когда использовать:**
- Изменили что-то в `src/` (страницы, компоненты, API routes)
- Обновили стили, изображения
- Изменили backend-логику

```powershell
.\scripts\deploy-from-github.ps1 -SiteOnly
```

**Что происходит:**
1. `git pull` на сервере
2. Останавливается контейнер `site`
3. Пересобирается контейнер `site` (без кеша)
4. Запускается обновленный `site`
5. `postgres` и `admin` — **не трогаются**

---

### Только админка

**Когда использовать:**
- Изменили что-то в `apps/admin/` (страницы, компоненты панели управления)
- Не меняли ничего в API и публичном сайте

```powershell
.\scripts\deploy-from-github.ps1 -AdminOnly
```

**Что происходит:**
1. `git pull` на сервере
2. Останавливается контейнер `admin`
3. Пересобирается контейнер `admin` (без кеша)
4. Запускается обновленный `admin`
5. `postgres` и `site` — **не трогаются**

---

### Сайт + Админка (без пересборки БД)

**Когда использовать:**
- Изменили и сайт, и админку одновременно
- Быстрый деплой обоих приложений

```powershell
.\scripts\deploy-from-github.ps1 -AppOnly
```

**Что происходит:**
1. `git pull` на сервере
2. Останавливаются контейнеры `site` и `admin`
3. Пересобираются `site` и `admin` (без кеша)
4. Запускаются обновленные контейнеры
5. `postgres` — **не трогается**

---

### Полный деплой

**Когда использовать:**
- Первый деплой на сервер
- Изменился `Dockerfile` или `docker-compose.yml`
- Добавлены миграции БД
- Что-то сломалось и нужен полный перезапуск

```powershell
.\scripts\deploy-from-github.ps1
```

**Что происходит:**
1. Создается бэкап БД
2. `git pull` на сервере
3. Применяются миграции БД
4. Останавливаются **все** контейнеры
5. Пересобираются **все** контейнеры
6. Запускаются **все** контейнеры

---

## Параметры deploy-from-github.ps1

| Параметр | Описание |
|----------|----------|
| (без параметров) | Полный деплой всех контейнеров |
| `-SiteOnly` | Только контейнер `site` (сайт + API) |
| `-AdminOnly` | Только контейнер `admin` (UI панели) |
| `-AppOnly` | `site` + `admin` (без пересборки БД) |
| `-SkipBackup` | Пропустить бэкап БД |
| `-SkipMigrations` | Пропустить применение миграций |
| `-Branch dev` | Деплой из другой ветки |
| `-Init` | Первый запуск: клонировать репозиторий |

---

## Типичные сценарии

### Изменил страницы публичного сайта

```powershell
.\scripts\commit-and-push.ps1 -Message "Обновил главную страницу"
.\scripts\deploy-from-github.ps1 -SiteOnly
```

### Изменил UI в панели управления

```powershell
.\scripts\commit-and-push.ps1 -Message "Добавил фильтр в таблицу новостей"
.\scripts\deploy-from-github.ps1 -AdminOnly
```

### Изменил и сайт, и API, и админку

```powershell
.\scripts\commit-and-push.ps1 -Message "Рефакторинг модуля новостей"
.\scripts\deploy-from-github.ps1 -AppOnly
```

### Добавил миграцию БД

```powershell
.\scripts\commit-and-push.ps1 -Message "Добавил таблицу categories"
.\scripts\deploy-from-github.ps1
```

### Первый деплой на новый сервер

```powershell
# Шаг 1: клонировать репозиторий
.\scripts\deploy-from-github.ps1 -Init

# Шаг 2: создать .env на сервере
ssh root@155.212.217.60
cd /opt/fb-net
cp ENV_EXAMPLE.txt .env
nano .env  # заполнить все переменные

# Шаг 3: полный деплой
.\scripts\deploy-from-github.ps1
```

---

## Сравнение времени деплоя

| Команда | Время | БД | Когда |
|---------|-------|----|-------|
| `-SiteOnly` | ~3-4 мин | ✅ Работает | Изменения только в `src/` |
| `-AdminOnly` | ~2-3 мин | ✅ Работает | Изменения только в `apps/admin/` |
| `-AppOnly` | ~5-6 мин | ✅ Работает | Изменения в обоих приложениях |
| (полный) | ~7-10 мин | ⚠️ Перезапускается | Миграции, первый деплой |

---

## Просмотр логов на сервере

```bash
ssh root@155.212.217.60
cd /opt/fb-net

# Логи сайта
docker compose -f docker-compose.ssl.yml logs site --tail=50 -f

# Логи админки
docker compose -f docker-compose.ssl.yml logs admin --tail=50 -f

# Статус всех контейнеров
docker compose -f docker-compose.ssl.yml ps
```

---

## Troubleshooting

### Сайт не отвечает

```bash
# Перезапустить только site
docker compose -f docker-compose.ssl.yml restart site

# Логи site
docker compose -f docker-compose.ssl.yml logs site --tail=100
```

### Админка не открывается

```bash
# Перезапустить только admin
docker compose -f docker-compose.ssl.yml restart admin

# Логи admin
docker compose -f docker-compose.ssl.yml logs admin --tail=100
```

### Если база данных не отвечает

```bash
docker compose -f docker-compose.ssl.yml restart postgres
docker compose -f docker-compose.ssl.yml logs postgres --tail=50
```

### Восстановление из бэкапа

```bash
ssh root@155.212.217.60
cd /opt/fb-net

# Список бэкапов
ls -lh backups/

# Восстановить
cat backups/db_backup_YYYYMMDD_HHMMSS.sql | \
  docker compose -f docker-compose.ssl.yml exec -T postgres \
  psql -U postgres -d postgres
```

---

## Best Practices

1. **Используйте `-SiteOnly` или `-AdminOnly`** вместо `-AppOnly` когда меняли только одно приложение — быстрее и безопаснее
2. **`-AppOnly`** — для случаев когда меняли оба приложения одновременно
3. **Полный деплой** — только при изменениях Dockerfile, docker-compose, или миграциях БД
4. **Бэкапы** — создаются автоматически при полном деплое, пропускайте только если уверены
5. **Проверяйте логи** после каждого деплоя
