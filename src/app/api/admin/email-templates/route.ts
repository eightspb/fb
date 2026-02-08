import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

// GET - Получить все шаблоны или шаблон для конкретной формы
export async function GET(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Не авторизован' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const formType = searchParams.get('form_type');
    const emailType = searchParams.get('email_type');

    let query = 'SELECT * FROM email_templates';
    const params: any[] = [];
    
    if (formType && emailType) {
      query += ' WHERE form_type = $1 AND email_type = $2';
      params.push(formType, emailType);
    } else if (formType) {
      query += ' WHERE form_type = $1';
      params.push(formType);
    }
    
    query += ' ORDER BY form_type, email_type';

    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return NextResponse.json({ templates: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Email Templates API] Ошибка получения шаблонов:', error);
    return NextResponse.json(
      { error: 'Ошибка получения шаблонов', details: error?.message },
      { status: 500 }
    );
  }
}

// PUT - Обновить шаблон
export async function PUT(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Не авторизован' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { form_type, email_type, subject, html_body } = body;

    if (!form_type || !email_type || !subject || !html_body) {
      return NextResponse.json(
        { error: 'Все поля обязательны: form_type, email_type, subject, html_body' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Проверяем существование шаблона
      const checkResult = await client.query(
        'SELECT id FROM email_templates WHERE form_type = $1 AND email_type = $2',
        [form_type, email_type]
      );

      if (checkResult.rows.length > 0) {
        // Обновляем существующий шаблон
        await client.query(
          `UPDATE email_templates 
           SET subject = $1, html_body = $2, updated_at = NOW()
           WHERE form_type = $3 AND email_type = $4`,
          [subject, html_body, form_type, email_type]
        );
      } else {
        // Создаем новый шаблон
        await client.query(
          `INSERT INTO email_templates (form_type, email_type, subject, html_body)
           VALUES ($1, $2, $3, $4)`,
          [form_type, email_type, subject, html_body]
        );
      }

      // Возвращаем обновленный шаблон
      const result = await client.query(
        'SELECT * FROM email_templates WHERE form_type = $1 AND email_type = $2',
        [form_type, email_type]
      );

      return NextResponse.json({ 
        success: true, 
        template: result.rows[0] 
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Email Templates API] Ошибка сохранения шаблона:', error);
    return NextResponse.json(
      { error: 'Ошибка сохранения шаблона', details: error?.message },
      { status: 500 }
    );
  }
}
