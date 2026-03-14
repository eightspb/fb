import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockQuery,
  mockRelease,
  mockConnect,
} = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockConnect: vi.fn(),
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
  })),
}));

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 when database responds', async () => {
    mockConnect.mockResolvedValue({
      query: mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      release: mockRelease,
    });

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(data.status).toBe('ok');
    expect(data.checks).toEqual({ database: 'ok' });
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('returns sanitized 503 when database connection fails before query', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockConnect.mockRejectedValue(new Error('ECONNREFUSED: database is down'));

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(data.status).toBe('error');
    expect(data.checks).toEqual({ database: 'error' });
    expect(data.error).toBe('Service unavailable');
    expect(JSON.stringify(data)).not.toContain('ECONNREFUSED');
    expect(mockRelease).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
