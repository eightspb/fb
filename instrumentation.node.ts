/**
 * Node.js-specific error handlers
 * Этот файл импортируется только в Node.js runtime
 */

import type { notifyAdminAboutError as NotifyFn } from './src/lib/telegram-notifications';

/**
 * Инициализирует Node.js специфичные обработчики ошибок
 */
export async function initializeNodeErrorHandlers() {
  const { notifyAdminAboutError } = await import('./src/lib/telegram-notifications');

  console.log('[INSTRUMENTATION] 🔧 Инициализация Node.js обработчиков ошибок...');

  // Проверяет, является ли ошибка некритичной (например, Server Action ошибки)
  const isNonCriticalError = (error: Error | string): boolean => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? '' : error.stack || '';
    
    // Игнорируем ошибки Server Actions - они не критичны
    if (errorMessage.includes('Failed to find Server Action') ||
        errorMessage.includes('Server Action') && errorMessage.includes('not found')) {
      return true;
    }
    
    // Игнорируем ошибки связанные с кешированием Next.js
    if (errorMessage.includes('This request might be from an older or newer dep')) {
      return true;
    }
    
    return false;
  };

  // Обработчик необработанных исключений
  process.on('uncaughtException', (error: Error) => {
    // Пропускаем некритичные ошибки (например, Server Actions)
    if (isNonCriticalError(error)) {
      console.warn('[INSTRUMENTATION] ⚠️  Некритичная ошибка (игнорируется):', error.message);
      return;
    }
    
    console.error('[INSTRUMENTATION] ❌ Необработанное исключение:', error);
    
    notifyAdminAboutError(error, {
      location: 'uncaughtException',
      additionalInfo: {
        type: 'uncaught_exception',
      },
    }).catch(() => {
      // Игнорируем ошибки отправки
    });

    // Даем время на отправку уведомления перед завершением процесса
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Обработчик необработанных промисов
  process.on('unhandledRejection', (reason: any) => {
    const error = reason instanceof Error 
      ? reason 
      : new Error(`Unhandled Rejection: ${String(reason)}`);
    
    // Пропускаем некритичные ошибки (например, Server Actions)
    if (isNonCriticalError(error)) {
      console.warn('[INSTRUMENTATION] ⚠️  Некритичный rejection (игнорируется):', error.message);
      return;
    }
    
    console.error('[INSTRUMENTATION] ❌ Необработанный rejection:', reason);

    notifyAdminAboutError(error, {
      location: 'unhandledRejection',
      additionalInfo: {
        type: 'unhandled_rejection',
        reason: String(reason),
      },
    }).catch(() => {
      // Игнорируем ошибки отправки
    });
  });

  // Обработчики завершения работы
  let shutdownLogged = false;
  const shutdownHandler = (signal: string) => {
    if (shutdownLogged) {
      return;
    }
    shutdownLogged = true;
    console.log(`[INSTRUMENTATION] 🛑 Получен сигнал ${signal}, завершение работы...`);
  };
  
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));

  console.log('[INSTRUMENTATION] ✅ Node.js обработчики ошибок инициализированы');
}
