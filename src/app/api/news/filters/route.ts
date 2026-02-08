import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Явно указываем Node.js runtime для работы с PostgreSQL
export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

export async function GET() {
  try {
    console.log('[API Filters] GET Request received');
    console.log('[API Filters] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    
    let client;
    try {
      client = await pool.connect();
      console.log('[API Filters] Database connection established');
    } catch (connectError: any) {
      const errorDetails = {
        message: connectError?.message,
        code: connectError?.code,
        errno: connectError?.errno,
        syscall: connectError?.syscall,
        address: connectError?.address,
        port: connectError?.port,
        name: connectError?.name,
      };
      console.error('[API Filters] Failed to connect to database:', JSON.stringify(errorDetails, null, 2));
      throw connectError;
    }

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
      if (client) {
        client.release();
      }
    }
  } catch (error: any) {
    const errorDetails = {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      syscall: error?.syscall,
      address: error?.address,
      port: error?.port,
      name: error?.name,
      stack: error?.stack
    };
    console.error('[API Filters] Error fetching filters:', JSON.stringify(errorDetails, null, 2));
    
    let errorMessage = 'Failed to fetch filters';
    let statusCode = 500;
    
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT' || error?.message?.includes('connect')) {
      errorMessage = 'Не удалось подключиться к базе данных.';
      statusCode = 503;
    } else if (error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') {
      errorMessage = 'Не удалось найти сервер базы данных.';
      statusCode = 503;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          message: error?.message,
          code: error?.code,
          errno: error?.errno,
        } : undefined
      },
      { status: statusCode }
    );
  }
}
