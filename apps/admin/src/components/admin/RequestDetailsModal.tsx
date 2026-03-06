'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, User, Inbox, Clock, CheckCircle2, Archive } from 'lucide-react';
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
  contact_id?: string;
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
  'conference_registration': 'Регистрация на конференцию',
};

const formTypeBadgeStyle: Record<string, string> = {
  'contact': 'bg-violet-50 text-violet-700 border-violet-200',
  'cp': 'bg-blue-50 text-blue-700 border-blue-200',
  'training': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'conference_registration': 'bg-amber-50 text-amber-700 border-amber-200',
};

const statusConfig: Record<string, { label: string; pill: string; dot: string; icon: React.ElementType }> = {
  new: { label: 'Новая', pill: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500', icon: Inbox },
  in_progress: { label: 'В работе', pill: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500', icon: Clock },
  processed: { label: 'Обработана', pill: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500', icon: CheckCircle2 },
  archived: { label: 'В архиве', pill: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400', icon: Archive },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function RequestDetailsModal({
  request,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: RequestDetailsModalProps) {
  const router = useRouter();

  if (!request) return null;

  const sc = statusConfig[request.status] || statusConfig['new'];
  const priorityUrgent = request.priority === 'urgent';
  const priorityHigh = request.priority === 'high';

  const handleOpenFull = () => {
    onClose();
    router.push(`/requests/${request.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[92dvh] overflow-hidden p-0 gap-0 rounded-2xl border-slate-200 shadow-xl">
        {/* ── Шапка модалки ── */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span className="truncate">{request.name}</span>
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${formTypeBadgeStyle[request.form_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {formTypeLabels[request.form_type] || request.form_type}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
                {priorityUrgent && (
                  <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-red-50 text-red-700 border-red-200">
                    Срочный
                  </span>
                )}
                {priorityHigh && !priorityUrgent && (
                  <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-orange-50 text-orange-700 border-orange-200">
                    Высокий приоритет
                  </span>
                )}
                <span className="text-xs text-slate-400">{formatDate(request.created_at)}</span>
                {request.contact_id && (
                  <button
                    onClick={() => { onClose(); router.push(`/contacts?contact=${request.contact_id}`); }}
                    className="text-xs text-violet-600 hover:text-violet-800 hover:underline flex items-center gap-1 transition-colors"
                  >
                    <User className="w-3 h-3" />
                    Перейти к контакту
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenFull}
                className="h-8 gap-1.5 text-xs border-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Открыть</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Контент ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <LeadInfoPanel
            request={request}
            onUpdate={onUpdate}
            onDelete={(id) => { onDelete(id); onClose(); }}
            compact
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
