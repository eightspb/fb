# Компания Зенит - сайт fibroadenoma.net

Сайт ООО «ЗЕНИТ» для оборудования Xishan (ВАБ), обучения и управления контентом через админ-панель.

## Локальная разработка

```bash
bun install
bun run dev:remote   # SSH-туннель к БД + site (3000) + admin (3001)
```

Открыть: `http://localhost:3001/admin/login` (локально нужен только пароль из `.env.local`, сейчас это `admin123`)

Подробнее: [docs/REMOTE_DB_SETUP.md](docs/REMOTE_DB_SETUP.md)

### Минимальный `.env.local`

```env
DATABASE_URL=postgresql://postgres:password@localhost:54321/postgres
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

Примечание: текущая форма входа в админку локально использует только пароль. `ADMIN_USERNAME` может оставаться в `.env.local`, но на самой странице логина сейчас не спрашивается.

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

## Что запускать и когда

- `bun run dev:remote` — когда разрабатываете локально и хотите поднять сайт и админку у себя на Mac, но работать с удалённой БД через SSH-туннель.
- `bash scripts/commit-and-push.sh --message "..."` — когда локальные изменения готовы и их нужно закоммитить и отправить в текущую git-ветку.
- `bash scripts/deploy-from-github.sh --app-only` — когда код уже запушен и его нужно развернуть на продакшн-сервере с доменом `fibroadenoma.net`.
- `bash scripts/deploy-from-github.sh` — когда кроме кода нужно ещё применить миграции БД и сделать полный деплой.

`deploy-from-github.sh` не запускает локальную разработку, а `dev:remote` не делает deploy на сервер. Это два разных сценария.

## Поддерживаемые скрипты

Основной поддерживаемый путь сейчас: `bash`/macOS/Linux entrypoint'ы. Старые `*.ps1` оставлены в репозитории как legacy-вариант для Windows, но помечены deprecated и не считаются основным способом запуска.

## Архитектура: два приложения

| Контейнер | Порт | Что внутри |
|-----------|------|------------|
| `site` | 3000 | Публичный сайт + весь backend/API (`/api/*`) |
| `admin` | 3001 | UI панели управления (`/admin/*`) |

**API-запросы** (`/api/admin/*`) обрабатывает контейнер `site`. Контейнер `admin` — только UI.

## Деплой (запускается локально)

```bash
bash scripts/deploy-from-github.sh --app-only    # site + admin, 90% случаев
bash scripts/deploy-from-github.sh               # полный деплой с миграциями БД
bash scripts/deploy-from-github.sh --site-only   # только site
bash scripts/deploy-from-github.sh --admin-only  # только admin
```

Скрипт деплоя запускается локально, но разворачивает код на продакшн-сервере `root@155.212.217.60:/opt/fb-net`, который обслуживает домен `fibroadenoma.net`.

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
