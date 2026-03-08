# Руководство разработчика Компания Зенит

Документация для разработчиков, работающих над проектом.

---

## 📋 Содержание

1. [Технический стек](#технический-стек)
2. [Архитектура](#архитектура)
3. [База данных](#база-данных)
4. [API структура](#api-структура)
5. [Компоненты](#компоненты)
6. [Рабочий процесс](#рабочий-процесс)
7. [Стили и UI](#стили-и-ui)

---

## 🛠️ Технический стек

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Язык**: TypeScript
- **Стилизация**: Tailwind CSS
- **UI компоненты**: Radix UI (shadcn/ui)
- **Data fetching (admin)**: SWR (все admin-страницы)
- **Анимации**: Framer Motion
- **Карты**: @pbe/react-yandex-maps

### Backend
- **База данных**: PostgreSQL (прямое подключение через `pg`)
- **Аутентификация**: JWT (cookie-based, собственная реализация)
- **API**: Next.js API Routes
- **Runtime**: Node.js или Bun

### Интеграции
- **Telegram Bot**: node-telegram-bot-api
- **Email**: Nodemailer (SMTP)
- **AI**: OpenRouter API

---

## 🏗️ Архитектура

### Структура данных

```typescript
interface NewsItem {
  id: string;
  title: string;
  short_description: string;
  full_description: string;
  date: string;           // Формат: "DD.MM.YYYY"
  year: string;           // Формат: "YYYY"
  views?: number;
  created_at?: string;
  updated_at?: string;
}

interface Conference {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  registration_deadline: string;
  max_participants?: number;
  status: 'upcoming' | 'ongoing' | 'completed';
}
```

### Папки проекта

```
apps/
└── admin/                 # Отдельное Next.js приложение админки (UI-only, basePath=/admin)
    ├── src/app/...        # Страницы админки
    ├── src/components/... # Компоненты админки
    └── middleware.ts      # Guard для /admin/*
src/
├── app/
│   ├── ...                # Публичные страницы сайта
│   └── api/               # Весь backend/API (включая /api/admin/*)
├── components/
│   ├── ui/                # Базовые UI компоненты
│   └── *.tsx              # Общие компоненты сайта
├── lib/
│   ├── auth.ts            # JWT аутентификация
│   ├── csrf.ts            # CSRF защита
│   ├── email.ts           # Отправка email
│   ├── telegram-bot.ts    # Telegram интеграция
│   └── utils.ts           # Утилиты
└── styles/
    └── components.css     # Кастомные CSS классы
```

### Multi-zone схема

- `site` сервис: публичный сайт + весь API (`/api/*`, включая `/api/admin/*`)
- `admin` сервис: только UI под `basePath=/admin`
- Nginx роутинг:
  - `/admin` и `/admin/*` -> `admin`
  - `/api/*` и остальное -> `site`
- Это позволяет деплоить `admin` отдельно без пересборки/рестарта `site`

### CSRF для admin API

- Для всех `POST/PUT/PATCH/DELETE` запросов к `/api/admin/*` из client components отправляйте `x-csrf-token`
- Источник токена: `getCsrfToken()` из `src/lib/csrf-client.ts`
- При `403` с CSRF-ошибкой обязателен один retry после `refreshCsrfToken()`
- Не добавляйте новые CSRF-exemptions в middleware для admin route’ов

---

## 💾 База данных

### Подключение

```typescript
import { Pool } from 'pg';

// Pool объявляется на уровне модуля — соединения переиспользуются между запросами
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Использование
const result = await pool.query('SELECT * FROM news WHERE id = $1', [id]);
```

### Основные таблицы

| Таблица | Описание |
|---------|----------|
| `news` | Новости и статьи |
| `news_images` | Изображения (BYTEA) |
| `news_tags` | Теги новостей |
| `news_videos` | Видео (ссылки) |
| `news_documents` | Документы |
| `conferences` | Конференции |
| `conference_registrations` | Регистрации на конференции |
| `form_submissions` | Заявки с форм |
| `analytics_sessions` | Сессии пользователей |
| `analytics_page_views` | Просмотры страниц |

### Схема БД

Полная схема в файле `database-schema.sql`.

### Миграции

Миграции хранятся в папке `migrations/` и применяются автоматически при деплое:

```sql
-- migrations/add-new-table.sql
CREATE TABLE IF NOT EXISTS example (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);
```

---

## 🔌 API структура

### Новости

```
GET    /api/news              # Список новостей
GET    /api/news/[id]         # Одна новость
POST   /api/news              # Создание (требует auth)
PUT    /api/news/[id]         # Обновление (требует auth)
DELETE /api/news/[id]         # Удаление (требует auth)

GET    /api/news/years        # Список годов
GET    /api/news/filters      # Фильтры (года, категории)
GET    /api/news/count        # Количество новостей
POST   /api/news/merge        # Объединение новостей (требует auth)
```

### Конференции

```
GET    /api/conferences           # Список конференций
GET    /api/conferences/[id]      # Одна конференция
POST   /api/conferences           # Создание (требует auth)
PUT    /api/conferences/[id]      # Обновление (требует auth)
DELETE /api/conferences/[id]      # Удаление (требует auth)
POST   /api/conferences/register  # Регистрация на конференцию
```

### Изображения

```
GET /api/images/[id]        # Получение изображения из БД
```

**Важно:** Изображения хранятся в БД в колонке `image_data` (BYTEA) и отдаются через API endpoint с правильными заголовками.

### Формы

```
POST /api/contact           # Контактная форма
POST /api/request-cp        # Запрос коммерческого предложения
```

### Аутентификация

```
POST /api/admin/auth        # Вход в админ-панель
```

### Telegram

```
POST /api/telegram/webhook  # Webhook для Telegram бота
```

### Аналитика

```
POST /api/analytics/track              # Трекинг событий
GET  /api/admin/analytics/stats        # Статистика (требует auth)
GET  /api/admin/analytics/sessions     # Активные сессии (требует auth)
```

---

## 🧩 Компоненты

### Основные компоненты

```tsx
// Header с навигацией
import { Header } from "@/components/Header";

// Footer
import { Footer } from "@/components/Footer";

// Breadcrumbs
import { Breadcrumbs } from "@/components/Breadcrumbs";
<Breadcrumbs items={[
  { label: "Главная", href: "/" },
  { label: "Новости" }
]} />

// Список новостей
import { NewsList } from "@/components/NewsList";
<NewsList initialYear="2024" />

// Карта клиник
import { ClinicsMap } from "@/components/ClinicsMap";
<ClinicsMap />

// Таймер обратного отсчета
import { CountdownTimer } from "@/components/CountdownTimer";
<CountdownTimer targetDate="2025-12-31T23:59:59" />
```

### UI компоненты (shadcn/ui)

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
```

### Админ компоненты

```tsx
// внутри apps/admin
import { NewsForm } from "@/components/admin/NewsForm";
import { ConferenceForm } from "@/components/admin/ConferenceForm";
import { FileUpload } from "@/components/admin/FileUpload";
import { VisitStats } from "@/components/admin/VisitStats";
import { ActiveSessions } from "@/components/admin/ActiveSessions";
```

---

## 🔄 Рабочий процесс

### 1. Локальная разработка

```bash
# Запустить БД
bun run docker:up

# Запустить public site (порт 3000)
bun run dev:site

# Запустить admin UI (порт 3001)
bun run dev:admin

# Открыть:
# http://localhost:3000       - site
# http://localhost:3001/admin - admin
```

### 2. Внесение изменений

- Создайте новую ветку (опционально)
- Внесите изменения в код
- Протестируйте локально
- Проверьте TypeScript ошибки: `bun run lint`

### 3. Коммит и push

```powershell
# Автоматический коммит всех изменений
.\scripts\commit-and-push.ps1 -Message "Описание изменений"
```

Скрипт автоматически:
- Добавляет все файлы
- Проверяет отсутствие секретов
- Создает коммит
- Пушит в GitHub

### 4. Деплой на продакшен

```powershell
# Только admin (без пересборки site)
.\scripts\deploy-from-github.ps1 -AdminOnly

# Только site
.\scripts\deploy-from-github.ps1 -SiteOnly

# Site + admin
.\scripts\deploy-from-github.ps1 -AppOnly

# Полный деплой (с миграциями)
.\scripts\deploy-from-github.ps1
```

**Время деплоя:** ~2-3 минуты

### Rollback

```bash
# На сервере: откат к предыдущему коммиту и пересборка
ssh root@155.212.217.60
cd /opt/fb-net
git checkout <previous_commit_sha>
docker compose -f docker-compose.ssl.yml build --no-cache site admin
docker compose -f docker-compose.ssl.yml up -d site admin
```

---

## 🎨 Стили и UI

### Tailwind CSS

Используем Tailwind для базовых стилей:

```tsx
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-lg">
  <h1 className="text-2xl font-bold text-gray-800">Заголовок</h1>
</div>
```

### Кастомные CSS классы

Файл: `src/styles/components.css`

```css
/* Контейнеры */
.page-container        /* Основной контейнер страницы */
.page-max-width        /* Ограничение ширины контента */
.page-title            /* Стиль заголовка страницы */

/* Компоненты */
.card-hover            /* Эффект при наведении на карточку */
.card-content          /* Контент карточки */

/* Новости */
.news-card             /* Карточка новости */
.news-grid             /* Сетка новостей */
```

### Цветовая палитра

```css
/* Основные цвета */
--primary: #2563eb;     /* Синий */
--background: #e0e0e0;  /* Светло-серый фон */
--text: #1f2937;        /* Темно-серый текст */
--border: #d1d5db;      /* Серая граница */
```

### Адаптивность

Проект полностью адаптивен:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Контент */}
</div>
```

---

## 📝 Добавление нового функционала

### Новая страница

1. Создайте файл `src/app/your-page/page.tsx`:

```tsx
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function YourPage() {
  return (
    <>
      <Header />
      <main className="page-container">
        <h1 className="page-title">Ваша страница</h1>
        {/* Контент */}
      </main>
      <Footer />
    </>
  );
}
```

2. Страница будет доступна по адресу `/your-page`

### Новый API endpoint

1. Создайте файл `src/app/api/your-endpoint/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// ВАЖНО: Pool объявляется на уровне модуля (не внутри handler'а)
// Это позволяет переиспользовать соединения между запросами
// и избегает 1-3с задержки на TCP/TLS handshake при каждом запросе.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  try {
    const result = await pool.query('SELECT * FROM your_table');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Обработка данных
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}
```

### Новый компонент

1. Создайте файл `src/components/YourComponent.tsx`:

```tsx
"use client";

interface YourComponentProps {
  title: string;
  description?: string;
}

export function YourComponent({ title, description }: YourComponentProps) {
  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="text-gray-600">{description}</p>}
    </div>
  );
}
```

2. Используйте компонент:

```tsx
import { YourComponent } from "@/components/YourComponent";

<YourComponent title="Заголовок" description="Описание" />
```

---

## 🔧 Соглашения по коду

### TypeScript
- Строгая типизация для всех функций
- Интерфейсы для props компонентов
- Избегайте `any` типа

### Компоненты
- Функциональные компоненты (не классовые)
- Деструктуризация props
- `"use client"` для клиентских компонентов

### Data fetching в admin

Все admin-страницы используют **SWR** вместо `useEffect`/`useState`:

```tsx
import useSWR from 'swr';

const { data, isLoading, mutate } = useSWR<MyType>(
  '/api/admin/something',
  (url) => fetch(url, { credentials: 'include' }).then(r => r.json()),
  { revalidateOnFocus: false, dedupingInterval: 5000, keepPreviousData: true }
);

// После мутации (без лишнего сетевого запроса):
mutate(updatedData, false);

// Или с перезапросом:
mutate();
```

### Именование
- **Компоненты**: PascalCase (`NewsCard.tsx`)
- **Файлы**: kebab-case или PascalCase
- **Переменные**: camelCase (`userName`)
- **Константы**: UPPER_CASE (`MAX_ITEMS`)

### Импорты
```typescript
// React и Next.js
import { useState } from "react";
import { NextRequest } from "next/server";

// Компоненты проекта
import { Header } from "@/components/Header";

// Утилиты
import { formatDate } from "@/lib/utils";

// Типы
import type { NewsItem } from "@/lib/types";
```

---

## 🐛 Отладка

### Просмотр логов

```bash
# Локально - в консоли dev сервера

# На сервере
ssh root@your-server.com
cd /opt/fb-net
docker compose -f docker-compose.ssl.yml logs site admin --tail=50
```

### Подключение к БД

```bash
# Локально
bun run docker:psql

# На сервере
docker exec -it fb-net-db psql -U postgres -d postgres
```

### Проверка переменных окружения

```typescript
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
```

---

## 📚 Полезные ссылки

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [node-postgres](https://node-postgres.com)

---

## 🤝 Вопросы?

Если возникли вопросы или проблемы:
1. Проверьте [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Посмотрите логи приложения
3. Проверьте документацию используемых технологий
