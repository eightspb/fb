/**
 * Основной обработчик Telegram бота
 */

import TelegramBot from 'node-telegram-bot-api';
import { downloadTelegramFile, saveMediaFile, generateNewsId, getFileExtension, extractLocationFromImage, extractDateFromImage } from './file-utils';
import { expandTextWithAI } from './openrouter';
import { Pool } from 'pg';
import { notifyAdminAboutDraft } from './telegram-notifications';
import * as path from 'path';
import * as fs from 'fs';

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  console.warn('[BOT] ⚠️ TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
} else {
  console.log('[BOT] ✅ TELEGRAM_BOT_TOKEN найден');
}

// Инициализация бота
export const bot = botToken ? new TelegramBot(botToken, { polling: false }) : null;

if (bot) {
  console.log('[BOT] ✅ Telegram бот инициализирован');
} else {
  console.error('[BOT] ❌ Telegram бот не инициализирован (нет токена)');
}

// Подключение к БД
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

interface PendingNews {
  chatId: number;
  messageId: number;
  text?: string;
  images: Array<{ fileId: string; path?: string }>;
  videos: Array<{ fileId: string; path?: string }>;
  date: Date;
  startedAt: Date;
}

// Хранилище незавершенных новостей (в продакшене лучше использовать Redis или БД)
const pendingNews = new Map<number, PendingNews>();

/**
 * Обрабатывает текстовое сообщение
 */
export async function handleTextMessage(msg: TelegramBot.Message): Promise<void> {
  console.log('[BOT] 📝 handleTextMessage вызван');
  if (!bot) {
    console.error('[BOT] ❌ Бот не инициализирован');
    throw new Error('Telegram bot не инициализирован');
  }

  const chatId = msg.chat.id;
  const text = msg.text || '';
  console.log(`[BOT] Chat ID: ${chatId}, Текст: "${text.substring(0, 50)}..."`);

  // Проверяем, есть ли незавершенная новость
  let pending = pendingNews.get(chatId);
  console.log(`[BOT] Незавершенная новость: ${pending ? 'найдена' : 'не найдена'}`);

  if (!pending) {
    // Создаем новую незавершенную новость
    console.log('[BOT] ➕ Создание новой незавершенной новости');
    pending = {
      chatId,
      messageId: msg.message_id,
      text: text,
      images: [],
      videos: [],
      date: new Date(),
      startedAt: new Date(),
    };
    pendingNews.set(chatId, pending);
    
    await bot.sendMessage(chatId, '📝 Начата новая новость. Отправьте фотографии или видео, или отправьте /done для завершения.');
    console.log('[BOT] ✅ Сообщение отправлено пользователю');
  } else {
    // Добавляем текст к существующей новости
    console.log('[BOT] ➕ Добавление текста к существующей новости');
    pending.text = pending.text ? `${pending.text}\n\n${text}` : text;
    await bot.sendMessage(chatId, '✅ Текст добавлен. Отправьте медиафайлы или /done для завершения.');
    console.log('[BOT] ✅ Текст добавлен, сообщение отправлено');
  }
}

/**
 * Обрабатывает фото
 */
export async function handlePhotoMessage(msg: TelegramBot.Message): Promise<void> {
  console.log('[BOT] 📷 handlePhotoMessage вызван');
  if (!bot) {
    console.error('[BOT] ❌ Бот не инициализирован');
    throw new Error('Telegram bot не инициализирован');
  }

  const chatId = msg.chat.id;
  const photos = msg.photo;

  if (!photos || photos.length === 0) {
    console.log('[BOT] ⚠️ Нет фото в сообщении');
    return;
  }

  // Берем фото наибольшего размера
  const largestPhoto = photos[photos.length - 1];
  const fileId = largestPhoto.file_id;
  console.log(`[BOT] 📷 Фото получено, fileId: ${fileId}, размеров: ${photos.length}`);

  let pending = pendingNews.get(chatId);

  if (!pending) {
    // Создаем новую незавершенную новость
    console.log('[BOT] ➕ Создание новой новости с фото');
    pending = {
      chatId,
      messageId: msg.message_id,
      text: msg.caption || '',
      images: [{ fileId }],
      videos: [],
      date: new Date(),
      startedAt: new Date(),
    };
    pendingNews.set(chatId, pending);
  } else {
    // Добавляем фото к существующей новости
    console.log(`[BOT] ➕ Добавление фото к существующей новости (всего: ${pending.images.length + 1})`);
    pending.images.push({ fileId });
    if (msg.caption && !pending.text) {
      pending.text = msg.caption;
    }
  }

  await bot.sendMessage(chatId, `📷 Фото добавлено (всего: ${pending.images.length}). Отправьте еще файлы или /done для завершения.`);
  console.log('[BOT] ✅ Фото обработано, сообщение отправлено');
}

/**
 * Обрабатывает видео
 */
export async function handleVideoMessage(msg: TelegramBot.Message): Promise<void> {
  if (!bot) {
    throw new Error('Telegram bot не инициализирован');
  }

  const chatId = msg.chat.id;
  const video = msg.video;

  if (!video) {
    return;
  }

  const fileId = video.file_id;

  let pending = pendingNews.get(chatId);

  if (!pending) {
    // Создаем новую незавершенную новость
    pending = {
      chatId,
      messageId: msg.message_id,
      text: msg.caption || '',
      images: [],
      videos: [{ fileId }],
      date: new Date(),
      startedAt: new Date(),
    };
    pendingNews.set(chatId, pending);
  } else {
    // Добавляем видео к существующей новости
    pending.videos.push({ fileId });
    if (msg.caption && !pending.text) {
      pending.text = msg.caption;
    }
  }

  await bot.sendMessage(chatId, `🎥 Видео добавлено (всего: ${pending.videos.length}). Отправьте еще файлы или /done для завершения.`);
}

/**
 * Завершает создание новости и создает черновик
 */
export async function finishNewsCreation(chatId: number): Promise<void> {
  console.log(`[BOT] 🏁 finishNewsCreation вызван для chatId: ${chatId}`);
  if (!bot) {
    console.error('[BOT] ❌ Бот не инициализирован');
    throw new Error('Telegram bot не инициализирован');
  }

  const pending = pendingNews.get(chatId);

  if (!pending) {
    console.log('[BOT] ⚠️ Нет активной новости для завершения');
    await bot.sendMessage(chatId, '❌ Нет активной новости для завершения.');
    return;
  }

  if (!pending.text && pending.images.length === 0 && pending.videos.length === 0) {
    console.log('[BOT] ⚠️ Новость пуста');
    await bot.sendMessage(chatId, '❌ Новость пуста. Добавьте текст или медиафайлы.');
    return;
  }

  console.log(`[BOT] 📊 Данные новости: текст=${!!pending.text}, фото=${pending.images.length}, видео=${pending.videos.length}`);

  try {
    await bot.sendMessage(chatId, '⏳ Обрабатываю новость...');
    console.log('[BOT] ⏳ Начало обработки новости');

    // Скачиваем и сохраняем медиафайлы
    // Начальная дата - текущая, но будет заменена датой из EXIF если найдена
    let date = pending.date;

    // Обрабатываем изображения и извлекаем геолокацию и дату съемки
    console.log(`[BOT] 📷 Начало скачивания ${pending.images.length} изображений`);
    let location: { latitude: number; longitude: number } | null = null;
    
    // Сначала скачиваем первое изображение во временную папку для извлечения даты
    if (pending.images.length > 0) {
      try {
        const firstImage = pending.images[0];
        console.log(`[BOT] 📥 Предварительное скачивание первого изображения для извлечения даты...`);
        const tempBuffer = await downloadTelegramFile(firstImage.fileId, botToken!);
        const tempFilename = `temp_${Date.now()}.jpg`;
        const tempPath = path.join(process.cwd(), 'public', 'images', 'trainings', tempFilename);
        
        // Сохраняем во временный файл
        fs.writeFileSync(tempPath, tempBuffer);
        
        // Извлекаем дату из EXIF
        const imageDate = await extractDateFromImage(tempPath);
        if (imageDate) {
          date = imageDate;
          console.log(`[BOT] 📅 Дата съемки найдена в первом изображении: ${date.toLocaleDateString('ru-RU')}`);
        } else {
          console.log(`[BOT] ℹ️ Дата съемки не найдена в EXIF, используется текущая дата: ${date.toLocaleDateString('ru-RU')}`);
        }
        
        // Удаляем временный файл
        fs.unlinkSync(tempPath);
      } catch (error) {
        console.error(`[BOT] ⚠️ Ошибка при предварительном скачивании первого изображения:`, error);
        // Продолжаем с текущей датой
      }
    }
    
    // Теперь обрабатываем все изображения с правильной датой
    for (let i = 0; i < pending.images.length; i++) {
      const image = pending.images[i];
      try {
        console.log(`[BOT] 📥 Скачивание изображения ${i + 1}/${pending.images.length}, fileId: ${image.fileId}`);
        const buffer = await downloadTelegramFile(image.fileId, botToken!);
        const filename = `image_${Date.now()}_${i}${getFileExtension('', 'image/jpeg')}`;
        const savedPath = saveMediaFile(buffer, filename, date);
        image.path = savedPath;
        console.log(`[BOT] ✅ Изображение ${i + 1} сохранено: ${savedPath}`);
        
        const imagePath = savedPath.startsWith('/')
          ? path.join(process.cwd(), 'public', savedPath)
          : savedPath;
        
        // Извлекаем геолокацию из первого изображения с GPS данными
        if (!location && i === 0) {
          const imgLocation = await extractLocationFromImage(imagePath);
          if (imgLocation) {
            location = imgLocation;
            console.log(`[BOT] 📍 Геолокация найдена в изображении ${i + 1}: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
          }
        }
      } catch (error) {
        console.error(`[BOT] ❌ Ошибка при сохранении изображения ${i}:`, error);
      }
    }

    // Обрабатываем видео
    console.log(`[BOT] 🎥 Начало скачивания ${pending.videos.length} видео`);
    for (let i = 0; i < pending.videos.length; i++) {
      const video = pending.videos[i];
      try {
        console.log(`[BOT] 📥 Скачивание видео ${i + 1}/${pending.videos.length}, fileId: ${video.fileId}`);
        const buffer = await downloadTelegramFile(video.fileId, botToken!);
        const filename = `video_${Date.now()}_${i}${getFileExtension('', 'video/mp4')}`;
        const savedPath = saveMediaFile(buffer, filename, date);
        video.path = savedPath;
        console.log(`[BOT] ✅ Видео ${i + 1} сохранено: ${savedPath}`);
      } catch (error) {
        console.error(`[BOT] ❌ Ошибка при сохранении видео ${i}:`, error);
      }
    }

    // Расширяем текст через AI
    const originalText = pending.text || 'Новое событие';
    console.log(`[BOT] 🤖 Расширение текста через AI: "${originalText.substring(0, 50)}..."`);
    const expanded = await expandTextWithAI(originalText, {
      date: date.toLocaleDateString('ru-RU'),
      imagesCount: pending.images.filter((img) => img.path).length,
      videosCount: pending.videos.filter((vid) => vid.path).length,
    });
    console.log(`[BOT] ✅ Текст расширен: "${expanded.title}"`);

    // Генерируем ID новости
    const newsId = generateNewsId(expanded.title, date);
    console.log(`[BOT] 🆔 Сгенерирован ID новости: ${newsId}`);

    // Форматируем дату для БД
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${day}.${month}.${year}`;

    // Сохраняем в БД как черновик
    console.log('[BOT] 💾 Подключение к БД...');
    const client = await pool.connect();
    try {
      // Проверяем, существует ли новость
      const existingCheck = await client.query('SELECT id FROM news WHERE id = $1', [newsId]);
      
      if (existingCheck.rows.length > 0) {
        console.log(`[BOT] ⚠️ Новость с ID ${newsId} уже существует`);
        await bot.sendMessage(chatId, '⚠️ Новость с таким ID уже существует. Попробуйте изменить текст.');
        return;
      }

      // Форматируем location для БД (если есть)
      let locationStr: string | null = null;
      if (location) {
        // Сохраняем в формате "latitude, longitude" как в других новостях
        locationStr = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        console.log(`[BOT] 📍 Геолокация будет сохранена: ${locationStr}`);
      } else {
        console.log(`[BOT] ℹ️ Геолокация не найдена в изображениях`);
      }

      // Создаем новость
      console.log('[BOT] 💾 Создание записи новости в БД...');
      
      // Проверяем, есть ли колонка status
      const hasStatusColumn = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'news' AND column_name = 'status'
        )
      `);
      
      const statusExists = hasStatusColumn.rows[0]?.exists || false;
      console.log(`[BOT] 🔍 Колонка status существует: ${statusExists}`);
      
      if (statusExists) {
        await client.query(
          `INSERT INTO news (id, title, short_description, full_description, date, year, category, status, location)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            newsId,
            expanded.title,
            expanded.shortDescription,
            expanded.fullDescription,
            dateStr,
            year,
            'Мероприятия',
            'draft',
            locationStr,
          ]
        );
      } else {
        // Если колонки status нет, создаем без неё
        await client.query(
          `INSERT INTO news (id, title, short_description, full_description, date, year, category, location)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            newsId,
            expanded.title,
            expanded.shortDescription,
            expanded.fullDescription,
            dateStr,
            year,
            'Мероприятия',
            locationStr,
          ]
        );
      }
      console.log('[BOT] ✅ Новость создана в БД');

      // Добавляем изображения
      const savedImages = pending.images.filter((img) => img.path);
      console.log(`[BOT] 💾 Добавление ${savedImages.length} изображений в БД...`);
      for (let i = 0; i < savedImages.length; i++) {
        const image = savedImages[i];
        if (image.path) {
          await client.query(
            'INSERT INTO news_images (news_id, image_url, "order") VALUES ($1, $2, $3)',
            [newsId, image.path, i]
          );
        }
      }
      console.log('[BOT] ✅ Изображения добавлены в БД');

      // Добавляем видео
      const savedVideos = pending.videos.filter((vid) => vid.path);
      console.log(`[BOT] 💾 Добавление ${savedVideos.length} видео в БД...`);
      for (let i = 0; i < savedVideos.length; i++) {
        const video = savedVideos[i];
        if (video.path) {
          await client.query(
            'INSERT INTO news_videos (news_id, video_url, "order") VALUES ($1, $2, $3)',
            [newsId, video.path, i]
          );
        }
      }
      console.log('[BOT] ✅ Видео добавлены в БД');

      // Отправляем уведомление администратору
      console.log('[BOT] 📤 Отправка уведомления администратору...');
      await notifyAdminAboutDraft(newsId, expanded, savedImages.length);
      console.log('[BOT] ✅ Уведомление отправлено');

      await bot.sendMessage(
        chatId,
        `✅ Новость создана как черновик!\n\n` +
        `📰 Заголовок: ${expanded.title}\n` +
        `📝 Описание: ${expanded.shortDescription.substring(0, 100)}...\n\n` +
        `Ожидайте подтверждения администратора для публикации.`
      );

      // Удаляем из хранилища незавершенных новостей
      pendingNews.delete(chatId);
      console.log('[BOT] ✅ Новость удалена из временного хранилища');
    } finally {
      client.release();
      console.log('[BOT] 🔌 Подключение к БД закрыто');
    }
  } catch (error) {
    console.error('[BOT] ❌ Ошибка при создании новости:', error);
    if (error instanceof Error) {
      console.error('[BOT] Сообщение об ошибке:', error.message);
      console.error('[BOT] Stack trace:', error.stack);
    }
    await bot.sendMessage(chatId, '❌ Произошла ошибка при создании новости. Попробуйте позже.');
  }
}

/**
 * Обрабатывает команду /done
 */
export async function handleDoneCommand(msg: TelegramBot.Message): Promise<void> {
  await finishNewsCreation(msg.chat.id);
}

/**
 * Обрабатывает команду /cancel
 */
export async function handleCancelCommand(msg: TelegramBot.Message): Promise<void> {
  if (!bot) {
    throw new Error('Telegram bot не инициализирован');
  }

  const chatId = msg.chat.id;
  pendingNews.delete(chatId);
  await bot.sendMessage(chatId, '❌ Создание новости отменено.');
}

/**
 * Обрабатывает команду /start
 */
export async function handleStartCommand(msg: TelegramBot.Message): Promise<void> {
  if (!bot) {
    throw new Error('Telegram bot не инициализирован');
  }

  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `👋 Добро пожаловать в бот создания новостей!\n\n` +
    `📝 Отправьте текст новости\n` +
    `📷 Отправьте фотографии\n` +
    `🎥 Отправьте видео\n` +
    `✅ Отправьте /done для завершения\n` +
    `❌ Отправьте /cancel для отмены\n\n` +
    `📋 Отправьте /list для просмотра всех новостей`
  );
}

/**
 * Получает список всех новостей из БД
 */
export async function getAllNewsFromDB(): Promise<Array<{ id: string; title: string; date: string; status: string | null }>> {
  const client = await pool.connect();
  try {
    console.log('[BOT] 📋 Запрос всех новостей из БД...');
    // Сортируем по created_at DESC, чтобы самые новые новости были первыми
    // Это гарантирует, что новости, созданные через бота, будут видны
    const result = await client.query(`
      SELECT id, title, date, status
      FROM news
      ORDER BY created_at DESC NULLS LAST, date DESC
      LIMIT 50
    `);
    console.log(`[BOT] 📋 Найдено новостей: ${result.rows.length}`);
    if (result.rows.length > 0) {
      console.log(`[BOT] 📋 Первая новость: ${result.rows[0].id} - ${result.rows[0].title} (статус: ${result.rows[0].status || 'published'})`);
      console.log(`[BOT] 📋 Последняя новость: ${result.rows[result.rows.length - 1].id} - ${result.rows[result.rows.length - 1].title}`);
    }
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      date: row.date,
      status: row.status || 'published',
    }));
  } catch (error) {
    console.error('[BOT] ❌ Ошибка при запросе новостей:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Обрабатывает команду /list для вывода списка новостей
 */
export async function handleListCommand(msg: TelegramBot.Message): Promise<void> {
  if (!bot) {
    throw new Error('Telegram bot не инициализирован');
  }

  const chatId = msg.chat.id;
  console.log(`[BOT] 📋 Команда /list от пользователя ${chatId}`);

  try {
    await bot.sendMessage(chatId, '⏳ Загружаю список новостей...');
    
    const newsList = await getAllNewsFromDB();
    console.log(`[BOT] 📋 Получено новостей для отображения: ${newsList.length}`);
    
    if (newsList.length === 0) {
      await bot.sendMessage(chatId, '📭 Новостей не найдено.');
      return;
    }

    // Группируем новости по страницам (по 10 на страницу)
    const pageSize = 10;
    const pages: Array<typeof newsList> = [];
    for (let i = 0; i < newsList.length; i += pageSize) {
      pages.push(newsList.slice(i, i + pageSize));
    }

    console.log(`[BOT] 📋 Всего страниц: ${pages.length}, новостей на первой странице: ${pages[0]?.length || 0}`);

    // Отправляем первую страницу
    await sendNewsListPage(chatId, pages[0], 0, pages.length);
    
  } catch (error) {
    console.error('[BOT] ❌ Ошибка при получении списка новостей:', error);
    if (error instanceof Error) {
      console.error('[BOT] Сообщение об ошибке:', error.message);
      console.error('[BOT] Stack trace:', error.stack);
    }
    await bot.sendMessage(chatId, '❌ Произошла ошибка при загрузке списка новостей.');
  }
}

/**
 * Отправляет страницу со списком новостей
 * @param editMessageId - ID сообщения для редактирования (если указано, редактируем вместо отправки нового)
 */
export async function sendNewsListPage(
  chatId: number,
  news: Array<{ id: string; title: string; date: string; status: string | null }>,
  pageIndex: number,
  totalPages: number,
  editMessageId?: number
): Promise<void> {
  if (!bot) return;

  let messageText = `📰 <b>Список новостей</b> (страница ${pageIndex + 1}/${totalPages})\n\n`;
  
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

  // Добавляем кнопки для каждой новости
  for (const newsItem of news) {
    const statusIcon = newsItem.status === 'draft' ? '📝' : '✅';
    const shortTitle = newsItem.title.length > 40 
      ? newsItem.title.substring(0, 37) + '...' 
      : newsItem.title;
    
    messageText += `${statusIcon} <b>${shortTitle}</b>\n`;
    messageText += `   📅 ${newsItem.date}\n`;
    messageText += `   🆔 <code>${newsItem.id.substring(0, 30)}...</code>\n\n`;

    // Создаем кнопку для выбора новости
    // Используем максимально короткий формат: "s:ID" где ID обрезан до 30 символов
    // Это дает максимум 32 байта (s: + 30 символов)
    const maxIdLength = 30;
    const shortId = newsItem.id.length > maxIdLength ? newsItem.id.substring(0, maxIdLength) : newsItem.id;
    const callbackData = `s:${shortId}`;
    
    // Проверяем длину callback_data
    if (callbackData.length > 64) {
      console.error(`[BOT] ⚠️ callback_data слишком длинный для новости ${newsItem.id}: ${callbackData.length} байт`);
      // Используем только первые символы ID
      const veryShortId = newsItem.id.substring(0, 20);
      keyboard.push([
        {
          text: `${statusIcon} ${shortTitle.substring(0, 30)}`,
          callback_data: `s:${veryShortId}`,
        },
      ]);
    } else {
      keyboard.push([
        {
          text: `${statusIcon} ${shortTitle.substring(0, 30)}`,
          callback_data: callbackData,
        },
      ]);
    }
  }

  // Добавляем навигацию по страницам
  if (totalPages > 1) {
    const navButtons: TelegramBot.InlineKeyboardButton[] = [];
    if (pageIndex > 0) {
      navButtons.push({
        text: '◀️ Предыдущая',
        callback_data: `page:${pageIndex - 1}`,
      });
    }
    if (pageIndex < totalPages - 1) {
      navButtons.push({
        text: 'Следующая ▶️',
        callback_data: `page:${pageIndex + 1}`,
      });
    }
    if (navButtons.length > 0) {
      keyboard.push(navButtons);
    }
  }

  try {
    if (editMessageId) {
      // Редактируем существующее сообщение
      await bot.editMessageText(messageText, {
        chat_id: chatId,
        message_id: editMessageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } else {
      // Отправляем новое сообщение
      await bot.sendMessage(chatId, messageText, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    }
  } catch (error) {
    console.error('[BOT] ❌ Ошибка при отправке/редактировании списка новостей:', error);
    if (error instanceof Error) {
      console.error('[BOT] Сообщение об ошибке:', error.message);
    }
    // Если не удалось отредактировать, отправляем новое сообщение
    if (editMessageId) {
      await bot.sendMessage(chatId, messageText, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    }
  }
}

/**
 * Отправляет меню действий для выбранной новости
 */
export async function sendNewsActionsMenu(
  chatId: number,
  newsId: string,
  newsTitle: string,
  currentStatus: string | null
): Promise<void> {
  if (!bot) return;

  const status = currentStatus || 'published';
  const statusText = status === 'draft' ? '📝 Черновик' : '✅ Опубликована';
  
  const shortTitle = newsTitle.length > 50 ? newsTitle.substring(0, 47) + '...' : newsTitle;
  const messageText = `📰 <b>${shortTitle}</b>\n\n` +
    `🆔 ID: <code>${newsId}</code>\n` +
    `📊 Статус: ${statusText}\n\n` +
    `Выберите действие:`;

  // Используем короткие префиксы для callback_data
  // Максимальная длина ID - 30 символов для callback_data
  const maxIdLength = 30;
  const shortId = newsId.length > maxIdLength ? newsId.substring(0, maxIdLength) : newsId;
  
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

  if (status === 'draft') {
    // Если черновик, показываем кнопку "Опубликовать"
    keyboard.push([
      {
        text: '✅ Опубликовать',
        callback_data: `pub:${shortId}`,
      },
    ]);
  } else {
    // Если опубликована, показываем кнопку "Снять с публикации"
    keyboard.push([
      {
        text: '📝 Снять с публикации',
        callback_data: `unp:${shortId}`,
      },
    ]);
  }

  // Кнопка удаления
  keyboard.push([
    {
      text: '❌ Удалить новость',
      callback_data: `del:${shortId}`,
    },
  ]);

  // Кнопка "Назад к списку"
  keyboard.push([
    {
      text: '⬅️ Назад к списку',
      callback_data: 'back:list',
    },
  ]);

  await bot.sendMessage(chatId, messageText, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}

