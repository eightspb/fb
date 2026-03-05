# QUICK_START (TODO)

## Назначение
Минимальный сценарий деплоя за 5-10 минут для опытного оператора.

## Что заполнить
- TODO: 1 команда pre-flight.
- TODO: 1 команда deploy.
- TODO: 3 обязательные post-checks.
- TODO: 1 команда rollback.

## Пример структуры
```bash
./scripts/run-tests.sh --quick
./scripts/deploy.sh -AppOnly
curl -s https://example.com/api/health
./scripts/deploy.sh --rollback previous-stable
```

