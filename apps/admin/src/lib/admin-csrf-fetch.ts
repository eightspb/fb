import { getCsrfToken, refreshCsrfToken, getBasePath } from '@/lib/csrf-client';

function mergeHeaders(initHeaders: HeadersInit | undefined, csrfToken: string): Headers {
  const headers = new Headers(initHeaders);
  headers.set('x-csrf-token', csrfToken);
  return headers;
}

async function isCsrfError(response: Response): Promise<boolean> {
  if (response.status !== 403) {
    return false;
  }

  const body = await response
    .clone()
    .json()
    .catch(() => ({})) as { error?: string; message?: string };

  const message = `${body.error ?? ''} ${body.message ?? ''}`.toLowerCase();
  return message.includes('csrf');
}

function withBasePath(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== 'string') return input;
  if (input.startsWith('http://') || input.startsWith('https://')) return input;
  const base = getBasePath();
  return base && !input.startsWith(base) ? `${base}${input}` : input;
}

export async function adminCsrfFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = withBasePath(input);
  const method = (init.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return fetch(url, init);
  }

  let csrfToken = await getCsrfToken();
  let response = await fetch(url, {
    ...init,
    headers: mergeHeaders(init.headers, csrfToken),
  });

  if (await isCsrfError(response)) {
    csrfToken = await refreshCsrfToken();
    response = await fetch(url, {
      ...init,
      headers: mergeHeaders(init.headers, csrfToken),
    });
  }

  return response;
}
