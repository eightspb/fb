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

  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import { RequestDetailsModal, RequestItem } from '@/components/admin/RequestDetailsModal';
import { FroxStatCard } from '@/components/admin/FroxStatCard';

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
  'contact': 'bg-[var(--frox-brand-soft)] text-[var(--frox-brand-strong)] border-[rgba(115,100,219,0.18)]',
  'cp': 'bg-[var(--frox-plum-soft)] text-[#7a5fe4] border-[rgba(143,121,239,0.16)]',
  'training': 'bg-[var(--frox-mint-soft)] text-[#4b8d7f] border-[rgba(122,197,181,0.2)]',
  'conference_registration': 'bg-[var(--frox-slate-soft)] text-[var(--frox-gray-600)] border-[var(--frox-neutral-border)]',
};

const statusConfig = [
  { value: 'new', label: 'Новая', pill: 'bg-[var(--frox-brand-soft)] text-[var(--frox-brand-strong)] border border-[rgba(115,100,219,0.18)]', dot: 'bg-[var(--frox-brand)]', icon: Inbox },
  { value: 'in_progress', label: 'В работе', pill: 'bg-[var(--frox-plum-soft)] text-[#7a5fe4] border border-[rgba(143,121,239,0.16)]', dot: 'bg-[var(--frox-plum)]', icon: Clock },
  { value: 'processed', label: 'Обработана', pill: 'bg-[var(--frox-mint-soft)] text-[#4b8d7f] border border-[rgba(122,197,181,0.2)]', dot: 'bg-[var(--frox-mint)]', icon: CheckCircle2 },
  { value: 'archived', label: 'В архиве', pill: 'bg-[var(--frox-slate-soft)] text-[var(--frox-gray-500)] border border-[var(--frox-neutral-border)]', dot: 'bg-[var(--frox-gray-400)]', icon: Archive },
];

const priorityConfig = [
  { value: 'low', label: 'Низкий', pill: 'bg-[var(--frox-gray-100)] text-[var(--frox-gray-500)] border border-[var(--frox-neutral-border)]' },
  { value: 'normal', label: 'Обычный', pill: 'bg-[var(--frox-gray-100)] text-[var(--frox-gray-600)] border border-[var(--frox-neutral-border)]' },
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
  if (req.priority === 'urgent') return 'border-l-red-500';
  if (req.priority === 'high') return 'border-l-orange-400';
  if (req.status === 'new') return 'border-l-[var(--frox-brand)]';
  if (req.status === 'in_progress') return 'border-l-amber-400';
  if (req.status === 'processed') return 'border-l-emerald-400';
  return 'border-l-[var(--frox-gray-200)]';
}

// Inline status selector that matches pill style
function StatusPill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = getStatusConfig(value);

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-all ${cfg.pill}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[var(--frox-neutral-border)] rounded-xl shadow-lg py-1 min-w-[140px]">
            {statusConfig.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-[var(--frox-gray-100)] transition-colors ${value === opt.value ? 'font-semibold' : ''}`}
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
    if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-[var(--frox-gray-300)]" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
      : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />;
  }

  return (
    <div className="space-y-5">
      {/* ── Заголовок ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 data-frox-heading="true" className="text-3xl font-black tracking-tight text-[var(--frox-gray-1100)]">Заявки</h1>
          {stats && (
            <p className="text-sm text-[var(--frox-gray-500)] mt-1">
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
            { label: 'Новые', value: stats.new_count, icon: Inbox, tone: 'brand' as const, filterVal: 'new' },
            { label: 'В работе', value: stats.in_progress_count, icon: Clock, tone: 'plum' as const, filterVal: 'in_progress' },
            { label: 'Обработано', value: stats.processed_count, icon: CheckCircle2, tone: 'mint' as const, filterVal: 'processed' },
            { label: 'В архиве', value: stats.archived_count, icon: Archive, tone: 'slate' as const, filterVal: 'archived' },
          ].map(card => (
            <FroxStatCard
              key={card.filterVal}
              label={card.label}
              value={card.value}
              icon={card.icon}
              tone={card.tone}
              active={filterStatus === card.filterVal}
              onClick={() => {
                setFilterStatus(filterStatus === card.filterVal ? '' : card.filterVal);
                setPagination(p => ({ ...p, page: 1 }));
              }}
            />
          ))}
        </div>
      )}

      {/* ── Поиск и фильтры ── */}
      <div className="frox-toolbar overflow-hidden rounded-[28px]">
        <div className="p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--frox-gray-400)] pointer-events-none" />
            <Input
              placeholder="Поиск по имени, email, телефону..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="h-10 border-[rgba(115,100,219,0.1)] bg-white/80 pl-10 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="frox-select h-10 rounded-xl px-3 text-sm"
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
              className="frox-select h-10 rounded-xl px-3 text-sm"
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
              className="h-10 gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Фильтры
              {(filterPriority || dateFrom || dateTo) && (
                <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[var(--frox-brand)]" />
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 gap-1 text-[var(--frox-gray-500)]">
                <X className="w-3.5 h-3.5" />
                Сбросить
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[rgba(115,100,219,0.1)] px-4 pb-4 pt-4">
            <div>
              <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5">Приоритет</label>
              <select
                className="frox-select h-10 w-full rounded-xl px-3 text-sm"
                value={filterPriority}
                onChange={e => { setFilterPriority(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              >
                <option value="">Любой</option>
                {priorityConfig.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5">Дата от</label>
              <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="h-10 bg-white/80" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5">Дата до</label>
              <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="h-10 bg-white/80" />
            </div>
          </div>
        )}
      </div>

      {/* ── Массовые действия ── */}
      {selectedIds.size > 0 && (
        <div className="frox-bulk-bar flex flex-wrap items-center gap-3 rounded-[28px] px-4 py-3 text-white">
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
          <div className="frox-shell-surface flex items-center justify-between rounded-2xl px-3 py-2.5">
            <label className="flex items-center gap-2 text-sm text-[var(--frox-gray-600)] cursor-pointer">
              <Checkbox checked={selectAll} onChange={handleSelectAll} />
              Выбрать все
            </label>
            <span className="text-xs text-[var(--frox-gray-400)]">{requests.length} на странице</span>
          </div>
        )}

        {loading ? (
          <div className="frox-empty-state rounded-[28px] p-12 text-center text-[var(--frox-gray-400)]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Загрузка...
          </div>
        ) : requests.length === 0 ? (
          <div className="frox-empty-state rounded-[28px] p-12 text-center text-[var(--frox-gray-400)]">
            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Заявок не найдено</p>
          </div>
        ) : (
          requests.map(req => {
            const pc = getPriorityConfig(req.priority);
            return (
              <div
                key={req.id}
                className={`frox-shell-surface rounded-[28px] border-l-4 ${getRowAccent(req)} p-4 transition-all hover:border-[rgba(115,100,219,0.22)]`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(req.id)} onChange={() => handleSelectOne(req.id)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button className="min-w-0 text-left" onClick={() => router.push(`/requests/${req.id}`)}>
                        <div className="font-semibold text-[var(--frox-gray-1100)]">{req.name}</div>
                        <div className="text-xs text-[var(--frox-gray-400)] mt-0.5">{formatDate(req.created_at)} · {formatTime(req.created_at)}</div>
                      </button>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${formTypeBadgeStyle[req.form_type] || 'bg-[var(--frox-gray-100)] text-[var(--frox-gray-600)] border-[var(--frox-neutral-border)]'}`}>
                        {formTypeLabels[req.form_type] || req.form_type}
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1 text-xs text-[var(--frox-gray-500)]">
                      {req.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{req.email}</span></div>}
                      {req.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" /><span>{req.phone}</span></div>}
                      {req.institution && <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{req.institution}</span></div>}
                      {req.city && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" /><span>{req.city}</span></div>}
                      {req.message && (
                        <div className="flex items-start gap-1.5 text-[var(--frox-gray-400)] mt-1">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{req.message}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <StatusPill value={req.status} onChange={v => handleStatusChange(req, v)} />
                      {req.priority && req.priority !== 'normal' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${pc.pill}`}>
                          {pc.label}
                        </span>
                      )}
                      <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => router.push(`/requests/${req.id}`)}>
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
      <div className="frox-table-shell hidden overflow-hidden rounded-[28px] lg:block">
        <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--frox-gray-200)]">
              <th className="px-4 py-3 w-10">
                <Checkbox checked={selectAll} onChange={handleSelectAll} />
              </th>
              <th
                className="px-4 py-3 text-xs font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--frox-gray-800)] select-none whitespace-nowrap"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1.5">
                  Дата <SortIcon field="created_at" />
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider">Тип</th>
              <th
                className="px-4 py-3 text-xs font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider cursor-pointer hover:text-[var(--frox-gray-800)] select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1.5">
                  Контакт <SortIcon field="name" />
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider">Детали</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider">Статус</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--frox-gray-100)]">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-[var(--frox-gray-400)]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Загрузка...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-[var(--frox-gray-400)]">
                  <Inbox className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>Заявок не найдено</p>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="mt-2 text-sm text-[var(--frox-brand)] hover:underline">Сбросить фильтры</button>
                  )}
                </td>
              </tr>
            ) : (
              requests.map(req => {
                const pc = getPriorityConfig(req.priority);
                return (
                  <tr
                    key={req.id}
                    className="cursor-pointer transition-colors hover:bg-[var(--frox-gray-100)]/80 group"
                    onClick={() => { setSelectedRequest(req); setIsModalOpen(true); }}
                  >
                    <td className={`pl-3 pr-2 py-3.5 border-l-4 ${getRowAccent(req)}`} onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(req.id)} onChange={() => handleSelectOne(req.id)} />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-[var(--frox-gray-900)]">{formatDate(req.created_at)}</div>
                      <div className="text-xs text-[var(--frox-gray-400)]">{formatTime(req.created_at)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${formTypeBadgeStyle[req.form_type] || 'bg-[var(--frox-gray-100)] text-[var(--frox-gray-600)] border-[var(--frox-neutral-border)]'}`}>
                        {formTypeLabels[req.form_type] || req.form_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[var(--frox-gray-1100)]">{req.name}</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        {req.email && (
                          <div className="flex items-center gap-1 text-xs text-[var(--frox-gray-400)]">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[160px]">{req.email}</span>
                          </div>
                        )}
                        {req.phone && (
                          <div className="flex items-center gap-1 text-xs text-[var(--frox-gray-400)]">
                            <Phone className="w-3 h-3 shrink-0" />
                            {req.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[220px]">
                      {req.message && (
                        <p className="text-xs text-[var(--frox-gray-500)] line-clamp-2 leading-relaxed">{req.message}</p>
                      )}
                      {req.institution && (
                        <div className="flex items-center gap-1 text-xs text-[var(--frox-gray-400)] mt-1">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{req.institution}</span>
                        </div>
                      )}
                      {req.city && (
                        <div className="flex items-center gap-1 text-xs text-[var(--frox-gray-400)]">
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
                          className="p-1.5 rounded-lg hover:bg-[var(--frox-gray-200)] text-[var(--frox-gray-500)] hover:text-[var(--frox-gray-800)] transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Открыть полностью"
                          onClick={() => router.push(`/requests/${req.id}`)}
                          className="p-1.5 rounded-lg hover:bg-[var(--frox-gray-200)] text-[var(--frox-gray-500)] hover:text-[var(--frox-gray-800)] transition-colors"
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
      </div>

      {/* ── Пагинация ── */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-[var(--frox-gray-500)]">
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
