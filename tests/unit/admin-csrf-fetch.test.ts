import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCsrfTokenMock,
  refreshCsrfTokenMock,
  getBasePathMock,
} = vi.hoisted(() => ({
  getCsrfTokenMock: vi.fn(),
  refreshCsrfTokenMock: vi.fn(),
  getBasePathMock: vi.fn(),
}));

vi.mock('../../apps/admin/src/lib/csrf-client', () => ({
  getCsrfToken: getCsrfTokenMock,
  refreshCsrfToken: refreshCsrfTokenMock,
  getBasePath: getBasePathMock,
}));

import { adminCsrfFetch } from '../../apps/admin/src/lib/admin-csrf-fetch';

function createJsonResponse(
  status: number,
  body: Record<string, unknown> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apps/admin/src/lib/admin-csrf-fetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getCsrfTokenMock.mockReset();
    refreshCsrfTokenMock.mockReset();
    getBasePathMock.mockReset();
    getBasePathMock.mockReturnValue('/admin');
  });

  it('passes through GET requests without CSRF handling', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(createJsonResponse(200));

    const response = await adminCsrfFetch('/api/admin/contacts');

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith('/admin/api/admin/contacts', {});
    expect(getCsrfTokenMock).not.toHaveBeenCalled();
    expect(refreshCsrfTokenMock).not.toHaveBeenCalled();
  });

  it('adds the csrf header for mutating requests and preserves existing headers', async () => {
    getCsrfTokenMock.mockResolvedValue('first-token');
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(createJsonResponse(200));

    await adminCsrfFetch('/api/admin/contacts', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-trace-id': 'trace-123',
      },
      body: JSON.stringify({ id: 1 }),
    });

    const [, init] = fetchSpy.mock.calls[0];
    const headers = new Headers((init as RequestInit).headers);

    expect(headers.get('x-csrf-token')).toBe('first-token');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('x-trace-id')).toBe('trace-123');
    expect(refreshCsrfTokenMock).not.toHaveBeenCalled();
  });

  it('retries once after a csrf-related 403 response', async () => {
    getCsrfTokenMock.mockResolvedValue('stale-token');
    refreshCsrfTokenMock.mockResolvedValue('fresh-token');
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(createJsonResponse(403, { error: 'CSRF token expired' }))
      .mockResolvedValueOnce(createJsonResponse(200, { ok: true }));

    const response = await adminCsrfFetch('/api/admin/settings', {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const firstHeaders = new Headers((fetchSpy.mock.calls[0][1] as RequestInit).headers);
    const secondHeaders = new Headers((fetchSpy.mock.calls[1][1] as RequestInit).headers);

    expect(firstHeaders.get('x-csrf-token')).toBe('stale-token');
    expect(secondHeaders.get('x-csrf-token')).toBe('fresh-token');
    expect(refreshCsrfTokenMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry when the 403 response is unrelated to csrf', async () => {
    getCsrfTokenMock.mockResolvedValue('token');
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(createJsonResponse(403, { error: 'insufficient role' }));

    const response = await adminCsrfFetch('/api/admin/settings', {
      method: 'DELETE',
    });

    expect(response.status).toBe(403);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(refreshCsrfTokenMock).not.toHaveBeenCalled();
  });

  it('does not rewrite absolute urls or Request objects', async () => {
    getCsrfTokenMock.mockResolvedValue('token');
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(createJsonResponse(200));
    const request = new Request('https://example.com/api/admin/settings');

    await adminCsrfFetch('https://example.com/api/admin/settings', { method: 'PUT' });
    await adminCsrfFetch(request, { method: 'PUT' });

    expect(fetchSpy.mock.calls[0][0]).toBe('https://example.com/api/admin/settings');
    expect(fetchSpy.mock.calls[1][0]).toBe(request);
  });
});
