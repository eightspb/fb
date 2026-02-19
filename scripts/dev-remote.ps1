# PowerShell скрипт для локальной разработки с удалённой базой данных
# Автоматически создаёт SSH туннель к базе на сервере и запускает Next.js dev сервер
#
# Использование:
#   .\scripts\dev-remote.ps1
#
# Что делает:
# 1. Проверяет SSH подключение к серверу
# 2. Создаёт SSH туннель: localhost:54321 -> server:5432 (PostgreSQL в Docker)
# 3. Запускает Next.js dev сервер с Turbopack
# 4. При Ctrl+C автоматически закрывает туннель и dev сервер

param(
    [Parameter(Mandatory=$false)]
    [string]$Server = "root@155.212.217.60",
    
    [Parameter(Mandatory=$false)]
    [int]$LocalPort = 54321,
    
    [Parameter(Mandatory=$false)]
    [int]$RemotePort = 5432,
    
    [Parameter(Mandatory=$false)]
    [string]$DbContainer = "fb-net-db"
)

$ErrorActionPreference = "Stop"

# ═══════════════════════════════════════════════════════════════════════════════
# ЦВЕТА ДЛЯ ВЫВОДА
# ═══════════════════════════════════════════════════════════════════════════════

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# ═══════════════════════════════════════════════════════════════════════════════
# ПРОВЕРКА SSH
# ═══════════════════════════════════════════════════════════════════════════════

Write-Info "Проверка SSH подключения к серверу..."

try {
    $null = ssh -o ConnectTimeout=5 -o BatchMode=yes $Server "echo 'OK'" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Не удалось подключиться к серверу $Server"
        Write-Info "Убедитесь, что:"
        Write-Host "  1. SSH ключ настроен (ssh $Server должен работать без пароля)" -ForegroundColor Gray
        Write-Host "  2. Сервер доступен" -ForegroundColor Gray
        Write-Host "  3. В ~/.ssh/config настроен хост (опционально)" -ForegroundColor Gray
        exit 1
    }
    Write-Success "SSH подключение работает"
} catch {
    Write-Error-Custom "Ошибка при проверке SSH: $_"
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# ПРОВЕРКА БАЗЫ ДАННЫХ НА СЕРВЕРЕ
# ═══════════════════════════════════════════════════════════════════════════════

Write-Info "Проверка PostgreSQL контейнера на сервере..."

try {
    $dbCheck = ssh $Server "docker ps --filter name=$DbContainer --format '{{.Names}}'" 2>&1
    if ($dbCheck -notmatch $DbContainer) {
        Write-Error-Custom "PostgreSQL контейнер '$DbContainer' не запущен на сервере"
        Write-Info "Запустите контейнер на сервере:"
        Write-Host "  ssh $Server 'cd /opt/fb-net && docker compose -f docker-compose.production.yml up -d postgres'" -ForegroundColor Gray
        exit 1
    }
    Write-Success "PostgreSQL контейнер '$DbContainer' запущен"
} catch {
    Write-Error-Custom "Ошибка при проверке контейнера: $_"
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# ПРОВЕРКА ПОРТА
# ═══════════════════════════════════════════════════════════════════════════════

Write-Info "Проверка доступности порта $LocalPort..."

$portInUse = Get-NetTCPConnection -LocalPort $LocalPort -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Warning-Custom "Порт $LocalPort уже используется"
    Write-Info "Возможно, SSH туннель уже запущен. Закрываю существующие подключения..."
    
    # Закрываем процессы, использующие порт
    $processes = Get-NetTCPConnection -LocalPort $LocalPort -ErrorAction SilentlyContinue | 
                 Select-Object -ExpandProperty OwningProcess -Unique
    
    foreach ($processId in $processes) {
        try {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process -and $process.ProcessName -eq "ssh") {
                Write-Info "Закрываю SSH процесс (PID: $processId)..."
                Stop-Process -Id $processId -Force
                Start-Sleep -Seconds 1
            }
        } catch {
            # Игнорируем ошибки
        }
    }
    
    Write-Success "Порт $LocalPort освобождён"
}

# ═══════════════════════════════════════════════════════════════════════════════
# ЗАПУСК SSH ТУННЕЛЯ
# ═══════════════════════════════════════════════════════════════════════════════

Write-Info "Получение IP адреса PostgreSQL контейнера на сервере..."

# Получаем IP адрес Docker контейнера PostgreSQL
$containerIp = ssh $Server "docker inspect $DbContainer --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'" 2>&1
$containerIp = $containerIp.Trim()

if (-not $containerIp -or $containerIp -match "Error") {
    Write-Error-Custom "Не удалось получить IP адрес контейнера $DbContainer"
    Write-Info "Контейнер должен быть запущен и подключён к Docker сети"
    exit 1
}

Write-Success "IP адрес PostgreSQL контейнера: $containerIp"
Write-Info "Создание SSH туннеля: localhost:$LocalPort -> $containerIp`:$RemotePort (PostgreSQL в Docker)"

# Запускаем SSH туннель в фоновом режиме
# ВАЖНО: Подключаемся к IP контейнера в Docker сети, а не к localhost
$tunnelJob = Start-Job -ScriptBlock {
    param($Server, $LocalPort, $ContainerIp, $RemotePort)
    ssh -N -L "${LocalPort}:${ContainerIp}:${RemotePort}" $Server
} -ArgumentList $Server, $LocalPort, $containerIp, $RemotePort

# Ждём, пока туннель установится
Start-Sleep -Seconds 2

# Проверяем, что туннель работает
$tunnelCheck = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue
if (-not $tunnelCheck) {
    Write-Error-Custom "Не удалось создать SSH туннель"
    Stop-Job -Job $tunnelJob -ErrorAction SilentlyContinue
    Remove-Job -Job $tunnelJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Success "SSH туннель создан (localhost:$LocalPort -> server:$RemotePort)"

# ═══════════════════════════════════════════════════════════════════════════════
# ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БАЗЕ
# ═══════════════════════════════════════════════════════════════════════════════

Write-Info "Проверка подключения к базе данных через туннель..."

try {
    $dbVersion = ssh $Server "docker exec $DbContainer psql -U postgres -d postgres -t -c 'SELECT version();'" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Подключение к базе данных работает"
        Write-Host "  PostgreSQL версия: $($dbVersion.Trim().Substring(0, 50))..." -ForegroundColor Gray
    } else {
        Write-Warning-Custom "Не удалось проверить версию базы данных, но туннель создан"
    }
} catch {
    Write-Warning-Custom "Не удалось проверить подключение к базе, но туннель создан"
}

# ═══════════════════════════════════════════════════════════════════════════════
# ЗАПУСК NEXT.JS DEV СЕРВЕРА
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  🚀 Локальная разработка с удалённой базой данных" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Success "SSH туннель: localhost:$LocalPort -> $Server (PostgreSQL)"
Write-Success "Next.js сервер: http://localhost:3000"
Write-Success "База данных: Продакшн данные с сервера"
Write-Host ""
Write-Warning-Custom "Нажмите Ctrl+C для остановки (туннель закроется автоматически)"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# Обработчик Ctrl+C
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Write-Host ""
    Write-Info "Остановка SSH туннеля и dev сервера..."
    
    # Останавливаем туннель
    if ($tunnelJob) {
        Stop-Job -Job $tunnelJob -ErrorAction SilentlyContinue
        Remove-Job -Job $tunnelJob -ErrorAction SilentlyContinue
    }
    
    Write-Success "SSH туннель закрыт"
}

try {
    # Запускаем Next.js dev сервер
    bun run dev
} catch {
    Write-Error-Custom "Ошибка при запуске dev сервера: $_"
} finally {
    # Закрываем туннель при любом завершении
    Write-Host ""
    Write-Info "Закрытие SSH туннеля..."
    
    if ($tunnelJob) {
        Stop-Job -Job $tunnelJob -ErrorAction SilentlyContinue
        Remove-Job -Job $tunnelJob -ErrorAction SilentlyContinue
    }
    
    # Дополнительная очистка: закрываем все SSH процессы на порту
    $processes = Get-NetTCPConnection -LocalPort $LocalPort -ErrorAction SilentlyContinue | 
                 Select-Object -ExpandProperty OwningProcess -Unique
    
    foreach ($processId in $processes) {
        try {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process -and $process.ProcessName -eq "ssh") {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        } catch {
            # Игнорируем ошибки
        }
    }
    
    Write-Success "SSH туннель закрыт"
    Write-Success "Готово!"
}
