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

// GET /api/admin/contacts/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}

// PATCH /api/admin/contacts/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowedStatuses = ['new', 'in_progress', 'processed', 'archived'];
  if ('status' in body && !allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
  }
  if ('tags' in body && !Array.isArray(body.tags)) {
    return NextResponse.json({ error: 'tags must be an array' }, { status: 400 });
  }

  const allowed = ['full_name', 'email', 'phone', 'city', 'institution', 'speciality', 'tags', 'status', 'notes'];
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
  values.push(id);

  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE contacts SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}

// DELETE /api/admin/contacts/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await pool.connect();
  try {
    const result = await client.query('DELETE FROM contacts WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ deleted: id });
  } finally {
    client.release();
  }
}
