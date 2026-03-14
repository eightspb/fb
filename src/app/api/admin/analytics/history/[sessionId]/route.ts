import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { Pool } from 'pg';

export const runtime = 'nodejs';

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const client = await pool.connect();

  try {
    const timelineResult = await client.query(
      `
        SELECT
          id,
          page_path,
          page_title,
          referrer,
          visited_at,
          time_on_page,
          utm_source,
          utm_medium,
          utm_campaign,
          device_type,
          browser,
          os,
          ip_address,
          country,
          country_code,
          region,
          city
        FROM page_visits
        WHERE session_id = $1
        ORDER BY visited_at DESC
        LIMIT 100
      `,
      [sessionId]
    );

    if (timelineResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const summaryResult = await client.query(
      `
        SELECT
          MIN(visited_at) AS started_at,
          MAX(visited_at) AS last_activity_at,
          COUNT(*) AS page_views_count,
          COUNT(DISTINCT page_path) AS unique_pages,
          AVG(COALESCE(time_on_page, 0)) AS avg_time_on_page
        FROM page_visits
        WHERE session_id = $1
      `,
      [sessionId]
    );

    const summary = summaryResult.rows[0];

    return NextResponse.json({
      sessionId,
      summary: {
        startedAt: summary.started_at,
        lastActivityAt: summary.last_activity_at,
        pageViewsCount: Number(summary.page_views_count) || 0,
        uniquePages: Number(summary.unique_pages) || 0,
        avgTimeOnPage: Math.round(Number(summary.avg_time_on_page) || 0),
      },
      timeline: timelineResult.rows.map((row) => ({
        id: row.id,
        pagePath: row.page_path,
        pageTitle: row.page_title,
        referrer: row.referrer,
        visitedAt: row.visited_at,
        timeOnPage: Number(row.time_on_page) || 0,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
        deviceType: row.device_type,
        browser: row.browser,
        os: row.os,
        ipAddress: row.ip_address,
        country: row.country,
        countryCode: row.country_code,
        region: row.region,
        city: row.city,
      })),
    });
  } catch (error) {
    console.error('[Analytics Session Detail] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
