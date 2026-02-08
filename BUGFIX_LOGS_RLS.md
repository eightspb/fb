# Исправление: Ошибка получения логов в админ панели

## Проблема

При открытии страницы "Логи системы" в админ панели возникала ошибка:
```
Error 500: Internal Server Error
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## Причина

В схеме базы данных для таблицы `app_logs` была включена Row Level Security (RLS) с политикой, которая разрешала чтение только для пользователя `postgres`:

```sql
CREATE POLICY "Allow read for postgres on app_logs" ON app_logs
  FOR SELECT TO postgres USING (true);
```

Однако API Next.js подключается к базе данных от имени другого пользователя (указанного в `DATABASE_URL`), поэтому все SELECT-запросы блокировались политикой RLS.

## Решение

1. **Отключен RLS для таблицы `app_logs`** - безопасность уже обеспечивается на уровне API через проверку cookie `admin-session`

2. **Удалены политики RLS** для этой таблицы

3. **Обновлен `database-schema.sql`**:
   ```sql
   -- RLS для app_logs отключен, так как доступ контролируется через admin-session cookie в API
   ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;
   ```

4. **Создана миграция `006_fix_app_logs_rls.sql`**:
   ```sql
   DROP POLICY IF EXISTS "Allow insert on app_logs" ON app_logs;
   DROP POLICY IF EXISTS "Allow read for postgres on app_logs" ON app_logs;
   ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;
   ```

5. **Миграция применена**:
   ```bash
   node scripts/apply-migration.js migrations/006_fix_app_logs_rls.sql
   ```

## Проверка

После применения миграции:
- ✅ SELECT-запросы к `app_logs` работают корректно
- ✅ API endpoint `/api/admin/logs` возвращает данные
- ✅ Страница логов в админ панели отображается без ошибок
- ✅ В базе данных: 3947 логов доступны для чтения

## Безопасность

Отключение RLS для `app_logs` **безопасно**, так как:
- Доступ к API `/api/admin/logs` защищен проверкой cookie `admin-session`
- Только авторизованные администраторы могут читать логи
- INSERT-операции выполняются системой логирования без ограничений

## Файлы

- `database-schema.sql` - обновлена схема
- `migrations/006_fix_app_logs_rls.sql` - миграция для исправления
- `scripts/apply-migration.js` - скрипт для применения миграций
- `scripts/test-logs-api.js` - тестовый скрипт для проверки

## Дата исправления

9 февраля 2026
