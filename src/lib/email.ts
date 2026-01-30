import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Проверяет наличие обязательных переменных окружения для SMTP
 */
function validateSmtpConfig(): void {
  if (!process.env.SMTP_USER) {
    console.error('[SMTP] SMTP_USER не установлен в переменных окружения');
    throw new Error('SMTP_USER не установлен в переменных окружения');
  }
  if (!process.env.SMTP_PASSWORD) {
    console.error('[SMTP] SMTP_PASSWORD не установлен в переменных окружения');
    throw new Error('SMTP_PASSWORD не установлен в переменных окружения');
  }
  
  console.log('[SMTP] Конфигурация проверена:', {
    host: process.env.SMTP_HOST || 'smtp.mail.ru',
    port: process.env.SMTP_PORT || '465',
    user: process.env.SMTP_USER,
    passwordSet: !!process.env.SMTP_PASSWORD,
  });
}

/**
 * Создает и возвращает настроенный SMTP транспортер для mail.ru
 */
export function createEmailTransporter(): Transporter {
  validateSmtpConfig();

  const host = process.env.SMTP_HOST || 'smtp.mail.ru';
  const port = parseInt(process.env.SMTP_PORT || '465');
  const user = process.env.SMTP_USER!;
  const password = process.env.SMTP_PASSWORD!;

  // Используем service для mail.ru, если это mail.ru домен
  const isMailRu = user.includes('@mail.ru') || user.includes('@inbox.ru') || 
                    user.includes('@list.ru') || user.includes('@bk.ru') ||
                    host === 'smtp.mail.ru';

  let transporter: Transporter;

  // Для mail.ru всегда используем явную конфигурацию с правильными настройками
  // Встроенная конфигурация может не работать корректно
  if (false && isMailRu && !process.env.SMTP_HOST) {
    // Используем встроенную конфигурацию для mail.ru (отключено, используем явную)
    console.log('[SMTP] Использование встроенной конфигурации для Mail.ru');
    transporter = nodemailer.createTransport({
      service: 'Mail.ru',
      auth: {
        user,
        pass: password,
      },
      connectionTimeout: 60000,
      socketTimeout: 300000,
    });
  } else {
    // Используем явную конфигурацию
    const config: any = {
      host,
      port,
      secure: port === 465, // SSL/TLS для порта 465
      auth: {
        user,
        pass: password,
      },
      // Таймауты для предотвращения разрыва соединения
      connectionTimeout: 60000, // 60 секунд
      socketTimeout: 300000, // 5 минут
      greetingTimeout: 30000, // 30 секунд
    };

    // Для порта 465 используем secure: true, для 587 - secure: false с STARTTLS
    if (port === 587) {
      config.secure = false;
      config.requireTLS = true;
    }

    // TLS настройки для mail.ru
    config.tls = {
      rejectUnauthorized: false, // Для mail.ru может потребоваться
      minVersion: 'TLSv1.2', // Минимальная версия TLS
    };

    // Дополнительные опции для надежности соединения
    config.pool = false; // Отключаем пул соединений для избежания проблем
    config.maxConnections = 1;
    config.maxMessages = 1;
    
    // Включаем отладку для nodemailer
    config.debug = true;
    config.logger = true;

    // Принудительно используем IPv4, так как с IPv6 часто бывают проблемы
    config.family = 4;

    transporter = nodemailer.createTransport(config);
    console.log('[SMTP] Транспортер создан с конфигурацией:', {
      host,
      port,
      secure: config.secure,
      requireTLS: config.requireTLS,
      tls: config.tls
    });
  }
  
  return transporter;
}

/**
 * Получает email отправителя
 */
export function getSenderEmail(): string {
  // Валидация уже выполнена в createEmailTransporter, не нужно повторять
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'info@zenitmed.ru';
}

/**
 * Получает целевой email для уведомлений
 */
export function getTargetEmail(): string {
  return process.env.TARGET_EMAIL || process.env.SMTP_USER || 'info@zenitmed.ru';
}

/**
 * Проверяет подключение к SMTP серверу
 */
export async function verifyConnection(): Promise<boolean> {
  try {
    const transporter = createEmailTransporter();
    await transporter.verify();
    console.log('[SMTP] Подключение к серверу успешно');
    return true;
  } catch (error: any) {
    console.error('[SMTP] Ошибка подключения:', {
      message: error?.message,
      code: error?.code,
      command: error?.command,
    });
    return false;
  }
}
