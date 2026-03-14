# DEPRECATED: legacy PowerShell entrypoint for Windows users.
# Основной поддерживаемый вариант: bash scripts/dev-remote.sh
# Этот файл оставлен в репозитории для обратной совместимости и не считается основным путём запуска.
#
# PowerShell скрипт для локальной разработки с удалённой базой данных
# Автоматически создаёт SSH туннель к базе на сервере и запускает оба Next.js dev сервера
#
# Использование:
#   .\scripts\dev-remote.ps1
#
# Что делает:
# 1. Проверяет SSH подключение к серверу
# 2. Создаёт SSH туннель: localhost:54321 -> server:5432 (PostgreSQL в Docker)
# 3. Запускает основной сайт (порт 3000) и админку (порт 3001) параллельно
# 4. При Ctrl+C автоматически закрывает всё

param(
    [Parameter(Mandatory=$false)]
    [string]$Server = "root@155.212.217.60",

    [Parameter(Mandatory=$false)]
    [int]$SshPort = 2222,

    [Parameter(Mandatory=$false)]
    [int]$LocalPort = 54321,

    [Parameter(Mandatory=$false)]
    [int]$RemotePort = 5432,

    [Parameter(Mandatory=$false)]
    [string]$DbContainer = "fb-net-db"
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [Console]::OutputEncoding = [Console]::InputEncoding = [System.Text.Encoding]::UTF8

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
    $null = ssh -p $SshPort -o ConnectTimeout=5 -o BatchMode=yes $Server "echo 'OK'" 2>&1
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
    $dbCheck = ssh -p $SshPort $Server "docker ps --filter name=$DbContainer --format '{{.Names}}'" 2>&1
    if ($dbCheck -notmatch $DbContainer) {
        Write-Error-Custom "PostgreSQL контейнер '$DbContainer' не запущен на сервере"
        Write-Info "Запустите контейнер на сервере:"
        Write-Host "  ssh -p $SshPort $Server 'cd /opt/fb-net && docker compose -f docker-compose.ssl.yml up -d postgres'" -ForegroundColor Gray
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
    Write-Info "Закрываю существующие SSH процессы на порту..."

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

$containerIp = ssh -p $SshPort $Server "docker inspect $DbContainer --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'" 2>&1
$containerIp = $containerIp.Trim()

if (-not $containerIp -or $containerIp -match "Error") {
    Write-Error-Custom "Не удалось получить IP адрес контейнера $DbContainer"
    Write-Info "Контейнер должен быть запущен и подключён к Docker сети"
    exit 1
}

Write-Success "IP адрес PostgreSQL контейнера: $containerIp"
Write-Info "Создание SSH туннеля: localhost:$LocalPort -> $containerIp`:$RemotePort"

$tunnelJob = Start-Job -ScriptBlock {
    param($Server, $SshPort, $LocalPort, $ContainerIp, $RemotePort)
    ssh -p $SshPort -N -o ExitOnForwardFailure=yes -L "${LocalPort}:${ContainerIp}:${RemotePort}" $Server 2>&1
} -ArgumentList $Server, $SshPort, $LocalPort, $containerIp, $RemotePort

# Ждём до 8 секунд пока туннель поднимется
$tunnelCheck = $null
for ($i = 0; $i -lt 8; $i++) {
    Start-Sleep -Seconds 1
    $tunnelCheck = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue
    if ($tunnelCheck) { break }
    # Проверяем, не упал ли job с ошибкой
    if ($tunnelJob.State -eq 'Failed' -or $tunnelJob.State -eq 'Completed') {
        $jobOutput = Receive-Job -Job $tunnelJob 2>&1
        Write-Error-Custom "SSH завершился с ошибкой: $jobOutput"
        Remove-Job -Job $tunnelJob -ErrorAction SilentlyContinue
        exit 1
    }
}

if (-not $tunnelCheck) {
    $jobOutput = Receive-Job -Job $tunnelJob 2>&1
    Write-Error-Custom "Не удалось создать SSH туннель за 8 секунд"
    if ($jobOutput) { Write-Host "SSH output: $jobOutput" -ForegroundColor Gray }
    Stop-Job -Job $tunnelJob -ErrorAction SilentlyContinue
    Remove-Job -Job $tunnelJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Success "SSH туннель создан (localhost:$LocalPort -> server PostgreSQL)"

# ═══════════════════════════════════════════════════════════════════════════════
# ЗАПУСК DEV СЕРВЕРОВ
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  🚀 Локальная разработка с удалённой базой данных" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Success "SSH туннель:   localhost:$LocalPort -> PostgreSQL на сервере"
Write-Success "Сайт:          http://localhost:3000"
Write-Success "Админка:       http://localhost:3001/admin"
Write-Success "База данных:   Продакшн данные с сервера"
Write-Host ""
Write-Warning-Custom "Нажмите Ctrl+C для остановки (всё закроется автоматически)"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# Получаем путь к текущей директории (корень проекта)
$projectRoot = (Get-Location).Path

# Рекурсивно убить процесс и всех его потомков
function Stop-ProcessTree {
    param([int]$ParentId)
    try {
        $children = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
                    Where-Object { $_.ParentProcessId -eq $ParentId }
        foreach ($child in $children) {
            Stop-ProcessTree -ParentId $child.ProcessId
        }
        Stop-Process -Id $ParentId -Force -ErrorAction SilentlyContinue
    } catch {}
}

function Stop-AllProcesses {
    Write-Host ""
    Write-Info "Остановка всех процессов..."

    # Останавливаем site (дерево процессов)
    if ($script:siteProcess -and -not $script:siteProcess.HasExited) {
        Stop-ProcessTree -ParentId $script:siteProcess.Id
    }

    # Останавливаем admin (дерево процессов)
    if ($script:adminProcess -and -not $script:adminProcess.HasExited) {
        Stop-ProcessTree -ParentId $script:adminProcess.Id
    }

    # Останавливаем SSH туннель
    if ($tunnelJob) {
        Stop-Job -Job $tunnelJob -ErrorAction SilentlyContinue
        Remove-Job -Job $tunnelJob -ErrorAction SilentlyContinue
    }

    # Дополнительная очистка: SSH процессы на туннельном порту
    $sshProcs = Get-NetTCPConnection -LocalPort $LocalPort -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $sshProcs) {
        try {
            $p = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($p -and $p.ProcessName -eq "ssh") {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }

    Write-Success "Всё остановлено. Готово!"
}

# Запускаем site (порт 3000)
$siteProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "bun run dev:site" `
    -WorkingDirectory $projectRoot `
    -PassThru `
    -NoNewWindow

Write-Info "Запущен site (PID: $($siteProcess.Id)) на http://localhost:3000"

# Небольшая пауза чтобы site успел стартовать первым
Start-Sleep -Seconds 2

# Запускаем admin (порт 3001)
$adminProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "bun run dev:admin" `
    -WorkingDirectory $projectRoot `
    -PassThru `
    -NoNewWindow

Write-Info "Запущен admin (PID: $($adminProcess.Id)) на http://localhost:3001/admin"
Write-Host ""

# Перехватываем Ctrl+C вручную чтобы избежать "Terminate batch job?" от cmd
[Console]::TreatControlCAsInput = $true

try {
    while (-not $siteProcess.HasExited -and -not $adminProcess.HasExited) {
        # Проверяем нажатие Ctrl+C
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.Key -eq 'C' -and ($key.Modifiers -band [ConsoleModifiers]::Control)) {
                Write-Host ""
                Write-Info "Получен Ctrl+C, завершение..."
                break
            }
        }
        Start-Sleep -Milliseconds 300
    }

    if ($siteProcess.HasExited -and -not $adminProcess.HasExited) {
        Write-Warning-Custom "Site процесс завершился (код: $($siteProcess.ExitCode))"
    }
    if ($adminProcess.HasExited -and -not $siteProcess.HasExited) {
        Write-Warning-Custom "Admin процесс завершился (код: $($adminProcess.ExitCode))"
    }
} finally {
    [Console]::TreatControlCAsInput = $false
    Stop-AllProcesses
}
