const YANDEX_DIRECT_API_URL = 'https://api.direct.yandex.com/json/v5/bids';
const RUB_TO_MICRO = 1_000_000;

interface YandexDirectApiErrorPayload {
  error_code: number;
  error_string: string;
  error_detail?: string;
  request_id?: string;
}

interface YandexDirectApiErrorResponse {
  error: YandexDirectApiErrorPayload;
}

interface YandexDirectApiSuccessResponse<T> {
  result: T;
}

interface YandexDirectGetBidsResult {
  Bids?: YandexDirectRawBid[];
}

interface YandexDirectSetBidsResult {
  SetResults?: Array<{
    KeywordId?: string;
    Errors?: Array<{
      Code: number;
      Message: string;
      Details?: string;
    }>;
  }>;
}

interface YandexDirectRawBid {
  KeywordId?: string | number;
  Bid?: unknown;
  SearchBid?: unknown;
  CurrentSearchPrice?: unknown;
  AuctionBids?: Array<{
    Price?: unknown;
    Position?: unknown;
    PremiumPlace?: unknown;
  }>;
}

export interface DirectBidSnapshot {
  keywordId: string;
  currentBidRub: number;
  currentSearchPriceRub: number | null;
}

export interface SetBidInput {
  keywordId: string;
  bidRub: number;
}

export interface SetBidResult {
  keywordId: string;
  success: boolean;
  errorMessage?: string;
}

export class YandexDirectApiError extends Error {
  public readonly code?: number;
  public readonly requestId?: string;
  public readonly isAuthError: boolean;
  public readonly isPointsLimitError: boolean;

  constructor(payload: YandexDirectApiErrorPayload) {
    const message = `${payload.error_string}${payload.error_detail ? `: ${payload.error_detail}` : ''}`;
    super(message);
    this.name = 'YandexDirectApiError';
    this.code = payload.error_code;
    this.requestId = payload.request_id;

    const normalized = `${payload.error_string} ${payload.error_detail ?? ''}`.toLowerCase();
    this.isAuthError =
      normalized.includes('authentication') ||
      normalized.includes('token') ||
      payload.error_code === 53;
    this.isPointsLimitError =
      normalized.includes('point') ||
      normalized.includes('балл') ||
      normalized.includes('limit');
  }
}

export class YandexDirectApiClient {
  private readonly token: string;
  private readonly clientLogin?: string;
  private readonly locale: string;

  constructor() {
    this.token = process.env.YANDEX_DIRECT_TOKEN ?? '';
    this.clientLogin = process.env.YANDEX_DIRECT_CLIENT_LOGIN;
    this.locale = process.env.YANDEX_DIRECT_LOCALE ?? 'ru';

    if (!this.token) {
      throw new Error('YANDEX_DIRECT_TOKEN is not set');
    }
  }

  public async getBids(campaignId: string): Promise<DirectBidSnapshot[]> {
    const campaignNumericId = toNumericId(campaignId, 'campaignId');
    const body = {
      method: 'get',
      params: {
        SelectionCriteria: {
          CampaignIds: [campaignNumericId],
        },
        FieldNames: ['KeywordId', 'Bid', 'SearchBid', 'CurrentSearchPrice', 'AuctionBids'],
      },
    };

    const response = await this.request<YandexDirectGetBidsResult>(body);
    const bids = response.Bids ?? [];

    return bids
      .map((item) => {
        const keywordId = toSafeString(item.KeywordId);
        if (!keywordId) {
          return null;
        }

        const currentBidMicros = parseMicros(item.Bid) ?? parseMicros(item.SearchBid) ?? 0;
        const currentSearchMicros = extractSearchPriceMicros(item);

        return {
          keywordId,
          currentBidRub: microsToRub(currentBidMicros),
          currentSearchPriceRub: currentSearchMicros === null ? null : microsToRub(currentSearchMicros),
        } satisfies DirectBidSnapshot;
      })
      .filter((item): item is DirectBidSnapshot => item !== null);
  }

  public async setBids(bids: SetBidInput[]): Promise<SetBidResult[]> {
    if (bids.length === 0) {
      return [];
    }

    const body = {
      method: 'set',
      params: {
        KeywordBids: bids.map((bid) => ({
          KeywordId: toNumericId(bid.keywordId, 'keywordId'),
          SearchBid: rubToMicros(bid.bidRub),
        })),
      },
    };

    const response = await this.request<YandexDirectSetBidsResult>(body);
    const setResults = response.SetResults ?? [];

    return bids.map((bid, index) => {
      const apiResult = setResults[index];
      const errors = apiResult?.Errors;

      if (errors && errors.length > 0) {
        return {
          keywordId: bid.keywordId,
          success: false,
          errorMessage: `${errors[0].Message}${errors[0].Details ? `: ${errors[0].Details}` : ''}`,
        } satisfies SetBidResult;
      }

      return {
        keywordId: bid.keywordId,
        success: true,
      } satisfies SetBidResult;
    });
  }

  private async request<T>(body: Record<string, unknown>): Promise<T> {
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'Accept-Language': this.locale,
    };

    if (this.clientLogin) {
      headers['Client-Login'] = this.clientLogin;
    }

    const response = await fetch(YANDEX_DIRECT_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const json = (await response.json()) as YandexDirectApiSuccessResponse<T> | YandexDirectApiErrorResponse;

    if (!response.ok || 'error' in json) {
      if ('error' in json) {
        throw new YandexDirectApiError(json.error);
      }
      throw new Error(`Yandex Direct API request failed with status ${response.status}`);
    }

    return json.result;
  }
}

function parseMicros(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === 'object') {
    const asObject = value as Record<string, unknown>;
    return (
      parseMicros(asObject.Price) ??
      parseMicros(asObject.Value) ??
      parseMicros(asObject.price) ??
      parseMicros(asObject.value)
    );
  }
  return null;
}

function extractSearchPriceMicros(bid: YandexDirectRawBid): number | null {
  const directPrice = parseMicros(bid.CurrentSearchPrice);
  if (directPrice !== null) {
    return directPrice;
  }

  if (!Array.isArray(bid.AuctionBids) || bid.AuctionBids.length === 0) {
    return null;
  }

  const firstPlace = bid.AuctionBids.find((item) => {
    if (item.PremiumPlace === 1) {
      return true;
    }
    const position = String(item.Position ?? '');
    return position.endsWith('1');
  });

  return parseMicros(firstPlace?.Price ?? bid.AuctionBids[0]?.Price);
}

function microsToRub(value: number): number {
  return Number((value / RUB_TO_MICRO).toFixed(2));
}

function rubToMicros(value: number): number {
  return Math.round(value * RUB_TO_MICRO);
}

function toSafeString(value: string | number | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toNumericId(value: string, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return parsed;
}
