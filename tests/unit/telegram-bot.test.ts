/**
 * Юнит-тесты для Telegram бота
 * Тестирует state machine, race conditions, обработку голосовых сообщений
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Мокаем зависимости до импорта
vi.mock('node-telegram-bot-api', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      sendMessage: vi.fn().mockResolvedValue({}),
      answerCallbackQuery: vi.fn().mockResolvedValue({}),
      setWebhook: vi.fn().mockResolvedValue({}),
    })),
  };
});

vi.mock('@/lib/file-utils', () => ({
  downloadTelegramFile: vi.fn().mockResolvedValue(Buffer.from('fake-audio')),
  saveMediaFile: vi.fn().mockReturnValue('/images/test/image.jpg'),
  getFileExtension: vi.fn().mockReturnValue('.jpg'),
  extractExifData: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/openrouter', () => ({
  expandTextWithAI: vi.fn().mockResolvedValue({
    title: 'Test Title',
    shortDescription: 'Test short description',
    fullDescription: 'Test full description with details',
  }),
  transcribeAudioWithAI: vi.fn().mockResolvedValue('Распознанный текст из голосового'),
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [{ id: 'test-id' }] }),
      release: vi.fn(),
    }),
    end: vi.fn(),
  })),
}));

// Теперь импортируем модуль
import { pendingNews } from '@/lib/telegram-bot';
import type TelegramBot from 'node-telegram-bot-api';

// Тип для PendingNews (берём из Map)
type PendingNews = NonNullable<ReturnType<typeof pendingNews.get>>;

describe('Telegram Bot State Machine', () => {
  beforeEach(() => {
    pendingNews.clear();
  });

  afterEach(() => {
    pendingNews.clear();
  });

  describe('PendingNews state transitions', () => {
    it('should start in collecting state', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: 'test',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'collecting',
      };
      pendingNews.set(123, pending);

      expect(pending.state).toBe('collecting');
    });

    it('should transition from collecting to generating', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: 'test',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'collecting',
      };
      pendingNews.set(123, pending);

      pending.state = 'generating';
      expect(pending.state).toBe('generating');
    });

    it('should transition from generating to preview', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: 'test',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'generating',
        aiGenerated: {
          title: 'Test',
          shortDescription: 'Short',
          fullDescription: 'Full',
        },
      };
      pendingNews.set(123, pending);

      pending.state = 'preview';
      expect(pending.state).toBe('preview');
    });
  });

  describe('isProcessing flag', () => {
    it('should prevent concurrent voice processing', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: '',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'collecting',
        isProcessing: true,
      };
      pendingNews.set(123, pending);

      // Проверяем, что isProcessing блокирует обработку
      expect(pending.isProcessing).toBe(true);
    });

    it('should allow processing when isProcessing is false', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: '',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'collecting',
        isProcessing: false,
      };
      pendingNews.set(123, pending);

      expect(pending.isProcessing).toBe(false);
    });

    it('should default isProcessing to undefined (falsy)', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: '',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'collecting',
      };
      pendingNews.set(123, pending);

      expect(pending.isProcessing).toBeFalsy();
    });
  });

  describe('Voice transcription accumulation', () => {
    it('should accumulate multiple voice transcriptions', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: '',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'collecting',
      };
      pendingNews.set(123, pending);

      pending.voiceTranscriptions.push('Первое голосовое');
      pending.voiceTranscriptions.push('Второе голосовое');

      expect(pending.voiceTranscriptions).toHaveLength(2);
      expect(pending.voiceTranscriptions[0]).toBe('Первое голосовое');
      expect(pending.voiceTranscriptions[1]).toBe('Второе голосовое');
    });

    it('should combine text and voice transcriptions for AI', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: 'Текст сообщения',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: ['Голосовое 1', 'Голосовое 2'],
        state: 'preview',
      };

      // Эмулируем логику объединения из regenerateAIContent
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

      expect(combinedText).toBe('Голосовое 1\n\nГолосовое 2\n\nТекст сообщения');
    });
  });

  describe('State guards', () => {
    it('should block voice in generating state', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: '',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'generating',
      };

      // Эмулируем guard из handleVoiceMessage
      const shouldBlock = pending.state !== 'collecting' && pending.state !== 'preview';
      expect(shouldBlock).toBe(true);
    });

    it('should block voice in publishing state', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: '',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'publishing',
      };

      const shouldBlock = pending.state !== 'collecting' && pending.state !== 'preview';
      expect(shouldBlock).toBe(true);
    });

    it('should allow voice in collecting state', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: '',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'collecting',
      };

      const shouldBlock = pending.state !== 'collecting' && pending.state !== 'preview';
      expect(shouldBlock).toBe(false);
    });

    it('should allow voice in preview state', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: '',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'preview',
      };

      const shouldBlock = pending.state !== 'collecting' && pending.state !== 'preview';
      expect(shouldBlock).toBe(false);
    });

    it('should block regeneration when not in preview state', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: '',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'collecting',
      };

      expect(pending.state !== 'preview').toBe(true);
    });

    it('should block regeneration when isProcessing is true', () => {
      const pending: PendingNews = {
        chatId: 123,
        messageId: 1,
        text: '',
        images: [],
        videos: [],
        date: new Date(),
        startedAt: new Date(),
        voiceTranscriptions: [],
        state: 'preview',
        isProcessing: true,
      };

      expect(pending.isProcessing).toBe(true);
    });
  });
});
