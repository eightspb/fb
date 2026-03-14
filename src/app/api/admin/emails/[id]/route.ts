import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { deleteEmailById, getEmailById } from '@/lib/imap-client';

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

// GET /api/admin/emails/[id] — полное письмо с body_html/body_text
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const email = await getEmailById(id);

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json(email);
  } catch (error: any) {
    console.error('[CRM Emails] Error fetching email by id:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await deleteEmailById(id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[CRM Emails] Error deleting email by id:', error);

    if (error instanceof Error && error.message === 'Email not found') {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
