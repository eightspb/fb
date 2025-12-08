# Инструкция по запуску на VPS (Production)

## 1. Подготовка сервера

Убедитесь, что на сервере установлены Docker и Docker Compose.

```bash
# Обновите пакеты
sudo apt update && sudo apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавьте текущего пользователя в группу docker (чтобы не писать sudo каждый раз)
sudo usermod -aG docker $USER
newgrp docker
```

## 2. Копирование файлов

Скопируйте файлы проекта на сервер. Вы можете использовать `git clone` или `scp`.
Минимальный набор файлов, необходимых на сервере:
- `docker-compose.production.yml`
- `Dockerfile`
- `.env.production.example` (переименуйте в `.env`)
- Папка `supabase/` (нужна для конфигурации Kong)
- `supabase-schema.sql` (для инициализации БД)
- Весь исходный код (`src/`, `public/`, `package.json`, `next.config.ts`, `tsconfig.json` и т.д.) так как сборка происходит внутри Docker.

## 3. Настройка окружения

1. Создайте файл `.env` из примера:
   ```bash
   cp .env.production.example .env
   ```

2. **ОБЯЗАТЕЛЬНО** отредактируйте `.env`:
   ```bash
   nano .env
   ```
   
   Вам нужно:
   - Задать сложный `POSTGRES_PASSWORD`.
   - Задать сложный `JWT_SECRET` (минимум 32 символа).
   - Сгенерировать корректный `ANON_KEY`.
   
   **Как сгенерировать ANON_KEY:**
   Перейдите на [jwt.io](https://jwt.io/).
   - В поле **PAYLOAD** вставьте:
     ```json
     {
       "role": "anon",
       "iss": "supabase",
       "iat": 1710000000,
       "exp": 1990000000
     }
     ```
   - В поле **VERIFY SIGNATURE** вставьте ваш `JWT_SECRET` (который вы придумали выше).
   - Скопируйте получившийся токен слева. Это и есть ваш `ANON_KEY`.

## 4. Запуск

Запустите проект в фоновом режиме:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

## 5. Проверка

Посмотрите логи, чтобы убедиться, что всё запустилось:

```bash
docker compose -f docker-compose.production.yml logs -f
```

Сайт будет доступен по адресу `http://ВАШ_IP:3000`.
Supabase API (Kong) будет доступен по адресу `http://ВАШ_IP:8000`.

## 6. Миграции базы данных

При первом запуске база данных будет пустой. Скрипты инициализации должны отработать автоматически, но если что-то пошло не так:

### Если база уже существует (volume не пустой)

Если вы видите ошибки типа "could not look up local user" или "connection error", это значит, что пользователи Supabase не созданы или имеют неправильные пароли.

**Решение:** Удалите volume и пересоздайте БД:

```bash
# Остановите контейнеры
docker compose -f docker-compose.production.yml down

# Удалите volume с данными БД (ВНИМАНИЕ: это удалит все данные!)
docker volume rm fibroadenomanet_supabase-prod-db-data

# Запустите заново
docker compose -f docker-compose.production.yml up -d --build
```

Или создайте пользователей вручную:

```bash
# Подключитесь к БД
docker exec -it fb-net-db psql -U supabase_admin -d postgres

# В psql выполните:
CREATE ROLE supabase_auth_admin WITH LOGIN PASSWORD 'ваш_POSTGRES_PASSWORD';
CREATE ROLE authenticator WITH LOGIN PASSWORD 'ваш_POSTGRES_PASSWORD' NOINHERIT;
CREATE ROLE supabase_storage_admin WITH LOGIN PASSWORD 'ваш_POSTGRES_PASSWORD';
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
```

### Заливка структуры БД вручную

```bash
# Залить структуру БД
docker exec -i fb-net-db psql -U supabase_admin -d postgres < supabase-schema.sql

# Создать пользователей
docker exec -i fb-net-db psql -U supabase_admin -d postgres < scripts/create-supabase-users.sql

# Инициализировать Storage
docker exec -i fb-net-db psql -U supabase_admin -d postgres < scripts/init-storage.sql
```

## 7. Загрузка изображений

**ВАЖНО:** Папка `/public/images/trainings/` исключена из Git, поэтому изображения нужно скопировать на сервер вручную.

См. подробную инструкцию в файле `DEPLOY_IMAGES.md`.

Кратко:
```bash
# С вашего компьютера
scp -r public/images/trainings user@your-server:/opt/fb-net/public/images/
```

## 7. Полезные команды

```bash
# Остановить всё
docker compose -f docker-compose.production.yml down

# Перезапустить (с пересборкой)
docker compose -f docker-compose.production.yml up -d --build

# Посмотреть статус контейнеров
docker compose -f docker-compose.production.yml ps
```

