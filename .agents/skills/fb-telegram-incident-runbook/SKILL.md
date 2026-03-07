---
name: fb-telegram-incident-runbook
description: "Ранбук для устранения инцидентов с Telegram-ботом fibroadenoma.net. Активируй при любом упоминании: 'бот не отвечает', 'бот не работает', 'телеграм бот сломался', 'telegram bot down', 'webhook не работает', 'webhook error', '502', '503', 'bad gateway от телеграма', 'pending updates', 'бот зависает', 'бот тормозит', 'getUpdates', 'setWebhook', 'deleteWebhook', 'бот перестал отвечать', 'telegram fix', 'telegram incident', 'webhook timeout', 'too many pending updates'. Если пользователь описывает любую проблему с Telegram-ботом, используй этот скил."
---

# fb-telegram-incident-runbook

## Цель
Восстанавливай работу Telegram-бота по эскалации: быстрый автофикс -> диагностика -> ручной разбор.
Следуй этому порядку, потому что большинство инцидентов закрываются на первом шаге и не требуют долгой ручной диагностики.

## Прогрессивная загрузка (не читай всё сразу)
1. Сначала используй только этот `SKILL.md`.
2. Если нужен быстрый справочник по ручному восстановлению, загрузи `references/TELEGRAM_FIX_QUICK.md`.
3. Если требуется глубокая интерпретация симптомов/логов, загрузи `references/TELEGRAM_DEBUG.md`.
4. Не загружай оба reference-файла без необходимости.

## Уровень 1. Быстрый автофикс (приоритетный)
Запусти автофикс сразу, потому что это самый быстрый путь вернуть бота в рабочее состояние.

```bash
./scripts/fix-telegram-now.sh
```

Ожидаемый результат:
```text
exit code 0
Webhook reconfigured
Pending updates cleared
Telegram ping check: OK
```

Если успешно:
1. Сообщи, что бот восстановлен.
2. Приложи ключевые строки проверки (webhook URL, pending_count=0, test ping OK).
3. Попроси пользователя подтвердить, что бот отвечает в чате.

Если неуспешно:
1. Перейди к Уровню 2.

## Уровень 2. Диагностика (если автофикс не помог)
Запусти диагностику, потому что теперь нужно определить точную причину отказа.

```bash
./scripts/diagnose-telegram.sh
```

Скрипт должен проверить:
1. `getWebhookInfo` через Telegram API.
2. Доступность webhook URL извне.
3. SSL/сертификатные ошибки.
4. Ошибки приложения в логах.
5. Наличие и рост `pending updates`.

Пример ожидаемых фрагментов:
```text
webhook.status=active
webhook.last_error_date=...
ssl_check=ok|failed
pending_updates=0|N
```

После выполнения загрузи `references/TELEGRAM_DEBUG.md` и интерпретируй вывод.

## Уровень 3. Ручной сценарий (если Уровни 1-2 не помогли)
Выполни ручные проверки, потому что остались инфраструктурные или учетные причины.

Загрузи:
1. `references/TELEGRAM_FIX_QUICK.md`
2. `references/TELEGRAM_DEBUG.md`

Порядок действий:
1. Проверь токен/валидность бота (`getMe`).
2. Проверь webhook URL и сертификат.
3. Проверь DNS/firewall/reverse proxy.
4. Проверь ошибки `502/503` в nginx/app логах.
5. Перезапусти приложение целиком и перепроверь webhook.

Пример:
```bash
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe"
# Ожидаемый результат: {"ok":true,...}
```

```bash
curl -I https://example.com/api/telegram/webhook
# Ожидаемый результат: HTTP/1.1 200 OK (или 405 для метода GET, если endpoint POST-only)
```

## Критерии завершения инцидента
1. `getWebhookInfo` не показывает критических ошибок.
2. `pending updates` стабильно не растет.
3. Тестовое сообщение проходит end-to-end.
4. Пользователь подтверждает, что бот снова отвечает.

Пример отчета:
```text
Incident resolved:
- Level used: 2
- Root cause: expired TLS certificate on webhook host
- Fix: certificate renewed, webhook reset
- Validation: getWebhookInfo ok, pending=0, test message delivered
```

## Идемпотентность
1. Повторный запуск `fix-telegram-now.sh` должен быть безопасен.
2. Повторный `setWebhook` с тем же URL не должен ломать состояние.
3. Диагностика не должна мутировать состояние, кроме явного режима fix.

## Взаимодействие с другими скилами
1. Если обнаружено, что проблема началась сразу после деплоя, передай управление скилу `fb-deploy-operator` — он лучше справится с релизным контекстом и rollback.
2. Если обнаружено, что нужны миграции/БД-фиксы, передай управление скилу `fb-migrations-maintainer` — он лучше справится с изменениями схемы.
3. Если инцидент затрагивает admin API 403 при управлении ботом через админку, передай управление скилу `fb-admin-csrf-guard` — он лучше справится с CSRF-проверкой.

## Когда НЕ использовать этот скил
1. Добавление новых команд/фич бота: это разработка, не инцидент.
2. Первичная настройка бота с нуля: это onboarding.
3. Запуск тестов перед merge/deploy: используй `fb-test-gatekeeper`.
4. Обычный деплой без инцидента: используй `fb-deploy-operator`.

## Decision Tree: инцидент Telegram-бота
```text
START
  |
  |-- Есть симптом "бот не отвечает / webhook error / 502 / 503"?
  |     |-- Нет -> этот скил может быть не нужен
  |     |-- Да -> Level 1
  |
  |-- Level 1: fix-telegram-now.sh завершился с exit code 0?
  |     |-- Да -> выполнить валидацию и закрыть инцидент
  |     |-- Нет -> Level 2
  |
  |-- Level 2: diagnose-telegram.sh дал root cause?
  |     |-- Да -> применить targeted fix и валидация
  |     |-- Нет -> Level 3
  |
  |-- Level 3: ручной сценарий устранил проблему?
  |     |-- Да -> закрыть инцидент и задокументировать RCA
  |     |-- Нет -> эскалация в инфраструктуру/разработку
```

### Decision Tree: выбор приоритета
1. P1: бот не отвечает всем пользователям более 5 минут.
2. P2: бот отвечает частично, задержки > 30 секунд.
3. P3: единичные ошибки без массового влияния.

Пример:
```text
Симптом: 100% команд timeout в проде
Приоритет: P1
Действие: немедленно Level 1 -> Level 2 без задержек
```

### Decision Tree: webhook vs token vs infra
1. Если `getMe` не ok -> вероятна проблема токена/блокировки бота.
2. Если `getMe` ok, но `getWebhookInfo` содержит last_error_message -> webhook/infra issue.
3. Если webhook URL недоступен извне -> network/proxy/DNS/SSL issue.
4. Если pending updates растут -> webhook не обрабатывает входящие стабильно.

## Расширенный протокол диагностики
### Проверка Telegram API
```bash
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe"
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
```

Ожидаемый результат:
```text
getMe.ok=true
getWebhookInfo.ok=true
```

### Проверка endpoint и TLS
```bash
curl -I https://example.com/api/telegram/webhook
openssl s_client -connect example.com:443 -servername example.com </dev/null
```

Ожидаемый результат:
```text
HTTP status 200/405
TLS handshake successful
certificate not expired
```

### Проверка логов приложения
```bash
journalctl -u fb-app --since "10 minutes ago" | rg -i "telegram|webhook|error|timeout|502|503"
```

Ожидаемый результат:
```text
нет повторяющихся фатальных ошибок по webhook handler
```

## Anti-patterns и как исправлять
1. Anti-pattern: начинать с глубокого ручного дебага, пропуская Level 1.
   Почему плохо: теряется время, MTTR растет.
   Исправление: сначала автофикс.

2. Anti-pattern: запускать fix-скрипт много раз подряд без анализа.
   Почему плохо: шум и скрытие root cause.
   Исправление: один запуск -> диагностика -> осознанный следующий шаг.

3. Anti-pattern: не фиксировать момент начала инцидента.
   Почему плохо: нельзя корректно оценить impact window.
   Исправление: всегда фиксируй start_time_utc.

4. Anti-pattern: не проверять `pending updates`.
   Почему плохо: бот "вроде ожил", но очередь продолжает расти.
   Исправление: мониторь pending count после фикса.

5. Anti-pattern: игнорировать SSL предупреждения.
   Почему плохо: Telegram откажется доставлять webhook.
   Исправление: валидируй сертификат и цепочку.

6. Anti-pattern: закрывать инцидент без тестового сообщения.
   Почему плохо: нет end-to-end подтверждения.
   Исправление: отправь тест-команду и проверь ответ.

7. Anti-pattern: сразу менять токен без проверки.
   Почему плохо: можно создать новый простой.
   Исправление: сначала `getMe` и `getWebhookInfo`.

8. Anti-pattern: смешивать fix и диагностику в одном скрипте.
   Почему плохо: сложно понять, что именно помогло.
   Исправление: разделяй Level 1 (fix) и Level 2 (diagnose).

9. Anti-pattern: не передавать контекст после деплоя.
   Почему плохо: теряется связь с релизом.
   Исправление: handoff в `fb-deploy-operator`, если инцидент post-deploy.

10. Anti-pattern: нет RCA после инцидента.
    Почему плохо: повторяемые сбои.
    Исправление: всегда делай краткий postmortem.

## Шаблоны отчетов
### Шаблон: incident intake
```text
[TELEGRAM INCIDENT INTAKE]
date_utc:
detected_by:
symptoms:
priority: P1/P2/P3
first_seen_utc:
recent_deploy: yes/no
initial_hypothesis:
```

### Шаблон: level 1 execution
```text
[LEVEL 1 AUTOFIX]
script: ./scripts/fix-telegram-now.sh
start_utc:
end_utc:
exit_code:
webhook_before:
webhook_after:
pending_before:
pending_after:
result: pass/fail
```

### Шаблон: level 2 diagnosis
```text
[LEVEL 2 DIAGNOSIS]
script: ./scripts/diagnose-telegram.sh
getMe_ok:
getWebhookInfo_ok:
last_error_message:
ssl_status:
endpoint_reachability:
logs_summary:
suspected_root_cause:
```

### Шаблон: level 3 manual actions
```text
[LEVEL 3 MANUAL]
actions:
1)
2)
3)
verification_steps:
remaining_risks:
```

### Шаблон: incident resolved
```text
[INCIDENT RESOLVED]
resolved_utc:
duration_minutes:
root_cause:
fix_applied:
validation:
follow_up_tasks:
```

### Шаблон: handoff в deploy skill
```text
[HANDOFF]
from_skill: fb-telegram-incident-runbook
to_skill: fb-deploy-operator
reason: incident tied to recent release
needed_action: deploy diff + rollback decision
```

## Stop-conditions
1. Нет доступа к BOT_TOKEN и невозможно проверить `getMe`.
2. Нет доступа к логам приложения и reverse proxy.
3. Нельзя выполнить ни fix, ни diagnose script.
4. Не удается определить текущий webhook URL.

## Готовые команды для быстрой диагностики
```bash
./scripts/fix-telegram-now.sh
./scripts/diagnose-telegram.sh
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe"
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
```

## Критерии закрытия инцидента
1. `getWebhookInfo` без критических ошибок.
2. `pending_updates` стабилен и не растет.
3. Тестовое сообщение успешно.
4. Пользователь подтверждает восстановление.
5. Заполнен шаблон incident resolved.

## Формат финального ответа пользователю
1. Какой уровень использован (1/2/3).
2. Что было root cause.
3. Что применено как fix.
4. Как проверено восстановление.
5. Нужен ли follow-up.

Пример:
```text
Уровень: 2
Причина: webhook endpoint отдавал 503 из-за падения app worker
Фикс: перезапуск worker + reset webhook
Проверка: getWebhookInfo ok, pending=0, тестовая команда отвечает
Follow-up: добавить alert на рост pending updates
```
