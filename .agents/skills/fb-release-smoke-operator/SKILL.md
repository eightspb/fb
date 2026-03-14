---
name: fb-release-smoke-operator
description: "Выполняет быстрые smoke-checks fibroadenoma.net до и после релиза. Активируй при вопросах про smoke test, sanity check, post-deploy checks, release validation, что проверить после выкладки, а также после deploy для site/admin/app/full режимов."
---

# fb-release-smoke-operator

## Цель
Давать короткий, воспроизводимый сигнал “релиз жив” по ключевым пользовательским сценариям.
Этот skill не заменяет тесты и не заменяет deploy; он закрывает gap между ними.

## Что читать
1. Используй этот `SKILL.md`.
2. Для чеклистов по режимам загрузи `references/SMOKE_CHECKS.md`.

## Базовый smoke baseline
Всегда проверяй:
1. `https://fibroadenoma.net/`
2. `https://fibroadenoma.net/admin`
3. `https://fibroadenoma.net/api/health`

## Mode-specific smoke
1. `admin` mode -> login page, admin shell, минимум один read path
2. `site` mode -> home, news/conferences или другой затронутый публичный flow
3. `app` mode -> baseline + один реальный API/user flow
4. `full` mode -> baseline + DB-sensitive flow

## Когда усиливать smoke
1. Менялся admin mutate-flow -> проверь save/update path
2. Менялись формы -> проверь submit path
3. Менялись интеграции -> handoff в `fb-integrations-watchdog`
4. Менялся auth/security -> handoff в `fb-security-gate`

## Практический порядок
1. HTTP availability
2. health endpoint
3. UI entrypoint
4. один реальный сценарий по затронутой зоне

## Handoff-правила
1. Непонятно, что smoke обязателен -> `fb-change-impact-gate`
2. Нужен deploy mode и rollout context -> `fb-deploy-operator`
3. Падает admin save -> `fb-admin-csrf-guard`
4. Падает provider-specific flow -> `fb-integrations-watchdog`

## Итоговый отчет

```text
[SMOKE]
mode:
baseline:
- /
- /admin
- /api/health
targeted_flow:
result: pass/fail
rollback_consideration: yes/no
```
