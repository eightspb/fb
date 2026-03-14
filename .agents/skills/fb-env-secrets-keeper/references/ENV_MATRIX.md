# ENV Matrix

## Основные группы
1. Core runtime: `DATABASE_URL`, `NODE_ENV`, `NEXT_PUBLIC_SITE_URL`
2. Admin/auth: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`
3. Email/IMAP: `SMTP_*`, `IMAP_*`, `TARGET_EMAIL`, `CRM_ATTACHMENTS_DIR`
4. Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `TELEGRAM_WEBHOOK_URL`
5. AI: `OPENROUTER_API_KEY`, `POLZA_API_KEY`
6. Redis/rate limit: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
7. Yandex: `YANDEX_DIRECT_TOKEN`, `YANDEX_DIRECT_CLIENT_LOGIN`, `YANDEX_GEOCODER_API_KEY`

## Rules
1. Secrets never belong in `NEXT_PUBLIC_*` unless explicitly intended for client exposure.
2. Итоговые отчеты должны маскировать секреты.
3. При env contract change проверь docs, deploy flow и provider-specific smoke.

## Known caution
Некоторые локальные диагностические скрипты могут быть слишком разговорчивыми.
Если используешь их вывод в отчете, перескажи его безопасно и без raw secrets.
