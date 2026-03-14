import { NextResponse } from 'next/server';
import { Pool, type PoolClient } from 'pg';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function GET() {
  const startedAt = Date.now();
  let client: PoolClient | null = null;

  try {
    client = await pool.connect();
    await client.query('SELECT 1');

    return NextResponse.json(
      {
        status: 'ok',
        checks: {
          database: 'ok',
        },
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Health] Database check failed:', message);

    return NextResponse.json(
      {
        status: 'error',
        checks: {
          database: 'error',
        },
        error: 'Service unavailable',
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } finally {
    client?.release();
  }
}
