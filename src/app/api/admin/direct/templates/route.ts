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
  template_id?: string;
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

interface NormalizedTemplateInput {
  name: string;
  campaignNamePattern: string;
  adGroupName: string;
  defaultMaxBid: number;
  isActiveByDefault: boolean;
  campaignPayload: Record<string, unknown>;
  adGroupPayload: Record<string, unknown>;
  minusKeywords: string[];
  keywords: string[];
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
    const input = normalizeTemplateInput(body);

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
        input.name,
        input.campaignNamePattern,
        input.adGroupName,
        input.defaultMaxBid,
        input.isActiveByDefault,
        JSON.stringify(input.campaignPayload),
        JSON.stringify(input.adGroupPayload),
        input.minusKeywords,
      ]
    );

    if (input.keywords.length > 0) {
      for (let index = 0; index < input.keywords.length; index++) {
        await dbClient.query(
          `INSERT INTO direct_keyword_templates (template_id, keyword, priority)
           VALUES ($1, $2, $3)
           ON CONFLICT (template_id, keyword) DO NOTHING`,
          [templateResult.rows[0].id, input.keywords[index], index + 1]
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
        keywords: input.keywords,
      },
    });
  } catch (error) {
    if (dbClient && inTransaction) {
      await dbClient.query('ROLLBACK');
    }

    if (error instanceof InputValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
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

export async function PUT(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  let dbClient: PoolClient | null = null;
  let inTransaction = false;

  try {
    const body = (await request.json()) as CreateTemplateBody;
    const templateId = body.template_id?.trim();
    if (!templateId) {
      return NextResponse.json({ error: 'template_id обязателен' }, { status: 400 });
    }

    const input = normalizeTemplateInput(body);

    dbClient = await pool.connect();
    await dbClient.query('BEGIN');
    inTransaction = true;

    const templateResult = await dbClient.query<DirectTemplateRow>(
      `UPDATE direct_campaign_templates
       SET
         name = $2,
         campaign_name_pattern = $3,
         ad_group_name = $4,
         default_max_bid = $5,
         is_active_by_default = $6,
         campaign_payload = $7::jsonb,
         ad_group_payload = $8::jsonb,
         minus_keywords = $9::text[],
         updated_at = NOW()
       WHERE id = $1
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
        templateId,
        input.name,
        input.campaignNamePattern,
        input.adGroupName,
        input.defaultMaxBid,
        input.isActiveByDefault,
        JSON.stringify(input.campaignPayload),
        JSON.stringify(input.adGroupPayload),
        input.minusKeywords,
      ]
    );

    if (templateResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      inTransaction = false;
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
    }

    await dbClient.query(
      `DELETE FROM direct_keyword_templates WHERE template_id = $1`,
      [templateId]
    );

    for (let index = 0; index < input.keywords.length; index++) {
      await dbClient.query(
        `INSERT INTO direct_keyword_templates (template_id, keyword, priority)
         VALUES ($1, $2, $3)`,
        [templateId, input.keywords[index], index + 1]
      );
    }

    await dbClient.query('COMMIT');
    inTransaction = false;

    return NextResponse.json({
      success: true,
      template: {
        ...templateResult.rows[0],
        default_max_bid: Number(templateResult.rows[0].default_max_bid),
        keywords: input.keywords,
      },
    });
  } catch (error) {
    if (dbClient && inTransaction) {
      await dbClient.query('ROLLBACK');
    }

    if (error instanceof InputValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Ошибка обновления шаблона', details: extractErrorMessage(error) },
      { status: 500 }
    );
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
}

export async function DELETE(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateTemplateBody;
    const templateId = body.template_id?.trim();
    if (!templateId) {
      return NextResponse.json({ error: 'template_id обязателен' }, { status: 400 });
    }

    const result = await pool.query<{ id: string }>(
      `DELETE FROM direct_campaign_templates
       WHERE id = $1
       RETURNING id`,
      [templateId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted_template_id: templateId });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка удаления шаблона', details: extractErrorMessage(error) },
      { status: 500 }
    );
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

function normalizeTemplateInput(body: CreateTemplateBody): NormalizedTemplateInput {
  const name = body.name?.trim();
  const campaignNamePattern = body.campaign_name_pattern?.trim();
  const adGroupName = body.ad_group_name?.trim() || 'Основная группа';
  const defaultMaxBid = Number(body.default_max_bid ?? 0);
  const isActiveByDefault = body.is_active_by_default ?? false;
  const campaignPayload = sanitizeRecord(ensureObject(body.campaign_payload));
  const adGroupPayload = sanitizeRecord(ensureObject(body.ad_group_payload));
  const minusKeywords = normalizeList(body.minus_keywords ?? []);
  const keywords = normalizeList(body.keywords ?? []);

  if (!name || !campaignNamePattern) {
    throw new InputValidationError('Поля name и campaign_name_pattern обязательны');
  }
  if (!Number.isFinite(defaultMaxBid) || defaultMaxBid < 0) {
    throw new InputValidationError('default_max_bid должен быть числом >= 0');
  }

  return {
    name,
    campaignNamePattern,
    adGroupName,
    defaultMaxBid,
    isActiveByDefault,
    campaignPayload,
    adGroupPayload,
    minusKeywords,
    keywords,
  };
}

function sanitizeRecord(value: Record<string, unknown>): Record<string, unknown> {
  const sanitized = sanitizeValue(value);
  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    return {};
  }
  return sanitized as Record<string, unknown>;
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(source)) {
      const sanitizedNested = sanitizeValue(nestedValue);
      if (sanitizedNested !== undefined) {
        result[key] = sanitizedNested;
      }
    }
    return result;
  }

  return value;
}

class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputValidationError';
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}
