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

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Если содержит запятую, кавычки или перенос строки - оборачиваем в кавычки
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const formTypeLabels: Record<string, string> = {
  'contact': 'Контактная форма',
  'cp': 'Запрос КП',
  'training': 'Заявка на обучение',
  'conference_registration': 'Регистрация на конференцию'
};

const statusLabels: Record<string, string> = {
  'new': 'Новая',
  'in_progress': 'В работе',
  'processed': 'Обработана',
  'archived': 'В архиве'
};

const priorityLabels: Record<string, string> = {
  'low': 'Низкий',
  'normal': 'Обычный',
  'high': 'Высокий',
  'urgent': 'Срочный'
};

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAdminSession();

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Параметры фильтрации (те же что и в основном API)
    const formType = searchParams.get('form_type') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];

    const client = await pool.connect();
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Если указаны конкретные ID - экспортируем только их
      if (ids.length > 0) {
        const idPlaceholders = ids.map((_, i) => `$${paramIndex + i}`).join(', ');
        conditions.push(`id IN (${idPlaceholders})`);
        params.push(...ids);
        paramIndex += ids.length;
      } else {
        // Иначе применяем фильтры
        if (formType) {
          conditions.push(`form_type = $${paramIndex}`);
          params.push(formType);
          paramIndex++;
        }

        if (status) {
          conditions.push(`status = $${paramIndex}`);
          params.push(status);
          paramIndex++;
        }

        if (dateFrom) {
          conditions.push(`created_at >= $${paramIndex}`);
          params.push(dateFrom);
          paramIndex++;
        }

        if (dateTo) {
          conditions.push(`created_at <= $${paramIndex}::date + interval '1 day'`);
          params.push(dateTo);
          paramIndex++;
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await client.query(
        `SELECT * FROM form_submissions ${whereClause} ORDER BY created_at DESC`,
        params
      );

      // Формируем CSV
      const headers = [
        'ID',
        'Дата создания',
        'Тип формы',
        'Статус',
        'Приоритет',
        'Имя',
        'Email',
        'Телефон',
        'Город',
        'Учреждение',
        'Сообщение',
        'Заметки',
        'Страница',
        'Доп. данные'
      ];

      const rows = result.rows.map(row => [
        escapeCSV(row.id),
        escapeCSV(formatDate(row.created_at)),
        escapeCSV(formTypeLabels[row.form_type] || row.form_type),
        escapeCSV(statusLabels[row.status] || row.status),
        escapeCSV(priorityLabels[row.priority] || row.priority || 'Обычный'),
        escapeCSV(row.name),
        escapeCSV(row.email),
        escapeCSV(row.phone),
        escapeCSV(row.city),
        escapeCSV(row.institution),
        escapeCSV(row.message),
        escapeCSV(row.notes),
        escapeCSV(row.page_url),
        escapeCSV(row.metadata ? JSON.stringify(row.metadata) : '')
      ].join(','));

      // BOM для корректного отображения кириллицы в Excel
      const BOM = '\uFEFF';
      const csv = BOM + headers.join(',') + '\n' + rows.join('\n');

      const filename = `requests_${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error exporting requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
