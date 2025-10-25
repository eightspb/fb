# API и данные FB.NET

## 📋 Обзор

Этот документ описывает структуру данных, API endpoints и паттерны работы с данными в проекте FB.NET.

## 🗂 Структура данных

### NewsItem Interface

**Расположение**: `src/lib/news-data.ts`

```typescript
interface NewsItem {
  // Уникальный идентификатор
  id: string;

  // Основная информация
  title: string;
  shortDescription: string;
  fullDescription: string;

  // Метаданные
  date: string;      // Формат: "DD.MM.YYYY"
  year: string;      // Формат: "YYYY"
  location?: string; // Место проведения

  // Классификация
  category?: string; // Категория новости
  tags?: string[];   // Теги для поиска
  author?: string;   // Автор новости

  // Медиа контент
  images?: string[];   // Массив URL изображений
  videos?: string[];   // Массив URL видео
  documents?: string[]; // Массив URL документов
}
```

### Пример данных

```typescript
const sampleNewsItem: NewsItem = {
  id: "xishan-contract",
  title: "Подписан контракт с компанией Xishan",
  shortDescription: "Компания FB.NET подписала эксклюзивный контракт...",
  fullDescription: "Детальное описание события...",
  date: "15.12.2024",
  year: "2024",
  location: "Москва",
  category: "Контракты",
  tags: ["оборудование", "партнерство", "ВАБ"],
  author: "Администратор",
  images: ["/images/news/xishan-contract-1.jpg"],
  videos: ["/videos/xishan-contract.mp4"],
  documents: ["/docs/contract-xishan.pdf"]
};
```

## 🔧 Функции работы с данными

### News Data Functions

**Расположение**: `src/lib/news-data.ts`

#### getNewsById(id: string)
```typescript
export const getNewsById = (id: string): NewsItem | undefined => {
  return newsData.find(news => news.id === id);
};

// Использование
const news = getNewsById("xishan-contract");
if (news) {
  console.log(news.title); // "Подписан контракт с компанией Xishan"
}
```

#### getNewsByYear(year: string)
```typescript
export const getNewsByYear = (year: string): NewsItem[] => {
  return newsData.filter(news => news.year === year);
};

// Использование
const news2024 = getNewsByYear("2024");
// Возвращает массив новостей за 2024 год
```

#### getAllYears()
```typescript
export const getAllYears = (): string[] => {
  return [...new Set(newsData.map(news => news.year))].sort((a, b) => b.localeCompare(a));
};

// Использование
const years = getAllYears(); // ["2025", "2024", "2023"]
```

## 📊 Структура массива данных

```typescript
export const newsData: NewsItem[] = [
  {
    id: "xishan-contract",
    title: "Подписан контракт с компанией Xishan",
    shortDescription: "Компания FB.NET подписала эксклюзивный контракт на поставку оборудования ВАБ",
    fullDescription: `Компания FB.NET рада объявить о подписании эксклюзивного контракта
    с китайской компанией Chongqing Xishan Science & Technology Co., Ltd.
    на поставку оборудования для вакуумной аспирационной биопсии молочной железы.`,
    date: "15.12.2024",
    year: "2024",
    location: "Москва",
    category: "Контракты",
    tags: ["оборудование", "партнерство", "ВАБ"],
    author: "Администратор",
    images: ["/images/news/xishan-contract-1.jpg"],
    documents: ["/docs/contract-xishan.pdf"]
  },
  // ... остальные новости
];
```

## 🗄 Статические данные

### Категории новостей

```typescript
export const NEWS_CATEGORIES = [
  "Контракты",
  "Выставки",
  "Конференции",
  "Обучение",
  "Оборудование"
] as const;

export type NewsCategory = typeof NEWS_CATEGORIES[number];
```

### Теги новостей

```typescript
export const NEWS_TAGS = [
  "ВАБ",
  "оборудование",
  "обучение",
  "партнерство",
  "исследования",
  "технологии"
] as const;

export type NewsTag = typeof NEWS_TAGS[number];
```

## 🚀 API паттерны

### Server Components (Next.js 13+)

Все страницы используют Server Components по умолчанию:

```tsx
// app/news/page.tsx
export default function News() {
  // Серверный компонент - данные загружаются на сервере
  const years = getAllYears();
  const news2024 = getNewsByYear("2024");

  return (
    // JSX
  );
}
```

### Static Generation

Страницы новостей используют Static Site Generation (SSG):

```tsx
// app/news/[id]/page.tsx
interface NewsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return newsData.map((news) => ({
    id: news.id,
  }));
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { id } = await params;
  const news = getNewsById(id);

  if (!news) {
    notFound();
  }

  return (
    // JSX с данными новости
  );
}
```

## 📡 Внешние API (будущие)

### Структура для внешних API

```typescript
// lib/api/client.ts
export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`);
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
}

// Использование
export const apiClient = new ApiClient(process.env.API_URL || '');
```

### Типы API ответов

```typescript
// types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface ContactResponse {
  id: string;
  status: 'received' | 'processing' | 'completed';
  estimatedResponse: string;
}
```

## 🔄 Data Flow

### Создание новости

```
1. Добавление в newsData array
2. Автоматическая генерация статических страниц
3. Обновление архива новостей
4. Пересборка сайта
```

### Обновление данных

```typescript
// lib/news-data.ts
export const addNewsItem = (news: Omit<NewsItem, 'id'>): NewsItem => {
  const newId = generateId();
  const newNews: NewsItem = { ...news, id: newId };
  newsData.unshift(newNews);
  return newNews;
};

export const updateNewsItem = (id: string, updates: Partial<NewsItem>): NewsItem | null => {
  const index = newsData.findIndex(news => news.id === id);
  if (index === -1) return null;

  newsData[index] = { ...newsData[index], ...updates };
  return newsData[index];
};
```

## 📈 Аналитика данных

### Статистика новостей

```typescript
// lib/analytics.ts
export const getNewsStats = () => {
  const total = newsData.length;
  const byYear = newsData.reduce((acc, news) => {
    acc[news.year] = (acc[news.year] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byCategory = newsData.reduce((acc, news) => {
    if (news.category) {
      acc[news.category] = (acc[news.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return { total, byYear, byCategory };
};
```

### Поиск и фильтрация

```typescript
// lib/search.ts
export const searchNews = (
  query: string,
  filters?: {
    year?: string;
    category?: string;
    tags?: string[];
  }
): NewsItem[] => {
  return newsData.filter(news => {
    // Текстовый поиск
    const matchesQuery = query === '' ||
      news.title.toLowerCase().includes(query.toLowerCase()) ||
      news.shortDescription.toLowerCase().includes(query.toLowerCase()) ||
      news.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()));

    // Фильтры
    const matchesYear = !filters?.year || news.year === filters.year;
    const matchesCategory = !filters?.category || news.category === filters.category;
    const matchesTags = !filters?.tags?.length ||
      filters.tags.some(tag => news.tags?.includes(tag));

    return matchesQuery && matchesYear && matchesCategory && matchesTags;
  });
};
```

## 🔒 Безопасность данных

### Валидация данных

```typescript
// lib/validation.ts
export const validateNewsItem = (news: Partial<NewsItem>): ValidationResult => {
  const errors: string[] = [];

  if (!news.title?.trim()) {
    errors.push('Название новости обязательно');
  }

  if (!news.shortDescription?.trim()) {
    errors.push('Краткое описание обязательно');
  }

  if (news.date && !isValidDate(news.date)) {
    errors.push('Неверный формат даты');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### Санитизация контента

```typescript
// lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};
```

## 📊 Мониторинг и логирование

### API для аналитики

```typescript
// lib/analytics.ts
export const trackPageView = (page: string) => {
  // Отправка данных аналитики
  console.log(`Page view: ${page}`);
};

export const trackEvent = (event: string, data?: any) => {
  // Отправка событий
  console.log(`Event: ${event}`, data);
};
```

## 🔄 Миграции данных

### Структура миграций

```
data/
├── migrations/
│   ├── 001_initial_news_data.ts
│   ├── 002_add_categories.ts
│   └── 003_update_image_urls.ts
└── seeds/
    └── news_seed.ts
```

### Пример миграции

```typescript
// data/migrations/002_add_categories.ts
export const up = (newsData: NewsItem[]): NewsItem[] => {
  return newsData.map(news => ({
    ...news,
    category: news.category || 'Общее'
  }));
};

export const down = (newsData: NewsItem[]): NewsItem[] => {
  return newsData.map(news => {
    const { category, ...rest } = news;
    return rest;
  });
};
```

## 📚 Дополнительные ресурсы

- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [API Design Best Practices](https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design)
