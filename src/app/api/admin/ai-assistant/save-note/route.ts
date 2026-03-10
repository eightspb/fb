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

// POST /api/admin/ai-assistant/save-note
// Body: { contactIds: string[], question: string, reply: string }
export async function POST(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { contactIds, question, reply } = body as {
    contactIds: string[];
    question: string;
    reply: string;
  };

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return NextResponse.json({ error: 'contactIds required' }, { status: 400 });
  }
  if (!reply?.trim()) {
    return NextResponse.json({ error: 'reply required' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const now = new Date().toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const title = `AI Ассистент (${now})`;
    const content = question?.trim()
      ? `**Вопрос:** ${question.trim()}\n\n**Ответ AI:**\n${reply.trim()}`
      : reply.trim();

    const saved: string[] = [];
    for (const id of contactIds) {
      await client.query(
        `INSERT INTO contact_notes (contact_id, title, content, source, metadata)
         VALUES ($1, $2, $3, 'ai_assistant', $4)`,
        [
          id,
          title,
          content,
          JSON.stringify({ manual: true, timestamp: new Date().toISOString() }),
        ]
      );
      saved.push(id);
    }

    return NextResponse.json({ saved: saved.length });
  } finally {
    client.release();
  }
}
