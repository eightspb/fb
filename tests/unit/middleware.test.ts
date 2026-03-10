/**
 * Unit tests for middleware.ts — CSRF validation and rate limiting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @upstash/ratelimit and @upstash/redis before importing middleware
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: 0 }),
  })),
}));

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(),
  },
}));

// Use real CSRF constants
vi.mock('@/lib/csrf', () => ({
  CSRF_COOKIE_NAME: 'csrf-token',
  CSRF_HEADER_NAME: 'x-csrf-token',
}));

import { middleware } from '../../middleware';

function makeRequest(
  method: string,
  path: string,
  opts?: {
    csrfCookie?: string;
    csrfHeader?: string;
    headers?: Record<string, string>;
  }
): NextRequest {
  const url = `http://localhost:3000${path}`;
  const headers = new Headers(opts?.headers);
  if (opts?.csrfHeader !== undefined) {
    headers.set('x-csrf-token', opts.csrfHeader);
  }

  const req = new NextRequest(url, { method, headers });

  // NextRequest cookies are read-only from the constructor; we need to set cookie via headers
  // Recreate with cookie header
  if (opts?.csrfCookie !== undefined) {
    const cookieHeaders = new Headers(headers);
    cookieHeaders.set('cookie', `csrf-token=${opts.csrfCookie}`);
    if (opts?.csrfHeader !== undefined) {
      cookieHeaders.set('x-csrf-token', opts.csrfHeader);
    }
    return new NextRequest(url, { method, headers: cookieHeaders });
  }

  return req;
}

describe('middleware — CSRF validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure no Upstash config so rate limiting is skipped
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  // ─── Safe methods pass without CSRF ──────────────────────────────────────────

  it('GET requests pass without CSRF token', async () => {
    const req = makeRequest('GET', '/api/admin/contacts');
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  it('HEAD requests pass without CSRF token', async () => {
    const req = makeRequest('HEAD', '/api/admin/contacts');
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  it('OPTIONS requests pass without CSRF token', async () => {
    const req = makeRequest('OPTIONS', '/api/admin/contacts');
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  // ─── POST without CSRF → 403 ────────────────────────────────────────────────

  it('POST request without CSRF token returns 403', async () => {
    const req = makeRequest('POST', '/api/admin/contacts');
    const res = await middleware(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Invalid CSRF token');
  });

  it('PUT request without CSRF token returns 403', async () => {
    const req = makeRequest('PUT', '/api/admin/contacts/1');
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  it('DELETE request without CSRF token returns 403', async () => {
    const req = makeRequest('DELETE', '/api/admin/contacts/1');
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  it('PATCH request without CSRF token returns 403', async () => {
    const req = makeRequest('PATCH', '/api/admin/contacts/1');
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  // ─── Mismatched tokens → 403 ────────────────────────────────────────────────

  it('POST with mismatched cookie/header tokens returns 403', async () => {
    const req = makeRequest('POST', '/api/admin/contacts', {
      csrfCookie: 'token-aaa',
      csrfHeader: 'token-bbb',
    });
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  it('POST with cookie but no header returns 403', async () => {
    const req = makeRequest('POST', '/api/admin/contacts', {
      csrfCookie: 'token-aaa',
    });
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  it('POST with header but no cookie returns 403', async () => {
    const req = makeRequest('POST', '/api/admin/contacts', {
      csrfHeader: 'token-aaa',
    });
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  // ─── Matching tokens → pass ──────────────────────────────────────────────────

  it('POST with matching cookie/header tokens passes', async () => {
    const token = 'valid-csrf-token-123';
    const req = makeRequest('POST', '/api/admin/contacts', {
      csrfCookie: token,
      csrfHeader: token,
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  it('PUT with matching tokens passes', async () => {
    const token = 'my-csrf-token';
    const req = makeRequest('PUT', '/api/admin/contacts/1', {
      csrfCookie: token,
      csrfHeader: token,
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  // ─── Exempt paths pass without CSRF ──────────────────────────────────────────

  const exemptPaths = [
    '/api/admin/banner',
    '/api/admin/email-templates',
    '/api/admin/direct',
    '/api/admin/auth',
    '/api/telegram/webhook',
    '/api/analytics/track',
  ];

  for (const path of exemptPaths) {
    it(`POST to exempt path ${path} passes without CSRF`, async () => {
      const req = makeRequest('POST', path);
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });
  }

  it('exempt path prefix match: /api/admin/banner/sub-path passes', async () => {
    const req = makeRequest('POST', '/api/admin/banner/upload');
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  // ─── Server Actions bypass ───────────────────────────────────────────────────

  it('request with next-action header bypasses CSRF', async () => {
    const req = makeRequest('POST', '/api/admin/contacts', {
      headers: { 'next-action': 'some-action-id' },
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  it('request with x-nextjs-action header bypasses CSRF', async () => {
    const req = makeRequest('POST', '/api/admin/contacts', {
      headers: { 'x-nextjs-action': 'some-action-id' },
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  it('request with text/x-component content-type bypasses CSRF', async () => {
    const req = makeRequest('POST', '/api/admin/contacts', {
      headers: { 'content-type': 'text/x-component' },
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  // ─── Empty string tokens → 403 ─────────────────────────────────────────────

  it('POST with empty string CSRF tokens returns 403', async () => {
    const req = makeRequest('POST', '/api/admin/contacts', {
      csrfCookie: '',
      csrfHeader: '',
    });
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  // ─── /_next/static path bypass ────────────────────────────────────────────

  it('POST to /_next/static path bypasses CSRF', async () => {
    const req = makeRequest('POST', '/_next/static/chunks/app/page.js');
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  // ─── Rate limiting: no Upstash config → pass ────────────────────────────────

  it('requests pass when Upstash is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const req = makeRequest('GET', '/api/admin/contacts');
    const res = await middleware(req);
    expect(res.status).not.toBe(429);
  });
});
