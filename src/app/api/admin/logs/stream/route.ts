import { NextRequest } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

/**
 * GET /api/admin/logs/stream
 * Server-Sent Events поток для получения логов в реальном времени
 */
export async function GET(request: NextRequest) {
  // Проверка авторизации
  const adminSession = request.cookies.get('admin-session')?.value;
  if (!adminSession) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Создаем поток SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Функция для отправки данных
      const send = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Отправляем начальное сообщение
      send({ type: 'connected', timestamp: new Date().toISOString() });

      let lastId: string | null = null;
      let isActive = true;

      // Функция для проверки новых логов
      const checkNewLogs = async () => {
        if (!isActive) return;

        try {
          const client = await pool.connect();
          try {
            let query = 'SELECT id, level, message, context, metadata, ip_address, user_agent, path, created_at FROM app_logs';
            const params: any[] = [];
            let paramIndex = 1;
            
            if (lastId) {
              query += ` WHERE created_at > (SELECT created_at FROM app_logs WHERE id = $${paramIndex})`;
              params.push(lastId);
              paramIndex++;
            }
            
            query += ` ORDER BY created_at ASC LIMIT 50`;
            
            const result = await client.query(query, params);
            
            if (result.rows.length > 0) {
              // Отправляем новые логи
              for (const row of result.rows) {
                const log = {
                  id: row.id,
                  level: row.level,
                  message: row.message,
                  context: row.context,
                  metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
                  ip: row.ip_address,
                  userAgent: row.user_agent,
                  path: row.path,
                  timestamp: row.created_at,
                };
                send({ type: 'log', data: log });
                lastId = log.id;
              }
            }
          } finally {
            client.release();
          }
        } catch (error) {
          console.error('[SSE] Ошибка получения логов:', error);
          send({ type: 'error', message: 'Ошибка получения логов' });
        }
      };

      // Проверяем новые логи каждые 500мс
      const interval = setInterval(checkNewLogs, 500);
      
      // Отправляем heartbeat каждые 30 секунд
      const heartbeat = setInterval(() => {
        if (isActive) {
          send({ type: 'heartbeat', timestamp: new Date().toISOString() });
        }
      }, 30000);

      // Обработка закрытия соединения
      request.signal.addEventListener('abort', () => {
        isActive = false;
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      });

      // Начальная загрузка последних логов
      await checkNewLogs();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Отключаем буферизацию в nginx
    },
  });
}
