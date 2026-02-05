#!/bin/bash

# Скрипт автоматической установки всех зависимостей на сервере
# Запускается автоматически при деплое

set -e  # Прерывать при ошибках

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         УСТАНОВКА ЗАВИСИМОСТЕЙ СЕРВЕРА                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Флаг для отслеживания обновлений
NEED_UPDATE=false

# ═══════════════════════════════════════════════════════════════════
# 1. ПРОВЕРКА И УСТАНОВКА JQ
# ═══════════════════════════════════════════════════════════════════

echo "[1/4] Проверка jq (JSON парсер)..."

if ! command -v jq &> /dev/null; then
    echo "   ⚠️  jq не установлен, устанавливаю..."
    NEED_UPDATE=true
else
    echo "   ✅ jq уже установлен"
fi

# ═══════════════════════════════════════════════════════════════════
# 2. ПРОВЕРКА И УСТАНОВКА CURL
# ═══════════════════════════════════════════════════════════════════

echo "[2/4] Проверка curl..."

if ! command -v curl &> /dev/null; then
    echo "   ⚠️  curl не установлен, устанавливаю..."
    NEED_UPDATE=true
else
    echo "   ✅ curl уже установлен"
fi

# ═══════════════════════════════════════════════════════════════════
# 3. ПРОВЕРКА И УСТАНОВКА GIT
# ═══════════════════════════════════════════════════════════════════

echo "[3/4] Проверка git..."

if ! command -v git &> /dev/null; then
    echo "   ⚠️  git не установлен, устанавливаю..."
    NEED_UPDATE=true
else
    echo "   ✅ git уже установлен"
fi

# ═══════════════════════════════════════════════════════════════════
# 4. ПРОВЕРКА И УСТАНОВКА DOCKER
# ═══════════════════════════════════════════════════════════════════

echo "[4/4] Проверка Docker и Docker Compose..."

if ! command -v docker &> /dev/null; then
    echo "   ⚠️  Docker не установлен"
    echo "   ℹ️  Установите Docker вручную: https://docs.docker.com/engine/install/"
    exit 1
else
    echo "   ✅ Docker установлен: $(docker --version)"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "   ⚠️  Docker Compose не установлен"
    echo "   ℹ️  Установите Docker Compose вручную"
    exit 1
else
    if command -v docker-compose &> /dev/null; then
        echo "   ✅ Docker Compose установлен: $(docker-compose --version)"
    else
        echo "   ✅ Docker Compose (plugin) установлен: $(docker compose version)"
    fi
fi

# ═══════════════════════════════════════════════════════════════════
# УСТАНОВКА НЕДОСТАЮЩИХ ПАКЕТОВ
# ═══════════════════════════════════════════════════════════════════

if [ "$NEED_UPDATE" = true ]; then
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║         УСТАНОВКА НЕДОСТАЮЩИХ ПАКЕТОВ                        ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Определяем систему управления пакетами
    if command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt-get"
        UPDATE_CMD="apt-get update"
        INSTALL_CMD="apt-get install -y"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
        UPDATE_CMD="yum check-update || true"
        INSTALL_CMD="yum install -y"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
        UPDATE_CMD="dnf check-update || true"
        INSTALL_CMD="dnf install -y"
    else
        echo "   ❌ Неизвестная система управления пакетами"
        exit 1
    fi
    
    echo "   Используется: $PKG_MANAGER"
    echo ""
    
    # Обновляем список пакетов
    echo "   Обновление списка пакетов..."
    $UPDATE_CMD > /dev/null 2>&1
    echo "   ✅ Список пакетов обновлён"
    echo ""
    
    # Устанавливаем недостающие пакеты
    PACKAGES_TO_INSTALL=""
    
    if ! command -v jq &> /dev/null; then
        PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL jq"
    fi
    
    if ! command -v curl &> /dev/null; then
        PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL curl"
    fi
    
    if ! command -v git &> /dev/null; then
        PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL git"
    fi
    
    if [ -n "$PACKAGES_TO_INSTALL" ]; then
        echo "   Установка пакетов:$PACKAGES_TO_INSTALL"
        $INSTALL_CMD $PACKAGES_TO_INSTALL
        echo ""
        echo "   ✅ Пакеты установлены"
    fi
fi

# ═══════════════════════════════════════════════════════════════════
# ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ
# ═══════════════════════════════════════════════════════════════════

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "   ⚠️  Файл .env не найден!"
    echo "   ℹ️  Создайте файл .env на основе ENV_EXAMPLE.txt"
    exit 1
fi

echo "   ✅ Файл .env найден"

# Загружаем переменные окружения
export $(grep -v '^#' .env | xargs)

# Проверяем критические переменные
MISSING_VARS=()

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    MISSING_VARS+=("TELEGRAM_BOT_TOKEN")
fi

if [ -z "$TELEGRAM_ADMIN_CHAT_ID" ]; then
    MISSING_VARS+=("TELEGRAM_ADMIN_CHAT_ID")
fi

if [ -z "$DATABASE_URL" ]; then
    MISSING_VARS+=("DATABASE_URL")
fi

# Проверяем и добавляем TELEGRAM_WEBHOOK_URL если отсутствует
if [ -z "$TELEGRAM_WEBHOOK_URL" ]; then
    echo "   ⚠️  TELEGRAM_WEBHOOK_URL не установлен, добавляю..."
    
    # Определяем домен из .env или используем по умолчанию
    DOMAIN=$(grep -E "^NEXT_PUBLIC_SITE_URL=" .env | cut -d'=' -f2 | sed 's|https\?://||' | sed 's|/||g')
    
    if [ -z "$DOMAIN" ]; then
        DOMAIN="fibroadenoma.net"
    fi
    
    WEBHOOK_URL="https://$DOMAIN/api/telegram/webhook"
    
    # Проверяем, есть ли уже эта строка в файле
    if ! grep -q "TELEGRAM_WEBHOOK_URL=" .env; then
        echo "TELEGRAM_WEBHOOK_URL=$WEBHOOK_URL" >> .env
        echo "   ✅ Добавлено: TELEGRAM_WEBHOOK_URL=$WEBHOOK_URL"
    fi
else
    echo "   ✅ TELEGRAM_WEBHOOK_URL установлен: $TELEGRAM_WEBHOOK_URL"
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo ""
    echo "   ❌ Отсутствуют критические переменные:"
    for var in "${MISSING_VARS[@]}"; do
        echo "      - $var"
    done
    echo ""
    echo "   ℹ️  Добавьте их в файл .env"
    exit 1
fi

echo "   ✅ Все критические переменные установлены"

# ═══════════════════════════════════════════════════════════════════
# ПРОВЕРКА СТРУКТУРЫ ДИРЕКТОРИЙ
# ═══════════════════════════════════════════════════════════════════

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         ПРОВЕРКА СТРУКТУРЫ ДИРЕКТОРИЙ                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Создаём необходимые директории если их нет
REQUIRED_DIRS=(
    "backups"
    "public/images/trainings"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "   📁 Создаю директорию: $dir"
        mkdir -p "$dir"
    else
        echo "   ✅ Директория существует: $dir"
    fi
done

# ═══════════════════════════════════════════════════════════════════
# УСТАНОВКА ПРАВ НА СКРИПТЫ
# ═══════════════════════════════════════════════════════════════════

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         УСТАНОВКА ПРАВ НА СКРИПТЫ                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

if [ -d "scripts" ]; then
    echo "   📝 Установка прав на выполнение для скриптов..."
    chmod +x scripts/*.sh 2>/dev/null || true
    echo "   ✅ Права установлены"
else
    echo "   ⚠️  Директория scripts не найдена"
fi

# ═══════════════════════════════════════════════════════════════════
# ИТОГИ
# ═══════════════════════════════════════════════════════════════════

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         ПРОВЕРКА ЗАВЕРШЕНА УСПЕШНО                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "✅ Все зависимости установлены"
echo "✅ Переменные окружения настроены"
echo "✅ Структура директорий создана"
echo "✅ Права на скрипты установлены"
echo ""
echo "Сервер готов к работе!"
echo ""
