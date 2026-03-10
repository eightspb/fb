import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { indexNoteEmbedding } from '@/lib/embedding-utils';

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

// GET /api/admin/contacts/[id]/notes — list all notes for a contact
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM contact_notes
       WHERE contact_id = $1
       ORDER BY pinned DESC, created_at DESC`,
      [id]
    );
    return NextResponse.json({ notes: result.rows });
  } finally {
    client.release();
  }
}

// POST /api/admin/contacts/[id]/notes — create a new note
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, content, source, pinned, metadata } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const allowedSources = ['manual', 'ai_research', 'ai_deep_research', 'import'];
  const noteSource = source && allowedSources.includes(source) ? source : 'manual';

  const client = await pool.connect();
  try {
    // Verify contact exists
    const contactCheck = await client.query('SELECT id FROM contacts WHERE id = $1', [id]);
    if (!contactCheck.rows.length) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const result = await client.query(
      `INSERT INTO contact_notes (contact_id, title, content, source, pinned, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, title?.trim() || null, content.trim(), noteSource, pinned || false, metadata || {}]
    );

    const note = result.rows[0];

    // Fire-and-forget embedding indexing
    void indexNoteEmbedding(note.id, content.trim(), id);

    return NextResponse.json(note, { status: 201 });
  } finally {
    client.release();
  }
}
