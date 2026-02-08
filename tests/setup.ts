/**
 * Глобальная настройка для Vitest тестов
 * Подключает MSW, настраивает окружение и моки
 */

import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './fixtures/msw-handlers';

// Очистка после каждого теста
afterEach(() => {
  cleanup();
  // Сброс всех моков
  vi.clearAllMocks();
});

// Запуск MSW сервера перед всеми тестами
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Очистка после каждого теста
afterEach(() => {
  server.resetHandlers();
});

// Остановка MSW сервера после всех тестов
afterAll(() => {
  server.close();
});

// Мок для next/headers (cookies, headers)
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => {
      const mockCookies: Record<string, { value: string }> = {};
      return mockCookies[name] || null;
    }),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn((name: string) => {
      const mockHeaders: Record<string, string> = {};
      return mockHeaders[name] || null;
    }),
  })),
}));

// Мок для next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Мок для process.env в тестах
const mutableEnv = process.env as unknown as Record<string, string | undefined>;
mutableEnv.NODE_ENV = 'test';
mutableEnv.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
mutableEnv.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test_db';
mutableEnv.TELEGRAM_BOT_TOKEN = 'mock-telegram-token';
mutableEnv.OPENROUTER_API_KEY = 'mock-openrouter-key';
mutableEnv.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
