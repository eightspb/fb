import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getEmbedding } from '@/lib/openrouter';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const COOKIE_NAME = 'admin-session';

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

// POST /api/admin/contacts/semantic-search
// Body: { query: string, limit?: number, threshold?: number }
export async function POST(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    query?: string;
    limit?: number;
    threshold?: number;
  };

  const { query, limit = 10, threshold = 0.3 } = body;
  if (!query?.trim()) {
    return NextResponse.json({ error: 'query required' }, { status: 400 });
  }

  const safeLimit = Math.min(Math.max(1, limit), 50);
  const safeThreshold = Math.min(Math.max(0, threshold), 1);

  let queryEmbedding: number[];
  try {
    queryEmbedding = await getEmbedding(query);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Embedding error: ${msg}` }, { status: 502 });
  }

  const vectorStr = `[${queryEmbedding.join(',')}]`;

  const client = await pool.connect();
  try {
    await client.query("SET statement_timeout = '15s'");
    const { rows } = await client.query(`
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
    `, [vectorStr, safeThreshold, safeLimit]);

    return NextResponse.json({ results: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Search error: ${msg}` }, { status: 500 });
  } finally {
    client.release();
  }
}
