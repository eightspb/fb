# Система логирования

Система логирования для админ панели, которая автоматически перехватывает все логи из консоли и сохраняет их в базу данных для просмотра в реальном времени.

## Возможности

- ✅ Автоматический перехват `console.log`, `console.error`, `console.warn`, `console.debug`
- ✅ Сохранение логов в PostgreSQL с метаданными (IP, User-Agent, путь запроса)
- ✅ Просмотр логов в реальном времени через Server-Sent Events (SSE)
- ✅ Фильтрация по уровню (info, warn, error, debug) и контексту
- ✅ Экспорт логов в JSON
- ✅ Очистка старых логов

## Установка

### 1. Создание таблицы в БД

Таблица `app_logs` автоматически создается при применении `database-schema.sql`. Если таблица еще не создана, выполните:

```sql
CREATE TABLE IF NOT EXISTS app_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  context TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_context ON app_logs(context);
CREATE INDEX IF NOT EXISTS idx_app_logs_path ON app_logs(path);
```

### 2. Установка зависимостей (если нужно)

Если вы хотите использовать компонент Select из Radix UI (опционально):

```bash
bun add @radix-ui/react-select
```

**Примечание:** Страница логов использует обычный HTML `<select>`, поэтому эта зависимость не обязательна.

## Использование

### Просмотр логов

1. Войдите в админ панель
2. Перейдите в раздел **"Логи"** в меню
3. Логи будут автоматически обновляться в реальном времени

### Фильтрация

- **Уровень:** Фильтр по типу лога (info, warn, error, debug)
- **Контекст:** Фильтр по контексту (например, [API], [Auth], [Database])

### Функции

- **Автообновление:** Включено по умолчанию, обновляет логи каждые 500мс
- **Экспорт:** Скачивает все видимые логи в формате JSON
- **Очистка:** Удаляет логи старше 30 дней

## API Endpoints

### GET /api/admin/logs

Получение логов с фильтрацией.

**Параметры:**
- `level` - уровень лога (info, warn, error, debug)
- `context` - контекст лога
- `limit` - количество записей (по умолчанию 100, максимум 1000)
- `offset` - смещение для пагинации
- `startDate` - начальная дата (ISO string)
- `endDate` - конечная дата (ISO string)

**Пример:**
```bash
GET /api/admin/logs?level=error&limit=50
```

### GET /api/admin/logs/stream

Server-Sent Events поток для получения логов в реальном времени.

**Использование:**
```javascript
const eventSource = new EventSource('/api/admin/logs/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'log') {
    console.log('Новый лог:', data.data);
  }
};
```

### DELETE /api/admin/logs

Очистка старых логов.

**Параметры:**
- `days` - количество дней (по умолчанию 30)

**Пример:**
```bash
DELETE /api/admin/logs?days=7
```

## Программное использование

### Ручное логирование

```typescript
import { log } from '@/lib/logger';

// Логирование с контекстом
log('info', 'Пользователь залогинился', { userId: 123 }, 'Auth');

// Логирование ошибки
log('error', 'Ошибка подключения к БД', { error: error.message }, 'Database');
```

### Получение логов

```typescript
import { getLogs } from '@/lib/logger';

const { logs, total } = await getLogs({
  level: 'error',
  context: 'API',
  limit: 50,
});
```

## Структура лога

```typescript
interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: string;        // Контекст из [Context] в сообщении
  metadata?: Record<string, any>;  // Дополнительные данные
  ip?: string;            // IP адрес запроса
  userAgent?: string;     // User-Agent браузера
  path?: string;          // Путь запроса
  timestamp: Date;         // Время создания
}
```

## Контексты

Система автоматически извлекает контекст из сообщений в формате `[Context]`:

```typescript
console.log('[API] Запрос получен');  // context = 'API'
console.error('[Auth] Ошибка входа'); // context = 'Auth'
```

## Производительность

- **Батчинг:** Логи сохраняются батчами каждые 2 секунды или при достижении 50 записей
- **Индексы:** Все важные поля проиндексированы для быстрого поиска
- **Очистка:** Автоматическая очистка логов старше 30 дней (функция `cleanup_old_logs()`)

## Безопасность

- Все API endpoints требуют авторизации через cookie `admin-session`
- Логи не содержат чувствительных данных (пароли, токены автоматически не логируются)
- Доступ к логам только через админ панель

## Мониторинг

Система логирования интегрирована с существующей системой обработки ошибок:
- Критические ошибки автоматически отправляются в Telegram (через `telegram-notifications`)
- Все логи сохраняются в БД для последующего анализа

## Очистка старых логов

Для автоматической очистки можно настроить cron задачу:

```sql
-- Очистка логов старше 30 дней
SELECT cleanup_old_logs();
```

Или использовать API:
```bash
DELETE /api/admin/logs?days=30
```
