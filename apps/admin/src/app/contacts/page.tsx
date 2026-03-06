'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  RefreshCw,
  Search,
  Trash2,
  Archive,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  ArrowUpDown,
  Users,
  Tag,
  MapPin,
  Stethoscope,
  Building2,
  Plus,
  Pencil,
  Check,
  XCircle,
  Upload,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import { useRef } from 'react';

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  institution: string | null;
  speciality: string | null;
  tags: string[];
  status: string;
  notes: string | null;
  import_source: string;
  created_at: string;
  updated_at: string;
}

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

const statusOptions = [
  { value: 'new', label: 'Новый', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress', label: 'В работе', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'processed', label: 'Обработан', color: 'bg-green-100 text-green-800' },
  { value: 'archived', label: 'В архиве', color: 'bg-gray-100 text-gray-800' },
];

function getStatusColor(status: string) {
  return statusOptions.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';
}

function getStatusLabel(status: string) {
  return statusOptions.find(s => s.value === status)?.label || status;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ── Inline editable field ──────────────────────────────────────────────────────

function EditableField({
  value,
  onSave,
  placeholder = '—',
}: {
  value: string | null;
  onSave: (val: string) => Promise<void>;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  // Sync draft when value changes externally (e.g. contact updated from another action)
  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <span
        className="group flex items-center gap-1 cursor-pointer text-slate-700 hover:text-slate-900"
        onClick={() => { setDraft(value || ''); setEditing(true); }}
      >
        <span className={value ? '' : 'text-slate-400 italic'}>{value || placeholder}</span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0" />
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-7 text-sm py-0 px-2"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
      <button onClick={handleSave} disabled={saving} className="text-green-600 hover:text-green-700">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
        <XCircle className="w-4 h-4" />
      </button>
    </span>
  );
}

function EditableSelect({
  value,
  options,
  onSave,
}: {
  value: string;
  options: { value: string; label: string; color: string }[];
  onSave: (val: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (newVal: string) => {
    setSaving(true);
    try {
      await onSave(newVal);
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer focus:ring-2 ring-offset-1 ${getStatusColor(value)} ${saving ? 'opacity-60' : ''}`}
      value={value}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Import modal ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS_IMPORT = [
  { value: 'archived', label: 'В архиве' },
  { value: 'new', label: 'Новый' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'processed', label: 'Обработан' },
];

function ImportModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('archived');
  const [importSource, setImportSource] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; total: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tags', tags);
      fd.append('status', status);
      fd.append('import_source', importSource || 'csv');
      const res = await adminCsrfFetch('/api/admin/contacts/import', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка импорта');
      } else {
        setResult(data);
        onDone();
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-lg text-slate-900">Импорт контактов из CSV</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* File */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Файл CSV *</label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                  <FileText className="w-4 h-4 text-blue-500" />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              ) : (
                <div className="text-slate-400 text-sm">
                  <Upload className="w-6 h-6 mx-auto mb-1" />
                  Нажмите для выбора файла (.csv, .txt)
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Поддерживаемые колонки: ФИО / full_name, email, телефон / phone, город / city, организация / institution, специальность / speciality, теги / tags, заметки / notes
            </p>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Источник импорта</label>
            <Input
              value={importSource}
              onChange={(e) => setImportSource(e.target.value)}
              placeholder="tilda, excel, manual..."
              className="h-9"
            />
          </div>

          {/* Default status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Статус по умолчанию</label>
            <select
              className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS_IMPORT.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Default tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Добавить теги всем (через запятую)</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tilda-import, conf-2025..."
              className="h-9"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-green-50 rounded-lg px-4 py-3 text-sm space-y-1">
              <div className="font-medium text-green-800">
                Импортировано: {result.imported} из {result.total}
              </div>
              {result.skipped > 0 && (
                <div className="text-slate-500">Пропущено: {result.skipped}</div>
              )}
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {result.errors.map((e, i) => (
                    <div key={i} className="text-xs text-red-600">{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {result ? 'Закрыть' : 'Отмена'}
          </Button>
          {!result && (
            <Button onClick={handleSubmit} disabled={!file || loading} className="gap-2">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Импортировать
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Contact detail panel ───────────────────────────────────────────────────────

function ContactPanel({
  contact,
  onUpdate,
  onClose,
  onDelete,
}: {
  contact: Contact;
  onUpdate: (c: Contact) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [tagInput, setTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Сбрасываем подтверждение удаления при переключении на другой контакт
  useEffect(() => {
    setShowDeleteConfirm(false);
    setTagInput('');
  }, [contact.id]);

  const patchField = async (fields: Partial<Contact>) => {
    const res = await adminCsrfFetch(`/api/admin/contacts/${contact.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
    }
  };

  const addTag = async () => {
    const tag = tagInput.trim();
    if (!tag || contact.tags.includes(tag)) { setTagInput(''); return; }
    await patchField({ tags: [...contact.tags, tag] });
    setTagInput('');
  };

  const removeTag = async (tag: string) => {
    await patchField({ tags: contact.tags.filter(t => t !== tag) });
  };

  const handleDelete = async () => {
    const res = await adminCsrfFetch(`/api/admin/contacts/${contact.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      onDelete(contact.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50 sticky top-0 z-10">
          <div>
            <h2 className="font-semibold text-lg text-slate-900 leading-tight">{contact.full_name}</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(contact.status)}`}>
              {getStatusLabel(contact.status)}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5">
          {/* Status */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Статус</div>
            <EditableSelect
              value={contact.status}
              options={statusOptions}
              onSave={(val) => patchField({ status: val })}
            />
          </div>

          {/* Contact details */}
          <div className="space-y-2">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Контакты</div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <EditableField value={contact.email} onSave={(v) => patchField({ email: v || null } as Partial<Contact>)} placeholder="не указан" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <EditableField value={contact.phone} onSave={(v) => patchField({ phone: v || null } as Partial<Contact>)} placeholder="не указан" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <EditableField value={contact.city} onSave={(v) => patchField({ city: v || null } as Partial<Contact>)} placeholder="город не указан" />
            </div>
          </div>

          {/* Work */}
          <div className="space-y-2">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Место работы</div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <EditableField value={contact.institution} onSave={(v) => patchField({ institution: v || null } as Partial<Contact>)} placeholder="организация не указана" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
              <EditableField value={contact.speciality} onSave={(v) => patchField({ speciality: v || null } as Partial<Contact>)} placeholder="специальность не указана" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Теги</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {contact.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {contact.tags.length === 0 && <span className="text-xs text-slate-400 italic">нет тегов</span>}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Добавить тег..."
                className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') addTag(); }}
              />
              <Button size="sm" variant="outline" onClick={addTag} className="h-8 px-2">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Заметки</div>
            <EditableField value={contact.notes} onSave={(v) => patchField({ notes: v || null } as Partial<Contact>)} placeholder="добавить заметку..." />
          </div>

          {/* Meta */}
          <div className="text-xs text-slate-400 pt-2 border-t space-y-0.5">
            <div>Источник: <span className="font-medium">{contact.import_source}</span></div>
            <div>Добавлен: {formatDate(contact.created_at)}</div>
          </div>
        </div>

        {/* Delete */}
        <div className="px-5 py-4 border-t bg-slate-50">
          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 w-full"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Удалить контакт
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 flex-1">Удалить навсегда?</span>
              <Button size="sm" variant="destructive" onClick={handleDelete}>Да</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Нет</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 50, totalCount: 0, totalPages: 0 });
  const [stats, setStats] = useState<Stats | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [showBulkTagInput, setShowBulkTagInput] = useState(false);
  const [bulkTagValue, setBulkTagValue] = useState('');
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterTag) params.set('tag', filterTag);
      if (filterCity) params.set('city', filterCity);
      params.set('sort_by', sortBy);
      params.set('sort_order', sortOrder);
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());

      const res = await fetch(`/api/admin/contacts?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
        setPagination(data.pagination);
        setStats(data.stats);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Ошибка загрузки');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterTag, filterCity, sortBy, sortOrder, pagination.page, pagination.limit]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, [pagination.page, filterStatus, filterTag, search]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
    setSelectAll(next.size === contacts.length);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleBulkStatus = async (status: string) => {
    if (!selectedIds.size) return;
    const res = await adminCsrfFetch('/api/admin/contacts', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), status }),
    });
    if (res.ok) { loadContacts(); setSelectedIds(new Set()); setSelectAll(false); }
  };

  const handleBulkAddTag = async () => {
    const tag = bulkTagValue.trim();
    if (!tag || !selectedIds.size) return;
    const res = await adminCsrfFetch('/api/admin/contacts', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), tags_add: [tag] }),
    });
    if (res.ok) { loadContacts(); setBulkTagValue(''); setShowBulkTagInput(false); }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    const res = await adminCsrfFetch('/api/admin/contacts', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (res.ok) {
      loadContacts();
      setSelectedIds(new Set());
      setSelectAll(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleContactUpdate = (updated: Contact) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedContact(updated);
  };

  const handleContactDelete = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterTag('');
    setFilterCity('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = search || filterStatus || filterTag || filterCity;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Контакты</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Импорт CSV
          </Button>
          <Button variant="outline" size="icon" onClick={loadContacts} title="Обновить">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
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
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Всего</span>
            </div>
            <div className="text-3xl font-bold">{stats.total_count}</div>
          </div>
        </div>
      )}

      {/* Search & filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Поиск по имени, email, телефону, городу, специальности..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              >
                <option value="">Все статусы</option>
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Фильтр по тегу"
                  value={filterTag}
                  onChange={(e) => { setFilterTag(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  className="pl-9 h-10 w-40"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Город"
                  value={filterCity}
                  onChange={(e) => { setFilterCity(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  className="pl-9 h-10 w-36"
                />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="gap-1 text-slate-500">
                  <X className="w-4 h-4" />
                  Сбросить
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-blue-800">Выбрано: {selectedIds.size}</span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkStatus('in_progress')}>
                  <Clock className="w-4 h-4 mr-1" /> В работу
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatus('processed')}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Обработан
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatus('archived')}>
                  <Archive className="w-4 h-4 mr-1" /> В архив
                </Button>

                {!showBulkTagInput ? (
                  <Button size="sm" variant="outline" onClick={() => setShowBulkTagInput(true)}>
                    <Tag className="w-4 h-4 mr-1" /> Добавить тег
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Input
                      value={bulkTagValue}
                      onChange={(e) => setBulkTagValue(e.target.value)}
                      placeholder="Тег..."
                      className="h-8 text-sm w-32"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleBulkAddTag(); if (e.key === 'Escape') setShowBulkTagInput(false); }}
                    />
                    <Button size="sm" variant="outline" onClick={handleBulkAddTag}><Check className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowBulkTagInput(false)}><X className="w-4 h-4" /></Button>
                  </div>
                )}

                {!showBulkDeleteConfirm ? (
                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => setShowBulkDeleteConfirm(true)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Удалить
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">Удалить {selectedIds.size}?</span>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>Да</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowBulkDeleteConfirm(false)}>Нет</Button>
                  </div>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }} className="sm:ml-auto">
                Снять выбор
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" /> {error}
          </CardContent>
        </Card>
      )}

      {/* Mobile list */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <Card><CardContent className="py-12 text-center text-slate-500"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Загрузка...</CardContent></Card>
        ) : contacts.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-slate-500"><Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />Контактов не найдено</CardContent></Card>
        ) : (
          contacts.map(c => (
            <Card key={c.id} className="border-slate-200 cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setSelectedContact(c)}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(c.id)} onChange={() => handleSelectOne(c.id)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-900 truncate">{c.full_name}</div>
                      <Badge className={`text-xs shrink-0 ${getStatusColor(c.status)}`}>{getStatusLabel(c.status)}</Badge>
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                      {c.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{c.email}</span></div>}
                      {c.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{c.phone}</div>}
                      {(c.city || c.institution) && (
                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{[c.city, c.institution].filter(Boolean).join(' · ')}</div>
                      )}
                      {c.speciality && <div className="flex items-center gap-1"><Stethoscope className="w-3 h-3 shrink-0" />{c.speciality}</div>}
                    </div>
                    {c.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.tags.slice(0, 4).map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{t}</span>
                        ))}
                        {c.tags.length > 4 && <span className="text-xs text-slate-400">+{c.tags.length - 4}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden lg:block">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 w-10">
                  <Checkbox checked={selectAll} onChange={handleSelectAll} />
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('full_name')}>
                  <div className="flex items-center gap-1">Имя {sortBy === 'full_name' && <ArrowUpDown className="w-3 h-3" />}</div>
                </th>
                <th className="px-4 py-3">Контакты</th>
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('city')}>
                  <div className="flex items-center gap-1">Город {sortBy === 'city' && <ArrowUpDown className="w-3 h-3" />}</div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('speciality')}>
                  <div className="flex items-center gap-1">Специальность {sortBy === 'speciality' && <ArrowUpDown className="w-3 h-3" />}</div>
                </th>
                <th className="px-4 py-3">Теги</th>
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">Статус {sortBy === 'status' && <ArrowUpDown className="w-3 h-3" />}</div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-1">Дата {sortBy === 'created_at' && <ArrowUpDown className="w-3 h-3" />}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Загрузка...</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500"><Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />Контактов не найдено</td></tr>
              ) : (
                contacts.map(c => (
                  <tr
                    key={c.id}
                    className="border-b cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => setSelectedContact(c)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(c.id)} onChange={() => handleSelectOne(c.id)} />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px]">
                      <div className="truncate">{c.full_name}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 space-y-0.5">
                      {c.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 shrink-0" /><span className="truncate max-w-[180px]">{c.email}</span></div>}
                      {c.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{c.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.city || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[160px]">
                      <span className="truncate block">{c.speciality || <span className="text-slate-300">—</span>}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{t}</span>
                        ))}
                        {c.tags.length > 3 && <span className="text-xs text-slate-400">+{c.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <EditableSelect
                        value={c.status}
                        options={statusOptions}
                        onSave={async (val) => {
                          const res = await adminCsrfFetch(`/api/admin/contacts/${c.id}`, {
                            method: 'PATCH',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: val }),
                          });
                          if (res.ok) {
                            const updated = await res.json();
                            setContacts(prev => prev.map(x => x.id === c.id ? updated : x));
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(c.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.totalCount)} из {pagination.totalCount}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>
              <ChevronLeft className="w-4 h-4" /> Назад
            </Button>
            <span className="text-sm text-slate-500">{pagination.page} / {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>
              Вперёд <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Contact detail panel */}
      {selectedContact && (
        <ContactPanel
          contact={selectedContact}
          onUpdate={handleContactUpdate}
          onClose={() => setSelectedContact(null)}
          onDelete={handleContactDelete}
        />
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { loadContacts(); }}
        />
      )}
    </div>
  );
}
