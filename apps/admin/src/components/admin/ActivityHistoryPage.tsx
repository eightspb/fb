'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Activity,
  ChevronDown,
  Clock,
  Eye,
  ExternalLink,
  Globe,
  History,
  MapPin,
  RefreshCw,
  Search,
  TimerReset,
} from 'lucide-react';

interface HistorySession {
  sessionId: string;
  ipAddress: string;
  userAgent: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  currentPage: string;
  pageTitle: string | null;
  referrer: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  startedAt: string;
  lastActivityAt: string;
  pageViewsCount: number;
  uniquePages: number;
  avgTimeOnPage: number;
  maxTimeOnPage: number;
  sessionDuration: number;
  inactiveSeconds: number;
  status: 'active' | 'ended';
}

interface HistoryResponse {
  sessions: HistorySession[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  filters: {
    q: string;
    status: 'all' | 'active' | 'ended';
    days: number;
  };
  generatedAt: string;
}

interface TimelineItem {
  id: string;
  pagePath: string;
  pageTitle: string | null;
  referrer: string | null;
  visitedAt: string;
  timeOnPage: number;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
}

interface SessionDetailResponse {
  sessionId: string;
  summary: {
    startedAt: string;
    lastActivityAt: string;
    pageViewsCount: number;
    uniquePages: number;
    avgTimeOnPage: number;
  };
  timeline: TimelineItem[];
}

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Не удалось загрузить данные');
  }
  return response.json();
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

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ru-RU');
}

function formatPagePath(path: string): string {
  return path === '/' ? 'Главная' : path;
}

function getCountryFlag(countryCode: string | null): string {
  if (!countryCode) return '🌐';
  const codePoints = countryCode.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getSourceLabel(referrer: string | null): string {
  if (!referrer) return 'Прямой заход';
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return referrer;
  }
}

function getStatusBadge(status: 'active' | 'ended') {
  return status === 'active'
    ? 'bg-green-100 text-green-800'
    : 'bg-slate-100 text-slate-700';
}

function SessionTimeline({ sessionId }: { sessionId: string }) {
  const { data, error, isLoading } = useSWR<SessionDetailResponse>(
    `/api/admin/analytics/history/${encodeURIComponent(sessionId)}`,
    fetcher
  );

  if (isLoading) {
    return <div className="rounded-2xl bg-[var(--frox-gray-100)] p-4 text-sm text-[var(--frox-gray-500)]">Загрузка таймлайна...</div>;
  }

  if (error || !data) {
    return <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">Не удалось загрузить детали сессии.</div>;
  }

  return (
    <div className="space-y-2 rounded-[20px] border border-[var(--frox-neutral-border)] bg-white/80 p-3">
      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl bg-[var(--frox-gray-100)] p-2.5">
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--frox-gray-400)]">Начало</div>
          <div className="mt-0.5 text-sm font-medium text-[var(--frox-gray-900)]">{formatDate(data.summary.startedAt)}</div>
        </div>
        <div className="rounded-2xl bg-[var(--frox-gray-100)] p-2.5">
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--frox-gray-400)]">Последняя активность</div>
          <div className="mt-0.5 text-sm font-medium text-[var(--frox-gray-900)]">{formatDate(data.summary.lastActivityAt)}</div>
        </div>
        <div className="rounded-2xl bg-[var(--frox-gray-100)] p-2.5">
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--frox-gray-400)]">Среднее время</div>
          <div className="mt-0.5 text-sm font-medium text-[var(--frox-gray-900)]">{formatDuration(data.summary.avgTimeOnPage)}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        {data.timeline.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-100)] p-2.5">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--frox-gray-900)]">
                  {item.pageTitle || formatPagePath(item.pagePath)}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-[var(--frox-gray-500)]">
                <Badge variant="outline" className="shrink-0 px-2 py-0.5">
                  <Clock className="mr-1 h-3 w-3" />
                  {formatDate(item.visitedAt)}
                </Badge>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <TimerReset className="h-3 w-3" />
                  {item.timeOnPage > 0 ? formatDuration(item.timeOnPage) : 'нет данных'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ActivityHistoryPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'ended'>('all');
  const [days, setDays] = useState(30);
  const [offset, setOffset] = useState(0);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const params = useMemo(() => {
    const searchParams = new URLSearchParams({
      limit: '20',
      offset: String(offset),
      status,
      days: String(days),
    });

    if (query.trim()) {
      searchParams.set('q', query.trim());
    }

    return searchParams.toString();
  }, [days, offset, query, status]);

  const { data, error, isLoading, mutate, isValidating } = useSWR<HistoryResponse>(
    `/api/admin/analytics/history?${params}`,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false }
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.pagination.total / data.pagination.limit)) : 1;
  const currentPage = data ? Math.floor(data.pagination.offset / data.pagination.limit) + 1 : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--frox-gray-1100)]">История активности</h1>
          <p className="mt-2 text-sm text-[var(--frox-gray-500)]">
            Здесь храним историю визитов из базы: вход, последняя активность, маршрут по страницам и детали сессии.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={() => mutate()}>
          <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Фильтры истории
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--frox-gray-400)]" />
              <Input
                value={query}
                onChange={(event) => {
                  setOffset(0);
                  setQuery(event.target.value);
                }}
                placeholder="Поиск по IP, странице, городу, источнику"
                className="pl-9"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setOffset(0);
                setStatus(event.target.value as 'all' | 'active' | 'ended');
              }}
              className="flex h-10 w-full rounded-xl border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-100)] px-3 py-2 text-sm text-[var(--frox-gray-800)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frox-brand)]/40"
            >
              <option value="all">Все сессии</option>
              <option value="active">Только онлайн</option>
              <option value="ended">Завершенные</option>
            </select>

            <select
              value={days}
              onChange={(event) => {
                setOffset(0);
                setDays(Number(event.target.value));
              }}
              className="flex h-10 w-full rounded-xl border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-100)] px-3 py-2 text-sm text-[var(--frox-gray-800)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frox-brand)]/40"
            >
              <option value={7}>За 7 дней</option>
              <option value={30}>За 30 дней</option>
              <option value={90}>За 90 дней</option>
              <option value={365}>За год</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="md:hidden">
        <CardContent className="px-3 py-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="filters" className="border-b-0">
              <AccordionTrigger className="py-3 text-left text-sm font-semibold text-[var(--frox-gray-1100)] hover:no-underline">
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Фильтры истории
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="grid gap-2.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--frox-gray-400)]" />
                    <Input
                      value={query}
                      onChange={(event) => {
                        setOffset(0);
                        setQuery(event.target.value);
                      }}
                      placeholder="Поиск по IP, странице, городу, источнику"
                      className="h-9 pl-9"
                    />
                  </div>

                  <select
                    value={status}
                    onChange={(event) => {
                      setOffset(0);
                      setStatus(event.target.value as 'all' | 'active' | 'ended');
                    }}
                    className="flex h-9 w-full rounded-xl border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-100)] px-3 py-2 text-sm text-[var(--frox-gray-800)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frox-brand)]/40"
                  >
                    <option value="all">Все сессии</option>
                    <option value="active">Только онлайн</option>
                    <option value="ended">Завершенные</option>
                  </select>

                  <select
                    value={days}
                    onChange={(event) => {
                      setOffset(0);
                      setDays(Number(event.target.value));
                    }}
                    className="flex h-9 w-full rounded-xl border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-100)] px-3 py-2 text-sm text-[var(--frox-gray-800)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frox-brand)]/40"
                  >
                    <option value={7}>За 7 дней</option>
                    <option value={30}>За 30 дней</option>
                    <option value={90}>За 90 дней</option>
                    <option value={365}>За год</option>
                  </select>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-red-700">
            Не удалось загрузить историю активности.
          </CardContent>
        </Card>
      )}

      {isLoading && !data && (
        <Card>
          <CardContent className="pt-6 text-sm text-[var(--frox-gray-500)]">Загрузка истории...</CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <Card className="py-0">
              <CardContent className="px-4 py-3 md:pt-4">
                <div className="flex items-center gap-2 text-xs text-[var(--frox-gray-500)] md:text-sm">
                  <Activity className="h-4 w-4" />
                  Всего сессий
                </div>
                <div className="mt-1 text-xl font-bold text-[var(--frox-gray-1100)] md:text-2xl">{data.pagination.total}</div>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="px-4 py-3 md:pt-4">
                <div className="flex items-center gap-2 text-xs text-[var(--frox-gray-500)] md:text-sm">
                  <Eye className="h-4 w-4" />
                  На странице
                </div>
                <div className="mt-1 text-xl font-bold text-[var(--frox-gray-1100)] md:text-2xl">{data.sessions.length}</div>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="px-4 py-3 md:pt-4">
                <div className="flex items-center gap-2 text-xs text-[var(--frox-gray-500)] md:text-sm">
                  <Globe className="h-4 w-4" />
                  Период
                </div>
                <div className="mt-1 text-xl font-bold text-[var(--frox-gray-1100)] md:text-2xl">{data.filters.days} дн.</div>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="px-4 py-3 md:pt-4">
                <div className="flex items-center gap-2 text-xs text-[var(--frox-gray-500)] md:text-sm">
                  <Clock className="h-4 w-4" />
                  Обновлено
                </div>
                <div className="mt-1 text-xs font-semibold text-[var(--frox-gray-900)] md:text-sm">{formatDate(data.generatedAt)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {data.sessions.map((session) => {
              const expanded = expandedSessionId === session.sessionId;

              return (
                <Card key={session.sessionId} className="overflow-hidden rounded-[24px] py-0">
                  <CardContent className="px-3 py-1">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Badge variant="secondary" className={getStatusBadge(session.status)}>
                            {session.status === 'active' ? 'Онлайн' : 'Завершена'}
                          </Badge>
                          <span className="text-[11px] text-[var(--frox-gray-500)]">
                            Вход: {formatDate(session.startedAt)}
                          </span>
                          <span className="text-[11px] text-[var(--frox-gray-500)]">
                            {session.status === 'active' ? 'Последняя активность' : 'Условный выход'}: {formatDate(session.lastActivityAt)}
                          </span>
                        </div>

                        <div>
                          <div className="text-base font-semibold text-[var(--frox-gray-1100)]">{formatPagePath(session.currentPage)}</div>
                          {session.pageTitle && (
                            <div className="mt-0.5 line-clamp-1 text-xs text-[var(--frox-gray-500)]">{session.pageTitle}</div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--frox-gray-500)]">
                          <span>{session.ipAddress}</span>
                          {(session.city || session.country) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {getCountryFlag(session.countryCode)} {session.city ? `${session.city}, ` : ''}{session.country}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {getSourceLabel(session.referrer)}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:max-w-[340px] lg:justify-end">
                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                          <Eye className="mr-1 h-3 w-3" />
                          {session.pageViewsCount} просмотров
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                          {session.uniquePages} страниц
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatDuration(session.sessionDuration)}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                          {session.browser || 'Браузер'}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setExpandedSessionId((value) => (value === session.sessionId ? null : session.sessionId))}
                        >
                          Детали
                          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-4">
                        <SessionTimeline sessionId={session.sessionId} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-[24px] border border-[var(--frox-neutral-border)] bg-white/80 p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-[var(--frox-gray-500)]">
              Страница {currentPage} из {totalPages}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset((value) => Math.max(value - (data?.pagination.limit ?? 20), 0))}
              >
                Назад
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!data || offset + data.pagination.limit >= data.pagination.total}
                onClick={() => setOffset((value) => value + (data?.pagination.limit ?? 20))}
              >
                Дальше
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
