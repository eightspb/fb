'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
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
  Merge,
  Loader2,
  ChevronDown,
  Microscope,
  ChevronUp,
} from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import { FroxStatCard } from '@/components/admin/FroxStatCard';
import { TagAutocompleteInput } from '@/components/admin/TagAutocompleteInput';

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
  { value: 'new', label: 'Новый', pill: 'bg-[var(--frox-brand-soft)] text-[var(--frox-brand-strong)] border border-[rgba(115,100,219,0.18)]', dot: 'bg-[var(--frox-brand)]' },
  { value: 'in_progress', label: 'В работе', pill: 'bg-[var(--frox-plum-soft)] text-[#7a5fe4] border border-[rgba(143,121,239,0.16)]', dot: 'bg-[var(--frox-plum)]' },
  { value: 'processed', label: 'Обработан', pill: 'bg-[var(--frox-mint-soft)] text-[#4b8d7f] border border-[rgba(122,197,181,0.2)]', dot: 'bg-[var(--frox-mint)]' },
  { value: 'archived', label: 'В архиве', pill: 'bg-[var(--frox-slate-soft)] text-[var(--frox-gray-500)] border border-[var(--frox-neutral-border)]', dot: 'bg-[var(--frox-gray-400)]' },
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
  const colors = ['bg-[#efeaff] text-[#6150d2]', 'bg-[#f4efff] text-[#7a5fe4]', 'bg-[#edf9f5] text-[#4b8d7f]', 'bg-[#f5f2ff] text-[#8d78df]', 'bg-[#f1eef8] text-[#675b8c]'];
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
                {value === opt.value && <Check className="w-3 h-3 ml-auto text-[var(--frox-brand)]" />}
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
      <button onClick={handleSave} disabled={saving} className="p-1 text-[var(--frox-brand)] hover:text-[var(--frox-brand-strong)]">
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

// ── Types for import preview ──────────────────────────────────────────────────

interface CsvContact {
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  institution: string | null;
  speciality: string | null;
  tags: string[];
  notes: string | null;
}

interface ImportConflict {
  csv: CsvContact;
  existing: Contact;
}

interface ImportPreview {
  newContacts: CsvContact[];
  conflicts: ImportConflict[];
  skipped: number;
  defaultStatus: string;
  importSource: string;
}

type ConflictFieldKey = 'full_name' | 'phone' | 'city' | 'institution' | 'speciality' | 'notes';
const CONFLICT_FIELDS: { key: ConflictFieldKey; label: string }[] = [
  { key: 'full_name', label: 'Имя' },
  { key: 'phone', label: 'Телефон' },
  { key: 'city', label: 'Город' },
  { key: 'institution', label: 'Организация' },
  { key: 'speciality', label: 'Специальность' },
  { key: 'notes', label: 'Заметки' },
];

// ── Import conflict review step ───────────────────────────────────────────────

function ConflictReview({
  preview,
  onBack,
  onApply,
}: {
  preview: ImportPreview;
  onBack: () => void;
  onApply: (resolvedConflicts: Array<{ existingId: string; merged: Partial<CsvContact> }>) => void;
}) {
  // For each conflict: which source is selected per field ('csv' | 'db')
  const [selections, setSelections] = useState<Array<Record<ConflictFieldKey, 'csv' | 'db'>>>(() =>
    preview.conflicts.map(({ csv, existing }) =>
      Object.fromEntries(
        CONFLICT_FIELDS.map(({ key }) => {
          const csvVal = csv[key] ?? null;
          const dbVal = (existing[key] as string | null) ?? null;
          // Default: prefer non-empty; if both non-empty prefer db (existing is authoritative)
          const source = (!csvVal && dbVal) ? 'db' : (!dbVal && csvVal) ? 'csv' : 'db';
          return [key, source];
        })
      ) as Record<ConflictFieldKey, 'csv' | 'db'>
    )
  );

  const buildMerged = (idx: number): Partial<CsvContact> => {
    const { csv, existing } = preview.conflicts[idx];
    const sel = selections[idx];
    const merged: Partial<CsvContact> = { email: csv.email };
    for (const { key } of CONFLICT_FIELDS) {
      merged[key] = sel[key] === 'csv' ? (csv[key] ?? undefined) : ((existing[key] as string | undefined) ?? undefined);
    }
    // Tags: union
    merged.tags = [...new Set([...(csv.tags || []), ...(existing.tags || [])])];
    return merged;
  };

  const setField = (conflictIdx: number, field: ConflictFieldKey, source: 'csv' | 'db') => {
    setSelections(prev => prev.map((sel, i) => i === conflictIdx ? { ...sel, [field]: source } : sel));
  };

  const handleApply = () => {
    const resolved = preview.conflicts.map(({ existing }, idx) => ({
      existingId: existing.id,
      merged: buildMerged(idx),
    }));
    onApply(resolved);
  };

  const hasConflicts = preview.conflicts.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary bar */}
      <div className="px-6 py-3 border-b border-[var(--frox-gray-200)] bg-[var(--frox-gray-100)]/60 flex gap-4 text-sm shrink-0">
        <span className="flex items-center gap-1.5 text-emerald-700">
          <CheckCircle2 className="w-4 h-4" />
          <strong>{preview.newContacts.length}</strong> новых
        </span>
        {hasConflicts && (
          <span className="flex items-center gap-1.5 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            <strong>{preview.conflicts.length}</strong> совпадений по email
          </span>
        )}
        {preview.skipped > 0 && (
          <span className="flex items-center gap-1.5 text-[var(--frox-gray-400)]">
            <XCircle className="w-4 h-4" />
            <strong>{preview.skipped}</strong> пропущено (нет email)
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Conflicts */}
        {hasConflicts && (
          <div>
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Совпадения по email — выберите значения
            </div>
            <div className="space-y-4">
              {preview.conflicts.map(({ csv, existing }, idx) => {
                const sel = selections[idx];
                const allTagsUnion = [...new Set([...(csv.tags || []), ...(existing.tags || [])])];
                return (
                  <div key={existing.id} className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/30">
                    {/* Contact header */}
                    <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">{csv.email}</span>
                    </div>
                    {/* Column headers */}
                    <div className="grid grid-cols-[120px_1fr_1fr] text-xs font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider bg-[var(--frox-gray-100)] border-b border-[var(--frox-gray-200)]">
                      <div className="px-3 py-2">Поле</div>
                      <div className="px-3 py-2 flex items-center gap-1.5">
                        <Upload className="w-3 h-3" /> Из CSV
                      </div>
                      <div className="px-3 py-2 flex items-center gap-1.5">
                        <Users className="w-3 h-3" /> В базе
                      </div>
                    </div>
                    {/* Field rows */}
                    {CONFLICT_FIELDS.map(({ key, label }) => {
                      const csvVal = csv[key] ?? null;
                      const dbVal = (existing[key] as string | null) ?? null;
                      const differs = csvVal !== dbVal;
                      return (
                        <div
                          key={key}
                          className={`grid grid-cols-[120px_1fr_1fr] border-b border-[var(--frox-gray-100)] last:border-b-0 ${differs ? '' : 'opacity-60'}`}
                        >
                          <div className="px-3 py-2.5 flex items-center gap-1">
                            <span className="text-xs font-medium text-[var(--frox-gray-600)]">{label}</span>
                            {differs && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                          </div>
                          {(['csv', 'db'] as const).map(source => {
                            const val = source === 'csv' ? csvVal : dbVal;
                            const isSelected = sel[key] === source;
                            return (
                              <div
                                key={source}
                                className={`px-3 py-2.5 cursor-pointer transition-all ${
                                  differs
                                    ? isSelected
                                      ? 'bg-violet-50 ring-1 ring-inset ring-violet-300'
                                      : 'hover:bg-[var(--frox-gray-100)]'
                                    : ''
                                }`}
                                onClick={() => { if (differs) setField(idx, key, source); }}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {differs && (
                                    <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                                      isSelected ? 'border-violet-600 bg-violet-600' : 'border-[var(--frox-gray-300)]'
                                    }`}>
                                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </span>
                                  )}
                                  <span className={`text-xs truncate ${val ? 'text-[var(--frox-gray-800)]' : 'text-[var(--frox-gray-300)] italic'}`}>
                                    {val || '—'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    {/* Tags row */}
                    {allTagsUnion.length > 0 && (
                      <div className="grid grid-cols-[120px_1fr_1fr] bg-[var(--frox-gray-100)]/60">
                        <div className="px-3 py-2.5 text-xs font-medium text-[var(--frox-gray-600)]">Теги</div>
                        <div className="px-3 py-2.5 col-span-2">
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-xs text-[var(--frox-gray-400)] mr-1">Объединение:</span>
                            {allTagsUnion.map(t => (
                              <span key={t} className="px-1.5 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700">{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* New contacts list */}
        {preview.newContacts.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Новые контакты ({preview.newContacts.length})
            </div>
            <div className="border border-[var(--frox-neutral-border)] rounded-xl overflow-hidden">
              {preview.newContacts.map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--frox-gray-100)] last:border-b-0 text-sm">
                  <Avatar name={c.full_name} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[var(--frox-gray-800)] truncate">{c.full_name}</div>
                    <div className="text-xs text-[var(--frox-gray-400)] truncate">{c.email}</div>
                  </div>
                  {c.city && <span className="text-xs text-[var(--frox-gray-400)] shrink-0">{c.city}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[var(--frox-gray-200)] bg-[var(--frox-gray-100)]/60 flex justify-between items-center shrink-0">
        <Button variant="ghost" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Назад
        </Button>
        <Button onClick={handleApply} className="gap-2">
          <Check className="w-4 h-4" />
          Применить
          {preview.newContacts.length > 0 && ` (${preview.newContacts.length} новых`}
          {hasConflicts && `, ${preview.conflicts.length} обновлений`}
          {(preview.newContacts.length > 0 || hasConflicts) && ')'}
        </Button>
      </div>
    </div>
  );
}

// ── Import modal ──────────────────────────────────────────────────────────────

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('archived');
  const [importSource, setImportSource] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<{ imported: number; updated: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 1: upload CSV → dry run → get preview
  const handlePreview = async () => {
    if (!file) return;
    setLoading(true); setError(null); setPreview(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tags', tags);
      fd.append('status', status);
      fd.append('import_source', importSource || 'csv');
      fd.append('dry_run', 'true');
      const res = await adminCsrfFetch('/api/admin/contacts/import', { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Ошибка разбора файла');
      else setPreview(data);
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  };

  // Step 2: apply with resolved conflicts
  const handleApply = async (resolvedConflicts: Array<{ existingId: string; merged: Partial<CsvContact> }>) => {
    if (!preview) return;
    setLoading(true); setError(null);
    try {
      const res = await adminCsrfFetch('/api/admin/contacts/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newContacts: preview.newContacts,
          resolvedConflicts,
          defaultStatus: preview.defaultStatus,
          importSource: preview.importSource,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Ошибка импорта');
      else { setResult(data); onDone(); }
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  };

  const isWide = !!preview && !result;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`frox-shell-surface overflow-hidden rounded-[28px] mx-4 flex flex-col transition-all ${isWide ? 'w-full max-w-3xl max-h-[90vh]' : 'w-full max-w-lg'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--frox-gray-200)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--frox-brand-soft)]">
              <Upload className="h-4 w-4 text-[var(--frox-brand-strong)]" />
            </div>
            <h2 className="font-semibold text-[var(--frox-gray-1100)]">
              {preview && !result ? 'Предпросмотр импорта' : 'Импорт контактов из CSV'}
            </h2>
          </div>
          <button onClick={onClose} className="text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] p-1 rounded-lg hover:bg-[var(--frox-gray-200)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview step */}
        {preview && !result && (
          <ConflictReview
            preview={preview}
            onBack={() => setPreview(null)}
            onApply={handleApply}
          />
        )}

        {/* Upload step */}
        {!preview && !result && (
          <>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-2 uppercase tracking-wider">Файл CSV</label>
                <div
                  className="cursor-pointer rounded-xl border-2 border-dashed border-[rgba(115,100,219,0.18)] p-5 text-center transition-all hover:border-[var(--frox-brand)] hover:bg-[var(--frox-brand-softer)]"
                  onClick={() => fileRef.current?.click()}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-[var(--frox-gray-800)]">
                      <FileText className="w-4 h-4 text-[var(--frox-brand)]" />
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
                  Поля: ФИО, email, телефон, город, организация, специальность, теги, заметки. Строки без email пропускаются.
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
                    className="frox-select h-9 w-full rounded-lg px-3 text-sm"
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
            </div>

            <div className="px-6 py-4 border-t border-[var(--frox-gray-200)] bg-[var(--frox-gray-100)]/60 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>Отмена</Button>
              <Button onClick={handlePreview} disabled={!file || loading} className="gap-2">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Далее
              </Button>
            </div>
          </>
        )}

        {/* Result step */}
        {result && (
          <>
            <div className="px-6 py-5">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm space-y-1">
                <div className="font-semibold text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Готово
                </div>
                {result.imported > 0 && <div className="text-[var(--frox-gray-600)]">Добавлено новых: <strong>{result.imported}</strong></div>}
                {result.updated > 0 && <div className="text-[var(--frox-gray-600)]">Обновлено существующих: <strong>{result.updated}</strong></div>}
                {result.errors.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {result.errors.map((e, i) => <div key={i} className="text-xs text-red-600">{e}</div>)}
                  </div>
                )}
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mt-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[var(--frox-gray-200)] bg-[var(--frox-gray-100)]/60 flex justify-end">
              <Button variant="ghost" onClick={onClose}>Закрыть</Button>
            </div>
          </>
        )}

        {/* Loading overlay for apply step */}
        {loading && preview && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-[28px]">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--frox-brand)]" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Merge modal ───────────────────────────────────────────────────────────────

type MergeableField = 'full_name' | 'email' | 'phone' | 'city' | 'institution' | 'speciality' | 'notes' | 'status';

const MERGE_FIELDS: { key: MergeableField; label: string }[] = [
  { key: 'full_name', label: 'Имя' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Телефон' },
  { key: 'city', label: 'Город' },
  { key: 'institution', label: 'Организация' },
  { key: 'speciality', label: 'Специальность' },
  { key: 'status', label: 'Статус' },
  { key: 'notes', label: 'Заметки' },
];

function MergeModal({
  contacts,
  onClose,
  onDone,
}: {
  contacts: Contact[];
  onClose: () => void;
  onDone: (survivorId: string) => void;
}) {
  // For each field: which contact index is selected (0..n-1). Default = index 0.
  const [selections, setSelections] = useState<Record<MergeableField, number>>(
    () => Object.fromEntries(MERGE_FIELDS.map(f => [f.key, 0])) as Record<MergeableField, number>
  );
  // survivorId = contact to keep (others deleted). Default = contacts[0].id
  const [survivorIdx, setSurvivorIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getVal = (c: Contact, key: MergeableField): string | null => {
    if (key === 'status') return getStatusConfig(c.status).label;
    return (c[key] as string | null);
  };

  // Tags: union of all
  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags)));

  // Build merged contact from selections
  const buildMerged = (): Partial<Contact> => {
    const merged: Partial<Contact> = {};
    for (const { key } of MERGE_FIELDS) {
      if (key === 'status') {
        merged.status = contacts[selections[key]].status;
      } else {
        (merged as Record<string, unknown>)[key] = contacts[selections[key]][key];
      }
    }
    merged.tags = allTags;
    return merged;
  };

  const handleMerge = async () => {
    setLoading(true);
    setError(null);
    try {
      const merged = buildMerged();
      const survivorId = contacts[survivorIdx].id;
      const deleteIds = contacts.filter(c => c.id !== survivorId).map(c => c.id);

      // 1. Patch the survivor with merged fields
      const patchRes = await adminCsrfFetch(`/api/admin/contacts/${survivorId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      if (!patchRes.ok) throw new Error('Ошибка обновления контакта');

      // 2. Delete the duplicates
      const delRes = await adminCsrfFetch('/api/admin/contacts', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteIds }),
      });
      if (!delRes.ok) throw new Error('Ошибка удаления дублей');

      onDone(survivorId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка слияния');
    } finally {
      setLoading(false);
    }
  };

  const allSame = (key: MergeableField) =>
    contacts.every(c => getVal(c, key) === getVal(contacts[0], key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--frox-gray-200)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Merge className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--frox-gray-1100)]">Объединить контакты</h2>
              <p className="text-xs text-[var(--frox-gray-400)]">Выберите значения для итогового контакта</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] p-1 rounded-lg hover:bg-[var(--frox-gray-200)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Survivor selector */}
          <div className="bg-[var(--frox-gray-100)] rounded-xl p-4">
            <div className="text-xs font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider mb-3">Оставить запись</div>
            <div className="flex flex-wrap gap-2">
              {contacts.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setSurvivorIdx(i)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    survivorIdx === i
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-[var(--frox-gray-700)] border-[var(--frox-neutral-border)] hover:border-violet-300'
                  }`}
                >
                  <Avatar name={c.full_name} />
                  {c.full_name}
                  {survivorIdx === i && <Check className="w-3.5 h-3.5 ml-1" />}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--frox-gray-400)]">Остальные контакты будут удалены после слияния.</p>
          </div>

          {/* Field diff table */}
          <div className="border border-[var(--frox-neutral-border)] rounded-xl overflow-hidden">
            {/* Column headers */}
            <div
              className="grid border-b border-[var(--frox-gray-200)] bg-[var(--frox-gray-100)]"
              style={{ gridTemplateColumns: `140px repeat(${contacts.length}, 1fr)` }}
            >
              <div className="px-4 py-2.5 text-xs font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider">Поле</div>
              {contacts.map((c, i) => (
                <div key={c.id} className="px-4 py-2.5 text-xs font-semibold text-[var(--frox-gray-700)] truncate">
                  {c.full_name}
                </div>
              ))}
            </div>

            {/* Rows */}
            {MERGE_FIELDS.map(({ key, label }) => {
              const same = allSame(key);
              return (
                <div
                  key={key}
                  className={`grid border-b border-[var(--frox-gray-100)] last:border-b-0 ${same ? '' : 'bg-amber-50/40'}`}
                  style={{ gridTemplateColumns: `140px repeat(${contacts.length}, 1fr)` }}
                >
                  <div className="px-4 py-3 flex items-center gap-1.5">
                    <span className="text-xs font-medium text-[var(--frox-gray-600)]">{label}</span>
                    {!same && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Различаются" />}
                  </div>
                  {contacts.map((c, i) => {
                    const val = getVal(c, key);
                    const isSelected = selections[key] === i;
                    const differs = !same;
                    return (
                      <div
                        key={c.id}
                        className={`px-4 py-3 cursor-pointer transition-all ${
                          differs
                            ? isSelected
                              ? 'bg-violet-50 ring-1 ring-inset ring-violet-300'
                              : 'hover:bg-[var(--frox-gray-100)]'
                            : ''
                        }`}
                        onClick={() => {
                          if (differs) setSelections(prev => ({ ...prev, [key]: i }));
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {differs && (
                            <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                              isSelected ? 'border-violet-600 bg-violet-600' : 'border-[var(--frox-gray-300)]'
                            }`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                          )}
                          <span className={`text-xs truncate ${val ? 'text-[var(--frox-gray-800)]' : 'text-[var(--frox-gray-300)] italic'}`}>
                            {val || '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Tags row (always union, no choice) */}
            <div
              className="grid bg-[var(--frox-gray-100)]/60"
              style={{ gridTemplateColumns: `140px repeat(${contacts.length}, 1fr)` }}
            >
              <div className="px-4 py-3 flex items-center">
                <span className="text-xs font-medium text-[var(--frox-gray-600)]">Теги</span>
              </div>
              {contacts.map(c => (
                <div key={c.id} className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.length > 0
                      ? c.tags.map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded-full text-xs bg-[var(--frox-gray-200)] text-[var(--frox-gray-600)]">{t}</span>
                        ))
                      : <span className="text-xs text-[var(--frox-gray-300)] italic">нет</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags result */}
          {allTags.length > 0 && (
            <div className="text-xs text-[var(--frox-gray-500)]">
              Итоговые теги (объединение):&nbsp;
              {allTags.map(t => (
                <span key={t} className="inline-block px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 mr-1">{t}</span>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--frox-gray-200)] bg-[var(--frox-gray-100)]/60 flex justify-end gap-3 shrink-0">
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button onClick={handleMerge} disabled={loading} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
            Объединить
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Contact detail slide-over panel ──────────────────────────────────────────

const PANEL_WIDTH_KEY = 'contacts-panel-width';
const PANEL_MIN_W = 380;
const PANEL_MAX_W_RATIO = 0.85;
const PANEL_DEFAULT_W_RATIO = 0.5;

function usePanelResize() {
  const [width, setWidth] = useState(() => {
    try {
      const stored = localStorage.getItem(PANEL_WIDTH_KEY);
      if (stored) {
        const w = parseInt(stored, 10);
        if (w >= PANEL_MIN_W && w <= window.innerWidth * PANEL_MAX_W_RATIO) return w;
      }
    } catch { /* ignore */ }
    return Math.max(PANEL_MIN_W, Math.round(window.innerWidth * PANEL_DEFAULT_W_RATIO));
  });
  const dragging = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const maxW = window.innerWidth * PANEL_MAX_W_RATIO;
      const newW = Math.min(maxW, Math.max(PANEL_MIN_W, dragging.current.startW + (dragging.current.startX - e.clientX)));
      setWidth(newW);
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // Save after drag ends
        setWidth(w => { try { localStorage.setItem(PANEL_WIDTH_KEY, String(Math.round(w))); } catch { /* ignore */ } return w; });
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = { startX: e.clientX, startW: width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  return { width, onResizeStart };
}

interface PanelNote {
  id: string;
  title: string | null;
  content: string;
  source: string;
  pinned: boolean;
  created_at: string;
}

function ContactPanel({
  contact, onUpdate, onClose, onDelete,
}: {
  contact: Contact;
  onUpdate: (c: Contact) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [researching, setResearching] = useState(false);
  const [deepResearching, setDeepResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [panelNotes, setPanelNotes] = useState<PanelNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteSaving, setNewNoteSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteDraft, setEditingNoteDraft] = useState('');
  const [editingNoteSaving, setEditingNoteSaving] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [collapsedNotes, setCollapsedNotes] = useState<Set<string>>(new Set());
  const { width: panelWidth, onResizeStart } = usePanelResize();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Load notes
  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}/notes`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPanelNotes(data.notes || []);
      }
    } catch { /* silent */ }
    finally { setNotesLoading(false); }
  }, [contact.id]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  useEffect(() => {
    if (!showStatusMenu) return;
    const handler = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStatusMenu]);

  const handleResearch = async () => {
    setResearching(true);
    setResearchError(null);
    try {
      const res = await adminCsrfFetch(`/api/admin/contacts/${contact.id}/research`, {
        method: 'POST', credentials: 'include',
      });
      if (res.ok) {
        loadNotes();
      } else {
        const data = await res.json().catch(() => null);
        setResearchError(data?.error || 'Ошибка при исследовании');
      }
    } catch {
      setResearchError('Ошибка подключения к серверу');
    } finally {
      setResearching(false);
    }
  };

  const handleDeepResearch = async () => {
    setDeepResearching(true);
    setResearchError(null);
    try {
      const res = await adminCsrfFetch(`/api/admin/contacts/${contact.id}/deep-research`, {
        method: 'POST', credentials: 'include',
      });
      if (res.ok) {
        loadNotes();
      } else {
        const data = await res.json().catch(() => null);
        setResearchError(data?.error || 'Ошибка при глубоком исследовании');
      }
    } catch {
      setResearchError('Ошибка подключения к серверу');
    } finally {
      setDeepResearching(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    setNewNoteSaving(true);
    try {
      const res = await adminCsrfFetch(`/api/admin/contacts/${contact.id}/notes`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      if (res.ok) {
        setNewNoteContent('');
        setNewNoteOpen(false);
        loadNotes();
      }
    } finally { setNewNoteSaving(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    const res = await adminCsrfFetch(`/api/admin/contacts/${contact.id}/notes/${noteId}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (res.ok || res.status === 204) loadNotes();
  };

  const startEditNote = (note: PanelNote) => {
    setEditingNoteId(note.id);
    setEditingNoteDraft(note.content);
    requestAnimationFrame(() => {
      if (editTextareaRef.current) {
        const el = editTextareaRef.current;
        el.style.height = 'auto';
        el.style.height = Math.max(60, el.scrollHeight) + 'px';
        el.focus();
      }
    });
  };

  const handleEditNoteSave = async () => {
    if (!editingNoteId || !editingNoteDraft.trim()) return;
    setEditingNoteSaving(true);
    try {
      const res = await adminCsrfFetch(`/api/admin/contacts/${contact.id}/notes/${editingNoteId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingNoteDraft.trim() }),
      });
      if (res.ok) {
        setEditingNoteId(null);
        setEditingNoteDraft('');
        loadNotes();
      }
    } finally { setEditingNoteSaving(false); }
  };

  const patchField = async (fields: Partial<Contact>) => {
    const res = await adminCsrfFetch(`/api/admin/contacts/${contact.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (res.ok) onUpdate(await res.json());
  };

  const addTag = async (tag: string) => {
    if (contact.tags.includes(tag)) return;
    await patchField({ tags: [...contact.tags, tag] });
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
        className="relative bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
        style={{ width: panelWidth }}
        onClick={e => e.stopPropagation()}
      >
        {/* Resize handle */}
        <div
          onMouseDown={onResizeStart}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group hover:bg-[var(--frox-brand)]/20 transition-colors"
          title="Изменить ширину"
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-[var(--frox-gray-300)] group-hover:bg-[var(--frox-brand)] transition-colors" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[var(--frox-gray-200)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={contact.full_name} />
              <div className="min-w-0">
                <div className="font-semibold text-[var(--frox-gray-1100)] leading-tight">
                  <EditableField value={contact.full_name} onSave={v => patchField({ full_name: v } as Partial<Contact>)} placeholder="имя не указано" />
                </div>
                <div className="relative mt-0.5" ref={statusMenuRef}>
                  <button
                    onClick={() => setShowStatusMenu(v => !v)}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${sc.pill}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                  {showStatusMenu && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[var(--frox-neutral-border)] rounded-xl shadow-lg p-1 flex flex-col gap-0.5 min-w-[140px]">
                      {statusConfig.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { patchField({ status: opt.value }); setShowStatusMenu(false); }}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                            contact.status === opt.value
                              ? opt.pill
                              : 'text-[var(--frox-gray-700)] hover:bg-[var(--frox-gray-100)]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt.dot}`} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
          {/* Контактные данные + Место работы — двухколоночный layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Левая колонка: контактные данные */}
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

            {/* Правая колонка: место работы */}
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
          </div>

          {/* Теги — на всю ширину */}
          <div>
            <div className="text-[11px] font-semibold text-[var(--frox-gray-400)] uppercase tracking-wider mb-2">Теги</div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
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
            <TagAutocompleteInput
              existingTags={contact.tags}
              onAdd={addTag}
              placeholder="Добавить тег..."
              inputClassName="h-8 text-sm bg-[var(--frox-gray-100)]"
            />
          </div>

          {/* Заметки */}
          <div className="rounded-xl border border-[var(--frox-gray-200)] bg-[var(--frox-gray-50)] p-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0"><path d="M2 4h12M2 8h8M2 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Заметки
                {panelNotes.length > 0 && (
                  <span className="text-[10px] font-medium bg-[var(--frox-gray-200)] text-[var(--frox-gray-500)] px-1.5 py-0.5 rounded-full ml-1">
                    {panelNotes.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleResearch}
                  disabled={researching || deepResearching}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-[var(--frox-gray-200)] text-[10px] font-medium text-[var(--frox-gray-500)] hover:bg-[var(--frox-gray-100)] hover:text-[var(--frox-gray-700)] disabled:opacity-50 transition-colors"
                  title="AI Исследование"
                >
                  {researching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  AI
                </button>
                <button
                  onClick={handleDeepResearch}
                  disabled={researching || deepResearching}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-blue-200 text-[10px] font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 transition-colors"
                  title="Deep Research"
                >
                  {deepResearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Microscope className="w-3 h-3" />}
                  Deep
                </button>
              </div>
            </div>
            {researchError && (
              <div className="flex items-center gap-2 p-2.5 mb-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {researchError}
              </div>
            )}
            <div className="space-y-2">
              {notesLoading ? (
                <div className="text-center py-4 text-[var(--frox-gray-400)]">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                </div>
              ) : (
                <>
                  {panelNotes.map(note => {
                    const srcCfg = {
                      ai_research: { label: 'AI', cls: 'bg-violet-50 text-violet-600' },
                      ai_deep_research: { label: 'Deep', cls: 'bg-blue-50 text-blue-600' },
                      import: { label: 'Импорт', cls: 'bg-amber-50 text-amber-600' },
                      manual: { label: '', cls: '' },
                    }[note.source] || { label: '', cls: '' };

                    if (editingNoteId === note.id) {
                      return (
                        <div key={note.id} className="rounded-lg border-2 border-blue-400 bg-white p-2.5 space-y-2">
                          <textarea
                            ref={editTextareaRef}
                            value={editingNoteDraft}
                            onChange={e => {
                              setEditingNoteDraft(e.target.value);
                              const el = e.target;
                              el.style.height = 'auto';
                              el.style.height = Math.max(60, el.scrollHeight) + 'px';
                            }}
                            className="w-full text-sm px-2 py-1.5 border border-[var(--frox-gray-200)] rounded focus:outline-none focus:border-blue-400 bg-white min-h-[60px] resize-y"
                            onKeyDown={e => { if (e.key === 'Escape') { setEditingNoteId(null); setEditingNoteDraft(''); } }}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleEditNoteSave} disabled={editingNoteSaving || !editingNoteDraft.trim()} className="h-6 text-xs">
                              {editingNoteSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                              Сохранить
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingNoteId(null); setEditingNoteDraft(''); }} className="h-6 text-xs">Отмена</Button>
                          </div>
                        </div>
                      );
                    }

                    const isCollapsed = collapsedNotes.has(note.id);
                    const toggleCollapse = () => {
                      setCollapsedNotes(prev => {
                        const next = new Set(prev);
                        if (next.has(note.id)) next.delete(note.id); else next.add(note.id);
                        return next;
                      });
                    };

                    return (
                      <div key={note.id} className="group rounded-lg border border-[var(--frox-gray-200)] bg-white p-2.5">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer" onClick={toggleCollapse}>
                            <ChevronDown className={`w-3 h-3 text-[var(--frox-gray-400)] shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                            {note.title ? (
                              <span className="text-xs font-medium text-[var(--frox-gray-700)] truncate">{note.title}</span>
                            ) : (
                              <span className="text-[10px] text-[var(--frox-gray-400)]">
                                {new Date(note.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {srcCfg.label && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${srcCfg.cls}`}>{srcCfg.label}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <button
                              onClick={() => startEditNote(note)}
                              className="p-0.5 text-[var(--frox-gray-300)] hover:text-[var(--frox-gray-600)] transition-colors"
                              title="Редактировать"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-0.5 text-[var(--frox-gray-300)] hover:text-red-500 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {!isCollapsed && (
                          <div className="text-sm text-[var(--frox-gray-700)] whitespace-pre-wrap leading-relaxed line-clamp-6 ml-[18px]">{note.content}</div>
                        )}
                      </div>
                    );
                  })}
                  {newNoteOpen ? (
                    <div className="rounded-lg border-2 border-blue-400 bg-white p-2.5 space-y-2">
                      <textarea
                        value={newNoteContent}
                        onChange={e => setNewNoteContent(e.target.value)}
                        placeholder="Текст заметки..."
                        className="w-full text-sm px-2 py-1.5 border border-[var(--frox-gray-200)] rounded focus:outline-none focus:border-blue-400 bg-white min-h-[60px] resize-y"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddNote} disabled={newNoteSaving || !newNoteContent.trim()} className="h-6 text-xs">Сохранить</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setNewNoteOpen(false); setNewNoteContent(''); }} className="h-6 text-xs">Отмена</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewNoteOpen(true)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] border border-dashed border-[var(--frox-gray-200)] hover:border-[var(--frox-gray-300)] rounded-lg transition-colors"
                    >
                      <span className="text-sm leading-none">+</span> Добавить заметку
                    </button>
                  )}
                </>
              )}
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
const COL_WIDTHS_STORAGE_KEY = 'contacts-col-widths';

function useColumnResize() {
  const widthsRef = useRef<number[]>([...DEFAULT_COL_WIDTHS]);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const colElsRef = useRef<HTMLTableColElement[]>([]);
  const dragging = useRef<{ col: number; startX: number; startW: number } | null>(null);

  // Применяем ширины к DOM (colgroup + table width)
  const applyWidths = (widths: number[]) => {
    widths.forEach((w, i) => {
      const col = colElsRef.current[i];
      if (col) col.style.width = `${w}px`;
    });
    if (tableRef.current) {
      tableRef.current.style.width = `${widths.reduce((a, b) => a + b, 0)}px`;
    }
  };

  // Загружаем сохранённые ширины из localStorage при монтировании
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COL_WIDTHS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_COL_WIDTHS.length) {
          widthsRef.current = parsed;
          applyWidths(parsed);
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const { col, startX, startW } = dragging.current;
      const newW = Math.max(40, startW + (e.clientX - startX));
      widthsRef.current[col] = newW;
      // Обновляем только нужную колонку и общую ширину таблицы
      const colEl = colElsRef.current[col];
      if (colEl) colEl.style.width = `${newW}px`;
      if (tableRef.current) {
        tableRef.current.style.width = `${widthsRef.current.reduce((a, b) => a + b, 0)}px`;
      }
    };
    const onUp = () => {
      if (dragging.current) {
        try { localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(widthsRef.current)); } catch { /* ignore */ }
      }
      dragging.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const onResizeStart = (col: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const colEl = colElsRef.current[col];
    const currentW = colEl ? colEl.offsetWidth : DEFAULT_COL_WIDTHS[col];
    dragging.current = { col, startX: e.clientX, startW: currentW };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // Блокируем следующий click на th, чтобы не сработала сортировка
    const blockClick = (ev: MouseEvent) => { ev.stopPropagation(); };
    window.addEventListener('click', blockClick, { capture: true, once: true });
  };

  const setColRef = (i: number) => (el: HTMLTableColElement | null) => {
    if (el) colElsRef.current[i] = el;
  };

  return { tableRef, setColRef, onResizeStart, defaultWidths: DEFAULT_COL_WIDTHS };
}

// ── SWR fetcher ───────────────────────────────────────────────────────────────

interface ContactsResponse {
  contacts: Contact[];
  pagination: PaginationInfo;
  stats: Stats;
}

async function contactsFetcher(url: string): Promise<ContactsResponse> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка загрузки');
  }
  return res.json();
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [showBulkTagInput, setShowBulkTagInput] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showMerge, setShowMerge] = useState(false);

  const searchParams = useSearchParams();
  const { tableRef, setColRef, onResizeStart, defaultWidths } = useColumnResize();

  // Build SWR key from current filters/sort/pagination
  const swrKey = (() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    if (filterTag) params.set('tag', filterTag);
    if (filterCity) params.set('city', filterCity);
    params.set('sort_by', sortBy);
    params.set('sort_order', sortOrder);
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    return `/api/admin/contacts?${params}`;
  })();

  const { data, error, isLoading: loading, mutate } = useSWR<ContactsResponse>(
    swrKey,
    contactsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  const contacts = data?.contacts ?? [];
  const pagination: PaginationInfo = data?.pagination ?? { page, limit, totalCount: 0, totalPages: 0 };
  const stats = data?.stats ?? null;

  const loadContacts = useCallback(() => mutate(), [mutate]);

  useEffect(() => {
    const contactId = searchParams.get('contact');
    if (!contactId) return;
    fetch(`/api/admin/contacts/${contactId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSelectedContact(data); })
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => { setSelectedIds(new Set()); setSelectAll(false); }, [page, filterStatus, filterTag, search]);

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

  const handleBulkAddTag = async (tag: string) => {
    if (!tag || !selectedIds.size) return;
    const res = await adminCsrfFetch('/api/admin/contacts', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), tags_add: [tag] }),
    });
    if (res.ok) { loadContacts(); setShowBulkTagInput(false); }
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
    mutate(prev => prev ? { ...prev, contacts: prev.contacts.map(c => c.id === updated.id ? updated : c) } : prev, false);
    setSelectedContact(updated);
  };

  const handleContactDelete = (id: string) => {
    mutate(prev => prev ? { ...prev, contacts: prev.contacts.filter(c => c.id !== id) } : prev, false);
  };

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterTag(''); setFilterCity('');
    setPage(1);
  };

  const hasActiveFilters = search || filterStatus || filterTag || filterCity;

  function SortIcon({ field }: { field: string }) {
    if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-[var(--frox-gray-300)]" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-[var(--frox-brand)]" />
      : <ArrowDown className="w-3.5 h-3.5 text-[var(--frox-brand)]" />;
  }

  const handleStatusChange = async (c: Contact, newStatus: string) => {
    mutate(prev => prev ? { ...prev, contacts: prev.contacts.map(x => x.id === c.id ? { ...x, status: newStatus } : x) } : prev, false);
    try {
      const res = await adminCsrfFetch(`/api/admin/contacts/${c.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        mutate(prev => prev ? { ...prev, contacts: prev.contacts.map(x => x.id === c.id ? updated : x) } : prev, false);
        if (selectedContact?.id === c.id) setSelectedContact(updated);
      }
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-5">
      {/* ── Заголовок ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 data-frox-heading="true" className="text-3xl font-black tracking-tight text-[var(--frox-gray-1100)]">Контакты</h1>
          {stats && <p className="mt-1 text-sm text-[var(--frox-gray-500)]">Всего {stats.total_count} контактов</p>}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Новые', value: stats.new_count, icon: Inbox, tone: 'brand' as const, filterVal: 'new' },
            { label: 'В работе', value: stats.in_progress_count, icon: Clock, tone: 'plum' as const, filterVal: 'in_progress' },
            { label: 'Обработано', value: stats.processed_count, icon: CheckCircle2, tone: 'mint' as const, filterVal: 'processed' },
            { label: 'Всего', value: stats.total_count, icon: Users, tone: 'slate' as const, filterVal: '' },
          ].map((card) => (
            <FroxStatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              tone={card.tone}
              active={Boolean(card.filterVal) && filterStatus === card.filterVal}
              onClick={card.filterVal ? () => {
                setFilterStatus(filterStatus === card.filterVal ? '' : card.filterVal);
                setPage(1);
              } : undefined}
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
              placeholder="Поиск по имени, email, телефону, городу, специальности..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="h-10 border-[rgba(115,100,219,0.1)] bg-white/80 pl-10 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="frox-select h-10 rounded-xl px-3 text-sm"
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
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
              {(filterTag || filterCity) && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[var(--frox-brand)]" />}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 gap-1 text-[var(--frox-gray-500)]">
                <X className="w-3.5 h-3.5" /> Сбросить
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-4 border-t border-[rgba(115,100,219,0.1)] px-4 pb-4 pt-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5">Тег</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--frox-gray-400)]" />
                <Input
                  placeholder="Фильтр по тегу"
                  value={filterTag}
                  onChange={e => { setFilterTag(e.target.value); setPage(1); }}
                  className="h-10 bg-white/80 pl-9"
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
                  onChange={e => { setFilterCity(e.target.value); setPage(1); }}
                  className="h-10 bg-white/80 pl-9"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Массовые действия ── */}
      {selectedIds.size > 0 && (
        <div className="frox-bulk-bar flex flex-wrap items-center gap-3 rounded-[28px] px-4 py-3 text-white">
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
                <TagAutocompleteInput
                  onAdd={tag => handleBulkAddTag(tag)}
                  placeholder="Тег..."
                  inputClassName="h-6 text-xs w-28 bg-white/20 border-0 text-white placeholder:text-white/60 focus-visible:ring-0"
                  showButton={false}
                  autoFocus
                  onKeyDownExtra={e => { if (e.key === 'Escape') setShowBulkTagInput(false); }}
                />
                <button onClick={() => setShowBulkTagInput(false)} className="p-0.5 hover:text-[var(--frox-gray-300)]"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {selectedIds.size >= 2 && (
              <Button size="sm" variant="secondary" onClick={() => setShowMerge(true)} className="h-7 border-0 bg-white/20 text-xs text-white hover:bg-white/30">
                <Merge className="w-3.5 h-3.5 mr-1" /> Объединить
              </Button>
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
          <AlertCircle className="w-4 h-4 shrink-0" /> {error.message}
        </div>
      )}

      {/* ── Мобильные карточки ── */}
      <div className="lg:hidden space-y-2">
        {!loading && contacts.length > 0 && (
          <div className="frox-shell-surface flex items-center justify-between rounded-2xl px-3 py-2.5">
            <label className="flex items-center gap-2 text-sm text-[var(--frox-gray-600)] cursor-pointer">
              <Checkbox checked={selectAll} onChange={handleSelectAll} />
              Выбрать все
            </label>
            <span className="text-xs text-[var(--frox-gray-400)]">{contacts.length} на странице</span>
          </div>
        )}

        {loading ? (
          <div className="frox-empty-state rounded-[28px] p-12 text-center text-[var(--frox-gray-400)]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Загрузка...
          </div>
        ) : contacts.length === 0 ? (
          <div className="frox-empty-state rounded-[28px] p-12 text-center text-[var(--frox-gray-400)]">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Контактов не найдено</p>
          </div>
        ) : (
          contacts.map(c => {
            const sc = getStatusConfig(c.status);
            return (
              <div
                key={c.id}
                className="frox-shell-surface cursor-pointer rounded-[28px] p-4 transition-all hover:border-[rgba(115,100,219,0.22)]"
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
      <div className="frox-table-shell hidden overflow-hidden rounded-[28px] lg:block">
        <div className="overflow-x-auto">
          <table ref={tableRef} className="text-sm text-left" style={{ tableLayout: 'fixed', width: defaultWidths.reduce((a, b) => a + b, 0) }}>
            <colgroup>
              {defaultWidths.map((w, i) => <col key={i} ref={setColRef(i)} style={{ width: w }} />)}
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--frox-gray-200)]">
                <th className="px-4 py-3 relative" style={{ width: defaultWidths[0] }}>
                  <Checkbox checked={selectAll} onChange={handleSelectAll} />
                  <span
                    className="frox-table-resize absolute right-0 top-0 h-full w-1 cursor-col-resize select-none"
                    onMouseDown={e => onResizeStart(0, e)}
                  />
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
                    style={{ width: defaultWidths[col.idx] }}
                    onClick={col.field ? () => handleSort(col.field!) : undefined}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {col.label}
                      {col.field && <SortIcon field={col.field} />}
                    </div>
                    <span
                      className="frox-table-resize absolute right-0 top-0 h-full w-1 cursor-col-resize select-none"
                      onMouseDown={e => onResizeStart(col.idx, e)}
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
                  {hasActiveFilters && <button onClick={clearFilters} className="mt-2 text-sm text-[var(--frox-brand)] hover:underline">Сбросить фильтры</button>}
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
                    <td className="px-4 py-3 truncate">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={c.full_name} />
                        <span className="font-semibold text-[var(--frox-gray-1100)] truncate">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--frox-gray-500)] space-y-0.5 truncate">
                      {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 shrink-0 text-[var(--frox-gray-400)]" /><span className="truncate">{c.email}</span></div>}
                      {c.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0 text-[var(--frox-gray-400)]" />{c.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--frox-gray-600)] truncate">
                      <div className="truncate">{c.city || <span className="text-[var(--frox-gray-300)]">—</span>}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--frox-gray-600)] truncate">
                      <div className="truncate">{c.speciality || <span className="text-[var(--frox-gray-300)]">—</span>}</div>
                    </td>
                    <td className="px-4 py-3 truncate">
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
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-[var(--frox-gray-500)] px-2">{pagination.page} / {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Панель контакта ── */}
      {selectedContact && (
        <ContactPanel
          key={selectedContact.id}
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

      {/* ── Слияние контактов ── */}
      {showMerge && selectedIds.size >= 2 && (
        <MergeModal
          contacts={contacts.filter(c => selectedIds.has(c.id))}
          onClose={() => setShowMerge(false)}
          onDone={(survivorId) => {
            setShowMerge(false);
            setSelectedIds(new Set());
            setSelectAll(false);
            loadContacts();
          }}
        />
      )}
    </div>
  );
}
