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

export function RequestDetailsModal({
  request,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}: RequestDetailsModalProps) {
  const router = useRouter();

  if (!request) return null;

  const currentStatusOption = statusOptions.find(s => s.value === request.status) || statusOptions[0];

  const handleOpenFull = () => {
    onClose();
    router.push(`/requests/${request.id}`);
  };

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
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <LeadInfoPanel
            request={request}
            onUpdate={onUpdate}
            onDelete={(id) => { onDelete(id); onClose(); }}
            compact
          />
        </div>

        {/* Ссылка на полную страницу */}
        <div className="flex items-center justify-between pt-4 border-t">
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
