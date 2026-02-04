import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { CSRF_COOKIE_NAME } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  // Если токен уже есть в cookie, просто возвращаем его
  if (token) {
    return NextResponse.json({ csrfToken: token });
  }

  // Генерируем новый токен
  token = randomUUID();
  
  // Определяем secure на основе реального протокола запроса, а не NODE_ENV
  // Это важно когда production работает через HTTP (без SSL)
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isSecure = forwardedProto === 'https' || 
    (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true');
  
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
