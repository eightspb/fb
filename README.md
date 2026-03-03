# Компания Зенит - Официальный сайт ООО «ЗЕНИТ»

Официальный сайт единственного дистрибьютора оборудования Xishan для вакуумной аспирационной биопсии (ВАБ) молочной железы в Российской Федерации.

## 🎯 Возможности

- **Каталог оборудования** - информация об устройствах Xishan DK-B-MS
- **Обучение и сертификация** - курсы повышения квалификации для врачей
- **Новости и события** - конференции и мероприятия
- **Референс-центры** - интерактивная карта клиник с оборудованием
- **Админ-панель** - управление контентом через веб-интерфейс
- **Telegram бот** - автоматическое создание новостей
- **Аналитика** - отслеживание посещений и активности

---

## ⚡ Быстрый старт

### 🚀 Деплой на сервер

```powershell
# На вашем компьютере
.\scripts\deploy-from-github.ps1 -AppOnly
```

**Готово!** Скрипт автоматически обновит код, установит зависимости, настроит Telegram webhook и перезапустит приложение.

📖 Подробнее: [QUICK_START.md](QUICK_START.md) | [AUTOMATION_GUIDE.md](AUTOMATION_GUIDE.md)

---

## 🚀 Локальная разработка

### Установка зависимостей

```bash
bun install
```

### Настройка окружения

Создайте `.env.local` в корне проекта:

```env
# База данных
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Аутентификация админа
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Опционально: Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_chat_id

# Опционально: Email
SMTP_HOST=smtp.mail.ru
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASSWORD=your_password
TARGET_EMAIL=target_email@domain.com

# Опционально: Яндекс.Директ автоброкер
YANDEX_DIRECT_TOKEN=your_yandex_direct_oauth_token
# Для агентских аккаунтов (опционально)
YANDEX_DIRECT_CLIENT_LOGIN=direct-client-login
# Язык ответов API (опционально, по умолчанию ru)
YANDEX_DIRECT_LOCALE=ru
```

### Вариант 1: Локальная база данных (пустая, для тестирования)

```bash
# Запустить локальный PostgreSQL
bun run docker:up

# Запустить Next.js dev сервер
bun run dev
```

Сайт будет доступен по адресу: **http://localhost:3000**

### Вариант 2: Удалённая база данных (продакшн данные)

Для разработки фронтенда с реальными данными из продакшн базы:

```powershell
# Windows (PowerShell) - рекомендуется
.\scripts\dev-remote.ps1

# Или через npm скрипт
bun run dev:remote
```

**Что происходит:**
1. Автоматически создаётся SSH туннель к базе на сервере
2. Запускается Next.js dev сервер
3. Локальный фронтенд работает с продакшн данными
4. При Ctrl+C туннель закрывается автоматически

**Преимущества:**
- ✅ Работаете с реальными данными из продакшн базы
- ✅ Не нужно каждый раз деплоить для проверки изменений
- ✅ База данных остаётся защищённой (через SSH туннель)
- ✅ Продакшн приложение работает без изменений

📖 Подробнее: [REMOTE_DB_SETUP.md](./REMOTE_DB_SETUP.md)

---

## 💻 Технологии

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Radix UI (shadcn/ui)
- Framer Motion

### Backend & Database
- PostgreSQL
- JWT аутентификация
- Next.js API Routes

### Интеграции
- Telegram Bot API
- Nodemailer (SMTP)
- OpenRouter AI

### Тестирование & CI/CD
- **Vitest** - Unit тесты
- **Playwright** - E2E тесты
- **MSW** - Mock Service Worker для моков API
- **Testcontainers** - Docker контейнеры для тестов
- **GitHub Actions** - CI/CD pipeline
- **Docker** - Контейнеризация и деплой

---

## 📁 Структура проекта

```
fb.net/
├── src/
│   ├── app/                    # Next.js страницы и API
│   │   ├── admin/             # Админ-панель
│   │   ├── api/               # API endpoints
│   │   └── ...                # Публичные страницы
│   ├── components/            # React компоненты
│   │   ├── ui/               # UI компоненты (shadcn/ui)
│   │   └── admin/            # Компоненты админ-панели
│   ├── lib/                   # Утилиты и бизнес-логика
│   └── styles/                # Стили
├── tests/                     # Тесты
│   ├── unit/                  # Unit тесты (Vitest)
│   │   ├── components.test.tsx
│   │   ├── api.test.ts
│   │   └── services.test.ts
│   ├── e2e/                   # E2E тесты (Playwright)
│   │   ├── auth.spec.ts
│   │   ├── forms.spec.ts
│   │   └── database.spec.ts
│   ├── fixtures/              # MSW handlers для моков
│   ├── helpers/               # Вспомогательные функции
│   └── setup.ts               # Глобальная настройка тестов
├── .github/workflows/         # GitHub Actions
│   ├── ci.yml                 # CI pipeline
│   └── deploy.yml             # Deploy pipeline
├── scripts/                   # PowerShell скрипты
│   ├── commit-and-push.ps1   # Коммит и push в GitHub
│   ├── deploy-from-github.ps1 # Деплой с GitHub
│   └── backup-database.ps1    # Бэкап БД
├── public/                    # Статические файлы
├── Dockerfile                 # Production Dockerfile
├── Dockerfile.test            # Test Dockerfile
├── docker-compose.yml         # Development
├── docker-compose.test.yml    # Testing
├── docker-compose.production.yml # Production
├── vitest.config.ts           # Vitest конфигурация
└── playwright.config.ts       # Playwright конфигурация
```

---

## 🔧 Команды разработки

### С Bun
```bash
bun run dev              # Запуск dev сервера
bun run build            # Сборка для продакшна
bun run start            # Запуск продакшн сервера
bun run lint             # Проверка кода
bun run direct:bidder    # Однократный запуск автоброкера Яндекс.Директ
```

### Docker команды
```bash
bun run docker:up        # Запустить PostgreSQL
bun run docker:down      # Остановить контейнеры
bun run docker:logs      # Просмотр логов
bun run docker:psql      # Подключиться к PostgreSQL
bun run docker:test      # Запустить тесты в Docker
bun run docker:test:down # Остановить тестовые контейнеры
```

### Тестирование
```bash
# Unit тесты (Vitest)
bun run test:unit              # Запустить unit тесты
bun run test:unit:watch        # Запустить в watch режиме
bun run test:unit:coverage     # С coverage отчетом

# E2E тесты (Playwright)
bun run test:e2e               # Запустить E2E тесты
bun run test:e2e:ui            # Запустить с UI
bun run test:e2e:debug         # Запустить в debug режиме

# Полный CI локально
bun run test:ci                # Линт + типы + unit + E2E

# Тесты в Docker (с Testcontainers)
bun run docker:test            # Запустить все тесты в изолированном окружении
```

---

## 🧪 Тестирование

Проект включает полную систему тестирования:

### Unit тесты (Vitest)
- **Компоненты**: React компоненты с Radix UI и Framer Motion
- **API Routes**: Next.js API endpoints с моками
- **Сервисы**: Telegram Bot, OpenRouter AI, Email с MSW моками
- **Утилиты**: Вспомогательные функции

### E2E тесты (Playwright)
- **Авторизация**: JWT логин/логаут flow
- **Формы**: Отправка форм с интеграциями
- **База данных**: Тесты с Testcontainers (реальная PostgreSQL)

### CI/CD Pipeline (GitHub Actions)
- **Линтинг**: ESLint + TypeScript проверка
- **Unit тесты**: С coverage отчетом
- **Build**: Проверка сборки Next.js
- **Docker**: Build и security scan
- **E2E**: Тесты с PostgreSQL в services
- **Deploy**: Автоматический деплой на VPS с rollback

### Запуск тестов локально

```bash
# Все тесты
bun run test:ci

# Только unit тесты
bun run test:unit

# Только E2E тесты (требуется запущенное приложение)
bun run test:e2e

# Тесты в Docker (изолированное окружение)
bun run docker:test
```

**Подробнее:** См. [docs/tests.md](./docs/tests.md)

---

## 🤖 Автоброкер Яндекс.Директ

После добавления кампаний в `/admin/direct` скрипт можно запускать по расписанию.

### Вариант 1: Cron на хосте

```bash
*/5 * * * * cd /path/to/fb.net && /usr/local/bin/bun run direct:bidder >> /var/log/fb-net-direct-bidder.log 2>&1
```

### Вариант 2: Отдельный процесс в Docker

Добавьте отдельный сервис в `docker-compose.production.yml`, который запускает цикл:

```bash
while true; do bun run direct:bidder; sleep 300; done
```

Рекомендуемый интервал: каждые 5 минут (`300` секунд). Для обоих вариантов убедитесь, что в окружении процесса доступны `DATABASE_URL` и `YANDEX_DIRECT_TOKEN`.

---

## 🚀 Деплой на продакшен

### Автоматический деплой через GitHub Actions

При push в `main` ветку автоматически запускается:
1. ✅ Линтинг и проверка типов
2. ✅ Unit тесты
3. ✅ Build приложения
4. ✅ Docker build и security scan
5. ✅ E2E тесты
6. ✅ Deploy на VPS с health check и rollback

### Ручной деплой

```powershell
# 1. Коммит и push в GitHub
.\scripts\commit-and-push.ps1 -Message "Описание изменений"

# 2. Быстрый деплой (только приложение, БД работает)
.\scripts\deploy-from-github.ps1 -AppOnly
```

**Время:** ~2-3 минуты от коммита до продакшена ⚡

### Применение миграций:

```bash
# Новая миграция: информационный баннер
ssh root@155.212.217.60 "docker exec fb-net-db psql -U postgres -d postgres" < migrations/007_add_site_banner.sql
```

### Полный деплой (с миграциями БД):

```powershell
# Когда нужны миграции БД или первый деплой
.\scripts\deploy-from-github.ps1
```

**Подробнее:** См. [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)

---

## 📄 Страницы сайта

- `/` - Главная страница
- `/patients` - Информация для пациентов
- `/equipment` - Оборудование
- `/training` - Обучение
- `/reports` - Референс-центры и карта
- `/news` - Новости
- `/conferences` - Конференции
- `/contacts` - Контакты и форма обратной связи
- `/admin` - Админ-панель

---

## 📚 Документация

### ⚡ Быстрый старт
- **[QUICK_START.md](./QUICK_START.md)** - ⚡ Самое важное за 1 минуту
- **[AUTOMATION_GUIDE.md](./AUTOMATION_GUIDE.md)** - 🤖 Руководство по автоматизации

### 📖 Основная документация
- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - 📑 Полная навигация по документации
- **[DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)** - 🚀 Полное руководство по деплою
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - 💻 Документация для разработчиков
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - 🔧 Решение проблем

### 🤖 Telegram бот
- **[TELEGRAM_FIX_QUICK.md](./TELEGRAM_FIX_QUICK.md)** - ⚡ Быстрое решение проблем
- **[TELEGRAM_DEBUG.md](./TELEGRAM_DEBUG.md)** - 🐛 Полная диагностика
- **[TELEGRAM_SERVER_COMMANDS.txt](./TELEGRAM_SERVER_COMMANDS.txt)** - 📋 Готовые команды

### 🛠️ Дополнительно
- **[ANALYTICS_SETUP.md](./ANALYTICS_SETUP.md)** - 📊 Настройка аналитики
- **[SMTP_SETUP.md](./SMTP_SETUP.md)** - 📧 Настройка отправки почты
- **[SSL_QUICKSTART.md](./SSL_QUICKSTART.md)** - 🔐 Быстрая настройка SSL
- **[scripts/README.md](./scripts/README.md)** - 📜 Справка по скриптам

---

## 🔐 Безопасность

- JWT токены хранятся в httpOnly cookies
- CSRF защита через токены
- Валидация и санитизация всех входящих данных
- Изображения хранятся в базе данных (не на файловой системе)
- Защита от SQL injection через параметризованные запросы

---

## 📊 База данных

### Основные таблицы:
- `news` - новости и статьи
- `news_images` - изображения (BYTEA)
- `conferences` - конференции
- `form_submissions` - заявки с форм
- `site_banner` - информационный баннер
- `analytics_*` - таблицы аналитики

### Подключение к БД:

```bash
# Локально
bun run docker:psql

# На сервере
docker exec -it fb-net-db psql -U postgres -d postgres
```

---

## 🛠️ Бэкапы базы данных

```powershell
# Создать бэкап
.\scripts\backup-database.ps1

# Бэкапы автоматически создаются при деплое
# Хранятся на сервере в /opt/fb-net/backups/
```

---

## 🤝 Контакты

- **Email**: info@zenitmed.ru
- **Сайт**: https://fibroadenoma.net
- **Компания**: ООО «ЗЕНИТ»

---

## 📝 Лицензия

Все права защищены © 2025 ООО «ЗЕНИТ»
