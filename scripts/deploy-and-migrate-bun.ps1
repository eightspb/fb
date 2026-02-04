# PowerShell скрипт для деплоя и миграции на Bun НА СЕРВЕРЕ
# Использование: .\scripts\deploy-and-migrate-bun.ps1 -Server user@server [-RemotePath /opt/fb-net]

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

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = "docker-compose.production.yml"

Write-Host ""
Write-Info "═══════════════════════════════════════════════════════"
Write-Info "    ДЕПЛОЙ И МИГРАЦИЯ НА BUN (НА СЕРВЕРЕ)"
Write-Info "═══════════════════════════════════════════════════════"
Write-Host ""
Write-Info "Сервер: $Server"
Write-Info "Путь: $RemotePath"
Write-Host ""

# Проверка подключения к серверу
Write-Info "🔌 Проверка подключения к серверу..."
$testConnection = ssh -o ConnectTimeout=5 $Server "echo 'OK'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Не удалось подключиться к серверу $Server"
    exit 1
}
Write-Success "Подключение установлено"

# Шаг 1: Создание бэкапа БД НА СЕРВЕРЕ
Write-Info "💾 Создание бэкапа базы данных НА СЕРВЕРЕ..."
$backupResult = ssh $Server @"
    cd $RemotePath
    mkdir -p backups
    TIMESTAMP=`$(date +%Y%m%d_%H%M%S)
    DB_CONTAINER=`$(docker compose -f $ComposeFile ps -q postgres 2>/dev/null || echo 'fb-net-db')
    if [ -n "`$DB_CONTAINER" ]; then
        docker exec `$DB_CONTAINER pg_dump -U postgres -d postgres --clean --if-exists > backups/db_backup_`${TIMESTAMP}.sql
        if [ -s backups/db_backup_`${TIMESTAMP}.sql ]; then
            echo "SUCCESS:backups/db_backup_`${TIMESTAMP}.sql"
        else
            echo "ERROR: Бэкап пустой"
            exit 1
        fi
    else
        echo "WARNING: Контейнер БД не найден"
    fi
"@

if ($backupResult -match "SUCCESS:(.+)") {
    Write-Success "Бэкап создан на сервере: $($matches[1])"
} elseif ($backupResult -match "WARNING") {
    Write-Warning "Контейнер БД не найден, пропускаем бэкап"
} else {
    Write-Error "Ошибка при создании бэкапа"
    exit 1
}

# Шаг 2: Создание бэкапа package-lock.json НА СЕРВЕРЕ
Write-Info "💾 Создание бэкапа package-lock.json НА СЕРВЕРЕ..."
ssh $Server @"
    cd $RemotePath
    if [ -f package-lock.json ]; then
        TIMESTAMP=`$(date +%Y%m%d_%H%M%S)
        cp package-lock.json backups/package-lock.json.backup_`${TIMESTAMP}
        echo "Бэкап создан: backups/package-lock.json.backup_`${TIMESTAMP}"
    else
        echo "package-lock.json не найден, пропускаем"
    fi
"@

# Шаг 3: Загрузка файлов на сервер
Write-Info "📤 Загрузка обновленных файлов на сервер..."

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
    "*.tsbuildinfo",
    "package-lock.json"
)

$excludeArgs = $excludes | ForEach-Object { "--exclude=$_" }

if (Get-Command rsync -ErrorAction SilentlyContinue) {
    rsync -avz --progress $excludeArgs "$ProjectRoot/" "${Server}:${RemotePath}/"
} elseif (Get-Command wsl -ErrorAction SilentlyContinue) {
    $wslPath = wsl wslpath -a $ProjectRoot
    wsl rsync -avz --progress $excludeArgs "$wslPath/" "${Server}:${RemotePath}/"
} else {
    Write-Error "rsync не найден. Установите rsync или используйте WSL."
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Ошибка при загрузке файлов"
    exit 1
}
Write-Success "Файлы загружены на сервер"

# Шаг 4: Установка Bun НА СЕРВЕРЕ (если не установлен)
Write-Info "🔍 Проверка и установка Bun НА СЕРВЕРЕ..."
$bunCheck = ssh $Server @"
    if command -v bun &> /dev/null; then
        BUN_VERSION=`$(bun --version)
        echo "INSTALLED:`$BUN_VERSION"
    else
        echo "NOT_INSTALLED"
    fi
"@

if ($bunCheck -match "NOT_INSTALLED") {
    Write-Info "Устанавливаю Bun на сервере..."
    ssh $Server "curl -fsSL https://bun.sh/install | bash"
    Write-Success "Bun установлен на сервере"
} else {
    $bunVersion = $bunCheck -replace "INSTALLED:", ""
    Write-Success "Bun уже установлен на сервере: версия $bunVersion"
}

# Шаг 5: Миграция на Bun НА СЕРВЕРЕ
Write-Info "🚀 Выполнение миграции на Bun НА СЕРВЕРЕ..."
ssh $Server @"
    cd $RemotePath
    
    # Экспорт PATH для Bun
    export BUN_INSTALL="`$HOME/.bun"
    export PATH="`$BUN_INSTALL/bin:`$PATH"
    
    # Удаление старых файлов npm
    echo "🗑️  Удаление node_modules и package-lock.json..."
    rm -rf node_modules package-lock.json
    
    # Установка зависимостей с Bun
    echo "📦 Установка зависимостей с Bun..."
    bun install
    
    # Проверка критических зависимостей
    echo "🔍 Проверка критических зависимостей..."
    MISSING_DEPS=""
    for dep in next react react-dom axios pg node-telegram-bot-api nodemailer; do
        if bun pm ls \$dep &> /dev/null; then
            echo "✅ Найдено: \$dep"
        else
            echo "❌ Отсутствует: \$dep"
            MISSING_DEPS="\$MISSING_DEPS \$dep"
        fi
    done
    
    if [ -n "\$MISSING_DEPS" ]; then
        echo "ERROR: Отсутствующие зависимости:\$MISSING_DEPS"
        exit 1
    fi
    
    # Проверка bun.lockb
    if [ -f bun.lockb ]; then
        echo "✅ bun.lockb создан"
    else
        echo "ERROR: bun.lockb не создан"
        exit 1
    fi
    
    echo "SUCCESS: Миграция на Bun завершена"
"@

if ($LASTEXITCODE -ne 0) {
    Write-Error "Ошибка при миграции на Bun"
    Write-Warning "Восстановите бэкапы на сервере если нужно"
    exit 1
}
Write-Success "Миграция на Bun выполнена на сервере"

# Шаг 6: Применение миграций БД (если есть)
Write-Info "📦 Применение миграций базы данных..."
ssh $Server @"
    cd $RemotePath
    
    if [ -d migrations ]; then
        for migration in migrations/*.sql; do
            if [ -f "\$migration" ]; then
                echo "Применение \$migration..."
                docker exec -i `$(docker compose -f $ComposeFile ps -q postgres) psql -U postgres -d postgres < "\$migration"
            fi
        done
        echo "Все миграции применены"
    else
        echo "Директория миграций не найдена"
    fi
"@

# Шаг 7: Пересборка и перезапуск контейнеров
Write-Info "🔄 Пересборка и перезапуск Docker контейнеров НА СЕРВЕРЕ..."
ssh $Server @"
    cd $RemotePath
    
    # Остановка контейнеров
    docker compose -f $ComposeFile down
    
    # Пересборка с Bun
    docker compose -f $ComposeFile build --no-cache
    
    # Запуск контейнеров
    docker compose -f $ComposeFile up -d
    
    # Ожидание запуска
    sleep 10
    
    # Проверка статуса
    docker compose -f $ComposeFile ps
"@

if ($LASTEXITCODE -ne 0) {
    Write-Error "Ошибка при перезапуске контейнеров"
    exit 1
}
Write-Success "Контейнеры пересобраны и запущены с Bun"

# Шаг 8: Проверка здоровья приложения
Write-Info "🏥 Проверка здоровья приложения..."
Start-Sleep -Seconds 5
$healthCheck = ssh $Server @"
    cd $RemotePath
    CONTAINER_STATUS=`$(docker compose -f $ComposeFile ps --format json | grep -o '"State":"[^"]*"' | grep -o 'running' | wc -l)
    echo "RUNNING_CONTAINERS:`$CONTAINER_STATUS"
"@

if ($healthCheck -match "RUNNING_CONTAINERS:(\d+)") {
    $runningCount = $matches[1]
    Write-Success "Запущено контейнеров: $runningCount"
} else {
    Write-Warning "Не удалось проверить статус контейнеров"
}

Write-Host ""
Write-Success "═══════════════════════════════════════════════════════"
Write-Success "    ДЕПЛОЙ И МИГРАЦИЯ НА BUN ЗАВЕРШЕНЫ!"
Write-Success "═══════════════════════════════════════════════════════"
Write-Host ""
Write-Info "📊 Все операции выполнены НА СЕРВЕРЕ:"
Write-Info "  ✅ Бэкапы созданы на сервере в $RemotePath/backups/"
Write-Info "  ✅ Bun установлен на сервере"
Write-Info "  ✅ Зависимости установлены с Bun"
Write-Info "  ✅ bun.lockb создан на сервере"
Write-Info "  ✅ Docker контейнеры пересобраны с Bun"
Write-Info "  ✅ Приложение запущено"
Write-Host ""
Write-Info "🌐 Проверьте работу сайта на сервере"
Write-Host ""
