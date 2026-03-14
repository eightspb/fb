# Test Notes and Rerun Policy

## Канонический rerun policy
1. Сначала убедись, что fail совпадает с diff scope.
2. Один rerun допустим при явном infra flake.
3. Второй одинаковый fail = regression/problem until proven otherwise.

## Что считать infra flake
1. временная недоступность Docker engine
2. одноразовая ошибка запуска webServer в Playwright
3. transient network issue без связи с изменённым кодом

## Что НЕ считать flake по умолчанию
1. падение admin e2e после правок admin UI/API
2. падение unit в изменённом `src/lib/**`
3. падение schema-sensitive тестов после новых миграций

## На данный момент
Подтвержденного централизованного списка “known flaky” в репо нет.
Если появится стабильный pattern, обновляй этот reference-файл, а не держи знание в памяти.
