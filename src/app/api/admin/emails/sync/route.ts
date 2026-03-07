import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { syncAll, getLastSyncTime, type SyncProgress } from '@/lib/imap-client';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min для длинных sync

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

// GET — SSE streaming sync с прогрессом
export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: any) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        }

        try {
          const result = await syncAll((progress: SyncProgress) => {
            send('progress', progress);
          });

          const lastSyncAt = await getLastSyncTime();
          send('done', {
            synced: result.synced,
            folders: result.folders,
            errors: result.errors,
            lastSyncAt,
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
    console.error('[CRM Emails] SSE sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — обычный sync (для обратной совместимости)
export async function POST() {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncAll();
    const lastSyncAt = await getLastSyncTime();

    return NextResponse.json({
      synced: result.synced,
      folders: result.folders,
      errors: result.errors,
      lastSyncAt,
    });
  } catch (error: any) {
    console.error('[CRM Emails] Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
