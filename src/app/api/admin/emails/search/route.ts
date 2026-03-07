import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { searchAndSyncByEmail, type SyncProgress } from '@/lib/imap-client';

export const runtime = 'nodejs';
export const maxDuration = 120;

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

// GET /api/admin/emails/search?email=user@example.com
// SSE streaming: ищет письма в IMAP для конкретного email-адреса
export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'email parameter is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: any) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        }

        try {
          const result = await searchAndSyncByEmail(email, (progress: SyncProgress) => {
            send('progress', progress);
          });

          send('done', {
            synced: result.synced,
            errors: result.errors,
          });
        } catch (error: any) {
          send('error', { message: error.message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[CRM Emails] Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
