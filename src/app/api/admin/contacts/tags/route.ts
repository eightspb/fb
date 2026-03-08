import { NextResponse } from 'next/server';
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

// GET /api/admin/contacts/tags — all unique tags sorted by usage
export async function GET() {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT tag, COUNT(*) AS usage_count
      FROM contacts, unnest(tags) AS tag
      WHERE tag <> ''
      GROUP BY tag
      ORDER BY usage_count DESC, tag ASC
    `);
    return NextResponse.json({ tags: result.rows.map(r => r.tag) });
  } finally {
    client.release();
  }
}
