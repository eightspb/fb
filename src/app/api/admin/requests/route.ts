import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const COOKIE_NAME = 'admin-session';

async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return false;
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminSession();

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Параметры фильтрации
    const search = searchParams.get('search') || '';
    const formType = searchParams.get('form_type') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const client = await pool.connect();
    try {
      // Строим динамический запрос
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Поиск по имени, email, телефону
      if (search) {
        conditions.push(`(
          LOWER(name) LIKE LOWER($${paramIndex}) OR 
          LOWER(email) LIKE LOWER($${paramIndex}) OR 
          phone LIKE $${paramIndex} OR
          LOWER(institution) LIKE LOWER($${paramIndex}) OR
          LOWER(city) LIKE LOWER($${paramIndex})
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Фильтр по типу формы
      if (formType) {
        conditions.push(`form_type = $${paramIndex}`);
        params.push(formType);
        paramIndex++;
      }

      // Фильтр по статусу
      if (status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      // Фильтр по приоритету
      if (priority) {
        conditions.push(`priority = $${paramIndex}`);
        params.push(priority);
        paramIndex++;
      }

      // Фильтр по дате (от)
      if (dateFrom) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(dateFrom);
        paramIndex++;
      }

      // Фильтр по дате (до)
      if (dateTo) {
        conditions.push(`created_at <= $${paramIndex}::date + interval '1 day'`);
        params.push(dateTo);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Валидация сортировки
      const allowedSortFields = ['created_at', 'updated_at', 'name', 'email', 'status', 'form_type', 'priority'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Получаем общее количество записей
      const countResult = await client.query(
        `SELECT COUNT(*) FROM form_submissions ${whereClause}`,
        params
      );
      const totalCount = parseInt(countResult.rows[0].count);

      // Получаем статистику по статусам
      const statsResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'new') as new_count,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
          COUNT(*) FILTER (WHERE status = 'processed') as processed_count,
          COUNT(*) FILTER (WHERE status = 'archived') as archived_count,
          COUNT(*) as total_count
        FROM form_submissions
      `);

      // Получаем заявки с пагинацией
      const result = await client.query(
        `SELECT * FROM form_submissions 
         ${whereClause}
         ORDER BY ${safeSortBy} ${safeSortOrder}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );
      
      return NextResponse.json({
        requests: result.rows,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        stats: statsResult.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Массовое обновление статуса
export async function PATCH(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminSession();

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, status, priority } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        updates.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (priority) {
        updates.push(`priority = $${paramIndex}`);
        params.push(priority);
        paramIndex++;
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      // Создаем плейсхолдеры для IDs
      const idPlaceholders = ids.map((_, i) => `$${paramIndex + i}`).join(', ');
      params.push(...ids);

      const result = await client.query(
        `UPDATE form_submissions 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id IN (${idPlaceholders})
         RETURNING *`,
        params
      );

      return NextResponse.json({ 
        success: true, 
        updated: result.rowCount,
        requests: result.rows 
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error bulk updating requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Массовое удаление
export async function DELETE(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminSession();

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const idPlaceholders = ids.map((_, i) => `$${i + 1}`).join(', ');
      
      const result = await client.query(
        `DELETE FROM form_submissions WHERE id IN (${idPlaceholders}) RETURNING id`,
        ids
      );

      return NextResponse.json({ 
        success: true, 
        deleted: result.rowCount 
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error bulk deleting requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
