# Project Rules: Admin API Safety

Используй эту выжимку как source of truth для CSRF-контракта.

## Обязательные правила
1. Для любого non-GET запроса к `/api/admin/*` из client components отправляй `x-csrf-token`.
2. Источник токена: `getCsrfToken()` из `apps/admin/src/lib/csrf-client.ts`.
3. Если ответ `403` и тело указывает на CSRF-проблему, повтори запрос ровно один раз с `refreshCsrfToken()`.
4. Не добавляй новые CSRF exemptions без явного approve.

## Разрешённые exemptions
1. `/api/admin/auth`
2. `/api/admin/banner`
3. `/api/admin/email-templates`
4. `/api/admin/direct`

## Pre-deploy правило
Перед финализацией admin UI changes проверь, что каждый `POST/PUT/PATCH/DELETE` к `/api/admin/*` покрыт CSRF-handling.
