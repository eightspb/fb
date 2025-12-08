#!/bin/bash
set -e
cd /opt/fibroadenoma.net

echo "🔒 ВКЛЮЧЕНИЕ RLS (Восстановление безопасности)..."

docker exec -i fb-net-db psql -U supabase_admin -d postgres <<EOF
-- Включаем RLS обратно
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
EOF

echo "✅ RLS включен обратно. Безопасность восстановлена."

