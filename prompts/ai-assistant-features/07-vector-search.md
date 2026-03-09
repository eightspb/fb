# Задача: Векторный поиск по заметкам контактов

## Цель
Семантический поиск по `contact_notes.content` через embeddings. "Найди контакты, где упоминается онкология" — находит даже если слово "онкология" не встречается дословно. Использовать `pgvector` расширение PostgreSQL.

---

## Архитектура

```
Индексация (фоновый скрипт):
contact_notes.content → embedding API → vector → contact_embeddings таблица

Поиск:
запрос пользователя → embedding API → vector → cosine similarity → топ N заметок
```

---

## Этап 1: Инфраструктура БД

### Миграция `migrations/009_vector_search.sql`

```sql
-- Включить pgvector расширение
CREATE EXTENSION IF NOT EXISTS vector;

-- Таблица векторов заметок
CREATE TABLE IF NOT EXISTS contact_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES contact_notes(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,  -- размер для text-embedding-3-small
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  content_hash TEXT NOT NULL,  -- md5 контента, чтобы не переиндексировать
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS contact_embeddings_note_id_idx
  ON contact_embeddings(note_id);

-- Индекс для cosine similarity поиска
CREATE INDEX IF NOT EXISTS contact_embeddings_vector_idx
  ON contact_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Функция поиска (для удобства)
CREATE OR REPLACE FUNCTION search_notes(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.3,
  max_results int DEFAULT 20
)
RETURNS TABLE (
  note_id UUID,
  contact_id UUID,
  similarity float
) AS $$
  SELECT ce.note_id, ce.contact_id,
         1 - (ce.embedding <=> query_embedding) as similarity
  FROM contact_embeddings ce
  WHERE 1 - (ce.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT max_results;
$$ LANGUAGE sql STABLE;
```

**Важно:** Обновить `database-schema.sql` после применения миграции.

---

## Этап 2: Функция получения embeddings

### Добавить в `src/lib/openrouter.ts`

```typescript
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-small',
      input: text.slice(0, 8000),  // лимит токенов
    }),
  });

  if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);
  const data = await response.json() as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data[0].embedding;
}
```

---

## Этап 3: Скрипт индексации

### `scripts/index-embeddings.ts`

```typescript
// Запуск: bun scripts/index-embeddings.ts
// Индексирует все contact_notes, которые ещё не имеют embedding

import { Pool } from 'pg';
import { createHash } from 'crypto';
import { getEmbedding } from '../src/lib/openrouter';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const CONCURRENCY = 3;  // параллельных запросов к API

async function indexNote(noteId: string, content: string, contactId: string) {
  const hash = createHash('md5').update(content).digest('hex');

  // Проверить: уже проиндексировано с тем же хешем?
  const existing = await pool.query(
    'SELECT content_hash FROM contact_embeddings WHERE note_id = $1', [noteId]
  );
  if (existing.rows[0]?.content_hash === hash) {
    return 'skipped';
  }

  const embedding = await getEmbedding(content);
  const vectorStr = `[${embedding.join(',')}]`;

  await pool.query(`
    INSERT INTO contact_embeddings (note_id, contact_id, embedding, content_hash)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (note_id) DO UPDATE
      SET embedding = $3, content_hash = $4, created_at = NOW()
  `, [noteId, contactId, vectorStr, hash]);

  return 'indexed';
}

// Батчевая обработка с concurrency
const { rows: notes } = await pool.query(`
  SELECT cn.id, cn.content, cn.contact_id
  FROM contact_notes cn
  LEFT JOIN contact_embeddings ce ON ce.note_id = cn.id
  WHERE ce.id IS NULL
     OR ce.content_hash != md5(cn.content)
  ORDER BY cn.created_at DESC
`);

console.log(`Найдено ${notes.length} заметок для индексации`);
// ... батчевая обработка аналогично research-contacts-without-notes.ts
```

---

## Этап 4: API endpoint для поиска

### `src/app/api/admin/contacts/semantic-search/route.ts`

```typescript
// POST /api/admin/contacts/semantic-search
// Body: { query: string, limit?: number, threshold?: number }
// Response: { contacts: Array<{ contact: Contact, note: Note, similarity: number }> }

export async function POST(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { query, limit = 10, threshold = 0.3 } = await request.json();
  if (!query?.trim()) return NextResponse.json({ error: 'query required' }, { status: 400 });

  const queryEmbedding = await getEmbedding(query);
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  const { rows } = await pool.query(`
    SELECT
      c.id, c.full_name, c.city, c.speciality, c.institution,
      cn.id as note_id, cn.title as note_title,
      cn.content as note_content, cn.source as note_source,
      1 - (ce.embedding <=> $1::vector) as similarity
    FROM contact_embeddings ce
    JOIN contact_notes cn ON cn.id = ce.note_id
    JOIN contacts c ON c.id = ce.contact_id
    WHERE 1 - (ce.embedding <=> $1::vector) > $2
    ORDER BY ce.embedding <=> $1::vector
    LIMIT $3
  `, [vectorStr, threshold, limit]);

  return NextResponse.json({ results: rows });
}
```

---

## Этап 5: Интеграция в AI Ассистент

Добавить правило в system prompt:
```
12. Если пользователь ищет что-то по смыслу/теме в заметках (не точное слово),
    используй функцию semantic_search. Запрос оформляй как:
    ```semantic_search
    {"query": "поисковый запрос", "limit": 10}
    ```
```

В API endpoint обрабатывать `semantic_search` блок аналогично SQL-блоку.

---

## Стоимость и ограничения

- `text-embedding-3-small` через OpenRouter: ~$0.02 за 1M токенов (~2000 заметок за ~$0.01)
- Нужно: `pgvector` расширение в Docker контейнере PostgreSQL
- В `docker-compose.ssl.yml` изменить образ: `image: pgvector/pgvector:pg16` (вместо `postgres:16`)
- При первом запуске скрипта индексации — занять 30-60 минут для 2000 заметок

## НЕ делать
- Не хранить embeddings в Redis или отдельном сервисе
- Не использовать OpenAI напрямую (только через OpenRouter)
- Не запускать индексацию синхронно в API — только фоновый скрипт
