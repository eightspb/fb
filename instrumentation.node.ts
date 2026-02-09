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

  // Обработчик необработанных исключений
  process.on('uncaughtException', (error: Error) => {
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
    console.error('[INSTRUMENTATION] ❌ Необработанный rejection:', reason);
    
    const error = reason instanceof Error 
      ? reason 
      : new Error(`Unhandled Rejection: ${String(reason)}`);

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
  const shutdownHandler = (signal: string) => {
    console.log(`[INSTRUMENTATION] 🛑 Получен сигнал ${signal}, завершение работы...`);
  };
  
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));

  console.log('[INSTRUMENTATION] ✅ Node.js обработчики ошибок инициализированы');
}
