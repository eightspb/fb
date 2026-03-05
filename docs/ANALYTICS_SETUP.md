# Настройка аналитики и счетчика просмотров

## ✅ Что уже реализовано

### 1. Счетчик просмотров новостей
- ✅ Таблица `news_views` для отслеживания уникальных посетителей
- ✅ Таблица `news_view_stats` для агрегированной статистики
- ✅ API endpoint `/api/news/[id]/view` для регистрации просмотров
- ✅ Компонент `NewsViewTracker` для отображения счетчика
- ✅ Отслеживание только уникальных посетителей (IP + User-Agent fingerprint)

### 2. Исправлена фильтрация новостей
- ✅ По умолчанию показываются все новости
- ✅ Исправлены зависимости в `useMemo` для корректной работы фильтров

## 📊 Библиотеки аналитики для расширенного дашборда

Рекомендую использовать одну из следующих библиотек:

### 1. **PostHog** (Рекомендуется)
```bash
bun add posthog-js
```

**Преимущества:**
- Open-source и self-hosted опция
- Отличный дашборд с множеством метрик
- Session replay, feature flags, A/B тестирование
- GDPR compliant
- Бесплатный план до 1M событий/месяц

**Настройка:**
```typescript
// src/lib/analytics.ts
import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') console.log('PostHog loaded')
    }
  })
}
```

### 2. **Plausible Analytics**
```bash
bun add plausible-tracker
```

**Преимущества:**
- Очень приватный (GDPR, CCPA compliant)
- Простой и легкий
- Отличный дашборд
- Бесплатный для до 10k просмотров/месяц

**Настройка:**
```typescript
// src/lib/analytics.ts
import Plausible from 'plausible-tracker'

const plausible = Plausible({
  domain: 'fibroadenoma.net',
  apiHost: 'https://plausible.io'
})

export { plausible }
```

### 3. **Vercel Analytics** (Если используете Vercel)
```bash
bun add @vercel/analytics
```

**Преимущества:**
- Бесплатно при использовании Vercel
- Простая интеграция
- Официальная поддержка Next.js

**Настройка:**
```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 4. **Google Analytics 4 (GA4)**
```bash
bun add @next/third-parties
```

**Преимущества:**
- Мощный и бесплатный
- Интеграция с Google Ads
- Но требует cookie consent для GDPR

## 🔧 Установка счетчика просмотров

### Шаг 1: Применить SQL схему
```bash
# Через Docker
bun run docker:psql
```

В `psql` выполните:

```sql
CREATE TABLE IF NOT EXISTS news_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  visitor_fingerprint TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  viewed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(news_id, visitor_fingerprint, viewed_date)
);

CREATE INDEX IF NOT EXISTS idx_news_views_news_id ON news_views(news_id);
CREATE INDEX IF NOT EXISTS idx_news_views_viewed_date ON news_views(viewed_date DESC);

CREATE TABLE IF NOT EXISTS news_view_stats (
  news_id UUID PRIMARY KEY REFERENCES news(id) ON DELETE CASCADE,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION update_news_view_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO news_view_stats (news_id, unique_visitors, total_views, last_viewed_at)
  VALUES (NEW.news_id, 1, 1, NOW())
  ON CONFLICT (news_id) DO UPDATE SET
    unique_visitors = news_view_stats.unique_visitors + 1,
    total_views = news_view_stats.total_views + 1,
    last_viewed_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_news_views_update_stats ON news_views;
CREATE TRIGGER trg_news_views_update_stats
  AFTER INSERT ON news_views
  FOR EACH ROW
  EXECUTE FUNCTION update_news_view_stats();
```

### Шаг 2: Проверить работу
1. Откройте любую новость
2. Подождите 2 секунды
3. Обновите страницу - должен появиться счетчик просмотров

## 📈 Метрики, которые отслеживаются

1. **Уникальные посетители** - по fingerprint (IP + User-Agent)
2. **Общее количество просмотров** - все просмотры (включая повторные)
3. **Дата последнего просмотра** - когда новость просматривали в последний раз

## 🎯 Дополнительные возможности

Для расширенной аналитики можно добавить:

1. **Геолокация** - определение страны/города посетителя
2. **Устройства** - мобильные/десктоп/планшеты
3. **Источники трафика** - откуда пришли посетители
4. **Время на странице** - сколько времени проводит пользователь
5. **Scroll depth** - насколько прокручивают страницу

## 📝 Пример интеграции PostHog

```typescript
// src/components/PostHogProvider.tsx
'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

if (typeof window !== 'undefined') {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      person_profiles: 'identified_only',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') console.log('PostHog ready')
      }
    })
  }
}

export function AnalyticsProvider({ children }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}

// src/app/layout.tsx
import { AnalyticsProvider } from '@/components/PostHogProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  )
}
```

## 🔐 Конфиденциальность

Текущая реализация использует только IP и User-Agent для создания fingerprint.
Это минимальные данные, необходимые для отслеживания уникальности.

Для соблюдения GDPR рекомендуется:
1. Добавить cookie consent banner
2. Сообщать пользователям о сборе данных
3. Предоставить возможность отказаться от отслеживания

