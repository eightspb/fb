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

  // For SSE (streaming) requests don't forward the request signal —
  // req.signal aborts when the proxy handler returns, which would kill the stream.
  // Instead we rely on the browser closing the EventSource to abort the upstream.
  const isSSE = req.headers.get('accept')?.includes('text/event-stream');

  const upstream = await fetch(url.toString(), {
    method: req.method,
    headers,
    body,
    signal: isSSE ? undefined : req.signal,
    // @ts-expect-error — Node.js fetch supports this for streaming
    duplex: 'half',
  });

  const contentType = upstream.headers.get('content-type') || '';

  // SSE streaming — pipe body as-is without buffering
  if (contentType.includes('text/event-stream') && upstream.body) {
    const resHeaders = new Headers();
    resHeaders.set('content-type', 'text/event-stream');
    resHeaders.set('cache-control', 'no-cache');
    resHeaders.set('connection', 'keep-alive');
    resHeaders.set('x-accel-buffering', 'no');
    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });
  }

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
