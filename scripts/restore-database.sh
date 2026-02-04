#!/bin/bash
set -e

# Скрипт для восстановления базы данных из бэкапа

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

if [ -z "$1" ] || [ -z "$2" ]; then
    error "Использование: $0 <backup_file> <user@server> [remote_path]"
    echo "Пример: $0 backups/db_backup_20240130_120000.sql user@192.168.1.100 /opt/fb-net"
    exit 1
fi

BACKUP_FILE="$1"
SERVER="$2"
REMOTE_PATH="${3:-/opt/fb-net}"
COMPOSE_FILE="docker-compose.production.yml"

if [ ! -f "$BACKUP_FILE" ]; then
    error "Файл бэкапа не найден: $BACKUP_FILE"
    exit 1
fi

info "🔄 Восстановление базы данных из бэкапа: $BACKUP_FILE"
warning "⚠️  ВНИМАНИЕ: Это перезапишет текущую базу данных!"
read -p "Вы уверены? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    info "Восстановление отменено"
    exit 0
fi

info "📤 Загрузка бэкапа на сервер..."
cat "$BACKUP_FILE" | ssh "$SERVER" "cd $REMOTE_PATH && docker exec -i \$(docker compose -f $COMPOSE_FILE ps -q postgres) psql -U postgres -d postgres"

if [ $? -eq 0 ]; then
    success "База данных успешно восстановлена"
else
    error "Ошибка при восстановлении базы данных"
    exit 1
fi
