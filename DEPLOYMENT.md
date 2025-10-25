# Развертывание FB.NET

## 📋 Обзор

Этот документ описывает процесс развертывания приложения FB.NET на различных платформах и конфигурацию CI/CD.

## 🚀 Быстрое развертывание

### Vercel (рекомендуется)

1. **Подключение репозитория**
   ```bash
   # Автоматически через интерфейс Vercel
   # или через CLI
   npx vercel --prod
   ```

2. **Конфигурация** (`vercel.json`)
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "framework": "nextjs",
     "regions": ["fra1"]
   }
   ```

3. **Environment Variables**
   ```
   NODE_ENV=production
   NEXT_PUBLIC_SITE_URL=https://fb-net.vercel.app
   ```

### Netlify

1. **Build Settings**
   ```
   Build command: npm run build
   Publish directory: .next
   Node version: 18
   ```

2. **Environment Variables**
   ```
   NODE_ENV=production
   NETLIFY=true
   ```

## 🏗 Процесс сборки

### Build Script

```bash
npm run build
```

**Что происходит:**
1. **Type Checking** - Проверка TypeScript
2. **Linting** - Проверка ESLint
3. **Static Generation** - Генерация статических страниц
4. **Optimization** - Оптимизация бандлов
5. **Export** - Экспорт статических файлов

### Build Output

```
.next/
├── static/           # Статические файлы
├── server/           # Серверные компоненты
├── app/              # App роуты
├── chunks/           # JS/CSS чанки
└── build-manifest.json
```

## ⚙️ Конфигурация

### Next.js Config

**`next.config.ts`**
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Оптимизации изображений
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },

  // Экспериментальные функции
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Заголовки безопасности
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

### Tailwind Config

**`tailwind.config.ts`**
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'fb-blue': '#2563eb',
        'fb-blue-light': '#eff6ff',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

### Environment Variables

**`.env.local`** (локальная разработка)
```bash
# Next.js
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Analytics (опционально)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_YM_ID=XXXXXXXXXX

# API Keys (для будущих интеграций)
API_KEY_OPENAI=sk-...
API_KEY_STRIPE=sk_...
```

**`.env.production`** (продакшн)
```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://fb-net.vercel.app

# Production API keys
API_KEY_OPENAI=sk-...
API_KEY_STRIPE=sk_...
```

## 🔄 CI/CD

### GitHub Actions

**`.github/workflows/deploy.yml`**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run tests
        run: npm run test

      - name: Build application
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
```

### Pre-deployment Checklist

- [ ] Все тесты проходят
- [ ] Линтинг без ошибок
- [ ] TypeScript без ошибок
- [ ] Сборка проходит успешно
- [ ] Environment variables настроены
- [ ] DNS записи обновлены (при необходимости)
- [ ] SSL сертификат активен

## 📊 Мониторинг

### Vercel Analytics

Автоматически включено в Vercel dashboard:
- Page views
- Core Web Vitals
- Error rates
- Performance metrics

### Custom Analytics

```typescript
// lib/analytics.ts
export const trackEvent = (event: string, data?: any) => {
  if (typeof window !== 'undefined') {
    // Google Analytics
    if (window.gtag) {
      window.gtag('event', event, data);
    }

    // Yandex Metrika
    if (window.ym) {
      window.ym(YM_ID, 'reachGoal', event, data);
    }
  }
};
```

### Error Tracking

```typescript
// lib/error-tracking.ts
export const reportError = (error: Error, context?: any) => {
  console.error('Application Error:', error, context);

  // Send to error tracking service
  // Sentry, LogRocket, etc.
};
```

## 🔒 Безопасность

### Security Headers

```typescript
// next.config.ts
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN'
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin'
        }
      ]
    }
  ]
}
```

### Content Security Policy

```typescript
// next.config.ts
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self'",
          ].join('; ')
        }
      ]
    }
  ]
}
```

## 🌐 Домены и SSL

### Custom Domain Setup

1. **Vercel**
   ```
   Settings > Domains > Add fb.net
   ```

2. **DNS Configuration**
   ```
   CNAME fb-net.vercel.app
   ```

3. **SSL Certificate**
   - Автоматически через Vercel
   - Let's Encrypt интеграция

### Redirects

**`vercel.json`**
```json
{
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "permanent": true
    }
  ]
}
```

## 📈 Оптимизация производительности

### Core Web Vitals

**Целевые показатели:**
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Оптимизации

1. **Images**
   ```typescript
   import Image from 'next/image'

   <Image
     src="/hero.jpg"
     alt="Hero"
     width={1920}
     height={1080}
     priority
   />
   ```

2. **Fonts**
   ```typescript
   // app/layout.tsx
   import { GeistSans } from 'next/font/google'

   const geist = GeistSans({
     subsets: ['latin'],
     display: 'swap',
   })
   ```

3. **Bundle Analysis**
   ```bash
   npm install --save-dev @next/bundle-analyzer

   # В next.config.ts
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   })
   ```

## 🔧 Troubleshooting

### Common Issues

#### Build Errors

```bash
# Очистка кэша
rm -rf .next
npm run build
```

#### Environment Variables

```bash
# Проверка переменных
echo $NODE_ENV
echo $NEXT_PUBLIC_SITE_URL
```

#### Static Generation Issues

```typescript
// Проверка статических путей
export async function generateStaticParams() {
  const items = getAllItems()

  return items.map((item) => ({
    id: item.id.toString(),
  }))
}
```

## 📞 Контакты

- **DevOps**: devops@fb.net
- **Support**: support@fb.net
- **Emergency**: +7 (495) 123-45-67

## 📚 Дополнительные ресурсы

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
- [Web Vitals](https://web.dev/vitals/)
- [Security Headers](https://securityheaders.com/)
