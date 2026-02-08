# Скрипт для проверки переменных окружения SMTP
Write-Host "Проверка переменных окружения SMTP..." -ForegroundColor Cyan
Write-Host ""

# Загружаем переменные из .env.local если существует
if (Test-Path .env.local) {
    Write-Host "Найден файл .env.local" -ForegroundColor Green
    Get-Content .env.local | Where-Object { $_ -match '^SMTP_' } | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#')) {
            $parts = $line -split '=', 2
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim()
                if ($key -eq 'SMTP_PASSWORD') {
                    Write-Host "$key = ***скрыто***" -ForegroundColor Yellow
                } else {
                    Write-Host "$key = $value" -ForegroundColor Yellow
                }
            }
        }
    }
} else {
    Write-Host "Файл .env.local не найден!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Проверка файла .env..." -ForegroundColor Cyan
if (Test-Path .env) {
    Write-Host "Найден файл .env" -ForegroundColor Green
    Get-Content .env | Where-Object { $_ -match '^SMTP_' } | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#')) {
            $parts = $line -split '=', 2
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim()
                if ($key -eq 'SMTP_PASSWORD') {
                    Write-Host "$key = ***скрыто***" -ForegroundColor Yellow
                } else {
                    Write-Host "$key = $value" -ForegroundColor Yellow
                }
            }
        }
    }
} else {
    Write-Host "Файл .env не найден!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Для запуска сервера используйте: bun run dev" -ForegroundColor Green
Write-Host "Для проверки SMTP откройте: http://localhost:3000/api/test-smtp" -ForegroundColor Green
