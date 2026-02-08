/**
 * API Logger - автоматическое логирование HTTP запросов в API routes
 */

import { NextRequest } from 'next/server';
import { log } from './logger';

/**
 * Логирует входящий HTTP запрос
 * Используйте в начале каждого API route
 */
export function logApiRequest(request: NextRequest, endpoint: string): void {
  const method = request.method;
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  log('info', `${method} ${endpoint}`, {
    method,
    endpoint,
    ip,
    userAgent: userAgent.substring(0, 100), // Обрезаем для экономии места
  }, 'HTTP');
}

/**
 * Логирует успешный ответ API
 */
export function logApiSuccess(endpoint: string, statusCode: number, metadata?: Record<string, any>): void {
  log('info', `✅ ${endpoint} - ${statusCode}`, {
    statusCode,
    ...metadata,
  }, 'API');
}

/**
 * Логирует ошибку API
 */
export function logApiError(endpoint: string, error: any, statusCode: number = 500): void {
  log('error', `❌ ${endpoint} - ${statusCode}: ${error.message || error}`, {
    statusCode,
    error: error.message || String(error),
    stack: error.stack?.substring(0, 500),
  }, 'API');
}

/**
 * Извлекает IP-адрес клиента из запроса
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  return cfConnectingIp || forwardedFor?.split(',')[0]?.trim() || realIp || '127.0.0.1';
}

/**
 * Обёртка для API route handler с автоматическим логированием
 * 
 * @example
 * export const GET = withApiLogging('/api/news', async (request: NextRequest) => {
 *   // ваш код
 *   return NextResponse.json({ data: 'result' });
 * });
 */
export function withApiLogging(
  endpoint: string,
  handler: (request: NextRequest, context?: any) => Promise<Response>
) {
  return async (request: NextRequest, context?: any): Promise<Response> => {
    // Логируем запрос
    logApiRequest(request, endpoint);
    
    try {
      // Выполняем handler
      const response = await handler(request, context);
      
      // Логируем успешный ответ
      if (response.ok || response.status < 400) {
        logApiSuccess(endpoint, response.status);
      } else {
        // Логируем неуспешный статус
        log('warn', `⚠️ ${endpoint} - ${response.status}`, {
          statusCode: response.status,
        }, 'API');
      }
      
      return response;
    } catch (error: any) {
      // Логируем ошибку
      logApiError(endpoint, error);
      throw error; // Пробрасываем ошибку дальше
    }
  };
}
