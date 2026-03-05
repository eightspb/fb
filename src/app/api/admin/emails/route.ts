import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getEmailsForContact, getEmailsForSubmission, getLastSyncTime } from '@/lib/imap-client';

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

    let emails;
    if (submissionId) {
      emails = await getEmailsForSubmission(submissionId);
    } else {
      emails = await getEmailsForContact(contactEmail!);
    }

    const lastSyncAt = await getLastSyncTime();

    return NextResponse.json({ emails, lastSyncAt });
  } catch (error: any) {
    console.error('[CRM Emails] Error fetching emails:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
