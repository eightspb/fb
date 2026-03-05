'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LeadInfoPanel } from './LeadInfoPanel';

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

// Цвета приоритета: высокий/срочный — красный, низкий — зелёный
const priorityOptions = [
  { value: 'low', label: 'Низкий', color: 'bg-green-100 text-green-700' },
  { value: 'normal', label: 'Обычный', color: 'bg-slate-100 text-slate-600' },
  { value: 'high', label: 'Высокий', color: 'bg-red-100 text-red-700' },
  { value: 'urgent', label: 'Срочный', color: 'bg-red-200 text-red-800 font-semibold' }
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function RequestDetailsModal({
  request,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}: RequestDetailsModalProps) {
  const router = useRouter();

  if (!request) return null;

  const currentStatus = statusOptions.find(s => s.value === request.status) || statusOptions[0];
  const currentPriority = priorityOptions.find(p => p.value === (request.priority || 'normal')) || priorityOptions[1];
  const showPriority = request.priority && request.priority !== 'normal';

  const handleOpenFull = () => {
    onClose();
    router.push(`/requests/${request.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          {/* Строка 1: имя + кнопка "Открыть полностью" */}
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2 min-w-0">
              <User className="w-5 h-5 shrink-0" />
              <span className="truncate">{request.name}</span>
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleOpenFull} className="shrink-0">
              <ExternalLink className="w-4 h-4 mr-1" />
              Открыть полностью
            </Button>
          </div>

          {/* Строка 2: тип · дата · источник · статус · приоритет — всё в одну строку */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            <Badge variant="outline" className="text-xs font-normal">
              {formTypeLabels[request.form_type] || request.form_type}
            </Badge>
            <span className="text-xs text-slate-400">{formatDate(request.created_at)}</span>
            {request.page_url && (
              <>
                <span className="text-xs text-slate-300">·</span>
                <a
                  href={request.page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline truncate max-w-[160px]"
                >
                  {request.page_url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                </a>
              </>
            )}
            <span className="text-xs text-slate-300">·</span>
            <Badge className={`text-xs px-1.5 py-0 ${currentStatus.color}`}>
              {currentStatus.label}
            </Badge>
            {showPriority && (
              <Badge className={`text-xs px-1.5 py-0 ${currentPriority.color}`}>
                {currentPriority.label}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="py-3">
          <LeadInfoPanel
            request={request}
            onUpdate={onUpdate}
            onDelete={(id) => { onDelete(id); onClose(); }}
            compact
          />
        </div>

        {/* Нижние кнопки */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button variant="outline" onClick={handleOpenFull}>
            <ExternalLink className="w-4 h-4 mr-1" />
            Открыть полностью
          </Button>
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
