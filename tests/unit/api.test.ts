/**
 * Unit тесты для API Routes
 * Тестирование Next.js API Routes с моками для cookies, headers и БД
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET, DELETE } from '@/app/api/admin/auth/route';

// Мок для next/headers
const mockCookies = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: (name: string) => {
      const value = mockCookies.get(name);
      return value ? { value } : undefined;
    },
    set: vi.fn((name: string, value: string) => {
      mockCookies.set(name, value);
    }),
    delete: vi.fn((name: string) => {
      mockCookies.delete(name);
    }),
  })),
}));

// Мок для jose
vi.mock('jose', async () => {
  const actual = await vi.importActual('jose');
  return {
    ...actual,
    SignJWT: vi.fn().mockImplementation(() => ({
      setProtectedHeader: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue('mock-jwt-token'),
    })),
    jwtVerify: vi.fn().mockResolvedValue({}),
  };
});

describe('API Route: /api/admin/auth', () => {
  beforeEach(() => {
    mockCookies.clear();
    process.env.ADMIN_PASSWORD = 'test-password';
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('POST - Login', () => {
    it('should return 401 for invalid password', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'wrong-password' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Неверный пароль');
    });

    it('should return 500 if ADMIN_PASSWORD is not set', async () => {
      delete process.env.ADMIN_PASSWORD;

      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'test-password' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('ADMIN_PASSWORD не настроен');
    });

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Неверный формат запроса');
    });

    it('should set cookie and return success for valid password', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'test-password' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Проверяем, что cookie был установлен
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('admin-session');
    });
  });

  describe('GET - Check Session', () => {
    it('should return 401 if no token in cookie', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.authenticated).toBe(false);
    });

    it('should return 401 for invalid token', async () => {
      mockCookies.set('admin-session', 'invalid-token');
      
      // Мокаем jwtVerify чтобы он выбрасывал ошибку
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('Invalid token'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.authenticated).toBe(false);
    });

    it('should return 200 for valid token', async () => {
      mockCookies.set('admin-session', 'valid-token');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authenticated).toBe(true);
    });
  });

  describe('DELETE - Logout', () => {
    it('should clear cookie and return success', async () => {
      mockCookies.set('admin-session', 'some-token');

      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Проверяем, что cookie был очищен (maxAge=0)
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('admin-session=');
      expect(setCookieHeader).toContain('Max-Age=0');
    });
  });
});
