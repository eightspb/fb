import { NextRequest, NextResponse } from 'next/server';

const ADMIN_SESSION_COOKIE = 'admin-session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath =
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/_next') ||
    pathname.startsWith('/admin/favicon');

  if (isPublicPath) {
    return NextResponse.next();
  }

  const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!adminSession) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
