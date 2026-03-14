# Deploy Guide

## Поддерживаемый путь
1. Локально запускай `bash scripts/deploy.sh <mode>`.
2. `deploy.sh` - короткий entrypoint поверх `deploy-from-github.sh`.
3. При необходимости используй `deploy-from-github.sh` напрямую для `--branch`, `--skip-backup`, `--skip-migrations`.

## Режимы
1. `app` - `site + admin`, без миграций БД
2. `site` - только `site`
3. `admin` - только `admin`
4. `full` - полный деплой с миграциями

## Ключевая особенность архитектуры
Даже если менялся только `/api/admin/*`, это backend `site`, а не `admin`.
Значит такой change нельзя деплоить режимом `admin`.

## Post-checks
1. `https://fibroadenoma.net/`
2. `https://fibroadenoma.net/admin`
3. `https://fibroadenoma.net/api/health`
4. при интеграционных изменениях: точечный smoke по нужной зоне

## Что делает low-level script
`scripts/deploy-from-github.sh` умеет:
1. выбирать режим `--app-only/--site-only/--admin-only`
2. делать backup в full mode
3. применять миграции
4. выполнять post-checks
5. перезапускать nginx

## Чего не обещать
1. Не заявляй про универсальный one-click rollback в supported local flow.
2. Не меняй вручную compose path без необходимости.
3. Не обходи post-checks.
