# Скрипт для применения миграции на сервере
param(
    [Parameter(Mandatory=$false)]
    [string]$Server = "root@155.212.217.60",
    
    [Parameter(Mandatory=$false)]
    [string]$RemotePath = "/opt/fb-net",
    
    [Parameter(Mandatory=$false)]
    [string]$ComposeFile = "docker-compose.ssl.yml"
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Проверка и применение миграции 006_fix_app_logs_rls ===" -ForegroundColor Cyan

# Проверяем, применена ли миграция
Write-Host "`n1. Проверка применённых миграций..." -ForegroundColor Yellow
ssh $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T postgres psql -U postgres -d postgres -tA -c ""SELECT name FROM schema_migrations WHERE name = '006_fix_app_logs_rls';"""

$migrationExists = $LASTEXITCODE -eq 0

if ($migrationExists) {
    Write-Host "   Миграция уже применена" -ForegroundColor Green
} else {
    Write-Host "   Миграция НЕ применена, применяем..." -ForegroundColor Yellow
    
    # Применяем миграцию
    Write-Host "`n2. Применение миграции..." -ForegroundColor Yellow
    ssh $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f migrations/006_fix_app_logs_rls.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Миграция применена успешно" -ForegroundColor Green
        
        # Добавляем запись в schema_migrations
        ssh $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T postgres psql -U postgres -d postgres -c ""INSERT INTO schema_migrations (name) VALUES ('006_fix_app_logs_rls');"""
    } else {
        Write-Host "   ❌ Ошибка при применении миграции" -ForegroundColor Red
        exit 1
    }
}

# Проверяем статус RLS для app_logs
Write-Host "`n3. Проверка статуса RLS для таблицы app_logs..." -ForegroundColor Yellow
ssh $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T postgres psql -U postgres -d postgres -c ""SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'app_logs';"""

# Проверяем политики RLS
Write-Host "`n4. Проверка политик RLS..." -ForegroundColor Yellow  
ssh $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T postgres psql -U postgres -d postgres -c ""SELECT * FROM pg_policies WHERE tablename = 'app_logs';"""

# Тестируем SELECT запрос
Write-Host "`n5. Тест SELECT запроса (получение последних 3 логов)..." -ForegroundColor Yellow
ssh $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T postgres psql -U postgres -d postgres -c ""SELECT id, level, LEFT(message, 50) as message_preview, created_at FROM app_logs ORDER BY created_at DESC LIMIT 3;"""

Write-Host "`n=== Проверка завершена ===" -ForegroundColor Green
Write-Host "Теперь откройте https://fibroadenoma.net/admin/logs и проверьте работу страницы логов`n"
