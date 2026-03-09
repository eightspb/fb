# Задача: Экспорт CSV из результатов AI Ассистента

## Цель
Когда AI выполняет SQL и возвращает табличные данные, показать кнопку "Скачать CSV" прямо под ответом. Работает полностью на клиенте — никаких новых API endpoints.

---

## Что изменить

### Только один файл: `apps/admin/src/app/ai-assistant/page.tsx`

#### 1. Расширить интерфейс `ChatMessage`

```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  sqlResult?: Record<string, unknown>[];  // ← добавить
}
```

#### 2. Сохранять `sqlResult` при получении ответа

```typescript
// В обработчике ответа API:
setMessages(prev => [...prev, {
  role: 'assistant',
  content: data.reply || '',
  sql: data.sql,
  sqlResult: data.sqlResult,  // ← добавить
}]);
```

#### 3. Функция конвертации в CSV

```typescript
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    // Если содержит запятую, кавычку или перенос — обернуть в кавычки
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  // BOM для корректного отображения кириллицы в Excel
  const bom = '\uFEFF';
  const csv = bom + toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

#### 4. Кнопка в `MessageBubble`

Добавить под SQL-блоком (или вместо него, если нет SQL):

```typescript
{message.sqlResult && message.sqlResult.length > 0 && (
  <button
    onClick={() => downloadCSV(
      message.sqlResult!,
      `export-${new Date().toISOString().slice(0,10)}.csv`
    )}
    style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 8, fontSize: '0.8em',
      border: '1px solid var(--frox-gray-200)',
      background: 'white', cursor: 'pointer',
      color: 'var(--frox-gray-600)',
      width: 'fit-content',
    }}
  >
    <Download size={13} />
    Скачать CSV ({message.sqlResult.length} строк)
  </button>
)}
```

Добавить `Download` в импорт из `lucide-react`.

#### 5. Кнопка "Копировать таблицу" (бонус)

```typescript
async function copyAsTable(rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join('\t'),
    ...rows.map(row => headers.map(h => String(row[h] ?? '')).join('\t')),
  ];
  await navigator.clipboard.writeText(lines.join('\n'));
  // Показать toast "Скопировано!" на 2 секунды
}
```

---

## Особенности

- **BOM (`\uFEFF`)** в начале файла обязателен — иначе Excel не откроет кириллицу
- Экранирование полей с запятыми и кавычками по RFC 4180
- Имя файла: `export-YYYY-MM-DD.csv` (берём дату из `new Date()`)
- Кнопка появляется только если `sqlResult.length > 0`
- Сообщение AI с `sqlResult` приходит уже сейчас в ответе API — нужно только передать его в компонент

## НЕ делать
- Не создавать новые API endpoints
- Не добавлять библиотеки (papa-parse и т.п.)
- Не менять API endpoint — он уже возвращает `sqlResult`
