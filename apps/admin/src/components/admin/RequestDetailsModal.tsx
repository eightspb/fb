'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, User, Inbox, Clock, CheckCircle2, Archive, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LeadInfoPanel } from './LeadInfoPanel';
import { EmailThread } from './EmailThread';

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
  detailHref: string;
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
  archived: { label: 'В архиве', pill: 'bg-[var(--frox-gray-200)] text-[var(--frox-gray-500)] border-[var(--frox-neutral-border)]', dot: 'bg-[var(--frox-gray-400)]', icon: Archive },
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
  detailHref,
}: RequestDetailsModalProps) {
  const router = useRouter();

  if (!request) return null;

  const sc = statusConfig[request.status] || statusConfig['new'];
  const priorityUrgent = request.priority === 'urgent';
  const priorityHigh = request.priority === 'high';

  const handleOpenFull = () => {
    onClose();
    router.push(detailHref);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl max-h-[92dvh] overflow-hidden p-0 gap-0 rounded-2xl border-[var(--frox-neutral-border)] shadow-xl flex flex-col">
        {/* ── Шапка модалки ── */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-[var(--frox-neutral-border)] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-[var(--frox-gray-1100)] flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[var(--frox-gray-200)] flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-[var(--frox-gray-500)]" />
                </div>
                <span className="truncate">{request.name}</span>
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${formTypeBadgeStyle[request.form_type] || 'bg-[var(--frox-gray-100)] text-[var(--frox-gray-600)] border-[var(--frox-neutral-border)]'}`}>
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
                <span className="text-xs text-[var(--frox-gray-400)]">{formatDate(request.created_at)}</span>
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
          </div>
        </DialogHeader>

        {/* ── Контент ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
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

            <TabsContent value="info" className="mt-4">
              <LeadInfoPanel
                request={request}
                onUpdate={onUpdate}
                onDelete={(id) => { onDelete(id); onClose(); }}
                compact
              />
            </TabsContent>

            <TabsContent value="emails" className="mt-4">
              <div className="bg-white border border-[var(--frox-neutral-border)] rounded-2xl pt-4 sm:pt-6 px-4 sm:px-6 pb-2 shadow-sm overflow-hidden">
                {request.email ? (
                  <EmailThread
                    contactEmail={request.email}
                    contactName={request.name}
                    submissionId={request.id}
                  />
                ) : (
                  <div className="text-center py-12 text-[var(--frox-gray-400)]">
                    <Mail className="w-12 h-12 mx-auto mb-3 stroke-1" />
                    <p className="text-sm">У заявки не указан email</p>
                    <p className="text-xs mt-1">Добавьте email на вкладке «Информация»</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Футер ── */}
        <div className="shrink-0 px-5 py-3 border-t border-[var(--frox-neutral-border)] bg-[var(--frox-gray-50)]">
          <Button
            variant="outline"
            onClick={handleOpenFull}
            className="w-full gap-2 text-sm border-[var(--frox-neutral-border)]"
          >
            <ExternalLink className="w-4 h-4" />
            Открыть полную карточку
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
