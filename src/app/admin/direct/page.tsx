'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Loader2, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface DirectCampaign {
  id: string;
  campaign_id: string;
  name: string;
  max_bid: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DirectLog {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  keyword_id: string | null;
  old_bid: number | null;
  new_bid: number | null;
  status: 'success' | 'error';
  message: string | null;
  created_at: string;
}

interface CampaignFormState {
  campaign_id: string;
  name: string;
  max_bid: string;
  is_active: boolean;
}

const EMPTY_FORM: CampaignFormState = {
  campaign_id: '',
  name: '',
  max_bid: '',
  is_active: true,
};

export default function DirectAdminPage() {
  const [campaigns, setCampaigns] = useState<DirectCampaign[]>([]);
  const [logs, setLogs] = useState<DirectLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<CampaignFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshData();
  }, []);

  const activeCount = useMemo(() => campaigns.filter((campaign) => campaign.is_active).length, [campaigns]);

  async function refreshData(): Promise<void> {
    setIsRefreshing(true);
    setError(null);

    try {
      const [campaignsResponse, logsResponse] = await Promise.all([
        fetch('/api/admin/direct', { credentials: 'include' }),
        fetch('/api/admin/direct/logs', { credentials: 'include' }),
      ]);

      if (!campaignsResponse.ok) {
        throw new Error('Не удалось загрузить кампании');
      }

      if (!logsResponse.ok) {
        throw new Error('Не удалось загрузить логи');
      }

      const campaignsData = (await campaignsResponse.json()) as { campaigns: DirectCampaign[] };
      const logsData = (await logsResponse.json()) as { logs: DirectLog[] };

      setCampaigns(campaignsData.campaigns ?? []);
      setLogs(logsData.logs ?? []);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Ошибка загрузки данных';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function saveCampaign(payload: CampaignFormState): Promise<boolean> {
    setIsSaving(true);
    setError(null);

    try {
      const maxBidNumber = Number(payload.max_bid);
      if (!Number.isFinite(maxBidNumber) || maxBidNumber < 0) {
        throw new Error('Макс. ставка должна быть числом >= 0');
      }

      const response = await fetch('/api/admin/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          campaign_id: payload.campaign_id.trim(),
          name: payload.name.trim(),
          max_bid: maxBidNumber,
          is_active: payload.is_active,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Ошибка сохранения кампании');
      }

      await refreshData();
      return true;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Ошибка сохранения кампании';
      setError(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateCampaign(): Promise<void> {
    if (!formState.campaign_id.trim() || !formState.name.trim()) {
      setError('Заполните campaign_id и название кампании');
      return;
    }

    const ok = await saveCampaign(formState);
    if (ok) {
      setFormState(EMPTY_FORM);
      setIsDialogOpen(false);
    }
  }

  async function handleToggleCampaign(campaign: DirectCampaign): Promise<void> {
    await saveCampaign({
      campaign_id: campaign.campaign_id,
      name: campaign.name,
      max_bid: String(campaign.max_bid),
      is_active: !campaign.is_active,
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Автоброкер Яндекс.Директ</h1>
          <p className="mt-1 text-slate-600">Управление кампаниями и контроль изменений ставок по ключам</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refreshData()} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Добавить кампанию
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новая кампания</DialogTitle>
                <DialogDescription>Добавьте кампанию Яндекс.Директ и лимит максимальной ставки.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign_id">Campaign ID</Label>
                  <Input
                    id="campaign_id"
                    value={formState.campaign_id}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, campaign_id: event.target.value }))
                    }
                    placeholder="Например: 123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign_name">Название кампании</Label>
                  <Input
                    id="campaign_name"
                    value={formState.name}
                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Encor Enspire - brand"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_bid">Макс. ставка, руб.</Label>
                  <Input
                    id="max_bid"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.max_bid}
                    onChange={(event) => setFormState((prev) => ({ ...prev, max_bid: event.target.value }))}
                    placeholder="80.00"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="campaign_active"
                    checked={formState.is_active}
                    onChange={(event) => setFormState((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                  <Label htmlFor="campaign_active">Включить сразу после сохранения</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={() => void handleCreateCampaign()} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Кампании ({campaigns.length})
          </CardTitle>
          <CardDescription>
            Активных кампаний: <strong>{activeCount}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
              Кампании еще не добавлены
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Название</th>
                    <th className="px-3 py-2 font-medium">Campaign ID</th>
                    <th className="px-3 py-2 font-medium">Макс. ставка</th>
                    <th className="px-3 py-2 font-medium">Статус</th>
                    <th className="px-3 py-2 font-medium">Вкл/Выкл</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 text-slate-900">{campaign.name}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-700">{campaign.campaign_id}</td>
                      <td className="px-3 py-3 text-slate-900">{campaign.max_bid.toFixed(2)} руб.</td>
                      <td className="px-3 py-3">
                        <Badge className={campaign.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                          {campaign.is_active ? 'Активна' : 'Выключена'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={campaign.is_active}
                          onChange={() => void handleToggleCampaign(campaign)}
                          aria-label={`Переключить кампанию ${campaign.name}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Логи автоброкера</CardTitle>
          <CardDescription>Последние 50 событий изменения ставок</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
              Логи пока отсутствуют
            </div>
          ) : (
            <div className="max-h-[420px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 border-b border-slate-200 bg-white text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Время</th>
                    <th className="px-3 py-2 font-medium">Ключ</th>
                    <th className="px-3 py-2 font-medium">Изменение ставки</th>
                    <th className="px-3 py-2 font-medium">Статус</th>
                    <th className="px-3 py-2 font-medium">Сообщение</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 align-top">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatDate(log.created_at)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{log.keyword_id ?? '-'}</td>
                      <td className="px-3 py-2 text-slate-800">
                        {formatBid(log.old_bid)} {'->'} {formatBid(log.new_bid)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{log.message ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatBid(value: number | null): string {
  if (value === null) {
    return '-';
  }
  return `${value.toFixed(2)} руб.`;
}
