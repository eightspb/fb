# Deploy Automation Notes

## Локальный script-first подход
Для этого репозитория основной операционный путь - bash scripts из репо.
GitHub Actions useful как CI и secondary deployment automation, но не как единственный знаниевый источник.

## Что синхронизировать при изменении релизного процесса
1. `README.md`
2. `docs/DEPLOY_GUIDE.md`
3. `scripts/README.md`
4. `.github/workflows/deploy.yml`
5. связанные project skills

## Safety rules
1. Не вводи новый deploy path без обновления docs и skills.
2. Не делай auto-deploy assumptions, если проект фактически деплоится локальным script flow.
3. Перед rollout mode changes проверь handoff в `fb-change-impact-gate` и `fb-test-gatekeeper`.
