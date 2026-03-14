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

// Получить уникальные значения городов и учреждений из БД
export async function GET() {
  try {
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [citiesResult, institutionsResult] = await Promise.all([
      pool.query(
        `SELECT DISTINCT city FROM form_submissions WHERE city IS NOT NULL AND city != '' ORDER BY city`
      ),
      pool.query(
        `SELECT DISTINCT institution FROM form_submissions WHERE institution IS NOT NULL AND institution != '' ORDER BY institution`
      ),
    ]);

    return NextResponse.json({
      cities: citiesResult.rows.map(r => r.city),
      institutions: institutionsResult.rows.map(r => r.institution),
    });
  } catch (error: any) {
    console.error('Error fetching options:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
