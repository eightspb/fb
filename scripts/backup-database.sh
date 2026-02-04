#!/bin/bash
set -e

# Скрипт для создания бэкапа базы данных PostgreSQL из Docker контейнера

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Параметры по умолчанию
CONTAINER_NAME="${CONTAINER_NAME:-fb-net-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
PRODUCTION="${PRODUCTION:-false}"

# Чтение пароля из .env если production
if [ "$PRODUCTION" = "true" ]; then
    ENV_FILE="$(dirname "$0")/../.env"
    if [ -f "$ENV_FILE" ]; then
        info "Чтение настроек из .env файла..."
        export POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d '=' -f2)
        CONTAINER_NAME="fb-net-db"
        DB_USER="postgres"
    else
        warning ".env файл не найден, используются значения по умолчанию"
    fi
else
    export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
fi

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    error "Docker не найден. Убедитесь, что Docker установлен и запущен."
    exit 1
fi

# Проверка существования контейнера
if ! docker ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    error "Контейнер '$CONTAINER_NAME' не найден."
    info "Доступные контейнеры:"
    docker ps -a --format "{{.Names}}"
    exit 1
fi

# Проверка, что контейнер запущен
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    warning "Контейнер '$CONTAINER_NAME' не запущен. Попытка запуска..."
    docker start "$CONTAINER_NAME"
    sleep 5
fi

# Создание директории для бэкапов
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_PATH="$SCRIPT_DIR/../$BACKUP_DIR"
mkdir -p "$BACKUP_PATH"
info "Директория для бэкапов: $BACKUP_PATH"

# Генерация имени файла с датой и временем
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_PATH/db_backup_${TIMESTAMP}.sql"

info "Создание бэкапа базы данных..."
info "Контейнер: $CONTAINER_NAME"
info "База данных: $DB_NAME"
info "Пользователь: $DB_USER"
info "Файл бэкапа: $BACKUP_FILE"

# Создание бэкапа
if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$CONTAINER_NAME" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --create > "$BACKUP_FILE"; then
    
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    success "Бэкап успешно создан!"
    info "Размер файла: $FILE_SIZE"
    info "Путь: $BACKUP_FILE"
    
    # Создание сжатой версии
    info "Создание сжатой версии бэкапа..."
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    if gzip -c "$BACKUP_FILE" > "$COMPRESSED_FILE"; then
        COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
        success "Сжатая версия создана: $COMPRESSED_FILE ($COMPRESSED_SIZE)"
    else
        warning "Не удалось создать сжатую версию (gzip не найден или ошибка)"
    fi
    
    success "Готово!"
else
    error "Ошибка при создании бэкапа"
    exit 1
fi
