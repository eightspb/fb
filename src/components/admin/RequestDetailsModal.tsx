'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  User
} from 'lucide-react';
import { getCsrfToken } from '@/lib/csrf-client';

export interface RequestItem {
  id: string;
  created_at: string;
  updated_at?: string;
  form_type: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  institution?: string;
  city?: string;
  status: string;
  priority?: string;
  page_url?: string;
  metadata?: any;
  notes?: string;
  assigned_to?: string;
}

interface RequestDetailsModalProps {
  request: RequestItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedRequest: RequestItem) => void;
  onDelete: (id: string) => void;
}

const formTypeLabels: Record<string, string> = {
  'contact': 'Контактная форма',
  'cp': 'Запрос КП',
  'training': 'Заявка на обучение',
  'conference_registration': 'Регистрация на конференцию'
};

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

export function RequestDetailsModal({ 
  request, 
  isOpen, 
  onClose, 
  onUpdate,
  onDelete 
}: RequestDetailsModalProps) {
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('new');
  const [priority, setPriority] = useState('normal');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (request) {
      setNotes(request.notes || '');
      setStatus(request.status || 'new');
      setPriority(request.priority || 'normal');
    }
  }, [request]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSave = async () => {
    if (!request) return;
    
    setIsSaving(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/admin/requests/${request.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ status, priority, notes })
      });

      if (response.ok) {
        const updatedRequest = await response.json();
        onUpdate(updatedRequest);
      }
    } catch (error) {
      console.error('Error saving request:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!request) return;
    
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/admin/requests/${request.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'x-csrf-token': csrfToken,
        }
      });

      if (response.ok) {
        onDelete(request.id);
        onClose();
      }
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!request) return null;

  const currentStatusOption = statusOptions.find(s => s.value === status) || statusOptions[0];
  const currentPriorityOption = priorityOptions.find(p => p.value === priority) || priorityOptions[1];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                {request.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {formTypeLabels[request.form_type] || request.form_type}
                </Badge>
                <Badge className={`text-xs ${currentStatusOption.color}`}>
                  {currentStatusOption.label}
                </Badge>
                {priority !== 'normal' && (
                  <Badge className={`text-xs ${currentPriorityOption.color}`}>
                    {currentPriorityOption.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Контактная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Mail className="w-5 h-5 text-slate-500" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">Email</div>
                <a 
                  href={`mailto:${request.email}`} 
                  className="text-sm font-medium text-blue-600 hover:underline truncate block"
                >
                  {request.email}
                </a>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard(request.email, 'email')}
              >
                {copiedField === 'email' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Телефон */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Phone className="w-5 h-5 text-slate-500" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">Телефон</div>
                <a 
                  href={`tel:${request.phone}`} 
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {request.phone}
                </a>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard(request.phone, 'phone')}
              >
                {copiedField === 'phone' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Город */}
            {request.city && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <MapPin className="w-5 h-5 text-slate-500" />
                <div className="flex-1">
                  <div className="text-xs text-slate-500">Город</div>
                  <div className="text-sm font-medium">{request.city}</div>
                </div>
              </div>
            )}

            {/* Учреждение */}
            {request.institution && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Building2 className="w-5 h-5 text-slate-500" />
                <div className="flex-1">
                  <div className="text-xs text-slate-500">Учреждение</div>
                  <div className="text-sm font-medium">{request.institution}</div>
                </div>
              </div>
            )}
          </div>

          {/* Сообщение */}
          {request.message && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-500 uppercase">Сообщение</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{request.message}</p>
            </div>
          )}

          {/* Метаданные конференции */}
          {request.metadata?.conference && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-blue-500 uppercase">Конференция</span>
              </div>
              <p className="text-sm font-medium">{request.metadata.conference}</p>
              {request.metadata.certificate && (
                <p className="text-xs text-blue-600 mt-1">Требуется сертификат</p>
              )}
            </div>
          )}

          {/* Даты */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Создана: {formatDate(request.created_at)}</span>
            </div>
            {request.updated_at && request.updated_at !== request.created_at && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Обновлена: {formatDate(request.updated_at)}</span>
              </div>
            )}
          </div>

          {/* Источник */}
          {request.page_url && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ExternalLink className="w-4 h-4" />
              <span>Источник:</span>
              <a 
                href={request.page_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate max-w-xs"
              >
                {request.page_url}
              </a>
            </div>
          )}

          {/* Управление статусом и приоритетом */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Статус</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Приоритет</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Заметки */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Заметки менеджера
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Добавьте заметки по этой заявке..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>

        {/* Действия */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {!showDeleteConfirm ? (
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Удалить
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">Удалить заявку?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  Да
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Нет
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
