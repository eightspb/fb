'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Loader2, Target, WandSparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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

interface DirectTemplate {
  id: string;
  name: string;
  campaign_name_pattern: string;
  ad_group_name: string;
  default_max_bid: number;
  is_active_by_default: boolean;
  campaign_payload: Record<string, unknown>;
  ad_group_payload: Record<string, unknown>;
  minus_keywords: string[];
  keywords: string[];
}

interface TemplateFormState {
  name: string;
  campaign_name_pattern: string;
  ad_group_name: string;
  default_max_bid: string;
  is_active_by_default: boolean;
  keywords_text: string;
  minus_keywords_text: string;
  campaign_payload_text: string;
  ad_group_payload_text: string;
}

const EMPTY_FORM: CampaignFormState = {
  campaign_id: '',
  name: '',
  max_bid: '',
  is_active: true,
};

const EMPTY_TEMPLATE_FORM: TemplateFormState = {
  name: '',
  campaign_name_pattern: '',
  ad_group_name: 'Основная группа',
  default_max_bid: '0',
  is_active_by_default: false,
  keywords_text: '',
  minus_keywords_text: '',
  campaign_payload_text: '{}',
  ad_group_payload_text: '{}',
};

export default function DirectAdminPage() {
  const [campaigns, setCampaigns] = useState<DirectCampaign[]>([]);
  const [logs, setLogs] = useState<DirectLog[]>([]);
  const [templates, setTemplates] = useState<DirectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [formState, setFormState] = useState<CampaignFormState>(EMPTY_FORM);
  const [templateFormState, setTemplateFormState] = useState<TemplateFormState>(EMPTY_TEMPLATE_FORM);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [provisionCampaignName, setProvisionCampaignName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const activeCount = useMemo(() => campaigns.filter((campaign) => campaign.is_active).length, [campaigns]);

  const refreshData = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    setError(null);

    try {
      const [campaignsResponse, logsResponse, templatesResponse] = await Promise.all([
        fetch('/api/admin/direct', { credentials: 'include' }),
        fetch('/api/admin/direct/logs', { credentials: 'include' }),
        fetch('/api/admin/direct/templates', { credentials: 'include' }),
      ]);

      if (!campaignsResponse.ok) {
        throw new Error('Не удалось загрузить кампании');
      }

      if (!logsResponse.ok) {
        throw new Error('Не удалось загрузить логи');
      }

      if (!templatesResponse.ok) {
        throw new Error('Не удалось загрузить шаблоны');
      }

      const campaignsData = (await campaignsResponse.json()) as { campaigns: DirectCampaign[] };
      const logsData = (await logsResponse.json()) as { logs: DirectLog[] };
      const templatesData = (await templatesResponse.json()) as { templates: DirectTemplate[] };

      setCampaigns(campaignsData.campaigns ?? []);
      setLogs(logsData.logs ?? []);
      const nextTemplates = templatesData.templates ?? [];
      setTemplates(nextTemplates);
      setSelectedTemplateId((prev) => prev || nextTemplates[0]?.id || '');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Ошибка загрузки данных';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

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

  async function handleSyncCampaigns(): Promise<void> {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/direct/sync', {
        method: 'POST',
        credentials: 'include',
      });

      const data = (await response.json()) as { error?: string; details?: string };
      if (!response.ok) {
        throw new Error(data.details ?? data.error ?? 'Ошибка синхронизации с Яндексом');
      }

      await refreshData();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Ошибка синхронизации с Яндексом';
      setError(message);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleCreateTemplate(): Promise<void> {
    setIsTemplateSaving(true);
    setError(null);

    try {
      const payload = {
        name: templateFormState.name.trim(),
        campaign_name_pattern: templateFormState.campaign_name_pattern.trim(),
        ad_group_name: templateFormState.ad_group_name.trim() || 'Основная группа',
        default_max_bid: Number(templateFormState.default_max_bid),
        is_active_by_default: templateFormState.is_active_by_default,
        keywords: splitTextareaLines(templateFormState.keywords_text),
        minus_keywords: splitTextareaLines(templateFormState.minus_keywords_text),
        campaign_payload: parseJsonField(templateFormState.campaign_payload_text, 'campaign_payload'),
        ad_group_payload: parseJsonField(templateFormState.ad_group_payload_text, 'ad_group_payload'),
      };

      const response = await fetch('/api/admin/direct/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; details?: string; template?: DirectTemplate };
      if (!response.ok) {
        throw new Error(data.details ?? data.error ?? 'Ошибка сохранения шаблона');
      }

      if (data.template?.id) {
        setSelectedTemplateId(data.template.id);
      }

      await refreshData();
      setTemplateFormState(EMPTY_TEMPLATE_FORM);
      setIsTemplateDialogOpen(false);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Ошибка сохранения шаблона';
      setError(message);
    } finally {
      setIsTemplateSaving(false);
    }
  }

  async function handleProvisionFromTemplate(): Promise<void> {
    if (!selectedTemplateId) {
      setError('Выберите шаблон для создания кампании');
      return;
    }

    setIsProvisioning(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/direct/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          template_id: selectedTemplateId,
          campaign_name: provisionCampaignName.trim() || undefined,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        details?: string;
        failed_keywords?: number;
        keyword_errors?: Array<{ keyword: string; error: string }>;
      };

      if (!response.ok) {
        throw new Error(data.details ?? data.error ?? 'Ошибка создания кампании');
      }

      if ((data.failed_keywords ?? 0) > 0) {
        const firstError = data.keyword_errors?.[0];
        setError(
          `Кампания создана, но ${data.failed_keywords} ключ(ей) не добавлены${
            firstError ? ` (пример: ${firstError.keyword} - ${firstError.error})` : ''
          }`
        );
      }

      setProvisionCampaignName('');
      await refreshData();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Ошибка создания кампании';
      setError(message);
    } finally {
      setIsProvisioning(false);
    }
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
          <Button variant="outline" onClick={() => void handleSyncCampaigns()} disabled={isSyncing || isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Синхронизировать с Яндексом
          </Button>

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
            <WandSparkles className="h-5 w-5" />
            Создание по шаблону
          </CardTitle>
          <CardDescription>
            Шаблоны хранят кампанию, группу, минус-слова и ключи. Дата в названии: {'{date}'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="template_id">Шаблон</Label>
              <select
                id="template_id"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
              >
                {templates.length === 0 ? <option value="">Нет шаблонов</option> : null}
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.keywords.length} ключей)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Новый шаблон
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Новый шаблон</DialogTitle>
                    <DialogDescription>
                      `campaign_payload` и `ad_group_payload` передаются в API Яндекса как есть.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="template_name">Название шаблона</Label>
                      <Input
                        id="template_name"
                        value={templateFormState.name}
                        onChange={(event) => setTemplateFormState((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="B2B Конкуренты"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template_campaign_pattern">Шаблон названия кампании</Label>
                      <Input
                        id="template_campaign_pattern"
                        value={templateFormState.campaign_name_pattern}
                        onChange={(event) =>
                          setTemplateFormState((prev) => ({ ...prev, campaign_name_pattern: event.target.value }))
                        }
                        placeholder="B2B Конкуренты {date}"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="template_ad_group_name">Название группы</Label>
                        <Input
                          id="template_ad_group_name"
                          value={templateFormState.ad_group_name}
                          onChange={(event) =>
                            setTemplateFormState((prev) => ({ ...prev, ad_group_name: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template_default_bid">Макс. ставка по умолчанию</Label>
                        <Input
                          id="template_default_bid"
                          type="number"
                          min="0"
                          step="0.01"
                          value={templateFormState.default_max_bid}
                          onChange={(event) =>
                            setTemplateFormState((prev) => ({ ...prev, default_max_bid: event.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="template_active_default"
                        checked={templateFormState.is_active_by_default}
                        onChange={(event) =>
                          setTemplateFormState((prev) => ({ ...prev, is_active_by_default: event.target.checked }))
                        }
                      />
                      <Label htmlFor="template_active_default">Сразу активировать кампанию в автоброкере</Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template_keywords">Ключи (по одному в строке)</Label>
                      <Textarea
                        id="template_keywords"
                        value={templateFormState.keywords_text}
                        onChange={(event) =>
                          setTemplateFormState((prev) => ({ ...prev, keywords_text: event.target.value }))
                        }
                        placeholder={'encor enspire\nencor ultra'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template_minus_keywords">Минус-слова (по одному в строке)</Label>
                      <Textarea
                        id="template_minus_keywords"
                        value={templateFormState.minus_keywords_text}
                        onChange={(event) =>
                          setTemplateFormState((prev) => ({ ...prev, minus_keywords_text: event.target.value }))
                        }
                        placeholder={'бесплатно\nотзывы'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template_campaign_payload">campaign_payload (JSON)</Label>
                      <Textarea
                        id="template_campaign_payload"
                        value={templateFormState.campaign_payload_text}
                        onChange={(event) =>
                          setTemplateFormState((prev) => ({ ...prev, campaign_payload_text: event.target.value }))
                        }
                        className="font-mono text-xs"
                        placeholder='{"StartDate":"2026-03-03","TextCampaign":{"BiddingStrategy":{"Search":{"BiddingStrategyType":"HIGHEST_POSITION"}}}}'
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template_ad_group_payload">ad_group_payload (JSON)</Label>
                      <Textarea
                        id="template_ad_group_payload"
                        value={templateFormState.ad_group_payload_text}
                        onChange={(event) =>
                          setTemplateFormState((prev) => ({ ...prev, ad_group_payload_text: event.target.value }))
                        }
                        className="font-mono text-xs"
                        placeholder='{"RegionIds":[225]}'
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={() => void handleCreateTemplate()} disabled={isTemplateSaving}>
                      {isTemplateSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Сохранить шаблон
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="provision_campaign_name">Название кампании (опционально)</Label>
              <Input
                id="provision_campaign_name"
                value={provisionCampaignName}
                onChange={(event) => setProvisionCampaignName(event.target.value)}
                placeholder="Если пусто, будет сгенерировано из шаблона"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => void handleProvisionFromTemplate()} disabled={isProvisioning || templates.length === 0}>
                {isProvisioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                Создать кампанию
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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

function splitTextareaLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseJsonField(value: string, fieldName: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Поле ${fieldName} должно быть JSON-объектом`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Невалидный JSON в ${fieldName}: ${error.message}`);
    }
    throw new Error(`Невалидный JSON в ${fieldName}`);
  }
}
