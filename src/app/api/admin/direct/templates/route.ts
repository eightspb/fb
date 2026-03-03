import { NextRequest, NextResponse } from 'next/server';
import { Pool, type PoolClient } from 'pg';
import { checkApiAuth } from '@/lib/auth';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

interface DirectTemplateRow {
  id: string;
  name: string;
  campaign_name_pattern: string;
  ad_group_name: string;
  default_max_bid: string;
  is_active_by_default: boolean;
  campaign_payload: Record<string, unknown>;
  ad_group_payload: Record<string, unknown>;
  minus_keywords: string[];
  created_at: string;
  updated_at: string;
}

interface DirectTemplateKeywordRow {
  template_id: string;
  keyword: string;
  priority: number;
}

interface CreateTemplateBody {
  name?: string;
  campaign_name_pattern?: string;
  ad_group_name?: string;
  default_max_bid?: number;
  is_active_by_default?: boolean;
  campaign_payload?: Record<string, unknown>;
  ad_group_payload?: Record<string, unknown>;
  minus_keywords?: string[];
  keywords?: string[];
}

export async function GET(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const templatesResult = await pool.query<DirectTemplateRow>(
      `SELECT
        id,
        name,
        campaign_name_pattern,
        ad_group_name,
        default_max_bid,
        is_active_by_default,
        campaign_payload,
        ad_group_payload,
        minus_keywords,
        created_at,
        updated_at
      FROM direct_campaign_templates
      ORDER BY created_at DESC`
    );

    const keywordRows = templatesResult.rows.length
      ? await pool.query<DirectTemplateKeywordRow>(
          `SELECT template_id, keyword, priority
           FROM direct_keyword_templates
           WHERE template_id = ANY($1::uuid[])
           ORDER BY priority ASC, created_at ASC`,
          [templatesResult.rows.map((row) => row.id)]
        )
      : { rows: [] as DirectTemplateKeywordRow[] };

    const keywordsByTemplate = new Map<string, string[]>();
    for (const row of keywordRows.rows) {
      const current = keywordsByTemplate.get(row.template_id) ?? [];
      current.push(row.keyword);
      keywordsByTemplate.set(row.template_id, current);
    }

    return NextResponse.json({
      templates: templatesResult.rows.map((row) => ({
        ...row,
        default_max_bid: Number(row.default_max_bid),
        keywords: keywordsByTemplate.get(row.id) ?? [],
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка получения шаблонов', details: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  let dbClient: PoolClient | null = null;
  let inTransaction = false;

  try {
    const body = (await request.json()) as CreateTemplateBody;
    const name = body.name?.trim();
    const campaignNamePattern = body.campaign_name_pattern?.trim();
    const adGroupName = body.ad_group_name?.trim() || 'Основная группа';
    const defaultMaxBid = Number(body.default_max_bid ?? 0);
    const isActiveByDefault = body.is_active_by_default ?? false;
    const campaignPayload = ensureObject(body.campaign_payload);
    const adGroupPayload = ensureObject(body.ad_group_payload);
    const minusKeywords = normalizeList(body.minus_keywords ?? []);
    const keywords = normalizeList(body.keywords ?? []);

    if (!name || !campaignNamePattern) {
      return NextResponse.json(
        { error: 'Поля name и campaign_name_pattern обязательны' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(defaultMaxBid) || defaultMaxBid < 0) {
      return NextResponse.json(
        { error: 'default_max_bid должен быть числом >= 0' },
        { status: 400 }
      );
    }

    dbClient = await pool.connect();
    await dbClient.query('BEGIN');
    inTransaction = true;

    const templateResult = await dbClient.query<DirectTemplateRow>(
      `INSERT INTO direct_campaign_templates (
          name,
          campaign_name_pattern,
          ad_group_name,
          default_max_bid,
          is_active_by_default,
          campaign_payload,
          ad_group_payload,
          minus_keywords
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::text[])
       RETURNING
          id,
          name,
          campaign_name_pattern,
          ad_group_name,
          default_max_bid,
          is_active_by_default,
          campaign_payload,
          ad_group_payload,
          minus_keywords,
          created_at,
          updated_at`,
      [
        name,
        campaignNamePattern,
        adGroupName,
        defaultMaxBid,
        isActiveByDefault,
        JSON.stringify(campaignPayload),
        JSON.stringify(adGroupPayload),
        minusKeywords,
      ]
    );

    if (keywords.length > 0) {
      for (const keyword of keywords) {
        await dbClient.query(
          `INSERT INTO direct_keyword_templates (template_id, keyword, priority)
           VALUES ($1, $2, $3)
           ON CONFLICT (template_id, keyword) DO NOTHING`,
          [templateResult.rows[0].id, keyword, 100]
        );
      }
    }

    await dbClient.query('COMMIT');
    inTransaction = false;

    return NextResponse.json({
      success: true,
      template: {
        ...templateResult.rows[0],
        default_max_bid: Number(templateResult.rows[0].default_max_bid),
        keywords,
      },
    });
  } catch (error) {
    if (dbClient && inTransaction) {
      await dbClient.query('ROLLBACK');
    }

    return NextResponse.json(
      { error: 'Ошибка сохранения шаблона', details: extractErrorMessage(error) },
      { status: 500 }
    );
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
}

function normalizeList(values: string[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length > 0) {
      unique.add(normalized);
    }
  }
  return Array.from(unique);
}

function ensureObject(value: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}
