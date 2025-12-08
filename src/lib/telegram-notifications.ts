/**
 * Уведомления администратору через Telegram
 */

import TelegramBot from 'node-telegram-bot-api';
import { Pool } from 'pg';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Преобразуем adminChatId в число
const adminChatIdNumber = adminChatId ? parseInt(adminChatId, 10) : null;

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

const bot = botToken ? new TelegramBot(botToken, { polling: false }) : null;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

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
  console.log(`[NOTIFY] 📤 Отправка уведомления администратору о новости: ${newsId}`);
  
  if (!bot || !adminChatIdNumber) {
    console.warn('[NOTIFY] ⚠️ Бот или admin chat ID не настроены, пропускаем уведомление');
    return;
  }

  try {
    // Получаем первое изображение для превью (если есть)
    console.log('[NOTIFY] 🔍 Получение превью изображения...');
    const client = await pool.connect();
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
        const imagePath = firstImageUrl.startsWith('/')
          ? `${process.cwd()}/public${firstImageUrl}`
          : firstImageUrl;

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

