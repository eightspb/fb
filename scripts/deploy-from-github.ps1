# PowerShell скрипт для деплоя из GitHub на сервер
# Запускается локально, разворачивает проект на сервере через git pull
#
# Использование:
#   .\scripts\deploy-from-github.ps1              # деплой с настройками по умолчанию
#   .\scripts\deploy-from-github.ps1 -SkipBackup  # быстрый деплой без бэкапа БД
#   .\scripts\deploy-from-github.ps1 -Branch dev  # деплой из другой ветки
#
# Первый запуск (клонирование репозитория на сервер):
#   .\scripts\deploy-from-github.ps1 -Init

param(
    [Parameter(Mandatory=$false)]
    [string]$Server = "root@155.212.217.60",
    
    [Parameter(Mandatory=$false)]
    [string]$RemotePath = "/opt/fb-net",
    
    [Parameter(Mandatory=$false)]
    [string]$Branch = "master",
    
    [Parameter(Mandatory=$false)]
    [string]$RepoUrl = "https://github.com/eightspb/fb.git",
    
    [Parameter(Mandatory=$false)]
    [switch]$Init,  # Флаг для первоначальной установки
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackup  # Пропустить бэкап БД
)

$ErrorActionPreference = "Stop"

# ═══════════════════════════════════════════════════════════════════════════════
# ОПРЕДЕЛЕНИЕ ПУТИ К SSH
# ═══════════════════════════════════════════════════════════════════════════════

# Ищем ssh в разных местах
$SshPath = $null
if (Get-Command ssh -ErrorAction SilentlyContinue) {
    $SshPath = "ssh"
} elseif (Test-Path "C:\Windows\System32\OpenSSH\ssh.exe") {
    $SshPath = "C:\Windows\System32\OpenSSH\ssh.exe"
} elseif (Test-Path "C:\Program Files\Git\usr\bin\ssh.exe") {
    $SshPath = "C:\Program Files\Git\usr\bin\ssh.exe"
}

if (-not $SshPath) {
    Write-Host "[ERROR] SSH не найден! Установите OpenSSH или Git for Windows" -ForegroundColor Red
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# ФУНКЦИИ ВЫВОДА
# ═══════════════════════════════════════════════════════════════════════════════

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }
function Write-Step { Write-Host "`n=== $args ===" -ForegroundColor Magenta }

# ═══════════════════════════════════════════════════════════════════════════════
# КОНФИГУРАЦИЯ
# ═══════════════════════════════════════════════════════════════════════════════

$ComposeFile = "docker-compose.production.yml"
$BackupDir = Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) "backups"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Создание директории для бэкапов
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# ═══════════════════════════════════════════════════════════════════════════════
# ФУНКЦИИ
# ═══════════════════════════════════════════════════════════════════════════════

function Test-Connection {
    Write-Step "Проверка подключения к серверу"
    
    $result = & $SshPath -o ConnectTimeout=10 -o BatchMode=yes $Server "echo OK" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Не удалось подключиться к серверу $Server"
        Write-Err "Убедитесь, что:"
        Write-Err "  1. SSH ключ добавлен на сервер"
        Write-Err "  2. Сервер доступен по сети"
        Write-Err "  3. Правильно указан адрес: $Server"
        exit 1
    }
    Write-Success "Подключение установлено"
}

function Initialize-Server {
    Write-Step "Первоначальная настройка сервера"
    
    # Проверяем наличие Docker
    Write-Info "Проверка Docker на сервере..."
    $dockerCheck = & $SshPath $Server "which docker 2>/dev/null || echo 'NOT_FOUND'"
    if ($dockerCheck -match "NOT_FOUND") {
        Write-Err "Docker не установлен на сервере!"
        Write-Info "Установите Docker командой:"
        Write-Info "  curl -fsSL https://get.docker.com | sh"
        Write-Info "  sudo usermod -aG docker `$USER"
        exit 1
    }
    Write-Success "Docker найден"
    
    # Проверяем наличие git
    Write-Info "Проверка Git на сервере..."
    $gitCheck = & $SshPath $Server "which git 2>/dev/null || echo 'NOT_FOUND'"
    if ($gitCheck -match "NOT_FOUND") {
        Write-Err "Git не установлен на сервере!"
        Write-Info "Установите Git командой: sudo apt install git -y"
        exit 1
    }
    Write-Success "Git найден"
    
    # Создаем директорию и клонируем репозиторий
    Write-Info "Клонирование репозитория..."
    
    $parentPath = Split-Path $RemotePath -Parent
    
    # Создаем директорию
    & $SshPath $Server "mkdir -p $parentPath"
    
    # Проверяем, существует ли директория
    $dirExists = & $SshPath $Server "test -d $RemotePath && echo YES || echo NO"
    
    if ($dirExists -match "YES") {
        Write-Info "Директория существует, обновляем..."
        & $SshPath $Server "cd $RemotePath && git fetch origin && git checkout $Branch && git pull origin $Branch"
    } else {
        Write-Info "Клонируем репозиторий..."
        & $SshPath $Server "git clone -b $Branch $RepoUrl $RemotePath"
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Ошибка при клонировании репозитория"
        exit 1
    }
    
    # Показываем последний коммит
    & $SshPath $Server "cd $RemotePath && git log -1 --oneline"
    
    Write-Success "Репозиторий клонирован в $RemotePath"
    
    # Напоминаем про .env
    Write-Warn ""
    Write-Warn "ВАЖНО! Не забудьте создать файл .env на сервере:"
    Write-Warn "  ssh $Server"
    Write-Warn "  cd $RemotePath"
    Write-Warn "  cp ENV_EXAMPLE.txt .env"
    Write-Warn "  nano .env  # Заполните все переменные"
    Write-Warn ""
}

function Backup-Database {
    if ($SkipBackup) {
        Write-Warn "Бэкап БД пропущен (флаг -SkipBackup)"
        return
    }
    
    Write-Step "Создание бэкапа базы данных"
    
    # Проверяем, запущен ли контейнер БД
    $dbRunning = & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile ps --status running 2>/dev/null | grep -q supabase-db && echo 'YES' || echo 'NO'"
    
    if ($dbRunning -match "NO") {
        Write-Warn "Контейнер БД не запущен, пропускаем бэкап"
        return
    }
    
    $backupFile = Join-Path $BackupDir "db_backup_$Timestamp.sql"
    
    Write-Info "Сохранение бэкапа в $backupFile..."
    
    & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T supabase-db pg_dump -U postgres -d postgres --clean --if-exists" | Out-File -FilePath $backupFile -Encoding UTF8
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $backupFile) -and (Get-Item $backupFile).Length -gt 100) {
        $sizeKB = [math]::Round((Get-Item $backupFile).Length / 1KB, 2)
        Write-Success "Бэкап создан: $backupFile ($sizeKB KB)"
    } else {
        Write-Warn "Не удалось создать бэкап (возможно БД пуста или не запущена)"
    }
}

function Update-Repository {
    Write-Step "Обновление кода из GitHub"
    
    # Сохраняем локальные изменения
    & $SshPath $Server "cd $RemotePath && git stash --include-untracked 2>/dev/null || true"
    
    # Получаем последние изменения
    & $SshPath $Server "cd $RemotePath && git fetch origin $Branch && git checkout $Branch && git pull origin $Branch"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Ошибка при обновлении репозитория"
        exit 1
    }
    
    # Показываем последний коммит
    Write-Info "Последний коммит:"
    & $SshPath $Server "cd $RemotePath && git log -1 --oneline"
    
    Write-Success "Код обновлен"
}

function Apply-Migrations {
    Write-Step "Применение миграций БД"
    
    # Проверяем, запущен ли контейнер БД
    $dbRunning = & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile ps --status running 2>/dev/null | grep -q supabase-db && echo YES || echo NO"
    
    if ($dbRunning -match "NO") {
        Write-Warn "Контейнер БД не запущен, пропускаем миграции"
        return
    }
    
    # Создаем таблицу миграций если не существует
    $createTable = "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());"
    & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T supabase-db psql -U postgres -d postgres -c `"$createTable`""
    
    # Получаем список миграций на сервере
    $migrations = & $SshPath $Server "cd $RemotePath && ls migrations/*.sql 2>/dev/null || echo ''"
    
    if ([string]::IsNullOrWhiteSpace($migrations)) {
        Write-Info "Папка migrations/ пуста или не найдена"
        return
    }
    
    foreach ($migrationPath in $migrations -split "`n") {
        if ([string]::IsNullOrWhiteSpace($migrationPath)) { continue }
        
        $migrationName = [System.IO.Path]::GetFileNameWithoutExtension($migrationPath.Trim())
        
        # Проверяем, применена ли миграция
        $applied = & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T supabase-db psql -U postgres -d postgres -tAc `"SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE name = '$migrationName');`""
        
        if ($applied -match "t") {
            Write-Info "  [SKIP] $migrationName (уже применена)"
        } else {
            Write-Info "  [APPLY] $migrationName"
            & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T supabase-db psql -U postgres -d postgres < $migrationPath"
            & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T supabase-db psql -U postgres -d postgres -c `"INSERT INTO schema_migrations (name) VALUES ('$migrationName');`""
        }
    }
    
    Write-Success "Миграции обработаны"
}

function Restart-Containers {
    Write-Step "Перезапуск Docker контейнеров"
    
    Write-Info "Останавливаем контейнеры..."
    & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile down"
    
    Write-Info "Собираем и запускаем контейнеры..."
    & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile up -d --build"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Ошибка при перезапуске контейнеров"
        exit 1
    }
    
    Write-Info "Ожидание запуска (15 сек)..."
    Start-Sleep -Seconds 15
    
    Write-Info "Статус контейнеров:"
    & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile ps"
    
    Write-Success "Контейнеры запущены"
}

function Show-Logs {
    Write-Step "Последние логи приложения"
    & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile logs --tail=20 app 2>/dev/null || true"
}

# ═══════════════════════════════════════════════════════════════════════════════
# ОСНОВНОЙ ПРОЦЕСС
# ═══════════════════════════════════════════════════════════════════════════════

function Main {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║           ДЕПЛОЙ ИЗ GITHUB НА СЕРВЕР                          ║" -ForegroundColor Blue
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""
    Write-Info "Сервер: $Server"
    Write-Info "Путь: $RemotePath"
    Write-Info "Ветка: $Branch"
    Write-Host ""
    
    # 1. Проверка подключения
    Test-Connection
    
    # 2. Первоначальная установка или обновление
    if ($Init) {
        Initialize-Server
        Write-Host ""
        Write-Success "Первоначальная настройка завершена!"
        Write-Info "Теперь:"
        Write-Info "  1. Создайте .env файл на сервере"
        Write-Info "  2. Запустите скрипт снова без флага -Init"
        return
    }
    
    # 3. Бэкап БД
    Backup-Database
    
    # 4. Обновление кода
    Update-Repository
    
    # 5. Применение миграций
    Apply-Migrations
    
    # 6. Перезапуск контейнеров
    Restart-Containers
    
    # 7. Показать логи
    Show-Logs
    
    # Итог
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║              ДЕПЛОЙ УСПЕШНО ЗАВЕРШЕН!                         ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    if (Test-Path (Join-Path $BackupDir "db_backup_$Timestamp.sql")) {
        Write-Info "Бэкап БД: backups\db_backup_$Timestamp.sql"
    }
    
    # Получаем IP сервера
    $serverHost = $Server -replace '^.*@', ''
    Write-Info "Сайт: http://${serverHost}:3000"
    Write-Host ""
}

# Запуск
Main
