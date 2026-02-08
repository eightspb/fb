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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');

    console.log('[API News Count] GET Request received');
    console.log('[API News Count] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    
    let client;
    try {
      client = await pool.connect();
      console.log('[API News Count] Database connection established');
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
      console.error('[API News Count] Failed to connect to database:', JSON.stringify(errorDetails, null, 2));
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
    console.error('[API News Count] Error fetching count:', JSON.stringify(errorDetails, null, 2));
    
    // Более понятные сообщения об ошибках
    let errorMessage = 'Failed to fetch count';
    let statusCode = 500;
    
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT' || error?.message?.includes('connect')) {
      errorMessage = 'Не удалось подключиться к базе данных.';
      statusCode = 503;
    } else if (error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') {
      errorMessage = 'Не удалось найти сервер базы данных.';
      statusCode = 503;
    } else if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      errorMessage = 'Таблицы не найдены. Выполните bun run setup для создания схемы базы данных.';
      statusCode = 500;
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
        } : undefined,
        code: error?.code
      },
      { status: statusCode }
    );
  }
}
