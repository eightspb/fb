'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  MapPin,
  Eye,
  RefreshCw,
  Search,
  ChevronDown,
  Activity,
  ExternalLink,
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

interface SessionTimelineItem {
  id: string;
  pagePath: string;
  pageTitle: string | null;
  visitedAt: string;
  timeOnPage: number;
}

interface SessionDetailData {
  sessionId: string;
  timeline: SessionTimelineItem[];
}

function getDeviceIcon(userAgent: string) {
  if (/tablet|ipad/i.test(userAgent)) return <Tablet className="h-4 w-4" />;
  if (/mobile|iphone|android/i.test(userAgent)) return <Smartphone className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

function getDeviceName(userAgent: string) {
  if (/tablet|ipad/i.test(userAgent)) return 'Планшет';
  if (/mobile|iphone|android/i.test(userAgent)) return 'Телефон';
  return 'Компьютер';
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}с`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}м ${secs}с`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}ч ${mins}м`;
}

function formatRelativeActivity(seconds: number): string {
  if (seconds < 15) return 'прямо сейчас';
  if (seconds < 60) return `${seconds} сек назад`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} мин назад`;
}

function formatPagePath(path: string): string {
  if (path === '/') return 'Главная';
  return path;
}

function getCountryFlag(countryCode: string | null): string {
  if (!countryCode) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getActivityTone(inactiveSeconds: number) {
  if (inactiveSeconds < 30) {
    return {
      dot: 'bg-green-500',
      badge: 'bg-green-100 text-green-800',
      label: 'Активен сейчас',
    };
  }

  if (inactiveSeconds < 90) {
    return {
      dot: 'bg-amber-400',
      badge: 'bg-amber-100 text-amber-800',
      label: 'Недавно активен',
    };
  }

  return {
    dot: 'bg-slate-300',
    badge: 'bg-slate-100 text-slate-700',
    label: 'Без новых событий',
  };
}

function getReferrerLabel(referrer: string | null): string {
  if (!referrer) return 'Прямой заход';
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return referrer;
  }
}

async function sessionsFetcher(url: string): Promise<SessionsData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка загрузки данных');
  return res.json();
}

async function sessionDetailFetcher(url: string): Promise<SessionDetailData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка загрузки маршрута сессии');
  return res.json();
}

function SessionVisitedPages({ sessionId, currentPage }: { sessionId: string; currentPage: string }) {
  const { data, error, isLoading } = useSWR<SessionDetailData>(
    `/api/admin/analytics/history/${encodeURIComponent(sessionId)}`,
    sessionDetailFetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-[var(--frox-gray-100)] p-3 text-xs text-[var(--frox-gray-500)]">
        Загружаю страницы сессии...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-[var(--frox-gray-100)] p-3 text-xs text-[var(--frox-gray-500)]">
        Не удалось загрузить историю страниц.
      </div>
    );
  }

  const orderedTimeline = data.timeline.slice().reverse();

  return (
    <div className="rounded-2xl bg-[var(--frox-gray-100)] p-3 md:col-span-2 xl:col-span-4">
      <div className="text-xs uppercase tracking-[0.12em] text-[var(--frox-gray-400)]">
        Маршрут по страницам в этой сессии
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {orderedTimeline.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                item.pagePath === currentPage && index === orderedTimeline.length - 1
                  ? 'border-transparent bg-[var(--frox-brand-soft)] text-[var(--frox-brand-strong)]'
                  : 'border-[var(--frox-neutral-border)] bg-white text-[var(--frox-gray-800)]'
              }`}
              title={item.pageTitle || item.pagePath}
            >
              <div className="truncate font-medium">
                {formatPagePath(item.pagePath)}
              </div>
              <div className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--frox-gray-500)]">
                <span>{new Date(item.visitedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>·</span>
                <span>{item.timeOnPage > 0 ? formatDuration(item.timeOnPage) : 'нет времени'}</span>
              </div>
            </div>
            {index < orderedTimeline.length - 1 && (
              <span className="text-xs text-[var(--frox-gray-400)]">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ActiveSessions() {
  const [query, setQuery] = useState('');
  const [showOnlyLive, setShowOnlyLive] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const { data, error, isLoading: loading, isValidating, mutate } = useSWR<SessionsData>(
    '/api/admin/analytics/sessions',
    sessionsFetcher,
    { refreshInterval: 10000, revalidateOnFocus: false, dedupingInterval: 5000, keepPreviousData: true }
  );

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (data?.sessions ?? []).filter((session) => {
      if (showOnlyLive && session.inactiveSeconds >= 30) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        session.currentPage,
        session.pageTitle,
        session.city,
        session.country,
        session.ipAddress,
        session.language,
        getReferrerLabel(session.referrer),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [data?.sessions, query, showOnlyLive]);

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
            <div className="h-4 bg-[var(--frox-gray-300)] rounded w-1/2"></div>
            <div className="h-20 bg-[var(--frox-gray-200)] rounded"></div>
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
          <p className="text-red-500 text-sm">{error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Попробовать снова
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <CardHeader className="px-4 pb-4 pt-4 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Онлайн сейчас
              </CardTitle>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {data?.activeCount || 0}
              </Badge>
              {data && data.activeCount5min > data.activeCount && (
                <Badge variant="secondary" className="bg-[var(--frox-gray-100)] text-[var(--frox-gray-700)]">
                  за 5 минут: {data.activeCount5min}
                </Badge>
              )}
            </div>

            <p className="text-sm text-[var(--frox-gray-500)]">
              Глазик в карточке показывает, сколько страниц пользователь уже открыл в текущей сессии.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="button" variant="outline" asChild>
              <Link href="/analytics">
                Вся история
              </Link>
            </Button>

            <div className="relative min-w-0 sm:min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--frox-gray-400)]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по странице, IP, городу"
                className="pl-9"
              />
            </div>

            <Button
              type="button"
              variant={showOnlyLive ? 'secondary' : 'outline'}
              onClick={() => setShowOnlyLive((value) => !value)}
            >
              <Activity className="h-4 w-4" />
              Только активные
            </Button>

            <Button type="button" variant="outline" onClick={() => mutate()}>
              <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 md:px-6">
        {filteredSessions.length === 0 ? (
          <p className="text-sm text-[var(--frox-gray-500)] text-center py-4">
            По текущему фильтру активных посетителей не найдено
          </p>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => {
              const activity = getActivityTone(session.inactiveSeconds);
              const isExpanded = expandedSessionId === session.sessionId;

              return (
                <div
                  key={session.sessionId}
                  className="rounded-[22px] border border-[var(--frox-neutral-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,246,255,0.92))] p-3 shadow-[0_14px_34px_rgba(52,40,121,0.06)] transition-colors md:p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${activity.dot} ${session.inactiveSeconds < 30 ? 'animate-pulse' : ''}`} />
                        <Badge variant="secondary" className={activity.badge}>
                          {activity.label}
                        </Badge>
                        <span className="text-xs text-[var(--frox-gray-500)]">
                          Начало: {new Date(session.startedAt).toLocaleString('ru-RU')}
                        </span>
                        <span className="text-xs text-[var(--frox-gray-500)]">
                          Последняя активность: {formatRelativeActivity(session.inactiveSeconds)}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-xl bg-[var(--frox-gray-100)] p-2 text-[var(--frox-gray-700)]">
                          {getDeviceIcon(session.userAgent)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-[var(--frox-gray-900)]">
                              {formatPagePath(session.currentPage)}
                            </span>
                            <Badge variant="outline">{getDeviceName(session.userAgent)}</Badge>
                          </div>

                          {session.pageTitle && (
                            <p className="mt-1 text-sm text-[var(--frox-gray-500)]">
                              {session.pageTitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--frox-gray-500)]">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {session.ipAddress}
                        </span>

                        {(session.city || session.country) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getCountryFlag(session.countryCode)} {session.city ? `${session.city}, ` : ''}
                            {session.country}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          В сессии: {formatDuration(session.sessionDuration)}
                        </span>

                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Источник: {getReferrerLabel(session.referrer)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-row gap-2 lg:flex-col lg:items-end">
                      <Badge
                        variant="outline"
                        className="gap-1 rounded-full px-3 py-1 text-[var(--frox-gray-700)]"
                        title="Сколько страниц пользователь уже открыл в этой сессии"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {session.pageViewsCount} стр.
                      </Badge>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          setExpandedSessionId((value) =>
                            value === session.sessionId ? null : session.sessionId
                          )
                        }
                      >
                        Детали
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-[var(--frox-neutral-border)] pt-4">
                      <SessionVisitedPages
                        sessionId={session.sessionId}
                        currentPage={session.currentPage}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
