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
      // Проверяем наличие колонки status
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='news' AND column_name='status'
      `);
      
      const hasStatusColumn = columnCheck.rows.length > 0;
      
      let count = 0;
      // Условие для опубликованных новостей
      const publishedCondition = hasStatusColumn
        ? "(n.status = 'published' OR n.status IS NULL)"
        : "1=1";

      if (!filter) {
        // Общее количество опубликованных новостей
        const result = await client.query(
          `SELECT COUNT(*) FROM news n WHERE ${publishedCondition}`
        );
        count = parseInt(result.rows[0].count);
      } else {
        // Объединяем уникальные опубликованные новости по категории или тегу (для обратной совместимости)
        const normalizedFilter = filter.charAt(0).toUpperCase() + filter.slice(1).toLowerCase();
        
        const unionResult = await client.query(`
          SELECT COUNT(DISTINCT n.id) 
          FROM news n
          LEFT JOIN news_tags nt ON n.id = nt.news_id
          WHERE ${publishedCondition}
          AND (n.category = $1 OR nt.tag ILIKE $2)
        `, [filter, `%${normalizedFilter}%`]);
        
        count = parseInt(unionResult.rows[0].count);
      }

      return NextResponse.json({ count });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[API News Count] Error fetching count:', error);
    console.error('[API News Count] Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    
    // Более понятные сообщения об ошибках
    let errorMessage = 'Failed to fetch count';
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('connect')) {
      errorMessage = 'Не удалось подключиться к базе данных. Убедитесь, что база данных запущена.';
    } else if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      errorMessage = 'Таблицы не найдены. Выполните bun run setup для создания схемы базы данных.';
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        code: error?.code
      },
      { status: 500 }
    );
  }
}
