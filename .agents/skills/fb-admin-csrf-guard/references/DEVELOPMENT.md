# Development Notes: Admin CSRF

## Архитектура
1. `apps/admin` - отдельное Next.js приложение с `basePath=/admin`.
2. `src/app/api/admin/*` - backend маршруты, которые живут в `site`.
3. В development site proxy'т `/admin/*` на порт `3001`.

## Ключевые файлы
1. `apps/admin/src/lib/admin-csrf-fetch.ts` - основной wrapper
2. `apps/admin/src/lib/csrf-client.ts` - token fetch/refresh
3. `src/lib/csrf.ts` - общие константы
4. `src/app/api/csrf/route.ts` - выдача cookie/token
5. `src/app/api/admin/auth/route.ts` - admin session cookie

## Уже существующие тесты
1. `tests/unit/admin-csrf-fetch.test.ts`
2. `tests/unit/admin-csrf-client.test.ts`
3. `tests/unit/middleware.test.ts`
4. `tests/e2e/admin/auth.spec.ts`
5. `tests/e2e/admin/requests.spec.ts`
6. `tests/e2e/admin/contacts.spec.ts`

## Практический стандарт
1. По умолчанию используй `adminCsrfFetch`.
2. Raw `fetch` для `/api/admin/*` должен быть редким исключением.
3. Если трогаешь admin mutate-flow, почти всегда нужен хотя бы один targeted test.
