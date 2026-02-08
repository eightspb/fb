import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { Pool } from 'pg';

// Явно указываем Node.js runtime для работы с PostgreSQL
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

export async function GET(request: NextRequest) {
  // Проверяем авторизацию
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || 'today'; // today, week, month, all

  let dateFilter = '';
  switch (period) {
    case 'today':
      dateFilter = "visited_at >= CURRENT_DATE";
      break;
    case 'week':
      dateFilter = "visited_at >= CURRENT_DATE - INTERVAL '7 days'";
      break;
    case 'month':
      dateFilter = "visited_at >= CURRENT_DATE - INTERVAL '30 days'";
      break;
    default:
      dateFilter = '1=1'; // all time
  }

  const client = await pool.connect();
  
  try {
    // Общая статистика
    const totalStats = await client.query(`
      SELECT 
        COUNT(*) as total_pageviews,
        COUNT(DISTINCT session_id) as unique_visitors,
        COUNT(DISTINCT ip_address) as unique_ips,
        AVG(COALESCE(time_on_page, 0)) as avg_time_on_page
      FROM page_visits
      WHERE ${dateFilter}
    `);

    // Популярные страницы
    const popularPages = await client.query(`
      SELECT 
        page_path,
        page_title,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as unique_views,
        AVG(COALESCE(time_on_page, 0)) as avg_time
      FROM page_visits
      WHERE ${dateFilter}
      GROUP BY page_path, page_title
      ORDER BY views DESC
      LIMIT 10
    `);

    // География посетителей
    const geography = await client.query(`
      SELECT 
        COALESCE(country, 'Неизвестно') as country,
        country_code,
        COUNT(*) as visits,
        COUNT(DISTINCT session_id) as unique_visitors
      FROM page_visits
      WHERE ${dateFilter}
      GROUP BY country, country_code
      ORDER BY visits DESC
      LIMIT 10
    `);

    // Города
    const cities = await client.query(`
      SELECT 
        COALESCE(city, 'Неизвестно') as city,
        country,
        COUNT(*) as visits,
        COUNT(DISTINCT session_id) as unique_visitors
      FROM page_visits
      WHERE ${dateFilter} AND city IS NOT NULL
      GROUP BY city, country
      ORDER BY visits DESC
      LIMIT 10
    `);

    // Источники трафика (referrer)
    const referrers = await client.query(`
      SELECT 
        CASE 
          WHEN referrer IS NULL OR referrer = '' THEN 'Прямой заход'
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%yandex%' THEN 'Yandex'
          WHEN referrer LIKE '%facebook%' OR referrer LIKE '%fb.%' THEN 'Facebook'
          WHEN referrer LIKE '%instagram%' THEN 'Instagram'
          WHEN referrer LIKE '%vk.com%' OR referrer LIKE '%vkontakte%' THEN 'ВКонтакте'
          WHEN referrer LIKE '%t.me%' OR referrer LIKE '%telegram%' THEN 'Telegram'
          ELSE referrer
        END as source,
        COUNT(*) as visits,
        COUNT(DISTINCT session_id) as unique_visitors
      FROM page_visits
      WHERE ${dateFilter}
      GROUP BY source
      ORDER BY visits DESC
      LIMIT 10
    `);

    // Устройства
    const devices = await client.query(`
      SELECT 
        COALESCE(device_type, 'unknown') as device_type,
        COUNT(*) as visits,
        COUNT(DISTINCT session_id) as unique_visitors
      FROM page_visits
      WHERE ${dateFilter}
      GROUP BY device_type
      ORDER BY visits DESC
    `);

    // Браузеры
    const browsers = await client.query(`
      SELECT 
        COALESCE(browser, 'Неизвестно') as browser,
        COUNT(*) as visits
      FROM page_visits
      WHERE ${dateFilter}
      GROUP BY browser
      ORDER BY visits DESC
      LIMIT 5
    `);

    // Посещения по часам (для графика)
    const hourlyStats = await client.query(`
      SELECT 
        EXTRACT(HOUR FROM visited_at) as hour,
        COUNT(*) as visits
      FROM page_visits
      WHERE ${dateFilter}
      GROUP BY hour
      ORDER BY hour
    `);

    // Посещения по дням (для недели/месяца)
    const dailyStats = await client.query(`
      SELECT 
        DATE(visited_at) as date,
        COUNT(*) as visits,
        COUNT(DISTINCT session_id) as unique_visitors
      FROM page_visits
      WHERE ${dateFilter}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `);

    const stats = totalStats.rows[0];

    return NextResponse.json({
      summary: {
        totalPageviews: parseInt(stats.total_pageviews) || 0,
        uniqueVisitors: parseInt(stats.unique_visitors) || 0,
        uniqueIps: parseInt(stats.unique_ips) || 0,
        avgTimeOnPage: Math.round(parseFloat(stats.avg_time_on_page) || 0),
      },
      popularPages: popularPages.rows.map(row => ({
        pagePath: row.page_path,
        pageTitle: row.page_title,
        views: parseInt(row.views),
        uniqueViews: parseInt(row.unique_views),
        avgTime: Math.round(parseFloat(row.avg_time) || 0),
      })),
      geography: geography.rows.map(row => ({
        country: row.country,
        countryCode: row.country_code,
        visits: parseInt(row.visits),
        uniqueVisitors: parseInt(row.unique_visitors),
      })),
      cities: cities.rows.map(row => ({
        city: row.city,
        country: row.country,
        visits: parseInt(row.visits),
        uniqueVisitors: parseInt(row.unique_visitors),
      })),
      referrers: referrers.rows.map(row => ({
        source: row.source,
        visits: parseInt(row.visits),
        uniqueVisitors: parseInt(row.unique_visitors),
      })),
      devices: devices.rows.map(row => ({
        deviceType: row.device_type,
        visits: parseInt(row.visits),
        uniqueVisitors: parseInt(row.unique_visitors),
      })),
      browsers: browsers.rows.map(row => ({
        browser: row.browser,
        visits: parseInt(row.visits),
      })),
      hourlyStats: hourlyStats.rows.map(row => ({
        hour: parseInt(row.hour),
        visits: parseInt(row.visits),
      })),
      dailyStats: dailyStats.rows.map(row => ({
        date: row.date,
        visits: parseInt(row.visits),
        uniqueVisitors: parseInt(row.unique_visitors),
      })),
      period,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Analytics Stats] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
