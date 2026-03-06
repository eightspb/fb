'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  RefreshCw,
  Search,
  Download,
  Trash2,
  Archive,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  ExternalLink,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  ArrowUpDown,
  Building2,
  MapPin,
  MessageSquare,
  Filter,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import { RequestDetailsModal, RequestItem } from '@/components/admin/RequestDetailsModal';

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface Stats {
  new_count: string;
  in_progress_count: string;
  processed_count: string;
  archived_count: string;
  total_count: string;
}

const formTypeLabels: Record<string, string> = {
  'contact': 'Контакт',
  'cp': 'КП',
  'training': 'Обучение',
  'conference_registration': 'Конференция'
};

const formTypeBadgeStyle: Record<string, string> = {
  'contact': 'bg-violet-50 text-violet-700 border-violet-200',
  'cp': 'bg-blue-50 text-blue-700 border-blue-200',
  'training': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'conference_registration': 'bg-amber-50 text-amber-700 border-amber-200',
};

const statusConfig = [
  { value: 'new', label: 'Новая', pill: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500', icon: Inbox },
  { value: 'in_progress', label: 'В работе', pill: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500', icon: Clock },
  { value: 'processed', label: 'Обработана', pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle2 },
  { value: 'archived', label: 'В архиве', pill: 'bg-slate-100 text-slate-500 border border-slate-200', dot: 'bg-slate-400', icon: Archive },
];

const priorityConfig = [
  { value: 'low', label: 'Низкий', pill: 'bg-slate-50 text-slate-500 border border-slate-200' },
  { value: 'normal', label: 'Обычный', pill: 'bg-slate-50 text-slate-600 border border-slate-200' },
  { value: 'high', label: 'Высокий', pill: 'bg-orange-50 text-orange-700 border border-orange-200' },
  { value: 'urgent', label: 'Срочный', pill: 'bg-red-50 text-red-700 border border-red-200' },
];

function getStatusConfig(status: string) {
  return statusConfig.find(s => s.value === status) || statusConfig[0];
}

function getPriorityConfig(priority?: string) {
  return priorityConfig.find(p => p.value === (priority || 'normal')) || priorityConfig[1];
}

function getRowAccent(req: RequestItem) {
  if (req.priority === 'urgent') return 'border-l-red-500 bg-red-50/30';
  if (req.priority === 'high') return 'border-l-orange-400 bg-orange-50/20';
  if (req.status === 'new') return 'border-l-blue-400';
  if (req.status === 'in_progress') return 'border-l-amber-400';
  if (req.status === 'processed') return 'border-l-emerald-400';
  return 'border-l-transparent';
}

// Inline status selector that matches pill style
function StatusPill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = getStatusConfig(value);

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-80 ${cfg.pill}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
            {statusConfig.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors ${value === opt.value ? 'font-semibold' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 25, totalCount: 0, totalPages: 0 });
  const [stats, setStats] = useState<Stats | null>(null);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('form_type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      params.set('sort_by', sortBy);
      params.set('sort_order', sortOrder);
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());

      const response = await fetch(`/api/admin/requests?${params}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
        setPagination(data.pagination);
        setStats(data.stats);
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.error || 'Ошибка загрузки заявок');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus, filterPriority, dateFrom, dateTo, sortBy, sortOrder, pagination.page, pagination.limit]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, [pagination.page, filterType, filterStatus, search]);

  const handleSelectAll = () => {
    if (selectAll) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(requests.map(r => r.id))); }
    setSelectAll(!selectAll);
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
    setSelectAll(next.size === requests.length);
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (!selectedIds.size) return;
    try {
      const res = await adminCsrfFetch('/api/admin/requests', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), status: newStatus }),
      });
      if (res.ok) { loadRequests(); setSelectedIds(new Set()); setSelectAll(false); }
    } catch { /* silent */ }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    try {
      const res = await adminCsrfFetch('/api/admin/requests', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) { loadRequests(); setSelectedIds(new Set()); setSelectAll(false); setShowBulkDeleteConfirm(false); }
    } catch { /* silent */ }
  };

  const handleExport = (exportAll = true) => {
    const params = new URLSearchParams();
    if (!exportAll && selectedIds.size > 0) {
      params.set('ids', Array.from(selectedIds).join(','));
    } else {
      if (filterType) params.set('form_type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
    }
    window.open(`/api/admin/requests/export?${params}`, '_blank');
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleStatusChange = async (req: RequestItem, newStatus: string) => {
    setRequests(requests.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
    try {
      await adminCsrfFetch(`/api/admin/requests/${req.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch { loadRequests(); }
  };

  const handleRequestUpdate = (updated: RequestItem) => {
    setRequests(requests.map(r => r.id === updated.id ? updated : r));
    setSelectedRequest(updated);
  };

  const handleRequestDelete = (id: string) => {
    setRequests(requests.filter(r => r.id !== id));
    if (stats) setStats({ ...stats, total_count: (parseInt(stats.total_count) - 1).toString() });
  };

  const clearFilters = () => {
    setSearch(''); setFilterType(''); setFilterStatus('');
    setFilterPriority(''); setDateFrom(''); setDateTo('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = search || filterType || filterStatus || filterPriority || dateFrom || dateTo;

  const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const formatTime = (s: string) => new Date(s).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  function SortIcon({ field }: { field: string }) {
    if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
      : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />;
  }

  return (
    <div className="space-y-5">
      {/* ── Заголовок ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Заявки</h1>
          {stats && (
            <p className="text-sm text-slate-500 mt-0.5">
              Всего {stats.total_count} · {stats.new_count} новых
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadRequests()}
            title="Обновить"
            className="h-9 w-9 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={() => handleExport(true)} className="gap-2 h-9">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Экспорт CSV</span>
          </Button>
        </div>
      </div>

      {/* ── Статистика ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Новые', value: stats.new_count, icon: Inbox, from: 'from-blue-500', to: 'to-blue-600', filterVal: 'new' },
            { label: 'В работе', value: stats.in_progress_count, icon: Clock, from: 'from-amber-400', to: 'to-amber-500', filterVal: 'in_progress' },
            { label: 'Обработано', value: stats.processed_count, icon: CheckCircle2, from: 'from-emerald-500', to: 'to-emerald-600', filterVal: 'processed' },
            { label: 'В архиве', value: stats.archived_count, icon: Archive, from: 'from-slate-500', to: 'to-slate-600', filterVal: 'archived' },
          ].map(card => (
            <button
              key={card.filterVal}
              onClick={() => {
                setFilterStatus(filterStatus === card.filterVal ? '' : card.filterVal);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all bg-gradient-to-br ${card.from} ${card.to} text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${filterStatus === card.filterVal ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-100' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider opacity-80">{card.label}</p>
                  <p className="text-3xl font-bold mt-1 tabular-nums">{card.value}</p>
                </div>
                <card.icon className="w-5 h-5 opacity-50 mt-0.5" />
              </div>
              <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white/10" />
            </button>
          ))}
        </div>
      )}

      {/* ── Поиск и фильтры ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Поиск по имени, email, телефону..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="pl-10 h-9 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            >
              <option value="">Все типы</option>
              <option value="contact">Контактная форма</option>
              <option value="cp">Запрос КП</option>
              <option value="training">Обучение</option>
              <option value="conference_registration">Конференция</option>
            </select>

            <select
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            >
              <option value="">Все статусы</option>
              {statusConfig.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5 h-9"
            >
              <Filter className="w-3.5 h-3.5" />
              Фильтры
              {(filterPriority || dateFrom || dateTo) && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-0.5" />
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-slate-500 h-9">
                <X className="w-3.5 h-3.5" />
                Сбросить
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 pb-4 pt-0 border-t border-slate-100 mt-0 pt-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Приоритет</label>
              <select
                className="h-9 w-full px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterPriority}
                onChange={e => { setFilterPriority(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              >
                <option value="">Любой</option>
                {priorityConfig.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Дата от</label>
              <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="h-9 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Дата до</label>
              <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="h-9 bg-slate-50" />
            </div>
          </div>
        )}
      </div>

      {/* ── Массовые действия ── */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-md">
          <span className="text-sm font-semibold">Выбрано: {selectedIds.size}</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => handleBulkStatusChange('in_progress')} className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0">
              <Clock className="w-3.5 h-3.5 mr-1" /> В работу
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleBulkStatusChange('processed')} className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Обработано
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleBulkStatusChange('archived')} className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0">
              <Archive className="w-3.5 h-3.5 mr-1" /> В архив
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleExport(false)} className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0">
              <Download className="w-3.5 h-3.5 mr-1" /> Экспорт
            </Button>
            {!showBulkDeleteConfirm ? (
              <Button size="sm" variant="secondary" onClick={() => setShowBulkDeleteConfirm(true)} className="h-7 text-xs bg-red-500/30 hover:bg-red-500/50 text-white border-0">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Удалить
              </Button>
            ) : (
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1">
                <span className="text-xs">Удалить {selectedIds.size}?</span>
                <button onClick={handleBulkDelete} className="text-xs bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded">Да</button>
                <button onClick={() => setShowBulkDeleteConfirm(false)} className="text-xs hover:underline">Нет</button>
              </div>
            )}
          </div>
          <button onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }} className="sm:ml-auto text-xs opacity-70 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Ошибка ── */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Мобильные карточки ── */}
      <div className="lg:hidden space-y-2">
        {!loading && requests.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border bg-white px-3 py-2.5">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <Checkbox checked={selectAll} onChange={handleSelectAll} />
              Выбрать все
            </label>
            <span className="text-xs text-slate-400">{requests.length} на странице</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Загрузка...
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center text-slate-400">
            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Заявок не найдено</p>
          </div>
        ) : (
          requests.map(req => {
            const pc = getPriorityConfig(req.priority);
            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border border-l-4 ${getRowAccent(req)} p-4 transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(req.id)} onChange={() => handleSelectOne(req.id)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button className="min-w-0 text-left" onClick={() => router.push(`/requests/${req.id}`)}>
                        <div className="font-semibold text-slate-900">{req.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{formatDate(req.created_at)} · {formatTime(req.created_at)}</div>
                      </button>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${formTypeBadgeStyle[req.form_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {formTypeLabels[req.form_type] || req.form_type}
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1 text-xs text-slate-500">
                      {req.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{req.email}</span></div>}
                      {req.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" /><span>{req.phone}</span></div>}
                      {req.institution && <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{req.institution}</span></div>}
                      {req.city && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" /><span>{req.city}</span></div>}
                      {req.message && (
                        <div className="flex items-start gap-1.5 text-slate-400 mt-1">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{req.message}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <StatusPill value={req.status} onChange={v => handleStatusChange(req, v)} />
                      {req.priority && req.priority !== 'normal' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${pc.pill}`}>
                          {pc.label}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => router.push(`/requests/${req.id}`)}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Открыть
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Таблица (десктоп) ── */}
      <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 w-10">
                <Checkbox checked={selectAll} onChange={handleSelectAll} />
              </th>
              <th
                className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1.5">
                  Дата <SortIcon field="created_at" />
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Тип</th>
              <th
                className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1.5">
                  Контакт <SortIcon field="name" />
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Детали</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Загрузка...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-slate-400">
                  <Inbox className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>Заявок не найдено</p>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="mt-2 text-blue-500 hover:underline text-sm">Сбросить фильтры</button>
                  )}
                </td>
              </tr>
            ) : (
              requests.map(req => {
                const pc = getPriorityConfig(req.priority);
                return (
                  <tr
                    key={req.id}
                    className={`border-l-4 cursor-pointer transition-colors hover:bg-slate-50/80 group ${getRowAccent(req)}`}
                    onClick={() => { setSelectedRequest(req); setIsModalOpen(true); }}
                  >
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(req.id)} onChange={() => handleSelectOne(req.id)} />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{formatDate(req.created_at)}</div>
                      <div className="text-xs text-slate-400">{formatTime(req.created_at)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${formTypeBadgeStyle[req.form_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {formTypeLabels[req.form_type] || req.form_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{req.name}</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        {req.email && (
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[160px]">{req.email}</span>
                          </div>
                        )}
                        {req.phone && (
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Phone className="w-3 h-3 shrink-0" />
                            {req.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[220px]">
                      {req.message && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{req.message}</p>
                      )}
                      {req.institution && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{req.institution}</span>
                        </div>
                      )}
                      {req.city && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {req.city}
                        </div>
                      )}
                      {req.notes && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          Есть заметки
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col gap-1.5">
                        <StatusPill value={req.status} onChange={v => handleStatusChange(req, v)} />
                        {req.priority && req.priority !== 'normal' && (
                          <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border font-medium w-fit ${pc.pill}`}>
                            {pc.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          title="Быстрый просмотр"
                          onClick={() => { setSelectedRequest(req); setIsModalOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Открыть полностью"
                          onClick={() => router.push(`/requests/${req.id}`)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Пагинация ── */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.totalCount)} из {pagination.totalCount}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let p: number;
                if (pagination.totalPages <= 5) p = i + 1;
                else if (pagination.page <= 3) p = i + 1;
                else if (pagination.page >= pagination.totalPages - 2) p = pagination.totalPages - 4 + i;
                else p = pagination.page - 2 + i;
                return (
                  <Button
                    key={p}
                    variant={pagination.page === p ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPagination(prev => ({ ...prev, page: p }))}
                  >
                    {p}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Модалка ── */}
      <RequestDetailsModal
        request={selectedRequest}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handleRequestUpdate}
        onDelete={handleRequestDelete}
      />
    </div>
  );
}
