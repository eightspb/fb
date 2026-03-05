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

# Тесты в Docker
bun run docker:test
bun run docker:test:down
```

## Когда использовать

- Нужна быстрая локальная проверка: `bun run test:unit`
- Нужно прогнать путь пользователя целиком: `bun run test:e2e`
- Нужна максимально близкая к CI проверка: `bun run test:ci`
- Нужна изоляция окружения: `bun run docker:test`
