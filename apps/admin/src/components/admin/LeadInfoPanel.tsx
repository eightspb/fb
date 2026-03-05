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
  Copy,
  Check,
  AlertCircle,
  Clock,
  User,
  Pencil,
  X,
} from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import type { RequestItem } from './RequestDetailsModal';

interface LeadInfoPanelProps {
  request: RequestItem;
  onUpdate: (updatedRequest: RequestItem) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

const statusOptions = [
  { value: 'new', label: 'Новая', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress', label: 'В работе', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'processed', label: 'Обработана', color: 'bg-green-100 text-green-800' },
  { value: 'archived', label: 'В архиве', color: 'bg-gray-100 text-gray-800' }
];

const priorityOptions = [
  { value: 'low', label: 'Низкий', color: 'bg-gray-100 text-gray-600' },
  { value: 'normal', label: 'Обычный', color: 'bg-blue-100 text-blue-600' },
  { value: 'high', label: 'Высокий', color: 'bg-orange-100 text-orange-600' },
  { value: 'urgent', label: 'Срочный', color: 'bg-red-100 text-red-600' }
];

// Редактируемое поле — просто текст
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
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
      <div className="text-slate-500 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        {editing ? (
          <div className="flex items-center gap-1 mt-1">
            <Input
              type={type}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="h-7 text-sm py-0"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-green-600" onClick={handleSave} disabled={saving}>
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-slate-400" onClick={() => { setDraft(value); setEditing(false); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group">
            <span className="text-sm font-medium truncate">{value || <span className="text-slate-400 italic text-xs">не указано</span>}</span>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => { setDraft(value); setEditing(true); }}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Редактируемое поле с autocomplete из списка
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
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg" ref={containerRef}>
      <div className="text-slate-500 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        {editing ? (
          <div className="relative mt-1">
            <div className="flex items-center gap-1">
              <Input
                value={draft}
                onChange={e => { setDraft(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                className="h-7 text-sm py-0"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') { setEditing(false); setShowDropdown(false); }
                }}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-green-600" onClick={() => handleSave()} disabled={saving}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-slate-400" onClick={() => { setDraft(value); setEditing(false); setShowDropdown(false); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            {showDropdown && filtered.length > 0 && (
              <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
                {filtered.slice(0, 50).map(opt => (
                  <div
                    key={opt}
                    className="px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-100 truncate"
                    onMouseDown={e => { e.preventDefault(); handleSave(opt); }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 group">
            <span className="text-sm font-medium truncate">{value || <span className="text-slate-400 italic text-xs">не указано</span>}</span>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => { setDraft(value); setEditing(true); setShowDropdown(true); }}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function LeadInfoPanel({ request, onUpdate, onDelete, compact }: LeadInfoPanelProps) {
  const [notes, setNotes] = useState(request.notes || '');
  const [status, setStatus] = useState(request.status || 'new');
  const [priority, setPriority] = useState(request.priority || 'normal');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/admin/requests/options', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setCities(data.cities || []);
          setInstitutions(data.institutions || []);
        }
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {}
  };

  const handleFieldUpdate = async (field: string, value: string) => {
    try {
      const response = await adminCsrfFetch(`/api/admin/requests/${request.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    }
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const response = await adminCsrfFetch(`/api/admin/requests/${request.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await adminCsrfFetch(`/api/admin/requests/${request.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok && onDelete) {
        onDelete(request.id);
      }
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Контактная информация — всегда редактируема */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <EditableField
          label="Имя"
          value={request.name}
          icon={<User className="w-4 h-4" />}
          onSave={val => handleFieldUpdate('name', val)}
        />

        {/* Email с кнопкой копирования */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <Mail className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">Email</div>
            <a href={`mailto:${request.email}`} className="text-sm font-medium text-blue-600 hover:underline truncate block">
              {request.email}
            </a>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(request.email, 'email')}>
            {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Телефон с кнопкой копирования */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <Phone className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">Телефон</div>
            <a href={`tel:${request.phone}`} className="text-sm font-medium text-blue-600 hover:underline">
              {request.phone}
            </a>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(request.phone, 'phone')}>
            {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>

        <EditableSelectField
          label="Город"
          value={request.city || ''}
          options={cities}
          icon={<MapPin className="w-4 h-4" />}
          onSave={val => handleFieldUpdate('city', val)}
        />

        <EditableSelectField
          label="Учреждение"
          value={request.institution || ''}
          options={institutions}
          icon={<Building2 className="w-4 h-4" />}
          onSave={val => handleFieldUpdate('institution', val)}
        />
      </div>

      {/* Сообщение */}
      {request.message && (
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-500 uppercase">Сообщение</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{request.message}</p>
        </div>
      )}

      {/* Метаданные конференции */}
      {request.metadata?.conference && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-medium text-blue-500 uppercase">Конференция</span>
          </div>
          <p className="text-sm font-medium">{request.metadata.conference}</p>
          {request.metadata.certificate && (
            <p className="text-xs text-blue-600 mt-1">Требуется сертификат</p>
          )}
        </div>
      )}

      {/* Даты и источник */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>Создана: {formatDate(request.created_at)}</span>
        </div>
        {request.updated_at && request.updated_at !== request.created_at && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Обновлена: {formatDate(request.updated_at)}</span>
          </div>
        )}
        {request.page_url && (
          <div className="flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" />
            <a href={request.page_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[200px]">
              {request.page_url}
            </a>
          </div>
        )}
      </div>

      {/* Статус и приоритет */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Статус</label>
          <select
            value={status}
            onChange={(e) => {
              const newStatus = e.target.value;
              setStatus(newStatus);
              handleFieldUpdate('status', newStatus);
            }}
            className="w-full h-9 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Приоритет</label>
          <select
            value={priority}
            onChange={(e) => {
              const newPriority = e.target.value;
              setPriority(newPriority);
              handleFieldUpdate('priority', newPriority);
            }}
            className="w-full h-9 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Заметки */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          <FileText className="w-3.5 h-3.5 inline mr-1" />
          Заметки менеджера
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Добавьте заметки по этой заявке..."
          className="min-h-[80px] resize-none text-sm"
        />
        <Button onClick={handleSaveNotes} disabled={isSaving} size="sm" className="mt-2">
          {isSaving ? 'Сохранение...' : 'Сохранить заметки'}
        </Button>
      </div>

      {/* Удаление */}
      {onDelete && (
        <div className="pt-3 border-t">
          {!showDeleteConfirm ? (
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
              Удалить заявку
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600">Удалить заявку?</span>
              <Button variant="destructive" size="sm" onClick={handleDelete}>Да</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Нет</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
