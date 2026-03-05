/**
 * Юнит-тесты для OpenRouter AI интеграции
 * Тестирует парсинг JSON, fallback-логику, расширение текста
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('OpenRouter expandTextWithAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key';
  });

  it('should parse valid JSON response correctly', async () => {
    const { expandTextWithAI } = await import('@/lib/openrouter');

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Мастер-класс по биопсии',
              shortDescription: 'Краткое описание мастер-класса',
              fullDescription: 'Полное описание мастер-класса по вакуумной биопсии молочной железы',
            }),
          },
        }],
      },
    });

    const result = await expandTextWithAI('Провели мастер-класс');

    expect(result.title).toBe('Мастер-класс по биопсии');
    expect(result.shortDescription).toBe('Краткое описание мастер-класса');
    expect(result.fullDescription).toBe('Полное описание мастер-класса по вакуумной биопсии молочной железы');
  });

  it('should parse JSON wrapped in markdown code blocks', async () => {
    const { expandTextWithAI } = await import('@/lib/openrouter');

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: '```json\n' + JSON.stringify({
              title: 'Test Title',
              shortDescription: 'Test short',
              fullDescription: 'Test full',
            }) + '\n```',
          },
        }],
      },
    });

    const result = await expandTextWithAI('test');

    expect(result.title).toBe('Test Title');
  });

  it('should extract JSON from mixed text response', async () => {
    const { expandTextWithAI } = await import('@/lib/openrouter');

    const jsonContent = JSON.stringify({
      title: 'Extracted Title',
      shortDescription: 'Extracted short',
      fullDescription: 'Extracted full description',
    });

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: `Вот результат:\n${jsonContent}\n\nНадеюсь, это поможет!`,
          },
        }],
      },
    });

    const result = await expandTextWithAI('test');

    expect(result.title).toBe('Extracted Title');
    expect(result.fullDescription).toBe('Extracted full description');
  });

  it('should fallback to original text when JSON parsing completely fails', async () => {
    const { expandTextWithAI } = await import('@/lib/openrouter');

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: 'Просто текстовый ответ без JSON вообще',
          },
        }],
      },
    });

    const result = await expandTextWithAI('Мой оригинальный текст');

    // Должен вернуть исходный текст, а не сырой ответ AI
    expect(result.fullDescription).toBe('Мой оригинальный текст');
    expect(result.title).toBe('Мой оригинальный текст'.substring(0, 50));
  });

  it('should NOT return raw JSON string in fullDescription on parse failure', async () => {
    const { expandTextWithAI } = await import('@/lib/openrouter');

    // AI вернул невалидный JSON с полями title/shortDescription/fullDescription
    // но с синтаксической ошибкой
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: '{"title": "Test", "shortDescription": "Short", "fullDescription": "Full", extra_invalid}',
          },
        }],
      },
    });

    const result = await expandTextWithAI('Original text');

    // fullDescription НЕ должен содержать сырой JSON
    expect(result.fullDescription).not.toContain('{');
    expect(result.fullDescription).not.toContain('}');
  });

  it('should use fallback when API key is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    // Need to re-import to pick up env change
    vi.resetModules();
    const { expandTextWithAI } = await import('@/lib/openrouter');

    const result = await expandTextWithAI('Test text without API key');

    expect(result.title).toBe('Test text without API key'.substring(0, 50));
    expect(result.fullDescription).toBe('Test text without API key');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('should use fallback on API error', async () => {
    const { expandTextWithAI } = await import('@/lib/openrouter');

    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    const result = await expandTextWithAI('Test text with error');

    expect(result.title).toBe('Test text with error'.substring(0, 50));
    expect(result.fullDescription).toBe('Test text with error');
  });

  it('should include voice context in prompt', async () => {
    const { expandTextWithAI } = await import('@/lib/openrouter');

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Voice Title',
              shortDescription: 'Voice short',
              fullDescription: 'Voice full',
            }),
          },
        }],
      },
    });

    await expandTextWithAI('Текст из голоса', {
      isFromVoice: true,
      voiceTranscriptions: ['Транскрипция 1'],
      date: '05.03.2026',
      imagesCount: 3,
    });

    // Проверяем, что запрос отправлен с контекстом
    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const callArgs = mockedAxios.post.mock.calls[0];
    const messages = (callArgs[1] as any).messages;
    const userMessage = messages[1].content;
    expect(userMessage).toContain('Текст из голоса');
    expect(userMessage).toContain('Дата события: 05.03.2026');
    expect(userMessage).toContain('Количество фотографий: 3');
  });
});

describe('OpenRouter transcribeAudioWithAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key';
  });

  it('should transcribe audio successfully', async () => {
    const { transcribeAudioWithAI } = await import('@/lib/openrouter');

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: 'Распознанный текст из аудио',
          },
        }],
      },
    });

    const result = await transcribeAudioWithAI(Buffer.from('fake-audio'), 'ogg');

    expect(result).toBe('Распознанный текст из аудио');
  });

  it('should throw on empty transcription', async () => {
    const { transcribeAudioWithAI } = await import('@/lib/openrouter');

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: '',
          },
        }],
      },
    });

    await expect(transcribeAudioWithAI(Buffer.from('fake-audio'), 'ogg'))
      .rejects.toThrow('Пустой ответ от OpenRouter');
  });

  it('should throw when API key is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    vi.resetModules();
    const { transcribeAudioWithAI } = await import('@/lib/openrouter');

    await expect(transcribeAudioWithAI(Buffer.from('fake-audio'), 'ogg'))
      .rejects.toThrow('OPENROUTER_API_KEY не установлен');
  });
});
