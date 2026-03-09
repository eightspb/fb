# Задача: Streaming ответов в AI Ассистенте

## Цель
Заменить текущий блокирующий POST-запрос на Server-Sent Events (SSE), чтобы ответ AI появлялся по мере генерации (как в ChatGPT), а не целиком после ожидания.

---

## Архитектура

### Текущий поток:
```
POST /api/admin/ai-assistant → ждём 10-60 сек → получаем полный ответ
```

### Новый поток:
```
POST /api/admin/ai-assistant/stream → получаем SSE-события:
  event: thinking    → "Анализирую вопрос..."
  event: sql         → { sql: "SELECT ..." }
  event: executing   → "Выполняю запрос..."
  event: sqlResult   → { rows: [...], count: N }
  event: token       → "фрагмент текста ответа"  (повторяется)
  event: done        → { sql, sqlResult }
```

---

## Что создать

### 1. Новый API endpoint: `src/app/api/admin/ai-assistant/stream/route.ts`

**Технология:** `ReadableStream` + SSE (как в `src/app/api/admin/logs/stream/route.ts`)

**Логика:**

```typescript
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 1. Verify admin session
  // 2. Parse { messages } from body
  // 3. Create ReadableStream

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // Stage 1: Send to AI (streaming via fetch with stream: true)
        send('thinking', { message: 'Анализирую вопрос...' });

        // Call Polza.ai/OpenRouter with stream: true
        // Accumulate tokens, send each via 'token' event
        // After full response: extract SQL if present

        // Stage 2: If SQL found
        send('sql', { sql: extractedSql });
        send('executing', { message: 'Выполняю SQL-запрос...' });
        // Execute SQL
        send('sqlResult', { rows, count: rows.length, truncated });

        // Stage 3: Interpretation call (also streaming)
        send('thinking', { message: 'Интерпретирую результаты...' });
        // Stream final answer tokens
        // Each token: send('token', { text: chunk })

        send('done', { sql: executedSql, sqlResult: rows });
      } catch (err) {
        send('error', { message: err.message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // важно для nginx!
    },
  });
}
```

**Вызов AI с потоковой передачей:**
```typescript
const response = await fetch(POLZA_API_URL, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ ...payload, stream: true }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let accumulated = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Parse SSE chunks from OpenAI format: "data: {...}\n\n"
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      const json = JSON.parse(line.slice(6));
      const token = json.choices?.[0]?.delta?.content;
      if (token) {
        accumulated += token;
        send('token', { text: token });
      }
    }
  }
}
```

**Важно:** CSRF-токен нельзя передать в EventSource (GET-only). Решение — передавать в URL как query-param или использовать fetch с ReadableStream на клиенте вместо EventSource.

### 2. Обновить `apps/admin/src/app/ai-assistant/page.tsx`

Заменить `adminCsrfFetch(...)` → `fetch` c `ReadableStream`:

```typescript
const response = await adminCsrfFetch('/api/admin/ai-assistant/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: ... }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

// Добавить стейт: currentStreamText, currentSql
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    if (line.startsWith('event: ')) currentEvent = line.slice(7).trim();
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      handleEvent(currentEvent, data);
    }
  }
}

function handleEvent(event: string, data: any) {
  switch (event) {
    case 'thinking':
      setStatusMessage(data.message); // показать под аватаром AI
      break;
    case 'token':
      setStreamingText(prev => prev + data.text); // обновлять текст в реальном времени
      break;
    case 'sql':
      setCurrentSql(data.sql);
      break;
    case 'sqlResult':
      setStatusMessage(`Найдено ${data.count} строк`);
      break;
    case 'done':
      finalize(); // зафиксировать сообщение, сбросить streaming-стейт
      break;
    case 'error':
      showError(data.message);
      break;
  }
}
```

**UI-изменения:**
- Пока стримим: показывать текст по мере появления с мигающим курсором `|`
- Строка статуса под индикатором загрузки: "Анализирую вопрос...", "Выполняю SQL...", "Интерпретирую..."
- SQL-блок появляется сразу как найден (до завершения)

---

## Паттерны проекта (соблюдать)

- Смотреть `src/app/api/admin/logs/stream/route.ts` — готовый пример SSE в проекте
- `export const runtime = 'nodejs'` обязателен
- CSRF через `adminCsrfFetch` (fetch POST, не EventSource)
- Heartbeat каждые 30 сек: `send('heartbeat', {})` чтобы nginx не закрывал соединение

## НЕ делать
- Не использовать `EventSource` (не поддерживает POST и CSRF)
- Не добавлять внешние SSE-библиотеки
- Не менять существующий `/api/admin/ai-assistant` endpoint (оставить как fallback)
