import { NextRequest, NextResponse } from 'next/server';
import { createEmailTransporter, getSenderEmail, getTargetEmail } from '@/lib/email';
import { escapeHtml } from '@/lib/sanitize';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function POST(request: NextRequest) {
  console.log('[Request CP API] Получен запрос на отправку формы');
  console.log('[Request CP API] NODE_ENV:', process.env.NODE_ENV);
  
  // Ранняя проверка переменных окружения
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  
  if (!smtpUser || !smtpPassword) {
    console.error('[Request CP API] КРИТИЧЕСКАЯ ОШИБКА: Переменные SMTP не установлены!', {
      SMTP_USER: smtpUser ? 'установлен' : 'НЕ УСТАНОВЛЕН',
      SMTP_PASSWORD: smtpPassword ? 'установлен' : 'НЕ УСТАНОВЛЕН',
      allEnvKeys: Object.keys(process.env).filter(key => key.startsWith('SMTP')),
    });
    return NextResponse.json(
      { 
        error: 'Ошибка конфигурации почтового сервера. Переменные окружения SMTP не установлены.',
        details: process.env.NODE_ENV === 'development' ? 'Проверьте файл .env.local или .env' : undefined
      },
      { status: 500 }
    );
  }
  
  try {
    const body = await request.json();
    const { name, phone, email, city, institution, formType = 'cp' } = body;
    console.log('[Request CP API] Данные формы получены:', {
      name,
      email,
      phone,
      city,
      institution,
      formType,
    });

    // Validate required fields
    if (!name || !phone || !email || !city || !institution) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      );
    }

    // Save to database
    try {
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO form_submissions (form_type, name, email, phone, city, institution, status, page_url, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            formType, 
            name, 
            email, 
            phone, 
            city, 
            institution, 
            'new', 
            request.headers.get('referer') || '',
            JSON.stringify({ city, institution })
          ]
        );
        console.log('[Request CP] Заявка сохранена в БД');
      } finally {
        client.release();
      }
    } catch (dbErr) {
      console.error('[Request CP] Критическая ошибка сохранения в БД:', dbErr);
    }

    console.log('[Request CP] Начало отправки email...');
    
    // Проверяем переменные окружения перед созданием транспортера
    console.log('[Request CP] Проверка переменных окружения:', {
      SMTP_HOST: process.env.SMTP_HOST || 'не установлен',
      SMTP_PORT: process.env.SMTP_PORT || 'не установлен',
      SMTP_USER: process.env.SMTP_USER || 'НЕ УСТАНОВЛЕН',
      SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '***установлен***' : 'НЕ УСТАНОВЛЕН',
      SMTP_FROM: process.env.SMTP_FROM || 'не установлен',
      TARGET_EMAIL: process.env.TARGET_EMAIL || 'не установлен',
    });
    
    // Configure transporter
    let transporter;
    try {
      transporter = createEmailTransporter();
    } catch (smtpError: any) {
      console.error('[Request CP] Ошибка создания SMTP транспортера:', {
        message: smtpError?.message,
        stack: smtpError?.stack,
      });
      return NextResponse.json(
        { 
          error: 'Ошибка конфигурации почтового сервера. Обратитесь к администратору.',
          details: process.env.NODE_ENV === 'development' ? smtpError?.message : undefined
        },
        { status: 500 }
      );
    }
    
    const targetEmail = getTargetEmail();
    const senderEmail = getSenderEmail();

    console.log('[Request CP] Email настройки:', {
      from: senderEmail,
      to: targetEmail,
      userEmail: email,
      formType,
    });

    const safeName = escapeHtml(name);
    const safePhone = escapeHtml(phone);
    const safeEmail = escapeHtml(email);
    const safeCity = escapeHtml(city);
    const safeInstitution = escapeHtml(institution);

    let subject = `Новый запрос КП: ${safeName} (${safeInstitution})`;
    let header = 'Новый запрос коммерческого предложения';
    let userSubject = 'Ваш запрос получен | ЗЕНИТ МЕД';
    let userMessage = 'Мы получили ваш запрос на коммерческое предложение.';

    if (formType === 'training') {
        subject = `Запись на обучение: ${safeName} (${safeInstitution})`;
        header = 'Новая заявка на обучение';
        userSubject = 'Заявка на обучение получена | ЗЕНИТ МЕД';
        userMessage = 'Мы получили вашу заявку на обучение.';
    }

    // 1. Send notification to info@zenitmed.ru
    console.log('[Request CP] Отправка уведомления администратору...');
    const adminResult = await transporter.sendMail({
      from: senderEmail,
      to: targetEmail,
      subject: subject,
      html: `
        <h2>${header}</h2>
        <p><strong>ФИО:</strong> ${safeName}</p>
        <p><strong>Телефон:</strong> ${safePhone}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Город:</strong> ${safeCity}</p>
        <p><strong>Медицинское учреждение:</strong> ${safeInstitution}</p>
        <p><strong>Дата:</strong> ${new Date().toLocaleString('ru-RU')}</p>
      `,
    });
    console.log('[Request CP] Уведомление администратору отправлено:', adminResult.messageId);

    // 2. Send confirmation to the user
    console.log('[Request CP] Отправка подтверждения пользователю...');
    const userResult = await transporter.sendMail({
      from: senderEmail,
      to: email,
      subject: userSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Здравствуйте, ${safeName}!</h2>
          <p>${userMessage}</p>
          <p>Наш менеджер свяжется с вами в ближайшее время для уточнения деталей.</p>
          <br>
          <p>С уважением,<br>Команда ЗЕНИТ МЕД</p>
          <p><a href="https://zenitmed.ru">zenitmed.ru</a></p>
        </div>
      `,
    });
    console.log('[Request CP] Подтверждение пользователю отправлено:', userResult.messageId);
    console.log('[Request CP] Все письма успешно отправлены');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Request CP] Общая ошибка обработки запроса:', {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
      stack: error?.stack,
      name: error?.name,
    });
    const errorMessage = error?.message || 'Неизвестная ошибка при отправке email';
    
    // Если это ошибка конфигурации SMTP, возвращаем понятное сообщение
    if (errorMessage.includes('не установлен') || errorMessage.includes('SMTP') || errorMessage.includes('SMTP_USER') || errorMessage.includes('SMTP_PASSWORD')) {
      return NextResponse.json(
        { 
          error: 'Ошибка конфигурации почтового сервера. Обратитесь к администратору.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    }
    
    // Для других ошибок отправки email возвращаем общее сообщение с деталями в dev режиме
    return NextResponse.json(
      { 
        error: 'Не удалось отправить запрос. Пожалуйста, попробуйте позже или свяжитесь с нами по телефону.',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      },
      { status: 500 }
    );
  }
}
