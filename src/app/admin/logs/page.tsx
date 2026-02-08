'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Используем простой HTML select вместо Radix UI для упрощения
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Trash2, Download, RefreshCw, Filter } from 'lucide-react';
// Форматирование даты без date-fns
const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
};

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  path?: string;
  timestamp: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [contextFilter, setContextFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Получение логов через API
  const fetchLogs = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (levelFilter !== 'all') params.append('level', levelFilter);
      if (contextFilter !== 'all') params.append('context', contextFilter);
      params.append('limit', '200');

      const response = await fetch(`/api/admin/logs?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки логов');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки логов');
      console.error('Ошибка получения логов:', err);
    } finally {
      setLoading(false);
    }
  };

  // Подключение к SSE потоку
  useEffect(() => {
    if (!autoRefresh) return;

    const eventSource = new EventSource('/api/admin/logs/stream', {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'log') {
          setLogs(prev => {
            // Проверяем, нет ли уже такого лога
            if (prev.some(log => log.id === data.data.id)) {
              return prev;
            }
            // Добавляем новый лог в начало и ограничиваем до 500 записей
            return [data.data, ...prev].slice(0, 500);
          });
        } else if (data.type === 'connected') {
          console.log('[Logs] Подключено к потоку логов');
        } else if (data.type === 'error') {
          setError(data.message || 'Ошибка потока логов');
        }
      } catch (err) {
        console.error('Ошибка парсинга SSE сообщения:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE ошибка:', err);
      eventSource.close();
      // Переподключаемся через 3 секунды
      setTimeout(() => {
        if (autoRefresh) {
          // Пересоздаем соединение
          eventSourceRef.current = null;
        }
      }, 3000);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [autoRefresh]);

  // Загрузка логов при монтировании и изменении фильтров
  useEffect(() => {
    fetchLogs();
  }, [levelFilter, contextFilter]);

  // Автопрокрутка к новым логам
  useEffect(() => {
    if (logs.length > 0 && autoRefresh) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoRefresh]);

  // Очистка старых логов
  const handleClearLogs = async () => {
    if (!confirm('Удалить логи старше 30 дней?')) return;

    try {
      const response = await fetch('/api/admin/logs?days=30', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchLogs();
      } else {
        throw new Error('Ошибка очистки логов');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка очистки логов');
    }
  };

  // Экспорт логов
  const handleExportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    link.download = `logs-${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Получение цвета для уровня лога
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'debug':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // Получение уникальных контекстов из логов
  const contexts = Array.from(new Set(logs.map(log => log.context).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Логи системы</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Автообновление' : 'Обновить'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearLogs}>
            <Trash2 className="w-4 h-4 mr-2" />
            Очистить
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Уровень</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              >
                <option value="all">Все уровни</option>
                <option value="error">Ошибки</option>
                <option value="warn">Предупреждения</option>
                <option value="info">Информация</option>
                <option value="debug">Отладка</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Контекст</label>
              <select
                value={contextFilter}
                onChange={(e) => setContextFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              >
                <option value="all">Все контексты</option>
                {contexts.map(context => (
                  <option key={context} value={context!}>
                    {context}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600">
            Всего логов: <strong>{total}</strong> | Показано: <strong>{logs.length}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Список логов */}
      <Card>
        <CardHeader>
          <CardTitle>Логи ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Загрузка логов...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Логи не найдены</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getLevelColor(log.level)}>
                        {log.level.toUpperCase()}
                      </Badge>
                      {log.context && (
                        <Badge variant="outline">{log.context}</Badge>
                      )}
                      {log.path && (
                        <span className="text-xs text-slate-500 font-mono">{log.path}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 font-mono whitespace-pre-wrap break-words">
                    {log.message}
                  </div>
                  {(log.ip || log.userAgent || log.metadata) && (
                    <div className="mt-2 pt-2 border-t text-xs text-slate-500 space-y-1">
                      {log.ip && <div>IP: {log.ip}</div>}
                      {log.userAgent && (
                        <div className="truncate">User-Agent: {log.userAgent}</div>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer hover:text-slate-700">
                            Метаданные
                          </summary>
                          <pre className="mt-1 p-2 bg-slate-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
