'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Eye, 
  Users, 
  Clock, 
  Globe,
  FileText,
  Smartphone,
  Monitor,
  Tablet,
  ExternalLink,
  MapPin
} from 'lucide-react';

interface StatsData {
  summary: {
    totalPageviews: number;
    uniqueVisitors: number;
    uniqueIps: number;
    avgTimeOnPage: number;
  };
  popularPages: Array<{
    pagePath: string;
    pageTitle: string | null;
    views: number;
    uniqueViews: number;
    avgTime: number;
  }>;
  geography: Array<{
    country: string;
    countryCode: string | null;
    visits: number;
    uniqueVisitors: number;
  }>;
  cities: Array<{
    city: string;
    country: string | null;
    visits: number;
    uniqueVisitors: number;
  }>;
  referrers: Array<{
    source: string;
    visits: number;
    uniqueVisitors: number;
  }>;
  devices: Array<{
    deviceType: string;
    visits: number;
    uniqueVisitors: number;
  }>;
  browsers: Array<{
    browser: string;
    visits: number;
  }>;
  period: string;
}

// Флаг страны по коду
function getCountryFlag(countryCode: string | null): string {
  if (!countryCode) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Форматирование времени
function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}с`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}м ${secs}с`;
}

// Форматирование страницы
function formatPagePath(path: string): string {
  if (path === '/') return 'Главная';
  return path;
}

// Иконка устройства
function getDeviceIcon(type: string) {
  switch (type) {
    case 'mobile': return <Smartphone className="h-4 w-4" />;
    case 'tablet': return <Tablet className="h-4 w-4" />;
    default: return <Monitor className="h-4 w-4" />;
  }
}

// Название устройства
function getDeviceName(type: string): string {
  switch (type) {
    case 'mobile': return 'Мобильные';
    case 'tablet': return 'Планшеты';
    case 'desktop': return 'ПК';
    default: return 'Другое';
  }
}

export default function VisitStats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/stats?period=${period}`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки статистики');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-[var(--frox-gray-200)] rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-500 text-sm">{error}</p>
          <button 
            onClick={fetchStats}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Попробовать снова
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Переключатель периода */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Статистика посещений
        </h2>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="today">Сегодня</TabsTrigger>
            <TabsTrigger value="week">Неделя</TabsTrigger>
            <TabsTrigger value="month">Месяц</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-[var(--frox-gray-500)] text-sm">
              <Eye className="h-4 w-4" />
              Просмотры
            </div>
            <p className="text-2xl font-bold mt-1">
              {data?.summary.totalPageviews.toLocaleString('ru-RU') || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-[var(--frox-gray-500)] text-sm">
              <Users className="h-4 w-4" />
              Посетители
            </div>
            <p className="text-2xl font-bold mt-1">
              {data?.summary.uniqueVisitors.toLocaleString('ru-RU') || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-[var(--frox-gray-500)] text-sm">
              <Globe className="h-4 w-4" />
              Уникальных IP
            </div>
            <p className="text-2xl font-bold mt-1">
              {data?.summary.uniqueIps.toLocaleString('ru-RU') || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-[var(--frox-gray-500)] text-sm">
              <Clock className="h-4 w-4" />
              Ср. время
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatTime(data?.summary.avgTimeOnPage || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Детальная статистика */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Популярные страницы */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Популярные страницы
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.popularPages.length === 0 ? (
              <p className="text-sm text-[var(--frox-gray-500)]">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {data?.popularPages.slice(0, 5).map((page, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1 mr-2" title={page.pagePath}>
                      {formatPagePath(page.pagePath)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{page.views}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* География */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              География
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.geography.length === 0 ? (
              <p className="text-sm text-[var(--frox-gray-500)]">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {data?.geography.slice(0, 5).map((geo, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {getCountryFlag(geo.countryCode)} {geo.country}
                    </span>
                    <Badge variant="secondary">{geo.visits}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Источники трафика */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Источники трафика
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.referrers.length === 0 ? (
              <p className="text-sm text-[var(--frox-gray-500)]">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {data?.referrers.slice(0, 5).map((ref, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1 mr-2">{ref.source}</span>
                    <Badge variant="secondary">{ref.visits}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Устройства */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Устройства
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.devices.length === 0 ? (
              <p className="text-sm text-[var(--frox-gray-500)]">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {data?.devices.map((device, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {getDeviceIcon(device.deviceType)}
                      {getDeviceName(device.deviceType)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{device.visits}</Badge>
                      <span className="text-[var(--frox-gray-500)] text-xs">
                        ({device.uniqueVisitors} уник.)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Города */}
      {data?.cities && data.cities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Города
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {data.cities.slice(0, 10).map((city, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-[var(--frox-gray-100)] rounded">
                  <span className="truncate">{city.city}</span>
                  <Badge variant="outline" className="ml-2">{city.visits}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
