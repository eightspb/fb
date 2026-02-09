import { NextRequest, NextResponse } from 'next/server';
import { Pool, PoolClient } from 'pg';
import { log } from '@/lib/logger';

// Явно указываем Node.js runtime для работы с PostgreSQL
export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

interface TrackingData {
  sessionId: string;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  timezone?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  type: 'pageview' | 'heartbeat' | 'leave';
  timeOnPage?: number;
}

// Определение типа устройства по user-agent
function getDeviceType(userAgent: string): string {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

// Получение браузера из user-agent
function getBrowser(userAgent: string): string {
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/edg/i.test(userAgent)) return 'Edge';
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/opera|opr/i.test(userAgent)) return 'Opera';
  if (/msie|trident/i.test(userAgent)) return 'IE';
  return 'Other';
}

// Получение ОС из user-agent
function getOS(userAgent: string): string {
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/macintosh|mac os/i.test(userAgent)) return 'macOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  if (/android/i.test(userAgent)) return 'Android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
  return 'Other';
}

// Получение IP клиента
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  if (realIp) return realIp;
  
  return '127.0.0.1';
}

// Получение геолокации по IP (с кэшированием)
async function getGeolocation(ip: string, client: any): Promise<{
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
}> {
  // Пропускаем локальные IP
  if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', country_code: 'LO', region: null, city: null };
  }

  try {
    // Проверяем кэш
    const cacheResult = await client.query(
      'SELECT country, country_code, region, city FROM ip_geolocation_cache WHERE ip_address = $1',
      [ip]
    );

    if (cacheResult.rows.length > 0) {
      return cacheResult.rows[0];
    }

    // Запрашиваем ip-api.com
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city&lang=ru`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return { country: null, country_code: null, region: null, city: null };
    }

    const data = await response.json();

    if (data.status === 'success') {
      const geo = {
        country: data.country || null,
        country_code: data.countryCode || null,
        region: data.regionName || null,
        city: data.city || null,
      };

      // Сохраняем в кэш
      await client.query(
        `INSERT INTO ip_geolocation_cache (ip_address, country, country_code, region, city)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (ip_address) DO UPDATE SET
           country = EXCLUDED.country,
           country_code = EXCLUDED.country_code,
           region = EXCLUDED.region,
           city = EXCLUDED.city,
           cached_at = NOW()`,
        [ip, geo.country, geo.country_code, geo.region, geo.city]
      );

      return geo;
    }
  } catch (error) {
    console.error('[Analytics] Ошибка получения геолокации:', error);
  }

  return { country: null, country_code: null, region: null, city: null };
}

export async function POST(request: NextRequest) {
  try {
    const body: TrackingData = await request.json();
    
    if (!body.sessionId || !body.pagePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const deviceType = getDeviceType(userAgent);
    const browser = getBrowser(userAgent);
    const os = getOS(userAgent);

    let client: PoolClient;
    try {
      client = await pool.connect();
    } catch (error: any) {
      console.error('[Analytics] Ошибка подключения к БД:', error.message);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    try {
      // Получаем геолокацию
      const geo = await getGeolocation(ip, client);

      if (body.type === 'pageview') {
        // Проверяем существует ли сессия
        const existingSession = await client.query(
          'SELECT id, page_views_count FROM visitor_sessions WHERE session_id = $1',
          [body.sessionId]
        );

        if (existingSession.rows.length > 0) {
          // Обновляем существующую сессию
          await client.query(
            `UPDATE visitor_sessions SET
              current_page = $1,
              page_title = $2,
              last_activity_at = NOW(),
              page_views_count = page_views_count + 1
            WHERE session_id = $3`,
            [body.pagePath, body.pageTitle || '', body.sessionId]
          );
        } else {
          // Создаём новую сессию
          await client.query(
            `INSERT INTO visitor_sessions (
              session_id, ip_address, user_agent,
              country, country_code, region, city,
              current_page, page_title, referrer,
              screen_width, screen_height, language, timezone
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              body.sessionId, ip, userAgent,
              geo.country, geo.country_code, geo.region, geo.city,
              body.pagePath, body.pageTitle || '', body.referrer || '',
              body.screenWidth || null, body.screenHeight || null,
              body.language || '', body.timezone || ''
            ]
          );
          
          // Логируем первое посещение
          log('info', `👤 Новый посетитель: ${body.pagePath} (${geo.city || geo.country || 'Unknown'})`, {
            pagePath: body.pagePath,
            pageTitle: body.pageTitle,
            country: geo.country,
            city: geo.city,
            device: deviceType,
            browser,
          }, 'Visitor');
        }

        // Записываем посещение страницы
        await client.query(
          `INSERT INTO page_visits (
            session_id, ip_address, user_agent,
            country, country_code, region, city,
            page_path, page_title, referrer,
            utm_source, utm_medium, utm_campaign,
            device_type, browser, os
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            body.sessionId, ip, userAgent,
            geo.country, geo.country_code, geo.region, geo.city,
            body.pagePath, body.pageTitle || '', body.referrer || '',
            body.utmSource || null, body.utmMedium || null, body.utmCampaign || null,
            deviceType, browser, os
          ]
        );
        
        // Логируем посещение страницы
        log('info', `📄 Посещение страницы: ${body.pagePath}`, {
          pageTitle: body.pageTitle,
          referrer: body.referrer,
          device: deviceType,
        }, 'PageView');

      } else if (body.type === 'heartbeat') {
        // Обновляем время последней активности
        await client.query(
          `UPDATE visitor_sessions SET
            last_activity_at = NOW(),
            current_page = $1,
            page_title = $2
          WHERE session_id = $3`,
          [body.pagePath, body.pageTitle || '', body.sessionId]
        );

      } else if (body.type === 'leave') {
        // Обновляем время на странице при уходе
        if (body.timeOnPage) {
          await client.query(
            `UPDATE page_visits SET time_on_page = $1
             WHERE session_id = $2 AND page_path = $3
             AND id = (
               SELECT id FROM page_visits 
               WHERE session_id = $2 AND page_path = $3 
               ORDER BY visited_at DESC LIMIT 1
             )`,
            [body.timeOnPage, body.sessionId, body.pagePath]
          );
        }
      }

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Analytics] Ошибка трекинга:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET для проверки здоровья API
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
