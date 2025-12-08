import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, city, institution, formType = 'cp' } = body;

    // Validate required fields
    if (!name || !phone || !email || !city || !institution) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      );
    }

    // Configure transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.yandex.ru',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const targetEmail = 'info@zenitmed.ru';
    const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'info@zenitmed.ru';

    let subject = `Новый запрос КП: ${name} (${institution})`;
    let header = 'Новый запрос коммерческого предложения';
    let userSubject = 'Ваш запрос получен | ЗЕНИТ МЕД';
    let userMessage = 'Мы получили ваш запрос на коммерческое предложение.';

    if (formType === 'training') {
        subject = `Запись на обучение: ${name} (${institution})`;
        header = 'Новая заявка на обучение';
        userSubject = 'Заявка на обучение получена | ЗЕНИТ МЕД';
        userMessage = 'Мы получили вашу заявку на обучение.';
    }

    // 1. Send notification to info@zenitmed.ru
    await transporter.sendMail({
      from: senderEmail,
      to: targetEmail,
      subject: subject,
      html: `
        <h2>${header}</h2>
        <p><strong>ФИО:</strong> ${name}</p>
        <p><strong>Телефон:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Город:</strong> ${city}</p>
        <p><strong>Медицинское учреждение:</strong> ${institution}</p>
        <p><strong>Дата:</strong> ${new Date().toLocaleString('ru-RU')}</p>
      `,
    });

    // 2. Send confirmation to the user
    await transporter.sendMail({
      from: senderEmail,
      to: email,
      subject: userSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Здравствуйте, ${name}!</h2>
          <p>${userMessage}</p>
          <p>Наш менеджер свяжется с вами в ближайшее время для уточнения деталей.</p>
          <br>
          <p>С уважением,<br>Команда ЗЕНИТ МЕД</p>
          <p><a href="https://zenitmed.ru">zenitmed.ru</a></p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Не удалось отправить запрос. Пожалуйста, попробуйте позже.' },
      { status: 500 }
    );
  }
}
