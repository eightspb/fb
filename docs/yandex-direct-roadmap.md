# Yandex Direct Automation Roadmap

## Goal
Minimize manual work for launching and maintaining Yandex Direct campaigns from the existing admin panel.

## Current Baseline
- `direct_campaigns` and `direct_logs` tables already exist.
- Admin page `/admin/direct` already supports manual campaign management.
- Bidder script `src/scripts/direct-bidder.ts` is already implemented.

## Phases

### Phase 1: Campaign Sync From Yandex
Status: `completed`

Scope:
- Add `getCampaigns()` to Yandex API client.
- Add secured route `POST /api/admin/direct/sync`.
- Upsert campaigns into `direct_campaigns`.
- Keep `is_active` and `max_bid` unchanged for existing rows.
- Add UI button "Синхронизировать с Яндексом" with loading/error state.

Acceptance criteria:
- New campaigns from Yandex appear in admin without manual ID input.
- Renamed campaigns in Yandex update `name` in local DB.
- Existing `is_active` and `max_bid` are preserved.

Implemented:
- `YandexDirectApiClient.getCampaigns()` added.
- `POST /api/admin/direct/sync` added with auth and DB upsert.
- Admin UI button "Синхронизировать с Яндексом" added.

### Phase 2: Template-Based Provisioning
Status: `completed`

Scope:
- Campaign/group/keyword templates in DB.
- One-click campaign provisioning via API.
- Save mappings between template entities and Yandex IDs.

Implemented:
- Tables `direct_campaign_templates`, `direct_keyword_templates`, `direct_entities_map` added.
- `GET/POST /api/admin/direct/templates` added for template management.
- `POST /api/admin/direct/provision` added for one-click campaign/ad-group/keywords creation.
- Mapping of created Yandex entities is persisted in `direct_entities_map`.
- Admin UI updated with:
  - template creation dialog;
  - template selection;
  - "Создать кампанию" action.

### Phase 3: Automatic Keyword Discovery
Status: `planned`

Scope:
- Candidate generation from seed terms and search query reports.
- Automatic filtering, deduplication, scoring.
- Safe publish modes: suggest-only and auto-apply.

### Phase 4: Scheduler, Reliability, Observability
Status: `planned`

Scope:
- Scheduled sync and keyword discovery jobs.
- Rate limit handling, retries, idempotency.
- Metrics and alerting in admin.

## Change Log

### 2026-03-03
- Roadmap file created.
- Phase 1 implementation completed.
- Phase 2 implementation completed.
