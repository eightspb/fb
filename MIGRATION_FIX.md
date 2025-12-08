# Исправление ошибки миграции: TypeError: fetch failed

## 🔴 Проблема

При выполнении `npm run migrate:news` возникает ошибка:
```
TypeError: fetch failed
```

**Причина:** Скрипт `migrate-news-to-supabase.ts` использует Supabase JS клиент, которому нужен HTTP API endpoint. Но в `docker-compose.simple.yml` используется только PostgreSQL без Supabase API Gateway.

## ✅ Решение

Создан новый скрипт `migrate-news-to-postgres.ts`, который подключается напрямую к PostgreSQL.

### Шаг 1: Установка зависимостей

```powershell
npm install pg
npm install --save-dev @types/pg
```

### Шаг 2: Настройка переменных окружения

Убедитесь, что в `.env.local` есть `DATABASE_URL`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

Или для Docker контейнера:
```env
DATABASE_URL=postgresql://postgres:postgres@supabase:5432/postgres
```

### Шаг 3: Запуск миграции

```powershell
npm run migrate:news:postgres
```

## 📋 Доступные команды миграции

- `npm run migrate:news` - Использует Supabase JS клиент (нужен полный стек Supabase)
- `npm run migrate:news:postgres` - Прямое подключение к PostgreSQL (работает с docker-compose.simple.yml)

## 🔍 Проверка

После миграции проверьте данные:

```powershell
npm run docker:psql
```

Затем в psql:
```sql
SELECT COUNT(*) FROM news;
SELECT * FROM news LIMIT 5;
SELECT COUNT(*) FROM news_images;
SELECT COUNT(*) FROM news_tags;
```

## 💡 Варианты подключения

### Вариант 1: Docker Compose (текущий)
Используйте `npm run migrate:news:postgres` с:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### Вариант 2: Supabase CLI
Используйте `npm run migrate:news` с переменными из `supabase start`

### Вариант 3: Облачный Supabase
Используйте `npm run migrate:news` с переменными из Supabase Dashboard


