import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { logDataAction, logUnauthorizedAttempt, logApiError } from '@/lib/user-actions-logger';

// Явно указываем Node.js runtime для работы с PostgreSQL
export const runtime = 'nodejs';

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

// Получить одну заявку по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await verifyAdminSession();

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM form_submissions WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Обновить заявку (статус, заметки, приоритет и т.д.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await verifyAdminSession();

    if (!isAuthenticated) {
      logUnauthorizedAttempt(request, 'Нет действительной сессии администратора');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = await params;
    
    // Разрешённые поля для обновления
    const allowedFields = ['status', 'notes', 'priority', 'assigned_to'];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(id);

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE form_submissions 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      logDataAction(request, 'update', 'form_submission', id, {
        updatedFields: Object.keys(body).filter(k => allowedFields.includes(k)),
      });

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating request:', error);
    logApiError(request, error, 'Update form submission');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Удалить заявку
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await verifyAdminSession();

    if (!isAuthenticated) {
      logUnauthorizedAttempt(request, 'Нет действительной сессии администратора');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM form_submissions WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      logDataAction(request, 'delete', 'form_submission', id);

      return NextResponse.json({ success: true, deleted: id });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error deleting request:', error);
    logApiError(request, error, 'Delete form submission');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
