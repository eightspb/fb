/**
 * Unit тесты для form API routes
 * Проверяет все формы: contact, request-cp, conferences/register, subscribe
 * Фокус: валидация, SQL type casts, вызов upsertContact, обработка ошибок
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Общие моки ──

const MOCK_CONTACT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

// Мок pg Pool и Client
const mockQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
const mockRelease = vi.fn();
const mockConnect = vi.fn().mockResolvedValue({
  query: mockQuery,
  release: mockRelease,
});

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
  })),
}));

// Мок upsertContact
const mockUpsertContact = vi.fn().mockResolvedValue(MOCK_CONTACT_ID);
vi.mock('@/lib/contact-upsert', () => ({
  upsertContact: (...args: unknown[]) => mockUpsertContact(...args),
}));

// Мок email
const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-msg-id' });
vi.mock('@/lib/email', () => ({
  createEmailTransporter: vi.fn(() => ({ sendMail: mockSendMail })),
  getSenderEmail: vi.fn(() => 'noreply@test.com'),
  getTargetEmail: vi.fn(() => 'admin@test.com'),
}));

// Мок sanitize
vi.mock('@/lib/sanitize', () => ({
  escapeHtml: vi.fn((s: string) => s),
}));

// Мок email-templates
vi.mock('@/lib/email-templates', () => ({
  getRenderedEmailTemplate: vi.fn().mockResolvedValue(null),
}));

// Мок telegram-notifications
const mockNotifySubmission = vi.fn().mockResolvedValue(undefined);
const mockNotifyError = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/telegram-notifications', () => ({
  notifyAdminAboutFormSubmission: (...args: unknown[]) => mockNotifySubmission(...args),
  notifyAdminAboutError: (...args: unknown[]) => mockNotifyError(...args),
}));

// Мок api-logger — passthrough
vi.mock('@/lib/api-logger', () => ({
  withApiLogging: <T extends (...args: any[]) => any>(_endpoint: string, handler: T) => handler,
}));

// Мок logger
vi.mock('@/lib/logger', () => ({
  log: vi.fn(),
}));

// Хелпер для создания NextRequest
function makeRequest(url: string, body: unknown, headers?: Record<string, string>) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockUpsertContact.mockResolvedValue(MOCK_CONTACT_ID);
  mockSendMail.mockResolvedValue({ messageId: 'test-msg-id' });
  process.env.SMTP_USER = 'test';
  process.env.SMTP_PASSWORD = 'test';
});

// ═══════════════════════════════════════════════════════
// /api/contact
// ═══════════════════════════════════════════════════════

describe('/api/contact', () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('@/app/api/contact/route');
    POST = mod.POST;
  });

  const validBody = {
    name: 'Иванов Иван',
    email: 'ivan@test.ru',
    phone: '+79001234567',
    message: 'Тестовое сообщение',
    consent: true,
  };

  it('возвращает 400 если не заполнены обязательные поля', async () => {
    const req = makeRequest('http://localhost:3000/api/contact', { name: '', email: '', phone: '', message: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('возвращает 400 если нет consent', async () => {
    const req = makeRequest('http://localhost:3000/api/contact', { ...validBody, consent: false });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('согласие');
  });

  it('возвращает 400 для невалидного email', async () => {
    const req = makeRequest('http://localhost:3000/api/contact', { ...validBody, email: 'not-email' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('email');
  });

  it('вызывает upsertContact с правильными параметрами', async () => {
    const req = makeRequest('http://localhost:3000/api/contact', validBody, { referer: 'https://example.com/contacts' });
    await POST(req);

    expect(mockUpsertContact).toHaveBeenCalledTimes(1);
    const args = mockUpsertContact.mock.calls[0];
    expect(args[1]).toMatchObject({
      fullName: 'Иванов Иван',
      email: 'ivan@test.ru',
      phone: '+79001234567',
      tag: 'form-contact',
    });
  });

  it('INSERT в form_submissions содержит $7::text и $8::uuid', async () => {
    const req = makeRequest('http://localhost:3000/api/contact', validBody);
    await POST(req);

    // Находим INSERT вызов (не от upsertContact, а прямой query)
    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO form_submissions')
    );
    expect(insertCall).toBeDefined();

    const sql = insertCall![0] as string;
    expect(sql).toContain('$7::text');
    expect(sql).toContain('$8::uuid');
  });

  it('INSERT передаёт правильные параметры', async () => {
    const req = makeRequest('http://localhost:3000/api/contact', validBody);
    await POST(req);

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO form_submissions')
    );
    const params = insertCall![1] as unknown[];
    expect(params[0]).toBe('contact');               // form_type
    expect(params[1]).toBe('Иванов Иван');            // name
    expect(params[2]).toBe('ivan@test.ru');            // email
    expect(params[3]).toBe('+79001234567');            // phone
    expect(params[4]).toBe('Тестовое сообщение');      // message
    expect(params[5]).toBe('new');                     // status
    expect(params[7]).toBe(MOCK_CONTACT_ID);           // contact_id
  });

  it('возвращает 200 при успехе', async () => {
    const req = makeRequest('http://localhost:3000/api/contact', validBody);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('возвращает 200 если автоответ пользователю отклонён, но письмо админу ушло', async () => {
    mockSendMail
      .mockResolvedValueOnce({ messageId: 'admin-msg-id' })
      .mockRejectedValueOnce(Object.assign(new Error('Recipient rejected'), {
        code: 'EENVELOPE',
        command: 'RCPT TO',
        response: '550 non-local recipient verification failed',
        responseCode: 550,
      }));

    const req = makeRequest('http://localhost:3000/api/contact', validBody);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    expect(mockNotifyError).toHaveBeenCalledTimes(1);
    expect(mockNotifyError.mock.calls[0][1]).toMatchObject({
      location: '/api/contact - user auto-reply',
    });
  });

  it('не шлёт telegram error для probe/test автоответа с envelope reject', async () => {
    mockSendMail
      .mockResolvedValueOnce({ messageId: 'admin-msg-id' })
      .mockRejectedValueOnce(Object.assign(new Error('Recipient rejected'), {
        code: 'EENVELOPE',
        command: 'RCPT TO',
        response: '550 non-local recipient verification failed',
        responseCode: 550,
      }));

    const req = makeRequest('http://localhost:3000/api/contact', {
      ...validBody,
      name: 'pentest',
      email: 'pentest@example.com',
      message: 'probe',
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockNotifyError).not.toHaveBeenCalled();
  });

  it('отправляет Telegram уведомление', async () => {
    const req = makeRequest('http://localhost:3000/api/contact', validBody);
    await POST(req);
    expect(mockNotifySubmission).toHaveBeenCalledTimes(1);
    expect(mockNotifySubmission.mock.calls[0][0]).toMatchObject({
      formType: 'contact',
      name: 'Иванов Иван',
    });
  });

  it('обрабатывает ошибку БД без падения', async () => {
    mockUpsertContact.mockRejectedValueOnce(new Error('DB connection failed'));
    const req = makeRequest('http://localhost:3000/api/contact', validBody);
    // Должен вернуть ошибку email (т.к. DB error логируется, но не прерывает flow в данном route)
    // или 500 если email тоже упал
    const res = await POST(req);
    // Route не возвращает ошибку при DB failure — продолжает отправлять email
    expect(res).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════
// /api/request-cp
// ═══════════════════════════════════════════════════════

describe('/api/request-cp', () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('@/app/api/request-cp/route');
    POST = mod.POST;
  });

  const validBody = {
    name: 'Петров Пётр',
    email: 'petrov@test.ru',
    phone: '+79009876543',
    city: 'Краснодар',
    institution: 'Клиника Б',
    formType: 'cp',
  };

  it('возвращает 500 если SMTP не настроен', async () => {
    delete process.env.SMTP_USER;
    const req = makeRequest('http://localhost:3000/api/request-cp', validBody);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('возвращает 400 если не заполнены обязательные поля', async () => {
    const req = makeRequest('http://localhost:3000/api/request-cp', { name: 'Test', email: '', phone: '', city: '', institution: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('вызывает upsertContact с tag form-cp', async () => {
    const req = makeRequest('http://localhost:3000/api/request-cp', validBody);
    await POST(req);

    expect(mockUpsertContact).toHaveBeenCalledTimes(1);
    expect(mockUpsertContact.mock.calls[0][1]).toMatchObject({
      fullName: 'Петров Пётр',
      email: 'petrov@test.ru',
      phone: '+79009876543',
      city: 'Краснодар',
      institution: 'Клиника Б',
      tag: 'form-cp',
    });
  });

  it('INSERT содержит $8::text, $9::jsonb, $10::uuid', async () => {
    const req = makeRequest('http://localhost:3000/api/request-cp', validBody);
    await POST(req);

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO form_submissions')
    );
    expect(insertCall).toBeDefined();

    const sql = insertCall![0] as string;
    expect(sql).toContain('$8::text');
    expect(sql).toContain('$9::jsonb');
    expect(sql).toContain('$10::uuid');
  });

  it('INSERT передаёт metadata как JSON строку', async () => {
    const req = makeRequest('http://localhost:3000/api/request-cp', validBody);
    await POST(req);

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO form_submissions')
    );
    const params = insertCall![1] as unknown[];
    expect(params[0]).toBe('cp');                      // form_type
    expect(params[1]).toBe('Петров Пётр');              // name
    expect(params[6]).toBe('new');                      // status
    const metadata = JSON.parse(params[8] as string);
    expect(metadata).toEqual({ city: 'Краснодар', institution: 'Клиника Б' });
    expect(params[9]).toBe(MOCK_CONTACT_ID);            // contact_id
  });

  it('поддерживает formType = training', async () => {
    const req = makeRequest('http://localhost:3000/api/request-cp', { ...validBody, formType: 'training' });
    await POST(req);

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO form_submissions')
    );
    const params = insertCall![1] as unknown[];
    expect(params[0]).toBe('training');
  });

  it('возвращает 200 при успехе', async () => {
    const req = makeRequest('http://localhost:3000/api/request-cp', validBody);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('отправляет Telegram уведомление', async () => {
    const req = makeRequest('http://localhost:3000/api/request-cp', validBody);
    await POST(req);
    expect(mockNotifySubmission).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════
// /api/conferences/register
// ═══════════════════════════════════════════════════════

describe('/api/conferences/register', () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('@/app/api/conferences/register/route');
    POST = mod.POST;
  });

  const validBody = {
    name: 'Сидоров Алексей',
    email: 'sidorov@test.ru',
    phone: '+79005551122',
    city: 'Москва',
    institution: 'РНЦХ',
    speciality: 'Онколог',
    consent: true,
    conference: 'Конференция SMS 2026',
  };

  it('возвращает 400 если не заполнены обязательные поля', async () => {
    const req = makeRequest('http://localhost:3000/api/conferences/register', {
      name: '', email: '', phone: '', city: '', institution: '', speciality: '', consent: true, conference: 'Test',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('возвращает 400 без consent', async () => {
    const req = makeRequest('http://localhost:3000/api/conferences/register', { ...validBody, consent: false });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('возвращает 400 для невалидного email', async () => {
    const req = makeRequest('http://localhost:3000/api/conferences/register', { ...validBody, email: 'bad' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('вызывает upsertContact с tag form-conference и speciality', async () => {
    const req = makeRequest('http://localhost:3000/api/conferences/register', validBody);
    await POST(req);

    expect(mockUpsertContact).toHaveBeenCalledTimes(1);
    expect(mockUpsertContact.mock.calls[0][1]).toMatchObject({
      fullName: 'Сидоров Алексей',
      email: 'sidorov@test.ru',
      phone: '+79005551122',
      city: 'Москва',
      institution: 'РНЦХ',
      speciality: 'Онколог',
      tag: 'form-conference',
    });
  });

  it('INSERT содержит $8::text, $9::jsonb, $10::uuid', async () => {
    const req = makeRequest('http://localhost:3000/api/conferences/register', validBody);
    await POST(req);

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO form_submissions')
    );
    expect(insertCall).toBeDefined();

    const sql = insertCall![0] as string;
    expect(sql).toContain('$8::text');
    expect(sql).toContain('$9::jsonb');
    expect(sql).toContain('$10::uuid');
  });

  it('INSERT передаёт metadata с conference и speciality', async () => {
    const req = makeRequest('http://localhost:3000/api/conferences/register', validBody);
    await POST(req);

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO form_submissions')
    );
    const params = insertCall![1] as unknown[];
    expect(params[0]).toBe('conference_registration');
    const metadata = JSON.parse(params[8] as string);
    expect(metadata).toEqual({ conference: 'Конференция SMS 2026', speciality: 'Онколог' });
    expect(params[9]).toBe(MOCK_CONTACT_ID);
  });

  it('возвращает 200 при успехе', async () => {
    const req = makeRequest('http://localhost:3000/api/conferences/register', validBody);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// /api/subscribe
// ═══════════════════════════════════════════════════════

describe('/api/subscribe', () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('@/app/api/subscribe/route');
    POST = mod.POST;
  });

  it('возвращает 400 если email пустой', async () => {
    const req = makeRequest('http://localhost:3000/api/subscribe', { email: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('возвращает 400 если email не строка', async () => {
    const req = makeRequest('http://localhost:3000/api/subscribe', { email: 123 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('возвращает 400 для невалидного email', async () => {
    const req = makeRequest('http://localhost:3000/api/subscribe', { email: 'not-an-email' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('вызывает upsertContact с tag newsletter', async () => {
    const req = makeRequest('http://localhost:3000/api/subscribe', { email: 'user@test.ru' });
    await POST(req);

    expect(mockUpsertContact).toHaveBeenCalledTimes(1);
    expect(mockUpsertContact.mock.calls[0][1]).toMatchObject({
      fullName: 'user@test.ru',
      email: 'user@test.ru',
      tag: 'newsletter',
    });
  });

  it('INSERT содержит $7::text и $8::uuid', async () => {
    const req = makeRequest('http://localhost:3000/api/subscribe', { email: 'user@test.ru' });
    await POST(req);

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO form_submissions')
    );
    expect(insertCall).toBeDefined();

    const sql = insertCall![0] as string;
    expect(sql).toContain('$7::text');
    expect(sql).toContain('$8::uuid');
  });

  it('INSERT передаёт правильные параметры', async () => {
    const req = makeRequest('http://localhost:3000/api/subscribe', { email: '  User@Test.RU  ' });
    await POST(req);

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO form_submissions')
    );
    const params = insertCall![1] as unknown[];
    expect(params[0]).toBe('newsletter');
    expect(params[1]).toBe('User@Test.RU'); // name = email trimmed
    expect(params[7]).toBe(MOCK_CONTACT_ID);
  });

  it('возвращает 200 при успехе', async () => {
    const req = makeRequest('http://localhost:3000/api/subscribe', { email: 'user@test.ru' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('возвращает 500 при ошибке БД', async () => {
    mockConnect.mockRejectedValueOnce(new Error('Connection failed'));
    const req = makeRequest('http://localhost:3000/api/subscribe', { email: 'user@test.ru' });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
