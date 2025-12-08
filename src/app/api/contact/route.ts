import { NextRequest, NextResponse } from 'next/server';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json();

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

    // Here you would typically:
    // 1. Save to database
    // 2. Send email notification
    // 3. Send to CRM system
    // For now, we'll just log it and return success

    // Example: Send email (you would use a service like Resend, SendGrid, etc.)
    // await sendEmail({
    //   to: process.env.CONTACT_EMAIL || 'info@zenitmed.ru',
    //   subject: `Новое сообщение от ${body.name}`,
    //   html: `
    //     <h2>Новое сообщение с сайта</h2>
    //     <p><strong>Имя:</strong> ${body.name}</p>
    //     <p><strong>Email:</strong> ${body.email}</p>
    //     <p><strong>Телефон:</strong> ${body.phone}</p>
    //     <p><strong>Сообщение:</strong></p>
    //     <p>${body.message}</p>
    //   `,
    // });

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
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при обработке запроса' },
      { status: 500 }
    );
  }
}

