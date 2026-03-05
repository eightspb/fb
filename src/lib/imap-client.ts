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

function createImapClient(): ImapFlow {
  const host = process.env.IMAP_HOST || 'imap.mail.ru';
  const port = parseInt(process.env.IMAP_PORT || '993');

  return new ImapFlow({
    host,
    port,
    secure: true,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASSWORD!,
    },
    logger: false,
  });
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
 * Сохраняет вложения email на диск
 */
async function saveAttachments(
  emailId: string,
  attachments: Attachment[],
  client: any // pg client
): Promise<void> {
  if (!attachments || attachments.length === 0) return;

  // Создаём директорию для вложений этого письма
  const emailDir = join(ATTACHMENTS_DIR, emailId);
  await mkdir(emailDir, { recursive: true });

  for (const attachment of attachments) {
    if (!attachment.content || !attachment.filename) continue;

    const storageKey = join(emailId, attachment.filename);
    const filePath = join(ATTACHMENTS_DIR, storageKey);

    await writeFile(filePath, attachment.content);

    await client.query(
      `INSERT INTO crm_email_attachments (email_id, filename, content_type, size_bytes, storage_key)
       VALUES ($1, $2, $3, $4, $5)`,
      [emailId, attachment.filename, attachment.contentType, attachment.size, storageKey]
    );
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

      // Формируем диапазон UID для загрузки
      const searchRange = lastSyncedUid > 0 ? `${lastSyncedUid + 1}:*` : '1:*';

      let maxUid = lastSyncedUid;

      // Загружаем сообщения
      for await (const message of imapClient.fetch(searchRange, {
        uid: true,
        envelope: true,
        source: true,
      })) {
        // Пропускаем уже обработанные
        if (message.uid <= lastSyncedUid) continue;

        try {
          if (!message.source) continue;
          const parsed: ParsedMail = await simpleParser(message.source) as ParsedMail;

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

          // Вставляем в БД (пропускаем дубликаты по message_id)
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
            // Сохраняем вложения
            if (hasAttachments && parsed.attachments) {
              await saveAttachments(insertResult.rows[0].id, parsed.attachments as Attachment[], pgClient);
            }
          }
        } catch (parseError: any) {
          console.error(`[IMAP] Error parsing message UID ${message.uid}:`, parseError.message);
        }

        if (message.uid > maxUid) {
          maxUid = message.uid;
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

        // Обновляем folder_name в sync_state если нашли реальное имя папки
        if (sentFolder !== 'Sent') {
          const pgClient = await pool.connect();
          try {
            await pgClient.query(
              `UPDATE crm_imap_sync_state SET folder_name = $1 WHERE folder_name = 'Sent'`,
              [sentFolder]
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
       WHERE LOWER(e.contact_email) = LOWER($1)
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
       WHERE LOWER(e.contact_email) = LOWER($1)
       ORDER BY e.sent_at DESC`,
      [contactEmail]
    );
    return result.rows;
  } finally {
    pgClient.release();
  }
}

/**
 * Получает данные вложения для скачивания
 */
export async function getAttachment(attachmentId: string): Promise<CrmEmailAttachment | null> {
  const pgClient = await pool.connect();
  try {
    const result = await pgClient.query(
      'SELECT * FROM crm_email_attachments WHERE id = $1',
      [attachmentId]
    );
    return result.rows[0] || null;
  } finally {
    pgClient.release();
  }
}

/**
 * Возвращает полный путь к файлу вложения на диске
 */
export function getAttachmentFilePath(storageKey: string): string {
  return join(ATTACHMENTS_DIR, storageKey);
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
