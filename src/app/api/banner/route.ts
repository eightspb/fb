import { NextResponse, NextRequest } from 'next/server';
import { Pool } from 'pg';
import { withApiLogging } from '@/lib/api-logger';
import type { SiteBanner, BannerApiResponse } from '@/lib/types/banner';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

/**
 * GET /api/banner
 * Публичный endpoint для получения активного баннера
 * Возвращает баннер только если enabled = true
 */
export const GET = withApiLogging('/api/banner', async (request: NextRequest) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query<SiteBanner>(
        'SELECT * FROM site_banner WHERE enabled = true LIMIT 1'
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { enabled: false } as BannerApiResponse,
          {
            headers: {
              'Cache-Control': 'public, max-age=60, s-maxage=60',
            },
          }
        );
      }

      const banner = result.rows[0];

      return NextResponse.json(
        {
          enabled: true,
          banner,
        } as BannerApiResponse,
        {
          headers: {
            'Cache-Control': 'public, max-age=60, s-maxage=60',
          },
        }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching banner:', error);
    return NextResponse.json(
      { enabled: false, error: 'Failed to fetch banner' },
      { status: 500 }
    );
  }
});
