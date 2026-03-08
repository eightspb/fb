'use client';

import { useEffect, useState, memo, useRef } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Используем простой HTML select вместо Radix UI для упрощения
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Trash2, Download, RefreshCw, Filter } from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
// Форматирование даты - компактный формат
const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}.${month} ${hours}:${minutes}:${seconds}`;
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

// Мемоизированная строка таблицы - не перерисовывается если пропсы не изменились
const LogRow = memo(function LogRow({ log }: { log: LogEntry }) {
  return (
    <tr className="border-b border-[var(--frox-gray-200)] hover:bg-[var(--frox-gray-100)]">
      <td className="px-2 py-1 text-[var(--frox-gray-600)] whitespace-nowrap">
        {formatDate(log.timestamp)}
      </td>
      <td className="px-2 py-1">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
          log.level === 'error' ? 'bg-red-100 text-red-700' :
          log.level === 'warn' ? 'bg-yellow-100 text-yellow-700' :
          log.level === 'debug' ? 'bg-blue-100 text-blue-700' :
          'bg-green-100 text-green-700'
        }`}>
          {log.level}
        </span>
      </td>
      <td className="px-2 py-1 text-[var(--frox-gray-600)]">
        {log.context || '-'}
      </td>
      <td className="px-2 py-1 text-[var(--frox-gray-900)]">
        <div className="truncate max-w-[600px]" title={log.message}>
          {log.message}
        </div>
      </td>
      <td className="px-2 py-1 text-[var(--frox-gray-500)] truncate">
        {log.ip || '-'}
      </td>
    </tr>
  );
});

interface LogsResponse {
  logs: LogEntry[];
  total: number;
}

async function logsFetcher(url: string): Promise<LogsResponse> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Ошибка загрузки логов');
  return res.json();
}

export default function AdminLogsPage() {
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [contextFilter, setContextFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Build SWR key
  const swrKey = (() => {
    const params = new URLSearchParams();
    if (levelFilter !== 'all') params.append('level', levelFilter);
    if (contextFilter !== 'all') params.append('context', contextFilter);
    params.append('limit', '500');
    return `/api/admin/logs?${params.toString()}`;
  })();

  const { data: logsData, error: swrError, isLoading: loading, mutate } = useSWR<LogsResponse>(
    swrKey,
    logsFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000, keepPreviousData: true }
  );

  const logs = logsData?.logs ?? [];
  const total = logsData?.total ?? 0;

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
          mutate((current) => {
            if (!current) return current;
            // Проверяем, нет ли уже такого лога
            if (current.logs.some(log => log.id === data.data.id)) {
              return current;
            }
            // Добавляем новый лог в НАЧАЛО (новые сверху), ограничиваем до 500
            return { ...current, logs: [data.data, ...current.logs].slice(0, 500) };
          }, false);
        } else if (data.type === 'connected') {
          console.log('[Logs] Подключено к потоку логов');
        } else if (data.type === 'error') {
          setError(data.message || 'Ошибка потока логов');
        }
      } catch (err) {
        console.error('Ошибка парсинга SSE сообщения:', err);
      }
    };

    eventSource.onerror = () => {
      // EventSource reconnects automatically — no action needed
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [autoRefresh]);

  // Убрана автопрокрутка - новые логи теперь отображаются сверху

  // Очистка старых логов
  const handleClearLogs = async () => {
    if (!confirm('Удалить логи старше 30 дней?')) return;

    try {
      const response = await adminCsrfFetch('/api/admin/logs?days=30', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await mutate();
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

  // Получение уникальных контекстов из логов
  const contexts = Array.from(new Set(logs.map(log => log.context).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[var(--frox-gray-1100)]">Логи системы</h1>
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

      {(error || swrError) && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error || swrError?.message}</span>
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
              <label className="text-sm font-medium text-[var(--frox-gray-800)] mb-2 block">Уровень</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-[var(--frox-neutral-border)] bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-[var(--frox-brand)] focus:ring-offset-2"
              >
                <option value="all">Все уровни</option>
                <option value="error">Ошибки</option>
                <option value="warn">Предупреждения</option>
                <option value="info">Информация</option>
                <option value="debug">Отладка</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-[var(--frox-gray-800)] mb-2 block">Контекст</label>
              <select
                value={contextFilter}
                onChange={(e) => setContextFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-[var(--frox-neutral-border)] bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-[var(--frox-brand)] focus:ring-offset-2"
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
          <div className="mt-4 text-sm text-[var(--frox-gray-600)]">
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
            <div className="text-center py-8 text-[var(--frox-gray-500)]">Загрузка логов...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-[var(--frox-gray-500)]">Логи не найдены</div>
          ) : (
            <div className="max-h-[700px] overflow-y-auto font-mono text-xs">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-white border-b-2 border-[var(--frox-gray-300)] z-10">
                  <tr className="text-left">
                    <th className="px-2 py-1 font-semibold text-[var(--frox-gray-800)] w-[95px]">Время</th>
                    <th className="px-2 py-1 font-semibold text-[var(--frox-gray-800)] w-[55px]">Уровень</th>
                    <th className="px-2 py-1 font-semibold text-[var(--frox-gray-800)] w-[90px]">Контекст</th>
                    <th className="px-2 py-1 font-semibold text-[var(--frox-gray-800)]">Сообщение</th>
                    <th className="px-2 py-1 font-semibold text-[var(--frox-gray-800)] w-[110px]">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
