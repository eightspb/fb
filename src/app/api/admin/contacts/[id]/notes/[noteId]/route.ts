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

// PATCH /api/admin/contacts/[id]/notes/[noteId] — update a note
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, noteId } = await params;
  const body = await request.json();

  const allowed = ['title', 'content', 'pinned'];
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = $${idx}`);
      values.push(body[key]);
      idx++;
    }
  }

  if (!sets.length) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  sets.push(`updated_at = NOW()`);
  values.push(noteId, id);

  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE contact_notes SET ${sets.join(', ')}
       WHERE id = $${idx} AND contact_id = $${idx + 1}
       RETURNING *`,
      values
    );
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}

// DELETE /api/admin/contacts/[id]/notes/[noteId] — delete a note
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, noteId } = await params;
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM contact_notes WHERE id = $1 AND contact_id = $2 RETURNING id',
      [noteId, id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } finally {
    client.release();
  }
}
