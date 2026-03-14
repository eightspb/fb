import { beforeEach, describe, expect, it, vi } from 'vitest';
const {
  mockCookies,
  mockJwtVerify,
  mockRetryPendingSentMailboxEmails,
} = vi.hoisted(() => ({
  mockCookies: new Map<string, string>(),
  mockJwtVerify: vi.fn(),
  mockRetryPendingSentMailboxEmails: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = mockCookies.get(name);
      return value ? { value } : undefined;
    },
  })),
}));

vi.mock('jose', () => ({
  jwtVerify: mockJwtVerify,
}));

vi.mock('@/lib/imap-client', () => ({
  retryPendingSentMailboxEmails: mockRetryPendingSentMailboxEmails,
}));

describe('/api/admin/emails/retry-pending', () => {
  let POST: typeof import('@/app/api/admin/emails/retry-pending/route').POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCookies.clear();
    mockCookies.set('admin-session', 'valid-session');
    mockJwtVerify.mockResolvedValue({});
    mockRetryPendingSentMailboxEmails.mockResolvedValue({
      checked: 2,
      appended: 1,
      failed: 1,
      skipped: 0,
    });

    const mod = await import('@/app/api/admin/emails/retry-pending/route');
    POST = mod.POST;
  });

  it('retries pending Sent appends for an authenticated admin session', async () => {
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      checked: 2,
      appended: 1,
      failed: 1,
      skipped: 0,
    });
    expect(mockRetryPendingSentMailboxEmails).toHaveBeenCalledWith(5, expect.objectContaining({
      connectionTimeout: 10000,
      greetingTimeout: 7000,
      socketTimeout: 15000,
    }));
  });

  it('returns 401 when admin session is missing', async () => {
    mockCookies.clear();

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mockRetryPendingSentMailboxEmails).not.toHaveBeenCalled();
  });
});
