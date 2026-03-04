import { NextRequest, NextResponse } from 'next/server';
import { Pool, type PoolClient } from 'pg';
import { checkApiAuth } from '@/lib/auth';
import { YandexDirectApiClient, YandexDirectApiError } from '@/lib/yandex-direct/api';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

interface ProvisionBody {
  template_id?: string;
  campaign_name?: string;
}

interface TemplateRow {
  id: string;
  name: string;
  campaign_name_pattern: string;
  ad_group_name: string;
  default_max_bid: string;
  is_active_by_default: boolean;
  campaign_payload: Record<string, unknown>;
  ad_group_payload: Record<string, unknown>;
  minus_keywords: string[];
}

interface KeywordRow {
  keyword: string;
}

export async function POST(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  let dbClient: PoolClient | null = null;
  let apiClient: YandexDirectApiClient | null = null;
  let createdCampaignId: string | null = null;
  let inTransaction = false;

  try {
    const body = (await request.json()) as ProvisionBody;
    const templateId = body.template_id?.trim();
    const campaignNameOverride = body.campaign_name?.trim();

    if (!templateId) {
      return NextResponse.json({ error: 'template_id обязателен' }, { status: 400 });
    }

    dbClient = await pool.connect();

    const templateResult = await dbClient.query<TemplateRow>(
      `SELECT
        id,
        name,
        campaign_name_pattern,
        ad_group_name,
        default_max_bid,
        is_active_by_default,
        campaign_payload,
        ad_group_payload,
        minus_keywords
      FROM direct_campaign_templates
      WHERE id = $1`,
      [templateId]
    );

    const template = templateResult.rows[0];
    if (!template) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
    }

    const keywordResult = await dbClient.query<KeywordRow>(
      `SELECT keyword
       FROM direct_keyword_templates
       WHERE template_id = $1
       ORDER BY priority ASC, created_at ASC`,
      [templateId]
    );

    const keywords = keywordResult.rows.map((row) => row.keyword.trim()).filter((keyword) => keyword.length > 0);
    const finalCampaignName = campaignNameOverride || renderCampaignName(template.campaign_name_pattern);

    apiClient = new YandexDirectApiClient();
    const campaignId = await apiClient.createCampaign({
      name: finalCampaignName,
      campaignPayload: ensureObject(template.campaign_payload),
      minusKeywords: template.minus_keywords ?? [],
    });
    createdCampaignId = campaignId;

    const adGroupId = await apiClient.createAdGroup({
      campaignId,
      name: template.ad_group_name,
      adGroupPayload: ensureObject(template.ad_group_payload),
    });

    const keywordResults = keywords.length > 0 ? await apiClient.addKeywords(adGroupId, keywords) : [];
    const successfulKeywords = keywordResults.filter((result) => result.success && result.keywordId);
    const failedKeywords = keywordResults.filter((result) => !result.success);

    await dbClient.query('BEGIN');
    inTransaction = true;

    await dbClient.query(
      `INSERT INTO direct_campaigns (campaign_id, name, max_bid, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (campaign_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         updated_at = NOW()`,
      [campaignId, finalCampaignName, Number(template.default_max_bid), template.is_active_by_default]
    );

    await dbClient.query(
      `INSERT INTO direct_entities_map (template_id, campaign_id, ad_group_id, keyword_id, entity_type)
       VALUES ($1, $2, NULL, NULL, 'campaign')`,
      [template.id, campaignId]
    );

    await dbClient.query(
      `INSERT INTO direct_entities_map (template_id, campaign_id, ad_group_id, keyword_id, entity_type)
       VALUES ($1, $2, $3, NULL, 'ad_group')`,
      [template.id, campaignId, adGroupId]
    );

    for (const keywordResult of successfulKeywords) {
      await dbClient.query(
        `INSERT INTO direct_entities_map (template_id, campaign_id, ad_group_id, keyword_id, entity_type)
         VALUES ($1, $2, $3, $4, 'keyword')`,
        [template.id, campaignId, adGroupId, keywordResult.keywordId]
      );
    }

    await dbClient.query('COMMIT');
    inTransaction = false;

    return NextResponse.json({
      success: true,
      template_id: template.id,
      campaign_id: campaignId,
      ad_group_id: adGroupId,
      created_keywords: successfulKeywords.length,
      failed_keywords: failedKeywords.length,
      keyword_errors: failedKeywords.map((item) => ({
        keyword: item.keyword,
        error: item.errorMessage ?? 'Неизвестная ошибка',
      })),
    });
  } catch (error) {
    if (dbClient && inTransaction) {
      await dbClient.query('ROLLBACK');
    }

    const cleanupNote = await cleanupProvisionedCampaign(apiClient, createdCampaignId);

    if (error instanceof YandexDirectApiError) {
      return NextResponse.json(
        {
          error: 'Ошибка создания кампании в Яндекс.Директ',
          details: withCleanupNote(error.message, cleanupNote),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: 'Ошибка provision-процесса',
        details: withCleanupNote(extractErrorMessage(error), cleanupNote),
      },
      { status: 500 }
    );
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
}

function ensureObject(value: Record<string, unknown> | null): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
}

function renderCampaignName(pattern: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return pattern
    .replaceAll('{date}', `${year}-${month}-${day}`)
    .replaceAll('{year}', String(year))
    .trim();
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}

async function cleanupProvisionedCampaign(
  apiClient: YandexDirectApiClient | null,
  campaignId: string | null
): Promise<string | null> {
  if (!apiClient || !campaignId) {
    return null;
  }

  try {
    await apiClient.deleteCampaign(campaignId);
    return `Cleanup: созданная кампания ${campaignId} удалена в Яндекс.Директ`;
  } catch (deleteError) {
    if (isNotFoundError(deleteError)) {
      return `Cleanup: созданная кампания ${campaignId} уже отсутствует в Яндекс.Директ`;
    }

    try {
      await apiClient.archiveCampaign(campaignId);
      return `Cleanup: созданная кампания ${campaignId} отправлена в архив Яндекс.Директ`;
    } catch (archiveError) {
      return `Cleanup не выполнен: delete (${extractErrorMessage(deleteError)}), archive (${extractErrorMessage(archiveError)})`;
    }
  }
}

function withCleanupNote(details: string, cleanupNote: string | null): string {
  if (!cleanupNote) {
    return details;
  }
  return `${details}. ${cleanupNote}`;
}

function isNotFoundError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  return message.includes('not found') || message.includes('не найден');
}
