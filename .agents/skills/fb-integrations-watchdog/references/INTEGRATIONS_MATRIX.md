# Integrations Matrix

## Telegram
1. Files: `src/lib/telegram-bot.ts`, `src/lib/telegram-notifications.ts`, `src/app/api/telegram/webhook/route.ts`
2. Primary runbook: `fb-telegram-incident-runbook`

## SMTP / IMAP
1. Files: `src/lib/email.ts`, `src/lib/imap-client.ts`
2. Common env: `SMTP_*`, `IMAP_*`, `TARGET_EMAIL`

## AI
1. Files: `src/lib/openrouter.ts`, `src/lib/research-jobs.ts`, admin AI routes
2. Common env: `OPENROUTER_API_KEY`, `POLZA_API_KEY`

## Upstash / rate limit
1. Common env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
2. Risk: false positives on throttling and hidden env drift

## Yandex
1. Files: `src/lib/yandex-direct/api.ts`, maps/geocoder-related code
2. Common env: `YANDEX_DIRECT_TOKEN`, `YANDEX_DIRECT_CLIENT_LOGIN`, `YANDEX_GEOCODER_API_KEY`

## Rule
Если проблема выглядит “внешней”, всё равно сначала проверь env и локальный code path, а не только provider status.
