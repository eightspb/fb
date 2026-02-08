import { NextRequest, NextResponse } from 'next/server';
import { getLogs } from '@/lib/logger';
import { Pool } from 'pg';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

/**
 * GET /api/admin/logs
 * Получение логов с фильтрацией
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации
    const adminSession = request.cookies.get('admin-session')?.value;
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level') as 'info' | 'warn' | 'error' | 'debug' | undefined;
    const context = searchParams.get('context') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const result = await getLogs({
      level,
      context,
      limit: Math.min(limit, 1000), // Максимум 1000 записей
      offset,
      startDate,
      endDate,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API] Ошибка получения логов:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/logs
 * Очистка старых логов
 */
export async function DELETE(request: NextRequest) {
  try {
    // Проверка авторизации
    const adminSession = request.cookies.get('admin-session')?.value;
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);

    const client = await pool.connect();
    try {
      await client.query(
        'DELETE FROM app_logs WHERE created_at < NOW() - INTERVAL $1',
        [`${days} days`]
      );

      const countResult = await client.query('SELECT COUNT(*) as total FROM app_logs');
      const total = parseInt(countResult.rows[0].total, 10);

      return NextResponse.json({
        success: true,
        deleted: true,
        remaining: total,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[API] Ошибка очистки логов:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
