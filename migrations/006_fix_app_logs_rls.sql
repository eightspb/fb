-- Миграция: Отключение RLS для таблицы app_logs
-- Причина: RLS блокирует чтение логов через API, так как подключение происходит
-- не от пользователя postgres. Безопасность обеспечивается через admin-session cookie в API.

-- Удаляем существующие политики
DROP POLICY IF EXISTS "Allow insert on app_logs" ON app_logs;
DROP POLICY IF EXISTS "Allow read for postgres on app_logs" ON app_logs;

-- Отключаем RLS для таблицы app_logs
ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;
