# Устранение проблем при запуске

## Проблема 1: Supabase CLI не установлен

**Ошибка:** `'supabase' is not recognized as an internal or external command`

### Решение:

**Вариант A: Установить Supabase CLI (Windows)**

```powershell
# Через npm (если Node.js установлен)
npm install -g supabase

# Или через Scoop (если установлен)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Или через Chocolatey (если установлен)
choco install supabase
```

**Вариант B: Использовать Docker вместо CLI**

```bash
npm run docker:up
```

**Вариант C: Использовать облачный Supabase**

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте ключи в `.env.local`
3. Выполните SQL схему вручную

---

## Проблема 2: Docker Desktop не запущен

**Ошибка:** `unable to get image ... error during connect: ... dockerDesktopLinuxEngine: The system cannot find the file specified`

### Решение:

1. **Запустите Docker Desktop**
   - Найдите "Docker Desktop" в меню Пуск
   - Запустите приложение
   - Дождитесь полной загрузки (иконка в трее должна быть зеленой)

2. **Проверьте статус Docker**
   ```powershell
   docker ps
   ```
   Должна быть пустая таблица (или список контейнеров), но не ошибка

3. **Если Docker Desktop не установлен:**
   - Скачайте с [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
   - Установите и перезагрузите компьютер
   - Запустите Docker Desktop

4. **Если Docker Desktop установлен, но не запускается:**
   - Проверьте службы Windows: `services.msc`
   - Найдите "Docker Desktop Service" и запустите
   - Или переустановите Docker Desktop

---

## Проблема 3: Предупреждение о версии в docker-compose.yml

**Предупреждение:** `the attribute 'version' is obsolete`

### Решение:

Атрибут `version` уже удален из `docker-compose.simple.yml`. Если видите предупреждение, убедитесь, что используете обновленный файл.

---

## Рекомендуемый порядок действий

### Вариант 1: Использовать Docker (если установлен)

```powershell
# 1. Убедитесь, что Docker Desktop запущен
docker ps

# 2. Запустите контейнеры
npm run docker:up

# 3. Инициализируйте базу данных
npm run docker:init-db

# 4. Запустите полную настройку
npm run setup
```

### Вариант 2: Использовать Supabase CLI

```powershell
# 1. Установите Supabase CLI
npm install -g supabase

# 2. Инициализируйте и запустите
npm run setup:supabase

# 3. Скопируйте переменные из вывода в .env.local

# 4. Запустите полную настройку
npm run setup
```

### Вариант 3: Использовать облачный Supabase (без локальной установки)

1. Создайте проект на [supabase.com](https://supabase.com)
2. Выполните SQL из `supabase-schema.sql` в SQL Editor
3. Создайте `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Запустите:
   ```powershell
   npm run migrate:news
   npm run create:news-from-folders
   ```

---

## Проверка работоспособности

После успешного запуска проверьте:

```powershell
# Проверить контейнеры Docker
docker ps

# Должны быть запущены:
# - fb-net-supabase-db (PostgreSQL)
# - fb-net-nextjs (Next.js приложение)

# Проверить логи
docker logs fb-net-supabase-db
docker logs fb-net-nextjs

# Запустить приложение (если не запускается автоматически)
npm run dev
```

---

## Альтернатива: Работа без базы данных

Если у вас проблемы с Docker/Supabase, приложение будет работать со статическими данными из `news-data.ts` (fallback режим).

Просто запустите:
```powershell
npm run dev
```

Приложение автоматически определит отсутствие базы данных и будет использовать статические данные.


