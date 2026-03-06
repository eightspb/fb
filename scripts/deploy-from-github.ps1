# PowerShell скрипт для деплоя из GitHub на сервер
# Запускается локально, разворачивает проект на сервере через git pull
#
# Архитектура:
#   site  - публичный сайт + весь backend/API (порт 3000), Dockerfile в корне
#   admin - UI панели управления (порт 3001), Dockerfile в apps/admin/
#
# Использование:
#   .\scripts\deploy-from-github.ps1              # полный деплой (все контейнеры)
#   .\scripts\deploy-from-github.ps1 -AppOnly     # site + admin (БД не трогается)
#   .\scripts\deploy-from-github.ps1 -SiteOnly    # только сайт/API
#   .\scripts\deploy-from-github.ps1 -AdminOnly   # только панель управления
#   .\scripts\deploy-from-github.ps1 -SkipBackup  # деплой без бэкапа БД
#   .\scripts\deploy-from-github.ps1 -Branch dev  # деплой из другой ветки
#
# Первый запуск (клонирование репозитория на сервер):
#   .\scripts\deploy-from-github.ps1 -Init

param(
    [Parameter(Mandatory=$false)]
    [string]$Server = "root@155.212.217.60",

    [Parameter(Mandatory=$false)]
    [int]$SshPort = 2222,

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
    [switch]$AppOnly,  # Деплой обоих приложений site+admin (без пересборки БД)

    [Parameter(Mandatory=$false)]
    [switch]$SiteOnly,  # Деплой только контейнера site (публичный сайт + API)

    [Parameter(Mandatory=$false)]
    [switch]$AdminOnly  # Деплой только контейнера admin (UI панели управления)
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
    $certExists = Invoke-Ssh $Server "test -d $RemotePath/certbot/conf/live/fibroadenoma.net && echo 'YES' || echo 'NO'"
    
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
$SshCommonArgs = @(
    "-p", "$SshPort",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=6",
    "-o", "TCPKeepAlive=yes",
    "-o", "ConnectTimeout=15",
    "-o", "ConnectionAttempts=3"
)
$SshRetryCount = 3
$SshRetryDelaySec = 3

# ═══════════════════════════════════════════════════════════════════════════════
# ФУНКЦИИ
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-Ssh {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Args
    )

    $lastOutput = @()
    $lastExitCode = 0

    for ($attempt = 1; $attempt -le $SshRetryCount; $attempt++) {
        $stdoutFile = [System.IO.Path]::GetTempFileName()
        $stderrFile = [System.IO.Path]::GetTempFileName()
        try {
            $process = Start-Process -FilePath $SshPath `
                -ArgumentList @($SshCommonArgs + $Args) `
                -NoNewWindow `
                -Wait `
                -PassThru `
                -RedirectStandardOutput $stdoutFile `
                -RedirectStandardError $stderrFile

            $lastExitCode = $process.ExitCode
            $global:LASTEXITCODE = $lastExitCode

            $stdoutLines = @()
            $stderrLines = @()

            if (Test-Path $stdoutFile) {
                $stdoutLines = Get-Content -Path $stdoutFile -ErrorAction SilentlyContinue
            }
            if (Test-Path $stderrFile) {
                $stderrLines = Get-Content -Path $stderrFile -ErrorAction SilentlyContinue
            }

            $lastOutput = @($stdoutLines + $stderrLines)
        } finally {
            Remove-Item -Path $stdoutFile, $stderrFile -Force -ErrorAction SilentlyContinue
        }

        if ($lastExitCode -eq 0) {
            return $lastOutput
        }

        if ($attempt -lt $SshRetryCount) {
            Write-Warn "SSH команда завершилась с ошибкой (попытка $attempt/$SshRetryCount). Повтор через ${SshRetryDelaySec}с..."
            Start-Sleep -Seconds $SshRetryDelaySec
        }
    }

    $global:LASTEXITCODE = $lastExitCode
    return $lastOutput
}

function Test-Connection {
    Write-Step "Проверка подключения к серверу"
    
    $connectionArgs = @(
        "-o", "ConnectTimeout=10",
        "-o", "BatchMode=yes",
        $Server,
        "echo OK"
    )
    $null = Invoke-Ssh @connectionArgs
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
    $dockerCheck = Invoke-Ssh $Server "which docker 2>/dev/null || echo 'NOT_FOUND'"
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
    $gitCheck = Invoke-Ssh $Server "which git 2>/dev/null || echo 'NOT_FOUND'"
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
    Invoke-Ssh $Server "mkdir -p $parentPath"
    
    # Проверяем, существует ли директория
    $dirExists = Invoke-Ssh $Server "test -d $RemotePath && echo YES || echo NO"
    
    if ($dirExists -match "YES") {
        Write-Info "Директория существует, обновляем..."
        Invoke-Ssh $Server "cd $RemotePath && git fetch origin && git checkout $Branch && git pull origin $Branch"
    } else {
        Write-Info "Клонируем репозиторий..."
        Invoke-Ssh $Server "git clone -b $Branch $RepoUrl $RemotePath"
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Ошибка при клонировании репозитория"
        exit 1
    }
    
    # Показываем последний коммит
    Invoke-Ssh $Server "cd $RemotePath && git log -1 --oneline"
    
    Write-Success "Репозиторий клонирован в $RemotePath"
    
    # Напоминаем про .env
    Write-Warn ""
    Write-Warn "ВАЖНО! Не забудьте создать файл .env на сервере:"
    Write-Warn "  ssh -p $SshPort $Server"
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
    $dbRunning = Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile ps --status running 2>/dev/null | grep -q postgres && echo 'YES' || echo 'NO'"
    
    if ($dbRunning -match "NO") {
        Write-Warn "Контейнер БД не запущен, пропускаем бэкап"
        return
    }
    
    # Создаем папку для бэкапов на сервере
    Invoke-Ssh $Server "mkdir -p $RemoteBackupDir"
    
    $backupFileName = "db_backup_$Timestamp.sql"
    $backupFile = "$RemoteBackupDir/$backupFileName"
    
    Write-Info "Сохранение бэкапа на сервере: $backupFile..."
    
    # Создаем бэкап на сервере
    Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile exec -T postgres pg_dump -U postgres -d postgres --clean --if-exists > $backupFile"
    
    if ($LASTEXITCODE -eq 0) {
        # Проверяем размер бэкапа на сервере
        $sizeBytes = Invoke-Ssh $Server "stat -c %s $backupFile 2>/dev/null || stat -f %z $backupFile 2>/dev/null || echo 0"
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
    Invoke-Ssh $Server "cd $RemotePath && if [ -d certbot ]; then chmod -R 700 certbot 2>/dev/null || true; fi"
    
    # Сохраняем локальные tracked-изменения.
    # ВАЖНО: не используем --include-untracked, чтобы случайно не убрать .env
    Invoke-Ssh $Server "cd $RemotePath && git stash push --keep-index -m 'temp-stash' 2>/dev/null || true"
    
    # Получаем последние изменения
    Invoke-Ssh $Server "cd $RemotePath && git fetch origin $Branch && git checkout $Branch && git pull origin $Branch"
    
    # Восстанавливаем права на certbot
    Invoke-Ssh $Server "cd $RemotePath && if [ -d certbot ]; then chmod -R 755 certbot 2>/dev/null || true; fi"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Ошибка при обновлении репозитория"
        exit 1
    }
    
    # Показываем последний коммит
    Write-Info "Последний коммит:"
    Invoke-Ssh $Server "cd $RemotePath && git log -1 --oneline"
    
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
    $dbRunning = Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile ps --status running 2>/dev/null | grep -q postgres && echo YES || echo NO"
    
    if ($dbRunning -match "NO") {
        Write-Warn "Контейнер БД не запущен, пропускаем миграции"
        return
    }
    
    # Применяем миграции через bash-скрипт (избегаем проблем с экранированием в PowerShell)
    Invoke-Ssh $Server "cd $RemotePath && bash scripts/apply-migrations-remote.sh $ComposeFile"
}

function Restart-Containers {
    param([string]$ComposeFile)

    Write-Step "Перезапуск Docker контейнеров"

    # Определяем список контейнеров для деплоя
    $targets = @()
    if ($SiteOnly) {
        $targets = @("site")
        Write-Info "Режим: только site (публичный сайт + API, БД не трогается)"
    } elseif ($AdminOnly) {
        $targets = @("admin")
        Write-Info "Режим: только admin (UI панели управления, БД не трогается)"
    } elseif ($AppOnly) {
        $targets = @("site", "admin")
        Write-Info "Режим: site + admin (оба приложения, БД не пересобирается)"
    } else {
        Write-Info "Режим: полный деплой (все контейнеры)"
    }

    if ($targets.Count -gt 0) {
        # Частичный деплой: только указанные контейнеры
        $targetStr = $targets -join " "

        Write-Info "Останавливаем контейнеры: $targetStr..."
        Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile stop $targetStr"
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Ошибка при остановке контейнеров: $targetStr"
            exit 1
        }

        Write-Info "Пересобираем контейнеры: $targetStr..."
        Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile build --no-cache $targetStr"
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Ошибка при сборке контейнеров: $targetStr"
            exit 1
        }

        Write-Info "Запускаем контейнеры: $targetStr..."
        Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile up -d --no-deps $targetStr"
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Ошибка при запуске контейнеров: $targetStr"
            exit 1
        }

        Write-Info "Ожидание запуска (10 сек)..."
        Start-Sleep -Seconds 10

        # Перезапускаем nginx чтобы он подхватил новый IP контейнера
        # (после пересборки контейнер может получить новый IP, nginx кешировал старый)
        $nginxExists = Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile ps --status running 2>/dev/null | grep -q nginx && echo YES || echo NO"
        if ($nginxExists -match "YES") {
            Write-Info "Перезапускаем nginx (обновление DNS после пересборки контейнера)..."
            Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile restart nginx"
            Write-Success "nginx перезапущен"
        }

        Write-Success "База данных продолжает работать без перезапуска"
    } else {
        # Полный деплой всех контейнеров
        Write-Info "Останавливаем все контейнеры..."
        Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile down"
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Ошибка при остановке контейнеров"
            exit 1
        }

        Write-Info "Собираем и запускаем все контейнеры..."
        Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile up -d --build"
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Ошибка при перезапуске контейнеров"
            exit 1
        }

        Write-Info "Ожидание запуска (15 сек)..."
        Start-Sleep -Seconds 15
    }

    Write-Info "Статус контейнеров:"
    Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile ps"

    Write-Success "Контейнеры запущены"
}

function Show-Logs {
    param([string]$ComposeFile)

    Write-Step "Последние логи"
    if ($SiteOnly) {
        Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile logs --tail=20 site 2>/dev/null || true"
    } elseif ($AdminOnly) {
        Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile logs --tail=20 admin 2>/dev/null || true"
    } else {
        Invoke-Ssh $Server "cd $RemotePath && docker compose -f $ComposeFile logs --tail=20 site admin 2>/dev/null || true"
    }
}

function Setup-ServerDependencies {
    Write-Step "Проверка и установка зависимостей сервера"
    
    Write-Info "Запуск скрипта установки зависимостей..."
    $result = Invoke-Ssh $Server "cd $RemotePath && bash scripts/setup-server-dependencies.sh 2>&1"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Проверка зависимостей/переменных окружения завершилась с ошибкой"
        Write-Err "Подробности:"
        Write-Host $result
        Write-Err "Деплой остановлен, чтобы не запускать контейнеры с некорректным .env"
        exit 1
    } else {
        Write-Success "Зависимости проверены и установлены"
    }
}

function Setup-TelegramWebhook {
    Write-Step "Настройка Telegram webhook"
    
    Write-Info "Запуск скрипта настройки Telegram бота..."
    $result = Invoke-Ssh $Server "cd $RemotePath && bash scripts/fix-telegram-now.sh --non-interactive 2>&1"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Не удалось автоматически настроить Telegram webhook"
        Write-Info "Подробности:"
        Write-Host $result
        Write-Info ""
        Write-Info "Настройте webhook вручную на сервере:"
        Write-Info "  ssh -p $SshPort $Server"
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
    if ($SiteOnly) {
        Write-Info "Режим: только site (публичный сайт + API)"
    } elseif ($AdminOnly) {
        Write-Info "Режим: только admin (UI панели управления)"
    } elseif ($AppOnly) {
        Write-Info "Режим: site + admin (без пересборки БД)"
    } else {
        Write-Info "Режим: полный деплой (все контейнеры)"
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
