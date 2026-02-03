import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

// Константы
const JWT_SECRET = process.env.JWT_SECRET;
const FALLBACK_JWT_SECRET = 'default-secret-change-me';
const COOKIE_NAME = 'admin-session';
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 дней в секундах

/**
 * Проверка авторизации админа через cookie (для Server Components и API Routes)
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return false;
    }

    const secret = new TextEncoder().encode(getJwtSecret());
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

/**
 * Получить токен из cookie (для Server Components и API Routes)
 */
export async function getAdminToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Проверка токена JWT (для API routes с Authorization header)
 * Принимает токен из Authorization header или cookie
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

/**
 * Создание нового JWT токена
 */
export async function createToken(): Promise<string> {
  const secret = new TextEncoder().encode(getJwtSecret());
  return new SignJWT({ role: 'admin', iat: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);
}

/**
 * Проверка авторизации для API route
 * Проверяет Authorization header или cookie
 * Возвращает { isAuthenticated, isBypass }
 */
export async function checkApiAuth(request: Request): Promise<{ isAuthenticated: boolean; isBypass: boolean }> {
  // Проверяем bypass header (для локальной разработки)
  const bypassHeader = request.headers.get('X-Admin-Bypass');
  if (bypassHeader === 'true' && process.env.NODE_ENV !== 'production') {
    return { isAuthenticated: true, isBypass: true };
  }

  // Проверяем Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token && token !== 'undefined' && token !== 'null') {
      const isValid = await verifyToken(token);
      if (isValid) {
        return { isAuthenticated: true, isBypass: false };
      }
    }
  }

  // Проверяем cookie
  const isSessionValid = await verifyAdminSession();
  if (isSessionValid) {
    return { isAuthenticated: true, isBypass: false };
  }

  return { isAuthenticated: false, isBypass: false };
}

// Экспорт констант для использования в других модулях
export const AUTH_COOKIE_NAME = COOKIE_NAME;
export const AUTH_SESSION_DURATION = SESSION_DURATION;

function getJwtSecret(): string {
  if (JWT_SECRET) {
    return JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return FALLBACK_JWT_SECRET;
}
