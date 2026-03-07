import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('OpenRouter improveDescriptionWithAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key';
  });

  it('returns trimmed improved text', async () => {
    const { improveDescriptionWithAI } = await import('@/lib/openrouter');
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: '  Улучшенный текст новости  ' } }],
      },
    });

    await expect(improveDescriptionWithAI('Черновик')).resolves.toBe('Улучшенный текст новости');
  });

  it('throws when API key is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    vi.resetModules();
    const { improveDescriptionWithAI } = await import('@/lib/openrouter');

    await expect(improveDescriptionWithAI('Черновик'))
      .rejects.toThrow('OPENROUTER_API_KEY не настроен');
  });

  it('throws on empty AI response', async () => {
    const { improveDescriptionWithAI } = await import('@/lib/openrouter');
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: '' } }],
      },
    });

    await expect(improveDescriptionWithAI('Черновик'))
      .rejects.toThrow('Не удалось улучшить текст');
  });

  it('maps 429 errors to a rate limit message', async () => {
    const { improveDescriptionWithAI } = await import('@/lib/openrouter');
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 429 },
    });
    mockedAxios.isAxiosError.mockReturnValue(true);

    await expect(improveDescriptionWithAI('Черновик'))
      .rejects.toThrow('Превышен лимит запросов');
  });

  it('maps server errors to service unavailable', async () => {
    const { improveDescriptionWithAI } = await import('@/lib/openrouter');
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 503 },
    });
    mockedAxios.isAxiosError.mockReturnValue(true);

    await expect(improveDescriptionWithAI('Черновик'))
      .rejects.toThrow('AI сервис временно недоступен');
  });
  it('maps 401 errors to an invalid api key message', async () => {
    const { improveDescriptionWithAI } = await import('@/lib/openrouter');
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 401 },
    });
    mockedAxios.isAxiosError.mockReturnValue(true);

    await expect(improveDescriptionWithAI('Ð§ÐµÑ€Ð½Ð¾Ð²Ð¸Ðº'))
      .rejects.toThrow(/OpenRouter|OPENROUTER_API_KEY/);
  });

  it('falls back to a generic error message for non-axios failures', async () => {
    const { improveDescriptionWithAI } = await import('@/lib/openrouter');
    mockedAxios.post.mockRejectedValueOnce(new Error('boom'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    await expect(improveDescriptionWithAI('Ð§ÐµÑ€Ð½Ð¾Ð²Ð¸Ðº'))
      .rejects.toThrow(/улучшить текст|Попробуйте позже/);
  });
});
