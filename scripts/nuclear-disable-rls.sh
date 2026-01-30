#!/bin/bash
set -e
cd /opt/fibroadenoma.net

echo "💣 ЯДЕРНЫЙ ВАРИАНТ ОТКЛЮЧЕНИЯ RLS..."

# 1. Отключаем RLS
docker exec -i fb-net-db psql -U supabase_admin -d postgres <<EOF
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
-- Удаляем все политики на всякий случай
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access" ON storage.objects;
EOF

# 2. Перезапускаем Storage (возможно, он кеширует политики)
echo "🔄 Перезапуск контейнера Storage..."
docker restart fb-net-storage
sleep 5

# 3. Проверяем статус
echo "🕵️‍♂️ Проверка RLS:"
docker exec -i fb-net-db psql -U supabase_admin -d postgres -c "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename IN ('objects', 'buckets');
"

echo "✅ Попробуйте миграцию сейчас."











