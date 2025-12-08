#!/bin/bash
set -e

echo "🔍 Проверка логов Auth и Storage..."

echo ""
echo "=== LOGS: AUTH (fb-net-auth) ==="
docker logs fb-net-auth --tail 50

echo ""
echo "=== LOGS: STORAGE (fb-net-storage) ==="
docker logs fb-net-storage --tail 50

echo ""
echo "📊 Текущий статус контейнеров:"
docker ps | grep -E "(storage|auth)"

