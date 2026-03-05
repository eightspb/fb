import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getAttachment, getAttachmentFilePath } from '@/lib/imap-client';
import { readFile } from 'fs/promises';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attachmentId } = await params;

    const attachment = await getAttachment(attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const filePath = getAttachmentFilePath(attachment.storage_key);

    try {
      const fileContent = await readFile(filePath);

      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': attachment.content_type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
          'Content-Length': String(fileContent.length),
        },
      });
    } catch {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('[CRM Emails] Attachment download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
