# Deploy Scripts Reference

## Основные entrypoints
1. `bash scripts/deploy.sh app`
2. `bash scripts/deploy.sh site`
3. `bash scripts/deploy.sh admin`
4. `bash scripts/deploy.sh full`

## Low-level entrypoint
1. `bash scripts/deploy-from-github.sh --app-only`
2. `bash scripts/deploy-from-github.sh --site-only`
3. `bash scripts/deploy-from-github.sh --admin-only`
4. `bash scripts/deploy-from-github.sh`

## Полезные соседние скрипты
1. `bash scripts/backup-database.sh`
2. `bash scripts/clear-server-caches.sh`
3. `bash scripts/fix-telegram-now.sh`
4. `bash scripts/diagnose-telegram.sh`
