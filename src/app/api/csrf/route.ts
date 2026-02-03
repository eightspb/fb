import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { CSRF_COOKIE_NAME } from '@/lib/csrf';

export async function GET() {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!token) {
    token = randomUUID();
    const isSecure = process.env.NODE_ENV === 'production';
    cookieStore.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: isSecure,
      path: '/',
    });
  }

  return NextResponse.json({ csrfToken: token });
}
