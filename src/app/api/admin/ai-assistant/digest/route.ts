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

type Period = 'today' | 'week' | 'month';

interface DigestQuery {
  label: string;
  sql: string;
}

interface DigestQueryResult {
  label: string;
  rows: unknown[];
  error?: string;
}

const DIGEST_QUERIES: Record<Period, DigestQuery[]> = {
  today: [
    {
      label: 'Новые контакты сегодня',
      sql: `SELECT COUNT(*) as count FROM contacts WHERE created_at >= CURRENT_DATE`,
    },
    {
      label: 'Новые заявки сегодня',
      sql: `SELECT COUNT(*) as count, form_type FROM form_submissions
            WHERE created_at >= CURRENT_DATE GROUP BY form_type`,
    },
    {
      label: 'Посещения сегодня',
      sql: `SELECT COUNT(DISTINCT session_id) as sessions,
                   COUNT(*) as pageviews
            FROM page_visits WHERE visited_at >= CURRENT_DATE`,
    },
    {
      label: 'Топ страниц сегодня',
      sql: `SELECT page_path, COUNT(*) as views
            FROM page_visits WHERE visited_at >= CURRENT_DATE
            GROUP BY page_path ORDER BY views DESC LIMIT 5`,
    },
    {
      label: 'Источники трафика сегодня',
      sql: `SELECT utm_source, COUNT(DISTINCT session_id) as sessions
            FROM page_visits
            WHERE visited_at >= CURRENT_DATE AND utm_source IS NOT NULL
            GROUP BY utm_source ORDER BY sessions DESC LIMIT 5`,
    },
  ],
  week: [
    {
      label: 'Контакты за 7 дней',
      sql: `SELECT COUNT(*) as this_week,
              (SELECT COUNT(*) FROM contacts
               WHERE created_at >= NOW() - INTERVAL '14 days'
                 AND created_at < NOW() - INTERVAL '7 days') as last_week
            FROM contacts WHERE created_at >= NOW() - INTERVAL '7 days'`,
    },
    {
      label: 'Заявки за 7 дней',
      sql: `SELECT COUNT(*) as count, form_type FROM form_submissions
            WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY form_type`,
    },
    {
      label: 'Посещения за 7 дней',
      sql: `SELECT COUNT(DISTINCT session_id) as sessions,
                   COUNT(*) as pageviews
            FROM page_visits WHERE visited_at >= NOW() - INTERVAL '7 days'`,
    },
    {
      label: 'Топ страниц за 7 дней',
      sql: `SELECT page_path, COUNT(*) as views
            FROM page_visits WHERE visited_at >= NOW() - INTERVAL '7 days'
            GROUP BY page_path ORDER BY views DESC LIMIT 5`,
    },
    {
      label: 'Источники трафика за 7 дней',
      sql: `SELECT utm_source, COUNT(DISTINCT session_id) as sessions
            FROM page_visits
            WHERE visited_at >= NOW() - INTERVAL '7 days' AND utm_source IS NOT NULL
            GROUP BY utm_source ORDER BY sessions DESC LIMIT 5`,
    },
  ],
  month: [
    {
      label: 'Контакты за 30 дней',
      sql: `SELECT COUNT(*) as this_month,
              (SELECT COUNT(*) FROM contacts
               WHERE created_at >= NOW() - INTERVAL '60 days'
                 AND created_at < NOW() - INTERVAL '30 days') as last_month
            FROM contacts WHERE created_at >= NOW() - INTERVAL '30 days'`,
    },
    {
      label: 'Заявки за 30 дней',
      sql: `SELECT COUNT(*) as count, form_type FROM form_submissions
            WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY form_type`,
    },
    {
      label: 'Посещения за 30 дней',
      sql: `SELECT COUNT(DISTINCT session_id) as sessions,
                   COUNT(*) as pageviews
            FROM page_visits WHERE visited_at >= NOW() - INTERVAL '30 days'`,
    },
    {
      label: 'Топ страниц за 30 дней',
      sql: `SELECT page_path, COUNT(*) as views
            FROM page_visits WHERE visited_at >= NOW() - INTERVAL '30 days'
            GROUP BY page_path ORDER BY views DESC LIMIT 5`,
    },
    {
      label: 'Источники трафика за 30 дней',
      sql: `SELECT utm_source, COUNT(DISTINCT session_id) as sessions
            FROM page_visits
            WHERE visited_at >= NOW() - INTERVAL '30 days' AND utm_source IS NOT NULL
            GROUP BY utm_source ORDER BY sessions DESC LIMIT 5`,
    },
  ],
};

async function callAI(prompt: string): Promise<string> {
  const polzaKey = process.env.POLZA_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  const messages = [{ role: 'user', content: prompt }];

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
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (response.ok) {
        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) return content.trim();
      }
    } catch (err) {
      console.warn('[Digest] Polza.ai failed, falling back:', err);
    }
  }

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
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Пустой ответ от AI');
  return content.trim();
}

export async function POST(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { period?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const period = (body.period ?? 'today') as Period;
  if (!['today', 'week', 'month'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }

  const queries = DIGEST_QUERIES[period];
  const client = await pool.connect();

  try {
    await client.query("SET statement_timeout = '15s'");

    const results: DigestQueryResult[] = [];
    for (const { label, sql } of queries) {
      try {
        const { rows } = await client.query(sql);
        results.push({ label, rows });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ label, rows: [], error: msg });
      }
    }

    const periodLabel = period === 'today' ? 'сегодня' : period === 'week' ? 'последние 7 дней' : 'последний месяц';

    const dataBlock = results
      .map(r => {
        const data = r.error
          ? `(ошибка: ${r.error})`
          : JSON.stringify(r.rows, null, 2);
        return `### ${r.label}\n${data}`;
      })
      .join('\n\n');

    const prompt = `Сформируй краткий аналитический дайджест на основе следующих данных CRM.
Период: ${periodLabel}.

${dataBlock}

Формат ответа:
- Начни с краткого резюме (2-3 предложения)
- По каждому разделу: ключевые цифры + краткий вывод
- Выдели необычные или важные тренды
- Заверши рекомендациями (1-3 пункта)
- Используй emoji для разделов
- Отвечай на русском языке`;

    const reply = await callAI(prompt);

    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Digest] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
