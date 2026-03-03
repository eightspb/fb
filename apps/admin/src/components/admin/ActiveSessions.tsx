'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  Clock,
  MapPin,
  Eye,
  RefreshCw
} from 'lucide-react';

interface Session {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  currentPage: string;
  pageTitle: string | null;
  referrer: string | null;
  pageViewsCount: number;
  startedAt: string;
  lastActivityAt: string;
  screenWidth: number | null;
  screenHeight: number | null;
  language: string | null;
  sessionDuration: number;
  inactiveSeconds: number;
}

interface SessionsData {
  sessions: Session[];
  activeCount: number;
  activeCount5min: number;
  timestamp: string;
}

// Определение устройства по user-agent
function getDeviceIcon(userAgent: string) {
  if (/tablet|ipad/i.test(userAgent)) return <Tablet className="h-4 w-4" />;
  if (/mobile|iphone|android/i.test(userAgent)) return <Smartphone className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

// Форматирование времени
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}с`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}м ${secs}с`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}ч ${mins}м`;
}

// Форматирование страницы
function formatPagePath(path: string): string {
  if (path === '/') return 'Главная';
  return path;
}

// Флаг страны по коду
function getCountryFlag(countryCode: string | null): string {
  if (!countryCode) return '🌐';
  // Преобразуем код страны в эмодзи флага
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function ActiveSessions() {
  const [data, setData] = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics/sessions');
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      const result = await response.json();
      setData(result);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    
    // Обновляем каждые 10 секунд
    const interval = setInterval(fetchSessions, 10000);
    
    return () => clearInterval(interval);
  }, [fetchSessions]);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Активные посетители
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-20 bg-slate-100 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Активные посетители
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500 text-sm">{error}</p>
          <button 
            onClick={fetchSessions}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Попробовать снова
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Онлайн сейчас
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              {data?.activeCount || 0}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {lastUpdate && (
              <span>
                {lastUpdate.toLocaleTimeString('ru-RU')}
              </span>
            )}
          </div>
        </div>
        {data && data.activeCount5min > data.activeCount && (
          <p className="text-xs text-muted-foreground">
            За 5 минут: {data.activeCount5min} посетителей
          </p>
        )}
      </CardHeader>
      <CardContent>
        {data?.sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет активных посетителей
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {data?.sessions.map((session) => (
              <div 
                key={session.sessionId}
                className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getDeviceIcon(session.userAgent)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {formatPagePath(session.currentPage)}
                        </span>
                        {session.inactiveSeconds < 30 && (
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      {session.pageTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {session.pageTitle}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    <Eye className="h-3 w-3 mr-1" />
                    {session.pageViewsCount}
                  </Badge>
                </div>
                
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {session.ipAddress}
                  </span>
                  
                  {(session.city || session.country) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getCountryFlag(session.countryCode)}{' '}
                      {session.city ? `${session.city}, ` : ''}
                      {session.country}
                    </span>
                  )}
                  
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(session.sessionDuration)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
