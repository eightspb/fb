'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  FileText,
  MessageSquare,
  ExternalLink,
  Check,
  AlertCircle,
  Clock,
  User,
  Pencil,
  X,
  Trash2,
  ChevronDown,
  Inbox,
  CheckCircle2,
  Archive,
  Save,
} from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import type { RequestItem } from './RequestDetailsModal';

interface LeadInfoPanelProps {
  request: RequestItem;
  onUpdate: (updatedRequest: RequestItem) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

const statusConfig = [
  { value: 'new', label: 'Новая', pill: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500', icon: Inbox },
  { value: 'in_progress', label: 'В работе', pill: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500', icon: Clock },
  { value: 'processed', label: 'Обработана', pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle2 },
  { value: 'archived', label: 'В архиве', pill: 'bg-[var(--frox-gray-200)] text-[var(--frox-gray-500)] border border-[var(--frox-neutral-border)]', dot: 'bg-[var(--frox-gray-400)]', icon: Archive },
];

const priorityConfig = [
  { value: 'low', label: 'Низкий', pill: 'bg-[var(--frox-gray-100)] text-[var(--frox-gray-500)] border border-[var(--frox-neutral-border)]' },
  { value: 'normal', label: 'Обычный', pill: 'bg-[var(--frox-gray-100)] text-[var(--frox-gray-600)] border border-[var(--frox-neutral-border)]' },
  { value: 'high', label: 'Высокий', pill: 'bg-orange-50 text-orange-700 border border-orange-200' },
  { value: 'urgent', label: 'Срочный', pill: 'bg-red-50 text-red-700 border border-red-200' },
];

// Inline-редактируемое поле с hover-эффектом
function EditableField({
  label,
  value,
  onSave,
  icon,
  type = 'text',
}: {
  label: string;
  value: string;
  onSave: (val: string) => Promise<void>;
  icon: React.ReactNode;
  type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (draft.trim() === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="group relative">
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--frox-gray-100)] transition-colors">
        <div className="text-[var(--frox-gray-400)] shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-[var(--frox-gray-400)] uppercase tracking-wider leading-none mb-0.5">{label}</div>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Input
                type={type}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="h-7 text-sm py-0 px-2 bg-white"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') { setDraft(value); setEditing(false); }
                }}
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setDraft(value); setEditing(false); }}
                className="p-1 rounded-lg hover:bg-[var(--frox-gray-200)] text-[var(--frox-gray-400)] transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-[var(--frox-gray-900)] truncate">
                {value || <span className="text-[var(--frox-gray-300)] font-normal italic text-xs">не указано</span>}
              </span>
              <button
                onClick={() => { setDraft(value); setEditing(true); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-[var(--frox-gray-300)] text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] transition-all shrink-0"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Поле с autocomplete
function EditableSelectField({
  label,
  value,
  options,
  onSave,
  icon,
}: {
  label: string;
  value: string;
  options: string[];
  onSave: (val: string) => Promise<void>;
  icon: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = draft
    ? options.filter(o => o.toLowerCase().includes(draft.toLowerCase()))
    : options;

  const handleSave = async (val?: string) => {
    const toSave = (val ?? draft).trim();
    if (toSave === value) { setEditing(false); setShowDropdown(false); return; }
    setSaving(true);
    await onSave(toSave);
    setSaving(false);
    setEditing(false);
    setShowDropdown(false);
  };

  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing]);

  return (
    <div className="group relative" ref={containerRef}>
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--frox-gray-100)] transition-colors">
        <div className="text-[var(--frox-gray-400)] shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-[var(--frox-gray-400)] uppercase tracking-wider leading-none mb-0.5">{label}</div>
          {editing ? (
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <Input
                  value={draft}
                  onChange={e => { setDraft(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="h-7 text-sm py-0 px-2 bg-white"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') { setEditing(false); setShowDropdown(false); }
                  }}
                />
                <button
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="p-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setDraft(value); setEditing(false); setShowDropdown(false); }}
                  className="p-1 rounded-lg hover:bg-[var(--frox-gray-200)] text-[var(--frox-gray-400)] transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {showDropdown && filtered.length > 0 && (
                <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-[var(--frox-neutral-border)] rounded-xl shadow-lg py-1">
                  {filtered.slice(0, 50).map(opt => (
                    <div
                      key={opt}
                      className="px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--frox-gray-100)] truncate"
                      onMouseDown={e => { e.preventDefault(); handleSave(opt); }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-[var(--frox-gray-900)] truncate">
                {value || <span className="text-[var(--frox-gray-300)] font-normal italic text-xs">не указано</span>}
              </span>
              <button
                onClick={() => { setDraft(value); setEditing(true); setShowDropdown(true); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-[var(--frox-gray-300)] text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] transition-all shrink-0"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Dropdown-выбор статуса в стиле пилюли
function StatusDropdown({ value, options, onChange, className }: {
  value: string;
  options: typeof statusConfig | typeof priorityConfig;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all hover:opacity-90 w-full justify-between ${(current as typeof statusConfig[0]).pill || ''} ${className || ''}`}
      >
        <span className="flex items-center gap-1.5">
          {'dot' in current && <span className={`w-2 h-2 rounded-full ${'dot' in current ? current.dot : ''}`} />}
          {current.label}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[var(--frox-neutral-border)] rounded-xl shadow-lg py-1 min-w-full">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[var(--frox-gray-100)] transition-colors ${value === opt.value ? 'font-semibold' : ''}`}
              >
                {'dot' in opt && <span className={`w-2 h-2 rounded-full ${opt.dot}`} />}
                {opt.label}
                {value === opt.value && <Check className="w-3.5 h-3.5 ml-auto text-emerald-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function LeadInfoPanel({ request, onUpdate, onDelete, compact }: LeadInfoPanelProps) {
  const [notes, setNotes] = useState(request.notes || '');
  const [status, setStatus] = useState(request.status || 'new');
  const [priority, setPriority] = useState(request.priority || 'normal');
  const [isSaving, setIsSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);

  useEffect(() => {
    setNotes(request.notes || '');
    setStatus(request.status || 'new');
    setPriority(request.priority || 'normal');
  }, [request.id, request.notes, request.status, request.priority]);

  useEffect(() => {
    fetch('/api/admin/requests/options', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setCities(data.cities || []); setInstitutions(data.institutions || []); }
      })
      .catch(() => {});
  }, []);

  const handleFieldUpdate = async (field: string, value: string) => {
    try {
      const res = await adminCsrfFetch(`/api/admin/requests/${request.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) onUpdate(await res.json());
    } catch { /* silent */ }
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const res = await adminCsrfFetch(`/api/admin/requests/${request.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        onUpdate(await res.json());
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      }
    } catch { /* silent */ }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    try {
      const res = await adminCsrfFetch(`/api/admin/requests/${request.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok && onDelete) onDelete(request.id);
    } catch { /* silent */ }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('ru-RU', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>

      {/* ── Статус и приоритет ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] font-medium text-[var(--frox-gray-400)] uppercase tracking-wider mb-1.5">Статус</div>
          <StatusDropdown
            value={status}
            options={statusConfig}
            onChange={v => { setStatus(v); handleFieldUpdate('status', v); }}
          />
        </div>
        <div>
          <div className="text-[11px] font-medium text-[var(--frox-gray-400)] uppercase tracking-wider mb-1.5">Приоритет</div>
          <StatusDropdown
            value={priority}
            options={priorityConfig}
            onChange={v => { setPriority(v); handleFieldUpdate('priority', v); }}
          />
        </div>
      </div>

      <div className="h-px bg-[var(--frox-gray-200)]" />

      {/* ── Контактная информация ── */}
      <div>
        <h3 className="text-[10px] font-semibold text-[var(--frox-gray-400)] uppercase tracking-wider mb-1">Контактные данные</h3>
        <div className="border border-[var(--frox-neutral-border)] rounded-xl overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-[var(--frox-gray-100)]">
            <EditableField
              label="Имя"
              value={request.name}
              icon={<User className="w-3.5 h-3.5" />}
              onSave={v => handleFieldUpdate('name', v)}
            />
            <EditableField
              label="Телефон"
              value={request.phone || ''}
              icon={<Phone className="w-3.5 h-3.5" />}
              type="tel"
              onSave={v => handleFieldUpdate('phone', v)}
            />
          </div>
          <div className="border-t border-[var(--frox-gray-100)] grid grid-cols-2 divide-x divide-[var(--frox-gray-100)]">
            <EditableField
              label="Email"
              value={request.email || ''}
              icon={<Mail className="w-3.5 h-3.5" />}
              type="email"
              onSave={v => handleFieldUpdate('email', v)}
            />
            <EditableSelectField
              label="Город"
              value={request.city || ''}
              options={cities}
              icon={<MapPin className="w-3.5 h-3.5" />}
              onSave={v => handleFieldUpdate('city', v)}
            />
          </div>
          <div className="border-t border-[var(--frox-gray-100)]">
            <EditableSelectField
              label="Учреждение"
              value={request.institution || ''}
              options={institutions}
              icon={<Building2 className="w-3.5 h-3.5" />}
              onSave={v => handleFieldUpdate('institution', v)}
            />
          </div>
        </div>
      </div>

      {/* ── Сообщение ── */}
      {request.message && (
        <div className="rounded-xl border border-[var(--frox-neutral-border)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--frox-gray-100)] border-b border-[var(--frox-neutral-border)]">
            <MessageSquare className="w-3.5 h-3.5 text-[var(--frox-gray-400)]" />
            <span className="text-[11px] font-semibold text-[var(--frox-gray-400)] uppercase tracking-wider">Сообщение</span>
          </div>
          <p className="text-sm text-[var(--frox-gray-800)] whitespace-pre-wrap px-4 py-3 leading-relaxed">{request.message}</p>
        </div>
      )}

      {/* ── Конференция ── */}
      {request.metadata?.conference && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-100">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider">Конференция</span>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-blue-900">{request.metadata.conference}</p>
            {request.metadata.certificate && (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Требуется сертификат
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Мета-информация ── */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[var(--frox-gray-400)]">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>Создана: <span className="text-[var(--frox-gray-600)]">{formatDate(request.created_at)}</span></span>
        </div>
        {request.updated_at && request.updated_at !== request.created_at && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Обновлена: <span className="text-[var(--frox-gray-600)]">{formatDate(request.updated_at)}</span></span>
          </div>
        )}
        {request.page_url && (
          <div className="flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            <a
              href={request.page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline truncate max-w-[200px]"
            >
              {request.page_url.replace(/^https?:\/\/[^/]+/, '') || '/'}
            </a>
          </div>
        )}
      </div>

      <div className="h-px bg-[var(--frox-gray-200)]" />

      {/* ── Заметки ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-3.5 h-3.5 text-[var(--frox-gray-400)]" />
          <span className="text-[11px] font-semibold text-[var(--frox-gray-400)] uppercase tracking-wider">Заметки менеджера</span>
        </div>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Добавьте заметки по этой заявке..."
          className="min-h-[100px] resize-none text-sm bg-[var(--frox-gray-100)] border-[var(--frox-neutral-border)] focus:bg-white rounded-xl"
        />
        <div className="flex items-center justify-between mt-2">
          <Button
            onClick={handleSaveNotes}
            disabled={isSaving}
            size="sm"
            className={`gap-1.5 h-8 transition-all ${notesSaved ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
          >
            {notesSaved ? (
              <><Check className="w-3.5 h-3.5" /> Сохранено</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> {isSaving ? 'Сохранение...' : 'Сохранить заметки'}</>
            )}
          </Button>
        </div>
      </div>

      {/* ── Опасная зона ── */}
      {onDelete && (
        <div className="pt-2">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--frox-gray-400)] hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Удалить заявку
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-sm text-red-700 flex-1">Удалить эту заявку без возможности восстановления?</span>
              <Button variant="destructive" size="sm" className="h-7 text-xs shrink-0" onClick={handleDelete}>
                Удалить
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => setShowDeleteConfirm(false)}>
                Отмена
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
