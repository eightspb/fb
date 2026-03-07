'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  ArrowUp,
  ArrowDown,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';

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

const statusConfig = [
  { value: 'new', label: 'Новый', pill: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
  { value: 'in_progress', label: 'В работе', pill: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  { value: 'processed', label: 'Обработан', pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'archived', label: 'В архиве', pill: 'bg-[var(--frox-gray-200)] text-[var(--frox-gray-500)] border border-[var(--frox-neutral-border)]', dot: 'bg-[var(--frox-gray-400)]' },
];

function getStatusConfig(status: string) {
  return statusConfig.find(s => s.value === status) || statusConfig[0];
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Аватар с инициалами
function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = ['bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${color}`}>
      {initials || '?'}
    </div>
  );
}

// Status pill dropdown
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
                {value === opt.value && <Check className="w-3 h-3 ml-auto text-emerald-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Inline editable text
function EditableField({ value, onSave, placeholder = '—' }: {
  value: string | null;
  onSave: (val: string) => Promise<void>;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!editing) setDraft(value || ''); }, [value, editing]);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(draft); setEditing(false); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <span
        className="group flex items-center gap-1 cursor-pointer hover:text-[var(--frox-gray-1100)] transition-colors"
        onClick={() => { setDraft(value || ''); setEditing(true); }}
      >
        <span className={value ? 'text-[var(--frox-gray-800)]' : 'text-[var(--frox-gray-300)] italic text-xs'}>{value || placeholder}</span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-40 shrink-0 transition-opacity" />
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="h-7 text-sm py-0 px-2"
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
      />
      <button onClick={handleSave} disabled={saving} className="p-1 text-emerald-600 hover:text-emerald-700">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => setEditing(false)} className="p-1 text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)]">
        <XCircle className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

// ── Import modal ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS_IMPORT = [
  { value: 'archived', label: 'В архиве' },
  { value: 'new', label: 'Новый' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'processed', label: 'Обработан' },
];

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
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
    setLoading(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tags', tags);
      fd.append('status', status);
      fd.append('import_source', importSource || 'csv');
      const res = await adminCsrfFetch('/api/admin/contacts/import', { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Ошибка импорта');
      else { setResult(data); onDone(); }
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--frox-gray-200)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Upload className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="font-semibold text-[var(--frox-gray-1100)]">Импорт контактов из CSV</h2>
          </div>
          <button onClick={onClose} className="text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] p-1 rounded-lg hover:bg-[var(--frox-gray-200)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-2 uppercase tracking-wider">Файл CSV</label>
            <div
              className="border-2 border-dashed border-[var(--frox-neutral-border)] rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-[var(--frox-gray-800)]">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-[var(--frox-gray-400)]">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div className="text-[var(--frox-gray-400)] text-sm">
                  <Upload className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  Нажмите для выбора файла (.csv, .txt)
                </div>
              )}
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <p className="mt-1.5 text-xs text-[var(--frox-gray-400)] leading-relaxed">
              Поля: ФИО, email, телефон, город, организация, специальность, теги, заметки
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5 uppercase tracking-wider">Источник</label>
              <Input value={importSource} onChange={e => setImportSource(e.target.value)} placeholder="tilda, excel..." className="h-9 bg-[var(--frox-gray-100)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5 uppercase tracking-wider">Статус по умолчанию</label>
              <select
                className="w-full h-9 px-3 rounded-lg border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-100)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS_IMPORT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5 uppercase tracking-wider">Теги для всех (через запятую)</label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="conf-2025, tilda-import..." className="h-9 bg-[var(--frox-gray-100)]" />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {result && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm space-y-1">
              <div className="font-semibold text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Импортировано: {result.imported} из {result.total}
              </div>
              {result.skipped > 0 && <div className="text-[var(--frox-gray-500)]">Пропущено: {result.skipped}</div>}
              {result.errors.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {result.errors.map((e, i) => <div key={i} className="text-xs text-red-600">{e}</div>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--frox-gray-200)] bg-[var(--frox-gray-100)]/60 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>{result ? 'Закрыть' : 'Отмена'}</Button>
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

// ── Contact detail slide-over panel ──────────────────────────────────────────

function ContactPanel({
  contact, onUpdate, onClose, onDelete,
}: {
  contact: Contact;
  onUpdate: (c: Contact) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [tagInput, setTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { setShowDeleteConfirm(false); setTagInput(''); }, [contact.id]);

  const patchField = async (fields: Partial<Contact>) => {
    const res = await adminCsrfFetch(`/api/admin/contacts/${contact.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (res.ok) onUpdate(await res.json());
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
    const res = await adminCsrfFetch(`/api/admin/contacts/${contact.id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) { onDelete(contact.id); onClose(); }
  };

  const sc = getStatusConfig(contact.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      {/* Panel */}
      <div
        className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[var(--frox-gray-200)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={contact.full_name} />
              <div className="min-w-0">
                <h2 className="font-semibold text-[var(--frox-gray-1100)] leading-tight truncate">{contact.full_name}</h2>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${sc.pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => router.push(`/contacts/${contact.id}`)}
                className="p-1.5 rounded-lg hover:bg-[var(--frox-gray-200)] text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] transition-colors"
                title="Открыть страницу контакта"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[var(--frox-gray-200)] text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 py-5 space-y-5">
          {/* Статус */}
          <div>
            <div className="text-[11px] font-semibold text-[var(--frox-gray-400)] uppercase tracking-wider mb-2">Статус</div>
            <div className="flex flex-wrap gap-2">
              {statusConfig.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => patchField({ status: opt.value })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    contact.status === opt.value
                      ? opt.pill + ' shadow-sm'
                      : 'bg-white text-[var(--frox-gray-400)] border-[var(--frox-neutral-border)] hover:border-[var(--frox-gray-300)]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-[var(--frox-gray-200)]" />

          {/* Контакты */}
          <div>
            <div className="text-[11px] font-semibold text-[var(--frox-gray-400)] uppercase tracking-wider mb-2">Контактные данные</div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-[var(--frox-gray-400)] shrink-0" />
                <EditableField value={contact.email} onSave={v => patchField({ email: v || null } as Partial<Contact>)} placeholder="email не указан" />
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-[var(--frox-gray-400)] shrink-0" />
                <EditableField value={contact.phone} onSave={v => patchField({ phone: v || null } as Partial<Contact>)} placeholder="телефон не указан" />
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-[var(--frox-gray-400)] shrink-0" />
                <EditableField value={contact.city} onSave={v => patchField({ city: v || null } as Partial<Contact>)} placeholder="город не указан" />
              </div>
            </div>
          </div>

          {/* Место работы */}
          <div>
            <div className="text-[11px] font-semibold text-[var(--frox-gray-400)] uppercase tracking-wider mb-2">Место работы</div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-[var(--frox-gray-400)] shrink-0" />
                <EditableField value={contact.institution} onSave={v => patchField({ institution: v || null } as Partial<Contact>)} placeholder="организация не указана" />
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Stethoscope className="w-4 h-4 text-[var(--frox-gray-400)] shrink-0" />
                <EditableField value={contact.speciality} onSave={v => patchField({ speciality: v || null } as Partial<Contact>)} placeholder="специальность не указана" />
              </div>
            </div>
          </div>

          {/* Теги */}
          <div>
            <div className="text-[11px] font-semibold text-[var(--frox-gray-400)] uppercase tracking-wider mb-2">Теги</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {contact.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--frox-gray-200)] text-[var(--frox-gray-600)] text-xs font-medium"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-[var(--frox-gray-400)] hover:text-red-500 transition-colors ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {contact.tags.length === 0 && <span className="text-xs text-[var(--frox-gray-300)] italic">нет тегов</span>}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="Добавить тег..."
                className="h-8 text-sm bg-[var(--frox-gray-100)]"
                onKeyDown={e => { if (e.key === 'Enter') addTag(); }}
              />
              <Button size="sm" variant="outline" onClick={addTag} className="h-8 w-8 p-0 shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Заметки */}
          <div>
            <div className="text-[11px] font-semibold text-[var(--frox-gray-400)] uppercase tracking-wider mb-2">Заметки</div>
            <div className="text-sm">
              <EditableField value={contact.notes} onSave={v => patchField({ notes: v || null } as Partial<Contact>)} placeholder="добавить заметку..." />
            </div>
          </div>

          {/* Мета */}
          <div className="text-xs text-[var(--frox-gray-400)] pt-3 border-t border-[var(--frox-gray-200)] space-y-1">
            <div>Источник: <span className="text-[var(--frox-gray-600)] font-medium">{contact.import_source}</span></div>
            <div>Добавлен: <span className="text-[var(--frox-gray-600)]">{formatDate(contact.created_at)}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--frox-gray-200)] bg-[var(--frox-gray-100)]/60">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--frox-gray-400)] hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Удалить контакт
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-sm text-red-700 flex-1">Удалить без возможности восстановления?</span>
              <Button variant="destructive" size="sm" className="h-7 text-xs shrink-0" onClick={handleDelete}>Удалить</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => setShowDeleteConfirm(false)}>Отмена</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Column resize ─────────────────────────────────────────────────────────────

const DEFAULT_COL_WIDTHS = [40, 200, 200, 120, 160, 180, 110, 80];

function useColumnResize(defaultWidths: number[]) {
  const [widths, setWidths] = useState<number[]>(defaultWidths);
  const dragging = useRef<{ col: number; startX: number; startW: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const { col, startX, startW } = dragging.current;
      const delta = e.clientX - startX;
      setWidths(prev => { const next = [...prev]; next[col] = Math.max(40, startW + delta); return next; });
    };
    const onUp = () => { dragging.current = null; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const onResizeStart = (col: number, startX: number, startW: number) => {
    dragging.current = { col, startX, startW };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return { widths, onResizeStart };
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [showBulkTagInput, setShowBulkTagInput] = useState(false);
  const [bulkTagValue, setBulkTagValue] = useState('');
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const searchParams = useSearchParams();
  const { widths, onResizeStart } = useColumnResize(DEFAULT_COL_WIDTHS);

  useEffect(() => {
    const contactId = searchParams.get('contact');
    if (!contactId) return;
    fetch(`/api/admin/contacts/${contactId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSelectedContact(data); })
      .catch(() => {});
  }, [searchParams]);

  const loadContacts = useCallback(async () => {
    setLoading(true); setError(null);
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
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  }, [search, filterStatus, filterTag, filterCity, sortBy, sortOrder, pagination.page, pagination.limit]);

  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { setSelectedIds(new Set()); setSelectAll(false); }, [pagination.page, filterStatus, filterTag, search]);

  const handleSelectAll = () => {
    if (selectAll) setSelectedIds(new Set()); else setSelectedIds(new Set(contacts.map(c => c.id)));
    setSelectAll(!selectAll);
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
    setSelectAll(next.size === contacts.length);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const handleBulkStatus = async (status: string) => {
    if (!selectedIds.size) return;
    const res = await adminCsrfFetch('/api/admin/contacts', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), status }),
    });
    if (res.ok) { loadContacts(); setSelectedIds(new Set()); setSelectAll(false); }
  };

  const handleBulkAddTag = async () => {
    const tag = bulkTagValue.trim();
    if (!tag || !selectedIds.size) return;
    const res = await adminCsrfFetch('/api/admin/contacts', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), tags_add: [tag] }),
    });
    if (res.ok) { loadContacts(); setBulkTagValue(''); setShowBulkTagInput(false); }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    const res = await adminCsrfFetch('/api/admin/contacts', {
      method: 'DELETE', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (res.ok) { loadContacts(); setSelectedIds(new Set()); setSelectAll(false); setShowBulkDeleteConfirm(false); }
  };

  const handleContactUpdate = (updated: Contact) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedContact(updated);
  };

  const handleContactDelete = (id: string) => setContacts(prev => prev.filter(c => c.id !== id));

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterTag(''); setFilterCity('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = search || filterStatus || filterTag || filterCity;

  function SortIcon({ field }: { field: string }) {
    if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-[var(--frox-gray-300)]" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
      : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />;
  }

  const handleStatusChange = async (c: Contact, newStatus: string) => {
    setContacts(prev => prev.map(x => x.id === c.id ? { ...x, status: newStatus } : x));
    try {
      const res = await adminCsrfFetch(`/api/admin/contacts/${c.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setContacts(prev => prev.map(x => x.id === c.id ? updated : x));
        if (selectedContact?.id === c.id) setSelectedContact(updated);
      }
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-5">
      {/* ── Заголовок ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--frox-gray-1100)] tracking-tight">Контакты</h1>
          {stats && <p className="text-sm text-[var(--frox-gray-500)] mt-0.5">Всего {stats.total_count} контактов</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-2 h-9">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Импорт CSV</span>
          </Button>
          <Button variant="outline" size="icon" onClick={loadContacts} title="Обновить" className="h-9 w-9">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
            { label: 'Всего', value: stats.total_count, icon: Users, from: 'from-[var(--frox-gray-700)]', to: 'to-[var(--frox-gray-900)]', filterVal: '' },
          ].map(card => (
            <button
              key={card.label}
              onClick={() => { if (card.filterVal) { setFilterStatus(filterStatus === card.filterVal ? '' : card.filterVal); setPagination(p => ({ ...p, page: 1 })); } }}
              className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all bg-gradient-to-br ${card.from} ${card.to} text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${filterStatus === card.filterVal && card.filterVal ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--frox-gray-200)]' : ''}`}
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
      <div className="bg-white border border-[var(--frox-neutral-border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--frox-gray-400)] pointer-events-none" />
            <Input
              placeholder="Поиск по имени, email, телефону, городу, специальности..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="pl-10 h-9 bg-[var(--frox-gray-100)] border-[var(--frox-neutral-border)] focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 px-3 rounded-lg border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-100)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
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
              {(filterTag || filterCity) && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-0.5" />}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-[var(--frox-gray-500)] h-9">
                <X className="w-3.5 h-3.5" /> Сбросить
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 pb-4 border-t border-[var(--frox-gray-200)] pt-4">
            <div>
              <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5">Тег</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--frox-gray-400)]" />
                <Input
                  placeholder="Фильтр по тегу"
                  value={filterTag}
                  onChange={e => { setFilterTag(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  className="pl-9 h-9 bg-[var(--frox-gray-100)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5">Город</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--frox-gray-400)]" />
                <Input
                  placeholder="Город"
                  value={filterCity}
                  onChange={e => { setFilterCity(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  className="pl-9 h-9 bg-[var(--frox-gray-100)]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Массовые действия ── */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-md">
          <span className="text-sm font-semibold">Выбрано: {selectedIds.size}</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => handleBulkStatus('in_progress')} className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0">
              <Clock className="w-3.5 h-3.5 mr-1" /> В работу
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleBulkStatus('processed')} className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Обработан
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleBulkStatus('archived')} className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0">
              <Archive className="w-3.5 h-3.5 mr-1" /> В архив
            </Button>
            {!showBulkTagInput ? (
              <Button size="sm" variant="secondary" onClick={() => setShowBulkTagInput(true)} className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0">
                <Tag className="w-3.5 h-3.5 mr-1" /> Добавить тег
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1">
                <Input
                  value={bulkTagValue}
                  onChange={e => setBulkTagValue(e.target.value)}
                  placeholder="Тег..."
                  className="h-6 text-xs w-28 bg-white/20 border-0 text-white placeholder:text-white/60 focus-visible:ring-0"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleBulkAddTag(); if (e.key === 'Escape') setShowBulkTagInput(false); }}
                />
                <button onClick={handleBulkAddTag} className="p-0.5 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setShowBulkTagInput(false)} className="p-0.5 hover:text-[var(--frox-gray-300)]"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
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
          <button onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }} className="sm:ml-auto opacity-70 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Ошибка ── */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Мобильные карточки ── */}
      <div className="lg:hidden space-y-2">
        {!loading && contacts.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border bg-white px-3 py-2.5">
            <label className="flex items-center gap-2 text-sm text-[var(--frox-gray-600)] cursor-pointer">
              <Checkbox checked={selectAll} onChange={handleSelectAll} />
              Выбрать все
            </label>
            <span className="text-xs text-[var(--frox-gray-400)]">{contacts.length} на странице</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border p-12 text-center text-[var(--frox-gray-400)]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Загрузка...
          </div>
        ) : contacts.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center text-[var(--frox-gray-400)]">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Контактов не найдено</p>
          </div>
        ) : (
          contacts.map(c => {
            const sc = getStatusConfig(c.status);
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-[var(--frox-neutral-border)] p-4 cursor-pointer hover:border-[var(--frox-gray-300)] transition-all"
                onClick={() => setSelectedContact(c)}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(c.id)} onChange={() => handleSelectOne(c.id)} />
                  </div>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar name={c.full_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-[var(--frox-gray-1100)] truncate">{c.full_name}</div>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${sc.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-xs text-[var(--frox-gray-500)]">
                        {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{c.email}</span></div>}
                        {c.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" />{c.phone}</div>}
                        {(c.city || c.institution) && (
                          <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{[c.city, c.institution].filter(Boolean).join(' · ')}</span></div>
                        )}
                      </div>
                      {c.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.tags.slice(0, 4).map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded-full text-xs bg-[var(--frox-gray-200)] text-[var(--frox-gray-500)]">{t}</span>
                          ))}
                          {c.tags.length > 4 && <span className="text-xs text-[var(--frox-gray-400)]">+{c.tags.length - 4}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Таблица (десктоп) ── */}
      <div className="hidden lg:block bg-white border border-[var(--frox-neutral-border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm text-left" style={{ tableLayout: 'fixed', width: widths.reduce((a, b) => a + b, 0) }}>
            <colgroup>
              {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--frox-gray-200)]">
                <th className="px-4 py-3 relative" style={{ width: widths[0] }}>
                  <Checkbox checked={selectAll} onChange={handleSelectAll} />
                  <span className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-300 select-none" onMouseDown={e => { e.preventDefault(); onResizeStart(0, e.clientX, widths[0]); }} />
                </th>
                {[
                  { label: 'Имя', field: 'full_name', idx: 1 },
                  { label: 'Контакты', field: null, idx: 2 },
                  { label: 'Город', field: 'city', idx: 3 },
                  { label: 'Специальность', field: 'speciality', idx: 4 },
                  { label: 'Теги', field: null, idx: 5 },
                  { label: 'Статус', field: 'status', idx: 6 },
                  { label: 'Дата', field: 'created_at', idx: 7 },
                ].map(col => (
                  <th
                    key={col.idx}
                    className={`px-4 py-3 text-xs font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider relative ${col.field ? 'cursor-pointer hover:text-[var(--frox-gray-800)] select-none' : ''}`}
                    style={{ width: widths[col.idx] }}
                    onClick={col.field ? () => handleSort(col.field!) : undefined}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {col.label}
                      {col.field && <SortIcon field={col.field} />}
                    </div>
                    <span
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-300 select-none"
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResizeStart(col.idx, e.clientX, widths[col.idx]); }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--frox-gray-100)]">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-[var(--frox-gray-400)]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Загрузка...
                </td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-[var(--frox-gray-400)]">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>Контактов не найдено</p>
                  {hasActiveFilters && <button onClick={clearFilters} className="mt-2 text-blue-500 hover:underline text-sm">Сбросить фильтры</button>}
                </td></tr>
              ) : (
                contacts.map(c => (
                  <tr
                    key={c.id}
                    className="cursor-pointer hover:bg-[var(--frox-gray-100)]/80 transition-colors group"
                    onClick={() => setSelectedContact(c)}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(c.id)} onChange={() => handleSelectOne(c.id)} />
                    </td>
                    <td className="px-4 py-3" style={{ maxWidth: widths[1] }}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={c.full_name} />
                        <span className="font-semibold text-[var(--frox-gray-1100)] truncate">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--frox-gray-500)] space-y-0.5" style={{ maxWidth: widths[2] }}>
                      {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 shrink-0 text-[var(--frox-gray-400)]" /><span className="truncate">{c.email}</span></div>}
                      {c.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0 text-[var(--frox-gray-400)]" />{c.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--frox-gray-600)]" style={{ maxWidth: widths[3] }}>
                      <div className="truncate">{c.city || <span className="text-[var(--frox-gray-300)]">—</span>}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--frox-gray-600)]" style={{ maxWidth: widths[4] }}>
                      <div className="truncate">{c.speciality || <span className="text-[var(--frox-gray-300)]">—</span>}</div>
                    </td>
                    <td className="px-4 py-3" style={{ maxWidth: widths[5] }}>
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded-full text-xs bg-[var(--frox-gray-200)] text-[var(--frox-gray-500)]">{t}</span>
                        ))}
                        {c.tags.length > 3 && <span className="text-xs text-[var(--frox-gray-400)]">+{c.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <StatusPill value={c.status} onChange={v => handleStatusChange(c, v)} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--frox-gray-400)] whitespace-nowrap">{formatDate(c.created_at)}</td>
                  </tr>
                ))
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
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-[var(--frox-gray-500)] px-2">{pagination.page} / {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Панель контакта ── */}
      {selectedContact && (
        <ContactPanel
          contact={selectedContact}
          onUpdate={handleContactUpdate}
          onClose={() => setSelectedContact(null)}
          onDelete={handleContactDelete}
        />
      )}

      {/* ── Импорт ── */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { loadContacts(); }}
        />
      )}
    </div>
  );
}
