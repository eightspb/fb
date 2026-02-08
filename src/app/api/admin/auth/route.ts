import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const FALLBACK_JWT_SECRET = 'default-secret-change-me';
const COOKIE_NAME = 'admin-session';
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

async function createToken(): Promise<string> {
  const secret = new TextEncoder().encode(getJwtSecret());
  return new SignJWT({ role: 'admin', iat: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

// POST - Login
export async function POST(request: NextRequest) {
  try {
    let password: string | undefined;
    try {
      const body = await request.json();
      password = body?.password;
    } catch {
      return NextResponse.json(
        { error: 'Неверный формат запроса' },
        { status: 400 }
      );
    }

    const adminPassword = getAdminPassword();
    if (!adminPassword) {
      return NextResponse.json(
        { error: 'ADMIN_PASSWORD не настроен в переменных окружения' },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      console.log('[Auth] ❌ Попытка входа с неверным паролем');
      return NextResponse.json(
        { error: 'Неверный пароль' },
        { status: 401 }
      );
    }

    console.log('[Auth] ✅ Успешный вход в админ панель');
    const token = await createToken();
    const isSecure =
      request.headers.get('x-forwarded-proto') === 'https' ||
      request.nextUrl.protocol === 'https:';
    
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: SESSION_DURATION,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

// GET - Check session
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const isValid = await verifyToken(token);
    
    if (!isValid) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

// DELETE - Logout
export async function DELETE(request: NextRequest) {
  const isSecure =
    request.headers.get('x-forwarded-proto') === 'https' ||
    request.nextUrl.protocol === 'https:';
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return FALLBACK_JWT_SECRET;
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || '';
}
