#!/bin/bash
# Скрипт для установки паролей пользователей Supabase
# Выполняется после инициализации БД

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"

psql -U supabase_admin -d postgres <<EOF
-- Устанавливаем пароли для всех пользователей Supabase
ALTER USER supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
ALTER USER authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
ALTER USER supabase_storage_admin WITH PASSWORD '$POSTGRES_PASSWORD';

-- Проверяем, что пользователи существуют
SELECT rolname FROM pg_roles WHERE rolname IN ('supabase_auth_admin', 'authenticator', 'supabase_storage_admin', 'anon', 'authenticated');
EOF

echo "Пароли пользователей установлены"

