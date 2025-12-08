#!/bin/bash

# Полная инициализация проекта FB.NET
# Этот скрипт выполнит все необходимые шаги для запуска проекта

set -e

echo "=========================================="
echo "  ПОЛНАЯ ИНИЦИАЛИЗАЦИЯ ПРОЕКТА FB.NET"
echo "=========================================="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Шаг 1: Проверка зависимостей
echo "Шаг 1: Проверка зависимостей..."
if ! command -v node &> /dev/null; then
    error "Node.js не установлен!"
    exit 1
fi
info "Node.js установлен"

if ! command -v npm &> /dev/null; then
    error "npm не установлен!"
    exit 1
fi
info "npm установлен"
echo ""

# Шаг 2: Установка зависимостей
echo "Шаг 2: Установка зависимостей npm..."
if [ ! -d "node_modules" ]; then
    npm install
    info "Зависимости установлены"
else
    info "Зависимости уже установлены"
fi
echo ""

# Шаг 3: Выбор способа запуска Supabase
echo "Шаг 3: Настройка Supabase..."
echo ""
echo "Выберите способ запуска Supabase:"
echo "1) Supabase CLI (рекомендуется) - npm run setup:supabase"
echo "2) Docker Compose - npm run setup:docker"
echo "3) Пропустить (использовать облачный Supabase)"
echo ""
read -p "Ваш выбор (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Инициализация Supabase CLI..."
        if ! command -v supabase &> /dev/null; then
            warn "Supabase CLI не установлен. Устанавливаем..."
            npm install -g supabase
        fi
        
        if [ ! -d "supabase" ]; then
            supabase init
        fi
        
        echo "Запуск локального Supabase..."
        supabase start
        
        # Получаем переменные из вывода supabase start
        SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
        SUPABASE_ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
        
        # Создаем .env.local
        if [ ! -f ".env.local" ]; then
            echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL" > .env.local
            echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> .env.local
            info ".env.local создан"
        fi
        
        # Выполняем SQL схему
        echo "Выполнение SQL схемы..."
        supabase db execute -f supabase-schema.sql
        info "SQL схема выполнена"
        ;;
    2)
        echo ""
        echo "Запуск Docker Compose..."
        if ! command -v docker &> /dev/null; then
            error "Docker не установлен!"
            exit 1
        fi
        
        npm run setup:docker
        
        # Создаем .env.local для Docker
        if [ ! -f ".env.local" ]; then
            echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000" > .env.local
            echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" >> .env.local
            info ".env.local создан"
        fi
        ;;
    3)
        warn "Используйте облачный Supabase"
        warn "Создайте .env.local вручную с вашими ключами"
        ;;
    *)
        error "Неверный выбор"
        exit 1
        ;;
esac
echo ""

# Шаг 4: Миграция данных
echo "Шаг 4: Миграция данных..."
npm run migrate:news
info "Миграция данных завершена"
echo ""

# Шаг 5: Создание новостей из папок
echo "Шаг 5: Создание новостей из папок с фотографиями..."
npm run create:news-from-folders
info "Создание новостей завершено"
echo ""

# Итоги
echo "=========================================="
echo "  ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА!"
echo "=========================================="
echo ""
echo "Следующие шаги:"
echo "1. Запустите приложение: npm run dev"
echo "2. Откройте http://localhost:3000"
echo "3. Проверьте работу новостей"
echo ""


