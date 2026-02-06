# Изменения в Docker Compose файлах

## ✅ Что было исправлено

Добавлен монтаж папки `migrations` во **все три** docker-compose файла:

### 1. docker-compose.yml (локальная разработка)
```yaml
volumes:
  - postgres-data:/var/lib/postgresql/data
  # Database schema initialization on first run
  - ./database-schema.sql:/docker-entrypoint-initdb.d/00-init-schema.sql:ro
  # Migrations folder for manual application
  - ./migrations:/migrations:ro
```

### 2. docker-compose.production.yml (продакшн без SSL)
```yaml
volumes:
  - postgres-prod-data:/var/lib/postgresql/data
  # Database schema initialization on first run (only for new installs)
  - ./database-schema.sql:/docker-entrypoint-initdb.d/00-init-schema.sql:ro
  # Migrations folder for manual application
  - ./migrations:/migrations:ro
```

### 3. docker-compose.ssl.yml (продакшн с SSL)
```yaml
volumes:
  - postgres-prod-data:/var/lib/postgresql/data
  - ./database-schema.sql:/docker-entrypoint-initdb.d/00-init-schema.sql:ro
  # Migrations folder for manual application
  - ./migrations:/migrations:ro
```

## 🎯 Зачем это нужно

1. **Скрипт деплоя** (`deploy-from-github.ps1`) использует функцию `Invoke-Migrations`, которая:
   - Ищет SQL файлы в папке `migrations/` на хосте
   - Копирует их в контейнер БД
   - Применяет через `psql`

2. **Монтаж папки** позволяет:
   - Скрипту `apply-migrations.sh` читать файлы миграций напрямую из контейнера
   - Применять миграции без копирования файлов
   - Видеть все миграции внутри контейнера БД

## 🔍 Как это работает

### Автоматическое применение (через скрипт деплоя)

```powershell
# Скрипт деплоя автоматически применяет миграции
.\scripts\deploy-from-github.ps1
```

Функция `Invoke-Migrations` в скрипте:
1. Проверяет наличие таблицы `schema_migrations`
2. Находит все файлы `migrations/*.sql`
3. Для каждой миграции проверяет, применена ли она
4. Применяет только новые миграции
5. Записывает имя миграции в `schema_migrations`

### Ручное применение (если нужно)

```bash
# На сервере
cd /opt/fb-net
docker compose -f docker-compose.production.yml exec postgres psql -U postgres -d postgres -f /migrations/004_add_videos_to_conferences.sql
```

Или через скрипт:
```bash
bash scripts/apply-migrations.sh
```

## ✅ Проверка

Убедитесь, что папка `migrations` монтируется в контейнер:

```bash
# Локально
docker compose exec postgres ls -la /migrations

# На сервере
docker compose -f docker-compose.production.yml exec postgres ls -la /migrations
```

Вы должны увидеть список SQL файлов миграций.

## 📝 Важно

- **Все три файла обновлены** - локальный, продакшн и SSL версии
- **Монтаж read-only** (`:ro`) - контейнер не может изменять файлы миграций
- **Автоматическое применение** - скрипт деплоя применяет миграции автоматически
- **Отслеживание** - таблица `schema_migrations` хранит список применённых миграций

## 🚀 Готово к деплою

Теперь при деплое:
1. Код обновится через `git pull`
2. Миграции автоматически применятся (функция `Invoke-Migrations`)
3. Контейнеры пересоберутся
4. Всё заработает! ✨
