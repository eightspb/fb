#!/bin/bash
set -e

echo "🔍 Проверка логов контейнеров..."

echo ""
echo "=== LOGS: APP (fb-net-app) ==="
docker logs fb-net-app --tail 50 2>/dev/null || echo "Контейнер fb-net-app не найден"

echo ""
echo "=== LOGS: DATABASE (fb-net-db) ==="
docker logs fb-net-db --tail 50 2>/dev/null || echo "Контейнер fb-net-db не найден"

echo ""
echo "📊 Текущий статус контейнеров:"
docker ps | grep -E "(fb-net-app|fb-net-db|fb-net-postgres)"











