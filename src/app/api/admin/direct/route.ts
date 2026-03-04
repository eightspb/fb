import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';
import { YandexDirectApiClient, YandexDirectApiError } from '@/lib/yandex-direct/api';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

interface DirectCampaignRow {
  id: string;
  campaign_id: string;
  name: string;
  max_bid: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UpsertCampaignBody {
  campaign_id?: string;
  name?: string;
  max_bid?: number;
  is_active?: boolean;
}

interface DeleteCampaignBody {
  campaign_id?: string;
}

export async function GET(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const result = await pool.query<DirectCampaignRow>(
      `SELECT id, campaign_id, name, max_bid, is_active, created_at, updated_at
       FROM direct_campaigns
       ORDER BY created_at DESC`
    );

    return NextResponse.json({
      campaigns: result.rows.map((row) => ({
        ...row,
        max_bid: Number(row.max_bid),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка получения кампаний', details: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as UpsertCampaignBody;
    const campaignId = body.campaign_id?.trim();
    const name = body.name?.trim();
    const maxBid = Number(body.max_bid);
    const isActive = body.is_active ?? true;

    if (!campaignId || !name) {
      return NextResponse.json(
        { error: 'Поля campaign_id и name обязательны' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(maxBid) || maxBid < 0) {
      return NextResponse.json(
        { error: 'Поле max_bid должно быть числом >= 0' },
        { status: 400 }
      );
    }

    const result = await pool.query<DirectCampaignRow>(
      `INSERT INTO direct_campaigns (campaign_id, name, max_bid, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (campaign_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         max_bid = EXCLUDED.max_bid,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING id, campaign_id, name, max_bid, is_active, created_at, updated_at`,
      [campaignId, name, maxBid, isActive]
    );

    return NextResponse.json({
      success: true,
      campaign: {
        ...result.rows[0],
        max_bid: Number(result.rows[0].max_bid),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка сохранения кампании', details: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as DeleteCampaignBody;
    const campaignId = body.campaign_id?.trim();
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Поле campaign_id обязательно' },
        { status: 400 }
      );
    }

    let remoteAction: 'deleted' | 'archived' | 'not_found';
    try {
      const apiClient = new YandexDirectApiClient();
      remoteAction = await deleteCampaignInYandex(apiClient, campaignId);
    } catch (error) {
      if (error instanceof YandexDirectApiError) {
        return NextResponse.json(
          { error: 'Ошибка удаления кампании в Яндекс.Директ', details: error.message },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: 'Ошибка удаления кампании в Яндекс.Директ', details: extractErrorMessage(error) },
        { status: 500 }
      );
    }

    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');

      const entitiesMapCheck = await dbClient.query<{ exists: boolean }>(
        `SELECT to_regclass('public.direct_entities_map') IS NOT NULL AS exists`
      );

      if (entitiesMapCheck.rows[0]?.exists) {
        await dbClient.query(
          `DELETE FROM direct_entities_map
           WHERE campaign_id = $1`,
          [campaignId]
        );
      }

      const result = await dbClient.query<{ campaign_id: string }>(
        `DELETE FROM direct_campaigns
         WHERE campaign_id = $1
         RETURNING campaign_id`,
        [campaignId]
      );

      await dbClient.query('COMMIT');

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Кампания не найдена' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        deleted_campaign_id: result.rows[0].campaign_id,
        yandex_action: remoteAction,
      });
    } catch (error) {
      await dbClient.query('ROLLBACK');
      throw error;
    } finally {
      dbClient.release();
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка удаления кампании', details: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}

async function deleteCampaignInYandex(
  apiClient: YandexDirectApiClient,
  campaignId: string
): Promise<'deleted' | 'archived' | 'not_found'> {
  try {
    await apiClient.deleteCampaign(campaignId);
    return 'deleted';
  } catch (deleteError) {
    if (isNotFoundError(deleteError)) {
      return 'not_found';
    }

    try {
      await apiClient.archiveCampaign(campaignId);
      return 'archived';
    } catch (archiveError) {
      if (isNotFoundError(archiveError)) {
        return 'not_found';
      }

      const deleteMessage = extractErrorMessage(deleteError);
      const archiveMessage = extractErrorMessage(archiveError);
      throw new Error(
        `Удаление в Яндексе не удалось (${deleteMessage}). Архивация тоже не удалась (${archiveMessage}).`
      );
    }
  }
}

function isNotFoundError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  return message.includes('not found') || message.includes('не найден');
}
