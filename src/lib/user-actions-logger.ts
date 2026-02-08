/**
 * Модуль для логирования действий пользователей
 * Используется в API endpoints для записи всех важных событий
 */

import { NextRequest } from 'next/server';
import { log } from './logger';

/**
 * Извлекает IP адрес из запроса
 */
function getIpFromRequest(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  return cfConnectingIp || forwardedFor?.split(',')[0]?.trim() || realIp || '127.0.0.1';
}

/**
 * Логирует успешную операцию с данными
 */
export function logDataAction(
  request: NextRequest,
  action: 'create' | 'update' | 'delete',
  resourceType: string,
  resourceId: string | number,
  details?: Record<string, any>
) {
  const ip = getIpFromRequest(request);
  const method = request.method;
  const path = request.nextUrl.pathname;
  
  const actionMessages = {
    create: 'Создан',
    update: 'Обновлён',
    delete: 'Удалён',
  };
  
  log('info', `${actionMessages[action]} ${resourceType} #${resourceId}`, {
    action,
    resourceType,
    resourceId,
    method,
    path,
    ip,
    ...details,
  }, 'UserAction');
}

/**
 * Логирует попытку несанкционированного доступа
 */
export function logUnauthorizedAttempt(
  request: NextRequest,
  reason: string
) {
  const ip = getIpFromRequest(request);
  const path = request.nextUrl.pathname;
  
  log('warn', `Попытка несанкционированного доступа: ${reason}`, {
    path,
    ip,
    reason,
  }, 'Security');
}

/**
 * Логирует ошибку API
 */
export function logApiError(
  request: NextRequest,
  error: Error,
  context?: string
) {
  const ip = getIpFromRequest(request);
  const path = request.nextUrl.pathname;
  
  log('error', `API Error: ${error.message}`, {
    path,
    ip,
    error: error.message,
    stack: error.stack?.substring(0, 500),
    context,
  }, 'API');
}

/**
 * Логирует отправку email
 */
export function logEmailSent(
  to: string,
  subject: string,
  success: boolean,
  error?: string
) {
  log(success ? 'info' : 'error', `Email ${success ? 'отправлен' : 'не отправлен'}: ${subject}`, {
    to,
    subject,
    success,
    error,
  }, 'Email');
}

/**
 * Логирует действия с формами
 */
export function logFormSubmission(
  request: NextRequest,
  formType: string,
  success: boolean,
  data?: Record<string, any>
) {
  const ip = getIpFromRequest(request);
  
  log(success ? 'info' : 'warn', `Отправка формы ${formType}: ${success ? 'успех' : 'ошибка'}`, {
    formType,
    success,
    ip,
    ...data,
  }, 'Form');
}

/**
 * Логирует экспорт данных
 */
export function logDataExport(
  request: NextRequest,
  exportType: string,
  recordsCount: number
) {
  const ip = getIpFromRequest(request);
  
  log('info', `Экспорт данных: ${exportType}`, {
    exportType,
    recordsCount,
    ip,
  }, 'Export');
}
