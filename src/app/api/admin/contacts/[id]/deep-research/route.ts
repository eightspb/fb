import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { deepResearchContactWithAI } from '@/lib/openrouter';

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

// POST /api/admin/contacts/[id]/deep-research
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await pool.connect();

  try {
    const contactResult = await client.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (!contactResult.rows.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const contact = contactResult.rows[0];

    if (!contact.full_name || contact.full_name.trim().length === 0) {
      return NextResponse.json({ error: 'У контакта не указано ФИО' }, { status: 400 });
    }

    const result = await deepResearchContactWithAI({
      full_name: contact.full_name,
      city: contact.city,
      institution: contact.institution,
      speciality: contact.speciality,
      phone: contact.phone,
      email: contact.email,
    });

    const now = new Date().toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const noteResult = await client.query(
      `INSERT INTO contact_notes (contact_id, title, content, source, metadata)
       VALUES ($1, $2, $3, 'ai_deep_research', $4)
       RETURNING *`,
      [
        id,
        `Deep Research (${now})`,
        result.summary,
        JSON.stringify({
          structured: result.structured,
          searchModel: result.searchModel,
          verifyModel: result.verifyModel,
          confidence: result.structured.matched_identity_confidence,
          timestamp: new Date().toISOString(),
        }),
      ]
    );

    await client.query('UPDATE contacts SET updated_at = NOW() WHERE id = $1', [id]);

    return NextResponse.json({ note: noteResult.rows[0] });
  } catch (error) {
    console.error('[Deep Research API] Error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка при глубоком исследовании';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
