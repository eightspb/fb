import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { retryPendingSentMailboxEmails } from '@/lib/imap-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

export async function POST() {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await retryPendingSentMailboxEmails(5, {
      connectionTimeout: 10000,
      greetingTimeout: 7000,
      socketTimeout: 15000,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[CRM Emails] Pending Sent retry error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
