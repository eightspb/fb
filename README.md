# Компания Зенит - сайт fibroadenoma.net

Сайт ООО «ЗЕНИТ» для оборудования Xishan (ВАБ), обучения и управления контентом через админ-панель.

## Локальная разработка

```powershell
bun install
bun run dev:remote   # SSH-туннель к БД + site (3000) + admin (3001)
```

Открыть: `http://localhost:3001/admin` (пароль: `admin123`)

Подробнее: [docs/REMOTE_DB_SETUP.md](docs/REMOTE_DB_SETUP.md)

### Минимальный `.env.local`

```env
DATABASE_URL=postgresql://postgres:password@localhost:54321/postgres
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

## Основные команды

```bash
bun run dev:remote    # локальная разработка (рекомендуется)
bun run dev:site      # только site на :3000
bun run dev:admin     # только admin на :3001
bun run build
bun run build:admin
bun run lint
bun run test:ci
bun run docker:up     # локальная БД (альтернатива remote)
```

## Архитектура: два приложения

| Контейнер | Порт | Что внутри |
|-----------|------|------------|
| `site` | 3000 | Публичный сайт + весь backend/API (`/api/*`) |
| `admin` | 3001 | UI панели управления (`/admin/*`) |

**API-запросы** (`/api/admin/*`) обрабатывает контейнер `site`. Контейнер `admin` — только UI.

## Деплой (запускается локально)

```powershell
.\scripts\deploy-from-github.ps1 -AppOnly   # site + admin, 90% случаев
.\scripts\deploy-from-github.ps1            # полный деплой с миграциями БД
.\scripts\deploy-from-github.ps1 -SiteOnly  # только site
.\scripts\deploy-from-github.ps1 -AdminOnly # только admin
```

## Документация

- [Деплой](docs/DEPLOY_GUIDE.md)
- [Разработка](docs/DEVELOPMENT.md)
- [Удалённая БД для dev](docs/REMOTE_DB_SETUP.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Тестирование](docs/TESTING.md)
- [SSL](docs/SSL_QUICKSTART.md)
- [SMTP](docs/SMTP_SETUP.md)
- [Аналитика](docs/ANALYTICS_SETUP.md)
- [Логирование](docs/LOGGING.md)
- [Telegram debug](docs/TELEGRAM_DEBUG.md)
- [Скрипты](scripts/README.md)

## Контакты

- Email: `info@zenitmed.ru`
- Сайт: `https://fibroadenoma.net`
