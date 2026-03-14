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

function getDays(raw: string | null): number {
  const value = Number(raw || 30);
  if (!Number.isFinite(value)) return 30;
  return Math.min(Math.max(Math.trunc(value), 1), 365);
}

function getLimit(raw: string | null): number {
  const value = Number(raw || 25);
  if (!Number.isFinite(value)) return 25;
  return Math.min(Math.max(Math.trunc(value), 1), 100);
}

function getOffset(raw: string | null): number {
  const value = Number(raw || 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(Math.trunc(value), 0);
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = (searchParams.get('q') || '').trim();
  const status = searchParams.get('status') || 'all';
  const days = getDays(searchParams.get('days'));
  const limit = getLimit(searchParams.get('limit'));
  const offset = getOffset(searchParams.get('offset'));

  const client = await pool.connect();

  try {
    const conditions = ['visited_at >= NOW() - ($1::int * INTERVAL \'1 day\')'];
    const params: Array<string | number> = [days];

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      const queryParam = `$${params.length}`;
      conditions.push(`(
        LOWER(COALESCE(session_id, '')) LIKE ${queryParam}
        OR LOWER(COALESCE(ip_address, '')) LIKE ${queryParam}
        OR LOWER(COALESCE(page_path, '')) LIKE ${queryParam}
        OR LOWER(COALESCE(page_title, '')) LIKE ${queryParam}
        OR LOWER(COALESCE(city, '')) LIKE ${queryParam}
        OR LOWER(COALESCE(country, '')) LIKE ${queryParam}
        OR LOWER(COALESCE(referrer, '')) LIKE ${queryParam}
      )`);
    }

    const whereClause = conditions.join(' AND ');

    const baseCte = `
      WITH filtered_visits AS (
        SELECT *
        FROM page_visits
        WHERE ${whereClause}
      ),
      grouped_sessions AS (
        SELECT
          session_id,
          MIN(visited_at) AS started_at,
          MAX(visited_at) AS last_activity_at,
          COUNT(*) AS page_views_count,
          COUNT(DISTINCT page_path) AS unique_pages,
          AVG(COALESCE(time_on_page, 0)) AS avg_time_on_page,
          MAX(COALESCE(time_on_page, 0)) AS max_time_on_page
        FROM filtered_visits
        GROUP BY session_id
      ),
      latest_visit AS (
        SELECT DISTINCT ON (session_id)
          session_id,
          ip_address,
          user_agent,
          country,
          country_code,
          region,
          city,
          page_path AS current_page,
          page_title,
          referrer,
          device_type,
          browser,
          os,
          visited_at
        FROM filtered_visits
        ORDER BY session_id, visited_at DESC
      ),
      sessions AS (
        SELECT
          g.session_id,
          l.ip_address,
          l.user_agent,
          l.country,
          l.country_code,
          l.region,
          l.city,
          l.current_page,
          l.page_title,
          l.referrer,
          l.device_type,
          l.browser,
          l.os,
          g.started_at,
          g.last_activity_at,
          g.page_views_count,
          g.unique_pages,
          ROUND(g.avg_time_on_page) AS avg_time_on_page,
          g.max_time_on_page,
          EXTRACT(EPOCH FROM (g.last_activity_at - g.started_at))::int AS session_duration_seconds,
          EXTRACT(EPOCH FROM (NOW() - g.last_activity_at))::int AS inactive_seconds,
          CASE
            WHEN g.last_activity_at > NOW() - INTERVAL '2 minutes' THEN 'active'
            ELSE 'ended'
          END AS session_status
        FROM grouped_sessions g
        JOIN latest_visit l USING (session_id)
      )
    `;

    const statusCondition =
      status === 'active'
        ? `WHERE session_status = 'active'`
        : status === 'ended'
          ? `WHERE session_status = 'ended'`
          : '';

    const totalResult = await client.query(
      `
        ${baseCte}
        SELECT COUNT(*)::int AS total
        FROM sessions
        ${statusCondition}
      `,
      params
    );

    const listParams = [...params, limit, offset];
    const listResult = await client.query(
      `
        ${baseCte}
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
          device_type,
          browser,
          os,
          started_at,
          last_activity_at,
          page_views_count,
          unique_pages,
          avg_time_on_page,
          max_time_on_page,
          session_duration_seconds,
          inactive_seconds,
          session_status
        FROM sessions
        ${statusCondition}
        ORDER BY last_activity_at DESC
        LIMIT $${listParams.length - 1}
        OFFSET $${listParams.length}
      `,
      listParams
    );

    return NextResponse.json({
      sessions: listResult.rows.map((row) => ({
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
        deviceType: row.device_type,
        browser: row.browser,
        os: row.os,
        startedAt: row.started_at,
        lastActivityAt: row.last_activity_at,
        pageViewsCount: Number(row.page_views_count),
        uniquePages: Number(row.unique_pages),
        avgTimeOnPage: Number(row.avg_time_on_page) || 0,
        maxTimeOnPage: Number(row.max_time_on_page) || 0,
        sessionDuration: Number(row.session_duration_seconds) || 0,
        inactiveSeconds: Number(row.inactive_seconds) || 0,
        status: row.session_status,
      })),
      pagination: {
        total: totalResult.rows[0]?.total ?? 0,
        limit,
        offset,
      },
      filters: {
        q,
        status,
        days,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Analytics History] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
