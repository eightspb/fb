# Impact Matrix

| Scope | Skills | Tests | Deploy | Smoke |
| --- | --- | --- | --- | --- |
| `apps/admin/**` UI only | `fb-test-gatekeeper`, иногда `fb-admin-csrf-guard` | `type-check:admin`, lint, targeted unit/e2e | `admin` | `/admin`, login, relevant page |
| `src/app/api/admin/**` | `fb-admin-csrf-guard`, `fb-test-gatekeeper`, `fb-security-gate` | type-check, lint, unit, relevant e2e | `site` или `app` | `/api/health`, admin action |
| `migrations/**` | `fb-migrations-maintainer`, `fb-test-gatekeeper`, `fb-deploy-operator` | strict set, часто `test:ci` | `full` | DB-sensitive user flow |
| deploy/scripts/compose | `fb-deploy-operator`, `fb-release-smoke-operator` | lint + relevant validation | depends | `/`, `/admin`, `/api/health` |
| integrations/auth/secrets | `fb-env-secrets-keeper`, `fb-security-gate`, `fb-integrations-watchdog` | targeted + risk-based | depends | provider-specific |

## Rule of thumb
Если scope затрагивает больше одной high-risk зоны, не экономь на orchestration: сначала impact, потом tests/security/deploy.
