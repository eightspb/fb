/**
 * API Route для приема webhook обновлений от Telegram
 */

import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import {
  handleTextMessage,
  handlePhotoMessage,
  handleVideoMessage,
  handleVoiceMessage,
  handleDoneCommand,
  handleCancelCommand,
  handleStartCommand,
  handleListCommand,
  handleDateCommand,
  handleLocationCommand,
  handleStatusCommand,
  handleResetCommand,
  sendNewsActionsMenu,
  getAllNewsFromDB,
  sendNewsListPage,
  finishNewsCreation,
  publishNewsFromPreview,
  handleEditFieldText,
  regenerateAIContent,
} from '@/lib/telegram-bot';
import { Pool } from 'pg';

// Явно указываем Node.js runtime для работы с PostgreSQL и Telegram Bot API
export const runtime = 'nodejs';

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  console.error('TELEGRAM_BOT_TOKEN не установлен');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ===== TELEGRAM WEBHOOK RECEIVED =====`);
  
  try {
    if (!botToken) {
      console.error('[WEBHOOK] ❌ TELEGRAM_BOT_TOKEN не установлен');
      return NextResponse.json(
        { error: 'Telegram bot не настроен' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('[WEBHOOK] 📥 Получено обновление:', JSON.stringify(body, null, 2));

    // Обрабатываем callback_query (ответы на кнопки)
    if (body.callback_query) {
      console.log('[WEBHOOK] 🔘 Обработка callback_query');
      const callbackQuery = body.callback_query;
      
      // Парсим callback_data
      const callbackData = callbackQuery.data || '';
      const [actionPrefix, ...dataParts] = callbackData.split(':');
      const data = dataParts.join(':'); // На случай если данные содержат двоеточие
      
      console.log('[WEBHOOK] Callback data:', { actionPrefix, data, fullData: callbackData });

      const bot = new TelegramBot(botToken, { polling: false });
      const chatId = callbackQuery.message?.chat?.id;

      if (!chatId) {
        console.error('[WEBHOOK] ❌ Не удалось получить chatId из callback_query');
        return NextResponse.json({ ok: true });
      }

      // Обработка выбора новости
      if (actionPrefix === 'sel' || actionPrefix === 's') {
        const client = await pool.connect();
        try {
          // Ищем новость по ID (может быть усеченным)
          // Используем LIKE для поиска по началу ID
          const result = await client.query(
            'SELECT id, title, status FROM news WHERE id LIKE $1 ORDER BY LENGTH(id) ASC LIMIT 1',
            [`${data}%`]
          );

          if (result.rows.length > 0) {
            const news = result.rows[0];
            await sendNewsActionsMenu(chatId, news.id, news.title, news.status);
            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Выберите действие' });
          } else {
            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Новость не найдена' });
          }
        } finally {
          client.release();
        }
        return NextResponse.json({ ok: true });
      }

      // Обработка навигации по страницам
      if (actionPrefix === 'page') {
        const pageIndex = parseInt(data, 10);
        const newsList = await getAllNewsFromDB();
        const pageSize = 10;
        const pages: Array<typeof newsList> = [];
        for (let i = 0; i < newsList.length; i += pageSize) {
          pages.push(newsList.slice(i, i + pageSize));
        }

        if (pageIndex >= 0 && pageIndex < pages.length) {
          // Редактируем существующее сообщение вместо отправки нового
          const messageId = callbackQuery.message?.message_id;
          await sendNewsListPage(chatId, pages[pageIndex], pageIndex, pages.length, messageId);
          await bot.answerCallbackQuery(callbackQuery.id, { text: `Страница ${pageIndex + 1}` });
        }
        return NextResponse.json({ ok: true });
      }

      // Обработка возврата к списку
      if (actionPrefix === 'back' && data === 'list') {
        const newsList = await getAllNewsFromDB();
        const pageSize = 10;
        const pages: Array<typeof newsList> = [];
        for (let i = 0; i < newsList.length; i += pageSize) {
          pages.push(newsList.slice(i, i + pageSize));
        }

        if (pages.length > 0) {
          // Отправляем новое сообщение (возврат к списку)
          await sendNewsListPage(chatId, pages[0], 0, pages.length);
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Список новостей' });
        }
        return NextResponse.json({ ok: true });
      }

      // Обработка кнопок сбора материалов и предпросмотра
      if (callbackData === 'finish_news') {
        console.log('[WEBHOOK] ✅ Завершение создания новости');
        try {
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Генерирую новость...' });
        } catch (e) {
          console.warn('[WEBHOOK] ⚠️ answerCallbackQuery не удалось (query устарел), продолжаем:', (e as Error).message);
        }
        await finishNewsCreation(chatId);
        return NextResponse.json({ ok: true });
      }

      if (callbackData === 'cancel_news') {
        console.log('[WEBHOOK] ❌ Отмена создания новости');
        const { handleCancelCommand: cancel, pendingNews } = await import('@/lib/telegram-bot');
        const pending = (pendingNews as any).get(chatId);
        if (pending?.state === 'publishing') {
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Идёт публикация, подождите...' });
          return NextResponse.json({ ok: true });
        }
        await cancel({ chat: { id: chatId } } as any);
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Отменено' });
        return NextResponse.json({ ok: true });
      }

      if (callbackData === 'set_date') {
        await bot.answerCallbackQuery(callbackQuery.id);
        await bot.sendMessage(
          chatId,
          'Отправьте дату в формате:\n/date ДД.ММ.ГГГГ\n\nПример: /date 15.02.2026'
        );
        return NextResponse.json({ ok: true });
      }

      if (callbackData === 'set_location') {
        await bot.answerCallbackQuery(callbackQuery.id);
        await bot.sendMessage(
          chatId,
          'Отправьте локацию:\n' +
          '/location 55.751244,37.618423\n' +
          'или\n' +
          '/location Москва, ул. Тверская 1'
        );
        return NextResponse.json({ ok: true });
      }

      // Обработка предпросмотра и редактирования
      if (callbackData === 'publish_news') {
        console.log('[WEBHOOK] 📰 Публикация новости');
        try {
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Публикую...' });
        } catch (e) {
          console.warn('[WEBHOOK] ⚠️ answerCallbackQuery не удалось (query устарел), продолжаем:', (e as Error).message);
        }
        await publishNewsFromPreview(chatId);
        return NextResponse.json({ ok: true });
      }

      if (callbackData === 'edit_title') {
        const { pendingNews } = await import('@/lib/telegram-bot');
        const pending = (pendingNews as any).get(chatId);
        if (pending) {
          pending.waitingForEdit = 'title';
          await bot.answerCallbackQuery(callbackQuery.id);
          await bot.sendMessage(chatId, 'Отправьте новое название:');
        }
        return NextResponse.json({ ok: true });
      }

      if (callbackData === 'edit_short') {
        const { pendingNews } = await import('@/lib/telegram-bot');
        const pending = (pendingNews as any).get(chatId);
        if (pending) {
          pending.waitingForEdit = 'short';
          await bot.answerCallbackQuery(callbackQuery.id);
          await bot.sendMessage(chatId, 'Отправьте новое краткое описание:');
        }
        return NextResponse.json({ ok: true });
      }

      if (callbackData === 'edit_full') {
        const { pendingNews } = await import('@/lib/telegram-bot');
        const pending = (pendingNews as any).get(chatId);
        if (pending) {
          pending.waitingForEdit = 'full';
          await bot.answerCallbackQuery(callbackQuery.id);
          await bot.sendMessage(chatId, 'Отправьте новое полное описание:');
        }
        return NextResponse.json({ ok: true });
      }

      if (callbackData === 'regenerate_ai') {
        console.log('[WEBHOOK] 🔄 Перегенерация AI контента');
        try {
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Перегенерирую...' });
        } catch (e) {
          console.warn('[WEBHOOK] ⚠️ answerCallbackQuery не удалось (query устарел), продолжаем:', (e as Error).message);
        }
        await regenerateAIContent(chatId);
        return NextResponse.json({ ok: true });
      }

      // Обработка действий с новостью
      const client = await pool.connect();
      try {
        // Ищем новость по ID (может быть усеченным)
        const newsResult = await client.query(
          'SELECT id, title, status FROM news WHERE id LIKE $1 LIMIT 1',
          [`${data}%`]
        );

        if (newsResult.rows.length === 0) {
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Новость не найдена' });
          return NextResponse.json({ ok: true });
        }

        const newsId = newsResult.rows[0].id;

        if (actionPrefix === 'pub' || actionPrefix === 'p') {
          console.log(`[WEBHOOK] ✅ Публикация новости: ${newsId}`);
          await client.query(
            'UPDATE news SET status = $1, updated_at = NOW() WHERE id = $2',
            ['published', newsId]
          );

          await bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Новость опубликована!',
            show_alert: false,
          });

          const { notifyPublishConfirmation } = await import('@/lib/telegram-notifications');
          await notifyPublishConfirmation(newsId);

          // Обновляем меню действий
          await sendNewsActionsMenu(chatId, newsId, newsResult.rows[0].title, 'published');
          return NextResponse.json({ ok: true });
        }

        if (actionPrefix === 'unp') {
          console.log(`[WEBHOOK] 📝 Снятие новости с публикации: ${newsId}`);
          await client.query(
            'UPDATE news SET status = $1, updated_at = NOW() WHERE id = $2',
            ['draft', newsId]
          );

          await bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Новость снята с публикации',
            show_alert: false,
          });

          // Обновляем меню действий
          await sendNewsActionsMenu(chatId, newsId, newsResult.rows[0].title, 'draft');
          return NextResponse.json({ ok: true });
        }

        if (actionPrefix === 'del') {
          console.log(`[WEBHOOK] ❌ Удаление новости: ${newsId}`);
          await client.query('DELETE FROM news_images WHERE news_id = $1', [newsId]);
          await client.query('DELETE FROM news_videos WHERE news_id = $1', [newsId]);
          await client.query('DELETE FROM news_tags WHERE news_id = $1', [newsId]);
          await client.query('DELETE FROM news_documents WHERE news_id = $1', [newsId]);
          await client.query('DELETE FROM news WHERE id = $1', [newsId]);

          await bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Новость удалена',
            show_alert: true,
          });

          await bot.sendMessage(chatId, `❌ Новость "${newsResult.rows[0].title}" удалена.`);
          return NextResponse.json({ ok: true });
        }

        if (actionPrefix === 'rej' || actionPrefix === 'r') {
          console.log(`[WEBHOOK] ❌ Отклонение новости: ${newsId}`);
          await client.query('DELETE FROM news_images WHERE news_id = $1', [newsId]);
          await client.query('DELETE FROM news_videos WHERE news_id = $1', [newsId]);
          await client.query('DELETE FROM news_tags WHERE news_id = $1', [newsId]);
          await client.query('DELETE FROM news_documents WHERE news_id = $1', [newsId]);
          await client.query('DELETE FROM news WHERE id = $1', [newsId]);

          await bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Новость отклонена и удалена',
            show_alert: false,
          });

          const { notifyRejection } = await import('@/lib/telegram-notifications');
          await notifyRejection(newsId);

          console.log(`[WEBHOOK] ✅ Новость ${newsId} отклонена и удалена`);
          return NextResponse.json({ ok: true });
        }
      } finally {
        client.release();
      }
    }

    // Обрабатываем обновление от Telegram
    if (body.message) {
      const msg = body.message as TelegramBot.Message;
      console.log('[WEBHOOK] 💬 Обработка сообщения:', {
        chatId: msg.chat.id,
        messageId: msg.message_id,
        hasText: !!msg.text,
        hasPhoto: !!(msg.photo && msg.photo.length > 0),
        hasVideo: !!msg.video,
        text: msg.text?.substring(0, 100),
      });

      // Обрабатываем команды
      if (msg.text) {
        const text = msg.text.trim();
        console.log(`[WEBHOOK] 📝 Текст сообщения: "${text}"`);

        if (text === '/start') {
          console.log('[WEBHOOK] 🚀 Команда /start');
          await handleStartCommand(msg);
          console.log('[WEBHOOK] ✅ Команда /start обработана');
          return NextResponse.json({ ok: true });
        }

        if (text === '/done') {
          console.log('[WEBHOOK] ✅ Команда /done');
          await handleDoneCommand(msg);
          console.log('[WEBHOOK] ✅ Команда /done обработана');
          return NextResponse.json({ ok: true });
        }

        if (text === '/cancel') {
          console.log('[WEBHOOK] ❌ Команда /cancel');
          await handleCancelCommand(msg);
          console.log('[WEBHOOK] ✅ Команда /cancel обработана');
          return NextResponse.json({ ok: true });
        }

        if (text === '/list') {
          console.log('[WEBHOOK] 📋 Команда /list');
          await handleListCommand(msg);
          console.log('[WEBHOOK] ✅ Команда /list обработана');
          return NextResponse.json({ ok: true });
        }

        if (text === '/status') {
          console.log('[WEBHOOK] 📊 Команда /status');
          await handleStatusCommand(msg);
          console.log('[WEBHOOK] ✅ Команда /status обработана');
          return NextResponse.json({ ok: true });
        }

        if (text === '/reset') {
          console.log('[WEBHOOK] 🔄 Команда /reset');
          await handleResetCommand(msg);
          console.log('[WEBHOOK] ✅ Команда /reset обработана');
          return NextResponse.json({ ok: true });
        }

        if (text.startsWith('/date')) {
          console.log('[WEBHOOK] 📅 Команда /date');
          await handleDateCommand(msg);
          console.log('[WEBHOOK] ✅ Команда /date обработана');
          return NextResponse.json({ ok: true });
        }

        if (text.startsWith('/location')) {
          console.log('[WEBHOOK] 📍 Команда /location');
          await handleLocationCommand(msg);
          console.log('[WEBHOOK] ✅ Команда /location обработана');
          return NextResponse.json({ ok: true });
        }
      }

      // Обрабатываем фото
      if (msg.photo && msg.photo.length > 0) {
        console.log(`[WEBHOOK] 📷 Обработка фото (${msg.photo.length} размеров)`);
        await handlePhotoMessage(msg);
        console.log('[WEBHOOK] ✅ Фото обработано');
        return NextResponse.json({ ok: true });
      }

      // Обрабатываем видео
      if (msg.video) {
        console.log('[WEBHOOK] 🎥 Обработка видео');
        await handleVideoMessage(msg);
        console.log('[WEBHOOK] ✅ Видео обработано');
        return NextResponse.json({ ok: true });
      }

      // Обрабатываем голосовые сообщения
      if (msg.voice) {
        console.log('[WEBHOOK] 🎤 Обработка голосового сообщения');
        await handleVoiceMessage(msg);
        console.log('[WEBHOOK] ✅ Голосовое сообщение обработано');
        return NextResponse.json({ ok: true });
      }

      // Обрабатываем текстовые сообщения
      if (msg.text) {
        // Проверяем, ожидается ли редактирование поля
        const { pendingNews } = await import('@/lib/telegram-bot');
        const pending = (pendingNews as any).get(msg.chat.id);
        
        if (pending && pending.waitingForEdit) {
          console.log('[WEBHOOK] ✏️ Обработка редактирования поля');
          await handleEditFieldText(msg.chat.id, msg.text);
          console.log('[WEBHOOK] ✅ Редактирование обработано');
          return NextResponse.json({ ok: true });
        }
        
        console.log('[WEBHOOK] 📝 Обработка текстового сообщения');
        await handleTextMessage(msg);
        console.log('[WEBHOOK] ✅ Текстовое сообщение обработано');
        return NextResponse.json({ ok: true });
      }
    }

    console.log('[WEBHOOK] ⚠️ Неизвестный тип обновления');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[WEBHOOK] ❌ Ошибка при обработке webhook:', error);
    if (error instanceof Error) {
      console.error('[WEBHOOK] Сообщение об ошибке:', error.message);
      console.error('[WEBHOOK] Stack trace:', error.stack);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    console.log(`[${new Date().toISOString()}] ===== WEBHOOK PROCESSING COMPLETE =====\n`);
  }
}

export async function GET() {
  console.log('[WEBHOOK] 🔍 GET запрос - проверка endpoint');
  return NextResponse.json({ status: 'ok', message: 'Telegram webhook endpoint is active' });
}
