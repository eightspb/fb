/**
 * Unit тесты для contact notes API routes
 * GET/POST: /api/admin/contacts/[id]/notes
 * PATCH/DELETE: /api/admin/contacts/[id]/notes/[noteId]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Моки ──

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

// Мок cookies + jose для verifyAdminSession
const mockCookieGet = vi.fn().mockReturnValue({ value: 'valid-token' });
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockCookieGet(...args),
  }),
}));

vi.mock('jose', () => ({
  jwtVerify: vi.fn().mockResolvedValue({ payload: { sub: 'admin' } }),
}));

// Мок embedding-utils
const mockIndexNoteEmbedding = vi.fn();
vi.mock('@/lib/embedding-utils', () => ({
  indexNoteEmbedding: (...args: unknown[]) => mockIndexNoteEmbedding(...args),
}));

// ── Хелперы ──

const CONTACT_ID = 'aaaaaaaa-1111-2222-3333-444444444444';
const NOTE_ID = 'bbbbbbbb-1111-2222-3333-444444444444';

function makeRequest(url: string, method: string, body?: unknown) {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: { 'content-type': 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(url, init);
}

function makeParams(id: string): { params: Promise<{ id: string }> };
function makeParams(id: string, noteId: string): { params: Promise<{ id: string; noteId: string }> };
function makeParams(id: string, noteId?: string) {
  if (noteId) return { params: Promise.resolve({ id, noteId }) };
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReset();
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease });
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockCookieGet.mockReturnValue({ value: 'valid-token' });
});

// ═══════════════════════════════════════════════════════
// GET /api/admin/contacts/[id]/notes
// ═══════════════════════════════════════════════════════

describe('GET /api/admin/contacts/[id]/notes', () => {
  let GET: (request: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('@/app/api/admin/contacts/[id]/notes/route');
    GET = mod.GET;
  });

  it('возвращает 401 без авторизации', async () => {
    mockCookieGet.mockReturnValue(undefined);
    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'GET');
    const res = await GET(req, makeParams(CONTACT_ID));
    expect(res.status).toBe(401);
  });

  it('возвращает заметки контакта', async () => {
    const notes = [
      { id: NOTE_ID, contact_id: CONTACT_ID, content: 'Note 1', pinned: true },
      { id: 'note-2', contact_id: CONTACT_ID, content: 'Note 2', pinned: false },
    ];
    mockQuery.mockResolvedValueOnce({ rows: notes, rowCount: 2 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'GET');
    const res = await GET(req, makeParams(CONTACT_ID));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notes).toEqual(notes);
    expect(data.notes).toHaveLength(2);
  });

  it('возвращает пустой массив если заметок нет', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'GET');
    const res = await GET(req, makeParams(CONTACT_ID));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notes).toEqual([]);
  });

  it('передаёт contact_id в SQL запрос', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'GET');
    await GET(req, makeParams(CONTACT_ID));

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE contact_id = $1'),
      [CONTACT_ID]
    );
  });
});

// ═══════════════════════════════════════════════════════
// POST /api/admin/contacts/[id]/notes
// ═══════════════════════════════════════════════════════

describe('POST /api/admin/contacts/[id]/notes', () => {
  let POST: (request: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('@/app/api/admin/contacts/[id]/notes/route');
    POST = mod.POST;
  });

  it('возвращает 401 без авторизации', async () => {
    mockCookieGet.mockReturnValue(undefined);
    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', { content: 'test' });
    const res = await POST(req, makeParams(CONTACT_ID));
    expect(res.status).toBe(401);
  });

  it('возвращает 400 если content пустой', async () => {
    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', { content: '' });
    const res = await POST(req, makeParams(CONTACT_ID));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('content');
  });

  it('возвращает 400 если content только пробелы', async () => {
    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', { content: '   ' });
    const res = await POST(req, makeParams(CONTACT_ID));
    expect(res.status).toBe(400);
  });

  it('возвращает 404 если контакт не существует', async () => {
    // contactCheck returns empty
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', { content: 'test note' });
    const res = await POST(req, makeParams(CONTACT_ID));
    expect(res.status).toBe(404);
  });

  it('создаёт заметку с валидными данными', async () => {
    const createdNote = { id: NOTE_ID, contact_id: CONTACT_ID, content: 'Test note', source: 'manual', pinned: false };
    // First query: contact check
    mockQuery.mockResolvedValueOnce({ rows: [{ id: CONTACT_ID }], rowCount: 1 });
    // Second query: INSERT
    mockQuery.mockResolvedValueOnce({ rows: [createdNote], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', {
      content: 'Test note',
      title: 'Title',
      source: 'manual',
    });
    const res = await POST(req, makeParams(CONTACT_ID));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe(NOTE_ID);
  });

  it('устанавливает source в manual по умолчанию', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: CONTACT_ID }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: NOTE_ID }], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', { content: 'test' });
    await POST(req, makeParams(CONTACT_ID));

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO contact_notes')
    );
    expect(insertCall).toBeDefined();
    // source param (4th value, index 3 in 0-based of params array)
    expect(insertCall![1][3]).toBe('manual');
  });

  it('принимает допустимые source значения', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: CONTACT_ID }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: NOTE_ID }], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', {
      content: 'test',
      source: 'ai_research',
    });
    await POST(req, makeParams(CONTACT_ID));

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO contact_notes')
    );
    expect(insertCall![1][3]).toBe('ai_research');
  });

  it('игнорирует невалидный source и ставит manual', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: CONTACT_ID }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: NOTE_ID }], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', {
      content: 'test',
      source: 'invalid_source',
    });
    await POST(req, makeParams(CONTACT_ID));

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO contact_notes')
    );
    expect(insertCall![1][3]).toBe('manual');
  });

  it('создаёт заметку с pinned: true', async () => {
    const createdNote = { id: NOTE_ID, contact_id: CONTACT_ID, content: 'Pinned note', source: 'manual', pinned: true };
    mockQuery.mockResolvedValueOnce({ rows: [{ id: CONTACT_ID }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [createdNote], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', {
      content: 'Pinned note',
      pinned: true,
    });
    const res = await POST(req, makeParams(CONTACT_ID));
    expect(res.status).toBe(201);

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO contact_notes')
    );
    expect(insertCall).toBeDefined();
    // pinned param (5th value, index 4 in 0-based of params array)
    expect(insertCall![1][4]).toBe(true);
  });

  it('создаёт заметку с metadata (JSONB)', async () => {
    const meta = { model: 'gpt-4', tokens: 1500 };
    const createdNote = { id: NOTE_ID, contact_id: CONTACT_ID, content: 'With meta', source: 'ai_research', pinned: false, metadata: meta };
    mockQuery.mockResolvedValueOnce({ rows: [{ id: CONTACT_ID }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [createdNote], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', {
      content: 'With meta',
      source: 'ai_research',
      metadata: meta,
    });
    const res = await POST(req, makeParams(CONTACT_ID));
    expect(res.status).toBe(201);

    const insertCall = mockQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO contact_notes')
    );
    expect(insertCall).toBeDefined();
    // metadata param (6th value, index 5 in 0-based of params array)
    expect(insertCall![1][5]).toEqual(meta);
  });

  it('вызывает indexNoteEmbedding после создания заметки', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: CONTACT_ID }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: NOTE_ID, content: 'test' }], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', { content: 'test' });
    await POST(req, makeParams(CONTACT_ID));

    expect(mockIndexNoteEmbedding).toHaveBeenCalledWith(NOTE_ID, 'test', CONTACT_ID);
  });
});

// ═══════════════════════════════════════════════════════
// PATCH /api/admin/contacts/[id]/notes/[noteId]
// ═══════════════════════════════════════════════════════

describe('PATCH /api/admin/contacts/[id]/notes/[noteId]', () => {
  let PATCH: (request: NextRequest, context: { params: Promise<{ id: string; noteId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('@/app/api/admin/contacts/[id]/notes/[noteId]/route');
    PATCH = mod.PATCH;
  });

  it('возвращает 401 без авторизации', async () => {
    mockCookieGet.mockReturnValue(undefined);
    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'PATCH', { content: 'upd' });
    const res = await PATCH(req, makeParams(CONTACT_ID, NOTE_ID));
    expect(res.status).toBe(401);
  });

  it('возвращает 400 если нет допустимых полей', async () => {
    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'PATCH', { source: 'manual' });
    const res = await PATCH(req, makeParams(CONTACT_ID, NOTE_ID));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('No valid fields');
  });

  it('обновляет заметку', async () => {
    const updated = { id: NOTE_ID, content: 'Updated content', pinned: false };
    mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'PATCH', { content: 'Updated content' });
    const res = await PATCH(req, makeParams(CONTACT_ID, NOTE_ID));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toBe('Updated content');
  });

  it('возвращает 404 если заметка не найдена', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'PATCH', { content: 'test' });
    const res = await PATCH(req, makeParams(CONTACT_ID, NOTE_ID));
    expect(res.status).toBe(404);
  });

  it('обновляет только pinned (boolean toggle)', async () => {
    const updated = { id: NOTE_ID, content: 'Existing', pinned: true };
    mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'PATCH', { pinned: true });
    const res = await PATCH(req, makeParams(CONTACT_ID, NOTE_ID));
    expect(res.status).toBe(200);

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('pinned = $1');
    expect(sql).toContain('updated_at = NOW()');
    expect(mockQuery.mock.calls[0][1]).toContain(true);
  });

  it('обновляет несколько полей одновременно', async () => {
    const updated = { id: NOTE_ID, title: 'New title', content: 'New content', pinned: true };
    mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'PATCH', {
      title: 'New title',
      content: 'New content',
      pinned: true,
    });
    const res = await PATCH(req, makeParams(CONTACT_ID, NOTE_ID));
    expect(res.status).toBe(200);

    // Verify SQL has all 3 SET clauses
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('title = $1');
    expect(sql).toContain('content = $2');
    expect(sql).toContain('pinned = $3');
    expect(sql).toContain('updated_at = NOW()');
  });
});

// ═══════════════════════════════════════════════════════
// DELETE /api/admin/contacts/[id]/notes/[noteId]
// ═══════════════════════════════════════════════════════

describe('DELETE /api/admin/contacts/[id]/notes/[noteId]', () => {
  let DELETE: (request: NextRequest, context: { params: Promise<{ id: string; noteId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('@/app/api/admin/contacts/[id]/notes/[noteId]/route');
    DELETE = mod.DELETE;
  });

  it('возвращает 401 без авторизации', async () => {
    mockCookieGet.mockReturnValue(undefined);
    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'DELETE');
    const res = await DELETE(req, makeParams(CONTACT_ID, NOTE_ID));
    expect(res.status).toBe(401);
  });

  it('удаляет заметку и возвращает 204', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: NOTE_ID }], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'DELETE');
    const res = await DELETE(req, makeParams(CONTACT_ID, NOTE_ID));
    expect(res.status).toBe(204);
  });

  it('возвращает 404 если заметка не найдена', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'DELETE');
    const res = await DELETE(req, makeParams(CONTACT_ID, NOTE_ID));
    expect(res.status).toBe(404);
  });

  it('передаёт noteId и contact_id в SQL', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: NOTE_ID }], rowCount: 1 });

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'DELETE');
    await DELETE(req, makeParams(CONTACT_ID, NOTE_ID));

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM contact_notes WHERE id = $1 AND contact_id = $2'),
      [NOTE_ID, CONTACT_ID]
    );
  });
});

// ═══════════════════════════════════════════════════════
// Error handling: DB errors throw (Next.js returns 500)
// ═══════════════════════════════════════════════════════

describe('DB error handling', () => {
  it('GET выбрасывает ошибку при сбое БД', async () => {
    const { GET } = await import('@/app/api/admin/contacts/[id]/notes/route');
    mockConnect.mockRejectedValueOnce(new Error('Connection failed'));

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'GET');
    await expect(GET(req, makeParams(CONTACT_ID))).rejects.toThrow('Connection failed');
  });

  it('POST выбрасывает ошибку при сбое БД', async () => {
    const { POST } = await import('@/app/api/admin/contacts/[id]/notes/route');
    mockConnect.mockRejectedValueOnce(new Error('Connection failed'));

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes', 'POST', { content: 'test' });
    await expect(POST(req, makeParams(CONTACT_ID))).rejects.toThrow('Connection failed');
  });

  it('PATCH выбрасывает ошибку при сбое БД', async () => {
    const { PATCH } = await import('@/app/api/admin/contacts/[id]/notes/[noteId]/route');
    mockConnect.mockRejectedValueOnce(new Error('Connection failed'));

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'PATCH', { content: 'test' });
    await expect(PATCH(req, makeParams(CONTACT_ID, NOTE_ID))).rejects.toThrow('Connection failed');
  });

  it('DELETE выбрасывает ошибку при сбое БД', async () => {
    const { DELETE } = await import('@/app/api/admin/contacts/[id]/notes/[noteId]/route');
    mockConnect.mockRejectedValueOnce(new Error('Connection failed'));

    const req = makeRequest('http://localhost:3000/api/admin/contacts/1/notes/2', 'DELETE');
    await expect(DELETE(req, makeParams(CONTACT_ID, NOTE_ID))).rejects.toThrow('Connection failed');
  });
});
