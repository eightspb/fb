---
name: fb-admin-csrf-guard
description: "Защищает от CSRF-ошибок в админке fibroadenoma.net. Активируй при любых изменениях admin UI/admin API, non-GET запросах к /api/admin/*, сохранении форм, массовых действиях, 403/forbidden при сохранении, упоминаниях csrf, x-csrf-token, getCsrfToken, refreshCsrfToken, adminCsrfFetch. Используй и перед финализацией admin-изменений, если нужно подтвердить полное CSRF-покрытие."
---

# fb-admin-csrf-guard

## Цель
Сохраняй единый контракт CSRF для всей админки.
В этом проекте `admin` - отдельное UI-приложение, а `/api/admin/*` обслуживает `site`, поэтому даже один забытый non-GET запрос ломает реальный рабочий сценарий.

## Что сначала читать
1. Используй этот `SKILL.md`.
2. Для точных project rules загрузи `references/AGENTS.md`.
3. Для архитектуры и ключевых файлов загрузи `references/DEVELOPMENT.md`.

## Репозиторный контракт
1. Для любого `POST/PUT/PATCH/DELETE` к `/api/admin/*` из client components отправляй `x-csrf-token`.
2. Источник токена: `apps/admin/src/lib/csrf-client.ts`.
3. Базовый helper: `apps/admin/src/lib/admin-csrf-fetch.ts`.
4. При `403` с CSRF-признаками делай ровно один retry через `refreshCsrfToken()`.
5. Не добавляй новые CSRF-exempt маршруты. Разрешён только текущий список из project rules.

## Рабочий процесс

### Шаг 1. Найди поверхность риска
Сначала собери все места, где админка мутирует данные.

```bash
rg -n "/api/admin/" apps/admin/src
rg -n "fetch\\(|adminCsrfFetch\\(|getCsrfToken\\(|refreshCsrfToken\\(" apps/admin/src
```

Сфокусируйся на:
1. `apps/admin/src/app/**/page.tsx`
2. `apps/admin/src/components/admin/*.tsx`
3. Любых raw `fetch`, которые обходят `adminCsrfFetch`

### Шаг 2. Предпочитай единый helper
Если это обычный admin mutate-flow, используй `adminCsrfFetch`.
Он уже умеет:
1. добавлять `x-csrf-token`
2. пропускать `GET/HEAD/OPTIONS`
3. делать single retry только при CSRF-ошибке
4. учитывать `basePath=/admin`

### Шаг 3. Если helper обойти нельзя, повтори контракт вручную
Допустимо только когда:
1. нужен нестандартный body/stream
2. нужен особый response parsing
3. нужен вызов вне стандартного wrapper path

Но даже тогда сохрани:
1. `credentials: "include"` при необходимости клиентского cookie-flow
2. `getCsrfToken()` перед первым запросом
3. `refreshCsrfToken()` перед единственным retry
4. retry только при реальной CSRF-сигнатуре

### Шаг 4. Проверь серверную сторону
Если менялся `src/app/api/admin/**`, убедись:
1. маршрут по-прежнему требует admin auth
2. middleware/route logic не ослабили CSRF-политику
3. exemption-список не расширился

Быстрая проверка:

```bash
rg -n "csrf|x-csrf-token|auth|verifyAdminSession|checkApiAuth" src/app/api/admin src/lib
```

### Шаг 5. Проведи финальный audit перед завершением
Минимум:
1. все mutate-вызовы `/api/admin/*` либо идут через `adminCsrfFetch`, либо воспроизводят его контракт
2. raw `fetch` не пропускает retry policy
3. в новых admin-формах нет “одноразового токена на mount”
4. exemption list не изменён

## Проверки
Минимальный набор зависит от масштаба изменений:
1. Helper/tests only: `bunx vitest run tests/unit/admin-csrf-fetch.test.ts tests/unit/admin-csrf-client.test.ts`
2. Admin page/component: добавь релевантный unit/e2e
3. Перед релизом admin UI: handoff в `fb-test-gatekeeper` и `fb-release-smoke-operator`

## Когда эскалировать
1. Нужен общий анализ риска изменений -> `fb-change-impact-gate`
2. Нужен выбор тестового набора -> `fb-test-gatekeeper`
3. Нужен security review шире CSRF -> `fb-security-gate`
4. Нужно подтвердить post-deploy сохранения в админке -> `fb-release-smoke-operator`

## Anti-patterns
1. Читать CSRF cookie один раз при загрузке страницы.
2. Делать retry на любой `403`.
3. Делать больше одного retry.
4. Дублировать retry-логику в каждом компоненте вместо общего helper.
5. Добавлять новый exemption, чтобы “быстро починить”.

## Готовый вердикт
После аудита выдай краткий результат в формате:

```text
[CSRF AUDIT]
scope:
admin_mutations_found:
covered_by_adminCsrfFetch:
raw_fetch_exceptions:
new_exemptions_added: no
tests_recommended:
release_risk: low/medium/high
```
