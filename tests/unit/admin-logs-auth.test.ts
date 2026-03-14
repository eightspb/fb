import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetLogs = vi.fn();
const mockVerifyToken = vi.fn();
const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn().mockResolvedValue({
  query: mockQuery,
  release: mockRelease,
});

vi.mock('@/lib/logger', () => ({
  getLogs: (...args: unknown[]) => mockGetLogs(...args),
}));

vi.mock('@/lib/auth', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
  })),
}));

describe('pentest: admin logs auth', () => {
  beforeEach(() => {
    mockGetLogs.mockReset();
    mockVerifyToken.mockReset();
    mockQuery.mockReset();
    mockRelease.mockReset();
  });

  it('rejects GET /api/admin/logs without a session cookie', async () => {
    const { GET } = await import('@/app/api/admin/logs/route');
    const request = new NextRequest('http://localhost:3000/api/admin/logs');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('rejects GET /api/admin/logs when the cookie value is invalid', async () => {
    mockVerifyToken.mockResolvedValue(false);
    const { GET } = await import('@/app/api/admin/logs/route');
    const request = new NextRequest('http://localhost:3000/api/admin/logs', {
      headers: { cookie: 'admin-session=fake-token' },
    });
    const response = await GET(request);

    expect(mockVerifyToken).toHaveBeenCalledWith('fake-token');
    expect(response.status).toBe(401);
  });

  it('allows GET /api/admin/logs only with a valid verified token', async () => {
    mockVerifyToken.mockResolvedValue(true);
    mockGetLogs.mockResolvedValue({ logs: [], total: 0 });
    const { GET } = await import('@/app/api/admin/logs/route');
    const request = new NextRequest('http://localhost:3000/api/admin/logs?limit=10', {
      headers: { cookie: 'admin-session=valid-token' },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ logs: [], total: 0 });
  });

  it('rejects SSE log stream when the session cookie is invalid', async () => {
    mockVerifyToken.mockResolvedValue(false);
    const { GET } = await import('@/app/api/admin/logs/stream/route');
    const request = new NextRequest('http://localhost:3000/api/admin/logs/stream', {
      headers: { cookie: 'admin-session=fake-token' },
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('opens SSE log stream only with a verified token', async () => {
    mockVerifyToken.mockResolvedValue(true);
    const { GET } = await import('@/app/api/admin/logs/stream/route');
    const request = new NextRequest('http://localhost:3000/api/admin/logs/stream', {
      headers: { cookie: 'admin-session=valid-token' },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
  });
});
