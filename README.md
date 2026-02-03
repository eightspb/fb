# FB.NET - Официальный сайт ООО «ЗЕНИТ»

## Описание

FB.NET - официальный сайт ООО «ЗЕНИТ», единственного официального дистрибьютора оборудования Xishan для вакуумной аспирационной биопсии (ВАБ) молочной железы в Российской Федерации.

### Основные возможности сайта

- **Каталог оборудования** - подробная информация об устройствах Xishan DK-B-MS
- **Обучение и сертификация** - курсы повышения квалификации для врачей
- **Новости и события** - актуальная информация о конференциях и мероприятиях
- **Референс-центры** - карта клиник, использующих оборудование
- **Админ-панель** - управление контентом через удобный интерфейс
- **Telegram бот** - автоматическое создание новостей через Telegram

## Быстрый запуск

```bash
npm install
npm run dev
```

Сайт будет доступен по адресу: **http://localhost:3000**

## Технологии

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Язык**: TypeScript
- **Стилизация**: Tailwind CSS
- **UI компоненты**: Radix UI (shadcn/ui)
- **Анимации**: Framer Motion
- **Карты**: @pbe/react-yandex-maps

### Backend & Database
- **База данных**: PostgreSQL
- **Аутентификация**: JWT (cookie-based)
- **API**: Next.js API Routes

### Интеграции
- **Telegram Bot**: node-telegram-bot-api
- **Email**: Nodemailer
- **AI**: OpenRouter API (для генерации текстов)

## Структура проекта

```
fb.net/
├── src/
│   ├── app/                    # Next.js App Router страницы
│   │   ├── admin/             # Админ-панель
│   │   ├── api/               # API endpoints
│   │   └── ...                # Публичные страницы
│   ├── components/            # Переиспользуемые компоненты
│   │   ├── ui/               # UI компоненты (shadcn/ui)
│   │   └── admin/            # Компоненты админ-панели
│   ├── lib/                   # Утилиты и бизнес-логика
│   └── styles/                # Кастомные стили
├── scripts/                   # Скрипты деплоя и бэкапов
├── public/                    # Статические файлы
└── docker-compose*.yml        # Конфигурации Docker
```

## Команды

### Разработка
```bash
npm run dev              # Запуск dev сервера
npm run build            # Сборка для продакшна
npm run start            # Запуск продакшн сервера
npm run lint             # Проверка кода
```

### Docker
```bash
npm run docker:up        # Запустить контейнеры
npm run docker:down      # Остановить контейнеры
npm run docker:logs      # Просмотр логов
npm run docker:psql      # Подключиться к PostgreSQL
npm run docker:prod      # Запуск production контейнеров
```

## Основные страницы

- `/` - Главная страница
- `/patients` - Информация для пациентов
- `/equipment` - Описание оборудования
- `/training` - Программы обучения
- `/news` - Новости и события
- `/conferences` - Конференции
- `/contacts` - Контакты и форма обратной связи

## Переменные окружения

Создайте `.env.local` в корне проекта:

```env
# База данных
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Admin authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password
JWT_SECRET=your-super-secret-jwt-key

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_chat_id

# OpenRouter for AI (optional)
OPENROUTER_API_KEY=your_api_key

# Email (optional)
SMTP_HOST=smtp.mail.ru
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password
TARGET_EMAIL=target_email
```

## Деплой

### Деплой на сервер из GitHub

```powershell
.\scripts\deploy-from-github.ps1
```

### Деплой через rsync

```powershell
.\scripts\deploy-to-server.ps1 -Server user@server -RemotePath /opt/fb-net
```

### Бэкап базы данных

```powershell
.\scripts\backup-database.ps1
```

## Документация

- **[DEPLOY.md](./DEPLOY.md)** - Инструкция по развертыванию на VPS
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Документация для разработчиков
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Решение проблем
- **[SMTP_SETUP.md](./SMTP_SETUP.md)** - Настройка отправки почты
- **[ANALYTICS_SETUP.md](./ANALYTICS_SETUP.md)** - Настройка аналитики

## Контакты

- **Email**: info@zenitmed.ru
- **Сайт**: https://fibroadenoma.net

## Лицензия

Все права защищены © 2025 ООО «ЗЕНИТ»
