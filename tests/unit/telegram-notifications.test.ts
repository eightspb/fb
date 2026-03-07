import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMessageMock = vi.hoisted(() => vi.fn());
const sendPhotoMock = vi.hoisted(() => vi.fn());

const queryMock = vi.hoisted(() => vi.fn());
const releaseMock = vi.hoisted(() => vi.fn());
const connectMock = vi.hoisted(() => vi.fn());

vi.mock('node-telegram-bot-api', () => ({
  default: vi.fn().mockImplementation(() => ({
    sendMessage: sendMessageMock,
    sendPhoto: sendPhotoMock,
  })),
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: connectMock,
  })),
}));

async function loadModule(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  process.env.TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN ?? 'notify-token';
  process.env.TELEGRAM_ADMIN_CHAT_ID = env.TELEGRAM_ADMIN_CHAT_ID ?? '321';
  process.env.NEXT_PUBLIC_SITE_URL = env.NEXT_PUBLIC_SITE_URL ?? 'https://fibroadenoma.test';
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:54322/postgres';
  return import('../../src/lib/telegram-notifications');
}

describe('telegram-notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMessageMock.mockResolvedValue({});
    sendPhotoMock.mockResolvedValue({});
    queryMock.mockResolvedValue({ rows: [] });
    releaseMock.mockReturnValue(undefined);
    connectMock.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });
  });

  it('skips draft notification when bot config is missing', async () => {
    const notifications = await loadModule({
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_ADMIN_CHAT_ID: '',
    });

    await notifications.notifyAdminAboutDraft('news-1', {
      title: 'Title',
      shortDescription: 'Short',
      fullDescription: 'Full',
    });

    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(sendPhotoMock).not.toHaveBeenCalled();
  });

  it('sends a draft notification with photo preview when an image exists', async () => {
    const notifications = await loadModule();
    queryMock.mockResolvedValueOnce({
      rows: [{ image_url: '/uploads/news-preview.jpg' }],
    });

    await notifications.notifyAdminAboutDraft('news-123', {
      title: 'AI Title',
      shortDescription: 'Короткое описание',
      fullDescription: 'Полный текст',
    }, 3);

    expect(sendPhotoMock).toHaveBeenCalledWith(
      321,
      `${process.cwd()}/public/uploads/news-preview.jpg`,
      expect.objectContaining({
        parse_mode: 'HTML',
        caption: expect.stringContaining('AI Title'),
      })
    );
    expect(releaseMock).toHaveBeenCalled();
  });

  it('falls back to text notification when photo sending fails', async () => {
    const notifications = await loadModule();
    queryMock.mockResolvedValueOnce({
      rows: [{ image_url: '/uploads/news-preview.jpg' }],
    });
    sendPhotoMock.mockRejectedValueOnce(new Error('photo failed'));

    await notifications.notifyAdminAboutDraft('news-124', {
      title: 'Fallback Title',
      shortDescription: 'Описание',
      fullDescription: 'Полный текст',
    }, 1);

    expect(sendMessageMock).toHaveBeenCalledWith(
      321,
      expect.stringContaining('Fallback Title'),
      expect.objectContaining({ parse_mode: 'HTML' })
    );
  });

  it('sends a text-only draft notification when no preview image exists', async () => {
    const notifications = await loadModule();
    const longNewsId = '123456789012345678901234567890';

    await notifications.notifyAdminAboutDraft(longNewsId, {
      title: 'Text Only',
      shortDescription: 'S'.repeat(240),
      fullDescription: 'Full text',
    }, 2);

    const [, message, options] = sendMessageMock.mock.calls[0];
    const keyboard = (options as { reply_markup: { inline_keyboard: Array<Array<{ callback_data?: string }>> } }).reply_markup;

    expect(message).toContain('...');
    expect(keyboard.inline_keyboard[0][0].callback_data).toBe(`p:${longNewsId.substring(0, 20)}`);
    expect(keyboard.inline_keyboard[0][1].callback_data).toBe(`r:${longNewsId.substring(0, 20)}`);
  });

  it('keeps remote preview image urls unchanged', async () => {
    const notifications = await loadModule();
    queryMock.mockResolvedValueOnce({
      rows: [{ image_url: 'https://cdn.fibroadenoma.test/news-preview.jpg' }],
    });

    await notifications.notifyAdminAboutDraft('remote-image', {
      title: 'Remote Image',
      shortDescription: 'Short',
      fullDescription: 'Full',
    });

    expect(sendPhotoMock).toHaveBeenCalledWith(
      321,
      'https://cdn.fibroadenoma.test/news-preview.jpg',
      expect.any(Object)
    );
  });

  it('keeps multibyte callback data within the truncated id limit', async () => {
    const notifications = await loadModule();
    const emojiId = '😀'.repeat(20);

    await notifications.notifyAdminAboutDraft(emojiId, {
      title: 'Emoji Id',
      shortDescription: 'Short',
      fullDescription: 'Full',
    });

    const [, , options] = sendMessageMock.mock.calls[0];
    const keyboard = (options as { reply_markup: { inline_keyboard: Array<Array<{ callback_data?: string }>> } }).reply_markup;

    expect(keyboard.inline_keyboard[0][0].callback_data).toBe(`p:${emojiId.substring(0, 20)}`);
    expect(keyboard.inline_keyboard[0][1].callback_data).toBe(`r:${emojiId.substring(0, 20)}`);
  });

  it('falls back to a simple draft message when loading preview data fails', async () => {
    const notifications = await loadModule();
    connectMock.mockRejectedValueOnce(new Error('db offline'));

    await notifications.notifyAdminAboutDraft('news-fallback', {
      title: 'Fallback Title',
      shortDescription: 'Short',
      fullDescription: 'Full',
    });

    expect(sendMessageMock).toHaveBeenCalledWith(
      321,
      expect.stringContaining('Просмотреть: https://fibroadenoma.test/news/news-fallback')
    );
  });

  it('does not throw when the simple fallback draft message also fails', async () => {
    const notifications = await loadModule();
    connectMock.mockRejectedValueOnce(new Error('db offline'));
    sendMessageMock.mockRejectedValueOnce(new Error('telegram down'));

    await expect(notifications.notifyAdminAboutDraft('news-failure', {
      title: 'Fallback Failure',
      shortDescription: 'Short',
      fullDescription: 'Full',
    })).resolves.toBeUndefined();
  });

  it('sends publish and rejection confirmations', async () => {
    const notifications = await loadModule();

    await notifications.notifyPublishConfirmation('news-publish');
    await notifications.notifyRejection('news-reject');

    expect(sendMessageMock).toHaveBeenNthCalledWith(
      1,
      321,
      expect.stringContaining('news-publish'),
      { parse_mode: 'HTML' }
    );
    expect(sendMessageMock).toHaveBeenNthCalledWith(
      2,
      321,
      expect.stringContaining('news-reject'),
      { parse_mode: 'HTML' }
    );
  });

  it('skips confirmation notifications when admin chat id is invalid', async () => {
    const notifications = await loadModule({
      TELEGRAM_ADMIN_CHAT_ID: 'not-a-number',
    });

    await notifications.notifyPublishConfirmation('news-publish');
    await notifications.notifyRejection('news-reject');

    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('swallows telegram errors while sending confirmation notifications', async () => {
    const notifications = await loadModule();
    sendMessageMock.mockRejectedValueOnce(new Error('send failed'));
    sendMessageMock.mockRejectedValueOnce(new Error('send failed again'));

    await expect(notifications.notifyPublishConfirmation('news-publish')).resolves.toBeUndefined();
    await expect(notifications.notifyRejection('news-reject')).resolves.toBeUndefined();
  });

  it('formats form submission notifications and escapes HTML', async () => {
    const notifications = await loadModule();

    await notifications.notifyAdminAboutFormSubmission({
      formType: 'conference_registration',
      name: 'Иван <script>',
      email: 'ivan@test.com',
      phone: '+7 900 000 00 00',
      message: 'Интересует <b>участие</b>',
      city: 'Москва',
      institution: 'Клиника',
      pageUrl: 'https://fibroadenoma.test/forms',
      metadata: {
        conference: 'Весенний конгресс',
        certificate: true,
      },
    });

    expect(sendMessageMock).toHaveBeenCalledWith(
      321,
      expect.stringContaining('&lt;script&gt;'),
      { parse_mode: 'HTML' }
    );
  });

  it.each([
    ['contact', 'Форма обратной связи'],
    ['cp', 'Запрос коммерческого предложения'],
    ['training', 'Заявка на обучение'],
    ['other', 'Новая заявка'],
  ])('formats %s form submissions with the correct label', async (formType, label) => {
    const notifications = await loadModule();

    await notifications.notifyAdminAboutFormSubmission({
      formType,
      name: 'Иван',
      email: 'ivan@test.com',
      phone: '+7 900 000 00 00',
      message: 'M'.repeat(240),
      metadata: { certificate: false },
    });

    expect(sendMessageMock).toHaveBeenCalledWith(
      321,
      expect.stringContaining(label),
      { parse_mode: 'HTML' }
    );
    expect(sendMessageMock.mock.calls[0][1]).toContain('...');
    expect(sendMessageMock.mock.calls[0][1]).toContain('Нет');
  });

  it('swallows form notification errors from telegram', async () => {
    const notifications = await loadModule();
    sendMessageMock.mockRejectedValueOnce(new Error('send failed'));

    await expect(notifications.notifyAdminAboutFormSubmission({
      formType: 'contact',
      name: 'Иван',
      email: 'ivan@test.com',
      phone: '+7 900 000 00 00',
    })).resolves.toBeUndefined();
  });

  it('sends error notifications with stack and context', async () => {
    const notifications = await loadModule();

    await notifications.notifyAdminAboutError(
      new Error('Broken <tag>'),
      {
        location: 'src/app/api/test',
        requestUrl: 'https://fibroadenoma.test/api/test',
        requestMethod: 'POST',
        userId: 'user-42',
        additionalInfo: {
          payload: { status: 'draft' },
          longText: 'X'.repeat(150),
        },
      }
    );

    expect(sendMessageMock).toHaveBeenCalledWith(
      321,
      expect.stringContaining('Broken &lt;tag&gt;'),
      { parse_mode: 'HTML' }
    );
  });

  it('formats string errors without stack traces', async () => {
    const notifications = await loadModule();

    await notifications.notifyAdminAboutError('Plain <error>');

    expect(sendMessageMock).toHaveBeenCalledWith(
      321,
      expect.stringContaining('Plain &lt;error&gt;'),
      { parse_mode: 'HTML' }
    );
    expect(sendMessageMock.mock.calls[0][1]).not.toContain('<pre>');
  });

  it('swallows telegram failures while sending error notifications', async () => {
    const notifications = await loadModule();
    sendMessageMock.mockRejectedValueOnce(new Error('send failed'));

    await expect(notifications.notifyAdminAboutError(new Error('Boom'))).resolves.toBeUndefined();
  });
});
