import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { researchContactWithAI, getEmbedding } from '@/lib/openrouter';
import { indexNoteEmbedding } from '@/lib/embedding-utils';
import { syncAll } from '@/lib/imap-client';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const COOKIE_NAME = 'admin-session';

const POLZA_API_URL = 'https://polza.ai/api/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const STOP_WORDS = new Set([
  'Покажи', 'Найди', 'Расскажи', 'Информация', 'Данные', 'Контакт', 'Переписка',
  'Заметки', 'Что', 'Кто', 'Как', 'Где', 'Когда', 'Сколько', 'Какие', 'Какой',
  'Какая', 'Все', 'Вся', 'Про', 'Для', 'Email', 'Статистика', 'Последние',
  'Новые', 'Старые', 'Подробнее', 'Список', 'Доктор', 'Доктору', 'Доктора',
  'Врач', 'Врачу', 'Врача', 'Профессор', 'Профессору', 'Профессора',
  'Информацию', 'Контакты', 'Контакту', 'Контактов', 'Есть', 'Нужно',
  'Можно', 'Пожалуйста', 'Подробности', 'Ищу', 'Найти', 'Показать',
  'Расскажите', 'Покажите', 'Выведи', 'Выведите', 'Напиши', 'Дай',
]);

/**
 * Get a stem for Russian name suitable for ILIKE search.
 * Instead of trying to precisely strip case endings (error-prone),
 * we strip the last 1-2 chars for words > 5 chars to get a fuzzy stem.
 * The ILIKE '%stem%' will then match all case forms.
 * E.g. "Скурихину" → "Скурихи" → ILIKE '%Скурихи%' matches "Скурихин"
 */
function getStemForSearch(word: string): string {
  if (word.length <= 5) return word;
  // For longer words, strip last 2 chars to handle endings like -ну, -на, -ым, etc.
  // This is aggressive but safe because we use ILIKE '%stem%'
  return word.slice(0, -2);
}

/**
 * Extract name candidates from a Russian text message.
 * Returns stemmed words suitable for ILIKE search.
 */
function extractNameCandidates(text: string): string[] {
  // Match words starting with uppercase Cyrillic, 3+ chars
  const namePatterns = text.match(/[А-ЯЁ][а-яё]{2,}/g);
  if (!namePatterns) return [];
  return namePatterns
    .filter(w => !STOP_WORDS.has(w) && w.length >= 3)
    .map(w => getStemForSearch(w));
}

async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

const DB_SCHEMA = `
-- contacts (основная CRM таблица, ~2000 записей)
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  institution TEXT,
  speciality TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'archived', -- new | in_progress | processed | archived
  notes TEXT,
  import_source TEXT DEFAULT 'tilda',
  source_urls TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  form_type TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- new | processed | archived
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
  type TEXT NOT NULL,
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
  direction TEXT NOT NULL, -- inbound | outbound
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  subject TEXT,
  body_text TEXT,
  contact_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- contact_embeddings (векторы заметок для семантического поиска, pgvector)
CREATE TABLE contact_embeddings (
  id UUID PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES contact_notes(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL, -- text-embedding-3-small
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Для семантического поиска используй блок \`\`\`semantic_search\`\`\`, а не SQL по этой таблице напрямую.
`.trim();

const SYSTEM_PROMPT = `Ты — AI-ассистент CRM-системы для медицинского оборудования (компания ЗЕНИТ МЕД / fibroadenoma.net).
База содержит контакты врачей и медицинских специалистов, заявки с сайта, мероприятия, аналитику посещений и email-переписку.

КАК ТЫ РАБОТАЕШЬ — ОЧЕНЬ ВАЖНО:
Ты подключён к реальной базе данных. Когда тебе нужны данные — ты пишешь SQL-запрос внутри блока \`\`\`sql ... \`\`\`, система АВТОМАТИЧЕСКИ выполняет его и возвращает тебе результат. После этого ты интерпретируешь результат и отвечаешь пользователю.
НИКОГДА не говори пользователю "вот SQL-запрос, выполните его". Пользователь не видит SQL — он видит только твой финальный ответ с данными. SQL выполняется автоматически за кулисами.

ПРАВИЛА:
1. Отвечай на русском языке
2. Если для ответа нужны данные из БД — пиши SQL в блоке \`\`\`sql ... \`\`\` и жди результата. После получения результата отвечай с реальными данными.
3. ТОЛЬКО SELECT-запросы. НИКОГДА не генерируй INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE
4. Всегда добавляй LIMIT (максимум 100), если пользователь не указал конкретное количество
5. Для поиска по тексту используй ILIKE с %шаблон%
6. Для работы с тегами используй ANY (например: 'тег' = ANY(tags))
7. Если результат пустой — скажи об этом, не придумывай данные
8. Если вопрос не связан с БД — отвечай как обычный помощник
9. При ошибке SQL объясни что пошло не так
10. Когда пользователь спрашивает о конкретном контакте, тебе автоматически предоставляются данные из CRM (карточка, заметки, переписка, заявки) в системном сообщении. Используй эти данные для ответа, не делай SQL-запрос если ответ уже есть. Если данных недостаточно — дополни SQL-запросом.
11. Если результат — рейтинг, топ или распределение (топ городов, статистика тегов, источники трафика, динамика по дням/неделям) — добавь в конец ответа блок с данными для графика:
    \`\`\`chart
    {"type":"horizontal-bar","title":"Название графика","labels":["A","B","C"],"values":[100,50,25]}
    \`\`\`
    Используй "horizontal-bar" для рейтингов и распределений, "bar" для временных рядов. Максимум 15 элементов.
    НЕ добавляй chart-блок если данные не подходят для графика (например, одна цифра, карточка контакта, текстовый ответ).
12. СЕМАНТИЧЕСКИЙ ПОИСК по заметкам контактов. Если пользователь ищет контакты по теме, смыслу, области деятельности или специализации в заметках (не точное слово, а по смыслу) — используй семантический поиск. Напиши блок:
    \`\`\`semantic_search
    {"query": "поисковый запрос на русском или английском", "limit": 10}
    \`\`\`
    Система автоматически выполнит семантический поиск по всем заметкам контактов и вернёт результаты.
    Примеры когда использовать: "найди контакты связанные с онкологией", "кто занимается маммографией", "контакты из области лучевой диагностики".
    НЕ используй semantic_search для точных запросов (по имени, городу, email) — для них используй SQL с ILIKE.

ЗАПРЕЩЕНО:
- Говорить "вот запрос, который вы можете выполнить"
- Говорить "запустите этот SQL"
- Предлагать пользователю самому выполнять что-либо в базе данных
- Отвечать без реальных данных, если вопрос предполагает запрос к БД

КНОПКИ — ОБЯЗАТЕЛЬНЫЙ ФОРМАТ:
ВАЖНО: Если ты предлагаешь пользователю выбрать вариант или задаёшь уточняющий вопрос — ты ОБЯЗАН использовать кнопки [[btn:...]]. НИКОГДА не перечисляй варианты маркированным или нумерованным списком — это запрещено. Только кнопки.

Формат: [[btn:Текст кнопки]] — каждая кнопка на отдельной строке после текста ответа.

ОБЯЗАТЕЛЬНО добавляй кнопки в этих случаях:
- Если нашёл несколько контактов и просишь уточнить — кнопка для каждого: [[btn:Скурихин Иван Петрович]]
- Если просишь уточнить что именно показать — [[btn:Показать переписку]] [[btn:Показать заметки]] [[btn:Показать заявки]]
- После показа карточки контакта — [[btn:Показать всю переписку]] [[btn:Показать заявки]] [[btn:Похожие контакты]]
- Если предлагаешь варианты фильтрации или следующих шагов

ЗАПРЕЩЕНО: перечислять варианты действий обычным текстом или списком — только [[btn:...]]
Максимум 5 кнопок. Минимум — 0 (если нет вариантов выбора).

ФОРМАТИРОВАНИЕ — ОЧЕНЬ ВАЖНО:
- Всегда структурируй ответы красиво и наглядно
- Используй эмодзи-метки для полей. НИКОГДА не используй **звёздочки** для названий полей — только эмодзи
- Таблицы для табличных данных (Markdown: |col1|col2|)
- Нумерованные и маркированные списки для перечислений
- Короткие абзацы, не стены текста
- Эмодзи-словарь: 📊 статистика, 👤 контакт/ФИО, 📧 email, 📝 заметки, 🏥 учреждение, 📍 город, 📋 заявки, ⭐ важное, ✅ готово, ❌ ошибка, 📈 тренды, 🔍 поиск, 📞 телефон, 🏷️ теги, 🩺 специальность, 📅 дата, 🆔 статус

ПРИМЕР карточки контакта (СТРОГО следуй этому формату, НЕ используй таблицу):
👤 Найден контакт в CRM

👤 ФИО: Иванов Иван Иванович
📧 Email: ivanov@mail.ru
📞 Телефон: +79001234567
📍 Город: Москва
🏥 Учреждение: НМИЦ онкологии
🩺 Специальность: Онколог-маммолог
🆔 Статус: new
📅 Обновлён: 01.01.2026

ЗАПРЕЩЕНО в форматировании:
- **двойные звёздочки** для названий полей — ТОЛЬКО эмодзи-метки как в примере
- Таблица для карточки одного контакта — используй список с эмодзи
- Писать **ФИО**, **Email** — пиши 👤 ФИО:, 📧 Email:

СХЕМА БД:
${DB_SCHEMA}`;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

async function callAI(messages: Message[]): Promise<string> {
  const polzaKey = process.env.POLZA_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  // Try Polza.ai (GPT-5.4) first
  if (polzaKey && polzaKey.trim().length > 0) {
    try {
      const response = await fetch(POLZA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${polzaKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-5.4',
          messages,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok) {
        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          return content.trim();
        }
      }
    } catch (err) {
      console.warn('[AI Assistant] Polza.ai failed, falling back to OpenRouter:', err);
    }
  }

  // Fallback: OpenRouter Claude Sonnet 4
  if (!openrouterKey || openrouterKey.trim().length === 0) {
    throw new Error('Нет доступных AI-провайдеров');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'FB.net AI Assistant',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      messages,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Пустой ответ от AI');
  return content.trim();
}

function extractSql(text: string): string | null {
  const match = text.match(/```sql\s*([\s\S]*?)\s*```/i);
  if (!match) return null;
  return match[1].trim();
}

function extractSemanticSearch(text: string): { query: string; limit: number } | null {
  const match = text.match(/```semantic_search\s*([\s\S]*?)\s*```/i);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim()) as { query?: string; limit?: number };
    if (!parsed.query?.trim()) return null;
    return {
      query: parsed.query.trim(),
      limit: Math.min(Math.max(1, parsed.limit || 10), 50),
    };
  } catch {
    return null;
  }
}

function ensureLimit(sql: string): string {
  if (/\bLIMIT\b/i.test(sql)) return sql;
  return sql.replace(/;?\s*$/, ' LIMIT 100');
}

export async function POST(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { messages?: Array<{ role: 'user' | 'assistant'; content: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const lastUserMsg = messages[messages.length - 1]?.content || '';

        // Detect if a contact is mentioned — if so, start enrichment with live progress
        const uuidMatch = lastUserMsg.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const nameCandidates = extractNameCandidates(lastUserMsg);
        const mightMentionContact = !!(uuidMatch || nameCandidates.length >= 1);

        if (mightMentionContact) {
          sendEvent('action', { text: '🔍 Ищу контакт в базе данных...' });
        }

        let enrichmentResult: { context: string; actionsPerformed: string[]; contactIds: string[] } | null = null;

        // Override enrichWithContactContext to emit live action events
        enrichmentResult = await enrichWithContactContextStreaming(lastUserMsg, (actionText) => {
          sendEvent('action', { text: actionText });
        });

        const aiMessages: Message[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ];

        if (enrichmentResult) {
          const enrichmentMsg: Message = {
            role: 'system',
            content: `КОНТЕКСТ: Ниже — данные из CRM о контакте, упомянутом пользователем. Используй эту информацию для ответа. Не нужно делать SQL-запрос, если ответ уже есть в этих данных.\n\n${enrichmentResult.context}`,
          };
          aiMessages.splice(aiMessages.length - 1, 0, enrichmentMsg);
        }

        sendEvent('action', { text: '🤖 Формирую ответ...' });

        const firstReply = await callAI(aiMessages);
        const rawSql = extractSql(firstReply);
        const semanticSearch = extractSemanticSearch(firstReply);

        // --- Semantic search path ---
        if (semanticSearch) {
          sendEvent('action', { text: `🔮 Семантический поиск: "${semanticSearch.query}"...` });

          let searchRows: unknown[];
          try {
            const queryEmbedding = await getEmbedding(semanticSearch.query);
            const vectorStr = `[${queryEmbedding.join(',')}]`;

            const client = await pool.connect();
            try {
              await client.query("SET statement_timeout = '15s'");
              const result = await client.query(`
                SELECT
                  c.id, c.full_name, c.city, c.speciality, c.institution,
                  cn.id as note_id, cn.title as note_title,
                  LEFT(cn.content, 300) as note_content, cn.source as note_source,
                  ROUND((1 - (ce.embedding <=> $1::vector))::numeric, 3) as similarity
                FROM contact_embeddings ce
                JOIN contact_notes cn ON cn.id = ce.note_id
                JOIN contacts c ON c.id = ce.contact_id
                WHERE 1 - (ce.embedding <=> $1::vector) > 0.3
                ORDER BY ce.embedding <=> $1::vector
                LIMIT $2
              `, [vectorStr, semanticSearch.limit]);
              searchRows = result.rows;
            } finally {
              client.release();
            }
          } catch (searchErr) {
            const msg = searchErr instanceof Error ? searchErr.message : String(searchErr);
            sendEvent('reply', {
              reply: firstReply + `\n\n❌ Ошибка семантического поиска: ${msg}`,
              actionsPerformed: enrichmentResult?.actionsPerformed ?? [],
            });
            controller.close();
            return;
          }

          sendEvent('action', { text: `📊 Найдено ${searchRows.length} результатов, интерпретирую...` });

          const followUpMessages: Message[] = [
            ...aiMessages,
            { role: 'assistant', content: firstReply },
            {
              role: 'user',
              content: `[СИСТЕМА] Семантический поиск выполнен автоматически по запросу "${semanticSearch.query}". Результат (${searchRows.length} контактов):\n${JSON.stringify(searchRows, null, 2)}\n\nТеперь дай пользователю финальный ответ. Перечисли найденных контактов с указанием релевантности (similarity) и фрагмента заметки. Не упоминай семантический поиск — просто представь найденных контактов.`,
            },
          ];

          const finalReply = await callAI(followUpMessages);

          sendEvent('reply', {
            reply: finalReply,
            sqlResult: searchRows,
            actionsPerformed: enrichmentResult?.actionsPerformed ?? [],
            contactIds: (searchRows as Array<Record<string, unknown>>)
              .map(r => r.id as string)
              .filter((id, i, arr) => arr.indexOf(id) === i),
          });
          controller.close();
          return;
        }

        // --- SQL path ---
        if (!rawSql) {
          sendEvent('reply', {
            reply: firstReply,
            actionsPerformed: enrichmentResult?.actionsPerformed ?? [],
            contactIds: enrichmentResult?.contactIds ?? [],
          });
          controller.close();
          return;
        }

        if (!/^\s*(SELECT|WITH)\b/i.test(rawSql)) {
          sendEvent('reply', {
            reply: firstReply + '\n\n⚠️ Запрос отклонён: разрешены только SELECT-запросы.',
            sql: rawSql,
            actionsPerformed: enrichmentResult?.actionsPerformed ?? [],
          });
          controller.close();
          return;
        }

        const safeSql = ensureLimit(rawSql);
        sendEvent('action', { text: '🗄️ Выполняю SQL-запрос к базе данных...' });

        const client = await pool.connect();
        let rows: unknown[];
        let truncated = false;

        try {
          await client.query("SET statement_timeout = '10s'");
          const result = await client.query(safeSql);
          rows = result.rows;
          if (rows.length > 50) {
            rows = rows.slice(0, 50);
            truncated = true;
          }
        } catch (sqlError) {
          const msg = sqlError instanceof Error ? sqlError.message : String(sqlError);
          sendEvent('reply', {
            reply: firstReply + `\n\n❌ Ошибка выполнения SQL: ${msg}`,
            sql: safeSql,
            actionsPerformed: enrichmentResult?.actionsPerformed ?? [],
          });
          controller.close();
          return;
        } finally {
          client.release();
        }

        sendEvent('action', { text: `📊 Получено ${rows.length} строк, интерпретирую результат...` });

        const truncationNote = truncated ? ' (показаны первые 50 из большего числа строк)' : '';
        const followUpMessages: Message[] = [
          ...aiMessages,
          { role: 'assistant', content: firstReply },
          {
            role: 'user',
            content: `[СИСТЕМА] SQL выполнен автоматически. Результат (${rows.length} строк${truncationNote}):\n${JSON.stringify(rows, null, 2)}\n\nТеперь дай пользователю финальный ответ с реальными данными из результата. Не упоминай SQL, не предлагай выполнить что-либо — просто отвечай как если бы ты знал эти данные.`,
          },
        ];

        const finalReply = await callAI(followUpMessages);

        sendEvent('reply', {
          reply: finalReply,
          sql: safeSql,
          sqlResult: rows,
          actionsPerformed: enrichmentResult?.actionsPerformed ?? [],
          contactIds: enrichmentResult?.contactIds ?? [],
        });

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[AI Assistant] Error:', err);
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Версия enrichWithContactContext с колбэком для стриминга прогресса.
 */
async function enrichWithContactContextStreaming(
  lastUserMessage: string,
  onAction: (text: string) => void
): Promise<{ context: string; actionsPerformed: string[]; contactIds: string[] } | null> {
  const uuidMatch = lastUserMessage.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

  let contactRows: Array<Record<string, unknown>> = [];
  const client = await pool.connect();

  try {
    await client.query("SET statement_timeout = '10s'");

    if (uuidMatch) {
      const result = await client.query(
        `SELECT id, full_name, email, phone, city, institution, speciality, tags, status, created_at
         FROM contacts WHERE id = $1 LIMIT 1`,
        [uuidMatch[0]]
      );
      contactRows = result.rows;
    }

    if (contactRows.length === 0) {
      const candidates = extractNameCandidates(lastUserMessage);
      if (candidates.length === 0) return null;

      const conditions = candidates.map((_, i) => `full_name ILIKE $${i + 1}`).join(' AND ');
      const params = candidates.map(c => `%${c}%`);

      const result = await client.query(
        `SELECT id, full_name, email, phone, city, institution, speciality, tags, status, created_at
         FROM contacts WHERE ${conditions} LIMIT 5`,
        params
      );
      contactRows = result.rows;
    }

    if (contactRows.length === 0) return null;

    const actionsPerformed: string[] = [];
    const parts: string[] = [];

    for (const contact of contactRows.slice(0, 3)) {
      const cId = contact.id as string;

      if (contactRows.length > 1) {
        onAction(`📋 Загружаю данные контакта: **${contact.full_name}**`);
      }

      const contactInfo = Object.entries(contact)
        .filter(([, v]) => v !== null && v !== '' && v !== undefined)
        .map(([k, v]) => `  ${k}: ${Array.isArray(v) ? (v as string[]).join(', ') : String(v)}`)
        .join('\n');

      parts.push(`📋 Карточка контакта:\n${contactInfo}`);

      // Проверяем наличие ai_research заметок
      const aiResearchCountResult = await client.query(
        `SELECT count(*)::int as cnt FROM contact_notes WHERE contact_id = $1 AND source = 'ai_research'`,
        [cId]
      );
      const hasAiResearch = (aiResearchCountResult.rows[0]?.cnt || 0) > 0;

      if (!hasAiResearch && contact.full_name && String(contact.full_name).trim().length > 0) {
        onAction(`🔍 AI-исследование для **${contact.full_name}** не найдено — запускаю...`);
        try {
          const researchResult = await researchContactWithAI({
            full_name: String(contact.full_name),
            city: contact.city ? String(contact.city) : undefined,
            institution: contact.institution ? String(contact.institution) : undefined,
            speciality: contact.speciality ? String(contact.speciality) : undefined,
            phone: contact.phone ? String(contact.phone) : undefined,
            email: contact.email ? String(contact.email) : undefined,
          });
          const now = new Date().toLocaleDateString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          });
          // Delete previous ai_research notes (replace, not duplicate)
          await client.query(
            `DELETE FROM contact_notes WHERE contact_id = $1 AND source = 'ai_research'`,
            [cId]
          );
          const noteResult = await client.query(
            `INSERT INTO contact_notes (contact_id, title, content, source, metadata)
             VALUES ($1, $2, $3, 'ai_research', $4)
             RETURNING id`,
            [cId, `AI Исследование (${now})`, researchResult, JSON.stringify({ model: 'perplexity/sonar-pro', auto: true, timestamp: new Date().toISOString() })]
          );

          // Fire-and-forget embedding indexing
          void indexNoteEmbedding(noteResult.rows[0].id, researchResult, cId);

          onAction(`✅ AI-исследование завершено и сохранено`);
          actionsPerformed.push(`🔍 Проведено AI-исследование для **${contact.full_name}**`);
        } catch (researchErr) {
          console.warn(`[AI Assistant] Auto-research failed for ${cId}:`, researchErr);
          onAction(`⚠️ Не удалось выполнить AI-исследование`);
          actionsPerformed.push(`⚠️ Не удалось выполнить AI-исследование для **${contact.full_name}**`);
        }
      }

      // Проверяем наличие писем
      if (contact.email) {
        const emailCountResult = await client.query(
          `SELECT count(*)::int as cnt FROM crm_emails WHERE contact_email = $1`,
          [contact.email]
        );
        const emailCount = emailCountResult.rows[0]?.cnt || 0;

        if (emailCount === 0) {
          onAction(`📬 Писем для **${contact.full_name}** нет — синхронизирую почту...`);
          try {
            await syncAll();
            onAction(`✅ Синхронизация почты завершена`);
            actionsPerformed.push(`📬 Выполнена синхронизация почты для **${contact.full_name}**`);
          } catch (syncErr) {
            console.warn(`[AI Assistant] Auto-email-sync failed for ${cId}:`, syncErr);
            onAction(`⚠️ Не удалось синхронизировать почту`);
          }
        }
      }

      // Заметки (после возможного авто-research)
      const notesResult = await client.query(
        `SELECT title, content, source, pinned, created_at FROM contact_notes
         WHERE contact_id = $1 ORDER BY pinned DESC, created_at DESC LIMIT 5`,
        [cId]
      );
      const totalNotesResult = await client.query(
        `SELECT count(*)::int as cnt FROM contact_notes WHERE contact_id = $1`, [cId]
      );
      const totalNotes = totalNotesResult.rows[0]?.cnt || 0;
      if (notesResult.rows.length > 0) {
        const notesText = notesResult.rows.map((n: Record<string, unknown>) => {
          const prefix = n.pinned ? '📌 ' : '';
          const title = n.title ? `[${n.title}] ` : '';
          const content = String(n.content).slice(0, 250);
          return `  ${prefix}${title}(${n.source}, ${new Date(n.created_at as string).toLocaleDateString('ru-RU')}): ${content}${String(n.content).length > 250 ? '...' : ''}`;
        }).join('\n');
        const moreNote = totalNotes > 5 ? `\n  (ещё ${totalNotes - 5} заметок, доступны по запросу)` : '';
        parts.push(`📝 Заметки (${totalNotes}):\n${notesText}${moreNote}`);
      }

      // Переписка (после возможной авто-синхронизации)
      if (contact.email) {
        const totalEmailsResult = await client.query(
          `SELECT count(*)::int as cnt FROM crm_emails WHERE contact_email = $1`,
          [contact.email]
        );
        const totalEmails = totalEmailsResult.rows[0]?.cnt || 0;
        if (totalEmails > 0) {
          const emailResult = await client.query(
            `SELECT direction, subject, LEFT(body_text, 150) as body_preview, sent_at FROM crm_emails
             WHERE contact_email = $1 ORDER BY sent_at DESC LIMIT 5`,
            [contact.email]
          );
          const emailsText = emailResult.rows.map((e: Record<string, unknown>) => {
            const dir = e.direction === 'inbound' ? '📥' : '📤';
            const date = new Date(e.sent_at as string).toLocaleDateString('ru-RU');
            return `  ${dir} ${date} | ${e.subject || '(без темы)'}${e.body_preview ? '\n    ' + String(e.body_preview).replace(/\n/g, ' ').trim() + '...' : ''}`;
          }).join('\n');
          const moreEmails = totalEmails > 5 ? `\n  (ещё ${totalEmails - 5} писем)` : '';
          parts.push(`📧 Переписка (${totalEmails} писем, последние 5):\n${emailsText}${moreEmails}`);
        }
      }

      // Заявки
      const submissionsResult = await client.query(
        `SELECT form_type, status, LEFT(message, 100) as msg_preview, created_at FROM form_submissions
         WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 3`,
        [cId]
      );
      if (submissionsResult.rows.length > 0) {
        const subsText = submissionsResult.rows.map((s: Record<string, unknown>) => {
          const date = new Date(s.created_at as string).toLocaleDateString('ru-RU');
          return `  ${date} | ${s.form_type} (${s.status})${s.msg_preview ? ': ' + String(s.msg_preview) : ''}`;
        }).join('\n');
        parts.push(`📋 Заявки (${submissionsResult.rows.length}):\n${subsText}`);
      }
    }

    if (contactRows.length > 3) {
      parts.push(`\n⚠️ Найдено ещё ${contactRows.length - 3} контактов, показаны первые 3.`);
    }

    return {
      context: parts.join('\n\n'),
      actionsPerformed,
      contactIds: contactRows.slice(0, 3).map(c => c.id as string),
    };
  } catch (err) {
    console.warn('[AI Assistant] Contact enrichment (streaming) failed:', err);
    return null;
  } finally {
    client.release();
  }
}
