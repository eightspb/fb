---
name: fb-deploy-operator
description: "Управляет деплоем приложения FreshBurger. Используй этот скил при любом упоминании: 'деплой', 'deploy', 'выкатить', 'задеплоить', 'релиз', 'release', 'откат', 'rollback', 'пост-проверка после деплоя', 'post-deploy checks', 'SiteOnly', 'AdminOnly', 'AppOnly', 'полный деплой', 'частичный деплой', 'откатиться на предыдущую версию', 'как выложить изменения', 'как откатить', 'что проверить после деплоя', 'выложить на прод', 'production rollout', 'ship to prod'. Также активируй при запросах, где нужно выбрать режим выкладки и подтвердить готовность системы до/после релиза."
---

# fb-deploy-operator

## Цель
Управляй деплоем так, чтобы релиз был предсказуемым, проверяемым и обратимым.
Всегда работай через явный режим деплоя и пост-проверки, потому что именно это снижает риск незаметной деградации в проде.

## Прогрессивная загрузка (не читай всё сразу)
1. Сначала используй только этот `SKILL.md`.
2. Если нужно быстро стартовать и подтвердить базовую последовательность, загрузи `references/QUICK_START.md`.
3. Если пользователь выбрал конкретный режим деплоя, загрузи только нужный раздел из `references/DEPLOY_GUIDE.md`.
4. Если пользователь просит автоматизировать шаги или запускать через скрипт/CI, загрузи `references/AUTOMATION_GUIDE.md`.
5. Если нужно понять/запустить конкретный локальный скрипт, загрузи `scripts/README.md`.

## Алгоритм работы

### Шаг 1. Определи режим деплоя
Сначала определи, что именно выкатывается, потому что разные режимы имеют разные риски и пост-проверки.

- `-SiteOnly`: только публичный сайт/статика.
- `-AdminOnly`: только админ-панель.
- `-AppOnly`: только API/бэкенд.
- Полный деплой: все компоненты.

Пример вопроса, если режим не указан:
```text
Какой тип деплоя нужен: SiteOnly, AdminOnly, AppOnly или полный?
```

Пример фиксации решения:
```text
Режим деплоя: AppOnly. Переходим к pre-flight проверкам.
```

### Шаг 2. Выполни предварительные проверки
Проверь минимум перед релизом, потому что деплой без pre-flight чаще всего переносит проблему прямо в прод.

1. Тесты.
2. Миграции БД.
3. Актуальность ветки.

Пример:
```bash
./scripts/run-tests.sh --quick
# Ожидаемый результат: exit code 0
```

Пример проверки синхронизации ветки:
```bash
git fetch origin
git rev-list --left-right --count HEAD...origin/main
# Ожидаемо: левое число >=0, правое число = 0 (локальная ветка не отстает)
```

Если обнаружено, что тесты не запускались или падают, передай управление скилу `fb-test-gatekeeper` — он лучше справится с выбором минимально достаточного тестового набора.

Если обнаружены новые/непримененные миграции, передай управление скилу `fb-migrations-maintainer` — он лучше справится с безопасным применением изменений схемы.

### Шаг 3. Выполни деплой выбранного режима
Загрузи только нужный раздел из `references/DEPLOY_GUIDE.md`, потому что чтение всех сценариев сразу расходует контекст и повышает шанс ошибочного шага.

Пример:
```bash
./scripts/deploy.sh -AppOnly
```

Ожидаемый паттерн вывода:
```text
[deploy] mode=AppOnly
[deploy] build: ok
[deploy] release: ok
```

Если пользователь просит повторяемый автодеплой или изменение пайплайна, загрузи `references/AUTOMATION_GUIDE.md`.

### Шаг 4. Выполни пост-проверки
Делай пост-проверки всегда, потому что успешный деплой не гарантирует рабочий сервис.

1. Главная страница отвечает `200`.
2. `/api/health` отвечает `200` и `{"status":"ok"}`.
3. Логи за последние 5 минут без критических ошибок.
4. Для `AdminOnly` проверь `/admin`.
5. Для `AppOnly` проверь Telegram webhook (если бот активен).

Пример:
```bash
curl -s -o /dev/null -w "%{http_code}" https://example.com/
# Ожидаемый результат: 200
```

```bash
curl -s https://example.com/api/health
# Ожидаемый результат: {"status":"ok"}
```

```bash
journalctl -u fb-app --since "5 minutes ago" | rg -i "error|exception|panic"
# Ожидаемый результат: пустой вывод или только известные не-блокирующие warning
```

Если после `AppOnly` деплоя бот перестал отвечать, передай управление скилу `fb-telegram-incident-runbook` — он лучше справится с автофиксом и глубокой диагностикой Telegram.

Если после изменений в admin UI/API выявлены ошибки `403`/сохранения, передай управление скилу `fb-admin-csrf-guard` — он лучше справится с CSRF-аудитом.

### Шаг 5. Откат (rollback)
Если пост-проверка провалена или пользователь просит откат, действуй немедленно, потому что время деградации в проде критично.

1. Загрузи раздел Rollback из `references/DEPLOY_GUIDE.md`.
2. Откати на предыдущую стабильную версию.
3. Повтори все пост-проверки.
4. Зафиксируй результат отката.

Пример:
```bash
./scripts/deploy.sh --rollback previous-stable
# Ожидаемый результат: rollback completed
```

Пример фиксации результата:
```text
Rollback выполнен на релиз 2026-03-05T18:40Z, /api/health=200, инцидент локализован.
```

## Идемпотентность
1. Не выполняй повторный релиз, если уже задеплоен тот же commit/tag и пост-проверки зелёные.
2. Не запускай rollback дважды подряд без новой диагностики.
3. Любой автоматизированный шаг делай проверяемым через явный лог/exit code.

Пример проверки текущей версии:
```bash
cat /opt/fb/release.txt
# Ожидаемый результат: hash/tag текущего релиза
```

## Взаимодействие с другими скилами
1. Если обнаружено, что деплой требует тестов, передай управление скилу `fb-test-gatekeeper` — он лучше справится с валидацией набора тестов.
2. Если обнаружено, что деплой требует миграций, передай управление скилу `fb-migrations-maintainer` — он лучше справится с применением схемы.
3. Если обнаружено, что после деплоя сломан Telegram-бот, передай управление скилу `fb-telegram-incident-runbook` — он лучше справится с инцидентом.
4. Если обнаружено, что изменения затрагивают `/api/admin/*`, передай управление скилу `fb-admin-csrf-guard` — он лучше справится с CSRF-требованиями.

## Когда НЕ использовать этот скил
1. Только изменения схемы БД без релиза кода: используй `fb-migrations-maintainer`.
2. Только запуск/выбор тестов без релиза: используй `fb-test-gatekeeper`.
3. Только инцидент Telegram-бота без деплой-контекста: используй `fb-telegram-incident-runbook`.
4. Только исправление CSRF-поведения в admin UI/API: используй `fb-admin-csrf-guard`.

## Чеклист перед финализацией
- [ ] Режим деплоя определён (`SiteOnly`/`AdminOnly`/`AppOnly`/полный)
- [ ] Тесты подтверждены (или передано в `fb-test-gatekeeper`)
- [ ] Миграции подтверждены (или передано в `fb-migrations-maintainer`)
- [ ] Деплой выполнен по нужному разделу `references/DEPLOY_GUIDE.md`
- [ ] Пост-проверки завершены и задокументированы
- [ ] При необходимости rollback выполнен и перепроверен

## Decision Tree: выбор сценария деплоя
Используй это дерево, чтобы быстро выбрать безопасный путь.

```text
START
  |
  |-- Пользователь явно указал режим?
  |     |-- Да -> mode = SiteOnly/AdminOnly/AppOnly/Full
  |     |-- Нет -> спроси режим и не деплой до ответа
  |
  |-- Есть непройденные тесты?
  |     |-- Да -> handoff в fb-test-gatekeeper
  |     |-- Нет -> дальше
  |
  |-- Есть schema changes?
  |     |-- Да -> handoff в fb-migrations-maintainer
  |     |-- Нет -> дальше
  |
  |-- Нужен rollback по бизнес-риску?
  |     |-- Да -> ветка Rollback
  |     |-- Нет -> deploy
  |
  |-- deploy завершен?
  |     |-- Нет -> логируй ошибку и решай rollback
  |     |-- Да -> пост-проверки
  |
  |-- пост-проверки зеленые?
        |-- Да -> релиз подтвержден
        |-- Нет -> rollback и повторная валидация
```

### Decision Tree: что делать при красных пост-проверках
1. Если `api/health != 200`, считай это P1 и готовь rollback.
2. Если главная страница `>=500`, считай это P1 и готовь rollback.
3. Если `/admin` недоступен после `AdminOnly`, rollback обязателен.
4. Если Telegram webhook упал после `AppOnly`, передай в `fb-telegram-incident-runbook`.
5. Если ошибки затрагивают только non-critical feature и есть бизнес-одобрение, допустим hotfix без rollback.

### Decision Tree: когда не делать rollback
1. Ошибка только в debug endpoint, не влияет на пользователей.
2. Ошибка воспроизводится только в тестовом домене, не в production.
3. Нет регрессии по основным сценариям, а alert ложноположительный.

Пример решения:
```text
Сценарий: /api/health=200, homepage=200, только warning в логах
Решение: rollback не нужен, релиз подтверждаем
```

## Операционные режимы и их контрольные точки
### SiteOnly
1. Проверь билд фронтенда.
2. Проверь загрузку статики.
3. Проверь cache headers.
4. Проверь главную страницу и 1-2 ключевых лендинга.

Пример:
```bash
curl -I https://example.com/_next/static/chunks/main.js
# Ожидаемый результат: 200 и корректный Cache-Control
```

### AdminOnly
1. Проверь `/admin`.
2. Проверь вход в админку.
3. Проверь минимум один mutate-flow с CSRF.
4. При `403` передай в `fb-admin-csrf-guard`.

### AppOnly
1. Проверь `api/health`.
2. Проверь 2-3 критичных API endpoint.
3. Проверь очередь/воркер, если есть.
4. Проверь Telegram webhook.

### Полный деплой
1. Выполни объединенный чек SiteOnly + AdminOnly + AppOnly.
2. Увеличь окно наблюдения логов до 10-15 минут.
3. Подтверди метрики ошибок до и после релиза.

## Anti-patterns и как исправлять
1. Anti-pattern: запуск деплоя без явного режима.
   Почему плохо: легко выкатывается лишний компонент.
   Исправление: всегда фиксируй `SiteOnly/AdminOnly/AppOnly/Full`.

2. Anti-pattern: skip тестов "потому что маленький change".
   Почему плохо: размер change не равен риску.
   Исправление: handoff в `fb-test-gatekeeper` и минимум quick run.

3. Anti-pattern: skip миграций при изменении модели.
   Почему плохо: код и схема расходятся, сервис падает.
   Исправление: handoff в `fb-migrations-maintainer`.

4. Anti-pattern: считать deploy successful только по exit code.
   Почему плохо: runtime проблемы проявляются позже.
   Исправление: всегда делай пост-проверки.

5. Anti-pattern: rollback "потом", когда станет хуже.
   Почему плохо: растет время деградации.
   Исправление: rollback сразу при провале критичных проверок.

6. Anti-pattern: не фиксировать версию релиза в отчете.
   Почему плохо: тяжело восстановить timeline инцидента.
   Исправление: сохраняй commit/tag и время UTC.

7. Anti-pattern: выполнять partial deploy, но проверять как full.
   Почему плохо: тратится время и пропускаются релевантные проверки.
   Исправление: используй mode-specific checklist.

8. Anti-pattern: менять две вещи сразу в одном релизе без необходимости.
   Почему плохо: сложно локализовать причину сбоя.
   Исправление: деплой атомарными шагами.

9. Anti-pattern: использовать непроверенные ad-hoc команды в production.
   Почему плохо: нет воспроизводимости.
   Исправление: действуй по `DEPLOY_GUIDE.md` и скриптам.

10. Anti-pattern: игнорировать предупреждения о CSRF после AdminOnly.
    Почему плохо: изменения из админки не сохраняются.
    Исправление: handoff в `fb-admin-csrf-guard`.

## Шаблоны отчетов
### Шаблон: pre-deploy brief
```text
[DEPLOY PRECHECK]
date_utc:
operator:
mode:
target_env:
commit_or_tag:
tests_status: pass/fail/not-run
migrations_status: needed/not-needed/applied
branch_sync: up-to-date/outdated
risk_level: low/medium/high
decision: proceed/block
```

### Шаблон: deploy execution log
```text
[DEPLOY EXECUTION]
mode:
start_time_utc:
steps:
1) build:
2) release:
3) restart:
exit_code:
artifacts_version:
```

### Шаблон: post-deploy validation
```text
[POST DEPLOY CHECKS]
homepage_http:
api_health_http:
api_health_body:
admin_http:
telegram_webhook:
logs_last_5m:
result: pass/fail
```

### Шаблон: rollback report
```text
[ROLLBACK REPORT]
trigger_reason:
failed_check:
rollback_target:
rollback_start_utc:
rollback_end_utc:
post_rollback_homepage:
post_rollback_api_health:
status: restored/not-restored
```

### Шаблон: handoff to another skill
```text
[HANDOFF]
from_skill: fb-deploy-operator
to_skill:
reason:
evidence:
required_outcome:
```

## Stop-conditions и эскалация
### Эскалация в человека
1. Два подряд неуспешных rollback.
2. Непредсказуемое поведение инфраструктуры (разные результаты одинаковых команд).
3. Потеря доступности > 5 минут на production.

### Стоп-условия для деплоя
1. Нет подтвержденного commit/tag.
2. Нет доступа к логам или health-check endpoint.
3. Не удалось определить режим деплоя.
4. Невозможно подтвердить, что ветка актуальна.

Пример:
```text
Стоп: branch_sync unknown -> deploy blocked until git fetch + comparison
```

## Готовые команды для быстрой диагностики
```bash
curl -s -o /dev/null -w "%{http_code}" https://example.com/
curl -s -o /dev/null -w "%{http_code}" https://example.com/api/health
curl -s https://example.com/api/health | rg "\"status\"\\s*:\\s*\"ok\""
```

Ожидаемый результат:
```text
200
200
"status":"ok"
```

## Формат финального ответа пользователю
1. Режим деплоя.
2. Версия (commit/tag).
3. Итог pre-check.
4. Итог post-check.
5. Нужен ли rollback.
6. Следующее действие.

Пример:
```text
Режим: AppOnly
Версия: 9d31f7a
Pre-check: pass
Post-check: fail (telegram webhook timeout)
Действие: handoff в fb-telegram-incident-runbook
```
