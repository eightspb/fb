# Система стилей FB.NET

## 📋 Обзор

Проект FB.NET использует гибридную систему стилизации, сочетающую преимущества Tailwind CSS и кастомных CSS классов для обеспечения консистентности, поддерживаемости и производительности.

## 🏗 Архитектура стилей

### Файлы стилей

```
src/
├── app/
│   └── globals.css          # Глобальные стили + импорты
└── styles/
    └── components.css       # Компонентные стили
```

### Структура globals.css

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "../styles/components.css";

/* Кастомные переменные и глобальные правила */
@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... другие переменные */
}
```

## 🎨 Принципы стилизации

### 1. Utility-First с кастомными классами

**Tailwind CSS** используется для:
- Базовых утилит (spacing, colors, typography)
- Быстрого прототипирования
- Responsive design

**Кастомные классы** используются для:
- Повторяющихся компонентов
- Сложных стилей
- Консистентности дизайна

### 2. Семантические имена

```css
/* Хорошо */
.page-container
.equipment-features
.breadcrumb-link

/* Плохо */
.container-big
.blue-box
.link-small
```

### 3. BEM-подобная методология

```
.block
.block__element
.block--modifier
```

Применительно к проекту:
```css
.equipment-features     /* Блок */
.equipment-features__card /* Элемент */
.equipment-features--wide  /* Модификатор */
```

## 📚 CSS классы по категориям

### Layout классы

#### Контейнеры страниц
```css
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 4rem;
  padding-bottom: 4rem;
}

.page-max-width {
  max-width: 56rem; /* 896px */
  margin: 0 auto;
}

.page-max-width-wide {
  max-width: 80rem; /* 1280px */
  margin: 0 auto;
}
```

#### Заголовки
```css
.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 2rem;
}
```

### Header стили

```css
.header {
  background-color: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid #e5e7eb;
}

.header-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4rem;
}

.header-logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2563eb;
}

.header-menu {
  display: none; /* Скрыто на мобильных */
}

.header-menu-link {
  color: #374151;
  transition: color 0.15s ease-in-out;
  font-weight: 500;
}

.header-menu-link:hover {
  color: #2563eb;
}
```

### Hero секции

```css
.hero {
  background: linear-gradient(to bottom right, #eff6ff, #e0e7ff);
  padding-top: 5rem;
  padding-bottom: 5rem;
}

.hero-container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
  text-align: center;
}

.hero-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1.5rem;
}

.hero-subtitle {
  font-size: 1.25rem;
  line-height: 1.75rem;
  color: #4b5563;
  margin-bottom: 2rem;
  max-width: 48rem;
  margin-left: auto;
  margin-right: auto;
}

.hero-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
}
```

### Карточки и компоненты

```css
.card-hover {
  transition: box-shadow 0.3s ease-in-out;
}

.card-hover:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.card-content {
  padding: 1.5rem;
}
```

### Breadcrumbs

```css
.breadcrumb {
  margin-bottom: 2rem;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.breadcrumb-link {
  transition: color 0.15s ease-in-out;
}

.breadcrumb-link:hover {
  color: #2563eb;
}

.breadcrumb-current {
  color: #111827;
  font-weight: 500;
}
```

### Специфические стили оборудования

```css
.equipment-purpose {
  margin-bottom: 4rem;
}

.equipment-features {
  margin-bottom: 4rem;
}

.equipment-benefits {
  margin-bottom: 4rem;
}

.equipment-specifications {
  margin-bottom: 4rem;
}
```

### Sidebar стили

```css
.sidebar-card {
  position: sticky;
  top: 2rem;
}

.sidebar-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.sidebar-archive-link {
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  transition: background-color 0.15s ease-in-out;
}

.sidebar-archive-link:hover {
  background-color: #f3f4f6;
}
```

### Footer

```css
.footer {
  background-color: #111827;
  color: white;
  padding-top: 3rem;
  padding-bottom: 3rem;
  margin-top: 4rem;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

.footer-grid {
  display: grid;
  gap: 2rem;
}

.footer-title {
  font-weight: 600;
  margin-bottom: 1rem;
}

.footer-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-link {
  transition: color 0.15s ease-in-out;
}

.footer-link:hover {
  color: #60a5fa;
}
```

## 📱 Адаптивность

### Breakpoints

```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Адаптивные примеры

```css
/* Header меню */
.header-menu {
  display: none; /* Скрыто на мобильных */
}

@media (min-width: 768px) {
  .header-menu {
    display: flex;
    gap: 2rem;
  }
}

/* Hero секция */
.hero-title {
  font-size: 2.25rem; /* Мобильный */
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 3.75rem; /* Десктоп */
  }
}

/* Grid layouts */
.news-grid {
  display: grid;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .news-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
```

## 🎨 Цветовая палитра

### Основные цвета

```css
/* Синие тона (брендовые) */
--primary-blue: #2563eb;
--primary-blue-hover: #1d4ed8;
--light-blue: #eff6ff;
--blue-50: #eff6ff;
--blue-100: #dbeafe;
--blue-600: #2563eb;

/* Серые тона */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;

/* Акцентные цвета */
--green-50: #f0fdf4;
--green-100: #dcfce7;
--green-600: #16a34a;
--red-50: #fef2f2;
--red-100: #fee2e2;
--red-600: #dc2626;
```

### Темная тема (резерв)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #111827;
    --foreground: #e5e7eb;
  }
}
```

## ⚡ Оптимизация производительности

### CSS Bundle анализ

- **Tailwind CSS**: ~10-15kb (в зависимости от использования)
- **Компонентные стили**: ~10-15kb
- **Общий размер**: ~20-30kb gzipped

### Оптимизации

1. **Purge CSS**: Автоматическое удаление неиспользуемых стилей
2. **CSS-in-JS**: Для динамических стилей (минимально)
3. **Critical CSS**: Inlining для above-the-fold контента
4. **Lazy loading**: Для не-critical стилей

## 🔧 Добавление новых стилей

### Процесс добавления

1. **Определить необходимость**: Новый компонент или модификация существующего?
2. **Выбрать подход**: Tailwind классы или кастомный CSS?
3. **Добавить стили**: В соответствующий файл
4. **Протестировать**: На всех breakpoints
5. **Документировать**: Обновить эту документацию

### Шаблон для новых компонентов

```css
/* Компонент: ComponentName */

.component-name {
  /* Базовые стили */
  position: relative;
}

.component-name__title {
  /* Стили заголовка */
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.component-name__content {
  /* Стили контента */
  padding: 1rem;
}

/* Модификаторы */
.component-name--large {
  font-size: 1.5rem;
}

.component-name--centered {
  text-align: center;
}

/* Адаптивность */
@media (min-width: 768px) {
  .component-name {
    padding: 2rem;
  }
}
```

## 📊 Метрики стилей

### CSS Stats

- **Общее количество классов**: ~150
- **Размер components.css**: ~530 строк
- **Coverage**: 95%+ (используемые стили)
- **Specificity**: Низкий (utility-first подход)

### Производительность

- **CSS parsing time**: < 50ms
- **Render blocking**: Минимальный
- **Cumulative layout shift**: < 0.1

## 🧪 Тестирование стилей

### Визуальное тестирование

1. **Cross-browser**: Chrome, Firefox, Safari, Edge
2. **Responsive**: Все breakpoints (320px - 1920px+)
3. **Accessibility**: Контрастность, фокус, семантика

### Автоматизированное тестирование

```bash
# CSS линтинг
npm run lint:css

# Визуальная регрессия
npm run test:visual

# Доступность
npm run test:a11y
```

## 📚 Дополнительные ресурсы

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [CSS Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [CSS Architecture Guidelines](https://cssguidelin.es/)
