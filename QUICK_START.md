# Быстрый старт

## Запуск для разработки

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

Создайте `.env.local`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 3. Запуск БД (Docker)

```bash
npm run docker:up
```

### 4. Запуск приложения

```bash
npm run dev
```

Откройте http://localhost:3000

---

## Работа без БД

Приложение может работать без базы данных - данные будут загружаться из fallback источников.

```bash
npm run dev
```

---

## Проверка работы

1. Откройте http://localhost:3000
2. Перейдите на страницу `/news`
3. Если данные загружаются - всё работает

---

## Остановка

```bash
# Остановить Docker контейнеры
npm run docker:down

# Остановить dev сервер - Ctrl+C
```
