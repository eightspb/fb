# Компания Зенит — fibroadenoma.net

Корпоративный сайт и CRM-система ООО «ЗЕНИТ» — дистрибьютора медицинского оборудования Xishan для вакуумной аспирационной биопсии (ВАБ) молочной железы.

**Домен:** [fibroadenoma.net](https://fibroadenoma.net)

## Возможности

### Публичный сайт
- Информация об оборудовании, обучении, пациентам
- Каталог новостей и статей с фильтрацией по категориям
- Расписание конференций с онлайн-регистрацией
- Формы обратной связи и запроса коммерческого предложения
- SEO-оптимизация, адаптивная вёрстка

### Админ-панель (`/admin`)
- **CRM-контакты** — база ~2000 лидов с поиском, фильтрацией, тегами и статусами
- **AI-исследование контактов** — быстрый и глубокий анализ через OpenRouter
- **Семантический поиск** — векторные эмбеддинги (pgvector) по заметкам контактов
- **AI-ассистент** — чат с NL→SQL, потоковые ответы (Polza.ai / GPT-5.4)
- **Управление контентом** — новости, конференции, баннер сайта
- **Email** — синхронизация почтового ящика через IMAP, отправка писем, шаблоны
- **Яндекс.Директ** — автобиддер для рекламных кампаний
- **Аналитика** — сессии посетителей, геолокация, UTM-метки, устройства
- **Заявки** — обработка форм (обратная связь, КП, обучение, регистрация на конференцию)
- **Логирование** — журнал событий приложения

## Технологический стек

| Слой | Технологии |
|------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Shadcn/UI, Framer Motion |
| **Backend** | Next.js API Routes (App Router), Bun |
| **БД** | PostgreSQL 15 + pgvector |
| **Аутентификация** | JWT (HttpOnly cookies) + CSRF-защита |
| **Email** | Nodemailer (SMTP), imapflow (IMAP-синхронизация) |
| **Уведомления** | Telegram Bot API |
| **AI** | OpenRouter API, Polza.ai, text-embedding-3-small |
| **Rate Limiting** | Upstash Redis |
| **Карты** | Yandex Maps |
| **Тесты** | Vitest, Playwright, TestContainers |
| **CI/CD** | GitHub Actions, Docker Compose |

## Архитектура

Проект использует **мульти-зонную архитектуру** из двух Next.js-приложений:

```
                    ┌─────────────┐
                    │    Nginx    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
     ┌────────────────┐       ┌────────────────┐
     │   site (:3000) │       │  admin (:3001) │
     │                │       │                │
     │  Публичный сайт│       │  UI админки    │
     │  + весь API    │       │  (только UI)   │
     └────────────────┘       └────────────────┘
              │
              ▼
     ┌────────────────┐
     │  PostgreSQL 15 │
     │  + pgvector    │
     └────────────────┘
```

| Контейнер | Порт | Назначение |
|-----------|------|------------|
| `site` | 3000 | Публичный сайт + весь backend/API (`/api/*`, включая `/api/admin/*`) |
| `admin` | 3001 | UI панели управления (`/admin/*`) |

API-запросы (`/api/admin/*`) обрабатывает контейнер `site`. Контейнер `admin` — только UI, деплоится независимо.

## Быстрый старт

### Требования

- [Bun](https://bun.sh/) (рантайм и пакетный менеджер)
- PostgreSQL 15 (или Docker)
- Node.js 20+ (для совместимости)

### Установка

```bash
# Клонировать репозиторий
git clone <repo-url>
cd fb

# Установить зависимости
bun install
```

### Настройка окружения

Создайте `.env.local` в корне проекта:

```env
# Обязательные
DATABASE_URL=postgresql://postgres:password@localhost:54321/postgres
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Опциональные
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ADMIN_CHAT_ID=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...
OPENROUTER_API_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
YANDEX_GEOCODER_API_KEY=...
```

### Запуск

```bash
# Рекомендуемый способ: SSH-туннель к удалённой БД + оба приложения
bun run dev:remote

# Или по отдельности
bun run dev:site      # site на :3000
bun run dev:admin     # admin на :3001

# Или с локальной БД через Docker
bun run docker:up     # поднять PostgreSQL
bun run dev           # запустить site
```

Открыть:
- Сайт: http://localhost:3000
- Админка: http://localhost:3001/admin

## Основные команды

```bash
# Разработка
bun run dev:remote        # локальная разработка (рекомендуется)
bun run dev:site          # только site на :3000
bun run dev:admin         # только admin на :3001

# Сборка
bun run build             # сборка site
bun run build:admin       # сборка admin

# Проверки
bun run lint              # ESLint
bun run type-check        # TypeScript
bun run type-check:admin  # TypeScript (admin)

# Тесты
bun run test:unit         # unit-тесты (Vitest)
bun run test:e2e          # E2E-тесты (Playwright)
bun run test:ci           # полный CI-прогон

# Docker
bun run docker:up         # локальная БД
bun run docker:down       # остановить БД
bun run docker:prod       # production-сборка
```

## Деплой

Деплой запускается с локальной машины через PowerShell-скрипты:

```powershell
.\scripts\deploy-from-github.ps1 -AppOnly    # site + admin (90% случаев)
.\scripts\deploy-from-github.ps1              # полный деплой с миграциями БД
.\scripts\deploy-from-github.ps1 -SiteOnly   # только site
.\scripts\deploy-from-github.ps1 -AdminOnly  # только admin
```

Продакшен-сервер: `155.212.217.60` (Docker Compose + Nginx).

## Структура проекта

```
fb/
├── src/
│   ├── app/                    # Next.js site (App Router)
│   │   ├── api/                # Backend API
│   │   │   ├── admin/          # Админские эндпоинты
│   │   │   ├── news/           # Публичные API новостей
│   │   │   ├── conferences/    # API конференций
│   │   │   └── ...
│   │   ├── news/               # Страницы новостей
│   │   ├── conferences/        # Страницы конференций
│   │   ├── equipment/          # Оборудование
│   │   ├── training/           # Обучение
│   │   └── ...
│   ├── components/
│   │   ├── ui/                 # Shadcn/UI компоненты
│   │   ├── admin/              # Компоненты админки
│   │   └── ...
│   ├── lib/                    # Утилиты и бизнес-логика
│   └── styles/
├── apps/
│   └── admin/                  # Отдельное Next.js-приложение админки
│       ├── src/app/            # Страницы админки
│       ├── src/components/     # UI-компоненты админки
│       └── middleware.ts       # Auth guard
├── migrations/                 # SQL-миграции БД
├── scripts/                    # Скрипты деплоя
├── tests/                      # E2E-тесты (Playwright)
├── docs/                       # Документация
├── database-schema.sql         # Полная схема PostgreSQL
├── docker-compose.yml          # Локальная разработка
├── docker-compose.production.yml # Продакшен
└── Dockerfile                  # Docker-образ
```

## База данных

PostgreSQL 15 с расширением pgvector. Основные таблицы:

- **news**, **news_images**, **news_tags** — статьи и новости
- **conferences** — конференции и мастер-классы
- **contacts**, **contact_notes**, **contact_embeddings** — CRM
- **crm_emails**, **crm_email_attachments** — синхронизация почты
- **form_submissions** — заявки с форм
- **visitor_sessions**, **page_visits** — аналитика
- **email_templates** — шаблоны уведомлений
- **direct_campaigns**, **direct_logs** — Яндекс.Директ
- **app_logs** — логирование событий

Миграции хранятся в `migrations/` и применяются при деплое.

## API

### Публичные эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/news` | Список новостей |
| GET | `/api/news/[id]` | Новость по ID |
| GET | `/api/conferences` | Список конференций |
| POST | `/api/conferences/register` | Регистрация на конференцию |
| POST | `/api/contact` | Форма обратной связи |
| POST | `/api/request-cp` | Запрос КП |
| GET | `/api/banner` | Данные баннера |
| GET | `/api/images/[id]` | Изображение из БД |

### Админские эндпоинты (`/api/admin/*`)

Все не-GET запросы требуют заголовок `x-csrf-token`.

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/admin/auth` | Авторизация |
| GET/PUT | `/api/admin/contacts/[id]` | Управление контактом |
| POST | `/api/admin/contacts/[id]/research` | AI-исследование |
| POST | `/api/admin/contacts/semantic-search` | Векторный поиск |
| POST | `/api/admin/emails/send` | Отправка письма |
| POST | `/api/admin/emails/sync` | Синхронизация IMAP |
| POST | `/api/admin/ai/improve` | Улучшение текста AI |
| POST | `/api/admin/ai-assistant` | AI-ассистент |

## Документация

- [Деплой](docs/DEPLOY_GUIDE.md)
- [Разработка](docs/DEVELOPMENT.md)
- [Быстрый старт](docs/QUICK_START.md)
- [Удалённая БД для dev](docs/REMOTE_DB_SETUP.md)
- [Тестирование](docs/TESTING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [SSL](docs/SSL_QUICKSTART.md)
- [SMTP](docs/SMTP_SETUP.md)
- [Аналитика](docs/ANALYTICS_SETUP.md)
- [Логирование](docs/LOGGING.md)
- [Telegram debug](docs/TELEGRAM_DEBUG.md)
- [Скрипты](scripts/README.md)

## Контакты

- **Email:** info@zenitmed.ru
- **Сайт:** [fibroadenoma.net](https://fibroadenoma.net)
