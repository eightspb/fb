import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import crypto from 'crypto';

// Явно указываем Node.js runtime для работы с PostgreSQL
export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
  connectionTimeoutMillis: 10000, // 10 секунд таймаут подключения
  idleTimeoutMillis: 30000,
  max: 20,
});

/**
 * Генерирует уникальный fingerprint для посетителя на основе IP и User-Agent
 */
function generateVisitorFingerprint(ip: string | null, userAgent: string | null): string {
  const combined = `${ip || 'unknown'}|${userAgent || 'unknown'}`;
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 32);
}

/**
 * Получает IP адрес из запроса
 */
function getClientIP(request: NextRequest): string | null {
  // Проверяем различные заголовки для получения реального IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return null;
}

/**
 * POST /api/news/[id]/view
 * Регистрирует просмотр новости (только уникальные посетители)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'News ID is required' },
        { status: 400 }
      );
    }

    // Получаем IP и User-Agent
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent');
    
    // Генерируем fingerprint для уникальности
    const visitorFingerprint = generateVisitorFingerprint(ip, userAgent);
    
    // Проверяем существование новости
    const client = await pool.connect();
    
    try {
      // Проверяем, существует ли новость
      const newsCheck = await client.query(
        'SELECT id FROM news WHERE id = $1',
        [id]
      );
      
      if (newsCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'News not found' },
          { status: 404 }
        );
      }

      // Пытаемся вставить просмотр (UNIQUE индекс предотвратит дубликаты)
      // Один посетитель может просмотреть новость только один раз в день
      const insertResult = await client.query(
        `INSERT INTO news_views (news_id, visitor_fingerprint, ip_address, user_agent, viewed_date)
         VALUES ($1, $2, $3, $4, CURRENT_DATE)
         ON CONFLICT (news_id, visitor_fingerprint, viewed_date) DO NOTHING
         RETURNING id`,
        [id, visitorFingerprint, ip || null, userAgent || null]
      );

      // Получаем обновленную статистику
      const stats = await client.query(
        `SELECT unique_visitors, total_views, last_viewed_at
         FROM news_view_stats
         WHERE news_id = $1`,
        [id]
      );

      const wasNewView = insertResult.rows.length > 0;
      const viewStats = stats.rows[0] || {
        unique_visitors: 0,
        total_views: 0,
        last_viewed_at: null
      };

      return NextResponse.json({
        success: true,
        wasNewView,
        stats: {
          uniqueVisitors: parseInt(viewStats.unique_visitors) || 0,
          totalViews: parseInt(viewStats.total_views) || 0,
          lastViewedAt: viewStats.last_viewed_at
        }
      });

    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('Error tracking news view:', error);
    return NextResponse.json(
      { error: 'Failed to track view', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/news/[id]/view
 * Получает статистику просмотров новости
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'News ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const stats = await client.query(
        `SELECT unique_visitors, total_views, last_viewed_at
         FROM news_view_stats
         WHERE news_id = $1`,
        [id]
      );

      if (stats.rows.length === 0) {
        return NextResponse.json({
          uniqueVisitors: 0,
          totalViews: 0,
          lastViewedAt: null
        });
      }

      const viewStats = stats.rows[0];
      return NextResponse.json({
        uniqueVisitors: parseInt(viewStats.unique_visitors) || 0,
        totalViews: parseInt(viewStats.total_views) || 0,
        lastViewedAt: viewStats.last_viewed_at
      });

    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('Error fetching news view stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch view stats', details: error.message },
      { status: 500 }
    );
  }
}

