# Задача: AI Ассистент — чат с базой данных CRM

Реализуй страницу "AI Ассистент" в админке fb.net — гибридный чат с AI (GPT-5.4 через Polza.ai), который имеет доступ к PostgreSQL базе данных контактов. Чат-интерфейс на странице `/ai-assistant` в admin-приложении.

---

## Архитектура: Гибрид (SQL-генерация + контекстный анализ)

AI получает схему БД, вопрос пользователя, выполняет SELECT-запросы и интерпретирует результаты.

### AI-провайдер: Polza.ai (GPT-5.4)

```
API URL: https://polza.ai/api/v1/chat/completions
Auth: Bearer ${POLZA_API_KEY}
Model: openai/gpt-5.4
Формат: OpenAI-compatible (messages, model, temperature)
```

Fallback (если Polza недоступен): OpenRouter `anthropic/claude-sonnet-4`
```
API URL: https://openrouter.ai/api/v1/chat/completions
Auth: Bearer ${OPENROUTER_API_KEY}
```

---

## Схема БД (для system prompt)

Вставить в system prompt полную схему основных таблиц:

```sql
-- contacts (основная CRM таблица, ~2000 записей)
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,           -- ФИО контакта
  email TEXT,                        -- Email
  phone TEXT,                        -- Телефон
  city TEXT,                         -- Город
  institution TEXT,                  -- Организация / клиника
  speciality TEXT,                   -- Специальность (хирург, маммолог и т.д.)
  tags TEXT[] NOT NULL DEFAULT '{}', -- Теги (массив строк)
  status TEXT NOT NULL DEFAULT 'archived', -- new | in_progress | processed | archived
  notes TEXT,                        -- Старое поле заметок (legacy)
  import_source TEXT DEFAULT 'tilda',-- Источник импорта
  source_urls TEXT[],                -- URL источников
  metadata JSONB DEFAULT '{}',       -- Дополнительные данные
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Индексы: full_name, email, phone, city, speciality, status, tags (GIN), created_at

-- contact_notes (множественные заметки для контакта)
CREATE TABLE contact_notes (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual', -- manual | ai_research | ai_deep_research | import
  pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- form_submissions (заявки с форм сайта)
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  form_type TEXT NOT NULL,    -- contact | cp | training | conference_registration
  status TEXT DEFAULT 'new',  -- new | processed | archived
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  institution TEXT,
  city TEXT,
  page_url TEXT,
  metadata JSONB DEFAULT '{}',
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL
);

-- conferences (мероприятия)
CREATE TABLE conferences (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  date_end TEXT,
  description TEXT,
  type TEXT NOT NULL,          -- Конференция | Мастер-класс | Выставка
  location TEXT,
  status TEXT DEFAULT 'published', -- draft | published
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- page_visits (аналитика посещений)
CREATE TABLE page_visits (
  id UUID PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  city TEXT,
  country_code TEXT,
  referrer TEXT,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  device_type TEXT,
  browser TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT
);

-- crm_emails (переписка с контактами)
CREATE TABLE crm_emails (
  id UUID PRIMARY KEY,
  direction TEXT NOT NULL,     -- inbound | outbound
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  subject TEXT,
  body_text TEXT,
  contact_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## System Prompt для AI

```
Ты — AI-ассистент CRM-системы для медицинского оборудования (компания ЗЕНИТ МЕД / fibroadenoma.net).
База содержит контакты врачей и медицинских специалистов, заявки с сайта, мероприятия, аналитику посещений и email-переписку.

ПРАВИЛА:
1. Отвечай на русском языке
2. Если для ответа нужны данные из БД, сгенерируй SQL-запрос внутри блока ```sql ... ```
3. ТОЛЬКО SELECT-запросы. НИКОГДА не генерируй INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE
4. Всегда добавляй LIMIT (максимум 100), если пользователь не указал конкретное количество
5. Для поиска по тексту используй ILIKE с %шаблон%
6. Для работы с тегами используй ANY (например: 'тег' = ANY(tags))
7. Форматируй ответы в Markdown: таблицы для табличных данных, списки для перечислений
8. Если результат пустой — скажи об этом, не придумывай данные
9. Если вопрос не связан с БД — отвечай как обычный помощник
10. При ошибке SQL объясни что пошло не так

СХЕМА БД:
{вставить схему выше}
```

---

## Что нужно создать

### 1. API endpoint: `src/app/api/admin/ai-assistant/route.ts`

```typescript
// POST /api/admin/ai-assistant
// Body: { messages: Array<{ role: 'user' | 'assistant', content: string }> }
// Response: { reply: string, sql?: string, sqlResult?: any }
```

**Логика:**

1. Верифицировать admin-сессию (как в других endpoints: `verifyAdminSession()`)
2. Получить `messages` из тела запроса
3. Составить массив сообщений: `[systemPrompt, ...messages]`
4. Отправить в Polza.ai (GPT-5.4). Если Polza вернул ошибку — fallback на OpenRouter Claude Sonnet 4
5. Распарсить ответ AI:
   - Найти SQL-блок через regex: ` ```sql\n(.*?)\n``` ` (dotall)
   - Если SQL найден:
     a. Валидировать: `trimmedSql.match(/^\s*(SELECT|WITH)\b/i)` — если нет, отклонить
     b. Добавить `LIMIT 100` если нет LIMIT в запросе
     c. Выполнить через `pool.query()` с таймаутом 10 секунд (statement_timeout)
     d. Если больше 50 строк — обрезать до 50, добавить пометку
     e. Отправить результат обратно в AI как второй запрос:
        ```
        role: "user", content: `Результат SQL-запроса (${rows.length} строк):\n${JSON.stringify(rows, null, 2)}`
        ```
     f. Получить финальный ответ AI с интерпретацией
6. Вернуть `{ reply: finalAnswer, sql?: executedSql, sqlResult?: rows }`

**Важные детали:**
- Таймаут SQL: `SET statement_timeout = '10s'` перед выполнением
- Пул: стандартный `new Pool({ connectionString: process.env.DATABASE_URL })`
- Catch ошибки SQL и вернуть пользователю понятное сообщение
- Не показывать DATABASE_URL, пароли и другие env в ответах

### 2. Admin страница: `apps/admin/src/app/ai-assistant/page.tsx`

**Интерфейс чата:**

- `'use client'` компонент
- Полноэкранная страница с заголовком "AI Ассистент" и иконкой Sparkles
- Массив сообщений `messages: Array<{ role: 'user' | 'assistant', content: string, sql?: string }>`
- Поле ввода внизу:
  - `textarea` с auto-resize (min 1 строка, max ~5 строк)
  - Отправка: Enter (без Shift). Shift+Enter = новая строка
  - Кнопка отправки (иконка Send)
  - Disabled пока идёт запрос
- Индикатор загрузки: пульсирующие точки во время ожидания ответа
- Кнопка "Новый чат" (иконка RotateCcw) — очищает `messages`
- Scroll to bottom при новом сообщении

**При пустом чате — экран приветствия:**
- Иконка Sparkles (большая, по центру)
- Заголовок "AI Ассистент"
- Подзаголовок "Задавайте вопросы по базе контактов, заявок, аналитике"
- 6 кликабельных карточек-примеров (grid 2x3):
  1. "Сколько всего контактов в базе?"
  2. "Топ-10 городов по количеству контактов"
  3. "Контакты без email и телефона"
  4. "Статистика по тегам"
  5. "Кто добавлен за последнюю неделю?"
  6. "Сколько заявок за этот месяц?"

**Рендер сообщений:**
- Сообщения пользователя: справа, `bg-[var(--frox-gray-100)]` rounded-2xl, max-w-[80%]
- Сообщения AI: слева, `bg-white border border-[var(--frox-gray-200)]` rounded-2xl, max-w-[85%]
- Markdown в ответах AI: рендерить через простую функцию `renderMarkdown()`:
  - `**bold**` → `<strong>`
  - `*italic*` → `<em>`
  - `` `code` `` → `<code>`
  - `\n` → `<br>`
  - Таблицы: `| col | col |` → `<table>` с css-стилями
  - Списки: `- item` → `<ul><li>`
  - Заголовки: `### title` → `<h3>`
- SQL-запрос (если есть в ответе): сворачиваемый блок `<details>` с `<summary>SQL запрос</summary>`, по умолчанию свёрнут

**Дизайн:**
- Стиль как в остальной админке (var(--frox-gray-*) цвета, rounded-2xl)
- Не использовать внешние библиотеки для markdown
- Fetch через `adminCsrfFetch` из `@/lib/admin-csrf-fetch`
- Иконки из `lucide-react`: Sparkles, Send, RotateCcw, Loader2, User, Bot

### 3. Навигация: `apps/admin/src/components/admin/AdminShell.tsx`

Добавить пункт в массив `NAV_ITEMS`:
```typescript
{ href: '/ai-assistant', label: 'AI Ассистент', icon: '/admin/icons/icon-ai.svg' },
```

Расположить между "Автоброкер" и "Логи".

Для иконки: создать простой SVG файл `apps/admin/public/icons/icon-ai.svg` — стилизованная иконка мозга или звёздочки (sparkles), 24x24, stroke-based, currentColor.

---

## Паттерны проекта (ОБЯЗАТЕЛЬНО соблюдать)

- **Package manager**: `bun` (не npm!)
- **CSRF**: все POST из admin UI через `adminCsrfFetch` из `@/lib/admin-csrf-fetch`
- **Auth**: `verifyAdminSession()` в каждом API endpoint (копировать паттерн из существующих routes)
- **Pool**: `new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres' })`
- **runtime**: `export const runtime = 'nodejs'` в API routes
- **UI components**: `@/components/ui/button`, `@/components/ui/input` — shadcn
- **Не добавлять новые npm-зависимости** без крайней необходимости

## Файлы для справки (прочитать перед началом работы)

- `database-schema.sql` — полная схема БД
- `src/lib/openrouter.ts` — примеры работы с AI API (Polza.ai интеграция в функции `deepResearchContactWithAI`)
- `src/app/api/admin/contacts/route.ts` — пример API endpoint с auth
- `apps/admin/src/lib/admin-csrf-fetch.ts` — CSRF fetch wrapper
- `apps/admin/src/components/admin/AdminShell.tsx` — навигация (NAV_ITEMS)
- `apps/admin/src/app/contacts/[id]/page.tsx` — пример admin-страницы

## Безопасность

- **ТОЛЬКО SELECT** — валидировать regex перед выполнением
- Верификация admin-сессии
- CSRF-защита
- SQL таймаут 10 сек
- Не раскрывать DATABASE_URL, пароли, API ключи в ответах AI
- В system prompt явно запретить мутирующие запросы

## НЕ делать

- Не добавлять embeddings / vector DB (это следующий этап)
- Не добавлять streaming (простой request-response)
- Не устанавливать react-markdown или другие markdown-библиотеки
- Не менять существующие файлы кроме AdminShell.tsx (для навигации)
