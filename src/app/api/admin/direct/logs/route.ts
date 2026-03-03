import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

interface DirectLogRow {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  keyword_id: string | null;
  old_bid: string | null;
  new_bid: string | null;
  status: 'success' | 'error';
  message: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const result = await pool.query<DirectLogRow>(
      `SELECT
         l.id,
         l.campaign_id,
         c.name AS campaign_name,
         l.keyword_id,
         l.old_bid,
         l.new_bid,
         l.status,
         l.message,
         l.created_at
       FROM direct_logs l
       LEFT JOIN direct_campaigns c ON c.campaign_id = l.campaign_id
       ORDER BY l.created_at DESC
       LIMIT 50`
    );

    return NextResponse.json({
      logs: result.rows.map((row) => ({
        ...row,
        old_bid: row.old_bid === null ? null : Number(row.old_bid),
        new_bid: row.new_bid === null ? null : Number(row.new_bid),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка получения логов', details: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}
