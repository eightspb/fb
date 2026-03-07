import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMessageMock = vi.hoisted(() => vi.fn());
const editMessageTextMock = vi.hoisted(() => vi.fn());
const answerCallbackQueryMock = vi.hoisted(() => vi.fn());
const setWebhookMock = vi.hoisted(() => vi.fn());

const queryMock = vi.hoisted(() => vi.fn());
const releaseMock = vi.hoisted(() => vi.fn());
const connectMock = vi.hoisted(() => vi.fn());

const downloadTelegramFileMock = vi.hoisted(() => vi.fn());
const saveMediaFileMock = vi.hoisted(() => vi.fn());
const generateNewsIdMock = vi.hoisted(() => vi.fn());
const getFileExtensionMock = vi.hoisted(() => vi.fn());
const extractLocationFromImageMock = vi.hoisted(() => vi.fn());
const extractDateFromImageMock = vi.hoisted(() => vi.fn());
const geocodeLocationMock = vi.hoisted(() => vi.fn());

const expandTextWithAIMock = vi.hoisted(() => vi.fn());
const transcribeAudioWithAIMock = vi.hoisted(() => vi.fn());
const notifyAdminAboutDraftMock = vi.hoisted(() => vi.fn());

const existsSyncMock = vi.hoisted(() => vi.fn());
const mkdirSyncMock = vi.hoisted(() => vi.fn());
const writeFileSyncMock = vi.hoisted(() => vi.fn());
const unlinkSyncMock = vi.hoisted(() => vi.fn());
const readFileSyncMock = vi.hoisted(() => vi.fn());

vi.mock('node-telegram-bot-api', () => ({
  default: vi.fn().mockImplementation(() => ({
    sendMessage: sendMessageMock,
    editMessageText: editMessageTextMock,
    answerCallbackQuery: answerCallbackQueryMock,
    setWebhook: setWebhookMock,
  })),
}));

vi.mock('../../src/lib/file-utils', () => ({
  downloadTelegramFile: downloadTelegramFileMock,
  saveMediaFile: saveMediaFileMock,
  generateNewsId: generateNewsIdMock,
  getFileExtension: getFileExtensionMock,
  extractLocationFromImage: extractLocationFromImageMock,
  extractDateFromImage: extractDateFromImageMock,
  geocodeLocation: geocodeLocationMock,
}));

vi.mock('../../src/lib/openrouter', () => ({
  expandTextWithAI: expandTextWithAIMock,
  transcribeAudioWithAI: transcribeAudioWithAIMock,
}));

vi.mock('../../src/lib/telegram-notifications', () => ({
  notifyAdminAboutDraft: notifyAdminAboutDraftMock,
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: connectMock,
    end: vi.fn(),
  })),
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  mkdirSync: mkdirSyncMock,
  writeFileSync: writeFileSyncMock,
  unlinkSync: unlinkSyncMock,
  readFileSync: readFileSyncMock,
}));

type PendingState = 'collecting' | 'generating' | 'preview' | 'publishing';

type PendingNews = {
  chatId: number;
  messageId: number;
  text?: string;
  images: Array<{ fileId: string; path?: string }>;
  videos: Array<{ fileId: string; path?: string }>;
  date: Date;
  startedAt: Date;
  voiceTranscriptions: string[];
  aiGenerated?: {
    title: string;
    shortDescription: string;
    fullDescription: string;
  };
  waitingForEdit?: 'title' | 'short' | 'full' | null;
  manualDate?: Date;
  manualLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  mediaGroupId?: string;
  mediaGroupTimeout?: NodeJS.Timeout;
  exifDate?: Date;
  exifLocation?: { latitude: number; longitude: number };
  state: PendingState;
  isProcessing?: boolean;
};

function makePending(overrides: Partial<PendingNews> = {}): PendingNews {
  return {
    chatId: 123,
    messageId: 1,
    text: 'Исходный текст',
    images: [],
    videos: [],
    date: new Date('2026-03-05T10:00:00Z'),
    startedAt: new Date('2026-03-05T10:00:00Z'),
    voiceTranscriptions: [],
    state: 'collecting',
    ...overrides,
  };
}

async function loadBotModule() {
  vi.resetModules();
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:54322/postgres';
  return import('../../src/lib/telegram-bot');
}

describe('telegram-bot workflows', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

    sendMessageMock.mockResolvedValue({});
    editMessageTextMock.mockResolvedValue({});
    answerCallbackQueryMock.mockResolvedValue({});
    setWebhookMock.mockResolvedValue({});

    queryMock.mockResolvedValue({ rows: [] });
    releaseMock.mockReturnValue(undefined);
    connectMock.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });

    downloadTelegramFileMock.mockResolvedValue(Buffer.from('binary-file'));
    saveMediaFileMock.mockImplementation((_buffer: Buffer, filename: string) => `/uploads/${filename}`);
    generateNewsIdMock.mockReturnValue('news-2026-03-05');
    getFileExtensionMock.mockImplementation((_name: string, mimeType: string) => (
      mimeType.includes('video') ? '.mp4' : '.jpg'
    ));
    extractLocationFromImageMock.mockResolvedValue(null);
    extractDateFromImageMock.mockResolvedValue(null);
    geocodeLocationMock.mockResolvedValue({
      latitude: 55.751244,
      longitude: 37.618423,
      address: 'Москва, Тверская улица, 1',
    });

    expandTextWithAIMock.mockResolvedValue({
      title: 'AI Title',
      shortDescription: 'AI Short Description',
      fullDescription: 'AI Full Description',
    });
    transcribeAudioWithAIMock.mockResolvedValue('Распознанный голосовой текст');
    notifyAdminAboutDraftMock.mockResolvedValue(undefined);

    existsSyncMock.mockReturnValue(false);
    mkdirSyncMock.mockReturnValue(undefined);
    writeFileSyncMock.mockReturnValue(undefined);
    unlinkSyncMock.mockReturnValue(undefined);
    readFileSyncMock.mockReturnValue(Buffer.from('image-data'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a new draft from a text message', async () => {
    const botModule = await loadBotModule();

    await botModule.handleTextMessage({
      chat: { id: 123 },
      text: 'Первый абзац новости',
      message_id: 10,
    } as never);

    const pending = botModule.pendingNews.get(123);
    expect(pending?.text).toBe('Первый абзац новости');
    expect(pending?.state).toBe('collecting');
    expect(sendMessageMock).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Начата новая новость'),
      expect.any(Object)
    );
  });

  it('appends text in preview mode and suggests regeneration', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      aiGenerated: {
        title: 'AI Title',
        shortDescription: 'Short',
        fullDescription: 'Full',
      },
    }));

    await botModule.handleTextMessage({
      chat: { id: 123 },
      text: 'Дополнение к новости',
      message_id: 11,
    } as never);

    expect(botModule.pendingNews.get(123)?.text).toContain('Дополнение к новости');
    expect(sendMessageMock).toHaveBeenLastCalledWith(
      123,
      expect.stringContaining('Перегенерировать'),
      expect.any(Object)
    );
  });

  it('blocks text handling while AI is generating', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'generating' }));

    await botModule.handleTextMessage({
      chat: { id: 123 },
      text: 'Новый текст',
      message_id: 99,
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Идёт генерация AI'));
  });

  it('blocks text handling while publishing is in progress', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'publishing' }));

    await botModule.handleTextMessage({
      chat: { id: 123 },
      text: 'Новый текст',
      message_id: 100,
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Идёт публикация'));
  });

  it('buffers a photo media group and sends a summary after timeout', async () => {
    vi.useFakeTimers();
    const botModule = await loadBotModule();

    await botModule.handlePhotoMessage({
      chat: { id: 123 },
      caption: 'Фотоотчет',
      message_id: 12,
      media_group_id: 'group-1',
      photo: [
        { file_id: 'small' },
        { file_id: 'large' },
      ],
    } as never);

    expect(botModule.pendingNews.get(123)?.images).toHaveLength(1);
    expect(sendMessageMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);

    expect(sendMessageMock).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Группа фото добавлена'),
      expect.any(Object)
    );
  });

  it('ignores photo messages without attachments', async () => {
    const botModule = await loadBotModule();

    await botModule.handlePhotoMessage({
      chat: { id: 123 },
      message_id: 15,
      photo: [],
    } as never);

    expect(botModule.pendingNews.size).toBe(0);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('blocks photo upload while generating', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'generating' }));

    await botModule.handlePhotoMessage({
      chat: { id: 123 },
      message_id: 16,
      photo: [{ file_id: 'img' }],
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Идёт генерация AI'));
  });

  it('adds a video in preview mode', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      videos: [],
      aiGenerated: {
        title: 'AI Title',
        shortDescription: 'Short',
        fullDescription: 'Full',
      },
    }));

    await botModule.handleVideoMessage({
      chat: { id: 123 },
      caption: 'Новое видео',
      message_id: 13,
      video: { file_id: 'video-1' },
    } as never);

    expect(botModule.pendingNews.get(123)?.videos).toEqual([{ fileId: 'video-1' }]);
    expect(sendMessageMock).toHaveBeenLastCalledWith(
      123,
      expect.stringContaining('Перегенерировать'),
      expect.any(Object)
    );
  });

  it('ignores video messages without a video payload', async () => {
    const botModule = await loadBotModule();

    await botModule.handleVideoMessage({
      chat: { id: 123 },
      message_id: 17,
    } as never);

    expect(botModule.pendingNews.size).toBe(0);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('blocks video upload while publishing', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'publishing' }));

    await botModule.handleVideoMessage({
      chat: { id: 123 },
      message_id: 18,
      video: { file_id: 'video-busy' },
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Идёт публикация'));
  });

  it('transcribes a voice message into a new draft', async () => {
    const botModule = await loadBotModule();

    await botModule.handleVoiceMessage({
      chat: { id: 123 },
      message_id: 14,
      voice: { file_id: 'voice-1', duration: 9 },
    } as never);

    const pending = botModule.pendingNews.get(123);
    expect(downloadTelegramFileMock).toHaveBeenCalledWith('voice-1', 'test-bot-token');
    expect(transcribeAudioWithAIMock).toHaveBeenCalled();
    expect(pending?.voiceTranscriptions).toEqual(['Распознанный голосовой текст']);
    expect(pending?.isProcessing).toBe(false);
    expect(sendMessageMock).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Текст распознан'),
      expect.any(Object)
    );
  });

  it('ignores voice messages without payload', async () => {
    const botModule = await loadBotModule();

    await botModule.handleVoiceMessage({
      chat: { id: 123 },
      message_id: 19,
    } as never);

    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('queues a voice message when another one is still processing', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      isProcessing: true,
      state: 'collecting',
    }));

    await botModule.handleVoiceMessage({
      chat: { id: 123 },
      message_id: 20,
      voice: { file_id: 'voice-busy', duration: 3 },
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Обрабатываю предыдущее сообщение'));
  });

  it('shows an AI preview with truncated description', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      aiGenerated: {
        title: 'AI Title',
        shortDescription: 'AI Short',
        fullDescription: 'X'.repeat(350),
      },
    }));

    await botModule.showAIPreview(123);

    expect(sendMessageMock).toHaveBeenCalledWith(
      123,
      expect.stringContaining('AI подготовил новость'),
      expect.objectContaining({ parse_mode: 'HTML' })
    );
  });

  it('reports missing AI preview data', async () => {
    const botModule = await loadBotModule();

    await botModule.showAIPreview(123);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Нет данных для предпросмотра.'));
  });

  it('finishes news creation and generates preview content', async () => {
    const botModule = await loadBotModule();
    extractDateFromImageMock.mockResolvedValueOnce(new Date('2026-03-04T00:00:00Z'));
    extractLocationFromImageMock.mockResolvedValueOnce({
      latitude: 59.93428,
      longitude: 30.335099,
    });

    botModule.pendingNews.set(123, makePending({
      text: 'Итоговый текст',
      images: [{ fileId: 'img-1' }],
      videos: [{ fileId: 'vid-1' }],
      voiceTranscriptions: ['Голосовая заметка'],
      state: 'collecting',
    }));

    await botModule.finishNewsCreation(123);

    const pending = botModule.pendingNews.get(123);
    expect(expandTextWithAIMock).toHaveBeenCalledWith(
      expect.stringContaining('Голосовая заметка'),
      expect.objectContaining({
        imagesCount: 1,
        videosCount: 1,
        isFromVoice: true,
      })
    );
    expect(pending?.state).toBe('preview');
    expect(pending?.aiGenerated?.title).toBe('AI Title');
    expect(pending?.images[0]?.path).toContain('/uploads/image_');
    expect(pending?.videos[0]?.path).toContain('/uploads/video_');
  });

  it('rejects finishing when there is no active draft', async () => {
    const botModule = await loadBotModule();

    await botModule.finishNewsCreation(123);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Нет активной новости для завершения.'));
  });

  it('rejects finishing an empty draft', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      text: '',
      images: [],
      videos: [],
    }));

    await botModule.finishNewsCreation(123);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Новость пуста'));
  });

  it('prevents duplicate finish requests during generation', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'generating' }));

    await botModule.finishNewsCreation(123);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Генерация уже идёт'));
  });

  it('publishes a preview draft into the database and notifies admin', async () => {
    const botModule = await loadBotModule();
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'image-row-1' }] })
      .mockResolvedValueOnce({ rows: [] });

    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      aiGenerated: {
        title: 'Опубликованный заголовок',
        shortDescription: 'Короткое описание для админа',
        fullDescription: 'Полный текст новости',
      },
      manualDate: new Date('2026-03-06T00:00:00Z'),
      manualLocation: {
        latitude: 55.75,
        longitude: 37.61,
      },
      images: [{ fileId: 'img-2' }],
      videos: [{ fileId: 'vid-2' }],
    }));

    await botModule.publishNewsFromPreview(123);

    expect(generateNewsIdMock).toHaveBeenCalledWith(
      'Опубликованный заголовок',
      new Date('2026-03-06T00:00:00Z')
    );
    expect(queryMock).toHaveBeenCalled();
    expect(notifyAdminAboutDraftMock).toHaveBeenCalledWith(
      'news-2026-03-05',
      expect.objectContaining({ title: 'Опубликованный заголовок' }),
      1
    );
    expect(botModule.pendingNews.has(123)).toBe(false);
    expect(sendMessageMock).toHaveBeenLastCalledWith(
      123,
      expect.stringContaining('Новость создана как черновик')
    );
  });

  it('refuses to publish when preview data is missing', async () => {
    const botModule = await loadBotModule();

    await botModule.publishNewsFromPreview(123);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Нет данных для публикации.'));
  });

  it('prevents duplicate publish requests', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      state: 'publishing',
      aiGenerated: {
        title: 'Title',
        shortDescription: 'Short',
        fullDescription: 'Full',
      },
    }));

    await botModule.publishNewsFromPreview(123);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Публикация уже идёт'));
  });

  it('warns when a generated news id already exists', async () => {
    const botModule = await loadBotModule();
    queryMock.mockResolvedValueOnce({ rows: [{ id: 'news-2026-03-05' }] });
    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      aiGenerated: {
        title: 'Опубликованный заголовок',
        shortDescription: 'Short',
        fullDescription: 'Full',
      },
    }));

    await botModule.publishNewsFromPreview(123);

    expect(botModule.pendingNews.get(123)?.state).toBe('preview');
    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('уже существует'));
  });

  it('validates and stores a manual date', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending());

    await botModule.handleDateCommand({
      chat: { id: 123 },
      text: '/date 15.02.2026',
    } as never);

    expect(botModule.pendingNews.get(123)?.manualDate?.toLocaleDateString('ru-RU')).toBe('15.02.2026');
    expect(sendMessageMock).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Дата мероприятия установлена')
    );
  });

  it('rejects invalid /date command formats', async () => {
    const botModule = await loadBotModule();

    await botModule.handleDateCommand({
      chat: { id: 123 },
      text: '/date tomorrow',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Неверный формат даты'));
  });

  it('rejects impossible /date values', async () => {
    const botModule = await loadBotModule();

    await botModule.handleDateCommand({
      chat: { id: 123 },
      text: '/date 31.02.2026',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Некорректная дата'));
  });

  it('requires an active draft for /date', async () => {
    const botModule = await loadBotModule();

    await botModule.handleDateCommand({
      chat: { id: 123 },
      text: '/date 15.02.2026',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Нет активной новости'));
  });

  it('blocks /date while generating', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'generating' }));

    await botModule.handleDateCommand({
      chat: { id: 123 },
      text: '/date 15.02.2026',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Идёт генерация AI'));
  });

  it('blocks /date in preview mode', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'preview' }));

    await botModule.handleDateCommand({
      chat: { id: 123 },
      text: '/date 15.02.2026',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('уже сгенерирована'));
  });

  it('blocks /date while publishing', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'publishing' }));

    await botModule.handleDateCommand({
      chat: { id: 123 },
      text: '/date 15.02.2026',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Идёт публикация'));
  });

  it('stores manual coordinates from /location', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending());

    await botModule.handleLocationCommand({
      chat: { id: 123 },
      text: '/location 55.751244,37.618423',
    } as never);

    expect(botModule.pendingNews.get(123)?.manualLocation).toEqual({
      latitude: 55.751244,
      longitude: 37.618423,
    });
    expect(sendMessageMock).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Локация установлена')
    );
  });

  it('requires a location value after /location', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending());

    await botModule.handleLocationCommand({
      chat: { id: 123 },
      text: '/location ',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Укажите локацию'));
  });

  it('requires an active draft for /location', async () => {
    const botModule = await loadBotModule();

    await botModule.handleLocationCommand({
      chat: { id: 123 },
      text: '/location 55.75,37.61',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Нет активной новости'));
  });

  it('rejects invalid coordinates in /location', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending());

    await botModule.handleLocationCommand({
      chat: { id: 123 },
      text: '/location 120,500',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Некорректные координаты'));
  });

  it('blocks /location while generating', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'generating' }));

    await botModule.handleLocationCommand({
      chat: { id: 123 },
      text: '/location 55.75,37.61',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Идёт генерация AI'));
  });

  it('blocks /location in preview mode', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'preview' }));

    await botModule.handleLocationCommand({
      chat: { id: 123 },
      text: '/location 55.75,37.61',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('уже сгенерирована'));
  });

  it('blocks /location while publishing', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'publishing' }));

    await botModule.handleLocationCommand({
      chat: { id: 123 },
      text: '/location 55.75,37.61',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Идёт публикация'));
  });

  it('reports geocoding failures in /location', async () => {
    const botModule = await loadBotModule();
    geocodeLocationMock.mockResolvedValueOnce(null);
    botModule.pendingNews.set(123, makePending());

    await botModule.handleLocationCommand({
      chat: { id: 123 },
      text: '/location Неизвестный адрес',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Не удалось найти координаты'));
  });

  it('handles unexpected geocoding errors', async () => {
    const botModule = await loadBotModule();
    geocodeLocationMock.mockRejectedValueOnce(new Error('geo failed'));
    botModule.pendingNews.set(123, makePending());

    await botModule.handleLocationCommand({
      chat: { id: 123 },
      text: '/location Москва',
    } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Произошла ошибка при обработке локации'));
  });

  it('geocodes an address from /location', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending());

    await botModule.handleLocationCommand({
      chat: { id: 123 },
      text: '/location Москва, Тверская улица 1',
    } as never);

    expect(geocodeLocationMock).toHaveBeenCalledWith('Москва, Тверская улица 1');
    expect(botModule.pendingNews.get(123)?.manualLocation?.address).toBe('Москва, Тверская улица, 1');
  });

  it('reports the current preview status', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      images: [{ fileId: 'img-1', path: '/uploads/a.jpg' }],
      videos: [{ fileId: 'vid-1', path: '/uploads/a.mp4' }],
      voiceTranscriptions: ['voice'],
      manualDate: new Date('2026-03-01T00:00:00Z'),
      manualLocation: {
        latitude: 55.75,
        longitude: 37.61,
      },
      aiGenerated: {
        title: 'Preview title',
        shortDescription: 'Short',
        fullDescription: 'Full',
      },
    }));

    await botModule.handleStatusCommand({ chat: { id: 123 } } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Preview title'),
      expect.any(Object)
    );
  });

  it('reports when no status session exists', async () => {
    const botModule = await loadBotModule();

    await botModule.handleStatusCommand({ chat: { id: 123 } } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Нет активной новости'));
  });

  it('reports collecting status with action buttons', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      state: 'collecting',
      images: [{ fileId: 'img' }],
    }));

    await botModule.handleStatusCommand({ chat: { id: 123 } } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Сбор материалов'),
      expect.objectContaining({ reply_markup: expect.any(Object) })
    );
  });

  it('resets a preview session', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'preview' }));

    await botModule.handleResetCommand({ chat: { id: 123 } } as never);

    expect(botModule.pendingNews.has(123)).toBe(false);
    expect(sendMessageMock).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Сессия сброшена')
    );
  });

  it('refuses to reset when nothing is active', async () => {
    const botModule = await loadBotModule();

    await botModule.handleResetCommand({ chat: { id: 123 } } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Нет активной новости для сброса.'));
  });

  it('blocks reset while generation is running', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'generating' }));

    await botModule.handleResetCommand({ chat: { id: 123 } } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Сейчас идёт генерация AI'));
  });

  it('blocks reset while publishing is running', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'publishing' }));

    await botModule.handleResetCommand({ chat: { id: 123 } } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Сейчас идёт публикация'));
  });

  it('loads news from the database and normalizes status', async () => {
    const botModule = await loadBotModule();
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 'n1', title: 'Первая', date: '01.03.2026', status: null },
        { id: 'n2', title: 'Вторая', date: '02.03.2026', status: 'draft' },
      ],
    });

    const result = await botModule.getAllNewsFromDB();

    expect(result).toEqual([
      { id: 'n1', title: 'Первая', date: '01.03.2026', status: 'published' },
      { id: 'n2', title: 'Вторая', date: '02.03.2026', status: 'draft' },
    ]);
    expect(releaseMock).toHaveBeenCalled();
  });

  it('handles an empty news list response', async () => {
    const botModule = await loadBotModule();
    queryMock.mockResolvedValueOnce({ rows: [] });

    await botModule.handleListCommand({ chat: { id: 123 } } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, '⏳ Загружаю список новостей...');
    expect(sendMessageMock).toHaveBeenCalledWith(123, '📭 Новостей не найдено.');
  });

  it('reports list loading failures', async () => {
    const botModule = await loadBotModule();
    queryMock.mockRejectedValueOnce(new Error('db down'));

    await botModule.handleListCommand({ chat: { id: 123 } } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, '⏳ Загружаю список новостей...');
    expect(sendMessageMock).toHaveBeenCalledWith(123, '❌ Произошла ошибка при загрузке списка новостей.');
  });

  it('falls back to sendMessage when list edit fails', async () => {
    const botModule = await loadBotModule();
    editMessageTextMock.mockRejectedValueOnce(new Error('edit failed'));

    await botModule.sendNewsListPage(
      123,
      [
        {
          id: 'news-1',
          title: 'Очень длинный заголовок новости для списка и пагинации',
          date: '01.03.2026',
          status: 'draft',
        },
      ],
      0,
      2,
      777
    );

    expect(editMessageTextMock).toHaveBeenCalled();
    expect(sendMessageMock).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Список новостей'),
      expect.any(Object)
    );
  });

  it('updates a field being edited and shows the preview again', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      waitingForEdit: 'title',
      aiGenerated: {
        title: 'Старый заголовок',
        shortDescription: 'Short',
        fullDescription: 'Full',
      },
    }));

    await botModule.handleEditFieldText(123, 'Новый заголовок');

    expect(botModule.pendingNews.get(123)?.aiGenerated?.title).toBe('Новый заголовок');
    expect(botModule.pendingNews.get(123)?.waitingForEdit).toBeNull();
    expect(sendMessageMock).toHaveBeenCalledWith(123, '✅ Название обновлено!');
  });

  it('reports missing edit context', async () => {
    const botModule = await loadBotModule();

    await botModule.handleEditFieldText(123, 'Текст');

    expect(sendMessageMock).toHaveBeenCalledWith(123, '❌ Нет активного редактирования.');
  });

  it('updates short and full descriptions during editing', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      waitingForEdit: 'short',
      aiGenerated: {
        title: 'Title',
        shortDescription: 'Old short',
        fullDescription: 'Old full',
      },
    }));

    await botModule.handleEditFieldText(123, 'New short');
    botModule.pendingNews.get(123)!.waitingForEdit = 'full';
    await botModule.handleEditFieldText(123, 'New full');

    expect(botModule.pendingNews.get(123)?.aiGenerated?.shortDescription).toBe('New short');
    expect(botModule.pendingNews.get(123)?.aiGenerated?.fullDescription).toBe('New full');
  });

  it('regenerates AI content with newly added media', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      text: 'Новый текст',
      voiceTranscriptions: ['Транскрипт'],
      images: [{ fileId: 'img-new' }],
      videos: [{ fileId: 'vid-new' }],
      aiGenerated: {
        title: 'Старый AI',
        shortDescription: 'Short',
        fullDescription: 'Full',
      },
    }));

    await botModule.regenerateAIContent(123);

    const pending = botModule.pendingNews.get(123);
    expect(expandTextWithAIMock).toHaveBeenCalled();
    expect(pending?.state).toBe('preview');
    expect(pending?.isProcessing).toBe(false);
    expect(pending?.aiGenerated?.title).toBe('AI Title');
  });

  it('requires an active preview before regeneration', async () => {
    const botModule = await loadBotModule();

    await botModule.regenerateAIContent(123);

    expect(sendMessageMock).toHaveBeenCalledWith(123, '❌ Нет активной новости.');
  });

  it('blocks regeneration outside preview state', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'collecting' }));

    await botModule.regenerateAIContent(123);

    expect(sendMessageMock).toHaveBeenCalledWith(123, '❌ Перегенерация доступна только на этапе предпросмотра.');
  });

  it('blocks regeneration when another operation is in progress', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      isProcessing: true,
      aiGenerated: {
        title: 'Title',
        shortDescription: 'Short',
        fullDescription: 'Full',
      },
    }));

    await botModule.regenerateAIContent(123);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Обрабатывается предыдущее сообщение'));
  });

  it('returns the session to preview when regeneration fails', async () => {
    const botModule = await loadBotModule();
    expandTextWithAIMock.mockRejectedValueOnce(new Error('ai failed'));
    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      aiGenerated: {
        title: 'Title',
        shortDescription: 'Short',
        fullDescription: 'Full',
      },
    }));

    await botModule.regenerateAIContent(123);

    expect(botModule.pendingNews.get(123)?.state).toBe('preview');
    expect(botModule.pendingNews.get(123)?.isProcessing).toBe(false);
    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Произошла ошибка при перегенерации'));
  });

  it('regenerates with default text when draft has no text yet', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({
      state: 'preview',
      text: '',
      voiceTranscriptions: [],
      aiGenerated: {
        title: 'Title',
        shortDescription: 'Short',
        fullDescription: 'Full',
      },
    }));

    await botModule.regenerateAIContent(123);

    expect(expandTextWithAIMock).toHaveBeenCalledWith(
      'Новое событие',
      expect.objectContaining({ isFromVoice: false })
    );
  });

  it('cancels a draft and blocks cancel during busy states', async () => {
    const botModule = await loadBotModule();
    botModule.pendingNews.set(123, makePending({ state: 'generating' }));
    await botModule.handleCancelCommand({ chat: { id: 123 } } as never);

    botModule.pendingNews.set(123, makePending({ state: 'publishing' }));
    await botModule.handleCancelCommand({ chat: { id: 123 } } as never);

    botModule.pendingNews.set(123, makePending({ state: 'collecting' }));
    await botModule.handleCancelCommand({ chat: { id: 123 } } as never);

    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Идёт генерация AI'));
    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Идёт публикация'));
    expect(sendMessageMock).toHaveBeenCalledWith(123, expect.stringContaining('Создание новости отменено.'));
  });

  it('renders action menus for both draft and published news', async () => {
    const botModule = await loadBotModule();

    await botModule.sendNewsActionsMenu(123, 'draft-news-id', 'Черновик новости', 'draft');
    await botModule.sendNewsActionsMenu(123, 'published-news-id', 'Опубликованная новость', 'published');

    expect(sendMessageMock).toHaveBeenNthCalledWith(
      1,
      123,
      expect.stringContaining('Черновик новости'),
      expect.any(Object)
    );
    expect(sendMessageMock).toHaveBeenNthCalledWith(
      2,
      123,
      expect.stringContaining('Опубликованная новость'),
      expect.any(Object)
    );
  });
});
