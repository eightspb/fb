import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail, type Attachment } from 'mailparser';
import { Pool } from 'pg';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const ATTACHMENTS_DIR = process.env.CRM_ATTACHMENTS_DIR || '/data/crm-attachments';

interface SyncResult {
  synced: number;
  folders: string[];
  errors: string[];
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

const EXISTING_MESSAGE_IDS_CHUNK_SIZE = 1000;

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

function createImapClient(): ImapFlow {
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
    // Таймаут на соединение и команды (мс)
    socketTimeout: 30000,
  });

  // Предотвращаем uncaughtException от socket timeout
  client.on('error', (err: Error) => {
    console.error('[IMAP] Client error (handled):', err.message);
  });

  return client;
}

function getOurEmail(): string {
  return (process.env.SMTP_FROM || process.env.SMTP_USER || '').toLowerCase();
}

/**
 * Определяет contact_email для письма:
 * - Входящее: email отправителя
 * - Исходящее: email первого получателя (кроме нашего)
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

  // Для исходящих — первый получатель, не являющийся нашим адресом
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
  // Fallback для mail.ru
  for (const folder of folders) {
    const name = folder.name.toLowerCase();
    if (name === 'sent' || name === 'отправленные') {
      return folder.path;
    }
  }
  return null;
}

/**
 * Сохраняет метаданные вложений без скачивания файлов.
 * Файл скачивается позже по запросу через API.
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
 * Возвращает путь к файлу.
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

    // Уже скачан
    if (att.storage_key) {
      return { filePath: join(ATTACHMENTS_DIR, att.storage_key), filename: att.filename, contentType: att.content_type };
    }

    // Нет данных для скачивания из IMAP
    if (!att.imap_uid || !att.imap_folder) return null;

    const client = createImapClient();
    await client.connect();

    try {
      const lock = await client.getMailboxLock(att.imap_folder);
      try {
        // Скачиваем только нужное вложение по имени файла
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
 * Синхронизирует одну IMAP-папку
 */
async function syncFolder(
  imapClient: ImapFlow,
  folderName: string,
  direction: 'inbound' | 'outbound'
): Promise<number> {
  const pgClient = await pool.connect();
  let synced = 0;

  try {
    // Получаем состояние синхронизации
    const stateResult = await pgClient.query(
      'SELECT * FROM crm_imap_sync_state WHERE folder_name = $1',
      [folderName]
    );

    let lastUidValidity = stateResult.rows[0]?.last_uid_validity;
    let lastSyncedUid = stateResult.rows[0]?.last_synced_uid || 0;

    // Открываем папку
    const lock = await imapClient.getMailboxLock(folderName);

    try {
      const mailbox = imapClient.mailbox;
      if (!mailbox) {
        console.error(`[IMAP] Failed to open folder: ${folderName}`);
        return 0;
      }

      const currentUidValidity = mailbox.uidValidity;

      // Если UIDVALIDITY сменился — полный ресинк
      if (lastUidValidity && currentUidValidity !== lastUidValidity) {
        console.log(`[IMAP] UIDVALIDITY changed for ${folderName}, resetting sync state`);
        lastSyncedUid = 0;
      }

      console.log(
        `[IMAP] ${folderName}: full envelope scan, total=${mailbox.exists || 0}, lastSyncedUid=${lastSyncedUid}`
      );
      let maxUid = lastSyncedUid;

      // Ручной sync должен уметь добирать старую историю, поэтому сканируем всю папку.
      const envelopes: Array<{ uid: number; messageId: string | undefined }> = [];
      for await (const msg of imapClient.fetch('1:*', {
        uid: true,
        envelope: true,
      })) {
        envelopes.push({ uid: msg.uid, messageId: msg.envelope?.messageId });
        if (msg.uid > maxUid) maxUid = msg.uid;
      }

      console.log(`[IMAP] ${folderName}: got ${envelopes.length} envelopes, maxUid=${maxUid}`);

      // Шаг 2: фильтруем уже существующие в БД по message_id
      const messageIds = envelopes.map(e => e.messageId).filter(Boolean) as string[];
      let existingIds = new Set<string>();

      for (let i = 0; i < messageIds.length; i += EXISTING_MESSAGE_IDS_CHUNK_SIZE) {
        const chunk = messageIds.slice(i, i + EXISTING_MESSAGE_IDS_CHUNK_SIZE);
        if (chunk.length === 0) continue;

        const existing = await pgClient.query(
          `SELECT message_id FROM crm_emails WHERE message_id = ANY($1)`,
          [chunk]
        );

        for (const row of existing.rows) {
          if (row.message_id) existingIds.add(row.message_id);
        }
      }

      // Для писем без message-id используем UID как защиту от повторного импорта.
      const newEnvelopes = envelopes.filter((envelope) => {
        if (envelope.messageId) {
          return !existingIds.has(envelope.messageId);
        }
        return envelope.uid > lastSyncedUid;
      });
      console.log(`[IMAP] ${folderName}: ${newEnvelopes.length} new messages to fetch`);

      for (const env of newEnvelopes) {
        try {
          // Загружаем source отдельным запросом по конкретному UID
          let source: Buffer | undefined;
          for await (const msg of imapClient.fetch({ uid: env.uid }, { uid: true, source: true }, { uid: true })) {
            source = msg.source;
          }
          if (!source) continue;

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
              contact_email, sent_at)
             VALUES ($1, $2, $3, $4, 'email', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (message_id) DO NOTHING
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
            ]
          );

          if (insertResult.rows.length > 0) {
            synced++;
            if (hasAttachments && parsed.attachments) {
              await saveAttachmentMetadata(insertResult.rows[0].id, parsed.attachments as Attachment[], env.uid, folderName, pgClient);
            }
          }
        } catch (fetchError: any) {
          console.error(`[IMAP] Error fetching/parsing UID ${env.uid}:`, fetchError.message);
        }
      }

      // Обновляем состояние синхронизации
      if (maxUid > lastSyncedUid || !lastUidValidity) {
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
 * Синхронизирует INBOX и папку "Отправленные"
 */
export async function syncAll(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, folders: [], errors: [] };

  const client = createImapClient();

  try {
    await client.connect();

    // Синхронизируем INBOX
    try {
      const inboxCount = await syncFolder(client, 'INBOX', 'inbound');
      result.synced += inboxCount;
      result.folders.push('INBOX');
      console.log(`[IMAP] Synced ${inboxCount} emails from INBOX`);
    } catch (error: any) {
      console.error('[IMAP] Error syncing INBOX:', error.message);
      result.errors.push(`INBOX: ${error.message}`);
    }

    // Находим и синхронизируем папку "Отправленные"
    try {
      const sentFolder = await findSentFolder(client);
      if (sentFolder) {
        const sentCount = await syncFolder(client, sentFolder, 'outbound');
        result.synced += sentCount;
        result.folders.push(sentFolder);
        console.log(`[IMAP] Synced ${sentCount} emails from ${sentFolder}`);

        // Удаляем устаревшую запись 'Sent' если реальная папка называется иначе
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
    } catch (error: any) {
      console.error('[IMAP] Error syncing Sent:', error.message);
      result.errors.push(`Sent: ${error.message}`);
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return result;
}

/**
 * Получает все email для указанного контакта
 */
export async function getEmailsForContact(contactEmail: string): Promise<CrmEmail[]> {
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
       FROM crm_emails e
       WHERE ${EMAIL_PARTICIPANT_WHERE}
       ORDER BY e.sent_at DESC`,
      [contactEmail]
    );
    return result.rows;
  } finally {
    pgClient.release();
  }
}

/**
 * Получает email по submission_id (сначала находит email клиента из заявки)
 */
export async function getEmailsForSubmission(submissionId: string): Promise<CrmEmail[]> {
  const pgClient = await pool.connect();
  try {
    const submission = await pgClient.query(
      'SELECT email FROM form_submissions WHERE id = $1',
      [submissionId]
    );

    if (submission.rows.length === 0) {
      return [];
    }

    const contactEmail = submission.rows[0].email;
    // Используем тот же pgClient для следующего запроса
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
       FROM crm_emails e
       WHERE ${EMAIL_PARTICIPANT_WHERE}
       ORDER BY e.sent_at DESC`,
      [contactEmail]
    );
    return result.rows;
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
        submission_id, contact_email, sent_at)
       VALUES ($1, $2, $3, 'outbound', 'email', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
      ]
    );

    const emailId = result.rows[0].id;

    // Сохраняем вложения
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
