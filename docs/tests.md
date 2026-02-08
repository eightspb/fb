<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# в виде единого md файла пришли весь промт

```markdown
# 🚀 Полная система тестирования + Docker CI/CD для Next.js 15 проекта

## Контекст проекта
Создай полную систему тестирования и CI/CD для production-ready приложения:

**Стек:**
```

Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Radix UI (shadcn/ui), Framer Motion
Backend: Next.js API Routes + PostgreSQL (Prisma)
Auth: JWT
Интеграции: Telegram Bot API, Nodemailer (SMTP), OpenRouter AI

```

## 🎯 Требования к результату

### 1. Структура файлов (создай все файлы в проекте)
```

├── tests/
│   ├── unit/
│   │   ├── components.test.ts
│   │   ├── api.test.ts
│   │   └── services.test.ts
│   ├── e2e/
│   │   ├── auth.spec.ts
│   │   ├── telegram.spec.ts
│   │   └── ai-chat.spec.ts
│   └── fixtures/
│       └── handlers.ts
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.test
│   ├── docker-compose.test.yml
│   └── docker-compose.prod.yml
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── vitest.config.ts
├── playwright.config.ts
├── next.config.mjs
├── prisma/
│   └── schema.prisma
├── package.json
└── README.md

```

### 2. Unit Testing (Vitest + MSW + Testing Library)
**Требуемые тесты:**
```

✅ React компоненты: Radix UI Dialog + Framer Motion анимации
✅ Server Actions: Prisma CRUD + JWT middleware
✅ Services:

- Telegram Bot API (mock webhook)
- OpenRouter AI (mock streaming response)
- Nodemailer (mock transporter)
✅ Utils: JWT token generation/validation

```

### 3. E2E Testing (Playwright)
**Критические сценарии:**
```

1. User flow: Register → Login → Dashboard (JWT)
2. Telegram integration: Form → Bot message → Email notification
3. AI Chat: User message → OpenRouter stream → Render response
4. Error handling: Invalid JWT → 401 redirect
```

### 4. Docker CI/CD Pipeline

**`.github/workflows/ci.yml`:**
```

1. Checkout + Setup Node 20
2. Cache: node_modules + .next
3. Install deps + prisma generate
4. Lint (ESLint) + TypeScript check
5. Unit tests (Vitest) → coverage > 80%
6. Build (next build)
7. docker-compose.test.yml up → E2E tests
8. Security: bun pm audit + Snyk
```

**`.github/workflows/deploy.yml`:**
```

1. Build multi-stage Docker image
2. Push to ghcr.io
3. SSH на VPS → docker-compose.prod.yml pull + up -d
```

### 5. Docker конфигурация

**Dockerfile (multi-stage):**
```


# Build stage: Node 20

# Runtime: Node 20-alpine + Prisma layer

# Healthcheck: PostgreSQL connection

```

**docker-compose.test.yml:**
```

services:
app: build: ./docker/Dockerfile.test
postgres: image: postgres:16
redis: image: redis:7-alpine

```

**docker-compose.prod.yml:**
```

services:
app: build: ./docker/Dockerfile
postgres: volumes: ./data/postgres
redis: volumes: ./data/redis
nginx: reverse proxy + SSL

```

### 6. Environment & Security

**`.env.test`:**
```

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test
JWT_SECRET=test-jwt-secret
TELEGRAM_BOT_TOKEN=mock_token
OPENROUTER_API_KEY=mock_key
NODEMAILER_FROM=test@example.com

```

**MSW handlers для:**
- Telegram Bot API (webhook responses)
- OpenRouter (chat completions stream)
- SMTP (mock delivery)

## 📋 Технические детали

**Prisma:**
```

- Seed script для тестовых данных
- Migration tests
- Transaction isolation в тестах

```

**Coverage targets:**
```

Unit: 80%+ statements/branches
E2E: 100% critical user paths

```

**Playwright features:**
```

- Headless + video recording (CI)
- Network interception (MSW)
- Trace viewer для debug

```

## 🎨 Формат ответа для Cursor

**Создай ВСЕ файлы сразу:**

1. **package.json** — полный список devDependencies
2. **vitest.config.ts** + **playwright.config.ts**
3. **Dockerfiles** + **docker-compose.yml** файлы
4. **.github/workflows/ci.yml** + **deploy.yml**
5. **tests/unit/** — 5+ примеров тестов
6. **tests/e2e/** — 3+ сценария
7. **tests/fixtures/handlers.ts** (MSW)
8. **prisma/schema.prisma** (минимальная схема)
9. **README.md** с командами запуска

**Каждый файл в отдельном markdown блоке с комментариями!**

**Начни с package.json → установи зависимости → запусти тесты → deploy!**

---

## 🚀 Быстрый старт команды
```bash
bun install
bun run db:generate
bun run test:unit
bun run test:e2e
docker-compose -f docker-compose.test.yml up --build
bun run ci # полный CI локально
```

```

***

**Скопируй весь этот Markdown в Cursor (Ctrl+V)** — получишь готовый production проект с тестами за 30 секунд! 🎯```

