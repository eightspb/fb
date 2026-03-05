'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Mail, Loader2 } from 'lucide-react';
import { LeadInfoPanel } from '@/components/admin/LeadInfoPanel';
import { EmailThread } from '@/components/admin/EmailThread';
import type { RequestItem } from '@/components/admin/RequestDetailsModal';

const formTypeLabels: Record<string, string> = {
  'contact': 'Контактная форма',
  'cp': 'Запрос КП',
  'training': 'Заявка на обучение',
  'conference_registration': 'Регистрация на конференцию'
};

const statusLabels: Record<string, { label: string; color: string }> = {
  'new': { label: 'Новая', color: 'bg-blue-100 text-blue-800' },
  'in_progress': { label: 'В работе', color: 'bg-yellow-100 text-yellow-800' },
  'processed': { label: 'Обработана', color: 'bg-green-100 text-green-800' },
  'archived': { label: 'В архиве', color: 'bg-gray-100 text-gray-800' },
};

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [request, setRequest] = useState<RequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequest() {
      try {
        const response = await fetch(`/api/admin/requests/${id}`, { credentials: 'include' });
        if (!response.ok) {
          if (response.status === 404) {
            setError('Заявка не найдена');
          } else if (response.status === 401) {
            setError('Требуется авторизация');
          } else {
            setError('Ошибка загрузки');
          }
          return;
        }
        const data = await response.json();
        setRequest(data);
      } catch (err) {
        setError('Ошибка подключения');
      } finally {
        setLoading(false);
      }
    }
    fetchRequest();
  }, [id]);

  const handleUpdate = (updatedRequest: RequestItem) => {
    setRequest(updatedRequest);
  };

  const handleDelete = () => {
    router.push('/requests');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-slate-500 mb-4">{error || 'Заявка не найдена'}</p>
        <Button variant="outline" onClick={() => router.push('/requests')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Назад к заявкам
        </Button>
      </div>
    );
  }

  const statusInfo = statusLabels[request.status] || statusLabels['new'];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Хлебные крошки и заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/requests')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Заявки
          </Button>
          <span className="text-slate-300">/</span>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-slate-500" />
            <span className="font-semibold text-lg">{request.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {formTypeLabels[request.form_type] || request.form_type}
          </Badge>
          <Badge className={`text-xs ${statusInfo.color}`}>
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* Табы */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">
            <User className="w-4 h-4 mr-1" />
            Информация
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="w-4 h-4 mr-1" />
            Переписка
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="bg-white border rounded-lg p-6">
            <LeadInfoPanel
              request={request}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          </div>
        </TabsContent>

        <TabsContent value="emails" className="mt-4">
          <div className="bg-white border rounded-lg p-6">
            <EmailThread
              contactEmail={request.email}
              submissionId={request.id}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
