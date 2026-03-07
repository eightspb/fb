import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getBasePath,
  getCsrfToken,
  refreshCsrfToken,
} from '../../apps/admin/src/lib/csrf-client';

function clearCsrfCookie() {
  document.cookie = 'csrf-token=; path=/; max-age=0';
}

describe('apps/admin/src/lib/csrf-client', () => {
  beforeEach(() => {
    clearCsrfCookie();
    document.head.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('reads basePath from the Next meta tag', () => {
    document.head.innerHTML = '<meta name="next-base-path" content="/admin">';

    expect(getBasePath()).toBe('/admin');
  });

  it('falls back to inferring basePath from _next assets', () => {
    document.head.innerHTML = '<link rel="preload" href="/admin/_next/static/chunk.js">';

    expect(getBasePath()).toBe('/admin');
  });

  it('returns an empty basePath when no hints are available', () => {
    expect(getBasePath()).toBe('');
  });

  it('returns an empty basePath when document is unavailable', () => {
    const originalDocument = globalThis.document;

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(getBasePath()).toBe('');
    } finally {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
    }
  });

  it('returns the existing cookie token without a network request', async () => {
    document.cookie = 'csrf-token=admin-existing-token; path=/';
    const fetchSpy = vi.spyOn(global, 'fetch');

    await expect(getCsrfToken()).resolves.toBe('admin-existing-token');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches the token using the admin basePath', async () => {
    vi.useFakeTimers();
    document.head.innerHTML = '<meta name="next-base-path" content="/admin">';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: 'admin-fresh-token' }),
    } as Response);

    const tokenPromise = getCsrfToken();
    await vi.runAllTimersAsync();

    await expect(tokenPromise).resolves.toBe('admin-fresh-token');
    expect(global.fetch).toHaveBeenCalledWith('/admin/api/csrf', {
      method: 'GET',
      credentials: 'include',
    });
  });

  it('does not warn when the csrf cookie is set before verification', async () => {
    vi.useFakeTimers();
    document.head.innerHTML = '<meta name="next-base-path" content="/admin">';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: 'admin-fresh-token' }),
    } as Response);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const tokenPromise = getCsrfToken();
    document.cookie = 'csrf-token=verified-admin-token; path=/';
    await vi.runAllTimersAsync();

    await expect(tokenPromise).resolves.toBe('admin-fresh-token');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('throws when fetching an admin csrf token fails', async () => {
    document.head.innerHTML = '<meta name="next-base-path" content="/admin">';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    await expect(getCsrfToken()).rejects.toThrow('Failed to fetch CSRF token');
  });

  it('throws when the admin csrf response is malformed', async () => {
    document.head.innerHTML = '<meta name="next-base-path" content="/admin">';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ nope: true }),
    } as Response);

    await expect(getCsrfToken()).rejects.toThrow('Invalid CSRF token response');
  });

  it('refreshes the token using the admin basePath', async () => {
    vi.useFakeTimers();
    document.head.innerHTML = '<meta name="next-base-path" content="/admin">';
    document.cookie = 'csrf-token=stale-admin-token; path=/';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: 'admin-refreshed-token' }),
    } as Response);

    const tokenPromise = refreshCsrfToken();
    await vi.runAllTimersAsync();

    await expect(tokenPromise).resolves.toBe('admin-refreshed-token');
    expect(global.fetch).toHaveBeenCalledWith('/admin/api/csrf', {
      method: 'GET',
      credentials: 'include',
    });
  });

  it('throws when refreshing the admin csrf token fails', async () => {
    document.head.innerHTML = '<meta name="next-base-path" content="/admin">';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    await expect(refreshCsrfToken()).rejects.toThrow('Failed to fetch CSRF token');
  });

  it('throws when refreshing returns an invalid payload', async () => {
    document.head.innerHTML = '<meta name="next-base-path" content="/admin">';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ nope: true }),
    } as Response);

    await expect(refreshCsrfToken()).rejects.toThrow('Invalid CSRF token response');
  });
});
