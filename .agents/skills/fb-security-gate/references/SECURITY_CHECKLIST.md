# Security Checklist

## Admin and Auth
1. `/api/admin/*` защищён auth
2. CSRF-контракт сохранён
3. session cookie flags корректны
4. `JWT_SECRET` не “временно” пропущен в prod path

## Public Inputs
1. Валидация входных данных
2. Abuse controls: captcha/rate limiting там, где нужны
3. Никакой опасной direct interpolation в SQL/HTML/email templates

## Integrations
1. Secrets не светятся в логах
2. Provider errors не раскрывают лишние детали наружу
3. Outbound URL/headers/tokens не управляются небезопасно user input

## Release and Infra
1. Security headers не ослаблены без причины
2. Docker/deploy/scripts не выводят лишние secrets
3. Sensitive changes получили post-deploy smoke
