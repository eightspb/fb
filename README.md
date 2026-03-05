# Компания Зенит - сайт fibroadenoma.net

Сайт ООО «ЗЕНИТ» для оборудования Xishan (ВАБ), обучения и управления контентом через админ-панель.

## Быстрый старт

```bash
bun install
bun run docker:up
bun run dev
```

Открыть: `http://localhost:3000`

### Минимальный `.env.local`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

## Основные команды

```bash
bun run dev           # сайт на :3000
bun run dev:admin     # админка на :3001
bun run build
bun run build:admin
bun run lint
bun run test:ci
bun run docker:up
bun run docker:down
```

## Архитектура: два приложения

| Контейнер | Порт | Что внутри |
|-----------|------|------------|
| `site` | 3000 | Публичный сайт + весь backend/API (`/api/*`) |
| `admin` | 3001 | UI панели управления (`/admin/*`) |

**API-запросы** (`/api/admin/*`) обрабатывает контейнер `site`. Контейнер `admin` — только UI.

## Деплой (запускается локально)

### Только сайт (изменения в `src/`)

```powershell
.\scripts\deploy-from-github.ps1 -SiteOnly
```

### Только админка (изменения в `apps/admin/`)

```powershell
.\scripts\deploy-from-github.ps1 -AdminOnly
```

### Оба приложения

```powershell
.\scripts\deploy-from-github.ps1 -AppOnly
```

### Полный деплой (с миграциями БД)

```powershell
.\scripts\deploy-from-github.ps1
```

## Документация

- [Деплой](/docs/DEPLOY_GUIDE.md)
- [Автоматизация](/docs/AUTOMATION_GUIDE.md)
- [Быстрый старт](/docs/QUICK_START.md)
- [Разработка](/docs/DEVELOPMENT.md)
- [Troubleshooting](/docs/TROUBLESHOOTING.md)
- [Тестирование (подробно)](/docs/TESTING.md)
- [Тестирование (кратко)](/docs/tests.md)
- [Удаленная БД для dev](/docs/REMOTE_DB_SETUP.md)
- [SSL](/docs/SSL_QUICKSTART.md)
- [SMTP](/docs/SMTP_SETUP.md)
- [Аналитика](/docs/ANALYTICS_SETUP.md)
- [Логирование](/docs/LOGGING.md)
- [Скрипты](/scripts/README.md)

## Контакты

- Email: `info@zenitmed.ru`
- Сайт: `https://fibroadenoma.net`
