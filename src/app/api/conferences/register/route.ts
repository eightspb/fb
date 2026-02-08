import { NextRequest, NextResponse } from 'next/server';
import { createEmailTransporter, getSenderEmail, getTargetEmail } from '@/lib/email';
import { escapeHtml } from '@/lib/sanitize';
import { getRenderedEmailTemplate } from '@/lib/email-templates';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

interface ConferenceRegistrationData {
  name: string;
  email: string;
  phone: string;
  institution?: string;
  certificate?: boolean;
  consent: boolean;
  conference: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConferenceRegistrationData = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.phone) {
      return NextResponse.json(
        { error: 'Все обязательные поля должны быть заполнены' },
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
          `INSERT INTO form_submissions (form_type, name, email, phone, institution, status, page_url, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            'conference_registration', 
            body.name, 
            body.email, 
            body.phone, 
            body.institution, 
            'new', 
            request.headers.get('referer') || '',
            JSON.stringify({ 
              conference: body.conference,
              certificate: body.certificate
            })
          ]
        );
        console.log('[Conference Register] Заявка сохранена в БД');
      } finally {
        client.release();
      }
    } catch (dbErr) {
      console.error('[Conference Register] Критическая ошибка сохранения в БД:', dbErr);
    }

    // Log the registration (in production, save to database)
    console.log('Conference registration:', {
      name: body.name,
      email: body.email,
      phone: body.phone,
      institution: body.institution,
      certificate: body.certificate || false,
      conference: body.conference,
      timestamp: new Date().toISOString(),
    });

    // Отправка email для всех конференций
    try {
      console.log('[Conference Register] Начало отправки email...');
      // Configure transporter
      const transporter = createEmailTransporter();
      const targetEmail = getTargetEmail();
      const senderEmail = getSenderEmail();

      console.log('[Conference Register] Email настройки:', {
        from: senderEmail,
        to: targetEmail,
        userEmail: body.email,
        conference: body.conference,
      });

      // Подготовка переменных
      const safeConference = escapeHtml(body.conference);
      const safeName = escapeHtml(body.name);
      const safeEmail = escapeHtml(body.email);
      const safePhone = escapeHtml(body.phone);
      const safeInstitution = body.institution ? escapeHtml(body.institution) : '';
      const dateStr = new Date().toLocaleString('ru-RU');
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibroadenoma.net';
      const siteHostname = siteUrl.startsWith('http') ? new URL(siteUrl).hostname : 'fibroadenoma.net';

      // Получаем и рендерим шаблон для администратора
      const adminTemplate = await getRenderedEmailTemplate('conference_registration', 'admin', {
        conference: safeConference,
        name: safeName,
        email: safeEmail,
        phone: safePhone,
        institution: safeInstitution,
        certificate: body.certificate ? 'Да' : 'Нет',
        date: dateStr,
      });

      // Отправка уведомления администратору
      console.log('[Conference Register] Отправка уведомления администратору...');
      const adminSubject = adminTemplate?.subject || `Регистрация на конференцию: ${safeName}`;
      const adminHtml = adminTemplate?.html || `
        <h2>Новая регистрация на конференцию</h2>
        <p><strong>Конференция:</strong> ${safeConference}</p>
        <p><strong>ФИО:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Телефон:</strong> ${safePhone}</p>
        ${safeInstitution ? `<p><strong>Учреждение:</strong> ${safeInstitution}</p>` : ''}
        <p><strong>Нужен сертификат:</strong> ${body.certificate ? 'Да' : 'Нет'}</p>
        <p><strong>Дата регистрации:</strong> ${dateStr}</p>
      `;

      await transporter.sendMail({
        from: senderEmail,
        to: targetEmail,
        subject: adminSubject,
        html: adminHtml,
      });
      console.log('[Conference Register] Уведомление администратору отправлено');

      // Получаем и рендерим шаблон для пользователя
      const userTemplate = await getRenderedEmailTemplate('conference_registration', 'user', {
        name: safeName,
        conference: safeConference,
        siteUrl,
        siteHostname,
      });

      // Отправка подтверждения пользователю
      console.log('[Conference Register] Отправка подтверждения пользователю...');
      const userSubject = userTemplate?.subject || 'Регистрация на конференцию получена | Компания ЗЕНИТ';
      const userHtml = userTemplate?.html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Здравствуйте, ${safeName}!</h2>
          <p>Мы получили вашу регистрацию на конференцию "${safeConference}".</p>
          <p>Благодарим за регистрацию и ждём вас!</p>
          <br>
          <p>С уважением,<br>Компания ЗЕНИТ</p>
          <p><a href="${siteUrl}">${siteHostname}</a></p>
        </div>
      `;

      await transporter.sendMail({
        from: senderEmail,
        to: body.email,
        subject: userSubject,
        html: userHtml,
      });
      console.log('[Conference Register] Подтверждение пользователю отправлено');
    } catch (emailError: any) {
      // Логируем ошибку отправки email
      console.error('[Conference Register] Ошибка отправки email:', emailError);
      const errorMessage = emailError?.message || 'Неизвестная ошибка при отправке email';
      
      // Если это ошибка конфигурации SMTP, возвращаем ошибку
      if (errorMessage.includes('не установлен') || errorMessage.includes('SMTP')) {
        return NextResponse.json(
          { error: 'Ошибка конфигурации почтового сервера. Обратитесь к администратору.' },
          { status: 500 }
        );
      }
      
      // Для других ошибок отправки email возвращаем общее сообщение
      return NextResponse.json(
        { error: 'Не удалось отправить регистрацию. Пожалуйста, попробуйте позже или свяжитесь с нами по телефону.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Регистрация успешно отправлена',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing conference registration:', error);
    const errorMessage = error?.message || 'Неизвестная ошибка';
    
    // Если это ошибка конфигурации SMTP, возвращаем понятное сообщение
    if (errorMessage.includes('не установлен') || errorMessage.includes('SMTP')) {
      return NextResponse.json(
        { error: 'Ошибка конфигурации почтового сервера. Обратитесь к администратору.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Произошла ошибка при обработке запроса' },
      { status: 500 }
    );
  }
}

