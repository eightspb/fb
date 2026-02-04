import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const JWT_SECRET = process.env.JWT_SECRET;
const FALLBACK_JWT_SECRET = 'default-secret-change-me';
const COOKIE_NAME = 'admin-session';

function getJwtSecret(): string {
  if (JWT_SECRET) return JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return FALLBACK_JWT_SECRET;
}

async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    
    const secret = new TextEncoder().encode(getJwtSecret());
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  // Проверяем авторизацию
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  
  try {
    // Получаем активные сессии (активность за последние 2 минуты)
    const sessionsResult = await client.query(`
      SELECT 
        session_id,
        ip_address,
        user_agent,
        country,
        country_code,
        region,
        city,
        current_page,
        page_title,
        referrer,
        page_views_count,
        started_at,
        last_activity_at,
        screen_width,
        screen_height,
        language,
        EXTRACT(EPOCH FROM (NOW() - started_at)) as session_duration_seconds,
        EXTRACT(EPOCH FROM (NOW() - last_activity_at)) as inactive_seconds
      FROM visitor_sessions
      WHERE last_activity_at > NOW() - INTERVAL '2 minutes'
      ORDER BY last_activity_at DESC
    `);

    // Получаем общее количество активных
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM visitor_sessions
      WHERE last_activity_at > NOW() - INTERVAL '2 minutes'
    `);

    // Получаем количество за последние 5 минут (для сравнения)
    const count5minResult = await client.query(`
      SELECT COUNT(*) as total
      FROM visitor_sessions
      WHERE last_activity_at > NOW() - INTERVAL '5 minutes'
    `);

    const sessions = sessionsResult.rows.map(row => ({
      sessionId: row.session_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      country: row.country,
      countryCode: row.country_code,
      region: row.region,
      city: row.city,
      currentPage: row.current_page,
      pageTitle: row.page_title,
      referrer: row.referrer,
      pageViewsCount: parseInt(row.page_views_count),
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
      screenWidth: row.screen_width,
      screenHeight: row.screen_height,
      language: row.language,
      sessionDuration: Math.round(row.session_duration_seconds),
      inactiveSeconds: Math.round(row.inactive_seconds),
    }));

    return NextResponse.json({
      sessions,
      activeCount: parseInt(countResult.rows[0].total),
      activeCount5min: parseInt(count5minResult.rows[0].total),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Analytics Sessions] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
