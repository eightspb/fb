import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockPoolConnect,
  mockBuildRawEmail,
  mockReadFile,
  mockImapConnect,
  mockImapList,
  mockImapAppend,
  mockImapLogout,
} = vi.hoisted(() => ({
  mockPoolConnect: vi.fn(),
  mockBuildRawEmail: vi.fn(),
  mockReadFile: vi.fn(),
  mockImapConnect: vi.fn(),
  mockImapList: vi.fn(),
  mockImapAppend: vi.fn(),
  mockImapLogout: vi.fn(),
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: mockPoolConnect,
  })),
}));

vi.mock('@/lib/email', () => ({
  buildRawEmail: mockBuildRawEmail,
}));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    readFile: mockReadFile,
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  };
});

vi.mock('mailparser', () => ({
  simpleParser: vi.fn(),
}));

vi.mock('imapflow', () => ({
  ImapFlow: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    connect: mockImapConnect,
    list: mockImapList,
    append: mockImapAppend,
    logout: mockImapLogout,
  })),
}));

function createPgClient(handler: (sql: string, params?: unknown[]) => unknown) {
  return {
    query: vi.fn(async (sql: string, params?: unknown[]) => handler(sql, params)),
    release: vi.fn(),
  };
}

function createOutboundClient(options: {
  locked: boolean;
  appendFailure?: string;
}) {
  return createPgClient((sql) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [], rowCount: 0 };
    }

    if (sql.includes('pg_try_advisory_xact_lock')) {
      return { rows: [{ locked: options.locked }], rowCount: 1 };
    }

    if (sql.includes('SELECT sent_mailbox_status')) {
      return { rows: [{ sent_mailbox_status: 'pending' }], rowCount: 1 };
    }

    if (sql.includes('SELECT') && sql.includes('from_address') && sql.includes('FROM crm_emails')) {
      return {
        rows: [{
          id: 'email-1',
          message_id: '<message@example.com>',
          in_reply_to: null,
          references_header: null,
          from_address: 'noreply@example.com',
          from_name: 'Example',
          to_addresses: ['contact@example.com'],
          cc_addresses: null,
          subject: 'Hello',
          body_html: '<p>Hello</p>',
          body_text: 'Hello',
          sent_at: '2026-03-13T12:00:00.000Z',
          direction: 'outbound',
          sent_mailbox_status: 'pending',
        }],
        rowCount: 1,
      };
    }

    if (sql.includes('FROM crm_email_attachments')) {
      return { rows: [], rowCount: 0 };
    }

    if (sql.includes('UPDATE crm_emails')) {
      return { rows: [], rowCount: 1 };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  });
}

describe('imap-client Sent retry flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildRawEmail.mockResolvedValue(Buffer.from('raw email'));
    mockReadFile.mockResolvedValue(Buffer.from('attachment'));
    mockImapConnect.mockResolvedValue(undefined);
    mockImapList.mockResolvedValue([{ specialUse: '\\Sent', name: 'Sent', path: 'Sent' }]);
    mockImapAppend.mockResolvedValue({ destination: 'Sent', uid: 123 });
    mockImapLogout.mockResolvedValue(undefined);
  });

  it('skips append when another worker already holds the advisory lock', async () => {
    mockPoolConnect.mockResolvedValue(createOutboundClient({ locked: false }));

    const { appendSavedOutboundEmailToSent } = await import('@/lib/imap-client');
    const result = await appendSavedOutboundEmailToSent('email-1');

    expect(result).toEqual({
      saved: false,
      path: null,
      error: null,
      skipped: true,
    });
    expect(mockBuildRawEmail).not.toHaveBeenCalled();
    expect(mockImapAppend).not.toHaveBeenCalled();
  });

  it('reports skipped retries separately from real failures', async () => {
    const selectorClient = createPgClient((sql) => {
      if (sql.includes('SELECT id') && sql.includes('sent_mailbox_status = \'pending\'')) {
        return {
          rows: [{ id: 'email-success' }, { id: 'email-busy' }, { id: 'email-fail' }],
          rowCount: 3,
        };
      }
      throw new Error(`Unexpected selector SQL: ${sql}`);
    });

    const successClient = createOutboundClient({ locked: true });
    const busyClient = createOutboundClient({ locked: false });
    const failureClient = createOutboundClient({ locked: true });

    mockPoolConnect
      .mockResolvedValueOnce(selectorClient)
      .mockResolvedValueOnce(successClient)
      .mockResolvedValueOnce(busyClient)
      .mockResolvedValueOnce(failureClient);

    mockImapAppend
      .mockResolvedValueOnce({ destination: 'Sent', uid: 321 })
      .mockRejectedValueOnce(new Error('IMAP unavailable'));

    const { retryPendingSentMailboxEmails } = await import('@/lib/imap-client');
    const result = await retryPendingSentMailboxEmails(5);

    expect(result).toEqual({
      checked: 3,
      appended: 1,
      failed: 1,
      skipped: 1,
    });
  });
});
