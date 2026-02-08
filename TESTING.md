# 🧪 Руководство по тестированию

Полная документация по системе тестирования проекта.

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Unit тесты](#unit-тесты)
- [E2E тесты](#e2e-тесты)
- [CI/CD Pipeline](#cicd-pipeline)
- [Docker тестирование](#docker-тестирование)
- [Настройка окружения](#настройка-окружения)

---

## 🚀 Быстрый старт

### Установка зависимостей

```bash
bun install
```

### Запуск всех тестов

```bash
bun run test:ci
```

### Запуск тестов в Docker (изолированное окружение)

```bash
bun run docker:test
```

---

## Unit тесты

### Технологии

- **Vitest** - быстрый test runner
- **React Testing Library** - тестирование компонентов
- **MSW** - моки внешних API
- **jsdom** - DOM окружение для тестов

### Структура

```
tests/
├── unit/
│   ├── components.test.tsx  # Тесты React компонентов
│   ├── api.test.ts          # Тесты API Routes
│   ├── services.test.ts     # Тесты сервисов
│   └── utils.test.ts        # Тесты утилит
├── fixtures/
│   └── msw-handlers.ts      # MSW handlers для моков
└── helpers/
    ├── db-helpers.ts        # Помощники для БД
    └── auth-helpers.ts      # Помощники для авторизации
```

### Команды

```bash
# Запустить все unit тесты
bun run test:unit

# Watch режим (автоматический перезапуск)
bun run test:unit:watch

# С coverage отчетом
bun run test:unit:coverage
```

### Примеры тестов

#### Тест компонента

```typescript
import { render, screen } from '@testing-library/react';
import { ConferencePopup } from '@/components/ConferencePopup';

test('should render popup', () => {
  render(<ConferencePopup />);
  expect(screen.getByText('Приглашаем на конференцию!')).toBeInTheDocument();
});
```

#### Тест API Route

```typescript
import { POST } from '@/app/api/admin/auth/route';
import { NextRequest } from 'next/server';

test('should login with correct password', async () => {
  const request = new NextRequest('http://localhost:3000/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify({ password: 'test-password' }),
  });

  const response = await POST(request);
  expect(response.status).toBe(200);
});
```

---

## E2E тесты

### Технологии

- **Playwright** - E2E тестирование
- **Testcontainers** - Docker контейнеры для БД

### Структура

```
tests/
├── e2e/
│   ├── auth.spec.ts              # Тесты авторизации
│   ├── forms.spec.ts             # Тесты форм
│   ├── database.spec.ts          # Тесты с БД
│   └── testcontainers-setup.ts   # Настройка Testcontainers
```

### Команды

```bash
# Запустить все E2E тесты
bun run test:e2e

# С UI (интерактивный режим)
bun run test:e2e:ui

# Debug режим
bun run test:e2e:debug
```

### Требования

Перед запуском E2E тестов необходимо:

1. Запустить приложение:
   ```bash
   bun run dev
   ```

2. Убедиться, что БД доступна (или использовать Testcontainers)

### Пример теста

```typescript
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[type="password"]', 'test-password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin/);
});
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

#### `.github/workflows/ci.yml`

Автоматически запускается при push/PR:

1. ✅ **Lint & Type Check** - ESLint + TypeScript
2. ✅ **Unit Tests** - Vitest с coverage
3. ✅ **Build** - Next.js build проверка
4. ✅ **Docker Build** - Build образа + security scan
5. ✅ **E2E Tests** - Playwright с PostgreSQL в services
6. ✅ **Security Scan** - bun pm audit

#### `.github/workflows/deploy.yml`

Автоматический деплой на production:

1. ✅ Build Docker образа
2. ✅ Push в GitHub Container Registry
3. ✅ Deploy на VPS через SSH
4. ✅ Health check
5. ✅ Rollback при ошибке
6. ✅ Уведомление в Telegram

### Локальный запуск CI

```bash
bun run test:ci
```

Это выполнит:
- Type check
- Lint
- Unit tests
- E2E tests

---

## Docker тестирование

### docker-compose.test.yml

Изолированное окружение для тестов:

- PostgreSQL контейнер
- Redis контейнер (если используется)
- Приложение с тестами

### Команды

```bash
# Запустить тесты в Docker
bun run docker:test

# Остановить тестовые контейнеры
bun run docker:test:down
```

### Преимущества

- ✅ Изолированное окружение
- ✅ Чистая БД для каждого запуска
- ✅ Воспроизводимые результаты
- ✅ Не зависит от локального окружения

---

## Настройка окружения

### Переменные окружения для тестов

Создайте `.env.test`:

```env
DATABASE_URL=postgresql://test_user:test_password@localhost:54323/test_db
JWT_SECRET=test-jwt-secret-key-for-testing-only-min-32-chars
ADMIN_PASSWORD=test-admin-password
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### GitHub Secrets

Для CI/CD необходимо настроить:

- `SSH_PRIVATE_KEY` - SSH ключ для деплоя
- `VPS_HOST` - IP/домен сервера
- `VPS_USER` - пользователь для SSH
- `VPS_PROJECT_PATH` - путь к проекту на сервере
- `TELEGRAM_BOT_TOKEN` - токен бота для уведомлений
- `TELEGRAM_ADMIN_CHAT_ID` - ID чата для уведомлений

---

## 📊 Coverage

### Целевые показатели

- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 80%+
- **Statements**: 80%+

### Просмотр coverage

```bash
bun run test:unit:coverage
```

Отчет будет доступен в `coverage/index.html`

---

## 🐛 Отладка тестов

### Unit тесты

```bash
# Запустить один тест
bun run test:unit -- components.test.tsx

# С verbose выводом
bun run test:unit -- --reporter=verbose
```

### E2E тесты

```bash
# Debug режим (открывает Playwright Inspector)
bun run test:e2e:debug

# UI режим (интерактивный)
bun run test:e2e:ui

# Запустить конкретный тест
bun run test:e2e -- auth.spec.ts
```

---

## 📚 Дополнительные ресурсы

- [Vitest документация](https://vitest.dev/)
- [Playwright документация](https://playwright.dev/)
- [MSW документация](https://mswjs.io/)
- [Testcontainers документация](https://testcontainers.com/)

---

## ✅ Чеклист перед коммитом

- [ ] Все unit тесты проходят
- [ ] E2E тесты проходят
- [ ] Нет линтер ошибок
- [ ] TypeScript компилируется без ошибок
- [ ] Coverage не упал ниже 80%

---

**Готово!** Теперь у вас есть полная система тестирования! 🎉
