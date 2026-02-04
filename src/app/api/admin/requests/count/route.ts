import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const COOKIE_NAME = 'admin-session';

async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return false;
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const isAuthenticated = await verifyAdminSession();

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'new') as new_count,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count
        FROM form_submissions
      `);
      
      return NextResponse.json({
        new: parseInt(result.rows[0].new_count) || 0,
        inProgress: parseInt(result.rows[0].in_progress_count) || 0
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching request count:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
