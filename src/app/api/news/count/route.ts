import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');

    const client = await pool.connect();

    try {
      let count = 0;

      if (!filter) {
        // Общее количество
        const result = await client.query('SELECT COUNT(*) FROM news');
        count = parseInt(result.rows[0].count);
      } else {
        // Объединяем уникальные новости по категории или тегу (для обратной совместимости)
        const normalizedFilter = filter.charAt(0).toUpperCase() + filter.slice(1).toLowerCase();
        
        const unionResult = await client.query(`
          SELECT COUNT(DISTINCT n.id) 
          FROM news n
          LEFT JOIN news_tags nt ON n.id = nt.news_id
          WHERE n.category = $1 OR nt.tag ILIKE $2
        `, [filter, `%${normalizedFilter}%`]);
        
        count = parseInt(unionResult.rows[0].count);
      }

      return NextResponse.json({ count });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch count' },
      { status: 500 }
    );
  }
}
