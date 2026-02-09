import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';

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

  // Устанавливаем информацию о запросе для логгера
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const ip = cfConnectingIp || forwardedFor?.split(',')[0]?.trim() || realIp || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || '';

  // Сохраняем в глобальный контекст для логгера
  if (typeof global !== 'undefined') {
    (global as any).__currentRequest = {
      ip,
      userAgent,
      path: pathname,
    };
  }

  // Логируем все HTTP запросы (console.log будет перехвачен системой логирования)
  // Исключаем статические ресурсы и некоторые служебные пути
  const skipLogging = [
    '/_next',
    '/favicon',
    '/api/admin/logs/stream', // SSE endpoint для логов
    '/manifest',
    '/robots.txt',
    '/sitemap',
  ].some(prefix => pathname.startsWith(prefix)) || pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/);

  if (!skipLogging) {
    console.log(`[HTTP] ${request.method} ${pathname} | IP: ${ip} | UA: ${userAgent.substring(0, 50)}`);
  }

  // Redirect unauthenticated users from admin pages
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!adminSession) {
      console.log('[Auth] Попытка доступа к админ панели без авторизации:', pathname, 'IP:', ip);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  // Rate limiting (пропускаем для трекинга аналитики)
  if (ratelimit && !pathname.startsWith('/api/analytics')) {
    const identifier = getClientIdentifier(request);
    const result = await ratelimit.limit(`api_${identifier}`);
    if (!result.success) {
      // Логируем превышение лимита через console (будет перехвачено logger)
      console.warn('[RateLimit] Rate limit exceeded для', identifier, 'path:', pathname);
      
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
    
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      const reason = !cookieToken ? 'NO_COOKIE_TOKEN' : !headerToken ? 'NO_HEADER_TOKEN' : 'TOKENS_MISMATCH';
      
      // Логируем CSRF нарушение через console (будет перехвачено logger)
      console.error('[Security] CSRF validation failed:', reason, 'path:', pathname, 'IP:', ip);
      
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
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
