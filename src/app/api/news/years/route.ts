import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function GET() {
  try {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT DISTINCT year FROM news ORDER BY year DESC'
      );

      const years = result.rows.map(row => row.year);
      return NextResponse.json(years);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[API Years] Error fetching years:', error);
    console.error('[API Years] Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch years',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}


