import { NextRequest, NextResponse } from 'next/server';
import { createEmailTransporter, getSenderEmail, getTargetEmail } from '@/lib/email';
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

// Название третьей конференции
const THIRD_CONFERENCE_NAME = 'Миниинвазивная хирургия / Молочная железа 2026';

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

    // Отправка email для третьей конференции
    const isThirdConference = body.conference === THIRD_CONFERENCE_NAME;
    
    if (isThirdConference) {
      try {
        // Configure transporter
        const transporter = createEmailTransporter();
        const targetEmail = getTargetEmail();
        const senderEmail = getSenderEmail();

        // Отправка уведомления на info@zenitmed.ru
        await transporter.sendMail({
          from: senderEmail,
          to: targetEmail,
          subject: `Регистрация на конференцию: ${body.name}`,
          html: `
            <h2>Новая регистрация на конференцию</h2>
            <p><strong>Конференция:</strong> ${body.conference}</p>
            <p><strong>ФИО:</strong> ${body.name}</p>
            <p><strong>Email:</strong> ${body.email}</p>
            <p><strong>Телефон:</strong> ${body.phone}</p>
            ${body.institution ? `<p><strong>Учреждение:</strong> ${body.institution}</p>` : ''}
            <p><strong>Нужен сертификат:</strong> ${body.certificate ? 'Да' : 'Нет'}</p>
            <p><strong>Дата регистрации:</strong> ${new Date().toLocaleString('ru-RU')}</p>
          `,
        });

        // Отправка подтверждения пользователю
        await transporter.sendMail({
          from: senderEmail,
          to: body.email,
          subject: 'Регистрация на конференцию получена | ЗЕНИТ МЕД',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Здравствуйте, ${body.name}!</h2>
              <p>Мы получили вашу регистрацию на конференцию "${body.conference}".</p>
              <p>Наш менеджер свяжется с вами в ближайшее время для подтверждения регистрации.</p>
              <br>
              <p>С уважением,<br>Команда ЗЕНИТ МЕД</p>
              <p><a href="https://zenitmed.ru">zenitmed.ru</a></p>
            </div>
          `,
        });
      } catch (emailError: any) {
        // Логируем ошибку отправки email
        console.error('Error sending registration email:', emailError);
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

