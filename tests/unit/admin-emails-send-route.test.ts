import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockCookies,
  mockJwtVerify,
  mockCreateEmailTransporter,
  mockSendMail,
  mockGenerateMessageId,
  mockSaveOutboundEmail,
  mockAppendSavedOutboundEmailToSent,
} = vi.hoisted(() => ({
  mockCookies: new Map<string, string>(),
  mockJwtVerify: vi.fn(),
  mockCreateEmailTransporter: vi.fn(),
  mockSendMail: vi.fn(),
  mockGenerateMessageId: vi.fn(),
  mockSaveOutboundEmail: vi.fn(),
  mockAppendSavedOutboundEmailToSent: vi.fn(),
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

vi.mock('@/lib/email', () => ({
  createEmailTransporter: mockCreateEmailTransporter,
  generateMessageId: mockGenerateMessageId,
  getSenderEmail: vi.fn(() => 'noreply@example.com'),
  getSenderAddress: vi.fn(() => 'Example <noreply@example.com>'),
  getSenderName: vi.fn(() => 'Example'),
}));

vi.mock('@/lib/imap-client', () => ({
  saveOutboundEmail: mockSaveOutboundEmail,
  appendSavedOutboundEmailToSent: mockAppendSavedOutboundEmailToSent,
}));

function makeRequest(formData: FormData): NextRequest {
  return {
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as NextRequest;
}

describe('/api/admin/emails/send', () => {
  let POST: typeof import('@/app/api/admin/emails/send/route').POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCookies.clear();
    mockCookies.set('admin-session', 'valid-session');
    mockJwtVerify.mockResolvedValue({});
    mockSendMail.mockResolvedValue({ messageId: '<smtp-generated@example.com>' });
    mockCreateEmailTransporter.mockReturnValue({ sendMail: mockSendMail });
    mockGenerateMessageId.mockReturnValue('<fixed-message@example.com>');
    mockAppendSavedOutboundEmailToSent.mockResolvedValue({ saved: true, path: 'Sent', error: null });
    mockSaveOutboundEmail.mockResolvedValue({ id: 'email-1' });

    const mod = await import('@/app/api/admin/emails/send/route');
    POST = mod.POST;
  });

  it('sends email, appends a copy to IMAP Sent and saves the shared message id in CRM', async () => {
    const formData = new FormData();
    formData.append('to', 'contact@example.com');
    formData.append('subject', 'Hello');
    formData.append('body_html', '<p>Hello</p>');
    formData.append('body_text', 'Hello');
    formData.append('submission_id', 'submission-1');
    formData.append('in_reply_to', '<reply@example.com>');
    formData.append('references', '<thread@example.com>');

    const response = await POST(makeRequest(formData));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sentFolderSaved).toBe(true);
    expect(data.sentFolderPath).toBe('Sent');
    expect(data.sentFolderError).toBeNull();

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions).toMatchObject({
      from: 'Example <noreply@example.com>',
      to: 'contact@example.com',
      subject: 'Hello',
      text: 'Hello',
      html: '<p>Hello</p>',
      messageId: '<fixed-message@example.com>',
      inReplyTo: '<reply@example.com>',
      references: '<thread@example.com>',
    });
    expect(mailOptions.date).toBeInstanceOf(Date);

    expect(mockSaveOutboundEmail).toHaveBeenCalledWith(expect.objectContaining({
      messageId: '<fixed-message@example.com>',
      inReplyTo: '<reply@example.com>',
      references: '<thread@example.com>',
      fromName: 'Example',
      bodyText: 'Hello',
      sentAt: mailOptions.date,
      sentMailboxStatus: 'pending',
      submissionId: 'submission-1',
      toAddresses: ['contact@example.com'],
    }));
    expect(mockAppendSavedOutboundEmailToSent).toHaveBeenCalledWith('email-1', expect.objectContaining({
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    }));
  });

  it('keeps the SMTP send successful even if appending to Sent fails', async () => {
    mockAppendSavedOutboundEmailToSent.mockResolvedValueOnce({
      saved: false,
      path: null,
      error: 'IMAP unavailable',
    });

    const formData = new FormData();
    formData.append('to', 'contact@example.com');
    formData.append('subject', 'Hello');
    formData.append('body_html', '<p>Hello</p>');

    const response = await POST(makeRequest(formData));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sentFolderSaved).toBe(false);
    expect(data.sentFolderPath).toBeNull();
    expect(data.sentFolderError).toBe('IMAP unavailable');
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSaveOutboundEmail).toHaveBeenCalledTimes(1);
  });
});
