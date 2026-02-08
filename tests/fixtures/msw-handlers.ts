/**
 * MSW (Mock Service Worker) handlers для моков внешних API
 * Используется в unit и integration тестах
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Базовые URL для API
const TELEGRAM_API_BASE = 'https://api.telegram.org';
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

/**
 * Handlers для Telegram Bot API
 */
export const telegramHandlers = [
  // Отправка сообщения
  http.post(`${TELEGRAM_API_BASE}/bot:token/sendMessage`, async ({ request }) => {
    const body = await request.json() as { chat_id: number; text: string };
    return HttpResponse.json({
      ok: true,
      result: {
        message_id: 123,
        date: Date.now(),
        chat: {
          id: body.chat_id,
          type: 'private',
        },
        text: body.text,
      },
    });
  }),

  // Получение информации о боте
  http.get(`${TELEGRAM_API_BASE}/bot:token/getMe`, () => {
    return HttpResponse.json({
      ok: true,
      result: {
        id: 123456789,
        is_bot: true,
        first_name: 'Test Bot',
        username: 'test_bot',
        can_join_groups: true,
        can_read_all_group_messages: false,
        supports_inline_queries: false,
      },
    });
  }),

  // Установка webhook
  http.post(`${TELEGRAM_API_BASE}/bot:token/setWebhook`, async ({ request }) => {
    const body = await request.json() as { url: string };
    return HttpResponse.json({
      ok: true,
      result: true,
      description: `Webhook установлен на ${body.url}`,
    });
  }),

  // Получение файла
  http.get(`${TELEGRAM_API_BASE}/bot:token/getFile`, async ({ request }) => {
    const url = new URL(request.url);
    const fileId = url.searchParams.get('file_id');
    return HttpResponse.json({
      ok: true,
      result: {
        file_id: fileId,
        file_unique_id: 'unique-' + fileId,
        file_path: `photos/file_${fileId}.jpg`,
        file_size: 1024,
      },
    });
  }),

  // Скачивание файла
  http.get(`${TELEGRAM_API_BASE}/file/bot:token/:filePath`, () => {
    // Возвращаем мок изображения
    return HttpResponse.arrayBuffer(new ArrayBuffer(1024), {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
  }),
];

/**
 * Handlers для OpenRouter AI API
 */
export const openRouterHandlers = [
  // Chat completion (streaming)
  http.post(`${OPENROUTER_API_BASE}/chat/completions`, async ({ request }) => {
    const body = await request.json() as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      stream?: boolean;
    };

    if (body.stream) {
      // Streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const chunks = [
            'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"openai/gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
            'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"openai/gpt-4","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}\n\n',
            'data: [DONE]\n\n',
          ];

          chunks.forEach((chunk, index) => {
            setTimeout(() => {
              controller.enqueue(encoder.encode(chunk));
              if (index === chunks.length - 1) {
                controller.close();
              }
            }, index * 100);
          });
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming response
    return HttpResponse.json({
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: Date.now(),
      model: body.model || 'openai/gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a mock AI response',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    });
  }),
];

/**
 * Handlers для SMTP/Nodemailer (мок через HTTP endpoint для тестирования)
 */
export const smtpHandlers = [
  // Мок endpoint для отправки email (если используется HTTP API)
  http.post('https://api.email-service.com/send', async ({ request }) => {
    const body = await request.json();
    const emailBody =
      typeof body === 'object' && body !== null ? (body as { to?: string; subject?: string }) : {};
    return HttpResponse.json({
      success: true,
      messageId: 'mock-message-id-' + Date.now(),
      to: emailBody.to,
      subject: emailBody.subject,
    });
  }),
];

/**
 * Handlers для Upstash Redis (rate limiting)
 */
export const upstashHandlers = [
  http.post('https://*.upstash.io/*', async ({ request }) => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Rate limit check
    if (pathname.includes('/get/')) {
      return HttpResponse.json({
        result: null, // No rate limit hit
      });
    }

    // Rate limit increment
    if (pathname.includes('/incr/')) {
      return HttpResponse.json({
        result: 1, // Current count
      });
    }

    return HttpResponse.json({ result: null });
  }),
];

/**
 * Все handlers объединены
 */
export const handlers = [
  ...telegramHandlers,
  ...openRouterHandlers,
  ...smtpHandlers,
  ...upstashHandlers,
];

/**
 * MSW Server для использования в тестах
 */
export const server = setupServer(...handlers);
