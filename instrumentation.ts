/**
 * Next.js Instrumentation Hook
 * Выполняется при старте сервера для настройки глобальных обработчиков
 * 
 * ВАЖНО: Этот файл должен быть совместим с Edge Runtime
 * Весь Node.js-специфичный код вынесен в instrumentation.node.ts
 */

/**
 * Next.js вызывает эту функцию при старте сервера
 */
export async function register() {
  // Весь код выполняется только в Node.js runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Динамический импорт Node.js-специфичных модулей
    const { initializeLogger, log } = await import('./src/lib/logger');
    const { initializeNodeErrorHandlers } = await import('./instrumentation.node');
    
    // Инициализируем систему логирования
    initializeLogger();
    
    // Инициализируем Node.js обработчики ошибок (process.on, etc.)
    await initializeNodeErrorHandlers();
    
    // Логируем запуск сервера
    log('info', 'Сервер запущен', {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development',
      pid: process.pid,
    }, 'System');
  }
}
