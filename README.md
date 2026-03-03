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
bun run dev
bun run build
bun run lint
bun run test:ci
bun run docker:up
bun run docker:down
bun run direct:bidder
```

Прод-деплой (Windows PowerShell):

```powershell
.\scripts\deploy-from-github.ps1 -AppOnly
```

## Документация

- [Полная навигация](./docs/DOCUMENTATION.md)
- [Быстрый старт](/docs/QUICK_START.md)
- [Разработка](/docs/DEVELOPMENT.md)
- [Деплой](/docs/DEPLOY_GUIDE.md)
- [Troubleshooting](/docs/TROUBLESHOOTING.md)
- [Тесты](/docs/tests.md)
- [Удаленная БД для dev](/docs/REMOTE_DB_SETUP.md)
- [Автоматизация](/docs/AUTOMATION_GUIDE.md)
- [Telegram (quick)](/docs/TELEGRAM_FIX_QUICK.md)
- [Telegram (debug)](/docs/TELEGRAM_DEBUG.md)
- [SSL](/docs/SSL_QUICKSTART.md)
- [SMTP](/docs/SMTP_SETUP.md)
- [Аналитика](/docs/ANALYTICS_SETUP.md)
- [Логирование](/docs/LOGGING.md)
- [Скрипты](/scripts/README.md)

## Контакты

- Email: `info@zenitmed.ru`
- Сайт: `https://fibroadenoma.net`
