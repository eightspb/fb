'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

const TEXTAREA_MIN_H = 96;

function EditableTextarea({ value, onSave, placeholder = '—' }: {
  value: string | null;
  onSave: (val: string) => Promise<void>;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [height, setHeight] = useState(TEXTAREA_MIN_H);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const viewRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef({ y: 0, h: 0 });

  useEffect(() => { if (!editing) setDraft(value || ''); }, [value, editing]);

  const startEditing = useCallback(() => {
    // Сохраняем текущую высоту блока просмотра, чтобы не было прыжка
    const viewH = viewRef.current?.getBoundingClientRect().height ?? TEXTAREA_MIN_H;
    setHeight(Math.max(TEXTAREA_MIN_H, viewH));
    setEditing(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(draft); setEditing(false); }
    finally { setSaving(false); }
  };

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = textareaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    startRef.current = { y: e.clientY, h: rect.height };
    const onMove = (ev: MouseEvent) => {
      const dh = ev.clientY - startRef.current.y;
      setHeight(Math.max(TEXTAREA_MIN_H, startRef.current.h + dh));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  if (editing) {
    return (
      <div className="space-y-2">
        <div className="relative inline-block w-full">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-full text-sm px-3 py-2.5 pr-8 pb-6 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 block bg-white shadow-sm transition-colors"
            style={{ minHeight: TEXTAREA_MIN_H, height }}
            autoFocus
          />
          <div
            role="button"
            tabIndex={-1}
            onMouseDown={onResizeStart}
            className="absolute bottom-0 right-0 w-6 h-6 cursor-ns-resize flex items-end justify-end p-1 rounded-bl-lg"
            title="Изменить высоту"
            aria-label="Изменить высоту поля"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-[var(--frox-gray-400)] shrink-0">
              <path d="M4 8h4M8 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">Сохранить</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs">Отмена</Button>
        </div>
      </div>
    );
  }

  return (
    <button
      ref={viewRef}
      onClick={startEditing}
      className="w-full text-left text-sm text-[var(--frox-gray-800)] hover:text-[var(--frox-gray-1100)] group flex items-start gap-1.5 border border-[var(--frox-gray-200)] hover:border-[var(--frox-gray-300)] rounded-lg px-3 py-2.5 bg-[var(--frox-gray-50)] hover:bg-white transition-colors min-h-[96px]"
    >
      <span className={`flex-1 whitespace-pre-wrap ${value ? '' : 'text-[var(--frox-gray-300)] italic'}`}>{value || placeholder}</span>
      <Pencil className="w-3 h-3 text-[var(--frox-gray-300)] group-hover:text-[var(--frox-gray-500)] transition-colors shrink-0 mt-0.5" />
    </button>
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

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: contact, error: swrError, isLoading: loading, mutate } = useSWR<Contact>(
    id ? `/api/admin/contacts/${id}` : null,
    contactFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000, keepPreviousData: true }
  );

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
  const [researchError, setResearchError] = useState<string | null>(null);

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
        mutate(await res.json(), false);
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
            onClick={() => router.push('/contacts')}
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

            {/* Заметки */}
            <div className="rounded-xl border border-[var(--frox-gray-200)] bg-[var(--frox-gray-50)] p-3">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--frox-gray-500)] uppercase tracking-wider">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0"><path d="M2 4h12M2 8h8M2 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Заметки
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResearch}
                  disabled={researching}
                  className="h-7 text-xs gap-1.5"
                >
                  {researching ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Исследую...
                    </>
                  ) : (
                    <>
                      <Search className="w-3 h-3" />
                      AI Исследование
                    </>
                  )}
                </Button>
              </div>
              {researchError && (
                <div className="flex items-center gap-2 p-2.5 mb-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {researchError}
                </div>
              )}
              <EditableTextarea value={contact.notes} onSave={v => patchField({ notes: v || null } as Partial<Contact>)} placeholder="добавить заметку..." />
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
    </div>
  );
}
