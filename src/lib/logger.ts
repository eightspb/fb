/**
 * Система логирования для админ панели
 * Перехватывает console.log, console.error, console.warn и сохраняет в БД
 */

import { Pool } from 'pg';

// Ленивая инициализация для избежания проблем с Edge Runtime
let pool: Pool | null = null;

function getPool(): Pool {
  if (pool === null) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
    });
  }
  return pool;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id?: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  path?: string;
}

// Очередь логов для батчинга
let logQueue: LogEntry[] = [];
let flushTimeout: NodeJS.Timeout | null = null;
const MAX_QUEUE_SIZE = 50;
const FLUSH_INTERVAL = 2000; // 2 секунды

// Оригинальные методы console
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

// Флаг инициализации
let isInitialized = false;

/**
 * Сохраняет лог в БД
 */
async function saveLog(log: LogEntry): Promise<void> {
  try {
    const client = await getPool().connect();
    try {
      await client.query(
        `INSERT INTO app_logs (level, message, context, metadata, ip_address, user_agent, path)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          log.level,
          log.message.substring(0, 5000), // Ограничение длины
          log.context || null,
          log.metadata ? JSON.stringify(log.metadata) : null,
          log.ip || null,
          log.userAgent || null,
          log.path || null,
        ]
      );
    } finally {
      client.release();
    }
  } catch (error) {
    // Не логируем ошибки логирования, чтобы избежать бесконечного цикла
    originalConsoleError('[Logger] Ошибка сохранения лога:', error);
  }
}

/**
 * Очищает очередь логов (батчинг)
 */
async function flushLogs(): Promise<void> {
  if (logQueue.length === 0) return;

  const logsToFlush = [...logQueue];
  logQueue = [];

  try {
    const client = await getPool().connect();
    try {
      // Используем batch insert для производительности
      const values = logsToFlush.map((log, index) => {
        const base = index * 7;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
      }).join(', ');

      const params: any[] = [];
      logsToFlush.forEach(log => {
        params.push(
          log.level,
          log.message.substring(0, 5000),
          log.context || null,
          log.metadata ? JSON.stringify(log.metadata) : null,
          log.ip || null,
          log.userAgent || null,
          log.path || null
        );
      });

      await client.query(
        `INSERT INTO app_logs (level, message, context, metadata, ip_address, user_agent, path)
         VALUES ${values}`,
        params
      );
    } finally {
      client.release();
    }
  } catch (error) {
    originalConsoleError('[Logger] Ошибка батч-сохранения логов:', error);
  }
}

/**
 * Добавляет лог в очередь
 */
function queueLog(log: LogEntry): void {
  logQueue.push(log);

  // Если очередь переполнена, сразу сохраняем
  if (logQueue.length >= MAX_QUEUE_SIZE) {
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
    flushLogs().catch(() => {});
  } else if (!flushTimeout) {
    // Планируем сохранение через интервал
    flushTimeout = setTimeout(() => {
      flushTimeout = null;
      flushLogs().catch(() => {});
    }, FLUSH_INTERVAL);
  }
}

/**
 * Форматирует аргументы console в строку
 */
function formatArgs(args: any[]): string {
  return args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
}

/**
 * Извлекает контекст из сообщения (например, [API], [Auth], и т.д.)
 */
function extractContext(message: string): { context?: string; cleanMessage: string } {
  const contextMatch = message.match(/^\[([^\]]+)\]/);
  if (contextMatch) {
    return {
      context: contextMatch[1],
      cleanMessage: message.substring(contextMatch[0].length).trim(),
    };
  }
  return { cleanMessage: message };
}

/**
 * Извлекает HTTP информацию из сообщения middleware
 * Формат: "GET /path | IP: xxx.xxx.xxx.xxx | UA: UserAgent"
 */
function extractHttpInfo(message: string): { ip?: string; userAgent?: string; path?: string } {
  const httpMatch = message.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s|]+)\s*\|\s*IP:\s*([^\s|]+)\s*\|\s*UA:\s*(.*)$/);
  if (httpMatch) {
    return {
      path: httpMatch[2],
      ip: httpMatch[3],
      userAgent: httpMatch[4] || undefined,
    };
  }
  return {};
}

/**
 * Получает информацию о запросе из глобального контекста (если доступно)
 */
function getRequestInfo(): { ip?: string; userAgent?: string; path?: string } {
  // В Next.js мы можем получить эту информацию из request context
  // Для простоты, будем использовать глобальную переменную, которую устанавливает middleware
  const globalRequest = (global as any).__currentRequest;
  if (globalRequest) {
    return {
      ip: globalRequest.ip,
      userAgent: globalRequest.userAgent,
      path: globalRequest.path,
    };
  }
  return {};
}

/**
 * Инициализирует систему логирования
 */
export function initializeLogger(): void {
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  originalConsoleLog('[Logger] 🔧 Инициализация системы логирования...');

  // Перехватываем console.log
  console.log = (...args: any[]) => {
    originalConsoleLog.apply(console, args);
    
    const message = formatArgs(args);
    const { context, cleanMessage } = extractContext(message);
    const requestInfo = getRequestInfo();
    
    // Для HTTP логов из middleware пытаемся извлечь IP и path из сообщения
    const httpInfo = context === 'HTTP' ? extractHttpInfo(cleanMessage || message) : {};

    queueLog({
      level: 'info',
      message: cleanMessage || message,
      context,
      timestamp: new Date(),
      ...requestInfo,
      ...httpInfo, // HTTP информация имеет приоритет над глобальным контекстом
    });
  };

  // Перехватываем console.error
  console.error = (...args: any[]) => {
    originalConsoleError.apply(console, args);
    
    const message = formatArgs(args);
    const { context, cleanMessage } = extractContext(message);
    const requestInfo = getRequestInfo();
    
    // Для HTTP логов из middleware пытаемся извлечь IP и path из сообщения
    const httpInfo = context === 'HTTP' ? extractHttpInfo(cleanMessage || message) : {};

    queueLog({
      level: 'error',
      message: cleanMessage || message,
      context,
      timestamp: new Date(),
      ...requestInfo,
      ...httpInfo,
    });
  };

  // Перехватываем console.warn
  console.warn = (...args: any[]) => {
    originalConsoleWarn.apply(console, args);
    
    const message = formatArgs(args);
    const { context, cleanMessage } = extractContext(message);
    const requestInfo = getRequestInfo();
    
    // Для HTTP логов из middleware пытаемся извлечь IP и path из сообщения
    const httpInfo = context === 'HTTP' ? extractHttpInfo(cleanMessage || message) : {};

    queueLog({
      level: 'warn',
      message: cleanMessage || message,
      context,
      timestamp: new Date(),
      ...requestInfo,
      ...httpInfo,
    });
  };

  // Перехватываем console.debug
  console.debug = (...args: any[]) => {
    originalConsoleDebug.apply(console, args);
    
    const message = formatArgs(args);
    const { context, cleanMessage } = extractContext(message);
    const requestInfo = getRequestInfo();

    queueLog({
      level: 'debug',
      message: cleanMessage || message,
      context,
      timestamp: new Date(),
      ...requestInfo,
    });
  };

  // Сохраняем оставшиеся логи при завершении процесса (только для Node.js)
  if (typeof process !== 'undefined' && process.on) {
    process.on('beforeExit', () => {
      if (logQueue.length > 0) {
        flushLogs().catch(() => {});
      }
    });
  }

  originalConsoleLog('[Logger] ✅ Система логирования инициализирована');
}

/**
 * Ручное логирование (для использования в коде)
 */
export function log(level: LogLevel, message: string, metadata?: Record<string, any>, context?: string): void {
  const requestInfo = getRequestInfo();
  
  queueLog({
    level,
    message,
    context,
    metadata,
    timestamp: new Date(),
    ...requestInfo,
  });

  // Также выводим в консоль
  const consoleMethod = {
    info: originalConsoleLog,
    warn: originalConsoleWarn,
    error: originalConsoleError,
    debug: originalConsoleDebug,
  }[level];

  consoleMethod(`[${context || 'App'}] ${message}`, metadata || '');
}

/**
 * Получает логи из БД
 */
export async function getLogs(options: {
  level?: LogLevel;
  context?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
} = {}): Promise<{ logs: LogEntry[]; total: number }> {
  const {
    level,
    context,
    limit = 100,
    offset = 0,
    startDate,
    endDate,
  } = options;

  try {
    const client = await getPool().connect();
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (level) {
        conditions.push(`level = $${paramIndex++}`);
        params.push(level);
      }

      if (context) {
        conditions.push(`context = $${paramIndex++}`);
        params.push(context);
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Получаем общее количество
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM app_logs ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total, 10);

      // Получаем логи (старые сверху, новые внизу)
      params.push(limit, offset);
      const logsResult = await client.query(
        `SELECT id, level, message, context, metadata, ip_address, user_agent, path, created_at
         FROM app_logs
         ${whereClause}
         ORDER BY created_at ASC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        params
      );

      const logs = logsResult.rows.map(row => ({
        id: row.id,
        level: row.level,
        message: row.message,
        context: row.context,
        metadata: row.metadata, // PostgreSQL driver уже автоматически парсит JSON
        ip: row.ip_address,
        userAgent: row.user_agent,
        path: row.path,
        timestamp: row.created_at,
      }));

      return { logs, total };
    } finally {
      client.release();
    }
  } catch (error) {
    originalConsoleError('[Logger] Ошибка получения логов:', error);
    throw error;
  }
}
