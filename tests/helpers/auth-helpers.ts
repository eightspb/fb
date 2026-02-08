/**
 * Вспомогательные функции для тестирования авторизации
 */

import { createToken } from '@/lib/auth';

/**
 * Создает валидный JWT токен для тестов
 */
export async function createTestToken(): Promise<string> {
  return await createToken();
}

/**
 * Создает мок cookie для авторизованного пользователя
 */
export async function createAuthCookie(): Promise<string> {
  const token = await createTestToken();
  return `admin-session=${token}; Path=/; HttpOnly; SameSite=Lax`;
}

/**
 * Создает мок headers с Authorization токеном
 */
export async function createAuthHeaders(): Promise<Record<string, string>> {
  const token = await createTestToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
