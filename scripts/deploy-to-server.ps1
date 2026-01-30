# PowerShell скрипт для деплоя на Windows (для локального запуска)
# Использование: .\scripts\deploy-to-server.ps1 user@server [/opt/fb-net]

param(
    [Parameter(Mandatory=$true)]
    [string]$Server,
    
    [Parameter(Mandatory=$false)]
    [string]$RemotePath = "/opt/fb-net"
)

$ErrorActionPreference = "Stop"

# Цвета для вывода
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Blue }
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }

# Конфигурация
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = "docker-compose.production.yml"
$BackupDir = Join-Path $ProjectRoot "backups"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Создание директории для бэкапов
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Функция для создания бэкапа базы данных
function Backup-Database {
    Write-Info "💾 Создание бэкапа базы данных..."
    
    $dbContainer = ssh $Server "cd $RemotePath && docker compose -f $ComposeFile ps -q supabase 2>/dev/null || echo 'fb-net-supabase-db-prod'"
    
    if ([string]::IsNullOrWhiteSpace($dbContainer)) {
        Write-Warning "Контейнер БД не найден, пропускаем бэкап"
        return $true
    }
    
    $backupFile = Join-Path $BackupDir "db_backup_$Timestamp.sql"
    
    # Создаем бэкап на сервере
    ssh $Server "cd $RemotePath && docker exec $dbContainer pg_dump -U postgres -d postgres --clean --if-exists" | Out-File -FilePath $backupFile -Encoding UTF8
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $backupFile) -and (Get-Item $backupFile).Length -gt 0) {
        $size = (Get-Item $backupFile).Length / 1KB
        Write-Success "Бэкап создан: $backupFile ($([math]::Round($size, 2)) KB)"
        return $true
    } else {
        Write-Error "Ошибка при создании бэкапа"
        return $false
    }
}

# Функция для проверки примененных миграций
function Test-MigrationApplied {
    param([string]$MigrationFile)
    
    $migrationName = [System.IO.Path]::GetFileNameWithoutExtension($MigrationFile)
    
    # Проверяем наличие таблицы для отслеживания миграций
    $tableExists = ssh $Server "cd $RemotePath && docker exec `$(docker compose -f $ComposeFile ps -q supabase) psql -U postgres -d postgres -tAc \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_migrations');\""
    
    if ($LASTEXITCODE -ne 0) {
        # Таблица не существует, создаем её
        $createTable = @"
CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"@
        ssh $Server "cd $RemotePath && docker exec -i `$(docker compose -f $ComposeFile ps -q supabase) psql -U postgres -d postgres" | Out-String -InputObject $createTable
    }
    
    # Проверяем, применена ли миграция
    $applied = ssh $Server "cd $RemotePath && docker exec `$(docker compose -f $ComposeFile ps -q supabase) psql -U postgres -d postgres -tAc \"SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE name = '$migrationName');\""
    
    return $applied -eq "t"
}

# Функция для применения миграции
function Apply-Migration {
    param([string]$MigrationFile)
    
    $migrationName = [System.IO.Path]::GetFileNameWithoutExtension($MigrationFile)
    Write-Info "📝 Применение миграции: $migrationName"
    
    # Проверяем, применена ли уже миграция
    if (Test-MigrationApplied -MigrationFile $MigrationFile) {
        Write-Warning "Миграция $migrationName уже применена, пропускаем"
        return $true
    }
    
    # Применяем миграцию
    $migrationContent = Get-Content $MigrationFile -Raw
    $markMigration = "INSERT INTO schema_migrations (name) VALUES ('$migrationName') ON CONFLICT (name) DO NOTHING;"
    
    $fullCommand = $migrationContent + "`n" + $markMigration
    
    ssh $Server "cd $RemotePath && docker exec -i `$(docker compose -f $ComposeFile ps -q supabase) psql -U postgres -d postgres" | Out-String -InputObject $fullCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Миграция $migrationName применена"
        return $true
    } else {
        Write-Error "Ошибка при применении миграции $migrationName"
        return $false
    }
}

# Функция для проверки изображений в БД
function Check-ImagesInDb {
    Write-Info "🔍 Проверка изображений в базе данных..."
    
    $dbContainer = ssh $Server "cd $RemotePath && docker compose -f $ComposeFile ps -q supabase 2>/dev/null || echo 'fb-net-supabase-db-prod'"
    
    if ([string]::IsNullOrWhiteSpace($dbContainer)) {
        Write-Warning "Контейнер БД не найден, пропускаем проверку"
        return $true
    }
    
    $imagesWithoutData = ssh $Server "cd $RemotePath && docker exec $dbContainer psql -U postgres -d postgres -tAc \"SELECT COUNT(*) FROM news_images WHERE image_data IS NULL;\""
    
    if ($imagesWithoutData -and [int]$imagesWithoutData -gt 0) {
        Write-Warning "Найдено $imagesWithoutData изображений без данных в БД"
        Write-Warning "Эти изображения не будут отображаться, так как приложение использует только изображения из БД"
        Write-Warning "Рекомендуется запустить миграцию изображений перед деплоем"
        $confirm = Read-Host "Продолжить деплой? (yes/no)"
        if ($confirm -ne "yes") {
            Write-Error "Деплой отменен"
            exit 1
        }
    } else {
        Write-Success "Все изображения имеют данные в БД"
    }
    
    return $true
}

# Функция для загрузки файлов на сервер
function Upload-Files {
    Write-Info "📤 Загрузка файлов на сервер..."
    
    # Используем rsync через WSL или напрямую если установлен
    # ВАЖНО: public/images/trainings исключена, так как изображения хранятся только в БД
    $excludes = @(
        "node_modules",
        ".next",
        ".git",
        "backups",
        "*.log",
        ".env*",
        "!.env.example",
        "public/images/trainings",
        "public/images/trainings/**",
        ".DS_Store",
        "*.tsbuildinfo"
    )
    
    $excludeArgs = $excludes | ForEach-Object { "--exclude=$_" }
    
    # Проверяем наличие rsync
    if (Get-Command rsync -ErrorAction SilentlyContinue) {
        rsync -avz --progress $excludeArgs "$ProjectRoot/" "${Server}:${RemotePath}/"
    } elseif (Get-Command wsl -ErrorAction SilentlyContinue) {
        # Используем rsync через WSL
        $wslPath = wsl wslpath -a $ProjectRoot
        wsl rsync -avz --progress $excludeArgs "$wslPath/" "${Server}:${RemotePath}/"
    } else {
        Write-Error "rsync не найден. Установите rsync или используйте WSL."
        Write-Info "Альтернатива: используйте bash скрипт deploy-to-server.sh через WSL или Git Bash"
        return $false
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Файлы загружены"
        Write-Info "⚠️  Папка public/images/trainings не загружена (изображения хранятся только в БД)"
        return $true
    } else {
        Write-Error "Ошибка при загрузке файлов"
        return $false
    }
}

# Функция для перезапуска контейнеров
function Restart-Containers {
    Write-Info "🔄 Перезапуск Docker контейнеров..."
    
    ssh $Server "cd $RemotePath && docker compose -f $ComposeFile down"
    Start-Sleep -Seconds 2
    ssh $Server "cd $RemotePath && docker compose -f $ComposeFile up -d --build"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Контейнеры перезапущены"
        Write-Info "⏳ Ожидание запуска контейнеров..."
        Start-Sleep -Seconds 10
        ssh $Server "cd $RemotePath && docker compose -f $ComposeFile ps"
        return $true
    } else {
        Write-Error "Ошибка при перезапуске контейнеров"
        return $false
    }
}

# Функция для применения всех миграций
function Apply-Migrations {
    Write-Info "📦 Применение миграций базы данных..."
    
    $migrationsDir = Join-Path $ProjectRoot "migrations"
    
    if (-not (Test-Path $migrationsDir)) {
        Write-Warning "Директория миграций не найдена, пропускаем"
        return $true
    }
    
    $migrations = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name
    
    foreach ($migration in $migrations) {
        if (-not (Apply-Migration -MigrationFile $migration.FullName)) {
            Write-Error "Ошибка при применении миграций. Бэкап сохранен в $BackupDir"
            exit 1
        }
    }
    
    Write-Success "Все миграции применены"
}

# Основной процесс деплоя
function Main {
    Write-Host ""
    Write-Info "═══════════════════════════════════════════════════════"
    Write-Info "           ДЕПЛОЙ НА ПРОДАКШН СЕРВЕР"
    Write-Info "═══════════════════════════════════════════════════════"
    Write-Host ""
    
    # Проверка подключения
    Write-Info "🔌 Проверка подключения к серверу..."
    $testConnection = ssh -o ConnectTimeout=5 $Server "echo 'Connection OK'" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Не удалось подключиться к серверу $Server"
        exit 1
    }
    Write-Success "Подключение установлено"
    
    # Шаг 1: Создание бэкапа
    if (-not (Backup-Database)) {
        Write-Error "Не удалось создать бэкап. Деплой отменен."
        exit 1
    }
    
    # Шаг 2: Проверка изображений в БД
    Check-ImagesInDb
    
    # Шаг 3: Загрузка файлов
    if (-not (Upload-Files)) {
        Write-Error "Не удалось загрузить файлы. Деплой отменен."
        exit 1
    }
    
    # Шаг 4: Применение миграций
    Apply-Migrations
    
    # Шаг 5: Перезапуск контейнеров
    if (-not (Restart-Containers)) {
        Write-Error "Не удалось перезапустить контейнеры."
        Write-Warning "Бэкап сохранен в $BackupDir"
        Write-Warning "Вы можете восстановить базу данных командой:"
        Write-Warning "  Get-Content $BackupDir\db_backup_${Timestamp}.sql | ssh $Server 'cd $RemotePath && docker exec -i `$(docker compose -f $ComposeFile ps -q supabase) psql -U postgres -d postgres'"
        exit 1
    }
    
    Write-Host ""
    Write-Success "═══════════════════════════════════════════════════════"
    Write-Success "           ДЕПЛОЙ УСПЕШНО ЗАВЕРШЕН!"
    Write-Success "═══════════════════════════════════════════════════════"
    Write-Host ""
    Write-Info "📊 Бэкап базы данных: $BackupDir\db_backup_${Timestamp}.sql"
    Write-Info "🌐 Проверьте работу сайта на сервере"
    Write-Host ""
}

# Запуск
Main
