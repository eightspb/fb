const YANDEX_DIRECT_API_BASE_URL = 'https://api.direct.yandex.com/json/v5';
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

interface YandexDirectGetCampaignsResult {
  Campaigns?: YandexDirectRawCampaign[];
}

interface YandexDirectAddResultItem {
  Id?: string | number;
  Errors?: Array<{
    Code?: number;
    Message?: string;
    Details?: string;
  }>;
}

interface YandexDirectAddResult {
  AddResults?: YandexDirectAddResultItem[];
}

interface YandexDirectRawCampaign {
  Id?: string | number;
  Name?: string;
  State?: string;
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

export interface DirectCampaignSnapshot {
  id: string;
  name: string;
  state: string;
}

export interface CreateCampaignInput {
  name: string;
  campaignPayload?: Record<string, unknown>;
  minusKeywords?: string[];
}

export interface CreateAdGroupInput {
  campaignId: string;
  name: string;
  adGroupPayload?: Record<string, unknown>;
}

export interface AddKeywordsResult {
  keyword: string;
  keywordId: string | null;
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

    const response = await this.request<YandexDirectGetBidsResult>('bids', body);
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

    const response = await this.request<YandexDirectSetBidsResult>('bids', body);
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

  public async getCampaigns(): Promise<DirectCampaignSnapshot[]> {
    const body = {
      method: 'get',
      params: {
        SelectionCriteria: {},
        FieldNames: ['Id', 'Name', 'State'],
      },
    };

    const response = await this.request<YandexDirectGetCampaignsResult>('campaigns', body);
    const campaigns = response.Campaigns ?? [];

    return campaigns
      .map((campaign) => {
        const id = toSafeString(campaign.Id);
        const name = campaign.Name?.trim();
        const state = campaign.State?.trim();

        if (!id || !name || !state) {
          return null;
        }

        return {
          id,
          name,
          state,
        } satisfies DirectCampaignSnapshot;
      })
      .filter((campaign): campaign is DirectCampaignSnapshot => campaign !== null);
  }

  public async createCampaign(input: CreateCampaignInput): Promise<string> {
    const campaignPayload = withDefaultCampaignFields(sanitizeRecord(ensureObject(input.campaignPayload)));
    const payloadMinusKeywords = normalizeKeywordListFromUnknown(campaignPayload.NegativeKeywords);
    const normalizedMinusKeywords = normalizeKeywordList([...(input.minusKeywords ?? []), ...payloadMinusKeywords]);
    const campaignPayloadWithoutNegativeKeywords = removeField(campaignPayload, 'NegativeKeywords');

    const campaign = {
      ...campaignPayloadWithoutNegativeKeywords,
      Name: input.name,
      ...(normalizedMinusKeywords.length > 0
        ? {
            NegativeKeywords: normalizedMinusKeywords,
          }
        : {}),
    };

    const body = {
      method: 'add',
      params: {
        Campaigns: [campaign],
      },
    };

    const response = await this.request<YandexDirectAddResult>('campaigns', body);
    return extractAddedEntityId(response, 'campaign');
  }

  public async createAdGroup(input: CreateAdGroupInput): Promise<string> {
    const adGroupPayload = sanitizeRecord(ensureObject(input.adGroupPayload));
    const adGroupNegativeKeywords = normalizeKeywordListFromUnknown(adGroupPayload.NegativeKeywords);
    const adGroupPayloadWithoutNegativeKeywords = removeField(adGroupPayload, 'NegativeKeywords');
    const body = {
      method: 'add',
      params: {
        AdGroups: [
          {
            ...adGroupPayloadWithoutNegativeKeywords,
            CampaignId: toNumericId(input.campaignId, 'campaignId'),
            Name: input.name,
            ...(adGroupNegativeKeywords.length > 0
              ? {
                  NegativeKeywords: adGroupNegativeKeywords,
                }
              : {}),
          },
        ],
      },
    };

    const response = await this.request<YandexDirectAddResult>('adgroups', body);
    return extractAddedEntityId(response, 'ad group');
  }

  public async deleteCampaign(campaignId: string): Promise<void> {
    const body = {
      method: 'delete',
      params: {
        SelectionCriteria: {
          Ids: [toNumericId(campaignId, 'campaignId')],
        },
      },
    };

    await this.request<unknown>('campaigns', body);
  }

  public async archiveCampaign(campaignId: string): Promise<void> {
    const body = {
      method: 'archive',
      params: {
        SelectionCriteria: {
          Ids: [toNumericId(campaignId, 'campaignId')],
        },
      },
    };

    await this.request<unknown>('campaigns', body);
  }

  public async addKeywords(adGroupId: string, keywords: string[]): Promise<AddKeywordsResult[]> {
    const normalizedKeywords = normalizeKeywordList(keywords);
    if (normalizedKeywords.length === 0) {
      return [];
    }

    const body = {
      method: 'add',
      params: {
        Keywords: normalizedKeywords.map((keyword) => ({
          Keyword: keyword,
          AdGroupId: toNumericId(adGroupId, 'adGroupId'),
        })),
      },
    };

    const response = await this.request<YandexDirectAddResult>('keywords', body);
    const results = response.AddResults ?? [];

    return normalizedKeywords.map((keyword, index) => {
      const addResult = results[index];
      const errors = addResult?.Errors ?? [];
      const id = toSafeString(addResult?.Id);

      if (errors.length > 0 || !id) {
        const firstError = errors[0];
        return {
          keyword,
          keywordId: null,
          success: false,
          errorMessage: firstError
            ? `${firstError.Message ?? 'Ошибка'}${firstError.Details ? `: ${firstError.Details}` : ''}`
            : 'Яндекс.Директ не вернул ID ключа',
        } satisfies AddKeywordsResult;
      }

      return {
        keyword,
        keywordId: id,
        success: true,
      } satisfies AddKeywordsResult;
    });
  }

  private async request<T>(resource: string, body: Record<string, unknown>): Promise<T> {
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'Accept-Language': this.locale,
    };

    if (this.clientLogin) {
      headers['Client-Login'] = this.clientLogin;
    }

    const response = await fetch(`${YANDEX_DIRECT_API_BASE_URL}/${resource}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const rawResponse = await response.text();
    const json = safeJsonParse(rawResponse) as YandexDirectApiSuccessResponse<T> | YandexDirectApiErrorResponse | null;

    if (!response.ok || (json !== null && 'error' in json)) {
      if (json !== null && 'error' in json) {
        throw new YandexDirectApiError(json.error);
      }
      const truncated = rawResponse.slice(0, 300);
      throw new Error(`Yandex Direct API request failed with status ${response.status}${truncated ? `: ${truncated}` : ''}`);
    }

    if (json === null) {
      throw new Error('Yandex Direct API returned invalid JSON');
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

function ensureObject(value: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value) {
    return {};
  }
  return value;
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

function withDefaultCampaignFields(payload: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...payload };
  const startDate = normalized.StartDate;
  if (typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
    normalized.StartDate = getTodayDate();
  }
  return normalized;
}

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function extractAddedEntityId(response: YandexDirectAddResult, entityLabel: string): string {
  const addResult = response.AddResults?.[0];
  if (!addResult) {
    throw new Error(`Yandex Direct API did not return ${entityLabel} creation result`);
  }

  const errors = addResult.Errors ?? [];
  if (errors.length > 0) {
    const firstError = errors[0];
    throw new Error(
      `${firstError.Message ?? 'Ошибка создания'}${firstError.Details ? `: ${firstError.Details}` : ''}`
    );
  }

  const id = toSafeString(addResult.Id);
  if (!id) {
    throw new Error(`Yandex Direct API did not return created ${entityLabel} ID`);
  }
  return id;
}

function normalizeKeywordList(values: string[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length > 0) {
      unique.add(normalized);
    }
  }
  return Array.from(unique);
}

function normalizeKeywordListFromUnknown(value: unknown): string[] {
  return normalizeKeywordList(flattenKeywordValues(value));
}

function flattenKeywordValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenKeywordValues(item));
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    if ('Items' in source) {
      return flattenKeywordValues(source.Items);
    }
    if ('Keyword' in source) {
      return flattenKeywordValues(source.Keyword);
    }
  }

  return [];
}

function removeField(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const cloned = { ...record };
  delete cloned[key];
  return cloned;
}
