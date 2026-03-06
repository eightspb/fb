/**
 * Unit тесты для lib утилит
 * slug.ts, sanitize.ts, email-templates.ts, auth.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── slug.ts ─────────────────────────────────────────────────────────────────
import { transliterate, generateSlug, isUUID, isValidSlug } from '@/lib/slug';

describe('transliterate', () => {
  it('transliterates basic cyrillic', () => {
    expect(transliterate('привет')).toBe('privet');
    expect(transliterate('молочная железа')).toBe('molochnaya zheleza');
  });

  it('handles special cyrillic chars', () => {
    expect(transliterate('ё')).toBe('yo');
    expect(transliterate('ж')).toBe('zh');
    expect(transliterate('ц')).toBe('ts');
    expect(transliterate('ч')).toBe('ch');
    expect(transliterate('ш')).toBe('sh');
    expect(transliterate('щ')).toBe('sch');
    expect(transliterate('ю')).toBe('yu');
    expect(transliterate('я')).toBe('ya');
  });

  it('drops soft and hard signs', () => {
    expect(transliterate('ъ')).toBe('');
    expect(transliterate('ь')).toBe('');
  });

  it('leaves latin and digits unchanged', () => {
    expect(transliterate('hello 123')).toBe('hello 123');
  });

  it('handles uppercase cyrillic', () => {
    expect(transliterate('Привет')).toBe('Privet');
  });

  it('handles empty string', () => {
    expect(transliterate('')).toBe('');
  });
});

describe('generateSlug', () => {
  it('generates slug from cyrillic text', () => {
    expect(generateSlug('Молочная железа')).toBe('molochnaya-zheleza');
  });

  it('converts to lowercase', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('replaces slashes with hyphens', () => {
    expect(generateSlug('foo/bar')).toBe('foo-bar');
  });

  it('collapses multiple separators to single hyphen', () => {
    expect(generateSlug('foo--bar__baz')).toBe('foo-bar-baz');
  });

  it('removes special characters', () => {
    expect(generateSlug('foo! bar@')).toBe('foo-bar');
  });

  it('handles the docstring example', () => {
    const slug = generateSlug('Миниинвазивная хирургия / Молочная железа - 2026');
    expect(slug).toBe('miniinvazivnaya-hirurgiya-molochnaya-zheleza-2026');
  });

  it('returns empty string for empty input', () => {
    expect(generateSlug('')).toBe('');
  });

  it('truncates to 100 chars', () => {
    const long = 'а'.repeat(200);
    expect(generateSlug(long).length).toBeLessThanOrEqual(100);
  });
});

describe('isUUID', () => {
  it('returns true for valid UUID v4', () => {
    expect(isUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
  });

  it('returns false for non-v4 UUID (version digit != 4)', () => {
    expect(isUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });

  it('returns false for invalid string', () => {
    expect(isUUID('not-a-uuid')).toBe(false);
    expect(isUUID('')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isUUID('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true);
  });
});

describe('isValidSlug', () => {
  it('returns true for valid slugs', () => {
    expect(isValidSlug('hello-world')).toBe(true);
    expect(isValidSlug('foo')).toBe(true);
    expect(isValidSlug('foo-bar-123')).toBe(true);
  });

  it('returns false for slugs with uppercase', () => {
    expect(isValidSlug('Hello-World')).toBe(false);
  });

  it('returns false for slugs starting or ending with hyphen', () => {
    expect(isValidSlug('-foo')).toBe(false);
    expect(isValidSlug('foo-')).toBe(false);
  });

  it('returns false for slugs with consecutive hyphens', () => {
    expect(isValidSlug('foo--bar')).toBe(false);
  });

  it('returns false for slugs shorter than 2 chars', () => {
    expect(isValidSlug('a')).toBe(false);
    expect(isValidSlug('')).toBe(false);
  });

  it('returns false for slugs with special characters', () => {
    expect(isValidSlug('foo/bar')).toBe(false);
    expect(isValidSlug('foo bar')).toBe(false);
  });
});

// ─── sanitize.ts ─────────────────────────────────────────────────────────────
import { escapeHtml } from '@/lib/sanitize';

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes < and > tags', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it('escapes XSS payload — no < or > remain', () => {
    const xss = '<img src=x onerror="alert(1)">';
    expect(escapeHtml(xss)).not.toContain('<');
    expect(escapeHtml(xss)).not.toContain('>');
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('leaves safe text unchanged', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123');
  });
});

// ─── email-templates.ts ───────────────────────────────────────────────────────
import { renderTemplate } from '@/lib/email-templates';

describe('renderTemplate', () => {
  it('substitutes a simple variable', () => {
    expect(renderTemplate('Hello {{name}}!', { name: 'Иван' })).toBe('Hello Иван!');
  });

  it('substitutes multiple variables', () => {
    expect(
      renderTemplate('{{name}} <{{email}}>', { name: 'Иван', email: 'ivan@test.com' })
    ).toBe('Иван <ivan@test.com>');
  });

  it('replaces undefined variable with empty string', () => {
    expect(renderTemplate('Hello {{name}}!', {})).toBe('Hello !');
  });

  it('renders boolean true as Да', () => {
    expect(renderTemplate('Cert: {{certificate}}', { certificate: true })).toBe('Cert: Да');
  });

  it('renders boolean false as Нет', () => {
    expect(renderTemplate('Cert: {{certificate}}', { certificate: false })).toBe('Cert: Нет');
  });

  it('renders conditional block when variable is truthy', () => {
    expect(
      renderTemplate('{{#if name}}Hello {{name}}!{{/if}}', { name: 'Иван' })
    ).toBe('Hello Иван!');
  });

  it('hides conditional block when variable is missing', () => {
    expect(renderTemplate('{{#if name}}Hello {{name}}!{{/if}}', {})).toBe('');
  });

  it('hides conditional block when variable is empty string', () => {
    expect(renderTemplate('{{#if name}}Hello!{{/if}}', { name: '' })).toBe('');
  });

  it('removes unprocessed placeholders', () => {
    expect(renderTemplate('Hello {{unknown}}', {})).toBe('Hello ');
  });

  it('handles real-world email template substitution', () => {
    const tpl = 'Уважаемый {{name}}, email: {{email}}, тел: {{phone}}';
    const result = renderTemplate(tpl, {
      name: 'Иван',
      email: 'ivan@test.com',
      phone: '+7 900 000 00 00',
    });
    expect(result).toBe('Уважаемый Иван, email: ivan@test.com, тел: +7 900 000 00 00');
  });
});

// ─── auth.ts ──────────────────────────────────────────────────────────────────
vi.mock('jose', async () => {
  const actual = await vi.importActual('jose');
  return {
    ...actual,
    SignJWT: vi.fn().mockImplementation(() => ({
      setProtectedHeader: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue('mock-jwt-token'),
    })),
    jwtVerify: vi.fn().mockResolvedValue({ payload: { role: 'admin' } }),
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe('auth.ts', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-32-chars-long-enough!!!';
    process.env.NODE_ENV = 'test';
  });

  describe('createToken', () => {
    it('returns a string token', async () => {
      const { createToken } = await import('@/lib/auth');
      const token = await createToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('verifyToken', () => {
    it('returns true for a valid token', async () => {
      const { verifyToken } = await import('@/lib/auth');
      const result = await verifyToken('any-token');
      expect(result).toBe(true);
    });

    it('returns false when jwtVerify throws', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('invalid'));
      const { verifyToken } = await import('@/lib/auth');
      const result = await verifyToken('bad-token');
      expect(result).toBe(false);
    });
  });

  describe('checkApiAuth', () => {
    it('bypasses auth in non-production with X-Admin-Bypass header', async () => {
      process.env.NODE_ENV = 'development';
      const { checkApiAuth } = await import('@/lib/auth');
      const req = new Request('http://localhost/api/test', {
        headers: { 'X-Admin-Bypass': 'true' },
      });
      const result = await checkApiAuth(req);
      expect(result.isAuthenticated).toBe(true);
      expect(result.isBypass).toBe(true);
    });

    it('authenticates via valid Authorization Bearer token', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValue({ payload: { role: 'admin' } } as never);
      vi.resetModules();
      const { checkApiAuth } = await import('@/lib/auth');
      const req = new Request('http://localhost/api/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      const result = await checkApiAuth(req);
      expect(result.isAuthenticated).toBe(true);
    });

    it('rejects Authorization header with token string "undefined"', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockRejectedValue(new Error('invalid'));
      vi.resetModules();
      const { checkApiAuth } = await import('@/lib/auth');
      const req = new Request('http://localhost/api/test', {
        headers: { Authorization: 'Bearer undefined' },
      });
      const result = await checkApiAuth(req);
      expect(result.isAuthenticated).toBe(false);
    });

    it('returns unauthenticated when no token provided', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockRejectedValue(new Error('invalid'));
      vi.resetModules();
      const { checkApiAuth } = await import('@/lib/auth');
      const req = new Request('http://localhost/api/test');
      const result = await checkApiAuth(req);
      expect(result.isAuthenticated).toBe(false);
      expect(result.isBypass).toBe(false);
    });
  });
});
