# Руководство по деплою

Этот документ описывает рабочий процесс деплоя от коммита до продакшена.

## 📦 Доступные скрипты

Ключевые скрипты для ежедневной работы:

1. **commit-and-push.ps1** - коммит и push изменений в GitHub
2. **deploy-from-github.ps1** - деплой с GitHub на сервер
3. **backup-database.ps1** - ручной бэкап базы данных (опционально)
4. **dev-remote.ps1** - локальная разработка с удаленной БД через SSH-туннель

---

## 🔄 Рабочий процесс (от локальных изменений до продакшена)

### Шаг 1: Коммит и Push в GitHub

После внесения изменений в код:

```powershell
# Автоматический коммит всех изменений
.\scripts\commit-and-push.ps1

# Или с указанием сообщения
.\scripts\commit-and-push.ps1 -Message "Обновил главную страницу"
```

**Что делает скрипт:**
- Автоматически добавляет все изменения (git add -A)
- Проверяет отсутствие секретов (.env, credentials.json)
- Создает коммит с описанием изменений
- Пушит в GitHub

---

### Шаг 2: Деплой на сервер из GitHub

После того как код в GitHub, деплоим на сервер:

#### 🚀 Быстрый деплой (90% случаев)

**Когда использовать:**
- ✅ Обновили код приложения (фронтенд/бэкенд)
- ✅ Изменили React компоненты
- ✅ Обновили API routes
- ✅ Изменили стили CSS
- ✅ НЕ нужны миграции БД

```powershell
# Быстрый деплой - пересобирается только приложение
.\scripts\deploy-from-github.ps1 -AppOnly
```

**Преимущества:**
- ⚡ Быстро (~2-3 минуты)
- 🔒 База данных продолжает работать
- 💾 Нет простоя базы данных

**Что происходит:**
1. Обновляется код через git pull
2. Останавливаются контейнеры `site` и `admin`
3. Пересобираются контейнеры `site` и `admin`
4. Запускаются обновленные контейнеры `site` и `admin`
5. База данных `postgres` работает без остановки

---

#### 🔄 Полный деплой (редко)

**Когда использовать:**
- ⚠️ Первый деплой на новый сервер
- ⚠️ Добавили миграции БД
- ⚠️ Изменилась структура БД
- ⚠️ Обновилась версия PostgreSQL
- ⚠️ Изменился Dockerfile или docker-compose.yml

```powershell
# Полный деплой - пересобираются все контейнеры
.\scripts\deploy-from-github.ps1
```

**Что происходит:**
1. Создается бэкап базы данных
2. Обновляется код через git pull
3. Применяются миграции БД
4. Останавливаются ВСЕ контейнеры
5. Пересобираются ВСЕ контейнеры
6. Запускаются ВСЕ контейнеры

---

## 📝 Примеры использования

### Пример 1: Типичная разработка (обновление кода)

```powershell
# 1. Редактируете код локально
# 2. Коммитим и пушим в GitHub
.\scripts\commit-and-push.ps1 -Message "Добавил новый компонент галереи"

# 3. Деплоим на сервер
.\scripts\deploy-from-github.ps1 -AppOnly
```

**Время:** ~3-4 минуты от коммита до продакшена

---

### Пример 2: Добавление миграции БД

```powershell
# 1. Создали файл миграции в папке migrations/
# 2. Коммитим
.\scripts\commit-and-push.ps1 -Message "Добавил таблицу categories"

# 3. Полный деплой с применением миграций
.\scripts\deploy-from-github.ps1
```

---

### Пример 3: Первый деплой на новый сервер

```powershell
# 1. Инициализация (клонирование репозитория на сервер)
.\scripts\deploy-from-github.ps1 -Init

# 2. На сервере создайте .env файл
ssh root@your-server.com
cd /opt/fb-net
cp ENV_EXAMPLE.txt .env
nano .env  # заполните переменные

# 3. Полный деплой
.\scripts\deploy-from-github.ps1
```

---

## 🎯 Параметры deploy-from-github.ps1

| Параметр | Описание | Пример |
|----------|----------|--------|
| (без параметров) | Полный деплой всех контейнеров | `.\scripts\deploy-from-github.ps1` |
| `-SiteOnly` | Только контейнер `site` | `.\scripts\deploy-from-github.ps1 -SiteOnly` |
| `-AdminOnly` | Только контейнер `admin` | `.\scripts\deploy-from-github.ps1 -AdminOnly` |
| `-AppOnly` | Только приложение (БД не перезапускается) | `.\scripts\deploy-from-github.ps1 -AppOnly` |
| `-SkipBackup` | Деплой без бэкапа БД (быстрее) | `.\scripts\deploy-from-github.ps1 -SkipBackup` |
| `-SkipMigrations` | Пропустить SQL миграции | `.\scripts\deploy-from-github.ps1 -SkipMigrations` |
| `-Branch dev` | Деплой из другой ветки | `.\scripts\deploy-from-github.ps1 -Branch dev` |
| `-Init` | Первый запуск (клонирование репозитория) | `.\scripts\deploy-from-github.ps1 -Init` |

---

## ⚙️ Дополнительные скрипты

### Ручной бэкап базы данных

```powershell
.\scripts\backup-database.ps1
```

### Восстановление из бэкапа

```bash
# Подключитесь к серверу
ssh root@your-server.com

# Восстановите бэкап
cd /opt/fb-net
cat backups/db_backup_20260204_120000.sql | docker compose -f docker-compose.ssl.yml exec -T postgres psql -U postgres -d postgres
```

---

## ⏱️ Сравнение времени деплоя

| Команда | Время | БД | Когда |
|---------|-------|----|-------|
| `deploy-from-github.ps1 -AppOnly` | ~2-3 мин | ✅ Работает | Обновление кода |
| `deploy-from-github.ps1` | ~5-7 мин | ⚠️ Перезапускается | Миграции, первый деплой |
| `deploy-from-github.ps1 -SkipBackup` | ~4-5 мин | ⚠️ Перезапускается | Без бэкапа |

---

## 🔧 Troubleshooting

### Проверка логов после деплоя

```bash
# Подключитесь к серверу
ssh root@your-server.com

# Посмотрите логи приложения
cd /opt/fb-net
docker compose -f docker-compose.ssl.yml logs site --tail=50

# Статус контейнеров
docker compose -f docker-compose.ssl.yml ps
```

### Если приложение не запускается

```bash
# Перезапустите только приложение
docker compose -f docker-compose.ssl.yml restart site admin

# Или полный перезапуск
docker compose -f docker-compose.ssl.yml down
docker compose -f docker-compose.ssl.yml up -d
```

### Если база данных не отвечает

```bash
# Перезапустите только БД
docker compose -f docker-compose.ssl.yml restart postgres

# Проверьте логи БД
docker compose -f docker-compose.ssl.yml logs postgres --tail=50
```

---

## ✅ Best Practices

1. **Для ежедневной разработки** - используйте `-AppOnly`
2. **Перед полным деплоем** - бэкап создается автоматически
3. **После миграций** - используйте полный деплой без `-AppOnly`
4. **Проверяйте логи** - после каждого деплоя
5. **Используйте осмысленные коммиты** - передавайте параметр `-Message`

---

## 🚀 Быстрая шпаргалка

```powershell
# Типичный рабочий процесс:

# 1. Коммит и push
.\scripts\commit-and-push.ps1

# 2. Быстрый деплой
.\scripts\deploy-from-github.ps1 -AppOnly

# Готово! ✅
```

---

## 📞 Помощь

Если что-то не работает:
1. Проверьте логи контейнеров
2. Посмотрите раздел Troubleshooting выше
3. Попробуйте полный деплой без `-AppOnly`
4. Восстановите из бэкапа (они в папке backups/ на сервере)
