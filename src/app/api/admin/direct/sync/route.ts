import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';
import { YandexDirectApiClient, YandexDirectApiError } from '@/lib/yandex-direct/api';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

interface SyncResultRow {
  campaign_id: string;
  inserted: boolean;
}

export async function POST(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const apiClient = new YandexDirectApiClient();
    const campaigns = await apiClient.getCampaigns();

    if (campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        inserted: 0,
        updated: 0,
      });
    }

    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');

      const syncStats: SyncResultRow[] = [];
      for (const campaign of campaigns) {
        const result = await dbClient.query<SyncResultRow>(
          `INSERT INTO direct_campaigns (campaign_id, name, max_bid, is_active)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (campaign_id)
           DO UPDATE SET
             name = EXCLUDED.name,
             updated_at = NOW()
           RETURNING campaign_id, (xmax = 0) AS inserted`,
          [campaign.id, campaign.name, 0, false]
        );
        syncStats.push(result.rows[0]);
      }

      await dbClient.query('COMMIT');

      const inserted = syncStats.filter((row) => row.inserted).length;
      const updated = syncStats.length - inserted;

      return NextResponse.json({
        success: true,
        synced: syncStats.length,
        inserted,
        updated,
      });
    } catch (error) {
      await dbClient.query('ROLLBACK');
      throw error;
    } finally {
      dbClient.release();
    }
  } catch (error) {
    if (error instanceof YandexDirectApiError) {
      return NextResponse.json(
        { error: 'Ошибка синхронизации с Яндекс.Директ', details: error.message },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'Ошибка синхронизации кампаний', details: extractErrorMessage(error) },
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

