import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function GET() {
  try {
    const client = await pool.connect();

    try {
      // Проверяем наличие колонки status
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='news' AND column_name='status'
      `);
      
      const hasStatusColumn = columnCheck.rows.length > 0;
      
      // Получаем только категории из опубликованных новостей
      const statusCondition = hasStatusColumn
        ? "AND (status = 'published' OR status IS NULL)"
        : "";
      
      const categoriesResult = await client.query(
        `SELECT DISTINCT category FROM news 
         WHERE category IS NOT NULL 
         ${statusCondition}`
      );
      const categories = categoriesResult.rows.map(row => row.category);

      // Сортируем
      const allFilters = categories.sort((a, b) => 
        a.localeCompare(b, 'ru')
      );

      return NextResponse.json(allFilters);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[API Filters] Error fetching filters:', error);
    console.error('[API Filters] Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch filters',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
