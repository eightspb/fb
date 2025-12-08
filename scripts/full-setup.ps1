# Полная инициализация проекта FB.NET (PowerShell)
# Этот скрипт выполнит все необходимые шаги для запуска проекта

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ПОЛНАЯ ИНИЦИАЛИЗАЦИЯ ПРОЕКТА FB.NET" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Шаг 1: Проверка зависимостей
Write-Host "Шаг 1: Проверка зависимостей..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js установлен: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js не установлен!" -ForegroundColor Red
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Host "  ✓ npm установлен: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ npm не установлен!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Шаг 2: Установка зависимостей
Write-Host "Шаг 2: Установка зависимостей npm..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    npm install
    Write-Host "  ✓ Зависимости установлены" -ForegroundColor Green
} else {
    Write-Host "  ✓ Зависимости уже установлены" -ForegroundColor Green
}
Write-Host ""

# Шаг 3: Выбор способа запуска Supabase
Write-Host "Шаг 3: Настройка Supabase..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Выберите способ запуска Supabase:" -ForegroundColor Cyan
Write-Host "1) Supabase CLI (рекомендуется)" -ForegroundColor White
Write-Host "2) Docker Compose" -ForegroundColor White
Write-Host "3) Пропустить (использовать облачный Supabase)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Ваш выбор (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Инициализация Supabase CLI..." -ForegroundColor Yellow
        
        # Проверка Supabase CLI
        try {
            supabase --version | Out-Null
            Write-Host "  ✓ Supabase CLI установлен" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠ Supabase CLI не установлен. Устанавливаем..." -ForegroundColor Yellow
            npm install -g supabase
        }
        
        # Инициализация
        if (-not (Test-Path "supabase")) {
            supabase init
        }
        
        # Запуск
        Write-Host "Запуск локального Supabase..." -ForegroundColor Yellow
        supabase start
        
        # Создание .env.local
        if (-not (Test-Path ".env.local")) {
            Write-Host "  ⚠ Создайте .env.local вручную с данными из вывода supabase start" -ForegroundColor Yellow
        }
        
        # Выполнение SQL схемы
        Write-Host "Выполнение SQL схемы..." -ForegroundColor Yellow
        supabase db execute -f supabase-schema.sql
        Write-Host "  ✓ SQL схема выполнена" -ForegroundColor Green
    }
    "2" {
        Write-Host ""
        Write-Host "Запуск Docker Compose..." -ForegroundColor Yellow
        
        # Проверка Docker
        try {
            docker --version | Out-Null
            Write-Host "  ✓ Docker установлен" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Docker не установлен!" -ForegroundColor Red
            exit 1
        }
        
        npm run setup:docker
        
        # Создание .env.local для Docker
        if (-not (Test-Path ".env.local")) {
            @"
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
"@ | Out-File -FilePath ".env.local" -Encoding utf8
            Write-Host "  ✓ .env.local создан" -ForegroundColor Green
        }
    }
    "3" {
        Write-Host "  ⚠ Используйте облачный Supabase" -ForegroundColor Yellow
        Write-Host "  ⚠ Создайте .env.local вручную с вашими ключами" -ForegroundColor Yellow
    }
    default {
        Write-Host "  ✗ Неверный выбор" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Шаг 4: Миграция данных
Write-Host "Шаг 4: Миграция данных..." -ForegroundColor Yellow
npm run migrate:news
Write-Host "  ✓ Миграция данных завершена" -ForegroundColor Green
Write-Host ""

# Шаг 5: Создание новостей из папок
Write-Host "Шаг 5: Создание новостей из папок с фотографиями..." -ForegroundColor Yellow
npm run create:news-from-folders
Write-Host "  ✓ Создание новостей завершено" -ForegroundColor Green
Write-Host ""

# Итоги
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Следующие шаги:" -ForegroundColor Yellow
Write-Host "1. Запустите приложение: npm run dev" -ForegroundColor White
Write-Host "2. Откройте http://localhost:3000" -ForegroundColor White
Write-Host "3. Проверьте работу новостей" -ForegroundColor White
Write-Host ""


