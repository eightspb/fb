import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { CSRF_COOKIE_NAME } from '@/lib/csrf';

export async function GET() {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  // Если токен уже есть в cookie, просто возвращаем его
  if (token) {
    return NextResponse.json({ csrfToken: token });
  }

  // Генерируем новый токен
  token = randomUUID();
  const isSecure = process.env.NODE_ENV === 'production';
  
  // В Next.js 15+ нужно использовать NextResponse для установки cookies
  const response = NextResponse.json({ csrfToken: token });
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
    maxAge: 60 * 60 * 24, // 24 часа
  });

  return response;
}
