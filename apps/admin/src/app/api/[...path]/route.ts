import { type NextRequest, NextResponse } from 'next/server';

const API_ORIGIN = process.env.ADMIN_API_ORIGIN ?? 'http://localhost:3000';

async function proxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const url = new URL(`/api/${path}${req.nextUrl.search}`, API_ORIGIN);

  const headers = new Headers(req.headers);
  headers.delete('host');

  let body: ArrayBuffer | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.arrayBuffer();
  }

  const upstream = await fetch(url.toString(), {
    method: req.method,
    headers,
    body,
  });

  const responseBody = await upstream.arrayBuffer();
  const resHeaders = new Headers();

  // Пробрасываем только нужные заголовки
  const passthroughHeaders = ['content-type', 'set-cookie', 'cache-control'];
  for (const name of passthroughHeaders) {
    const value = upstream.headers.get(name);
    if (value) resHeaders.set(name, value);
  }

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
