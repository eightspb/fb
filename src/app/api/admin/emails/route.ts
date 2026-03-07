import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getEmailsForContact, getEmailsForSubmission, getLastSyncTime, searchEmailsForContact } from '@/lib/imap-client';

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

export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactEmail = searchParams.get('contact_email');
    const submissionId = searchParams.get('submission_id');

    if (!contactEmail && !submissionId) {
      return NextResponse.json(
        { error: 'Either contact_email or submission_id is required' },
        { status: 400 }
      );
    }

    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50));
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
    const textQuery = searchParams.get('q')?.trim() || '';

    // Если передан q — делаем серверный текстовый поиск
    if (textQuery && contactEmail) {
      const emails = await searchEmailsForContact(contactEmail, textQuery);
      const lastSyncAt = await getLastSyncTime();
      return NextResponse.json({ emails, total: emails.length, lastSyncAt });
    }

    let page;
    if (submissionId) {
      page = await getEmailsForSubmission(submissionId, limit, offset);
    } else {
      page = await getEmailsForContact(contactEmail!, limit, offset);
    }

    const lastSyncAt = await getLastSyncTime();

    return NextResponse.json({ emails: page.emails, total: page.total, lastSyncAt });
  } catch (error: any) {
    console.error('[CRM Emails] Error fetching emails:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
