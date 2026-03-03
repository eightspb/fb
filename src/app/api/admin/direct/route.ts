import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';

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

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}
