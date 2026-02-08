import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';
import fs from 'fs';

const hasUpstashConfig = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_SESSION_COOKIE = 'admin-session';

const ratelimit = hasUpstashConfig
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
    })
  : null;

// Пути, исключённые из CSRF-проверки (публичные API)
const CSRF_EXEMPT_PATHS = [
  '/api/analytics/track',
  '/api/telegram/webhook',  // Telegram Bot API не отправляет CSRF токены
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Redirect unauthenticated users from admin pages
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  // Rate limiting (пропускаем для трекинга аналитики)
  if (ratelimit && !pathname.startsWith('/api/analytics')) {
    const identifier = getClientIdentifier(request);
    const result = await ratelimit.limit(`api_${identifier}`);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
          },
        }
      );
    }
  }

  // CSRF проверка (пропускаем для определённых путей)
  const method = request.method.toUpperCase();
  const isExempt = CSRF_EXEMPT_PATHS.some(path => pathname.startsWith(path));
  
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !isExempt) {
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    
    // #region agent log
    const logPath = 'c:\\WORK_PROGRAMMING\\fb.net\\.cursor\\debug.log';
    const logEntry = JSON.stringify({
      location: 'middleware.ts:58',
      message: 'CSRF validation check',
      data: {
        pathname,
        method,
        isExempt,
        cookieTokenExists: !!cookieToken,
        cookieTokenLength: cookieToken?.length || 0,
        headerTokenExists: !!headerToken,
        headerTokenLength: headerToken?.length || 0,
        tokensMatch: cookieToken === headerToken,
      },
      timestamp: Date.now(),
      runId: 'run1',
      hypothesisId: 'A',
    }) + '\n';
    try { fs.appendFileSync(logPath, logEntry, 'utf8'); } catch {}
    // #endregion
    
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      // #region agent log
      const failLogEntry = JSON.stringify({
        location: 'middleware.ts:75',
        message: 'CSRF validation failed',
        data: {
          pathname,
          method,
          reason: !cookieToken ? 'NO_COOKIE_TOKEN' : !headerToken ? 'NO_HEADER_TOKEN' : 'TOKENS_MISMATCH',
          cookieTokenExists: !!cookieToken,
          headerTokenExists: !!headerToken,
        },
        timestamp: Date.now(),
        runId: 'run1',
        hypothesisId: 'A',
      }) + '\n';
      try { fs.appendFileSync(logPath, failLogEntry, 'utf8'); } catch {}
      // #endregion
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    
    // #region agent log
    const successLogEntry = JSON.stringify({
      location: 'middleware.ts:88',
      message: 'CSRF validation passed',
      data: { pathname, method },
      timestamp: Date.now(),
      runId: 'run1',
      hypothesisId: 'A',
    }) + '\n';
    try { fs.appendFileSync(logPath, successLogEntry, 'utf8'); } catch {}
    // #endregion
  }

  return NextResponse.next();
}

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
  return ip;
}

export const config = {
  matcher: ['/api/:path*', '/admin', '/admin/:path*'],
};
