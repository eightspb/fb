# Deploy Quick Start

## 90% случаев
Если нет schema changes:

```bash
bash scripts/deploy.sh app
```

## Когда использовать другие режимы
1. Только admin UI -> `bash scripts/deploy.sh admin`
2. Только site/API/runtime -> `bash scripts/deploy.sh site`
3. Есть миграции БД -> `bash scripts/deploy.sh full`

## Быстрый pre-flight
```bash
git status --short
git rev-parse --abbrev-ref HEAD
```

## Быстрый post-check
```bash
curl -I https://fibroadenoma.net/
curl -I https://fibroadenoma.net/admin
curl -s https://fibroadenoma.net/api/health
```

Если затронуты admin mutate-flow, после деплоя добавь quick save/smoke через `fb-release-smoke-operator`.
