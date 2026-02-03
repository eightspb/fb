# Руководство разработчика FB.NET

## Содержание

1. [Архитектура](#архитектура)
2. [База данных](#база-данных)
3. [API структура](#api-структура)
4. [Компоненты](#компоненты)
5. [Docker](#docker)
6. [Стили](#стили)

---

## Архитектура

### Технический стек

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **База данных**: PostgreSQL (через `pg` модуль напрямую)
- **Аутентификация**: JWT (cookie-based, собственная реализация)
- **Стили**: Tailwind CSS + кастомные CSS классы
- **UI**: Radix UI (shadcn/ui)

### Структура данных

```typescript
interface NewsItem {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  date: string;           // Формат: "DD.MM.YYYY"
  year: string;           // Формат: "YYYY"
  images?: string[];
  videos?: string[];
  documents?: string[];
  tags?: string[];
  status?: 'draft' | 'published';
}
```

---

## База данных

### Подключение

Проект использует **PostgreSQL напрямую** через модуль `pg`:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

### Основные таблицы

- `news` - новости
- `news_images` - изображения (с `image_data` BYTEA для хранения в БД)
- `news_tags` - теги
- `news_videos` - видео
- `news_documents` - документы
- `conferences` - конференции
- `form_submissions` - заявки с форм

### Схема БД

Основная схема находится в `database-schema.sql`.

---

## API структура

### Новости

```
GET  /api/news              # Список новостей
GET  /api/news/[id]         # Одна новость
POST /api/news              # Создание новости
PUT  /api/news/[id]         # Обновление
DELETE /api/news/[id]       # Удаление

GET  /api/news/years        # Список годов
GET  /api/news/filters      # Фильтры (года, категории)
GET  /api/news/[id]/view    # Трекинг просмотров
POST /api/news/merge        # Объединение новостей
```

### Конференции

```
GET  /api/conferences           # Список конференций
GET  /api/conferences/[id]      # Одна конференция
POST /api/conferences           # Создание
PUT  /api/conferences/[id]      # Обновление
DELETE /api/conferences/[id]    # Удаление
POST /api/conferences/register  # Регистрация на конференцию
```

### Изображения

```
GET /api/images/[id]        # Получение изображения из БД
```

Изображения хранятся в БД в колонке `image_data` (BYTEA) и отдаются через API endpoint.

### Формы

```
POST /api/contact           # Контактная форма
POST /api/request-cp        # Запрос КП
```

### Telegram

```
POST /api/telegram/webhook  # Webhook для Telegram бота
```

---

## Компоненты

### Основные компоненты

```tsx
// Header с навигацией
import { Header } from "@/components/Header";

// Breadcrumbs
import { Breadcrumbs } from "@/components/Breadcrumbs";
<Breadcrumbs items={[
  { label: "Главная", href: "/" },
  { label: "Новости" }
]} />

// Список новостей
import { NewsList } from "@/components/NewsList";
<NewsList initialYear="2024" />
```

### UI компоненты (shadcn/ui)

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
```

---

## Docker

### Локальная разработка

```bash
# Запустить PostgreSQL
npm run docker:up

# Просмотр логов
npm run docker:logs

# Остановить
npm run docker:down

# Подключиться к БД
npm run docker:psql
```

### Docker Compose файлы

- `docker-compose.yml` - для разработки (только PostgreSQL)
- `docker-compose.prod.yml` - для продакшена (PostgreSQL + Next.js)
- `docker-compose.production.yml` - альтернативный production файл

### Структура контейнеров

При запуске `npm run docker:up`:

1. **PostgreSQL** (`fb-net-postgres`) - порт 54322

Next.js запускается отдельно через `npm run dev`.

---

## Стили

### Tailwind CSS

```tsx
<div className="flex items-center gap-4 p-6 bg-white rounded-lg">
```

### Кастомные CSS классы

Файл: `src/styles/components.css`

```css
/* Контейнеры */
.page-container
.page-max-width
.page-title

/* Компоненты */
.card-hover
.card-content

/* Новости */
.news-card
.news-grid
```

### Цветовая палитра

- Основной: `#2563eb` (blue-500)
- Фон: `#e0e0e0`
- Текст: `#1f2937` (gray-800)

---

## Добавление нового функционала

### Новая страница

1. Создать папку в `src/app/`
2. Добавить `page.tsx`
3. Использовать существующие компоненты

### Новый API endpoint

1. Создать файл в `src/app/api/`
2. Экспортировать функции `GET`, `POST`, `PUT`, `DELETE`
3. Использовать `pool` для запросов к БД

### Новый компонент

1. Создать файл в `src/components/`
2. Использовать TypeScript интерфейсы для props
3. Экспортировать компонент

---

## Соглашения по коду

### TypeScript
- Строгая типизация
- Интерфейсы для props

### Компоненты
- Функциональные компоненты
- Деструктуризация props

### Именование
- Компоненты: PascalCase
- Файлы: kebab-case или PascalCase
- Переменные: camelCase

---

## Полезные ссылки

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [pg (node-postgres)](https://node-postgres.com)
