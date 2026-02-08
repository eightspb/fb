import { NextRequest, NextResponse } from 'next/server';
import { createEmailTransporter, getSenderEmail, getTargetEmail } from '@/lib/email';
import { escapeHtml } from '@/lib/sanitize';
import { getRenderedEmailTemplate } from '@/lib/email-templates';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}

export async function POST(request: NextRequest) {
  console.log('[Contact Form API] Получен запрос на отправку формы');
  try {
    const body: ContactFormData = await request.json();
    console.log('[Contact Form API] Данные формы получены:', {
      name: body.name,
      email: body.email,
      phone: body.phone,
      messageLength: body.message?.length || 0,
      consent: body.consent,
    });

    // Validate required fields
    if (!body.name || !body.email || !body.phone || !body.message) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      );
    }

    if (!body.consent) {
      return NextResponse.json(
        { error: 'Необходимо согласие на обработку персональных данных' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Неверный формат email' },
        { status: 400 }
      );
    }

    // Save to database
    try {
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO form_submissions (form_type, name, email, phone, message, status, page_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['contact', body.name, body.email, body.phone, body.message, 'new', request.headers.get('referer') || '']
        );
        console.log('[Contact Form] Заявка сохранена в БД');
      } finally {
        client.release();
      }
    } catch (dbErr) {
      console.error('[Contact Form] Критическая ошибка сохранения в БД:', dbErr);
    }

    // Send email notification
    try {
      console.log('[Contact Form] Начало отправки email...');
      const transporter = createEmailTransporter();
      const senderEmail = getSenderEmail();
      const targetEmail = getTargetEmail();

      console.log('[Contact Form] Email настройки:', {
        from: senderEmail,
        to: targetEmail,
        userEmail: body.email,
      });

      // Подготовка переменных для шаблонов
      const safeName = escapeHtml(body.name);
      const safeEmail = escapeHtml(body.email);
      const safePhone = escapeHtml(body.phone);
      const safeMessage = escapeHtml(body.message).replace(/\n/g, '<br>');
      const dateStr = new Date().toLocaleString('ru-RU');

      // Получаем и рендерим шаблон для администратора
      const adminTemplate = await getRenderedEmailTemplate('contact', 'admin', {
        name: safeName,
        email: safeEmail,
        phone: safePhone,
        message: safeMessage,
        date: dateStr,
      });

      // Отправка уведомления администратору
      console.log('[Contact Form] Отправка уведомления администратору...');
      const adminSubject = adminTemplate?.subject || `Новое сообщение с сайта от ${safeName}`;
      const adminHtml = adminTemplate?.html || `
        <h2>Новое сообщение с сайта</h2>
        <p><strong>Имя:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Телефон:</strong> ${safePhone}</p>
        <p><strong>Сообщение:</strong></p>
        <p>${safeMessage}</p>
        <p><strong>Дата:</strong> ${dateStr}</p>
      `;

      const adminResult = await transporter.sendMail({
        from: senderEmail,
        to: targetEmail,
        subject: adminSubject,
        html: adminHtml,
      });
      console.log('[Contact Form] Уведомление администратору отправлено:', adminResult.messageId);

      // Получаем и рендерим шаблон для пользователя
      const userTemplate = await getRenderedEmailTemplate('contact', 'user', {
        name: safeName,
        date: dateStr,
      });

      // Отправка подтверждения пользователю
      console.log('[Contact Form] Отправка подтверждения пользователю...');
      const userSubject = userTemplate?.subject || 'Ваше сообщение получено | ЗЕНИТ МЕД';
      const userHtml = userTemplate?.html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Здравствуйте, ${safeName}!</h2>
          <p>Мы получили ваше сообщение и свяжемся с вами в ближайшее время.</p>
          <br>
          <p>С уважением,<br>Команда ЗЕНИТ МЕД</p>
          <p><a href="https://zenitmed.ru">zenitmed.ru</a></p>
        </div>
      `;

      const userResult = await transporter.sendMail({
        from: senderEmail,
        to: body.email,
        subject: userSubject,
        html: userHtml,
      });
      console.log('[Contact Form] Подтверждение пользователю отправлено:', userResult.messageId);
      console.log('[Contact Form] Все письма успешно отправлены');
    } catch (emailError: any) {
      console.error('[Contact Form] Ошибка отправки email:', {
        message: emailError?.message,
        code: emailError?.code,
        command: emailError?.command,
        response: emailError?.response,
        responseCode: emailError?.responseCode,
        stack: emailError?.stack,
      });
      
      const errorMessage = emailError?.message || 'Неизвестная ошибка при отправке email';
      
      // Если это ошибка конфигурации SMTP, возвращаем понятное сообщение
      if (errorMessage.includes('не установлен') || errorMessage.includes('SMTP')) {
        return NextResponse.json(
          { error: 'Ошибка конфигурации почтового сервера. Обратитесь к администратору.' },
          { status: 500 }
        );
      }
      
      // Для других ошибок отправки email возвращаем общее сообщение с деталями в dev режиме
      return NextResponse.json(
        { 
          error: 'Не удалось отправить сообщение. Пожалуйста, попробуйте позже или свяжитесь с нами по телефону.',
          ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
        },
        { status: 500 }
      );
    }

    // Log the submission (in production, save to database)
    console.log('Contact form submission:', {
      name: body.name,
      email: body.email,
      phone: body.phone,
      message: body.message,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Сообщение успешно отправлено',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Contact Form API] Общая ошибка обработки:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause,
    });
    return NextResponse.json(
      { 
        error: 'Произошла ошибка при обработке запроса',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error?.message,
          stack: error?.stack 
        })
      },
      { status: 500 }
    );
  }
}

