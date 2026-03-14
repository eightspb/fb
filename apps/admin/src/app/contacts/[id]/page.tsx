'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailThread } from '@/components/admin/EmailThread';
import { TagAutocompleteInput } from '@/components/admin/TagAutocompleteInput';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  Stethoscope,
  X,
  Trash2,
  AlertCircle,
  Loader2,
  Check,
  Pencil,
  Search,
  ChevronDown,
  Plus,
  Pin,
  Sparkles,
  Microscope,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

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

interface ContactNote {
  id: string;
  contact_id: string;
  title: string | null;
  content: string;
  source: 'manual' | 'ai_research' | 'ai_deep_research' | 'import';
  pinned: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

function formatDateTime(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = ['bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${color}`}>
      {initials || '?'}
    </div>
  );
}

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

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 flex-1">
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="h-7 text-sm py-0"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
        />
        <button onClick={handleSave} disabled={saving} className="p-1 text-emerald-500 hover:text-emerald-600 shrink-0">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setEditing(false)} className="p-1 text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex-1 text-left text-sm text-[var(--frox-gray-800)] hover:text-[var(--frox-gray-1100)] group flex items-center gap-1.5"
    >
      <span className={value ? '' : 'text-[var(--frox-gray-300)] italic'}>{value || placeholder}</span>
      <Pencil className="w-3 h-3 text-[var(--frox-gray-300)] group-hover:text-[var(--frox-gray-500)] transition-colors shrink-0" />
    </button>
  );
}

// ── Note source badge ──
const sourceLabels: Record<string, { label: string; className: string }> = {
  manual: { label: 'Вручную', className: 'bg-[var(--frox-gray-100)] text-[var(--frox-gray-500)]' },
  ai_research: { label: 'AI', className: 'bg-violet-50 text-violet-600' },
  ai_deep_research: { label: 'Deep Research', className: 'bg-blue-50 text-blue-600' },
  import: { label: 'Импорт', className: 'bg-amber-50 text-amber-600' },
};

function NoteSourceBadge({ source }: { source: string }) {
  const cfg = sourceLabels[source] || sourceLabels.manual;
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Single note card ──
function NoteCard({ note, onUpdate, onDelete }: {
  note: ContactNote;
  onUpdate: (noteId: string, fields: Partial<ContactNote>) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [titleDraft, setTitleDraft] = useState(note.title || '');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(note.content);
      setTitleDraft(note.title || '');
    }
  }, [note.content, note.title, editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(note.id, {
        content: draft,
        title: titleDraft.trim() || null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePin = async () => {
    await onUpdate(note.id, { pinned: !note.pinned });
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = Math.max(80, el.scrollHeight) + 'px';
    }
  }, [editing]);

  if (editing) {
    return (
      <div className="rounded-lg border-2 border-blue-400 bg-white p-3 space-y-2 shadow-sm">
        <Input
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          placeholder="Заголовок (необязательно)"
          className="h-7 text-sm font-medium"
          onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
        />
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => {
            setDraft(e.target.value);
            const el = e.target;
            el.style.height = 'auto';
            el.style.height = Math.max(80, el.scrollHeight) + 'px';
          }}
          className="w-full text-sm px-3 py-2 border border-[var(--frox-gray-200)] rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white min-h-[80px] resize-y"
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving || !draft.trim()} className="h-7 text-xs">
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Сохранить
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs">Отмена</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group rounded-lg border bg-white hover:shadow-sm transition-all p-3 ${note.pinned ? 'border-amber-200 bg-amber-50/30' : 'border-[var(--frox-gray-200)]'}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer" onClick={() => setCollapsed(c => !c)}>
          <ChevronDown className={`w-3 h-3 text-[var(--frox-gray-400)] shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          {note.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500" />}
          {note.title ? (
            <span className="text-sm font-medium text-[var(--frox-gray-900)] truncate">{note.title}</span>
          ) : (
            <span className="text-xs text-[var(--frox-gray-400)]">{formatDateTime(note.created_at)}</span>
          )}
          <NoteSourceBadge source={note.source} />
        </div>
        <div className={`flex items-center gap-0.5 shrink-0 transition-opacity ${showDeleteConfirm ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {!showDeleteConfirm ? (
            <>
              <button
                onClick={handlePin}
                className={`p-1 rounded transition-colors ${note.pinned ? 'text-amber-500 hover:text-amber-600' : 'text-[var(--frox-gray-400)] hover:text-amber-500'}`}
                title={note.pinned ? 'Открепить' : 'Закрепить'}
              >
                <Pin className={`w-3 h-3 ${note.pinned ? 'fill-current' : ''}`} />
              </button>
              <button onClick={() => setEditing(true)} className="p-1 text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] rounded transition-colors" title="Редактировать">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="p-1 text-[var(--frox-gray-400)] hover:text-red-500 rounded transition-colors" title="Удалить">
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => onDelete(note.id)} className="p-1 text-red-500 hover:text-red-600 rounded transition-colors" title="Подтвердить удаление">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="p-1 text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] rounded transition-colors" title="Отмена">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      {!collapsed && (
        <>
          {note.title && (
            <div className="text-[10px] text-[var(--frox-gray-400)] mb-1 ml-[18px]">{formatDateTime(note.created_at)}</div>
          )}
          <div className="text-sm text-[var(--frox-gray-700)] whitespace-pre-wrap leading-relaxed ml-[18px]">{note.content}</div>
        </>
      )}
    </div>
  );
}

// ── New note form ──
function NewNoteForm({ contactId, onCreated }: { contactId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await adminCsrfFetch(`/api/admin/contacts/${contactId}/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || null, content: content.trim() }),
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        setOpen(false);
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] border border-dashed border-[var(--frox-gray-200)] hover:border-[var(--frox-gray-300)] rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Добавить заметку
      </button>
    );
  }

  return (
    <div className="rounded-lg border-2 border-blue-400 bg-white p-3 space-y-2 shadow-sm">
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Заголовок (необязательно)"
        className="h-7 text-sm font-medium"
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Текст заметки..."
        className="w-full text-sm px-3 py-2 border border-[var(--frox-gray-200)] rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white min-h-[80px] resize-y"
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving || !content.trim()} className="h-7 text-xs">
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Сохранить
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setTitle(''); setContent(''); }} className="h-7 text-xs">Отмена</Button>
      </div>
    </div>
  );
}

// ── Extract fields from research notes ──
interface ExtractedField {
  key: string;
  label: string;
  currentValue: string | null;
  newValue: string;
}

function extractFieldsFromNotes(notes: ContactNote[], contact: Contact): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const seen = new Set<string>();

  const addField = (key: string, label: string, newValue: string) => {
    if (!newValue || seen.has(key)) return;
    const current = contact[key as keyof Contact] as string | null;
    if (current === newValue) return;
    seen.add(key);
    fields.push({ key, label, currentValue: current, newValue });
  };

  // Deep research notes — structured metadata
  for (const note of notes) {
    if (note.source !== 'ai_deep_research' && note.source !== 'ai_research') continue;
    const meta = note.metadata as Record<string, unknown>;
    const structured = meta?.structured as Record<string, unknown> | undefined;

    if (structured) {
      // Deep research structured data
      const specs = structured.specialties as string[] | undefined;
      if (specs?.length) addField('speciality', 'Специальность', specs.join(', '));

      const locations = structured.locations as string[] | undefined;
      if (locations?.length) addField('city', 'Город', locations[0]);

      const current = structured.current_affiliations as string[] | undefined;
      if (current?.length) addField('institution', 'Организация', current.join('; '));
    }

    // Parse content text (emoji format from both ai_research and ai_deep_research)
    const content = note.content;
    if (!content) continue;

    // 📧 / ✉️ Email
    const emailMatch = content.match(/[📧✉️]\s*(?:Email|Почта|E-mail)[:\s]*([^\s\n,]+@[^\s\n,]+)/i);
    if (emailMatch) addField('email', 'Email', emailMatch[1].trim());

    // 📱 / ☎️ Phone
    const phoneMatch = content.match(/[📱☎️📞]\s*(?:Телефон|Тел\.?)[:\s]*([+\d\s()-]{7,})/i);
    if (phoneMatch) addField('phone', 'Телефон', phoneMatch[1].trim());

    // 🏥 Institution
    const instMatch = content.match(/🏥\s*(?:Текущ(?:ие|ее)\s*мест[оа]\s*работы|Организация|Клиника)[:\s]*([^\n]+)/i);
    if (instMatch && !seen.has('institution')) addField('institution', 'Организация', instMatch[1].trim());

    // 🩺 Speciality
    const specMatch = content.match(/🩺\s*(?:Специализация|Специальность)[:\s]*([^\n]+)/i);
    if (specMatch && !seen.has('speciality')) addField('speciality', 'Специальность', specMatch[1].trim());

    // 📍 City
    const cityMatch = content.match(/📍\s*(?:Город|Локация|Регион)[:\s]*([^\n]+)/i);
    if (cityMatch && !seen.has('city')) addField('city', 'Город', cityMatch[1].trim());
  }

  return fields;
}

// ── Enrich from research modal ──
function EnrichModal({ contact, notes, onApply, onClose }: {
  contact: Contact;
  notes: ContactNote[];
  onApply: (fields: Partial<Contact>) => Promise<void>;
  onClose: () => void;
}) {
  const extracted = extractFieldsFromNotes(notes, contact);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(extracted.map(f => f.key)));
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleApply = async () => {
    const patch: Record<string, string> = {};
    for (const f of extracted) {
      if (selected.has(f.key)) patch[f.key] = f.newValue;
    }
    if (!Object.keys(patch).length) return;
    setSaving(true);
    try {
      await onApply(patch as Partial<Contact>);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-[var(--frox-gray-200)] px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-[var(--frox-gray-900)]">Обновить из исследования</span>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {extracted.length === 0 ? (
            <div className="text-center py-8 text-[var(--frox-gray-400)]">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 stroke-1" />
              <p className="text-sm">Не найдено новых данных для обновления</p>
              <p className="text-xs mt-1">Запустите AI Исследование или Deep Research для поиска информации</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[var(--frox-gray-500)]">
                Выберите поля для обновления. Данные извлечены из заметок AI-исследований.
              </p>
              {extracted.map(field => (
                <label
                  key={field.key}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selected.has(field.key)
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-[var(--frox-gray-200)] hover:border-[var(--frox-gray-300)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(field.key)}
                    onChange={() => toggle(field.key)}
                    className="mt-0.5 rounded border-[var(--frox-gray-300)] text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[var(--frox-gray-500)] uppercase tracking-wider mb-1">
                      {field.label}
                    </div>
                    {field.currentValue && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs text-[var(--frox-gray-400)] line-through truncate">{field.currentValue}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      {field.currentValue && <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />}
                      <span className="text-sm text-[var(--frox-gray-800)] font-medium break-words">{field.newValue}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {extracted.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t border-[var(--frox-gray-200)] px-5 py-3 flex items-center justify-between rounded-b-2xl">
            <span className="text-xs text-[var(--frox-gray-400)]">
              {selected.size} из {extracted.length} полей
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">Отмена</Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={saving || selected.size === 0}
                className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                Обновить
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const contactFetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(async res => {
    if (!res.ok) {
      const err: any = new Error('Ошибка загрузки');
      err.status = res.status;
      throw err;
    }
    return res.json() as Promise<Contact>;
  });

const notesFetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(async res => {
    if (!res.ok) throw new Error('Ошибка загрузки заметок');
    return res.json() as Promise<{ notes: ContactNote[] }>;
  });

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const returnToParam = searchParams.get('returnTo');
  const backHref = returnToParam && (
    returnToParam.startsWith('/contacts') ||
    returnToParam.startsWith('/admin/contacts')
  ) ? returnToParam : '/contacts';

  const { data: contact, error: swrError, isLoading: loading, mutate } = useSWR<Contact>(
    id ? `/api/admin/contacts/${id}` : null,
    contactFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000, keepPreviousData: true }
  );

  const { data: notesData, mutate: mutateNotes } = useSWR(
    id ? `/api/admin/contacts/${id}/notes` : null,
    notesFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000, keepPreviousData: true }
  );

  const notes = notesData?.notes || [];

  const error = swrError
    ? swrError.status === 404 ? 'Контакт не найден'
      : swrError.status === 401 ? 'Требуется авторизация'
      : 'Ошибка загрузки'
    : null;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

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

  const [researching, setResearching] = useState(false);
  const [deepResearching, setDeepResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [showEnrichModal, setShowEnrichModal] = useState(false);

  const patchField = async (fields: Partial<Contact>) => {
    const res = await adminCsrfFetch(`/api/admin/contacts/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (res.ok) mutate(await res.json(), false);
  };

  const addTag = async (tag: string) => {
    if (!contact || contact.tags.includes(tag)) return;
    await patchField({ tags: [...contact.tags, tag] });
  };

  const removeTag = async (tag: string) => {
    if (!contact) return;
    await patchField({ tags: contact.tags.filter(t => t !== tag) });
  };

  const handleResearch = async () => {
    setResearching(true);
    setResearchError(null);
    try {
      const res = await adminCsrfFetch(`/api/admin/contacts/${id}/research`, {
        method: 'POST', credentials: 'include',
      });
      if (res.ok) {
        mutateNotes();
        mutate();
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
      const res = await adminCsrfFetch(`/api/admin/contacts/${id}/deep-research`, {
        method: 'POST', credentials: 'include',
      });
      if (res.ok) {
        mutateNotes();
        mutate();
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

  const handleUpdateNote = async (noteId: string, fields: Partial<ContactNote>) => {
    const res = await adminCsrfFetch(`/api/admin/contacts/${id}/notes/${noteId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (res.ok) mutateNotes();
  };

  const handleDeleteNote = async (noteId: string) => {
    const res = await adminCsrfFetch(`/api/admin/contacts/${id}/notes/${noteId}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (res.ok || res.status === 204) mutateNotes();
  };

  const handleDelete = async () => {
    const res = await adminCsrfFetch(`/api/admin/contacts/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) router.push('/contacts');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--frox-gray-300)]" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-[var(--frox-gray-600)] mb-6">{error || 'Контакт не найден'}</p>
        <Button variant="outline" onClick={() => router.push('/contacts')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к контактам
        </Button>
      </div>
    );
  }

  const sc = getStatusConfig(contact.status);

  return (
    <div className="max-w-5xl mx-auto space-y-5 min-w-0">
      {/* ── Шапка ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-8 gap-1.5 text-[var(--frox-gray-500)] hover:text-[var(--frox-gray-900)] -ml-2"
            onClick={() => router.push(backHref)}
          >
            <ArrowLeft className="w-4 h-4" />
            Контакты
          </Button>
          <span className="text-[var(--frox-gray-300)]">/</span>
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={contact.full_name} />
            <span className="font-semibold text-[var(--frox-gray-1100)] truncate text-lg">{contact.full_name}</span>
          </div>
        </div>
        <div className="relative flex items-center gap-2 shrink-0" ref={statusMenuRef}>
          <button
            onClick={() => setShowStatusMenu(v => !v)}
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity ${sc.pill}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {showStatusMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[var(--frox-neutral-border)] rounded-xl shadow-lg p-1 flex flex-col gap-0.5 min-w-[140px]">
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

      {/* ── Контент с табами ── */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="bg-white border border-[var(--frox-neutral-border)] rounded-xl p-1 h-auto w-full sm:w-auto">
          <TabsTrigger
            value="info"
            className="flex-1 sm:flex-none rounded-lg data-[state=active]:bg-[var(--frox-gray-1100)] data-[state=active]:text-white data-[state=active]:shadow-none text-[var(--frox-gray-500)] h-8 px-4 text-sm"
          >
            Информация
          </TabsTrigger>
          <TabsTrigger
            value="emails"
            className="flex-1 sm:flex-none rounded-lg data-[state=active]:bg-[var(--frox-gray-1100)] data-[state=active]:text-white data-[state=active]:shadow-none text-[var(--frox-gray-500)] h-8 px-4 text-sm"
          >
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            Переписка
          </TabsTrigger>
        </TabsList>

        {/* ── Информация ── */}
        <TabsContent value="info" className="mt-4">
          <div className="bg-white border border-[var(--frox-neutral-border)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">

            {/* Контактные данные + Место работы — двухколоночный layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Левая колонка: контактные данные */}
              <div>
                <div className="text-[11px] font-semibold text-[var(--frox-gray-400)] uppercase tracking-wider mb-3">Контактные данные</div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[var(--frox-gray-400)] shrink-0" />
                    <EditableField value={contact.email} onSave={v => patchField({ email: v || null } as Partial<Contact>)} placeholder="email не указан" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[var(--frox-gray-400)] shrink-0" />
                    <EditableField value={contact.phone} onSave={v => patchField({ phone: v || null } as Partial<Contact>)} placeholder="телефон не указан" />
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[var(--frox-gray-400)] shrink-0" />
                    <EditableField value={contact.city} onSave={v => patchField({ city: v || null } as Partial<Contact>)} placeholder="город не указан" />
                  </div>
                </div>
              </div>

              {/* Правая колонка: место работы */}
              <div>
                <div className="text-[11px] font-semibold text-[var(--frox-gray-400)] uppercase tracking-wider mb-3">Место работы</div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-[var(--frox-gray-400)] shrink-0" />
                    <EditableField value={contact.institution} onSave={v => patchField({ institution: v || null } as Partial<Contact>)} placeholder="организация не указана" />
                  </div>
                  <div className="flex items-center gap-3">
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

            {/* ── Заметки ── */}
            <div className="rounded-xl border border-[var(--frox-gray-200)] bg-[var(--frox-gray-50)] p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0"><path d="M2 4h12M2 8h8M2 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Заметки
                  {notes.length > 0 && (
                    <span className="text-[10px] font-medium bg-[var(--frox-gray-200)] text-[var(--frox-gray-500)] px-1.5 py-0.5 rounded-full ml-1">
                      {notes.length}
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
                  {notes.some(n => n.source === 'ai_research' || n.source === 'ai_deep_research') && (
                    <button
                      onClick={() => setShowEnrichModal(true)}
                      className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-emerald-200 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      title="Обновить данные из исследования"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Обновить
                    </button>
                  )}
                </div>
              </div>

              {researchError && (
                <div className="flex items-center gap-2 p-2.5 mb-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {researchError}
                </div>
              )}

              <div className="space-y-2">
                {notes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onUpdate={handleUpdateNote}
                    onDelete={handleDeleteNote}
                  />
                ))}
                <NewNoteForm contactId={id} onCreated={() => mutateNotes()} />
              </div>
            </div>

            {/* Мета */}
            <div className="text-xs text-[var(--frox-gray-400)] pt-3 border-t border-[var(--frox-gray-200)] space-y-1">
              <div>Источник: <span className="text-[var(--frox-gray-600)] font-medium">{contact.import_source}</span></div>
              <div>Добавлен: <span className="text-[var(--frox-gray-600)]">{formatDate(contact.created_at)}</span></div>
              {contact.updated_at !== contact.created_at && (
                <div>Обновлён: <span className="text-[var(--frox-gray-600)]">{formatDate(contact.updated_at)}</span></div>
              )}
            </div>

            {/* Удалить */}
            <div className="pt-2 border-t border-[var(--frox-gray-200)]">
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
        </TabsContent>

        {/* ── Переписка ── */}
        <TabsContent value="emails" className="mt-4">
          <div className="bg-white border border-[var(--frox-neutral-border)] rounded-2xl pt-4 sm:pt-6 px-4 sm:px-6 pb-2 shadow-sm overflow-hidden">
            {contact.email ? (
              <EmailThread
                contactEmail={contact.email}
                contactName={contact.full_name}
              />
            ) : (
              <div className="text-center py-12 text-[var(--frox-gray-400)]">
                <Mail className="w-12 h-12 mx-auto mb-3 stroke-1" />
                <p className="text-sm">У контакта не указан email</p>
                <p className="text-xs mt-1">Добавьте email на вкладке «Информация»</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {showEnrichModal && contact && (
        <EnrichModal
          contact={contact}
          notes={notes}
          onApply={async (fields) => {
            await patchField(fields);
            mutateNotes();
          }}
          onClose={() => setShowEnrichModal(false)}
        />
      )}
    </div>
  );
}
