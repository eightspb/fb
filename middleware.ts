import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';

const hasUpstashConfig = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const ratelimit = hasUpstashConfig
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
    })
  : null;

// Пути, исключённые из CSRF-проверки (публичные API)
const CSRF_EXEMPT_PATHS = ['/api/analytics/track'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
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
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
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
  matcher: ['/api/:path*'],
};
