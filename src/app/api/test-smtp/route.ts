import { NextResponse } from 'next/server';
import { createEmailTransporter, getSenderEmail, getTargetEmail } from '@/lib/email';

export async function GET() {
  try {
    console.log('[Test SMTP] Начало проверки SMTP...');
    
    // 1. Проверяем переменные окружения
    const envCheck = {
      SMTP_HOST: process.env.SMTP_HOST || 'не установлен (будет использован smtp.mail.ru)',
      SMTP_PORT: process.env.SMTP_PORT || 'не установлен (будет использован 465)',
      SMTP_USER: process.env.SMTP_USER || 'НЕ УСТАНОВЛЕН',
      SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '***установлен***' : 'НЕ УСТАНОВЛЕН',
      SMTP_FROM: process.env.SMTP_FROM || 'не установлен',
      TARGET_EMAIL: process.env.TARGET_EMAIL || 'не установлен',
    };

    console.log('[Test SMTP] Переменные окружения:', envCheck);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
       return NextResponse.json({
        success: false,
        message: 'Отсутствуют обязательные переменные окружения SMTP_USER или SMTP_PASSWORD',
        env: envCheck,
      }, { status: 500 });
    }

    // 2. Создаем транспортер и показываем конфигурацию
    let transporter;
    try {
        transporter = createEmailTransporter();
    } catch (configError: any) {
        return NextResponse.json({
            success: false,
            message: 'Ошибка при создании конфигурации SMTP',
            error: configError?.message,
            env: envCheck,
          }, { status: 500 });
    }

    // 3. Проверяем подключение
    console.log('[Test SMTP] Проверка подключения verify()...');
    try {
        await transporter.verify();
        console.log('[Test SMTP] verify() успешно');
    } catch (verifyError: any) {
         console.error('[Test SMTP] Ошибка verify():', verifyError);
         return NextResponse.json({
            success: false,
            message: 'Ошибка подключения к SMTP серверу (verify)',
            error: verifyError?.message,
            code: verifyError?.code,
            command: verifyError?.command,
            response: verifyError?.response,
            env: envCheck,
          }, { status: 500 });
    }
    
    // 4. Пробуем отправить тестовое письмо
    try {
      const senderEmail = getSenderEmail();
      const targetEmail = getTargetEmail();

      console.log('[Test SMTP] Отправка тестового письма...');
      const result = await transporter.sendMail({
        from: senderEmail,
        to: targetEmail,
        subject: 'Тестовое письмо от сайта (SMTP Check)',
        html: `
            <h1>Тестовое письмо</h1>
            <p>Это письмо отправлено для проверки настроек SMTP.</p>
            <p><strong>Время:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Конфигурация:</strong></p>
            <ul>
                <li>Host: ${process.env.SMTP_HOST || 'default'}</li>
                <li>Port: ${process.env.SMTP_PORT || 'default'}</li>
                <li>User: ${process.env.SMTP_USER}</li>
            </ul>
        `,
      });

      console.log('[Test SMTP] Тестовое письмо отправлено:', result.messageId);

      return NextResponse.json({
        success: true,
        message: 'SMTP настроен правильно, тестовое письмо отправлено',
        messageId: result.messageId,
        envelope: result.envelope,
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response,
        env: envCheck,
      });
    } catch (sendError: any) {
      console.error('[Test SMTP] Ошибка отправки тестового письма:', sendError);
      return NextResponse.json({
        success: false,
        message: 'Подключение успешно (verify), но не удалось отправить письмо',
        error: sendError?.message,
        code: sendError?.code,
        command: sendError?.command,
        response: sendError?.response,
        env: envCheck,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Test SMTP] Общая ошибка:', error);
    return NextResponse.json({
      success: false,
      message: 'Неизвестная ошибка при проверке SMTP',
      error: error?.message,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    }, { status: 500 });
  }
}
