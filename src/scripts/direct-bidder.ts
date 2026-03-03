import { Pool, type PoolClient } from 'pg';
import { YandexDirectApiClient, YandexDirectApiError } from '../lib/yandex-direct/api';

interface DirectCampaignRow {
  campaign_id: string;
  name: string;
  max_bid: string;
  is_active: boolean;
}

interface DirectLogInput {
  campaignId: string;
  keywordId: string | null;
  oldBid: number | null;
  newBid: number | null;
  status: 'success' | 'error';
  message: string;
}

const BID_STEP_RUB = 0.5;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

async function runDirectBidder(): Promise<void> {
  const apiClient = new YandexDirectApiClient();
  const dbClient = await pool.connect();

  try {
    const campaignsResult = await dbClient.query<DirectCampaignRow>(
      `SELECT campaign_id, name, max_bid, is_active
       FROM direct_campaigns
       WHERE is_active = true
       ORDER BY created_at ASC`
    );

    for (const campaign of campaignsResult.rows) {
      const maxBid = Number(campaign.max_bid);

      try {
        const bids = await apiClient.getBids(campaign.campaign_id);

        for (const bid of bids) {
          if (bid.currentSearchPriceRub === null) {
            await insertLog(dbClient, {
              campaignId: campaign.campaign_id,
              keywordId: bid.keywordId,
              oldBid: bid.currentBidRub,
              newBid: bid.currentBidRub,
              status: 'success',
              message: 'CurrentSearchPrice не получен, пропуск обновления',
            });
            continue;
          }

          const targetBid = calculateTargetBid({
            currentBidRub: bid.currentBidRub,
            currentSearchPriceRub: bid.currentSearchPriceRub,
            maxBidRub: maxBid,
          });

          if (targetBid === null) {
            await insertLog(dbClient, {
              campaignId: campaign.campaign_id,
              keywordId: bid.keywordId,
              oldBid: bid.currentBidRub,
              newBid: bid.currentBidRub,
              status: 'success',
              message: 'Изменение ставки не требуется',
            });
            continue;
          }

          const setResults = await apiClient.setBids([
            {
              keywordId: bid.keywordId,
              bidRub: targetBid,
            },
          ]);

          const setResult = setResults[0];
          if (!setResult?.success) {
            await insertLog(dbClient, {
              campaignId: campaign.campaign_id,
              keywordId: bid.keywordId,
              oldBid: bid.currentBidRub,
              newBid: targetBid,
              status: 'error',
              message: setResult?.errorMessage ?? 'Не удалось обновить ставку',
            });
            continue;
          }

          await insertLog(dbClient, {
            campaignId: campaign.campaign_id,
            keywordId: bid.keywordId,
            oldBid: bid.currentBidRub,
            newBid: targetBid,
            status: 'success',
            message: `Ставка обновлена для кампании "${campaign.name}"`,
          });
        }
      } catch (error) {
        const message = formatErrorMessage(error);
        await insertLog(dbClient, {
          campaignId: campaign.campaign_id,
          keywordId: null,
          oldBid: null,
          newBid: null,
          status: 'error',
          message: `Ошибка обработки кампании "${campaign.name}": ${message}`,
        });
      }
    }
  } finally {
    dbClient.release();
    await pool.end();
  }
}

function calculateTargetBid(params: {
  currentBidRub: number;
  currentSearchPriceRub: number;
  maxBidRub: number;
}): number | null {
  const { currentBidRub, currentSearchPriceRub, maxBidRub } = params;

  if (currentSearchPriceRub <= currentBidRub) {
    return null;
  }

  let targetBid = currentSearchPriceRub + BID_STEP_RUB;
  if (currentSearchPriceRub > maxBidRub) {
    targetBid = maxBidRub;
  } else {
    targetBid = Math.min(targetBid, maxBidRub);
  }

  if (targetBid <= currentBidRub) {
    return null;
  }

  return roundRub(targetBid);
}

async function insertLog(client: PoolClient, log: DirectLogInput): Promise<void> {
  await client.query(
    `INSERT INTO direct_logs (campaign_id, keyword_id, old_bid, new_bid, status, message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [log.campaignId, log.keywordId, log.oldBid, log.newBid, log.status, log.message]
  );
}

function roundRub(value: number): number {
  return Number(value.toFixed(2));
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof YandexDirectApiError) {
    if (error.isAuthError) {
      return `Ошибка авторизации Yandex Direct (${error.message})`;
    }
    if (error.isPointsLimitError) {
      return `Исчерпан лимит баллов API (${error.message})`;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}

runDirectBidder()
  .then(() => {
    console.log('[Direct Bidder] Завершено успешно');
  })
  .catch((error) => {
    console.error('[Direct Bidder] Ошибка выполнения:', error);
    process.exitCode = 1;
  });
