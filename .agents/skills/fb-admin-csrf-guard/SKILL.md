---
name: fb-admin-csrf-guard
description: "Защищает от CSRF-ошибок при работе с админ-панелью fibroadenoma.net. Активируй при любых изменениях в admin UI или admin API: POST, PUT, PATCH, DELETE к /api/admin/*, сохранение настроек, создание/редактирование/удаление сущностей, массовые действия, формы в админке. Также активируй при упоминании: 'csrf', 'токен', 'x-csrf-token', '403 в админке', 'forbidden в admin', 'ошибка при сохранении в админке', 'не сохраняется в админке', 'retry after 403', 'refresh csrf token'. Если пользователь получает 403 при работе с админ-панелью, почти всегда проверь этот скил первым."
---

# fb-admin-csrf-guard

## Цель
Гарантируй, что каждый мутирующий запрос к `/api/admin/*` проходит с корректным CSRF-токеном.
Делай это обязательно, потому что без `x-csrf-token` сервер вернёт `403` и изменения не применятся.

## Прогрессивная загрузка (не читай всё сразу)
1. Сначала используй этот `SKILL.md`.
2. Для проектных правил безопасности загрузи `references/AGENTS.md`.
3. Для контекста по кодстайлу/архитектуре фронтенда загрузи `references/DEVELOPMENT.md`.
4. Загружай только нужный файл, когда появляется соответствующий вопрос.

## Критичные проектные правила (обязательные)
1. Для любого `POST/PUT/PATCH/DELETE` к `/api/admin/*` из клиентского компонента отправляй заголовок `x-csrf-token`.
2. Бери токен через `getCsrfToken()` из `src/lib/csrf-client.ts`.
3. Если ответ `403` с CSRF-сообщением, повтори запрос ровно один раз с `refreshCsrfToken()`.
4. Утвержденные CSRF-exempt пути в middleware: `/api/admin/auth`, `/api/admin/banner`, `/api/admin/email-templates`, `/api/admin/direct`.
5. Не добавляй новые CSRF-exempt маршруты без явного одобрения.

## Алгоритм работы

### Шаг 1. Найди все мутирующие admin-запросы
Сначала найди поверхность риска, потому что точечный фикс без полного покрытия часто оставляет скрытые 403.

Пример:
```bash
rg -n "fetch\\(|axios\\.|\\.post\\(|\\.put\\(|\\.patch\\(|\\.delete\\(" src
```

Потом отфильтруй `/api/admin/`:
```bash
rg -n "/api/admin/" src
```

Ожидаемый результат:
```text
Список всех мест, где есть non-GET запросы к /api/admin/*
```

### Шаг 2. Добавь CSRF в каждый non-GET запрос
Добавь `x-csrf-token`, потому что серверная защита отклоняет такие запросы без валидного токена.

Пример для клиентского `fetch`:
```ts
import { getCsrfToken, refreshCsrfToken } from "@/lib/csrf-client";

async function adminPost(url: string, payload: unknown) {
  let token = await getCsrfToken();

  let res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": token,
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (res.status === 403) {
    const bodyText = await res.text();
    const csrfRejected = /csrf|token/i.test(bodyText);
    if (csrfRejected) {
      token = await refreshCsrfToken();
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": token,
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });
    }
  }

  return res;
}
```

Ожидаемый результат:
```text
Первый запрос может вернуть 403, второй после refresh должен вернуть 200/201/204 при валидной сессии.
```

### Шаг 3. Реализуй retry-стратегию корректно
Повторяй только один раз, потому что бесконечный retry скрывает реальную проблему авторизации.

Правила:
1. Retry только при `403` и CSRF-признаках в ответе.
2. Retry ровно один раз.
3. При повторном `403` считай причину не-CSRF и проверяй auth/session/cookies.

Пример ожидаемого лога:
```text
admin save -> 403 csrf expired -> refresh token -> retry -> 200
```

### Шаг 4. Учитывай CSRF-exempt маршруты без расширения списка
Не добавляй новые исключения, потому что это расширяет поверхность CSRF-риска.

Разрешенные исключения:
1. `/api/admin/auth`
2. `/api/admin/banner`
3. `/api/admin/email-templates`
4. `/api/admin/direct`

Пример верификации:
```bash
rg -n "csrf|exempt|/api/admin" middleware.ts
```

### Шаг 5. Проведи аудит перед финализацией
Сделай финальный аудит, потому что даже один забытый endpoint ломает пользовательский сценарий.

Чеклист:
- [ ] У каждого `POST/PUT/PATCH/DELETE` к `/api/admin/*` есть `x-csrf-token`
- [ ] Токен получен через `getCsrfToken()` перед запросом
- [ ] Реализован single retry через `refreshCsrfToken()`
- [ ] Нет новых CSRF-exempt роутов

Пример:
```bash
rg -n "/api/admin/|x-csrf-token|getCsrfToken|refreshCsrfToken" src middleware.ts
```

## Идемпотентность
1. Повторный запуск аудита не должен менять код без причины.
2. Повторный запуск запроса после refresh допускается только один раз.
3. Повторное применение правки не должно дублировать заголовки.

Пример проверки на дубли:
```bash
rg -n "\"x-csrf-token\"\\s*:\\s*token" src
# Ожидаемо: в каждом вызове один заголовок x-csrf-token
```

## Взаимодействие с другими скилами
1. Если обнаружено, что задача вышла за рамки CSRF и перешла в релизный процесс, передай управление скилу `fb-deploy-operator` — он лучше справится с деплой-процедурой.
2. Если обнаружено, что нужно проверять качество перед merge/deploy, передай управление скилу `fb-test-gatekeeper` — он лучше справится с тестовой матрицей.

## Когда НЕ использовать этот скил
1. Только `GET` запросы к admin API: CSRF заголовок не требуется.
2. Публичные API вне `/api/admin/*`: используй их собственные auth-правила.
3. Изменения схемы БД: используй `fb-migrations-maintainer`.
4. Инциденты Telegram-бота: используй `fb-telegram-incident-runbook`.

## Decision Tree: обработка admin-запроса
```text
START
  |
  |-- URL начинается с /api/admin/ ?
  |     |-- Нет -> этот скил не нужен
  |     |-- Да -> дальше
  |
  |-- Метод GET?
  |     |-- Да -> CSRF header не обязателен
  |     |-- Нет -> CSRF обязателен
  |
  |-- Добавлен x-csrf-token из getCsrfToken()?
  |     |-- Нет -> добавь и повтори
  |     |-- Да -> отправь запрос
  |
  |-- Ответ 2xx?
  |     |-- Да -> success
  |     |-- Нет -> анализируй код
  |
  |-- Ответ 403 и признаки CSRF?
  |     |-- Да -> refreshCsrfToken() + один retry
  |     |-- Нет -> проверяй auth/session/permissions
  |
  |-- После retry снова 403?
        |-- Да -> это не CSRF-only, эскалируй auth
        |-- Нет -> success
```

### Decision Tree: 401 vs 403
1. `401` обычно означает отсутствие/истечение сессии.
2. `403` с CSRF-признаками означает просроченный/невалидный токен.
3. `403` без CSRF-признаков обычно означает policy/permission issue.

Пример интерпретации:
```text
HTTP 403 + body "CSRF token mismatch" -> refresh token + single retry
HTTP 403 + body "insufficient role" -> проверка ролей, не CSRF
```

### Decision Tree: exemptions
1. Если endpoint входит в утвержденный список exemptions, не добавляй новые исключения вокруг него.
2. Если endpoint не входит в список и mutate, CSRF обязателен.
3. Если кто-то просит добавить exemption на новый route, блокируй и проси явное approve.

## Стандарт внедрения в клиентском коде
1. Вынеси вызов в общий helper, чтобы не дублировать retry-логику.
2. Убедись, что helper принимает метод/url/body.
3. Убедись, что helper всегда использует `credentials: "include"`.
4. Убедись, что helper не ретраит бесконечно.

Пример контракта helper:
```ts
type AdminMethod = "POST" | "PUT" | "PATCH" | "DELETE";
async function adminMutate(method: AdminMethod, url: string, body?: unknown): Promise<Response>;
```

## Anti-patterns и как исправлять
1. Anti-pattern: токен читается один раз при старте приложения.
   Почему плохо: токен устаревает.
   Исправление: бери токен непосредственно перед mutate-запросом.

2. Anti-pattern: retry на любой 403.
   Почему плохо: скрывает permission-problem.
   Исправление: retry только при CSRF-сигнатуре.

3. Anti-pattern: два и более retry.
   Почему плохо: растет задержка и шум в логах.
   Исправление: ровно один retry.

4. Anti-pattern: отсутствие `credentials: include`.
   Почему плохо: сессионные куки не уходят.
   Исправление: добавляй credentials во все admin fetch.

5. Anti-pattern: частичное покрытие endpoint-ов.
   Почему плохо: часть действий в UI продолжит падать с 403.
   Исправление: делай полный audit по `/api/admin/`.

6. Anti-pattern: хардкод CSRF-токена в коде.
   Почему плохо: утечка и невалидные запросы.
   Исправление: только `getCsrfToken()`/`refreshCsrfToken()`.

7. Anti-pattern: расширение exemption-списка без approve.
   Почему плохо: повышает CSRF-risk.
   Исправление: не добавляй новые exemptions.

8. Anti-pattern: игнорирование текста ответа сервера.
   Почему плохо: не различаешь CSRF и auth failure.
   Исправление: анализируй response body/message.

9. Anti-pattern: отдельная реализация retry в каждом компоненте.
   Почему плохо: дрейф поведения и баги.
   Исправление: единый helper.

10. Anti-pattern: нет финального pre-deploy CSRF-аудита.
    Почему плохо: баг уходит в production.
    Исправление: обязательный чеклист перед финализацией.

## Аудит покрытия: обязательный протокол
1. Найди все mutate-вызовы на `/api/admin/*`.
2. Для каждого места зафиксируй:
   - файл
   - метод
   - наличие `x-csrf-token`
   - наличие single-retry
3. Сформируй таблицу покрытия.

Шаблон таблицы:
```text
file | method | endpoint | csrf_header | retry_once | status
```

Пример:
```text
src/app/admin/users/page.tsx | PATCH | /api/admin/users/1 | yes | yes | ok
```

## Шаблоны отчетов
### Шаблон: CSRF audit report
```text
[CSRF AUDIT]
date_utc:
scope:
total_admin_mutations:
covered_with_header:
covered_with_retry:
uncovered_endpoints:
new_exemptions_added: no
result: pass/fail
```

### Шаблон: 403 incident analysis
```text
[ADMIN 403 ANALYSIS]
endpoint:
method:
status_code:
response_excerpt:
csrf_detected: yes/no
retry_attempted: yes/no
retry_result:
root_cause:
next_action:
```

### Шаблон: code-change summary
```text
[CSRF CODE CHANGES]
files_touched:
common_helper_created: yes/no
legacy_calls_replaced:
known_risks:
tests_executed:
final_status:
```

### Шаблон: handoff в deploy skill
```text
[HANDOFF]
from_skill: fb-admin-csrf-guard
to_skill: fb-deploy-operator
reason: CSRF fixes ready for release validation
required_checks: admin mutate flows + post-deploy admin smoke
```

## Stop-conditions
1. Нет доступа к `src/lib/csrf-client.ts` и невозможно подтвердить API контракты.
2. Нельзя найти все места mutate-запросов из-за broken build/index.
3. Пользователь просит добавить новый exemption без approve.

Пример stop-ответа:
```text
Остановлено: requested new /api/admin/* exemption without approval.
```

## Готовые команды для быстрой диагностики
```bash
rg -n "/api/admin/" src
rg -n "POST|PUT|PATCH|DELETE" src
rg -n "x-csrf-token|getCsrfToken|refreshCsrfToken" src
```

## Критерии готовности к merge/deploy
1. 100% mutate endpoint-ов `/api/admin/*` покрыты CSRF header.
2. 100% покрытых endpoint-ов имеют single retry на CSRF-403.
3. Нет новых exemptions.
4. Есть краткий audit report.

## Формат финального ответа пользователю
1. Что проверено.
2. Что исправлено.
3. Что осталось риском.
4. Можно ли мержить/деплоить.

Пример:
```text
Проверено 14 mutate endpoint-ов /api/admin/*
Исправлено 3 места без x-csrf-token и 2 места без retry
Новых exemptions не добавлено
Вердикт: можно мержить, рекомендован admin smoke после деплоя
```
