# fb.net Testing Commands

## Основные команды
```bash
bun run type-check
bun run type-check:admin
bun run lint
bun run test:unit
bun run test:e2e
bun run docker:test
bun run test:ci
```

## Targeted examples
```bash
bunx vitest run tests/unit/admin-csrf-fetch.test.ts
bunx vitest run tests/unit/contact-upsert.test.ts
bunx playwright test tests/e2e/admin/auth.spec.ts
bunx playwright test tests/e2e/admin/requests.spec.ts
```

## Practical rules
1. `test:ci` - когда diff широкий или нужен максимально близкий к CI verdict
2. `type-check:admin` полезен даже без общего `type-check`, если scope = `apps/admin/**`
3. `docker:test` нужен в основном для контейнерного/DB-sensitive scope
