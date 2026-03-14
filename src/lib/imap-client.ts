import { ImapFlow, type AppendResponseObject } from 'imapflow';
import { simpleParser, type ParsedMail, type Attachment } from 'mailparser';
import { Pool } from 'pg';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import type Mail from 'nodemailer/lib/mailer';
import { buildRawEmail } from '@/lib/email';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const ATTACHMENTS_DIR = process.env.CRM_ATTACHMENTS_DIR || '/data/crm-attachments';

interface SyncResult {
  synced: number;
  folders: string[];
  errors: string[];
}

export interface SyncProgress {
  folder: string;
  phase: 'incremental' | 'search';
  syncedSoFar: number;
  newInBatch: number;
}

interface CrmEmail {
  id: string;
  message_id: string | null;
  in_reply_to: string | null;
  references_header: string | null;
  direction: 'inbound' | 'outbound';
  channel: string;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[] | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  has_attachments: boolean;
  submission_id: string | null;
  contact_email: string;
  sent_at: string;
  synced_at: string;
  created_at: string;
  attachments?: CrmEmailAttachment[];
}

interface CrmEmailAttachment {
  id: string;
  email_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  storage_key: string;
  created_at: string;
}

interface StoredOutboundEmailAttachment {
  filename: string;
  content_type: string | null;
  storage_key: string | null;
}

interface StoredOutboundEmailRecord {
  id: string;
  message_id: string | null;
  in_reply_to: string | null;
  references_header: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[] | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  sent_at: string;
  direction: 'outbound';
  sent_mailbox_status: 'legacy' | 'pending' | 'synced';
}

interface ImapClientTimeoutOptions {
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
}

interface SentMailboxAppendResult {
  saved: boolean;
  path: string | null;
  error: string | null;
  skipped?: boolean;
}

interface PendingSentMailboxRetryResult {
  checked: number;
  appended: number;
  failed: number;
  skipped: number;
}

const EMAIL_PARTICIPANT_WHERE = `(
  LOWER(e.contact_email) = LOWER($1)
  OR LOWER(e.from_address) = LOWER($1)
  OR EXISTS (
    SELECT 1
    FROM unnest(COALESCE(e.to_addresses, ARRAY[]::text[])) AS addr
    WHERE LOWER(addr) = LOWER($1)
  )
  OR EXISTS (
    SELECT 1
    FROM unnest(COALESCE(e.cc_addresses, ARRAY[]::text[])) AS addr
    WHERE LOWER(addr) = LOWER($1)
  )
)`;

function createImapClient(timeouts: ImapClientTimeoutOptions = {}): ImapFlow {
  const host = process.env.IMAP_HOST || 'imap.mail.ru';
  const port = parseInt(process.env.IMAP_PORT || '993');

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASSWORD!,
    },
    logger: false,
    connectionTimeout: timeouts.connectionTimeout ?? 90000,
    greetingTimeout: timeouts.greetingTimeout ?? 16000,
    socketTimeout: timeouts.socketTimeout ?? 120000,
  });

  client.on('error', (err: Error) => {
    console.error('[IMAP] Client error (handled):', err.message);
  });

  return client;
}

function getOurEmail(): string {
  return (process.env.SMTP_FROM || process.env.SMTP_USER || '').toLowerCase();
}

/**
 * Определяет contact_email для письма
 */
function determineContactEmail(
  direction: 'inbound' | 'outbound',
  fromAddress: string,
  toAddresses: string[]
): string {
  const ourEmail = getOurEmail();

  if (direction === 'inbound') {
    return fromAddress.toLowerCase();
  }

  const contactTo = toAddresses.find(addr => addr.toLowerCase() !== ourEmail);
  return (contactTo || toAddresses[0] || '').toLowerCase();
}

/**
 * Находит папку "Отправленные" по special-use флагу \Sent
 */
async function findSentFolder(client: ImapFlow): Promise<string | null> {
  const folders = await client.list();
  for (const folder of folders) {
    if (folder.specialUse === '\\Sent') {
      return folder.path;
    }
  }
  for (const folder of folders) {
    const name = folder.name.toLowerCase();
    if (name === 'sent' || name === 'отправленные') {
      return folder.path;
    }
  }
  return null;
}

/**
 * Добавляет уже отправленное письмо в реальную IMAP-папку Sent основного ящика.
 */
export async function appendOutboundEmailToSentFolder(
  rawMessage: Buffer,
  sentAt: Date,
  timeouts: ImapClientTimeoutOptions = {}
): Promise<AppendResponseObject | null> {
  const client = createImapClient(timeouts);
  await client.connect();

  try {
    const sentFolder = await findSentFolder(client);
    if (!sentFolder) {
      console.warn('[IMAP] Sent folder not found, skipping append');
      return null;
    }

    const appendResult = await client.append(sentFolder, rawMessage, ['\\Seen'], sentAt);
    return appendResult || null;
  } finally {
    await client.logout().catch(() => {});
  }
}

function formatMailboxAddress(address: string, name?: string | null): string {
  return name ? `${name} <${address}>` : address;
}

async function loadStoredOutboundEmail(
  emailId: string,
  pgClient: any
): Promise<{ email: StoredOutboundEmailRecord; attachments: StoredOutboundEmailAttachment[] } | null> {
  const emailResult = await pgClient.query(
    `SELECT
      id, message_id, in_reply_to, references_header,
      from_address, from_name, to_addresses, cc_addresses,
      subject, body_html, body_text, sent_at, direction, sent_mailbox_status
     FROM crm_emails
     WHERE id = $1 AND direction = 'outbound'`,
    [emailId]
  );

  const email = emailResult.rows[0] as StoredOutboundEmailRecord | undefined;
  if (!email) {
    return null;
  }

  const attachmentsResult = await pgClient.query(
    `SELECT filename, content_type, storage_key
     FROM crm_email_attachments
     WHERE email_id = $1
     ORDER BY created_at ASC, filename ASC`,
    [emailId]
  );

  return {
    email,
    attachments: attachmentsResult.rows as StoredOutboundEmailAttachment[],
  };
}

async function buildRawMessageForStoredOutboundEmail(
  email: StoredOutboundEmailRecord,
  attachments: StoredOutboundEmailAttachment[]
): Promise<Buffer> {
  const mailAttachments = await Promise.all(
    attachments.map(async (attachment) => {
      if (!attachment.storage_key) {
        throw new Error(`Attachment ${attachment.filename} is missing storage_key`);
      }

      return {
        filename: attachment.filename,
        contentType: attachment.content_type || 'application/octet-stream',
        content: await readFile(join(ATTACHMENTS_DIR, attachment.storage_key)),
      };
    })
  );

  const mailOptions: Mail.Options = {
    from: formatMailboxAddress(email.from_address, email.from_name),
    to: email.to_addresses,
    cc: email.cc_addresses || undefined,
    subject: email.subject || undefined,
    text: email.body_text || undefined,
    html: email.body_html || undefined,
    attachments: mailAttachments,
    messageId: email.message_id || undefined,
    date: new Date(email.sent_at),
  };

  if (email.in_reply_to) {
    mailOptions.inReplyTo = email.in_reply_to;
  }

  if (email.references_header) {
    mailOptions.references = email.references_header;
  }

  return buildRawEmail(mailOptions);
}

async function recordSentMailboxAppendSuccess(
  emailId: string,
  appendResult: AppendResponseObject | null,
  pgClient: any
): Promise<void> {
  await pgClient.query(
    `UPDATE crm_emails
     SET sent_mailbox_status = 'synced',
         sent_mailbox_last_error = NULL,
         sent_mailbox_last_attempt_at = NOW(),
         sent_mailbox_synced_at = NOW(),
         sent_mailbox_retry_count = sent_mailbox_retry_count + 1,
         imap_folder = COALESCE($2, imap_folder),
         imap_uid = COALESCE($3, imap_uid)
     WHERE id = $1`,
    [emailId, appendResult?.destination || null, appendResult?.uid || null]
  );
}

async function recordSentMailboxAppendFailure(
  emailId: string,
  errorMessage: string,
  pgClient: any
): Promise<void> {
  await pgClient.query(
    `UPDATE crm_emails
     SET sent_mailbox_status = 'pending',
         sent_mailbox_last_error = $2,
         sent_mailbox_last_attempt_at = NOW(),
         sent_mailbox_retry_count = sent_mailbox_retry_count + 1
     WHERE id = $1`,
    [emailId, errorMessage]
  );
}

async function tryClaimPendingSentMailboxEmail(
  emailId: string,
  pgClient: any
): Promise<'claimed' | 'busy' | 'missing' | 'synced'> {
  const lockResult = await pgClient.query(
    `SELECT pg_try_advisory_xact_lock(
       ('x' || substr(md5($1), 1, 16))::bit(64)::bigint
     ) AS locked`,
    [emailId]
  );

  if (!lockResult.rows[0]?.locked) {
    return 'busy';
  }

  const emailResult = await pgClient.query(
    `SELECT sent_mailbox_status
     FROM crm_emails
     WHERE id = $1 AND direction = 'outbound'`,
    [emailId]
  );

  const email = emailResult.rows[0] as { sent_mailbox_status?: StoredOutboundEmailRecord['sent_mailbox_status'] } | undefined;
  if (!email) {
    return 'missing';
  }

  if (email.sent_mailbox_status === 'synced') {
    return 'synced';
  }

  return 'claimed';
}

export async function appendSavedOutboundEmailToSent(
  emailId: string,
  timeouts: ImapClientTimeoutOptions = {}
): Promise<SentMailboxAppendResult> {
  const pgClient = await pool.connect();
  let inTransaction = false;
  try {
    await pgClient.query('BEGIN');
    inTransaction = true;

    const claimState = await tryClaimPendingSentMailboxEmail(emailId, pgClient);
    if (claimState === 'busy' || claimState === 'synced') {
      await pgClient.query('ROLLBACK');
      inTransaction = false;
      return { saved: false, path: null, error: null, skipped: true };
    }

    if (claimState === 'missing') {
      await pgClient.query('ROLLBACK');
      inTransaction = false;
      return { saved: false, path: null, error: 'Outbound email not found' };
    }

    const stored = await loadStoredOutboundEmail(emailId, pgClient);
    if (!stored) {
      await pgClient.query('ROLLBACK');
      inTransaction = false;
      return { saved: false, path: null, error: 'Outbound email not found' };
    }

    try {
      const rawMessage = await buildRawMessageForStoredOutboundEmail(stored.email, stored.attachments);
      const appendResult = await appendOutboundEmailToSentFolder(
        rawMessage,
        new Date(stored.email.sent_at),
        timeouts
      );

      if (!appendResult) {
        await recordSentMailboxAppendFailure(emailId, 'Sent folder not found', pgClient);
        await pgClient.query('COMMIT');
        inTransaction = false;
        return { saved: false, path: null, error: 'Sent folder not found' };
      }

      await recordSentMailboxAppendSuccess(emailId, appendResult, pgClient);
      await pgClient.query('COMMIT');
      inTransaction = false;
      return { saved: true, path: appendResult.destination, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await recordSentMailboxAppendFailure(emailId, message, pgClient);
      await pgClient.query('COMMIT');
      inTransaction = false;
      return { saved: false, path: null, error: message };
    }
  } catch (error) {
    if (inTransaction) {
      await pgClient.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    pgClient.release();
  }
}

export async function retryPendingSentMailboxEmails(
  limit = 5,
  timeouts: ImapClientTimeoutOptions = {}
): Promise<PendingSentMailboxRetryResult> {
  const pgClient = await pool.connect();
  try {
    const result = await pgClient.query(
      `SELECT id
       FROM crm_emails
       WHERE direction = 'outbound'
         AND sent_mailbox_status = 'pending'
       ORDER BY sent_at ASC
       LIMIT $1`,
      [limit]
    );

    let appended = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of result.rows) {
      const retry = await appendSavedOutboundEmailToSent(row.id, timeouts);
      if (retry.saved) {
        appended += 1;
      } else if (retry.skipped) {
        skipped += 1;
      } else {
        failed += 1;
      }
    }

    return {
      checked: result.rows.length,
      appended,
      failed,
      skipped,
    };
  } finally {
    pgClient.release();
  }
}

/**
 * Сохраняет метаданные вложений без скачивания файлов.
 */
async function saveAttachmentMetadata(
  emailId: string,
  attachments: Attachment[],
  imapUid: number,
  folderName: string,
  pgClient: any
): Promise<void> {
  if (!attachments || attachments.length === 0) return;

  for (const attachment of attachments) {
    if (!attachment.filename) continue;

    await pgClient.query(
      `INSERT INTO crm_email_attachments (email_id, filename, content_type, size_bytes, imap_uid, imap_folder)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [emailId, attachment.filename, attachment.contentType, attachment.size, imapUid, folderName]
    );
  }
}

/**
 * Скачивает файл вложения из IMAP по требованию и сохраняет на диск.
 */
export async function downloadAttachment(attachmentId: string): Promise<{ filePath: string; filename: string; contentType: string | null } | null> {
  const pgClient = await pool.connect();
  try {
    const result = await pgClient.query(
      'SELECT * FROM crm_email_attachments WHERE id = $1',
      [attachmentId]
    );
    const att = result.rows[0];
    if (!att) return null;

    if (att.storage_key) {
      return { filePath: join(ATTACHMENTS_DIR, att.storage_key), filename: att.filename, contentType: att.content_type };
    }

    if (!att.imap_uid || !att.imap_folder) return null;

    const client = createImapClient();
    await client.connect();

    try {
      const lock = await client.getMailboxLock(att.imap_folder);
      try {
        let fileContent: Buffer | null = null;

        for await (const msg of client.fetch({ uid: att.imap_uid }, { source: true }, { uid: true })) {
          if (!msg.source) continue;
          const parsed: ParsedMail = await simpleParser(msg.source) as ParsedMail;
          const found = parsed.attachments?.find(a => a.filename === att.filename);
          if (found?.content) {
            fileContent = found.content as Buffer;
          }
        }

        if (!fileContent) return null;

        const emailDir = join(ATTACHMENTS_DIR, att.email_id);
        await mkdir(emailDir, { recursive: true });
        const storageKey = join(att.email_id, att.filename);
        const filePath = join(ATTACHMENTS_DIR, storageKey);
        await writeFile(filePath, fileContent);

        await pgClient.query(
          'UPDATE crm_email_attachments SET storage_key = $1 WHERE id = $2',
          [storageKey, attachmentId]
        );

        return { filePath, filename: att.filename, contentType: att.content_type };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  } finally {
    pgClient.release();
  }
}

/**
 * Парсит и сохраняет одно письмо из IMAP в БД.
 * Возвращает true если письмо было новое и вставлено.
 */
async function parseAndSaveEmail(
  imapClient: ImapFlow,
  uid: number,
  folderName: string,
  direction: 'inbound' | 'outbound',
  pgClient: any
): Promise<boolean> {
  let source: Buffer | undefined;
  for await (const msg of imapClient.fetch({ uid }, { uid: true, source: true }, { uid: true })) {
    source = msg.source;
  }
  if (!source) return false;

  const parsed: ParsedMail = await simpleParser(source) as ParsedMail;

  const messageId = parsed.messageId || null;
  const fromAddress = parsed.from?.value?.[0]?.address || '';
  const fromName = parsed.from?.value?.[0]?.name || null;

  const toField = parsed.to;
  const toAddresses: string[] = toField
    ? (Array.isArray(toField)
      ? toField.flatMap((t: any) => t.value)
      : toField.value
    ).map((a: any) => a.address || '').filter(Boolean)
    : [];

  const ccField = parsed.cc;
  const ccAddresses: string[] = ccField
    ? (Array.isArray(ccField)
      ? ccField.flatMap((t: any) => t.value)
      : ccField.value
    ).map((a: any) => a.address || '').filter(Boolean)
    : [];

  const contactEmail = determineContactEmail(direction, fromAddress, toAddresses);
  const inReplyTo = typeof parsed.inReplyTo === 'string' ? parsed.inReplyTo : null;
  const refs = parsed.references;
  const referencesHeader = refs
    ? (Array.isArray(refs) ? refs.join(' ') : String(refs))
    : null;

  const hasAttachments = (parsed.attachments?.length || 0) > 0;
  const sentAt = parsed.date || new Date();

  const insertResult = await pgClient.query(
    `INSERT INTO crm_emails
     (message_id, in_reply_to, references_header, direction, channel,
      from_address, from_name, to_addresses, cc_addresses,
      subject, body_html, body_text, has_attachments,
      contact_email, sent_at, imap_uid, imap_folder)
     VALUES ($1, $2, $3, $4, 'email', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      messageId, inReplyTo, referencesHeader, direction,
      fromAddress, fromName,
      toAddresses.length > 0 ? toAddresses : [''],
      ccAddresses.length > 0 ? ccAddresses : null,
      parsed.subject || null,
      parsed.html || null,
      parsed.text || null,
      hasAttachments,
      contactEmail,
      sentAt,
      uid,
      folderName,
    ]
  );

  if (insertResult.rows.length > 0 && hasAttachments && parsed.attachments) {
    await saveAttachmentMetadata(insertResult.rows[0].id, parsed.attachments as Attachment[], uid, folderName, pgClient);
  }

  return insertResult.rows.length > 0;
}

/**
 * Incremental sync — загружает только новые письма (по UID) из одной папки.
 * Быстрый, без backfill.
 */
async function syncFolderIncremental(
  imapClient: ImapFlow,
  folderName: string,
  direction: 'inbound' | 'outbound',
  onProgress?: (progress: SyncProgress) => void
): Promise<number> {
  const pgClient = await pool.connect();
  let synced = 0;

  try {
    const stateResult = await pgClient.query(
      'SELECT * FROM crm_imap_sync_state WHERE folder_name = $1',
      [folderName]
    );

    const lastUidValidity = stateResult.rows[0]?.last_uid_validity;
    let lastSyncedUid = stateResult.rows[0]?.last_synced_uid || 0;

    const lock = await imapClient.getMailboxLock(folderName);

    try {
      const mailbox = imapClient.mailbox;
      if (!mailbox) {
        console.error(`[IMAP] Failed to open folder: ${folderName}`);
        return 0;
      }

      const currentUidValidity = mailbox.uidValidity;

      // Если UIDVALIDITY сменился — сброс
      if (lastUidValidity && currentUidValidity !== lastUidValidity) {
        console.log(`[IMAP] UIDVALIDITY changed for ${folderName}, resetting sync state`);
        lastSyncedUid = 0;
      }

      const totalMessages = mailbox.exists || 0;
      console.log(`[IMAP] ${folderName}: total=${totalMessages}, lastSyncedUid=${lastSyncedUid}`);

      if (totalMessages === 0) {
        // Сохраняем state даже если пусто
        await pgClient.query(
          `INSERT INTO crm_imap_sync_state (folder_name, last_uid_validity, last_synced_uid, last_sync_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (folder_name) DO UPDATE SET
             last_uid_validity = $2,
             last_synced_uid = $3,
             last_sync_at = NOW(),
             updated_at = NOW()`,
          [folderName, currentUidValidity, lastSyncedUid]
        );
        return 0;
      }

      // Fetch только новых писем по UID
      const range = lastSyncedUid > 0 ? `${lastSyncedUid + 1}:*` : '1:*';
      const envelopes: Array<{ uid: number; messageId: string | undefined }> = [];

      for await (const msg of imapClient.fetch(range, { uid: true, envelope: true }, { uid: true })) {
        envelopes.push({ uid: msg.uid, messageId: msg.envelope?.messageId });
      }

      if (envelopes.length === 0) {
        console.log(`[IMAP] ${folderName}: no new messages`);
      } else {
        // Проверяем какие уже есть в БД
        const messageIds = envelopes.map(e => e.messageId).filter(Boolean) as string[];
        const existingIds = new Set<string>();
        const existingUids = new Set<number>();

        if (messageIds.length > 0) {
          const existing = await pgClient.query(
            `SELECT message_id FROM crm_emails WHERE message_id = ANY($1)`,
            [messageIds]
          );
          for (const row of existing.rows) {
            if (row.message_id) existingIds.add(row.message_id);
          }
        }

        const uids = envelopes.map(e => e.uid);
        if (uids.length > 0) {
          const existingByUid = await pgClient.query(
            `SELECT imap_uid FROM crm_emails WHERE imap_folder = $1 AND imap_uid = ANY($2::bigint[])`,
            [folderName, uids]
          );
          for (const row of existingByUid.rows) {
            if (row.imap_uid != null) existingUids.add(Number(row.imap_uid));
          }
        }

        const newEnvelopes = envelopes.filter(env => {
          if (existingUids.has(env.uid)) return false;
          if (env.messageId && existingIds.has(env.messageId)) return false;
          return true;
        });

        console.log(`[IMAP] ${folderName}: incremental found=${envelopes.length} new=${newEnvelopes.length}`);

        for (const env of newEnvelopes) {
          try {
            const saved = await parseAndSaveEmail(imapClient, env.uid, folderName, direction, pgClient);
            if (saved) synced++;
          } catch (fetchError: any) {
            console.error(`[IMAP] Error fetching UID ${env.uid}:`, fetchError.message);
          }
        }
      }

      // Обновляем state
      const maxUid = envelopes.length > 0
        ? Math.max(lastSyncedUid, ...envelopes.map(e => e.uid))
        : lastSyncedUid;

      await pgClient.query(
        `INSERT INTO crm_imap_sync_state (folder_name, last_uid_validity, last_synced_uid, last_sync_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (folder_name) DO UPDATE SET
           last_uid_validity = $2,
           last_synced_uid = $3,
           last_sync_at = NOW(),
           updated_at = NOW()`,
        [folderName, currentUidValidity, maxUid > 0 ? maxUid : lastSyncedUid]
      );

      if (onProgress) {
        onProgress({
          folder: folderName,
          phase: 'incremental',
          syncedSoFar: synced,
          newInBatch: synced,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    pgClient.release();
  }

  return synced;
}

/**
 * Возвращает MAX(imap_uid) из crm_emails для данного контакта и папки.
 * Используется для incremental IMAP SEARCH — ищем только письма новее этого UID.
 */
async function getMaxUidForContact(
  pgClient: any,
  contactEmail: string,
  folderName: string
): Promise<number> {
  const result = await pgClient.query(
    `SELECT MAX(imap_uid) as max_uid FROM crm_emails
     WHERE imap_folder = $1 AND (
       LOWER(contact_email) = LOWER($2)
       OR LOWER(from_address) = LOWER($2)
       OR EXISTS (
         SELECT 1 FROM unnest(COALESCE(to_addresses, ARRAY[]::text[])) AS addr
         WHERE LOWER(addr) = LOWER($2)
       )
     )`,
    [folderName, contactEmail]
  );
  return Number(result.rows[0]?.max_uid) || 0;
}

/**
 * On-demand поиск писем для конкретного email-адреса через IMAP SEARCH.
 * Ищет в INBOX и Sent, загружает только найденные письма которых нет в БД.
 * Incremental: если письма уже есть в БД, ищет только с UID > MAX(imap_uid).
 */
export async function searchAndSyncByEmail(
  contactEmail: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<{ synced: number; errors: string[] }> {
  let totalSynced = 0;
  const errors: string[] = [];

  async function searchFolder(
    folderName: string,
    direction: 'inbound' | 'outbound'
  ): Promise<number> {
    const client = createImapClient();
    await client.connect();
    let synced = 0;

    try {
      const lock = await client.getMailboxLock(folderName);

      try {
        // Получаем MAX(imap_uid) для этого контакта в этой папке
        const pgClient = await pool.connect();
        let maxUid = 0;
        try {
          maxUid = await getMaxUidForContact(pgClient, contactEmail, folderName);
        } finally {
          pgClient.release();
        }

        console.log(`[IMAP] ${folderName}: incremental search for ${contactEmail}, maxUid=${maxUid}`);

        // IMAP SEARCH: ищем письма FROM или TO этого адреса
        // Если maxUid > 0 — добавляем фильтр UID (только новые)
        const uidFilter = maxUid > 0 ? { uid: `${maxUid + 1}:*` } : {};

        const fromResult = await client.search(
          { ...uidFilter, from: contactEmail },
          { uid: true }
        );
        const toResult = await client.search(
          { ...uidFilter, to: contactEmail },
          { uid: true }
        );

        const fromUids = Array.isArray(fromResult) ? fromResult : [];
        const toUids = Array.isArray(toResult) ? toResult : [];

        // Объединяем, дедуплицируем и фильтруем UID <= maxUid
        // (на случай если сервер игнорирует UID filter в SEARCH)
        const allUids = [...new Set([...fromUids, ...toUids])].filter(uid => uid > maxUid);

        if (allUids.length === 0) {
          console.log(`[IMAP] ${folderName}: no new messages for ${contactEmail} (maxUid=${maxUid})`);
          if (onProgress) {
            onProgress({ folder: folderName, phase: 'search', syncedSoFar: totalSynced, newInBatch: 0 });
          }
          return 0;
        }

        console.log(`[IMAP] ${folderName}: SEARCH found ${allUids.length} new messages for ${contactEmail}`);

        // Проверяем какие уже есть в БД по imap_uid (дополнительная защита от дублей)
        const pgClient2 = await pool.connect();
        try {
          const existingByUid = await pgClient2.query(
            `SELECT imap_uid FROM crm_emails WHERE imap_folder = $1 AND imap_uid = ANY($2::bigint[])`,
            [folderName, allUids]
          );
          const existingUids = new Set(existingByUid.rows.map((r: any) => Number(r.imap_uid)));
          const newUids = allUids.filter(uid => !existingUids.has(uid));

          console.log(`[IMAP] ${folderName}: ${newUids.length} new messages to fetch for ${contactEmail}`);

          for (const uid of newUids) {
            try {
              const saved = await parseAndSaveEmail(client, uid, folderName, direction, pgClient2);
              if (saved) synced++;
            } catch (fetchError: any) {
              console.error(`[IMAP] Error fetching UID ${uid}:`, fetchError.message);
            }
          }
        } finally {
          pgClient2.release();
        }

        if (onProgress) {
          onProgress({
            folder: folderName,
            phase: 'search',
            syncedSoFar: totalSynced + synced,
            newInBatch: synced,
          });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }

    return synced;
  }

  // Поиск в INBOX
  try {
    totalSynced += await searchFolder('INBOX', 'inbound');
  } catch (error: any) {
    console.error('[IMAP] Error searching INBOX:', error.message);
    errors.push(`INBOX: ${error.message}`);
  }

  // Поиск в Sent
  try {
    const sentClient = createImapClient();
    await sentClient.connect();
    try {
      const sentFolder = await findSentFolder(sentClient);
      await sentClient.logout().catch(() => {});

      if (sentFolder) {
        totalSynced += await searchFolder(sentFolder, 'outbound');
      }
    } catch (error: any) {
      await sentClient.logout().catch(() => {});
      throw error;
    }
  } catch (error: any) {
    console.error('[IMAP] Error searching Sent:', error.message);
    errors.push(`Sent: ${error.message}`);
  }

  // Обновляем last_sync_at для папок — фиксируем что поиск был выполнен
  try {
    const pgClient = await pool.connect();
    try {
      await pgClient.query(
        `UPDATE crm_imap_sync_state SET last_sync_at = NOW(), updated_at = NOW()
         WHERE folder_name IN ('INBOX', 'Sent')`
      );
    } finally {
      pgClient.release();
    }
  } catch {
    // не критично, не прерываем
  }

  return { synced: totalSynced, errors };
}

/**
 * Быстрый incremental sync — только новые письма с последнего UID.
 * Никакого backfill.
 */
export async function syncAll(onProgress?: (progress: SyncProgress) => void): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, folders: [], errors: [] };

  // INBOX
  try {
    const inboxClient = createImapClient();
    await inboxClient.connect();
    try {
      const inboxCount = await syncFolderIncremental(inboxClient, 'INBOX', 'inbound', onProgress);
      result.synced += inboxCount;
      result.folders.push('INBOX');
      console.log(`[IMAP] Synced ${inboxCount} new emails from INBOX`);
    } finally {
      await inboxClient.logout().catch(() => {});
    }
  } catch (error: any) {
    console.error('[IMAP] Error syncing INBOX:', error.message);
    result.errors.push(`INBOX: ${error.message}`);
  }

  // Sent
  try {
    const sentClient = createImapClient();
    await sentClient.connect();
    try {
      const sentFolder = await findSentFolder(sentClient);
      if (sentFolder) {
        const sentCount = await syncFolderIncremental(sentClient, sentFolder, 'outbound', onProgress);
        result.synced += sentCount;
        result.folders.push(sentFolder);
        console.log(`[IMAP] Synced ${sentCount} new emails from ${sentFolder}`);

        if (sentFolder !== 'Sent') {
          const pgClient = await pool.connect();
          try {
            await pgClient.query(
              `DELETE FROM crm_imap_sync_state WHERE folder_name = 'Sent'`
            );
          } finally {
            pgClient.release();
          }
        }
      } else {
        console.warn('[IMAP] Sent folder not found');
        result.errors.push('Sent folder not found');
      }
    } finally {
      await sentClient.logout().catch(() => {});
    }
  } catch (error: any) {
    console.error('[IMAP] Error syncing Sent:', error.message);
    result.errors.push(`Sent: ${error.message}`);
  }

  try {
    const retried = await retryPendingSentMailboxEmails(10, {
      connectionTimeout: 10000,
      greetingTimeout: 7000,
      socketTimeout: 15000,
    });
    if (retried.appended > 0) {
      console.log(`[IMAP] Retried pending Sent copies: ${retried.appended}/${retried.checked}`);
    }
    if (retried.failed > 0) {
      result.errors.push(`Pending Sent retries failed: ${retried.failed}`);
    }
  } catch (error: any) {
    console.error('[IMAP] Error retrying pending Sent copies:', error.message);
    result.errors.push(`Pending Sent retries: ${error.message}`);
  }

  return result;
}

// Список писем — без body_html/body_text (только первые 200 символов body_text для превью)
const EMAIL_LIST_QUERY = `SELECT
  e.id, e.message_id, e.in_reply_to, e.references_header,
  e.direction, e.channel,
  e.from_address, e.from_name,
  e.to_addresses, e.cc_addresses,
  e.subject,
  LEFT(e.body_text, 200) as body_text_preview,
  e.has_attachments, e.submission_id, e.contact_email,
  e.sent_at, e.synced_at, e.created_at,
  COALESCE(
    (SELECT json_agg(json_build_object(
      'id', a.id,
      'email_id', a.email_id,
      'filename', a.filename,
      'content_type', a.content_type,
      'size_bytes', a.size_bytes,
      'storage_key', a.storage_key,
      'created_at', a.created_at
    )) FROM crm_email_attachments a WHERE a.email_id = e.id),
    '[]'::json
  ) as attachments
 FROM crm_emails e
 WHERE ${EMAIL_PARTICIPANT_WHERE}
 ORDER BY e.sent_at DESC
 LIMIT $2 OFFSET $3`;

const EMAIL_COUNT_QUERY = `SELECT COUNT(*) as total FROM crm_emails e WHERE ${EMAIL_PARTICIPANT_WHERE}`;

export interface EmailPage {
  emails: CrmEmail[];
  total: number;
}

/**
 * Получает email для указанного контакта с пагинацией (без body — только превью)
 */
export async function getEmailsForContact(
  contactEmail: string,
  limit = 50,
  offset = 0
): Promise<EmailPage> {
  const [result, countResult] = await Promise.all([
    pool.query(EMAIL_LIST_QUERY, [contactEmail, limit, offset]),
    pool.query(EMAIL_COUNT_QUERY, [contactEmail]),
  ]);

  return {
    emails: result.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
}

/**
 * Получает email по submission_id (без body — только превью)
 */
export async function getEmailsForSubmission(
  submissionId: string,
  limit = 50,
  offset = 0
): Promise<EmailPage> {
  const pgClient = await pool.connect();
  try {
    const submission = await pgClient.query(
      'SELECT email FROM form_submissions WHERE id = $1',
      [submissionId]
    );

    if (submission.rows.length === 0) {
      return { emails: [], total: 0 };
    }

    const contactEmail = submission.rows[0].email;
    const [result, countResult] = await Promise.all([
      pool.query(EMAIL_LIST_QUERY, [contactEmail, limit, offset]),
      pool.query(EMAIL_COUNT_QUERY, [contactEmail]),
    ]);
    return {
      emails: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
    };
  } finally {
    pgClient.release();
  }
}

/**
 * Серверный текстовый поиск по письмам контакта (ILIKE по subject, body_text, from_address)
 */
export async function searchEmailsForContact(
  contactEmail: string,
  query: string,
  limit = 200
): Promise<CrmEmail[]> {
  const pgClient = await pool.connect();
  try {
    const q = `%${query}%`;
    const result = await pgClient.query(
      `SELECT
        e.id, e.message_id, e.in_reply_to, e.references_header,
        e.direction, e.channel,
        e.from_address, e.from_name,
        e.to_addresses, e.cc_addresses,
        e.subject,
        LEFT(e.body_text, 200) as body_text_preview,
        e.has_attachments, e.submission_id, e.contact_email,
        e.sent_at, e.synced_at, e.created_at,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', a.id, 'email_id', a.email_id, 'filename', a.filename,
            'content_type', a.content_type, 'size_bytes', a.size_bytes,
            'storage_key', a.storage_key, 'created_at', a.created_at
          )) FROM crm_email_attachments a WHERE a.email_id = e.id),
          '[]'::json
        ) as attachments
       FROM crm_emails e
       WHERE ${EMAIL_PARTICIPANT_WHERE}
         AND (
           e.subject ILIKE $2
           OR e.body_text ILIKE $2
           OR e.from_address ILIKE $2
           OR e.from_name ILIKE $2
           OR EXISTS (
             SELECT 1 FROM unnest(COALESCE(e.to_addresses, ARRAY[]::text[])) AS addr
             WHERE addr ILIKE $2
           )
         )
       ORDER BY e.sent_at DESC
       LIMIT $3`,
      [contactEmail, q, limit]
    );
    return result.rows;
  } finally {
    pgClient.release();
  }
}

/**
 * Получает полное письмо по ID (включая body_html и body_text)
 */
export async function getEmailById(emailId: string): Promise<CrmEmail | null> {
  const pgClient = await pool.connect();
  try {
    const result = await pgClient.query(
      `SELECT e.*,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', a.id,
            'email_id', a.email_id,
            'filename', a.filename,
            'content_type', a.content_type,
            'size_bytes', a.size_bytes,
            'storage_key', a.storage_key,
            'created_at', a.created_at
          )) FROM crm_email_attachments a WHERE a.email_id = e.id),
          '[]'::json
        ) as attachments
       FROM crm_emails e WHERE e.id = $1`,
      [emailId]
    );
    return result.rows[0] || null;
  } finally {
    pgClient.release();
  }
}

/**
 * Сохраняет отправленное из админки письмо в БД
 */
export async function saveOutboundEmail(params: {
  messageId: string;
  inReplyTo?: string;
  references?: string;
  fromAddress: string;
  fromName?: string;
  toAddresses: string[];
  ccAddresses?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  submissionId?: string;
  sentAt: Date;
  sentMailboxStatus?: 'legacy' | 'pending' | 'synced';
  attachments?: Array<{ filename: string; contentType: string; sizeBytes: number; content: Buffer }>;
}): Promise<CrmEmail> {
  const pgClient = await pool.connect();
  try {
    const contactEmail = determineContactEmail('outbound', params.fromAddress, params.toAddresses);
    const hasAttachments = (params.attachments?.length || 0) > 0;

    const result = await pgClient.query(
      `INSERT INTO crm_emails
       (message_id, in_reply_to, references_header, direction, channel,
        from_address, from_name, to_addresses, cc_addresses,
        subject, body_html, body_text, has_attachments,
        submission_id, contact_email, sent_at, sent_mailbox_status)
       VALUES ($1, $2, $3, 'outbound', 'email', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        params.messageId,
        params.inReplyTo || null,
        params.references || null,
        params.fromAddress,
        params.fromName || null,
        params.toAddresses,
        params.ccAddresses && params.ccAddresses.length > 0 ? params.ccAddresses : null,
        params.subject,
        params.bodyHtml,
        params.bodyText || null,
        hasAttachments,
        params.submissionId || null,
        contactEmail,
        params.sentAt,
        params.sentMailboxStatus || 'legacy',
      ]
    );

    const emailId = result.rows[0].id;

    if (params.attachments && params.attachments.length > 0) {
      const emailDir = join(ATTACHMENTS_DIR, emailId);
      await mkdir(emailDir, { recursive: true });

      for (const att of params.attachments) {
        const storageKey = join(emailId, att.filename);
        const filePath = join(ATTACHMENTS_DIR, storageKey);
        await writeFile(filePath, att.content);

        await pgClient.query(
          `INSERT INTO crm_email_attachments (email_id, filename, content_type, size_bytes, storage_key)
           VALUES ($1, $2, $3, $4, $5)`,
          [emailId, att.filename, att.contentType, att.sizeBytes, storageKey]
        );
      }
    }

    return result.rows[0];
  } finally {
    pgClient.release();
  }
}

/**
 * Получает время последней синхронизации
 */
export async function getLastSyncTime(): Promise<string | null> {
  const pgClient = await pool.connect();
  try {
    const result = await pgClient.query(
      'SELECT MAX(last_sync_at) as last_sync FROM crm_imap_sync_state'
    );
    return result.rows[0]?.last_sync || null;
  } finally {
    pgClient.release();
  }
}
