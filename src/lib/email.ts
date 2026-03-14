import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import { randomUUID } from 'crypto';

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

  const rejectUnauthorized = parseBooleanEnv(process.env.SMTP_TLS_REJECT_UNAUTHORIZED, true);

  // TLS настройки для mail.ru
  config.tls = {
    rejectUnauthorized, // По умолчанию true
    minVersion: 'TLSv1.2', // Минимальная версия TLS
  };

  // Дополнительные опции для надежности соединения
  config.pool = false; // Отключаем пул соединений для избежания проблем
  config.maxConnections = 1;
  config.maxMessages = 1;

  // Включаем отладку для nodemailer только в development
  config.debug = process.env.NODE_ENV !== 'production';
  config.logger = process.env.NODE_ENV !== 'production';

  // Принудительно используем IPv4, так как с IPv6 часто бывают проблемы
  config.family = 4;

  const transporter = nodemailer.createTransport(config);
  console.log('[SMTP] Транспортер создан с конфигурацией:', {
    host,
    port,
    secure: config.secure,
    requireTLS: config.requireTLS,
    tls: config.tls
  });

  return transporter;
}

/**
 * Собирает RFC822-сообщение без отправки, чтобы можно было добавить копию в IMAP Sent.
 */
export async function buildRawEmail(mailOptions: Mail.Options): Promise<Buffer> {
  const transporter = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'unix',
  } as any);

  const info = await transporter.sendMail(mailOptions);
  const rawMessage = (info as typeof info & { message?: unknown }).message;

  if (!Buffer.isBuffer(rawMessage)) {
    throw new Error('Не удалось собрать raw email для сохранения в Sent');
  }

  return rawMessage;
}

/**
 * Генерирует стабильный Message-ID, общий для SMTP-отправки, IMAP Sent и CRM.
 */
export function generateMessageId(fromEmail: string): string {
  const [, domain = 'localhost'] = fromEmail.trim().match(/@(.+)$/) || [];
  return `<${randomUUID()}@${domain}>`;
}

/**
 * Получает email отправителя
 */
export function getSenderEmail(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'info@zenitmed.ru';
}

/**
 * Получает отображаемое имя отправителя для поля From
 */
export function getSenderName(): string {
  return process.env.SMTP_FROM_NAME || 'Компания Зенит';
}

/**
 * Возвращает строку "Имя <email>" для заголовка From
 */
export function getSenderAddress(): string {
  const name = getSenderName();
  const email = getSenderEmail();
  return `${name} <${email}>`;
}

/**
 * Получает целевой email для уведомлений
 */
export function getTargetEmail(): string {
  return process.env.TARGET_EMAIL || process.env.SMTP_USER || 'info@zenitmed.ru';
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
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
