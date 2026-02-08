/**
 * Next.js Instrumentation Hook
 * Выполняется при старте сервера для настройки глобальных обработчиков
 */

// Флаг для предотвращения множественных инициализаций
let errorHandlersInitialized = false;

/**
 * Инициализирует глобальные обработчики ошибок
 */
async function initializeErrorHandlers() {
  // Динамический импорт для избежания загрузки в Edge Runtime
  const { notifyAdminAboutError } = await import('./src/lib/telegram-notifications');
  if (errorHandlersInitialized) {
    return;
  }

  errorHandlersInitialized = true;
  console.log('[INSTRUMENTATION] 🔧 Инициализация глобальных обработчиков ошибок...');

  // Сохраняем оригинальные методы
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // Перехватываем console.error
  console.error = (...args: any[]) => {
    // Вызываем оригинальный console.error
    originalConsoleError.apply(console, args);

    // Проверяем, является ли это ошибкой (не просто предупреждением)
    const errorMessage = args.join(' ');
    
    // Фильтруем некоторые сообщения, которые не нужно отправлять
    const skipPatterns = [
      '[NOTIFY]', // Уведомления сами по себе
      '[INSTRUMENTATION]', // Сообщения инициализации
      'TELEGRAM_BOT_TOKEN не установлен', // Предупреждения о конфигурации
      'TELEGRAM_ADMIN_CHAT_ID не установлен', // Предупреждения о конфигурации
      '⚠️', // Общие предупреждения
    ];

    const shouldSkip = skipPatterns.some(pattern => errorMessage.includes(pattern));
    
    if (!shouldSkip && (errorMessage.includes('Error') || errorMessage.includes('error') || errorMessage.includes('ERROR'))) {
      // Отправляем уведомление в Telegram (асинхронно, не блокируя выполнение)
      notifyAdminAboutError(
        new Error(errorMessage),
        {
          location: 'console.error',
          additionalInfo: {
            args: args.map(arg => {
              if (typeof arg === 'object') {
                try {
                  return JSON.stringify(arg).substring(0, 200);
                } catch {
                  return String(arg).substring(0, 200);
                }
              }
              return String(arg).substring(0, 200);
            }),
          },
        }
      ).catch(err => {
        // Не логируем ошибки отправки уведомлений, чтобы избежать бесконечного цикла
        originalConsoleError('[INSTRUMENTATION] Ошибка отправки уведомления об ошибке:', err);
      });
    }
  };

  // Перехватываем console.warn для критических предупреждений
  console.warn = (...args: any[]) => {
    // Вызываем оригинальный console.warn
    originalConsoleWarn.apply(console, args);

    // Отправляем только критические предупреждения
    const warningMessage = args.join(' ');
    const criticalPatterns = [
      'CRITICAL',
      'КРИТИЧЕСКАЯ',
      'критическая',
      'CRITICAL ERROR',
      'FATAL',
    ];

    if (criticalPatterns.some(pattern => warningMessage.includes(pattern))) {
      notifyAdminAboutError(
        new Error(`Критическое предупреждение: ${warningMessage}`),
        {
          location: 'console.warn',
          additionalInfo: {
            type: 'critical_warning',
          },
        }
      ).catch(() => {
        // Игнорируем ошибки отправки
      });
    }
  };

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

  console.log('[INSTRUMENTATION] ✅ Глобальные обработчики ошибок инициализированы');
}

/**
 * Next.js вызывает эту функцию при старте сервера
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeLogger, log } = await import('./src/lib/logger');
    await initializeErrorHandlers();
    initializeLogger();
    
    // Логируем запуск сервера
    log('info', 'Сервер запущен', {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development',
      pid: process.pid,
    }, 'System');
    
    // Логируем завершение работы сервера
    const shutdownHandler = () => {
      log('info', 'Сервер останавливается', { reason: 'SIGTERM' }, 'System');
    };
    
    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
  }
}
