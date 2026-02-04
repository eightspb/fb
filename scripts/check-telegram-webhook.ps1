# Скрипт проверки и настройки Telegram webhook

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         ПРОВЕРКА TELEGRAM WEBHOOK                            ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Загружаем переменные окружения из .env.local (или .env)
$envFile = if (Test-Path ".env.local") { ".env.local" } elseif (Test-Path ".env") { ".env" } else { $null }

if ($envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($name, $value, [System.EnvironmentVariableTarget]::Process)
        }
    }
    Write-Host "[OK] $envFile файл загружен" -ForegroundColor Green
} else {
    Write-Host "[ERROR] .env или .env.local файл не найден!" -ForegroundColor Red
    exit 1
}

$BOT_TOKEN = $env:TELEGRAM_BOT_TOKEN
$WEBHOOK_URL = $env:TELEGRAM_WEBHOOK_URL

if (-not $BOT_TOKEN) {
    Write-Host "[ERROR] TELEGRAM_BOT_TOKEN не найден в .env" -ForegroundColor Red
    exit 1
}

Write-Host "`n[INFO] Bot Token: $($BOT_TOKEN.Substring(0, 15))..." -ForegroundColor Cyan
Write-Host "[INFO] Webhook URL: $WEBHOOK_URL`n" -ForegroundColor Cyan

# Проверяем текущий webhook
Write-Host "[1] Проверка текущего webhook..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" -Method Get
    
    if ($response.ok) {
        Write-Host "`n[OK] Ответ получен:" -ForegroundColor Green
        Write-Host "   URL: $($response.result.url)" -ForegroundColor White
        Write-Host "   Pending Updates: $($response.result.pending_update_count)" -ForegroundColor White
        Write-Host "   Last Error Date: $($response.result.last_error_date)" -ForegroundColor White
        Write-Host "   Last Error Message: $($response.result.last_error_message)" -ForegroundColor White
        Write-Host "   Max Connections: $($response.result.max_connections)" -ForegroundColor White
        
        if ($response.result.url -eq "") {
            Write-Host "`n[WARNING] Webhook не настроен!" -ForegroundColor Yellow
        } elseif ($response.result.url -ne $WEBHOOK_URL) {
            Write-Host "`n[WARNING] Webhook указывает на другой URL!" -ForegroundColor Yellow
            Write-Host "   Текущий: $($response.result.url)" -ForegroundColor Red
            Write-Host "   Ожидаемый: $WEBHOOK_URL" -ForegroundColor Green
        } else {
            Write-Host "`n[OK] Webhook настроен правильно!" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "[ERROR] Ошибка при проверке webhook: $_" -ForegroundColor Red
    exit 1
}

# Спрашиваем, нужно ли установить webhook
Write-Host "`n[?] Установить/обновить webhook? (y/n): " -ForegroundColor Yellow -NoNewline
$answer = Read-Host

if ($answer -eq "y" -or $answer -eq "Y") {
    Write-Host "`n[2] Установка webhook..." -ForegroundColor Yellow
    
    if (-not $WEBHOOK_URL) {
        Write-Host "[ERROR] TELEGRAM_WEBHOOK_URL не установлен в .env!" -ForegroundColor Red
        Write-Host "[INFO] Добавьте в .env строку:" -ForegroundColor Cyan
        Write-Host "   TELEGRAM_WEBHOOK_URL=https://ваш-домен.com/api/telegram/webhook" -ForegroundColor White
        exit 1
    }
    
    try {
        $body = @{
            url = $WEBHOOK_URL
            drop_pending_updates = $false
            allowed_updates = @("message", "callback_query")
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" `
            -Method Post `
            -ContentType "application/json" `
            -Body $body
        
        if ($response.ok) {
            Write-Host "[OK] Webhook установлен успешно!" -ForegroundColor Green
            Write-Host "   Description: $($response.description)" -ForegroundColor White
        } else {
            Write-Host "[ERROR] Не удалось установить webhook!" -ForegroundColor Red
            Write-Host "   $($response.description)" -ForegroundColor Red
        }
    } catch {
        Write-Host "[ERROR] Ошибка при установке webhook: $_" -ForegroundColor Red
        exit 1
    }
    
    # Проверяем ещё раз
    Write-Host "`n[3] Повторная проверка..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" -Method Get
    if ($response.ok) {
        Write-Host "[OK] Webhook URL: $($response.result.url)" -ForegroundColor Green
    }
}

# Проверяем pending updates
Write-Host "`n[4] Проверка необработанных сообщений..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/getUpdates?limit=1" -Method Get
    
    if ($response.ok -and $response.result.Count -gt 0) {
        Write-Host "[WARNING] Есть необработанные сообщения: $($response.result.Count)" -ForegroundColor Yellow
        Write-Host "[INFO] Последнее сообщение:" -ForegroundColor Cyan
        $lastUpdate = $response.result[0]
        Write-Host "   Update ID: $($lastUpdate.update_id)" -ForegroundColor White
        Write-Host "   От: $($lastUpdate.message.from.username) ($($lastUpdate.message.from.id))" -ForegroundColor White
        Write-Host "   Текст: $($lastUpdate.message.text)" -ForegroundColor White
        Write-Host "   Дата: $(Get-Date -UnixTimeSeconds $lastUpdate.message.date)" -ForegroundColor White
    } else {
        Write-Host "[OK] Нет необработанных сообщений" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] Ошибка при проверке updates: $_" -ForegroundColor Red
}

# Тестовое сообщение
Write-Host "`n[5] Отправить тестовое сообщение себе? (y/n): " -ForegroundColor Yellow -NoNewline
$answer = Read-Host

if ($answer -eq "y" -or $answer -eq "Y") {
    $ADMIN_CHAT_ID = $env:TELEGRAM_ADMIN_CHAT_ID
    
    if (-not $ADMIN_CHAT_ID) {
        Write-Host "[ERROR] TELEGRAM_ADMIN_CHAT_ID не установлен в .env!" -ForegroundColor Red
        exit 1
    }
    
    try {
        $body = @{
            chat_id = $ADMIN_CHAT_ID
            text = "🤖 Тест Telegram бота`n`nБот работает корректно!`nВремя: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            parse_mode = "Markdown"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" `
            -Method Post `
            -ContentType "application/json" `
            -Body $body
        
        if ($response.ok) {
            Write-Host "[OK] Тестовое сообщение отправлено!" -ForegroundColor Green
        }
    } catch {
        Write-Host "[ERROR] Ошибка при отправке: $_" -ForegroundColor Red
    }
}

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                  ПРОВЕРКА ЗАВЕРШЕНА                           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "[INFO] Если бот не отвечает, проверьте:" -ForegroundColor Yellow
Write-Host "   1. Webhook URL доступен из интернета (не localhost)" -ForegroundColor White
Write-Host "   2. Сервер запущен и работает" -ForegroundColor White
Write-Host "   3. В логах нет ошибок (/api/telegram/webhook)" -ForegroundColor White
Write-Host "   4. Попробуйте команду /start в боте`n" -ForegroundColor White
