# Скрипт для создания бэкапа базы данных PostgreSQL из Docker контейнера

param(
    [string]$ContainerName = "fb-net-supabase-db",
    [string]$DbUser = "postgres",
    [string]$DbName = "postgres",
    [string]$DbPassword = "postgres",
    [string]$BackupDir = "backups",
    [switch]$Production = $false
)

$ErrorActionPreference = "Stop"

# Цвета для вывода
function Write-Info {
    Write-Host "ℹ️  $args" -ForegroundColor Blue
}

function Write-Success {
    Write-Host "✅ $args" -ForegroundColor Green
}

function Write-Warning {
    Write-Host "⚠️  $args" -ForegroundColor Yellow
}

function Write-Error {
    Write-Host "❌ $args" -ForegroundColor Red
}

# Проверка наличия Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker не найден. Убедитесь, что Docker установлен и запущен."
    exit 1
}

# Проверка существования контейнера
$containerExists = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"
if (-not $containerExists) {
    Write-Error "Контейнер '$ContainerName' не найден."
    Write-Info "Доступные контейнеры:"
    docker ps -a --format "{{.Names}}"
    exit 1
}

# Проверка, что контейнер запущен
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"
if (-not $containerRunning) {
    Write-Warning "Контейнер '$ContainerName' не запущен. Попытка запуска..."
    docker start $ContainerName
    Start-Sleep -Seconds 5
}

# Если production, читаем настройки из .env
if ($Production) {
    $envFile = Join-Path $PSScriptRoot "..\.env"
    if (Test-Path $envFile) {
        Write-Info "Чтение настроек из .env файла..."
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^POSTGRES_PASSWORD=(.+)$') {
                $DbPassword = $matches[1]
            }
        }
        $ContainerName = "fb-net-db"
        $DbUser = "supabase_admin"
    } else {
        Write-Warning ".env файл не найден, используются значения по умолчанию"
    }
}

# Создание директории для бэкапов
$backupPath = Join-Path $PSScriptRoot "..\$BackupDir"
if (-not (Test-Path $backupPath)) {
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    Write-Info "Создана директория для бэкапов: $backupPath"
}

# Генерация имени файла с датой и временем
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "db_backup_$timestamp.sql"
$backupFilePath = Join-Path $backupPath $backupFileName

Write-Info "Создание бэкапа базы данных..."
Write-Info "Контейнер: $ContainerName"
Write-Info "База данных: $DbName"
Write-Info "Пользователь: $DbUser"
Write-Info "Файл бэкапа: $backupFilePath"

# Установка переменной окружения для пароля
$env:PGPASSWORD = $DbPassword

# Создание бэкапа
try {
    docker exec $ContainerName pg_dump -U $DbUser -d $DbName --clean --if-exists --create > $backupFilePath
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $backupFilePath).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        Write-Success "Бэкап успешно создан!"
        Write-Info "Размер файла: $fileSizeMB MB"
        Write-Info "Путь: $backupFilePath"
        
        # Создание сжатой версии (используем потоковое сжатие для больших файлов)
        Write-Info "Создание сжатой версии бэкапа..."
        $compressedFile = "$backupFilePath.gz"
        try {
            $inputFile = [System.IO.File]::OpenRead($backupFilePath)
            $outputFile = [System.IO.File]::Create($compressedFile)
            $gzipStream = [System.IO.Compression.GzipStream]::new(
                $outputFile,
                [System.IO.Compression.CompressionLevel]::Optimal
            )
            
            $buffer = New-Object byte[] 8192
            $bytesRead = 0
            while (($bytesRead = $inputFile.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $gzipStream.Write($buffer, 0, $bytesRead)
            }
            
            $gzipStream.Close()
            $inputFile.Close()
            $outputFile.Close()
            
            $compressedSize = (Get-Item $compressedFile).Length
            $compressedSizeMB = [math]::Round($compressedSize / 1MB, 2)
            Write-Success "Сжатая версия создана: $compressedFile ($compressedSizeMB MB)"
        } catch {
            Write-Warning "Не удалось создать сжатую версию: $_"
            Write-Info "Используйте внешние инструменты (7-Zip, WinRAR) для сжатия файла"
        }
        
    } else {
        Write-Error "Ошибка при создании бэкапа. Код выхода: $LASTEXITCODE"
        exit 1
    }
} catch {
    Write-Error "Ошибка при создании бэкапа: $_"
    exit 1
} finally {
    # Удаление переменной окружения
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Success "Готово!"
