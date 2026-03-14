'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Mail, Loader2, Inbox, Clock, CheckCircle2, Archive, AlertCircle } from 'lucide-react';
import { LeadInfoPanel } from '@/components/admin/LeadInfoPanel';
import { EmailThread } from '@/components/admin/EmailThread';
import type { RequestItem } from '@/components/admin/RequestDetailsModal';

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
  new: { label: 'Новая', pill: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: Inbox },
  in_progress: { label: 'В работе', pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Clock },
  processed: { label: 'Обработана', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle2 },
  archived: { label: 'В архиве', pill: 'bg-[var(--frox-gray-200)] text-[var(--frox-gray-500)] border-[var(--frox-neutral-border)]', dot: 'bg-[var(--frox-gray-400)]', icon: Archive },
};

async function requestFetcher(url: string): Promise<RequestItem> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Заявка не найдена');
    if (res.status === 401) throw new Error('Требуется авторизация');
    throw new Error('Ошибка загрузки');
  }
  return res.json();
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const returnToParam = searchParams.get('returnTo');
  const backHref = returnToParam && (
    returnToParam.startsWith('/requests') ||
    returnToParam.startsWith('/admin/requests')
  ) ? returnToParam : '/requests';

  const { data: request, error, isLoading: loading, mutate } = useSWR<RequestItem>(
    `/api/admin/requests/${id}`,
    requestFetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--frox-gray-300)]" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-[var(--frox-gray-600)] mb-6">{error?.message || 'Заявка не найдена'}</p>
        <Button variant="outline" onClick={() => router.push(backHref)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к заявкам
        </Button>
      </div>
    );
  }

  const sc = statusConfig[request.status] || statusConfig['new'];
  const StatusIcon = sc.icon;

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
            Заявки
          </Button>
          <span className="text-[var(--frox-gray-300)]">/</span>
          <span className="font-semibold text-[var(--frox-gray-1100)] truncate text-lg">{request.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${formTypeBadgeStyle[request.form_type] || 'bg-[var(--frox-gray-100)] text-[var(--frox-gray-600)] border-[var(--frox-neutral-border)]'}`}>
            {formTypeLabels[request.form_type] || request.form_type}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${sc.pill}`}>
            <StatusIcon className="w-3.5 h-3.5" />
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

        <TabsContent value="info" className="mt-4">
          <div className="bg-white border border-[var(--frox-neutral-border)] rounded-2xl p-5 sm:p-6 shadow-sm">
            <LeadInfoPanel
              request={request}
              onUpdate={(updated) => mutate(updated, false)}
              onDelete={() => router.push(backHref)}
            />
          </div>
        </TabsContent>

        <TabsContent value="emails" className="mt-4">
          <div className="bg-white border border-[var(--frox-neutral-border)] rounded-2xl pt-4 sm:pt-6 px-4 sm:px-6 pb-2 shadow-sm overflow-hidden">
            <EmailThread
              contactEmail={request.email}
              contactName={request.name}
              submissionId={request.id}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
