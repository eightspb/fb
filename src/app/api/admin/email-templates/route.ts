import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';

// Явно указываем Node.js runtime для работы с PostgreSQL
export const runtime = 'nodejs';

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

    const client = await pool.connect();
    try {
      // Проверяем существование таблицы
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'email_templates'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        return NextResponse.json(
          { 
            error: 'Таблица email_templates не найдена. Примените миграцию 005_add_email_templates.sql',
            templates: []
          },
          { status: 500 }
        );
      }

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

      const result = await client.query(query, params);
      return NextResponse.json({ templates: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Email Templates API] Ошибка получения шаблонов:', error);
    
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Таблица email_templates не найдена. Примените миграцию 005_add_email_templates.sql',
          templates: [],
          details: error?.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Ошибка получения шаблонов', details: error?.message, templates: [] },
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

    console.log('[Email Templates API] Получен запрос на сохранение:', {
      form_type,
      email_type,
      subjectLength: subject?.length,
      htmlBodyLength: html_body?.length,
    });

    if (!form_type || !email_type || !subject || !html_body) {
      return NextResponse.json(
        { 
          error: 'Все поля обязательны: form_type, email_type, subject, html_body',
          received: { form_type: !!form_type, email_type: !!email_type, subject: !!subject, html_body: !!html_body }
        },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Проверяем существование таблицы
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'email_templates'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        throw new Error('Таблица email_templates не существует. Примените миграцию 005_add_email_templates.sql');
      }

      // Проверяем существование шаблона
      const checkResult = await client.query(
        'SELECT id FROM email_templates WHERE form_type = $1 AND email_type = $2',
        [form_type, email_type]
      );

      if (checkResult.rows.length > 0) {
        // Обновляем существующий шаблон
        console.log('[Email Templates API] Обновление существующего шаблона:', { form_type, email_type });
        await client.query(
          `UPDATE email_templates 
           SET subject = $1, html_body = $2, updated_at = NOW()
           WHERE form_type = $3 AND email_type = $4`,
          [subject, html_body, form_type, email_type]
        );
      } else {
        // Создаем новый шаблон
        console.log('[Email Templates API] Создание нового шаблона:', { form_type, email_type });
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

      if (result.rows.length === 0) {
        throw new Error('Шаблон не найден после сохранения');
      }

      console.log('[Email Templates API] Шаблон успешно сохранен');
      return NextResponse.json({ 
        success: true, 
        template: result.rows[0] 
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Email Templates API] Ошибка сохранения шаблона:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      stack: error?.stack,
    });
    
    // Проверяем, существует ли таблица
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Таблица email_templates не найдена. Примените миграцию 005_add_email_templates.sql',
          details: error?.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Ошибка сохранения шаблона', 
        details: error?.message || error?.detail || 'Неизвестная ошибка',
        code: error?.code 
      },
      { status: 500 }
    );
  }
}
