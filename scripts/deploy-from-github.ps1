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
    [switch]$SkipBackup,  # Пропустить бэкап БД
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipMigrations,  # Пропустить применение миграций (если БД уже настроена)
    
    [Parameter(Mandatory=$false)]
    [switch]$AppOnly  # Деплой только приложения (без пересборки БД)
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

# Автоматически определяем, какой docker-compose файл использовать
# Проверяем наличие SSL сертификата на сервере
function Get-ComposeFile {
    param([string]$Server, [string]$RemotePath, [string]$SshPath)
    
    # Проверяем наличие SSL сертификата
    $certExists = & $SshPath $Server "test -d $RemotePath/certbot/conf/live/fibroadenoma.net && echo 'YES' || echo 'NO'"
    
    if ($certExists -match "YES") {
        Write-Info "SSL сертификат найден, используем docker-compose.ssl.yml"
        return "docker-compose.ssl.yml"
    } else {
        Write-Info "SSL сертификат не найден, используем docker-compose.production.yml"
        return "docker-compose.production.yml"
    }
}

$RemoteBackupDir = "$RemotePath/backups"  # Папка для бэкапов на сервере
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# ═══════════════════════════════════════════════════════════════════════════════
# ФУНКЦИИ
# ═══════════════════════════════════════════════════════════════════════════════

function Test-Connection {
    Write-Step "Проверка подключения к серверу"
    
    $null = & $SshPath -o ConnectTimeout=10 -o BatchMode=yes $Server "echo OK" 2>&1
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
    param([string]$ComposeFile)
    
    if ($SkipBackup) {
        Write-Warn "Бэкап БД пропущен (флаг -SkipBackup)"
        return
    }
    
    Write-Step "Создание бэкапа базы данных"
    
    # Проверяем, запущен ли контейнер БД
    $dbRunning = & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile ps --status running 2>/dev/null | grep -q postgres && echo 'YES' || echo 'NO'"
    
    if ($dbRunning -match "NO") {
        Write-Warn "Контейнер БД не запущен, пропускаем бэкап"
        return
    }
    
    # Создаем папку для бэкапов на сервере
    & $SshPath $Server "mkdir -p $RemoteBackupDir"
    
    $backupFileName = "db_backup_$Timestamp.sql"
    $backupFile = "$RemoteBackupDir/$backupFileName"
    
    Write-Info "Сохранение бэкапа на сервере: $backupFile..."
    
    # Создаем бэкап на сервере
    & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T postgres pg_dump -U postgres -d postgres --clean --if-exists > $backupFile"
    
    if ($LASTEXITCODE -eq 0) {
        # Проверяем размер бэкапа на сервере
        $sizeBytes = & $SshPath $Server "stat -c %s $backupFile 2>/dev/null || stat -f %z $backupFile 2>/dev/null || echo 0"
        $sizeKB = [math]::Round([int]$sizeBytes / 1KB, 2)
        
        if ($sizeKB -gt 0.1) {
            Write-Success "Бэкап создан на сервере: $backupFile ($sizeKB KB)"
        } else {
            Write-Warn "Бэкап создан, но файл пустой или очень маленький"
        }
    } else {
        Write-Warn "Не удалось создать бэкап (возможно БД пуста или не запущена)"
    }
}

function Update-Repository {
    Write-Step "Обновление кода из GitHub"
    
    # Защищаем важные директории от случайного удаления
    # (certbot содержит SSL сертификаты, их нельзя удалять)
    & $SshPath $Server "cd $RemotePath && if [ -d certbot ]; then chmod -R 700 certbot 2>/dev/null || true; fi"
    
    # Сохраняем локальные изменения (но не трогаем certbot и .env)
    & $SshPath $Server "cd $RemotePath && git stash push --keep-index -m 'temp-stash' 2>/dev/null || git stash --include-untracked 2>/dev/null || true"
    
    # Получаем последние изменения
    & $SshPath $Server "cd $RemotePath && git fetch origin $Branch && git checkout $Branch && git pull origin $Branch"
    
    # Восстанавливаем права на certbot
    & $SshPath $Server "cd $RemotePath && if [ -d certbot ]; then chmod -R 755 certbot 2>/dev/null || true; fi"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Ошибка при обновлении репозитория"
        exit 1
    }
    
    # Показываем последний коммит
    Write-Info "Последний коммит:"
    & $SshPath $Server "cd $RemotePath && git log -1 --oneline"
    
    Write-Success "Код обновлен"
}

function Invoke-Migrations {
    param([string]$ComposeFile)
    
    if ($SkipMigrations) {
        Write-Warn "Миграции БД пропущены (флаг -SkipMigrations)"
        return
    }
    
    Write-Step "Применение миграций БД"
    
    # Проверяем, запущен ли контейнер БД
    $dbRunning = & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile ps --status running 2>/dev/null | grep -q postgres && echo YES || echo NO"
    
    if ($dbRunning -match "NO") {
        Write-Warn "Контейнер БД не запущен, пропускаем миграции"
        return
    }
    
    # Применяем миграции через bash-скрипт (избегаем проблем с экранированием в PowerShell)
    & $SshPath $Server "cd $RemotePath && bash scripts/apply-migrations-remote.sh $ComposeFile"
}

function Restart-Containers {
    param([string]$ComposeFile)
    
    Write-Step "Перезапуск Docker контейнеров"
    
    if ($AppOnly) {
        Write-Info "Режим: только приложение (БД не пересобирается)"
        
        Write-Info "Останавливаем контейнер приложения..."
        & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile stop app"
        
        Write-Info "Пересобираем контейнер приложения..."
        & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile build --no-cache app"
        
        Write-Info "Запускаем контейнер приложения..."
        & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile up -d --no-deps app"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Ошибка при перезапуске контейнера приложения"
            exit 1
        }
        
        Write-Info "Ожидание запуска (10 сек)..."
        Start-Sleep -Seconds 10
        
        Write-Success "База данных продолжает работать без перезапуска ✅"
    } else {
        Write-Info "Режим: полный деплой (все контейнеры)"
        
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
    }
    
    Write-Info "Статус контейнеров:"
    & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile ps"
    
    Write-Success "Контейнеры запущены"
}

function Show-Logs {
    param([string]$ComposeFile)
    
    Write-Step "Последние логи приложения"
    & $SshPath $Server "cd $RemotePath && docker compose -f $ComposeFile logs --tail=20 app 2>/dev/null || true"
}

function Setup-ServerDependencies {
    Write-Step "Проверка и установка зависимостей сервера"
    
    Write-Info "Запуск скрипта установки зависимостей..."
    $result = & $SshPath $Server "cd $RemotePath && bash scripts/setup-server-dependencies.sh 2>&1"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Не удалось автоматически установить все зависимости"
        Write-Info "Подробности:"
        Write-Host $result
        Write-Info "Продолжаю деплой..."
    } else {
        Write-Success "Зависимости проверены и установлены"
    }
}

function Setup-TelegramWebhook {
    Write-Step "Настройка Telegram webhook"
    
    Write-Info "Запуск скрипта настройки Telegram бота..."
    $result = & $SshPath $Server "cd $RemotePath && bash scripts/fix-telegram-now.sh 2>&1"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Не удалось автоматически настроить Telegram webhook"
        Write-Info "Подробности:"
        Write-Host $result
        Write-Info ""
        Write-Info "Настройте webhook вручную на сервере:"
        Write-Info "  ssh $Server"
        Write-Info "  cd $RemotePath"
        Write-Info "  bash scripts/fix-telegram-now.sh"
    } else {
        Write-Success "Telegram webhook настроен успешно"
    }
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
    if ($AppOnly) {
        Write-Info "Режим: ⚡ Быстрый деплой (только приложение)"
    } else {
        Write-Info "Режим: 🔄 Полный деплой (все контейнеры)"
    }
    Write-Host ""
    
    # 1. Проверка подключения
    Test-Connection
    
    # 1.5. Определяем правильный docker-compose файл
    $script:ComposeFile = Get-ComposeFile -Server $Server -RemotePath $RemotePath -SshPath $SshPath
    Write-Info "Используется конфигурация: $script:ComposeFile"
    
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
    Backup-Database -ComposeFile $script:ComposeFile
    
    # 4. Обновление кода
    Update-Repository
    
    # 4.5. Установка зависимостей сервера
    Setup-ServerDependencies
    
    # 5. Применение миграций
    Invoke-Migrations -ComposeFile $script:ComposeFile
    
    # 6. Перезапуск контейнеров
    Restart-Containers -ComposeFile $script:ComposeFile
    
    # 7. Настройка Telegram webhook
    Setup-TelegramWebhook
    
    # 8. Показать логи
    Show-Logs -ComposeFile $script:ComposeFile
    
    # Итог
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║              ДЕПЛОЙ УСПЕШНО ЗАВЕРШЕН!                         ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    if (-not $SkipBackup) {
        Write-Info "Бэкап БД на сервере: $RemoteBackupDir/db_backup_$Timestamp.sql"
    }
    
    # Получаем IP сервера
    $serverHost = $Server -replace '^.*@', ''
    
    # Определяем URL в зависимости от конфигурации
    if ($script:ComposeFile -match "ssl") {
        Write-Info "Сайт: https://fibroadenoma.net"
    } else {
        Write-Info "Сайт: http://${serverHost}:3000"
    }
    Write-Host ""
}

# Запуск
Main
