# Тестирование (быстрый гайд)

Краткая памятка по командам. Полное руководство: [TESTING.md](./TESTING.md).

## Быстрый старт

```bash
bun install
bun run test:ci
```

`test:ci` запускает:
- `bun run type-check`
- `bun run lint`
- `bun run test:unit`
- `bun run test:e2e`

Примечания:
- `lint` сейчас проходит с предупреждениями, но без ошибок.
- `test:e2e` сам поднимает `site` на `3000` и `admin` на `3001`.
- `tests/e2e/database.spec.ts` автоматически пропускается, если Docker/Testcontainers недоступны.

## Часто используемые команды

```bash
# Unit
bun run test:unit
bun run test:unit:watch
bun run test:unit:coverage

# E2E
bun run test:e2e
bun run test:e2e:ui
bun run test:e2e:debug

# Покрытие unit-тестов
bun run test:unit:coverage

# Тесты в Docker
bun run docker:test
bun run docker:test:down
```

Актуальный E2E-набор для админки:
- `tests/e2e/fixtures.ts` - авторизация через API без captcha
- `tests/e2e/admin/auth.spec.ts`
- `tests/e2e/admin/dashboard.spec.ts`
- `tests/e2e/admin/requests.spec.ts`
- `tests/e2e/admin/contacts.spec.ts`
- `tests/e2e/auth.spec.ts` - старый сценарий авторизации, оставлен отдельно
- `tests/e2e/database.spec.ts` - интеграция с БД

## Когда использовать

- Нужна быстрая локальная проверка: `bun run test:unit`
- Нужно проверить порог покрытия: `bun run test:unit:coverage`
- Нужно прогнать путь пользователя целиком: `bun run test:e2e`
- Нужна максимально близкая к CI проверка: `bun run test:ci`
- Нужна изоляция окружения: `bun run docker:test`

Если `bun run docker:test` падает сразу на старте, сначала проверьте, что запущен Docker engine / Docker Desktop.
