'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  SlidersHorizontal
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

const statusOptions = [
  { value: 'new', label: 'Новая', color: 'bg-blue-100 text-blue-800', icon: Inbox },
  { value: 'in_progress', label: 'В работе', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { value: 'processed', label: 'Обработана', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  { value: 'archived', label: 'В архиве', color: 'bg-gray-100 text-gray-800', icon: Archive }
];

const priorityOptions = [
  { value: 'low', label: 'Низкий', color: 'bg-gray-100 text-gray-600' },
  { value: 'normal', label: 'Обычный', color: 'bg-blue-100 text-blue-600' },
  { value: 'high', label: 'Высокий', color: 'bg-orange-100 text-orange-600' },
  { value: 'urgent', label: 'Срочный', color: 'bg-red-100 text-red-600' }
];

export default function AdminRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 25, totalCount: 0, totalPages: 0 });
  const [stats, setStats] = useState<Stats | null>(null);
  
  // Фильтры
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Сортировка
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Выбор для массовых действий
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Модальное окно
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Подтверждение массового удаления
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

      const response = await fetch(`/api/admin/requests?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
        setPagination(data.pagination);
        setStats(data.stats);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Ошибка загрузки заявок');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus, filterPriority, dateFrom, dateTo, sortBy, sortOrder, pagination.page, pagination.limit]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Сброс выбора при смене страницы/фильтров
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, [pagination.page, filterType, filterStatus, search]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === requests.length);
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    
    try {
      const response = await adminCsrfFetch('/api/admin/requests', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ids: Array.from(selectedIds), 
          status: newStatus 
        })
      });

      if (response.ok) {
        loadRequests();
        setSelectedIds(new Set());
        setSelectAll(false);
      }
    } catch (error) {
      console.error('Error bulk updating:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const response = await adminCsrfFetch('/api/admin/requests', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });

      if (response.ok) {
        loadRequests();
        setSelectedIds(new Set());
        setSelectAll(false);
        setShowBulkDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Error bulk deleting:', error);
    }
  };

  const handleExport = (exportAll: boolean = true) => {
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

  const openRequestDetails = (request: RequestItem) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleRequestUpdate = (updatedRequest: RequestItem) => {
    setRequests(requests.map(r => r.id === updatedRequest.id ? updatedRequest : r));
    setSelectedRequest(updatedRequest);
  };

  const handleRequestDelete = (id: string) => {
    setRequests(requests.filter(r => r.id !== id));
    if (stats) {
      setStats({
        ...stats,
        total_count: (parseInt(stats.total_count) - 1).toString()
      });
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterType('');
    setFilterStatus('');
    setFilterPriority('');
    setDateFrom('');
    setDateTo('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = search || filterType || filterStatus || filterPriority || dateFrom || dateTo;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const option = statusOptions.find(s => s.value === status);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const option = statusOptions.find(s => s.value === status);
    return option?.label || status;
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'bg-slate-100 text-slate-600';
    const option = priorityOptions.find(p => p.value === priority);
    return option?.color || 'bg-slate-100 text-slate-600';
  };

  const getPriorityLabel = (priority?: string) => {
    if (!priority) return 'Обычный';
    const option = priorityOptions.find(p => p.value === priority);
    return option?.label || priority;
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Заявки</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => loadRequests()} title="Обновить">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={() => handleExport(true)} className="gap-2 flex-1 sm:flex-none">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Экспорт CSV</span>
            <span className="sm:hidden">Экспорт</span>
          </Button>
        </div>
      </div>

      {/* Карточки статистики */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-600 text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center gap-2 opacity-80">
              <Inbox className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Новые</span>
            </div>
            <div className="text-3xl font-bold">{stats.new_count}</div>
          </div>
          <div className="bg-amber-500 text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center gap-2 opacity-80">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">В работе</span>
            </div>
            <div className="text-3xl font-bold">{stats.in_progress_count}</div>
          </div>
          <div className="bg-emerald-600 text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center gap-2 opacity-80">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Обработано</span>
            </div>
            <div className="text-3xl font-bold">{stats.processed_count}</div>
          </div>
          <div className="bg-slate-700 text-white rounded-xl p-4 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center gap-2 opacity-80">
              <Archive className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Всего</span>
            </div>
            <div className="text-3xl font-bold">{stats.total_count}</div>
          </div>
        </div>
      )}

      {/* Поиск и фильтры */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Поиск */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Поиск по имени, email, телефону, городу..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="pl-10"
              />
            </div>
            
            {/* Быстрые фильтры */}
            <div className="flex flex-wrap gap-2">
              <select
                className="h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                <option value="">Все типы</option>
                <option value="contact">Контактная форма</option>
                <option value="cp">Запрос КП</option>
                <option value="training">Обучение</option>
                <option value="conference_registration">Конференция</option>
              </select>
              
              <select
                className="h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                <option value="">Все статусы</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <Button 
                variant={showFilters ? "secondary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2 w-full sm:w-auto"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Ещё</span>
                <span className="sm:hidden">Доп. фильтры</span>
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="gap-1 text-slate-500 w-full sm:w-auto">
                  <X className="w-4 h-4" />
                  Сбросить
                </Button>
              )}
            </div>
          </div>

          {/* Расширенные фильтры */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Приоритет</label>
                <select
                  className="h-9 w-full px-3 py-1 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterPriority}
                  onChange={(e) => {
                    setFilterPriority(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  <option value="">Любой</option>
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Дата от</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="h-9 w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Дата до</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="h-9 w-full"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Массовые действия */}
      {selectedIds.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-blue-800">
                Выбрано: {selectedIds.size}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('in_progress')}>
                  <Clock className="w-4 h-4 mr-1" />
                  В работу
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('processed')}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Обработано
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('archived')}>
                  <Archive className="w-4 h-4 mr-1" />
                  В архив
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleExport(false)}>
                  <Download className="w-4 h-4 mr-1" />
                  Экспорт
                </Button>
                {!showBulkDeleteConfirm ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Удалить
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">Удалить {selectedIds.size} заявок?</span>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>Да</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowBulkDeleteConfirm(false)}>Нет</Button>
                  </div>
                )}
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }}
                className="sm:ml-auto w-full sm:w-auto"
              >
                Снять выбор
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ошибка */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Мобильный список заявок */}
      <div className="lg:hidden space-y-3">
        {!loading && requests.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <Checkbox checked={selectAll} onChange={handleSelectAll} />
              Выбрать все
            </label>
            <span className="text-xs text-slate-500">{requests.length} на странице</span>
          </div>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Загрузка...
            </CardContent>
          </Card>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Заявок не найдено
            </CardContent>
          </Card>
        ) : (
          requests.map((req) => (
            <Card
              key={req.id}
              className={`border transition-colors ${
                req.priority === 'urgent' ? 'border-red-200 bg-red-50/40' :
                req.priority === 'high' ? 'border-orange-200 bg-orange-50/30' :
                req.status === 'new' ? 'border-blue-200 bg-blue-50/20' :
                'border-slate-200'
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <Checkbox
                      checked={selectedIds.has(req.id)}
                      onChange={() => handleSelectOne(req.id)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => router.push(`/requests/${req.id}`)}
                      >
                        <div className="font-semibold text-slate-900 truncate">{req.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {formatDate(req.created_at)} · {formatTime(req.created_at)}
                        </div>
                      </button>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {formTypeLabels[req.form_type] || req.form_type}
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1 min-w-0">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{req.email}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span className="truncate">{req.phone}</span>
                      </div>
                      {req.message && (
                        <div className="text-slate-600">
                          {req.message.substring(0, 90)}{req.message.length > 90 ? '...' : ''}
                        </div>
                      )}
                      {req.institution && (
                        <div className="text-slate-500 truncate">{req.institution}</div>
                      )}
                      {req.city && (
                        <div className="text-slate-500 truncate">{req.city}</div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge className={`text-xs ${getStatusColor(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(req.priority)}`}>
                        {getPriorityLabel(req.priority)}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      <select
                        className={`h-9 w-full text-xs px-3 rounded-md border font-medium cursor-pointer focus:ring-2 ring-offset-1 ${getStatusColor(req.status)}`}
                        value={req.status || 'new'}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          setRequests(requests.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
                          try {
                            await adminCsrfFetch(`/api/admin/requests/${req.id}`, {
                              method: 'PATCH',
                              credentials: 'include',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ status: newStatus })
                            });
                          } catch {
                            loadRequests();
                          }
                        }}
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push(`/requests/${req.id}`)}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Открыть заявку
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Таблица заявок (десктоп) */}
      <Card className="hidden lg:block">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 w-10">
                  <Checkbox 
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
                <th 
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Дата
                    {sortBy === 'created_at' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3">Тип</th>
                <th 
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Контакт
                    {sortBy === 'name' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3">Детали</th>
                <th 
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Статус
                    {sortBy === 'status' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Загрузка...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Заявок не найдено
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr
                    key={req.id}
                    className={`border-b cursor-pointer transition-colors hover:bg-slate-50 ${
                      req.priority === 'urgent' ? 'border-l-4 border-l-red-500 bg-red-50/40' :
                      req.priority === 'high'   ? 'border-l-4 border-l-orange-400 bg-orange-50/30' :
                      req.status === 'new'      ? 'border-l-4 border-l-blue-400 bg-blue-50/20' :
                      req.status === 'in_progress' ? 'border-l-4 border-l-amber-400' :
                      req.status === 'processed'   ? 'border-l-4 border-l-emerald-400' :
                                                     'border-l-4 border-l-transparent'
                    }`}
                    onClick={() => openRequestDetails(req)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedIds.has(req.id)}
                        onChange={() => handleSelectOne(req.id)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium">{formatDate(req.created_at)}</div>
                      <div className="text-xs text-slate-500">{formatTime(req.created_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {formTypeLabels[req.form_type] || req.form_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{req.name}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {req.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />
                        {req.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {req.message && (
                        <div className="text-sm text-slate-600 truncate mb-1" title={req.message}>
                          {req.message.substring(0, 50)}{req.message.length > 50 ? '...' : ''}
                        </div>
                      )}
                      {req.institution && (
                        <div className="text-xs text-slate-500 truncate">{req.institution}</div>
                      )}
                      {req.city && (
                        <div className="text-xs text-slate-500">{req.city}</div>
                      )}
                      {req.metadata?.conference && (
                        <div className="text-xs text-blue-600 truncate" title={req.metadata.conference}>
                          {req.metadata.conference.substring(0, 30)}...
                        </div>
                      )}
                      {req.notes && (
                        <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Есть заметки
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer focus:ring-2 ring-offset-1 ${getStatusColor(req.status)}`}
                        value={req.status || 'new'}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          setRequests(requests.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
                          try {
                            await adminCsrfFetch(`/api/admin/requests/${req.id}`, {
                              method: 'PATCH',
                              credentials: 'include',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ status: newStatus })
                            });
                          } catch {
                            loadRequests();
                          }
                        }}
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Быстрый просмотр">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Открыть полностью"
                          onClick={(e) => { e.stopPropagation(); router.push(`/requests/${req.id}`); }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Пагинация */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            Показано {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalCount)} из {pagination.totalCount}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              <ChevronLeft className="w-4 h-4" />
              Назад
            </Button>
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-9"
                    onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <span className="sm:hidden text-sm text-slate-500">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Вперёд
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Модальное окно деталей */}
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
