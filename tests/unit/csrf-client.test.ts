import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCsrfToken, refreshCsrfToken } from '@/lib/csrf-client';

function clearCsrfCookie() {
  document.cookie = 'csrf-token=; path=/; max-age=0';
}

describe('src/lib/csrf-client', () => {
  beforeEach(() => {
    clearCsrfCookie();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns the existing token from cookies without fetching', async () => {
    document.cookie = 'csrf-token=existing-token; path=/';
    const fetchSpy = vi.spyOn(global, 'fetch');

    await expect(getCsrfToken()).resolves.toBe('existing-token');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches a token when the cookie is missing', async () => {
    vi.useFakeTimers();
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: 'fresh-token' }),
    } as Response);

    const tokenPromise = getCsrfToken();
    await vi.runAllTimersAsync();

    await expect(tokenPromise).resolves.toBe('fresh-token');
    expect(global.fetch).toHaveBeenCalledWith('/api/csrf', {
      method: 'GET',
      credentials: 'include',
    });
  });

  it('warns and falls back to the response token when the cookie is still absent after fetch', async () => {
    vi.useFakeTimers();
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: 'response-token' }),
    } as Response);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const tokenPromise = getCsrfToken();
    await vi.runAllTimersAsync();

    await expect(tokenPromise).resolves.toBe('response-token');
    expect(warnSpy).toHaveBeenCalledWith('[CSRF] Cookie not set, using token from response directly');
  });

  it('throws when fetching a token fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    await expect(getCsrfToken()).rejects.toThrow('Failed to fetch CSRF token');
  });

  it('throws when the token payload is malformed', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ nope: true }),
    } as Response);

    await expect(getCsrfToken()).rejects.toThrow('Invalid CSRF token response');
  });

  it('refreshes the token after clearing the cookie', async () => {
    vi.useFakeTimers();
    document.cookie = 'csrf-token=stale-token; path=/';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: 'refreshed-token' }),
    } as Response);

    const tokenPromise = refreshCsrfToken();
    await vi.runAllTimersAsync();

    await expect(tokenPromise).resolves.toBe('refreshed-token');
    expect(global.fetch).toHaveBeenCalledWith('/api/csrf', {
      method: 'GET',
      credentials: 'include',
    });
  });
});
