import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const COOKIE_NAME = 'admin-session';

const POLZA_API_URL = 'https://polza.ai/api/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
`.trim();

const SYSTEM_PROMPT = `Ты — AI-ассистент CRM-системы для медицинского оборудования (компания ЗЕНИТ МЕД / fibroadenoma.net).
База содержит контакты врачей и медицинских специалистов, заявки с сайта, мероприятия, аналитику посещений и email-переписку.

ПРАВИЛА:
1. Отвечай на русском языке
2. Если для ответа нужны данные из БД, сгенерируй SQL-запрос внутри блока \`\`\`sql ... \`\`\`
3. ТОЛЬКО SELECT-запросы. НИКОГДА не генерируй INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE
4. Всегда добавляй LIMIT (максимум 100), если пользователь не указал конкретное количество
5. Для поиска по тексту используй ILIKE с %шаблон%
6. Для работы с тегами используй ANY (например: 'тег' = ANY(tags))
7. Форматируй ответы в Markdown: таблицы для табличных данных, списки для перечислений
8. Если результат пустой — скажи об этом, не придумывай данные
9. Если вопрос не связан с БД — отвечай как обычный помощник
10. При ошибке SQL объясни что пошло не так
11. Когда уместно предложить пользователю варианты действий или уточняющие вопросы, добавь в конце ответа интерактивные кнопки в формате: [[btn:Текст кнопки]]. Каждая кнопка на отдельной строке. Используй это для: уточнений ("За какой период?"), предложений следующих шагов ("Показать подробнее", "Экспорт в CSV"), вариантов фильтрации. Не злоупотребляй — добавляй кнопки только когда это действительно полезно.

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

  const aiMessages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  try {
    const firstReply = await callAI(aiMessages);
    const rawSql = extractSql(firstReply);

    if (!rawSql) {
      return NextResponse.json({ reply: firstReply });
    }

    // Validate: only SELECT or WITH
    if (!/^\s*(SELECT|WITH)\b/i.test(rawSql)) {
      return NextResponse.json({
        reply: firstReply + '\n\n⚠️ Запрос отклонён: разрешены только SELECT-запросы.',
        sql: rawSql,
      });
    }

    const safeSql = ensureLimit(rawSql);

    // Execute SQL with timeout
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
      return NextResponse.json({
        reply: firstReply + `\n\n❌ Ошибка выполнения SQL: ${msg}`,
        sql: safeSql,
      });
    } finally {
      client.release();
    }

    // Send results back to AI for interpretation
    const truncationNote = truncated ? ' (показаны первые 50 из большего числа строк)' : '';
    const followUpMessages: Message[] = [
      ...aiMessages,
      { role: 'assistant', content: firstReply },
      {
        role: 'user',
        content: `Результат SQL-запроса (${rows.length} строк${truncationNote}):\n${JSON.stringify(rows, null, 2)}`,
      },
    ];

    const finalReply = await callAI(followUpMessages);

    return NextResponse.json({
      reply: finalReply,
      sql: safeSql,
      sqlResult: rows,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AI Assistant] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
