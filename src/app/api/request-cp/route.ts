import { NextRequest, NextResponse } from 'next/server';
import { createEmailTransporter, getSenderEmail, getTargetEmail } from '@/lib/email';
import { escapeHtml } from '@/lib/sanitize';
import { getRenderedEmailTemplate } from '@/lib/email-templates';
import { notifyAdminAboutFormSubmission, notifyAdminAboutError } from '@/lib/telegram-notifications';
import { Pool } from 'pg';

// Явно указываем Node.js runtime для работы с PostgreSQL
export const runtime = 'nodejs';

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
  
  // Объявляем переменные вне блока try для использования в catch
  let formType = 'cp';
  let name: string | undefined;
  let phone: string | undefined;
  let email: string | undefined;
  let city: string | undefined;
  let institution: string | undefined;
  
  try {
    const body = await request.json();
    ({ name, phone, email, city, institution, formType = 'cp' } = body);
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
        
        // Отправляем уведомление в Telegram
        notifyAdminAboutFormSubmission({
          formType,
          name,
          email,
          phone,
          city,
          institution,
          pageUrl: request.headers.get('referer') || undefined,
        }).catch(err => {
          console.error('[Request CP] Ошибка отправки уведомления в Telegram:', err);
        });
      } finally {
        client.release();
      }
    } catch (dbErr) {
      console.error('[Request CP] Критическая ошибка сохранения в БД:', dbErr);
      // Отправляем уведомление об ошибке
      notifyAdminAboutError(
        dbErr instanceof Error ? dbErr : new Error(String(dbErr)),
        {
          location: '/api/request-cp',
          requestUrl: request.url,
          requestMethod: 'POST',
          additionalInfo: {
            formType,
            name,
            email,
          },
        }
      ).catch(err => {
        console.error('[Request CP] Ошибка отправки уведомления об ошибке:', err);
      });
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
    const dateStr = new Date().toLocaleString('ru-RU');

    // Получаем и рендерим шаблон для администратора
    const adminTemplate = await getRenderedEmailTemplate(formType, 'admin', {
      name: safeName,
      phone: safePhone,
      email: safeEmail,
      city: safeCity,
      institution: safeInstitution,
      date: dateStr,
    });

    // Отправка уведомления администратору
    console.log('[Request CP] Отправка уведомления администратору...');
    const adminSubject = adminTemplate?.subject || 
      (formType === 'training' 
        ? `Запись на обучение: ${safeName} (${safeInstitution})`
        : `Новый запрос КП: ${safeName} (${safeInstitution})`);
    const adminHtml = adminTemplate?.html || `
      <h2>${formType === 'training' ? 'Новая заявка на обучение' : 'Новый запрос коммерческого предложения'}</h2>
      <p><strong>ФИО:</strong> ${safeName}</p>
      <p><strong>Телефон:</strong> ${safePhone}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Город:</strong> ${safeCity}</p>
      <p><strong>Медицинское учреждение:</strong> ${safeInstitution}</p>
      <p><strong>Дата:</strong> ${dateStr}</p>
    `;

    const adminResult = await transporter.sendMail({
      from: senderEmail,
      to: targetEmail,
      subject: adminSubject,
      html: adminHtml,
    });
    console.log('[Request CP] Уведомление администратору отправлено:', adminResult.messageId);

    // Получаем и рендерим шаблон для пользователя
    const userTemplate = await getRenderedEmailTemplate(formType, 'user', {
      name: safeName,
      date: dateStr,
    });

    // Отправка подтверждения пользователю
    console.log('[Request CP] Отправка подтверждения пользователю...');
    const userSubject = userTemplate?.subject || 
      (formType === 'training' 
        ? 'Заявка на обучение получена | ЗЕНИТ МЕД'
        : 'Ваш запрос получен | ЗЕНИТ МЕД');
    const userHtml = userTemplate?.html || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Здравствуйте, ${safeName}!</h2>
        <p>${formType === 'training' ? 'Мы получили вашу заявку на обучение.' : 'Мы получили ваш запрос на коммерческое предложение.'}</p>
        <p>Наш менеджер свяжется с вами в ближайшее время для уточнения деталей.</p>
        <br>
        <p>С уважением,<br>Команда ЗЕНИТ МЕД</p>
        <p><a href="https://zenitmed.ru">zenitmed.ru</a></p>
      </div>
    `;

    const userResult = await transporter.sendMail({
      from: senderEmail,
      to: email,
      subject: userSubject,
      html: userHtml,
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
    
    // Отправляем уведомление об ошибке в Telegram
    notifyAdminAboutError(
      error instanceof Error ? error : new Error(errorMessage),
      {
        location: '/api/request-cp',
        requestUrl: request.url,
        requestMethod: 'POST',
        additionalInfo: {
          formType,
          errorCode: error?.code,
          errorResponseCode: error?.responseCode,
        },
      }
    ).catch(err => {
      console.error('[Request CP] Ошибка отправки уведомления об ошибке:', err);
    });
    
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
