import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function GET() {
  try {
    const client = await pool.connect();

    try {
      // Получаем только категории, так как пользователь попросил сократить количество фильтров
      // и не смешивать теги с категориями
      const categoriesResult = await client.query(
        'SELECT DISTINCT category FROM news WHERE category IS NOT NULL'
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
  } catch (error) {
    console.error('Error fetching filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filters' },
      { status: 500 }
    );
  }
}
