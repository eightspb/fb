import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createEmailTransporter, generateMessageId, getSenderAddress, getSenderEmail, getSenderName } from '@/lib/email';
import { appendSavedOutboundEmailToSent, saveOutboundEmail } from '@/lib/imap-client';
import type Mail from 'nodemailer/lib/mailer';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const COOKIE_NAME = 'admin-session';

async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();

    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const bodyHtml = formData.get('body_html') as string;
    const bodyText = formData.get('body_text') as string | null;
    const submissionId = formData.get('submission_id') as string | null;
    const inReplyTo = formData.get('in_reply_to') as string | null;
    const referencesHeader = formData.get('references') as string | null;

    if (!to || !subject || !bodyHtml) {
      return NextResponse.json(
        { error: 'Fields to, subject, body_html are required' },
        { status: 400 }
      );
    }

    // Собираем вложения из FormData
    const attachmentFiles: Array<{ filename: string; contentType: string; sizeBytes: number; content: Buffer }> = [];
    const nodemailerAttachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];

    const entries = Array.from(formData.entries());
    for (const [key, value] of entries) {
      if (key === 'attachments' && value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer());
        const att = {
          filename: value.name,
          contentType: value.type || 'application/octet-stream',
          sizeBytes: buffer.length,
          content: buffer,
        };
        attachmentFiles.push(att);
        nodemailerAttachments.push({
          filename: att.filename,
          content: buffer,
          contentType: att.contentType,
        });
      }
    }

    const fromEmail = getSenderEmail();
    const fromName = getSenderName();
    const fromAddress = getSenderAddress();
    const transporter = createEmailTransporter();
    const sentAt = new Date();
    const messageId = generateMessageId(fromEmail);

    // Формируем заголовки для threading
    const mailOptions: Mail.Options = {
      from: fromAddress,
      to,
      subject,
      text: bodyText || undefined,
      html: bodyHtml,
      attachments: nodemailerAttachments,
      messageId,
      date: sentAt,
    };

    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
      mailOptions.references = referencesHeader || inReplyTo;
    }

    // Отправляем через nodemailer
    await transporter.sendMail(mailOptions);

    // Сохраняем в БД
    const saved = await saveOutboundEmail({
      messageId,
      inReplyTo: inReplyTo || undefined,
      references: referencesHeader || inReplyTo || undefined,
      fromAddress: fromEmail,
      fromName,
      toAddresses: [to],
      subject,
      bodyHtml,
      bodyText: bodyText || undefined,
      submissionId: submissionId || undefined,
      sentAt,
      sentMailboxStatus: 'pending',
      attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined,
    });

    const sentAppend = await appendSavedOutboundEmailToSent(saved.id, {
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });

    if (sentAppend.error) {
      console.error('[CRM Emails] Failed to append message to IMAP Sent:', sentAppend.error);
    }

    return NextResponse.json({
      success: true,
      email: saved,
      sentFolderSaved: sentAppend.saved,
      sentFolderPath: sentAppend.path,
      sentFolderError: sentAppend.error,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CRM Emails] Send error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
