import { NextRequest } from 'next/server';
import logEventBus, { LOG_EVENT } from '@/lib/log-event-bus';
import type { LogEntry } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function hasValidAdminSession(request: NextRequest): Promise<boolean> {
  const adminSession = request.cookies.get('admin-session')?.value;
  if (!adminSession) {
    return false;
  }

  return verifyToken(adminSession);
}

/**
 * GET /api/admin/logs/stream
 * Server-Sent Events stream — events are pushed instantly when logs are written.
 */
export async function GET(request: NextRequest) {
  if (!(await hasValidAdminSession(request))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // client disconnected
        }
      };

      send({ type: 'connected', timestamp: new Date().toISOString() });

      const onLog = (log: LogEntry) => {
        send({
          type: 'log',
          data: {
            id: log.id ?? `${Date.now()}-${Math.random()}`,
            level: log.level,
            message: log.message,
            context: log.context,
            metadata: log.metadata,
            ip: log.ip,
            userAgent: log.userAgent,
            path: log.path,
            timestamp: log.timestamp,
          },
        });
      };

      logEventBus.on(LOG_EVENT, onLog);

      // Heartbeat every 30s to keep the connection alive
      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', timestamp: new Date().toISOString() });
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        logEventBus.off(LOG_EVENT, onLog);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
