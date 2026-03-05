/**
 * Основной обработчик Telegram бота
 */

import TelegramBot from 'node-telegram-bot-api';
import { downloadTelegramFile, saveMediaFile, generateNewsId, getFileExtension, extractLocationFromImage, extractDateFromImage } from './file-utils';
import { expandTextWithAI, transcribeAudioWithAI } from './openrouter';
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

type NewsState = 'collecting' | 'generating' | 'preview' | 'publishing';

interface PendingNews {
  chatId: number;
  messageId: number;
  text?: string;
  images: Array<{ fileId: string; path?: string }>;
  videos: Array<{ fileId: string; path?: string }>;
  date: Date;
  startedAt: Date;
  manualDate?: Date;
  manualLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  mediaGroupId?: string;
  mediaGroupTimeout?: NodeJS.Timeout;
  voiceTranscriptions: string[]; // массив распознанных голосовых сообщений
  // AI-сгенерированный контент для предпросмотра
  aiGenerated?: {
    title: string;
    shortDescription: string;
    fullDescription: string;
  };
  // Флаг ожидания редактирования
  waitingForEdit?: 'title' | 'short' | 'full' | null;
  // Дата из EXIF (извлекается при генерации)
  exifDate?: Date;
  // Локация из EXIF (извлекается при генерации)
  exifLocation?: { latitude: number; longitude: number };
  // Текущее состояние сессии создания новости
  state: NewsState;
}

// Хранилище незавершенных новостей (в продакшене лучше использовать Redis или БД)
export const pendingNews = new Map<number, PendingNews>();

function getStatusBar(pending: PendingNews): string {
  const parts: string[] = [];
  if (pending.images.length > 0) parts.push(`📷 ${pending.images.length} фото`);
  if (pending.videos.length > 0) parts.push(`🎥 ${pending.videos.length} видео`);
  if (pending.voiceTranscriptions.length > 0) parts.push(`🎤 ${pending.voiceTranscriptions.length} голос.`);
  if (pending.text) parts.push('📝 текст');
  if (pending.manualDate) parts.push(`📅 ${pending.manualDate.toLocaleDateString('ru-RU')}`);
  if (pending.manualLocation) parts.push('📍 локация');
  return parts.length > 0 ? parts.join(' | ') : 'пусто';
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

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

  if (pending && pending.state !== 'collecting' && !(pending.state === 'preview' && pending.waitingForEdit)) {
    if (pending.state === 'generating') {
      await bot.sendMessage(chatId, '⏳ Идёт генерация AI, подождите...');
      return;
    }
    if (pending.state === 'preview') {
      await bot.sendMessage(chatId, '📰 Новость уже сгенерирована. Нажмите Опубликовать или Перегенерировать.');
      return;
    }
    if (pending.state === 'publishing') {
      await bot.sendMessage(chatId, '⏳ Идёт публикация, подождите...');
      return;
    }
  }

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
      voiceTranscriptions: [],
      state: 'collecting',
    };
    pendingNews.set(chatId, pending);
    
    await bot.sendMessage(chatId, `📝 Начата новая новость!\n\n📊 Материалы: ${getStatusBar(pending)}.\n\nЧто дальше?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Готово', callback_data: 'finish_news' }],
          [
            { text: '📅 Указать дату', callback_data: 'set_date' },
            { text: '📍 Указать локацию', callback_data: 'set_location' }
          ],
          [{ text: '❌ Отменить', callback_data: 'cancel_news' }]
        ]
      }
    });
    console.log('[BOT] ✅ Сообщение отправлено пользователю');
  } else {
    // Добавляем текст к существующей новости
    console.log('[BOT] ➕ Добавление текста к существующей новости');
    pending.text = pending.text ? `${pending.text}\n\n${text}` : text;
    await bot.sendMessage(chatId, `✅ Текст добавлен!\n\n📊 Материалы: ${getStatusBar(pending)}.\n\nЧто дальше?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Готово', callback_data: 'finish_news' }],
          [
            { text: '📅 Указать дату', callback_data: 'set_date' },
            { text: '📍 Указать локацию', callback_data: 'set_location' }
          ],
          [{ text: '❌ Отменить', callback_data: 'cancel_news' }]
        ]
      }
    });
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
  const mediaGroupId = msg.media_group_id;

  if (!photos || photos.length === 0) {
    console.log('[BOT] ⚠️ Нет фото в сообщении');
    return;
  }

  // Берем фото наибольшего размера
  const largestPhoto = photos[photos.length - 1];
  const fileId = largestPhoto.file_id;
  console.log(`[BOT] 📷 Фото получено, fileId: ${fileId}, mediaGroupId: ${mediaGroupId || 'none'}`);

  let pending = pendingNews.get(chatId);

  if (pending && pending.state !== 'collecting') {
    if (pending.state === 'generating') {
      await bot.sendMessage(chatId, '⏳ Идёт генерация AI, подождите...');
      return;
    }
    if (pending.state === 'preview') {
      await bot.sendMessage(chatId, '📰 Новость уже сгенерирована. Нажмите Опубликовать или Перегенерировать.');
      return;
    }
    if (pending.state === 'publishing') {
      await bot.sendMessage(chatId, '⏳ Идёт публикация, подождите...');
      return;
    }
  }

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
      voiceTranscriptions: [],
      mediaGroupId: mediaGroupId,
      state: 'collecting',
    };
    pendingNews.set(chatId, pending);
  } else {
    // Добавляем фото к существующей новости
    console.log(`[BOT] ➕ Добавление фото к существующей новости (всего: ${pending.images.length + 1})`);
    pending.images.push({ fileId });
    if (msg.caption && !pending.text) {
      pending.text = msg.caption;
    }
    
    // Обновляем mediaGroupId если есть
    if (mediaGroupId && !pending.mediaGroupId) {
      pending.mediaGroupId = mediaGroupId;
    }
  }

  // Если это часть медиа-группы, ждем еще фото
  if (mediaGroupId) {
    console.log(`[BOT] 📦 Обработка медиа-группы: ${mediaGroupId}`);
    
    // Очищаем предыдущий таймаут для этой группы
    if (pending.mediaGroupTimeout) {
      clearTimeout(pending.mediaGroupTimeout);
    }
    
    // Устанавливаем новый таймаут - отправляем сообщение через 2 секунды после последнего фото
    pending.mediaGroupTimeout = setTimeout(async () => {
      console.log(`[BOT] ⏱️ Таймаут медиа-группы ${mediaGroupId}, отправка сообщения`);
      const currentPending = pendingNews.get(chatId);
      if (currentPending && bot) {
        await bot.sendMessage(
          chatId,
          `📷 Группа фото добавлена!\n\n📊 Материалы: ${getStatusBar(currentPending)}.\n\nЧто дальше?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Готово', callback_data: 'finish_news' }],
                [
                  { text: '📅 Указать дату', callback_data: 'set_date' },
                  { text: '📍 Указать локацию', callback_data: 'set_location' }
                ],
                [{ text: '❌ Отменить', callback_data: 'cancel_news' }]
              ]
            }
          }
        );
        currentPending.mediaGroupTimeout = undefined;
      }
    }, 2000);
    
    console.log('[BOT] ✅ Фото добавлено в медиа-группу, ожидание завершения группы...');
  } else {
    // Одиночное фото - сразу отправляем сообщение
    await bot.sendMessage(chatId, `📷 Фото добавлено!\n\n📊 Материалы: ${getStatusBar(pending)}.\n\nЧто дальше?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Готово', callback_data: 'finish_news' }],
          [
            { text: '📅 Указать дату', callback_data: 'set_date' },
            { text: '📍 Указать локацию', callback_data: 'set_location' }
          ],
          [{ text: '❌ Отменить', callback_data: 'cancel_news' }]
        ]
      }
    });
    console.log('[BOT] ✅ Фото обработано, сообщение отправлено');
  }
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

  if (pending && pending.state !== 'collecting') {
    if (pending.state === 'generating') {
      await bot.sendMessage(chatId, '⏳ Идёт генерация AI, подождите...');
      return;
    }
    if (pending.state === 'preview') {
      await bot.sendMessage(chatId, '📰 Новость уже сгенерирована. Нажмите Опубликовать или Перегенерировать.');
      return;
    }
    if (pending.state === 'publishing') {
      await bot.sendMessage(chatId, '⏳ Идёт публикация, подождите...');
      return;
    }
  }

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
      voiceTranscriptions: [],
      state: 'collecting',
    };
    pendingNews.set(chatId, pending);
  } else {
    // Добавляем видео к существующей новости
    pending.videos.push({ fileId });
    if (msg.caption && !pending.text) {
      pending.text = msg.caption;
    }
  }

  await bot.sendMessage(chatId, `🎥 Видео добавлено!\n\n📊 Материалы: ${getStatusBar(pending)}.\n\nЧто дальше?`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Готово', callback_data: 'finish_news' }],
        [
          { text: '📅 Указать дату', callback_data: 'set_date' },
          { text: '📍 Указать локацию', callback_data: 'set_location' }
        ],
        [{ text: '❌ Отменить', callback_data: 'cancel_news' }]
      ]
    }
  });
}

/**
 * Обрабатывает голосовое сообщение
 */
export async function handleVoiceMessage(msg: TelegramBot.Message): Promise<void> {
  console.log('[BOT] 🎤 handleVoiceMessage вызван');
  if (!bot) {
    console.error('[BOT] ❌ Бот не инициализирован');
    throw new Error('Telegram bot не инициализирован');
  }

  const chatId = msg.chat.id;
  const voice = msg.voice;

  if (!voice) {
    console.log('[BOT] ⚠️ Нет голосового сообщения');
    return;
  }

  const fileId = voice.file_id;
  const duration = voice.duration;
  console.log(`[BOT] 🎤 Голосовое сообщение получено, fileId: ${fileId}, длительность: ${duration}с`);

  let pending = pendingNews.get(chatId);
  if (pending && pending.state !== 'collecting') {
    if (pending.state === 'generating') {
      await bot.sendMessage(chatId, '⏳ Идёт генерация AI, подождите...');
      return;
    }
    if (pending.state === 'preview') {
      await bot.sendMessage(chatId, '📰 Новость уже сгенерирована. Нажмите Опубликовать или Перегенерировать.');
      return;
    }
    if (pending.state === 'publishing') {
      await bot.sendMessage(chatId, '⏳ Идёт публикация, подождите...');
      return;
    }
  }

  try {
    // Отправляем уведомление о начале обработки
    await bot.sendMessage(chatId, '🎤 Распознаю голосовое сообщение...');

    // Скачиваем голосовое сообщение
    console.log('[BOT] 📥 Скачивание голосового сообщения...');
    const audioBuffer = await downloadTelegramFile(fileId, botToken!);
    console.log(`[BOT] ✅ Голосовое сообщение скачано, размер: ${audioBuffer.length} байт`);

    // Транскрибируем через Whisper API
    console.log('[BOT] 🤖 Транскрибация через Whisper API...');
    const transcription = await withTimeout(
      transcribeAudioWithAI(audioBuffer, 'ogg'),
      90000,
      'Распознавание голоса превысило таймаут (90 сек)'
    );
    console.log(`[BOT] ✅ Транскрибация завершена: "${transcription.substring(0, 100)}..."`);

    // Получаем или создаем незавершенную новость
    if (!pending) {
      // Создаем новую незавершенную новость
      console.log('[BOT] ➕ Создание новой новости с голосовым сообщением');
      pending = {
        chatId,
        messageId: msg.message_id,
        text: '',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [transcription],
        state: 'collecting',
      };
      pendingNews.set(chatId, pending);
    } else {
      // Добавляем транскрибацию к существующей новости
      console.log('[BOT] ➕ Добавление транскрибации к существующей новости');
      pending.voiceTranscriptions.push(transcription);
    }

    // Отправляем пользователю распознанный текст
    const previewText = transcription.length > 100 
      ? `${transcription.substring(0, 100)}...` 
      : transcription;
    
    await bot.sendMessage(
      chatId,
      `✅ Текст распознан:\n\n"${previewText}"\n\n📊 Материалы: ${getStatusBar(pending)}.\n\nЧто дальше?`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Готово', callback_data: 'finish_news' }],
            [
              { text: '📅 Указать дату', callback_data: 'set_date' },
              { text: '📍 Указать локацию', callback_data: 'set_location' }
            ],
            [{ text: '❌ Отменить', callback_data: 'cancel_news' }]
          ]
        }
      }
    );
    console.log('[BOT] ✅ Голосовое сообщение обработано');

  } catch (error) {
    console.error('[BOT] ❌ Ошибка при обработке голосового сообщения:', error);
    if (error instanceof Error) {
      console.error('[BOT] Сообщение об ошибке:', error.message);
      console.error('[BOT] Stack trace:', error.stack);
    }
    await bot.sendMessage(
      chatId, 
      '❌ Произошла ошибка при распознавании голосового сообщения. Попробуйте отправить текст вручную.'
    );
  }
}

/**
 * Показывает предпросмотр AI-сгенерированного контента
 */
export async function showAIPreview(chatId: number): Promise<void> {
  if (!bot) {
    throw new Error('Telegram bot не инициализирован');
  }

  const pending = pendingNews.get(chatId);

  if (!pending || !pending.aiGenerated) {
    await bot.sendMessage(chatId, '❌ Нет данных для предпросмотра.');
    return;
  }

  const { title, shortDescription, fullDescription } = pending.aiGenerated;
  
  // Обрезаем полное описание для предпросмотра
  const fullDescPreview = fullDescription.length > 300
    ? `${fullDescription.substring(0, 300)}...`
    : fullDescription;

  const previewMessage = 
    `📰 <b>AI подготовил новость:</b>\n\n` +
    `📌 <b>Название:</b>\n${title}\n\n` +
    `📝 <b>Краткое описание:</b>\n${shortDescription}\n\n` +
    `📄 <b>Полное описание:</b>\n${fullDescPreview}\n\n` +
    `✏️ Что хотите изменить?`;

  await bot.sendMessage(chatId, previewMessage, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Опубликовать', callback_data: 'publish_news' }],
        [
          { text: '✏️ Название', callback_data: 'edit_title' },
          { text: '✏️ Краткое', callback_data: 'edit_short' }
        ],
        [{ text: '✏️ Полное описание', callback_data: 'edit_full' }],
        [
          { text: '🔄 Перегенерировать', callback_data: 'regenerate_ai' },
          { text: '❌ Отменить', callback_data: 'cancel_news' }
        ]
      ]
    }
  });
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

  if (pending.state === 'generating') {
    console.log('[BOT] ⚠️ finishNewsCreation уже выполняется');
    await bot.sendMessage(chatId, '⏳ Генерация уже идёт, подождите...');
    return;
  }

  if (pending.state !== 'collecting') {
    console.log(`[BOT] ⚠️ finishNewsCreation: неожиданное состояние ${pending.state}`);
    return;
  }

  if (!pending.text && pending.images.length === 0 && pending.videos.length === 0) {
    console.log('[BOT] ⚠️ Новость пуста');
    await bot.sendMessage(chatId, '❌ Новость пуста. Добавьте текст или медиафайлы.');
    return;
  }

  pending.state = 'generating';
  console.log(`[BOT] 📊 Данные новости: текст=${!!pending.text}, фото=${pending.images.length}, видео=${pending.videos.length}`);

  try {
    await bot.sendMessage(chatId, '⏳ Генерирую новость с помощью AI...');
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
          pending.exifDate = imageDate;
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
            pending.exifLocation = imgLocation;
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

    // Объединяем текст и голосовые транскрипции
    let combinedText = '';
    
    // Добавляем голосовые транскрипции
    if (pending.voiceTranscriptions.length > 0) {
      combinedText += pending.voiceTranscriptions.join('\n\n');
    }
    
    // Добавляем текстовый текст
    if (pending.text) {
      if (combinedText) {
        combinedText += '\n\n' + pending.text;
      } else {
        combinedText = pending.text;
      }
    }
    
    // Если нет никакого текста, используем дефолтное значение
    if (!combinedText) {
      combinedText = 'Новое событие';
    }
    
    console.log(`[BOT] 🤖 Расширение текста через AI: "${combinedText.substring(0, 50)}..."`);
    
    // Формируем адрес локации для контекста
    let locationAddress: string | undefined;
    if (pending.manualLocation?.address) {
      locationAddress = pending.manualLocation.address;
    } else if (location) {
      locationAddress = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    }
    
    // Используем ручную дату если указана, иначе извлеченную из EXIF
    const finalDate = pending.manualDate || date;
    
    const expanded = await withTimeout(
      expandTextWithAI(combinedText, {
        date: finalDate.toLocaleDateString('ru-RU'),
        location: locationAddress,
        imagesCount: pending.images.filter((img) => img.path).length,
        videosCount: pending.videos.filter((vid) => vid.path).length,
        voiceTranscriptions: pending.voiceTranscriptions,
        isFromVoice: pending.voiceTranscriptions.length > 0,
      }),
      90000,
      'AI генерация превысила таймаут (90 сек)'
    );
    console.log(`[BOT] ✅ Текст расширен: "${expanded.title}"`);

    // Сохраняем AI-сгенерированный контент для предпросмотра
    pending.aiGenerated = {
      title: expanded.title,
      shortDescription: expanded.shortDescription,
      fullDescription: expanded.fullDescription,
    };

    // Показываем предпросмотр пользователю
    await showAIPreview(chatId);
    console.log('[BOT] ✅ Предпросмотр показан пользователю');

    // Переходим в состояние предпросмотра
    pending.state = 'preview';
    return;
  } catch (error) {
    pending.state = 'collecting';
    console.error('[BOT] ❌ Ошибка при создании новости:', error);
    if (error instanceof Error) {
      console.error('[BOT] Сообщение об ошибке:', error.message);
      console.error('[BOT] Stack trace:', error.stack);
    }
    await bot.sendMessage(chatId, '❌ Произошла ошибка при создании новости. Попробуйте позже.');
  }
}

/**
 * Публикует новость в БД (вызывается после подтверждения пользователем)
 */
export async function publishNewsFromPreview(chatId: number): Promise<void> {
  console.log(`[BOT] 📰 publishNewsFromPreview вызван для chatId: ${chatId}`);
  if (!bot) {
    console.error('[BOT] ❌ Бот не инициализирован');
    throw new Error('Telegram bot не инициализирован');
  }

  const pending = pendingNews.get(chatId);

  if (!pending || !pending.aiGenerated) {
    console.log('[BOT] ⚠️ Нет данных для публикации');
    await bot.sendMessage(chatId, '❌ Нет данных для публикации.');
    return;
  }

  if (pending.state === 'publishing') {
    console.log('[BOT] ⚠️ publishNewsFromPreview уже выполняется');
    await bot.sendMessage(chatId, '⏳ Публикация уже идёт, подождите...');
    return;
  }

  if (pending.state !== 'preview') {
    console.log(`[BOT] ⚠️ publishNewsFromPreview: неожиданное состояние ${pending.state}`);
    return;
  }

  pending.state = 'publishing';

  try {
    await bot.sendMessage(chatId, '⏳ Сохраняю новость...');
    console.log('[BOT] ⏳ Начало публикации новости');

    // Используем сохраненные данные
    const { title, shortDescription, fullDescription } = pending.aiGenerated;

    // Определяем дату (ручная > EXIF > текущая)
    const date = pending.manualDate || pending.exifDate || pending.date;

    // Определяем локацию (ручная > EXIF)
    const location = pending.manualLocation
      ? { latitude: pending.manualLocation.latitude, longitude: pending.manualLocation.longitude }
      : pending.exifLocation || null;

    // Генерируем ID новости
    const newsId = generateNewsId(title, date);
    console.log(`[BOT] 🆔 Сгенерирован ID новости: ${newsId}`);

    // Медиафайлы уже скачаны и сохранены в finishNewsCreation — используем сохранённые пути
    console.log(`[BOT] 📷 Изображений: ${pending.images.filter(img => img.path).length}/${pending.images.length}`);
    console.log(`[BOT] 🎥 Видео: ${pending.videos.filter(vid => vid.path).length}/${pending.videos.length}`);

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
        pending.state = 'preview';
        await bot.sendMessage(chatId, '⚠️ Новость с таким ID уже существует. Попробуйте изменить название.');
        return;
      }

      // Форматируем location для БД (если есть)
      let locationStr: string | null = null;
      if (location) {
        // Сохраняем в формате "latitude, longitude" как в других новостях
        locationStr = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        console.log(`[BOT] 📍 Геолокация будет сохранена: ${locationStr}`);
      } else {
        console.log(`[BOT] ℹ️ Геолокация не найдена`);
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
            title,
            shortDescription,
            fullDescription,
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
            title,
            shortDescription,
            fullDescription,
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
      const newsPreview = { title, shortDescription, fullDescription };
      await notifyAdminAboutDraft(newsId, newsPreview, savedImages.length);
      console.log('[BOT] ✅ Уведомление отправлено');

      await bot.sendMessage(
        chatId,
        `✅ Новость создана как черновик!\n\n` +
        `📰 Заголовок: ${title}\n` +
        `📝 Описание: ${shortDescription.substring(0, 100)}...\n\n` +
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
    // Возвращаемся в предпросмотр, чтобы пользователь мог повторить
    const p = pendingNews.get(chatId);
    if (p) p.state = 'preview';
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
  const pending = pendingNews.get(chatId);

  if (pending?.state === 'publishing') {
    await bot.sendMessage(chatId, '⏳ Идёт публикация, подождите...');
    return;
  }

  if (pending?.state === 'generating') {
    await bot.sendMessage(chatId, '⏳ Идёт генерация AI, подождите...');
    return;
  }

  pendingNews.delete(chatId);
  await bot.sendMessage(chatId, '❌ Создание новости отменено.');
}

/**
 * Обрабатывает команду /date для установки даты мероприятия
 */
export async function handleDateCommand(msg: TelegramBot.Message): Promise<void> {
  if (!bot) {
    throw new Error('Telegram bot не инициализирован');
  }

  const chatId = msg.chat.id;
  const text = msg.text || '';
  
  // Извлекаем дату из команды (формат: /date ДД.ММ.ГГГГ)
  const dateMatch = text.match(/\/date\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  
  if (!dateMatch) {
    await bot.sendMessage(
      chatId,
      '❌ Неверный формат даты. Используйте:\n/date ДД.ММ.ГГГГ\n\nПример: /date 15.02.2026'
    );
    return;
  }

  const day = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10);
  const year = parseInt(dateMatch[3], 10);

  // Валидация даты
  const date = new Date(year, month - 1, day);
  if (
    isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    await bot.sendMessage(chatId, '❌ Некорректная дата. Проверьте правильность введенных данных.');
    return;
  }

  // Получаем незавершенную новость
  const pending = pendingNews.get(chatId);

  if (!pending) {
    await bot.sendMessage(
      chatId,
      '❌ Нет активной новости. Сначала отправьте текст или фото для создания новости.'
    );
    return;
  }

  if (pending.state !== 'collecting') {
    if (pending.state === 'generating') {
      await bot.sendMessage(chatId, '⏳ Идёт генерация AI, подождите...');
      return;
    }
    if (pending.state === 'preview') {
      await bot.sendMessage(chatId, '📰 Новость уже сгенерирована. Нажмите Опубликовать или Перегенерировать.');
      return;
    }
    if (pending.state === 'publishing') {
      await bot.sendMessage(chatId, '⏳ Идёт публикация, подождите...');
      return;
    }
  }

  // Устанавливаем дату
  pending.manualDate = date;
  
  await bot.sendMessage(
    chatId,
    `✅ Дата мероприятия установлена: ${date.toLocaleDateString('ru-RU')}\n\n` +
    `Отправьте еще материалы или /done для завершения.`
  );
}

/**
 * Обрабатывает команду /location для установки локации
 */
export async function handleLocationCommand(msg: TelegramBot.Message): Promise<void> {
  if (!bot) {
    throw new Error('Telegram bot не инициализирован');
  }

  const chatId = msg.chat.id;
  const text = msg.text || '';
  
  // Извлекаем локацию из команды
  const locationText = text.replace(/^\/location\s+/, '').trim();
  
  if (!locationText) {
    await bot.sendMessage(
      chatId,
      '❌ Укажите локацию после команды.\n\n' +
      'Форматы:\n' +
      '/location 55.751244,37.618423\n' +
      '/location Москва, ул. Тверская 1'
    );
    return;
  }

  // Получаем незавершенную новость
  const pending = pendingNews.get(chatId);

  if (!pending) {
    await bot.sendMessage(
      chatId,
      '❌ Нет активной новости. Сначала отправьте текст или фото для создания новости.'
    );
    return;
  }

  if (pending.state !== 'collecting') {
    if (pending.state === 'generating') {
      await bot.sendMessage(chatId, '⏳ Идёт генерация AI, подождите...');
      return;
    }
    if (pending.state === 'preview') {
      await bot.sendMessage(chatId, '📰 Новость уже сгенерирована. Нажмите Опубликовать или Перегенерировать.');
      return;
    }
    if (pending.state === 'publishing') {
      await bot.sendMessage(chatId, '⏳ Идёт публикация, подождите...');
      return;
    }
  }

  try {
    // Проверяем, координаты это или адрес
    const coordsMatch = locationText.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    
    if (coordsMatch) {
      // Это координаты
      const latitude = parseFloat(coordsMatch[1]);
      const longitude = parseFloat(coordsMatch[2]);
      
      // Валидация координат
      if (
        isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180
      ) {
        await bot.sendMessage(chatId, '❌ Некорректные координаты. Широта должна быть от -90 до 90, долгота от -180 до 180.');
        return;
      }
      
      pending.manualLocation = {
        latitude,
        longitude,
      };
      
      await bot.sendMessage(
        chatId,
        `✅ Локация установлена: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\n` +
        `Отправьте еще материалы или /done для завершения.`
      );
    } else {
      // Это адрес - нужно геокодировать
      await bot.sendMessage(chatId, '🔍 Поиск координат по адресу...');
      
      const { geocodeLocation } = await import('./file-utils');
      const geocoded = await geocodeLocation(locationText);
      
      if (!geocoded) {
        await bot.sendMessage(
          chatId,
          '❌ Не удалось найти координаты по указанному адресу. Попробуйте указать координаты напрямую:\n' +
          '/location 55.751244,37.618423'
        );
        return;
      }
      
      pending.manualLocation = {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        address: geocoded.address,
      };
      
      await bot.sendMessage(
        chatId,
        `✅ Локация установлена:\n` +
        `📍 ${geocoded.address}\n` +
        `📌 ${geocoded.latitude.toFixed(6)}, ${geocoded.longitude.toFixed(6)}\n\n` +
        `Отправьте еще материалы или /done для завершения.`
      );
    }
  } catch (error) {
    console.error('[BOT] ❌ Ошибка при установке локации:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка при обработке локации. Попробуйте еще раз.');
  }
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
    `🎤 Отправьте голосовое сообщение\n` +
    `📝 Отправьте текст новости\n` +
    `📷 Отправьте фотографии (можно группой)\n` +
    `🎥 Отправьте видео\n` +
    `📅 /date ДД.ММ.ГГГГ - установить дату\n` +
    `📍 /location адрес - установить локацию\n` +
    `✅ /done - завершить и создать новость\n` +
    `❌ /cancel - отменить\n` +
    `📋 /list - просмотр всех новостей\n` +
    `📊 /status - текущее состояние\n` +
    `🔄 /reset - сбросить и начать заново`
  );
}

export async function handleStatusCommand(msg: TelegramBot.Message): Promise<void> {
  if (!bot) throw new Error('Telegram bot не инициализирован');
  const chatId = msg.chat.id;
  const pending = pendingNews.get(chatId);

  if (!pending) {
    await bot.sendMessage(chatId, '📭 Нет активной новости. Отправьте текст, фото или голосовое сообщение чтобы начать.');
    return;
  }

  const stateLabels: Record<NewsState, string> = {
    collecting: '📥 Сбор материалов',
    generating: '🤖 Генерация AI...',
    preview: '👁️ Предпросмотр',
    publishing: '📤 Публикация...',
  };

  const statusBar = getStatusBar(pending);
  const startedAt = pending.startedAt.toLocaleString('ru-RU');

  let message = `📊 <b>Статус создания новости</b>\n\n`;
  message += `🔄 Состояние: ${stateLabels[pending.state]}\n`;
  message += `📦 Материалы: ${statusBar}\n`;
  message += `🕐 Начата: ${startedAt}\n`;

  if (pending.state === 'preview' && pending.aiGenerated) {
    message += `\n📰 Заголовок: ${pending.aiGenerated.title}\n`;
  }

  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
  if (pending.state === 'collecting') {
    keyboard.push([{ text: '✅ Готово', callback_data: 'finish_news' }]);
    keyboard.push([{ text: '❌ Отменить', callback_data: 'cancel_news' }]);
  } else if (pending.state === 'preview') {
    keyboard.push([{ text: '✅ Опубликовать', callback_data: 'publish_news' }]);
    keyboard.push([{ text: '🔄 Перегенерировать', callback_data: 'regenerate_ai' }]);
    keyboard.push([{ text: '❌ Отменить', callback_data: 'cancel_news' }]);
  }

  await bot.sendMessage(chatId, message, {
    parse_mode: 'HTML',
    reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
  });
}

export async function handleResetCommand(msg: TelegramBot.Message): Promise<void> {
  if (!bot) throw new Error('Telegram bot не инициализирован');
  const chatId = msg.chat.id;
  const pending = pendingNews.get(chatId);

  if (!pending) {
    await bot.sendMessage(chatId, '📭 Нет активной новости для сброса.');
    return;
  }

  if (pending.state === 'generating' || pending.state === 'publishing') {
    const label = pending.state === 'generating' ? 'генерация AI' : 'публикация';
    await bot.sendMessage(chatId, `⏳ Сейчас идёт ${label}, дождитесь завершения.`);
    return;
  }

  const oldState = pending.state;
  pendingNews.delete(chatId);

  await bot.sendMessage(
    chatId,
    `🔄 Сессия сброшена (была в состоянии: ${oldState}).\n\n` +
      `Отправьте текст, фото или голосовое сообщение чтобы начать новую новость.`
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
 * Обрабатывает редактирование поля после того как пользователь отправил новый текст
 */
export async function handleEditFieldText(chatId: number, newText: string): Promise<void> {
  if (!bot) {
    throw new Error('Telegram bot не инициализирован');
  }

  const pending = pendingNews.get(chatId);

  if (!pending || !pending.aiGenerated || !pending.waitingForEdit || pending.state !== 'preview') {
    if (pending) pending.waitingForEdit = null;
    await bot.sendMessage(chatId, '❌ Нет активного редактирования.');
    return;
  }

  const field = pending.waitingForEdit;
  
  // Обновляем соответствующее поле
  switch (field) {
    case 'title':
      pending.aiGenerated.title = newText;
      await bot.sendMessage(chatId, '✅ Название обновлено!');
      break;
    case 'short':
      pending.aiGenerated.shortDescription = newText;
      await bot.sendMessage(chatId, '✅ Краткое описание обновлено!');
      break;
    case 'full':
      pending.aiGenerated.fullDescription = newText;
      await bot.sendMessage(chatId, '✅ Полное описание обновлено!');
      break;
  }

  // Сбрасываем флаг ожидания редактирования
  pending.waitingForEdit = null;

  // Показываем обновленный предпросмотр
  await showAIPreview(chatId);
}

/**
 * Перегенерирует AI контент
 */
export async function regenerateAIContent(chatId: number): Promise<void> {
  if (!bot) {
    throw new Error('Telegram bot не инициализирован');
  }

  const pending = pendingNews.get(chatId);

  if (!pending) {
    await bot.sendMessage(chatId, '❌ Нет активной новости.');
    return;
  }

  if (pending.state !== 'preview') {
    await bot.sendMessage(chatId, '❌ Перегенерация доступна только на этапе предпросмотра.');
    return;
  }

  try {
    pending.state = 'generating';
    await bot.sendMessage(chatId, '🔄 Перегенерирую контент...');

    // Объединяем текст и голосовые транскрипции
    let combinedText = '';
    
    if (pending.voiceTranscriptions.length > 0) {
      combinedText += pending.voiceTranscriptions.join('\n\n');
    }
    
    if (pending.text) {
      if (combinedText) {
        combinedText += '\n\n' + pending.text;
      } else {
        combinedText = pending.text;
      }
    }
    
    if (!combinedText) {
      combinedText = 'Новое событие';
    }

    // Формируем адрес локации для контекста
    let locationAddress: string | undefined;
    if (pending.manualLocation?.address) {
      locationAddress = pending.manualLocation.address;
    } else if (pending.exifLocation) {
      locationAddress = `${pending.exifLocation.latitude.toFixed(6)}, ${pending.exifLocation.longitude.toFixed(6)}`;
    }

    // Используем ручную дату если указана, иначе EXIF, иначе текущую
    const finalDate = pending.manualDate || pending.exifDate || pending.date;
    
    const expanded = await withTimeout(
      expandTextWithAI(combinedText, {
        date: finalDate.toLocaleDateString('ru-RU'),
        location: locationAddress,
        imagesCount: pending.images.length,
        videosCount: pending.videos.length,
        voiceTranscriptions: pending.voiceTranscriptions,
        isFromVoice: pending.voiceTranscriptions.length > 0,
      }),
      90000,
      'AI перегенерация превысила таймаут (90 сек)'
    );

    // Обновляем AI-сгенерированный контент
    pending.aiGenerated = {
      title: expanded.title,
      shortDescription: expanded.shortDescription,
      fullDescription: expanded.fullDescription,
    };

    // Показываем обновленный предпросмотр
    await showAIPreview(chatId);
    pending.state = 'preview';
    
  } catch (error) {
    const p = pendingNews.get(chatId);
    if (p) p.state = 'preview';
    console.error('[BOT] ❌ Ошибка при перегенерации:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка при перегенерации. Попробуйте еще раз.');
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
