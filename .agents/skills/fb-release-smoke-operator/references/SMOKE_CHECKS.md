# Smoke Checks

## Universal
```bash
curl -I https://fibroadenoma.net/
curl -I https://fibroadenoma.net/admin
curl -s https://fibroadenoma.net/api/health
```

## Admin-focused
1. открыть `/admin/login`
2. подтвердить shell/навигацию
3. при mutate change проверить одно сохранение или related GET/update flow

## Site-focused
1. home page
2. одна затронутая страница (`/news`, `/conferences`, etc.)
3. при form changes - submit/success path

## DB/integration-focused
1. health endpoint
2. один сценарий, который читает/пишет затронутые данные
3. при external providers - использовать профильный integration skill
