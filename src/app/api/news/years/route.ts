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
  } catch (error) {
    console.error('Error fetching years:', error);
    return NextResponse.json(
      { error: 'Failed to fetch years' },
      { status: 500 }
    );
  }
}


