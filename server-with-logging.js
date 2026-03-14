/**
 * Обёртка для запуска Next.js сервера с инициализацией системы логирования
 * Используется в production Docker контейнере
 */

function ts() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `[${day}.${month} ${hours}:${minutes}:${seconds}]`;
}

function logWithTimestamp(method, ...args) {
  method(ts(), ...args);
}

// Инициализация логирования ДО запуска сервера
async function initializeLogging() {
  try {
    // Загружаем модуль логирования
    const { initializeLogger, log } = await import('./src/lib/logger.js');
    
    // Инициализируем систему логирования
    initializeLogger();
    
    // Логируем запуск сервера
    log('info', 'Сервер запускается', {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'production',
      pid: process.pid,
    }, 'System');
    
    logWithTimestamp(console.log, '[SERVER] ✅ Система логирования инициализирована');
    
    // Инициализируем обработчики ошибок
    let notifyAdminAboutError = null;
    try {
      const telegram = await import('./src/lib/telegram-notifications.js');
      notifyAdminAboutError = telegram.notifyAdminAboutError;
    } catch (e) {
      logWithTimestamp(console.log, '[SERVER] ⚠️  Telegram notifications недоступны:', e.message);
    }
    
    // Обработчик необработанных исключений
    process.on('uncaughtException', (error) => {
      logWithTimestamp(console.error, '[SERVER] ❌ Необработанное исключение:', error);
      log('error', `Необработанное исключение: ${error.message}`, {
        stack: error.stack?.substring(0, 500),
      }, 'System');
      
      if (notifyAdminAboutError) {
        notifyAdminAboutError(error, {
          location: 'uncaughtException',
          additionalInfo: { type: 'uncaught_exception' },
        }).catch(() => {});
      }
      
      setTimeout(() => process.exit(1), 1000);
    });
    
    // Обработчик необработанных промисов
    process.on('unhandledRejection', (reason) => {
      logWithTimestamp(console.error, '[SERVER] ❌ Необработанный rejection:', reason);
      const error = reason instanceof Error ? reason : new Error(String(reason));
      log('error', `Необработанный rejection: ${error.message}`, {
        reason: String(reason).substring(0, 500),
      }, 'System');
      
      if (notifyAdminAboutError) {
        notifyAdminAboutError(error, {
          location: 'unhandledRejection',
          additionalInfo: { type: 'unhandled_rejection' },
        }).catch(() => {});
      }
    });
    
    // Обработчик завершения
    let shutdownLogged = false;
    process.on('SIGTERM', () => {
      if (shutdownLogged) return;
      shutdownLogged = true;
      log('info', 'Сервер останавливается', { reason: 'SIGTERM' }, 'System');
    });
    
    process.on('SIGINT', () => {
      if (shutdownLogged) return;
      shutdownLogged = true;
      log('info', 'Сервер останавливается', { reason: 'SIGINT' }, 'System');
    });
    
    logWithTimestamp(console.log, '[SERVER] ✅ Обработчики ошибок установлены');
    
  } catch (error) {
    logWithTimestamp(console.error, '[SERVER] ❌ Ошибка инициализации логирования:', error);
    // Продолжаем запуск даже если логирование не инициализировалось
  }
}

// Запуск
initializeLogging()
  .then(() => {
    logWithTimestamp(console.log, '[SERVER] 🚀 Запуск Next.js сервера...');
    // Запускаем основной сервер Next.js
    require('./server.js');
  })
  .catch((error) => {
    logWithTimestamp(console.error, '[SERVER] ❌ Фатальная ошибка при запуске:', error);
    process.exit(1);
  });
