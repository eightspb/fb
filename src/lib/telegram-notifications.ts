/**
 * Уведомления администратору через Telegram
 */

import TelegramBot from 'node-telegram-bot-api';
import { Pool } from 'pg';

// Ленивая инициализация для избежания проблем с Edge Runtime
let bot: TelegramBot | null = null;
let pool: Pool | null = null;
let adminChatIdNumber: number | null = null;

function initializeBot() {
  if (bot !== null) return;
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  // Преобразуем adminChatId в число
  adminChatIdNumber = adminChatId ? parseInt(adminChatId, 10) : null;

  if (!botToken) {
    console.warn('[NOTIFY] ⚠️ TELEGRAM_BOT_TOKEN не установлен');
  } else {
    console.log('[NOTIFY] ✅ TELEGRAM_BOT_TOKEN найден');
  }

  if (!adminChatIdNumber) {
    console.warn('[NOTIFY] ⚠️ TELEGRAM_ADMIN_CHAT_ID не установлен или неверный');
  } else {
    console.log(`[NOTIFY] ✅ TELEGRAM_ADMIN_CHAT_ID найден: ${adminChatIdNumber}`);
  }

  bot = botToken ? new TelegramBot(botToken, { polling: false }) : null;
}

function getPool() {
  if (pool === null) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
    });
  }
  return pool;
}

interface NewsPreview {
  title: string;
  shortDescription: string;
  fullDescription: string;
}

/**
 * Отправляет уведомление администратору о новом черновике
 */
export async function notifyAdminAboutDraft(
  newsId: string,
  preview: NewsPreview,
  imagesCount: number = 0
): Promise<void> {
  initializeBot();
  console.log(`[NOTIFY] 📤 Отправка уведомления администратору о новости: ${newsId}`);
  
  if (!bot || !adminChatIdNumber) {
    console.warn('[NOTIFY] ⚠️ Бот или admin chat ID не настроены, пропускаем уведомление');
    return;
  }

  try {
    // Получаем первое изображение для превью (если есть)
    console.log('[NOTIFY] 🔍 Получение превью изображения...');
    const client = await getPool().connect();
    let firstImageUrl: string | null = null;

    try {
      const imageResult = await client.query(
        'SELECT image_url FROM news_images WHERE news_id = $1 ORDER BY "order" LIMIT 1',
        [newsId]
      );

      if (imageResult.rows.length > 0) {
        firstImageUrl = imageResult.rows[0].image_url;
        console.log(`[NOTIFY] 📷 Найдено превью изображение: ${firstImageUrl}`);
      } else {
        console.log('[NOTIFY] ℹ️ Превью изображение не найдено');
      }
    } finally {
      client.release();
    }

    // Формируем текст сообщения
    const messageText = `📰 <b>Новая новость ожидает подтверждения</b>\n\n` +
      `🆔 ID: <code>${newsId}</code>\n` +
      `📝 Заголовок: <b>${preview.title}</b>\n` +
      `📄 Описание: ${preview.shortDescription.substring(0, 200)}${preview.shortDescription.length > 200 ? '...' : ''}\n` +
      `📷 Фотографий: ${imagesCount}\n\n` +
      `Выберите действие:`;

    // Создаем inline кнопки
    // ВАЖНО: callback_data ограничен 64 байтами в Telegram
    // Используем максимально короткий формат: "p:ID" или "r:ID"
    // Ограничиваем newsId до 20 символов (2 для префикса + 20 для ID + 1 для двоеточия = 23 байта максимум)
    // Это безопасно даже для кириллицы (каждый символ = 2 байта)
    const maxIdLength = 20;
    const shortNewsId = newsId.length > maxIdLength ? newsId.substring(0, maxIdLength) : newsId;
    
    // Используем еще более короткие префиксы
    const publishCallback = `p:${shortNewsId}`;
    const rejectCallback = `r:${shortNewsId}`;
    
    // Проверяем длину в байтах (важно для кириллицы)
    const publishBytes = Buffer.byteLength(publishCallback, 'utf8');
    const rejectBytes = Buffer.byteLength(rejectCallback, 'utf8');
    
    console.log(`[NOTIFY] 📏 Длина callback_data: publish=${publishBytes} байт (${publishCallback.length} символов), reject=${rejectBytes} байт (${rejectCallback.length} символов)`);
    console.log(`[NOTIFY] 📝 callback_data: publish="${publishCallback}", reject="${rejectCallback}"`);
    
    let finalPublishCallback = publishCallback;
    let finalRejectCallback = rejectCallback;
    
    if (publishBytes > 64 || rejectBytes > 64) {
      console.error(`[NOTIFY] ❌ callback_data слишком длинный! publish=${publishBytes} байт, reject=${rejectBytes} байт`);
      // Если все еще слишком длинный, используем только первые 10 символов
      const veryShortId = newsId.substring(0, 10);
      finalPublishCallback = `p:${veryShortId}`;
      finalRejectCallback = `r:${veryShortId}`;
      console.log(`[NOTIFY] 🔄 Используем сокращенный ID: "${finalPublishCallback}"`);
    }
    
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '✅ Опубликовать',
            callback_data: finalPublishCallback,
          },
          {
            text: '❌ Отклонить',
            callback_data: finalRejectCallback,
          },
        ],
        [
          {
            text: '👁️ Просмотреть',
            url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/news/${newsId}`,
          },
        ],
      ],
    };

    // Отправляем сообщение с превью изображения, если есть
    if (firstImageUrl) {
      // Пытаемся отправить фото с кнопками
      try {
        // Формируем путь к изображению (только для локальных путей)
        let imagePath = firstImageUrl;
        if (firstImageUrl.startsWith('/') && typeof process !== 'undefined' && process.cwd) {
          imagePath = `${process.cwd()}/public${firstImageUrl}`;
        }

        console.log(`[NOTIFY] 📤 Отправка фото с уведомлением: ${imagePath}`);
        await bot.sendPhoto(adminChatIdNumber, imagePath, {
          caption: messageText,
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
        console.log('[NOTIFY] ✅ Уведомление с фото отправлено');
        return;
      } catch (error) {
        console.warn('[NOTIFY] ⚠️ Не удалось отправить фото, отправляем текстовое сообщение:', error);
        if (error instanceof Error) {
          console.error('[NOTIFY] Детали ошибки фото:', error.message);
        }
      }
    }

    // Отправляем текстовое сообщение
    console.log('[NOTIFY] 📤 Отправка текстового уведомления...');
    await bot.sendMessage(adminChatIdNumber, messageText, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    console.log('[NOTIFY] ✅ Текстовое уведомление отправлено');
  } catch (error) {
    console.error('[NOTIFY] ❌ Ошибка при отправке уведомления администратору:', error);
    if (error instanceof Error) {
      console.error('[NOTIFY] Сообщение об ошибке:', error.message);
      console.error('[NOTIFY] Stack trace:', error.stack);
    }
    // Пытаемся отправить простое текстовое сообщение без кнопок
    try {
      await bot.sendMessage(
        adminChatIdNumber,
        `📰 Новая новость ожидает подтверждения\n\nID: ${newsId}\nЗаголовок: ${preview.title}\n\nПросмотреть: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/news/${newsId}`
      );
      console.log('[NOTIFY] ✅ Простое уведомление отправлено');
    } catch (fallbackError) {
      console.error('[NOTIFY] ❌ Не удалось отправить даже простое уведомление:', fallbackError);
    }
  }
}

/**
 * Отправляет подтверждение о публикации
 */
export async function notifyPublishConfirmation(newsId: string): Promise<void> {
  initializeBot();
  if (!bot || !adminChatIdNumber) {
    return;
  }

  try {
    await bot.sendMessage(
      adminChatIdNumber,
      `✅ Новость <code>${newsId}</code> успешно опубликована!`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Ошибка при отправке подтверждения:', error);
  }
}

/**
 * Отправляет уведомление об отклонении
 */
export async function notifyRejection(newsId: string): Promise<void> {
  initializeBot();
  if (!bot || !adminChatIdNumber) {
    return;
  }

  try {
    await bot.sendMessage(
      adminChatIdNumber,
      `❌ Новость <code>${newsId}</code> отклонена и удалена.`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Ошибка при отправке уведомления об отклонении:', error);
  }
}

/**
 * Интерфейс данных заявки
 */
interface FormSubmissionData {
  formType: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  city?: string;
  institution?: string;
  pageUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Отправляет уведомление администратору о новой заявке
 */
export async function notifyAdminAboutFormSubmission(data: FormSubmissionData): Promise<void> {
  initializeBot();
  console.log(`[NOTIFY] 📤 Отправка уведомления о новой заявке: ${data.formType}`);
  
  if (!bot || !adminChatIdNumber) {
    console.warn('[NOTIFY] ⚠️ Бот или admin chat ID не настроены, пропускаем уведомление');
    return;
  }

  try {
    // Определяем тип заявки и формируем заголовок
    let formTypeLabel = '';
    let emoji = '📋';
    
    switch (data.formType) {
      case 'contact':
        formTypeLabel = 'Форма обратной связи';
        emoji = '💬';
        break;
      case 'cp':
        formTypeLabel = 'Запрос коммерческого предложения';
        emoji = '💼';
        break;
      case 'training':
        formTypeLabel = 'Заявка на обучение';
        emoji = '🎓';
        break;
      case 'conference_registration':
        formTypeLabel = 'Регистрация на конференцию';
        emoji = '🎤';
        break;
      default:
        formTypeLabel = 'Новая заявка';
    }

    // Формируем текст сообщения
    let messageText = `${emoji} <b>${formTypeLabel}</b>\n\n`;
    messageText += `👤 <b>Имя:</b> ${escapeHtml(data.name)}\n`;
    messageText += `📧 <b>Email:</b> ${escapeHtml(data.email)}\n`;
    messageText += `📞 <b>Телефон:</b> ${escapeHtml(data.phone)}\n`;
    
    if (data.city) {
      messageText += `🏙️ <b>Город:</b> ${escapeHtml(data.city)}\n`;
    }
    
    if (data.institution) {
      messageText += `🏥 <b>Учреждение:</b> ${escapeHtml(data.institution)}\n`;
    }
    
    if (data.message) {
      const shortMessage = data.message.length > 200 
        ? data.message.substring(0, 200) + '...' 
        : data.message;
      messageText += `\n💬 <b>Сообщение:</b>\n${escapeHtml(shortMessage)}\n`;
    }
    
    if (data.metadata) {
      if (data.metadata.conference) {
        messageText += `\n🎤 <b>Конференция:</b> ${escapeHtml(data.metadata.conference)}\n`;
      }
      if (data.metadata.certificate !== undefined) {
        messageText += `📜 <b>Сертификат:</b> ${data.metadata.certificate ? 'Да' : 'Нет'}\n`;
      }
    }
    
    messageText += `\n🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU')}\n`;
    
    if (data.pageUrl) {
      messageText += `\n🔗 <b>Страница:</b> ${escapeHtml(data.pageUrl)}`;
    }

    // Отправляем сообщение
    await bot.sendMessage(adminChatIdNumber, messageText, {
      parse_mode: 'HTML',
    });
    console.log('[NOTIFY] ✅ Уведомление о заявке отправлено');
  } catch (error) {
    console.error('[NOTIFY] ❌ Ошибка при отправке уведомления о заявке:', error);
    if (error instanceof Error) {
      console.error('[NOTIFY] Сообщение об ошибке:', error.message);
    }
  }
}

/**
 * Отправляет уведомление администратору об ошибке
 */
export async function notifyAdminAboutError(
  error: Error | string,
  context?: {
    location?: string;
    requestUrl?: string;
    requestMethod?: string;
    userId?: string;
    additionalInfo?: Record<string, any>;
  }
): Promise<void> {
  initializeBot();
  console.log('[NOTIFY] 📤 Отправка уведомления об ошибке');
  
  if (!bot || !adminChatIdNumber) {
    console.warn('[NOTIFY] ⚠️ Бот или admin chat ID не настроены, пропускаем уведомление');
    return;
  }

  try {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;
    const errorName = typeof error === 'string' ? 'Error' : error.name;

    // Формируем текст сообщения
    let messageText = `🚨 <b>Ошибка в приложении</b>\n\n`;
    messageText += `❌ <b>Тип:</b> ${escapeHtml(errorName)}\n`;
    messageText += `📝 <b>Сообщение:</b> ${escapeHtml(errorMessage)}\n`;
    
    if (context?.location) {
      messageText += `📍 <b>Место:</b> <code>${escapeHtml(context.location)}</code>\n`;
    }
    
    if (context?.requestUrl) {
      messageText += `🔗 <b>URL:</b> ${escapeHtml(context.requestUrl)}\n`;
    }
    
    if (context?.requestMethod) {
      messageText += `📡 <b>Метод:</b> ${escapeHtml(context.requestMethod)}\n`;
    }
    
    if (context?.userId) {
      messageText += `👤 <b>Пользователь:</b> ${escapeHtml(context.userId)}\n`;
    }
    
    messageText += `\n🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU')}\n`;
    
    // Добавляем stack trace (ограничиваем длину)
    if (errorStack) {
      const shortStack = errorStack.length > 500 
        ? errorStack.substring(0, 500) + '\n...' 
        : errorStack;
      messageText += `\n<pre>${escapeHtml(shortStack)}</pre>`;
    }
    
    // Добавляем дополнительную информацию
    if (context?.additionalInfo) {
      messageText += `\n📋 <b>Доп. информация:</b>\n`;
      for (const [key, value] of Object.entries(context.additionalInfo)) {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const shortValue = valueStr.length > 100 ? valueStr.substring(0, 100) + '...' : valueStr;
        messageText += `  • ${escapeHtml(key)}: ${escapeHtml(shortValue)}\n`;
      }
    }

    // Отправляем сообщение
    await bot.sendMessage(adminChatIdNumber, messageText, {
      parse_mode: 'HTML',
    });
    console.log('[NOTIFY] ✅ Уведомление об ошибке отправлено');
  } catch (notifyError) {
    console.error('[NOTIFY] ❌ Критическая ошибка при отправке уведомления об ошибке:', notifyError);
  }
}

/**
 * Вспомогательная функция для экранирования HTML
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

