---
name: fb-integrations-watchdog
description: "Триажит внешние интеграции fibroadenoma.net: Telegram, SMTP, IMAP, OpenRouter, Polza, Upstash Redis/rate limiting, Yandex Direct и Geocoder. Активируй при словах SMTP, email, IMAP, webhook, OpenRouter, Polza, Redis, rate limit, Yandex, external API, timeout, provider error, 401/403/429/5xx от внешнего сервиса, а также при симптомах, что код ок, но внешний провайдер ведёт себя нестабильно."
---

# fb-integrations-watchdog

## Цель
Быстро отделять баги в коде от проблем провайдера, конфигурации или секретов.
Этот skill полезен для всех внешних зависимостей, кроме чистого Telegram-инцидента, где сначала лучше использовать `fb-telegram-incident-runbook`.

## Что читать
1. Используй этот `SKILL.md`.
2. Для карты интеграций загрузи `references/INTEGRATIONS_MATRIX.md`.

## Рабочий процесс

### Шаг 1. Определи провайдера
Чаще всего это одна из зон:
1. Telegram
2. SMTP/IMAP
3. OpenRouter/Polza
4. Upstash Redis/rate limit
5. Yandex Direct/Geocoder

### Шаг 2. Проверь три слоя
1. env/secrets
2. кодовый path и error handling
3. provider response/status/logs

### Шаг 3. Не путай incident types
1. Telegram bot down -> `fb-telegram-incident-runbook`
2. Secret/config mismatch -> `fb-env-secrets-keeper`
3. Security-sensitive provider path -> `fb-security-gate`
4. Release regression после deploy -> `fb-release-smoke-operator` или `fb-deploy-operator`

### Шаг 4. Зафиксируй root-cause bucket
1. code regression
2. bad/missing secret
3. provider outage or quota
4. network/runtime/deploy issue

## Anti-patterns
1. Сразу винить провайдера без проверки env и логов.
2. Переиспользовать Telegram runbook для любого внешнего API.
3. Исправлять integration bug без smoke/verification после секрета или deploy change.

## Итоговый отчет

```text
[INTEGRATION]
provider:
symptom:
root_cause_bucket:
env_check:
code_path_check:
provider_signal:
follow_up_skill:
```
