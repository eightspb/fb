---
name: fb-env-secrets-keeper
description: "Следит за env и secret hygiene в fibroadenoma.net. Активируй при любых вопросах про .env, secrets, JWT_SECRET, ADMIN_PASSWORD, SMTP, IMAP, TELEGRAM_BOT_TOKEN, OPENROUTER_API_KEY, POLZA_API_KEY, NEXT_PUBLIC, GitHub/VPS secrets, docker-compose env, а также при подозрении на secret leakage или env drift между local/test/prod."
---

# fb-env-secrets-keeper

## Цель
Держать env-контракт проекта прозрачным и безопасным.
В этом репо много интеграций и несколько окружений, поэтому основная проблема не “как добавить ещё одну переменную”, а не допустить drift, утечки и ложной уверенности.

## Что читать
1. Используй этот `SKILL.md`.
2. Для inventory и red flags загрузи `references/ENV_MATRIX.md`.

## Рабочий процесс

### Шаг 1. Определи контекст
Выясни, какой слой затронут:
1. local dev (`.env.local`)
2. tests/CI
3. production server `.env`
4. GitHub Actions secrets
5. client-exposed vars (`NEXT_PUBLIC_*`)

### Шаг 2. Найди env usage
```bash
rg -n "process\\.env\\.[A-Z0-9_]+" src apps/admin scripts tests
```

### Шаг 3. Проверь четыре главных риска
1. secret попал в client bundle/client component
2. raw secret печатается в логах/диагностике
3. runtime зависит от неописанного env
4. local/test/prod drift не задокументирован

### Шаг 4. Зафиксируй owner и scope переменной
Для каждой новой/изменённой переменной определи:
1. где читается
2. в каких окружениях обязательна
3. можно ли ей быть `NEXT_PUBLIC_*`
4. что должно случиться при её отсутствии

### Шаг 5. Согласуй документацию и релиз
Если меняется env contract:
1. обнови docs/skills/reference, где это нужно
2. передай в `fb-deploy-operator`, если меняется production setup
3. передай в `fb-security-gate`, если это auth/PII/provider secret

## Repo-specific red flags
1. `JWT_SECRET` fallback допустим только вне production; не нормализуй это для prod.
2. `ADMIN_PASSWORD` и другие secrets нельзя печатать в итоговых отчетах.
3. Только `NEXT_PUBLIC_*` можно считать безопасными для клиента, и то после осознанной проверки.
4. Изменения в SMTP/Telegram/OpenRouter/Polza/Yandex vars почти всегда требуют post-change verification.

## Handoff-правила
1. Интеграционный env issue -> `fb-integrations-watchdog`
2. Security-sensitive env change -> `fb-security-gate`
3. Release/server secret drift -> `fb-deploy-operator`
4. Изменения затрагивают auth/admin -> `fb-admin-csrf-guard` или `fb-security-gate`

## Anti-patterns
1. Логировать реальный пароль/токен для “удобства отладки”.
2. Тащить secret в `NEXT_PUBLIC_*`.
3. Считать `.env.local` и production `.env` одинаковыми по требованиям.
4. Добавлять новую env без фиксации, где она обязательна.

## Итоговый отчет

```text
[ENV]
vars_reviewed:
environments:
client_exposure_risk: yes/no
logging_leak_risk: yes/no
docs_sync_needed: yes/no
follow_up_skills:
```
