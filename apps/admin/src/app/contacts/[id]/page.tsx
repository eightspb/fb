'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailThread } from '@/components/admin/EmailThread';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  Stethoscope,
  Tag,
  Plus,
  X,
  Trash2,
  AlertCircle,
  Loader2,
  Check,
  Pencil,
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

function EditableTextarea({ value, onSave, placeholder = '—' }: {
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
      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="w-full h-24 text-sm px-3 py-2 border border-[var(--frox-neutral-border)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">Сохранить</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs">Отмена</Button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left text-sm text-[var(--frox-gray-800)] hover:text-[var(--frox-gray-1100)] group flex items-start gap-1.5"
    >
      <span className={`flex-1 ${value ? '' : 'text-[var(--frox-gray-300)] italic'}`}>{value || placeholder}</span>
      <Pencil className="w-3 h-3 text-[var(--frox-gray-300)] group-hover:text-[var(--frox-gray-500)] transition-colors shrink-0 mt-0.5" />
    </button>
  );
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    async function fetchContact() {
      try {
        const response = await fetch(`/api/admin/contacts/${id}`, { credentials: 'include' });
        if (!response.ok) {
          if (response.status === 404) setError('Контакт не найден');
          else if (response.status === 401) setError('Требуется авторизация');
          else setError('Ошибка загрузки');
          return;
        }
        setContact(await response.json());
      } catch {
        setError('Ошибка подключения');
      } finally {
        setLoading(false);
      }
    }
    fetchContact();
  }, [id]);

  const patchField = async (fields: Partial<Contact>) => {
    const res = await adminCsrfFetch(`/api/admin/contacts/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (res.ok) setContact(await res.json());
  };

  const addTag = async () => {
    if (!contact) return;
    const tag = tagInput.trim();
    if (!tag || contact.tags.includes(tag)) { setTagInput(''); return; }
    await patchField({ tags: [...contact.tags, tag] });
    setTagInput('');
  };

  const removeTag = async (tag: string) => {
    if (!contact) return;
    await patchField({ tags: contact.tags.filter(t => t !== tag) });
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
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${sc.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
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

            {/* Контактные данные */}
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

            {/* Место работы */}
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
              <div className="flex gap-2 max-w-sm">
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
          <div className="bg-white border border-[var(--frox-neutral-border)] rounded-2xl p-4 sm:p-6 shadow-sm">
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
