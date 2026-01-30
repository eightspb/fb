#!/bin/bash
set -e  # Остановка при любой ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="docker-compose.production.yml"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Функции для вывода
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

# Проверка аргументов
if [ -z "$1" ]; then
    error "Использование: $0 <user@server> [remote_path]"
    echo "Пример: $0 user@192.168.1.100 /opt/fb-net"
    exit 1
fi

SERVER="$1"
REMOTE_PATH="${2:-/opt/fb-net}"

info "🚀 Начинаем деплой на сервер: $SERVER"
info "📁 Удаленный путь: $REMOTE_PATH"

# Проверка подключения к серверу
info "🔌 Проверка подключения к серверу..."
if ! ssh -o ConnectTimeout=5 "$SERVER" "echo 'Connection OK'" > /dev/null 2>&1; then
    error "Не удалось подключиться к серверу $SERVER"
    exit 1
fi
success "Подключение установлено"

# Создание директории для бэкапов
mkdir -p "$BACKUP_DIR"

# Функция для создания бэкапа базы данных
backup_database() {
    info "💾 Создание бэкапа базы данных..."
    
    # Определяем имя контейнера БД
    DB_CONTAINER=$(ssh "$SERVER" "cd $REMOTE_PATH && docker compose -f $COMPOSE_FILE ps -q supabase 2>/dev/null || echo 'fb-net-supabase-db-prod'")
    
    if [ -z "$DB_CONTAINER" ]; then
        warning "Контейнер БД не найден, пропускаем бэкап"
        return 0
    fi
    
    BACKUP_FILE="$BACKUP_DIR/db_backup_${TIMESTAMP}.sql"
    
    # Создаем бэкап на сервере
    ssh "$SERVER" "cd $REMOTE_PATH && docker exec $DB_CONTAINER pg_dump -U postgres -d postgres --clean --if-exists" > "$BACKUP_FILE"
    
    if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
        success "Бэкап создан: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
        return 0
    else
        error "Ошибка при создании бэкапа"
        return 1
    fi
}

# Функция для проверки примененных миграций
check_migration_applied() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)
    
    # Проверяем наличие таблицы для отслеживания миграций
    ssh "$SERVER" "cd $REMOTE_PATH && docker exec \$(docker compose -f $COMPOSE_FILE ps -q supabase) psql -U postgres -d postgres -tAc \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_migrations');\"" > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        # Таблица не существует, создаем её
        ssh "$SERVER" "cd $REMOTE_PATH && docker exec -i \$(docker compose -f $COMPOSE_FILE ps -q supabase) psql -U postgres -d postgres" <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
EOF
    fi
    
    # Проверяем, применена ли миграция
    local applied=$(ssh "$SERVER" "cd $REMOTE_PATH && docker exec \$(docker compose -f $COMPOSE_FILE ps -q supabase) psql -U postgres -d postgres -tAc \"SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE name = '$migration_name');\"")
    
    if [ "$applied" = "t" ]; then
        return 0  # Миграция применена
    else
        return 1  # Миграция не применена
    fi
}

# Функция для применения миграции
apply_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)
    
    info "📝 Применение миграции: $migration_name"
    
    # Проверяем, применена ли уже миграция
    if check_migration_applied "$migration_file"; then
        warning "Миграция $migration_name уже применена, пропускаем"
        return 0
    fi
    
    # Применяем миграцию
    if ssh "$SERVER" "cd $REMOTE_PATH && docker exec -i \$(docker compose -f $COMPOSE_FILE ps -q supabase) psql -U postgres -d postgres" < "$migration_file"; then
        # Отмечаем миграцию как примененную
        ssh "$SERVER" "cd $REMOTE_PATH && docker exec -i \$(docker compose -f $COMPOSE_FILE ps -q supabase) psql -U postgres -d postgres" <<EOF
INSERT INTO schema_migrations (name) VALUES ('$migration_name') ON CONFLICT (name) DO NOTHING;
EOF
        success "Миграция $migration_name применена"
        return 0
    else
        error "Ошибка при применении миграции $migration_name"
        return 1
    fi
}

# Функция для проверки изображений в БД
check_images_in_db() {
    info "🔍 Проверка изображений в базе данных..."
    
    DB_CONTAINER=$(ssh "$SERVER" "cd $REMOTE_PATH && docker compose -f $COMPOSE_FILE ps -q supabase 2>/dev/null || echo 'fb-net-supabase-db-prod'")
    
    if [ -z "$DB_CONTAINER" ]; then
        warning "Контейнер БД не найден, пропускаем проверку"
        return 0
    fi
    
    # Проверяем, есть ли изображения без данных в БД
    local images_without_data=$(ssh "$SERVER" "cd $REMOTE_PATH && docker exec $DB_CONTAINER psql -U postgres -d postgres -tAc \"SELECT COUNT(*) FROM news_images WHERE image_data IS NULL;\"")
    
    if [ -n "$images_without_data" ] && [ "$images_without_data" -gt 0 ]; then
        warning "Найдено $images_without_data изображений без данных в БД"
        warning "Эти изображения не будут отображаться, так как приложение использует только изображения из БД"
        warning "Рекомендуется запустить миграцию изображений перед деплоем"
        read -p "Продолжить деплой? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            error "Деплой отменен"
            exit 1
        fi
    else
        success "Все изображения имеют данные в БД"
    fi
    
    return 0
}

# Функция для загрузки файлов на сервер
upload_files() {
    info "📤 Загрузка файлов на сервер..."
    
    # Список файлов и директорий для загрузки (исключая ненужные)
    # ВАЖНО: public/images/trainings исключена, так как изображения хранятся только в БД
    rsync -avz --progress \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='.git' \
        --exclude='backups' \
        --exclude='*.log' \
        --exclude='.env*' \
        --exclude='!.env.example' \
        --exclude='public/images/trainings' \
        --exclude='public/images/trainings/**' \
        --exclude='.DS_Store' \
        --exclude='*.tsbuildinfo' \
        "$PROJECT_ROOT/" "$SERVER:$REMOTE_PATH/"
    
    if [ $? -eq 0 ]; then
        success "Файлы загружены"
        info "⚠️  Папка public/images/trainings не загружена (изображения хранятся только в БД)"
        return 0
    else
        error "Ошибка при загрузке файлов"
        return 1
    fi
}

# Функция для перезапуска контейнеров
restart_containers() {
    info "🔄 Перезапуск Docker контейнеров..."
    
    ssh "$SERVER" "cd $REMOTE_PATH && docker compose -f $COMPOSE_FILE down"
    
    # Ждем немного перед запуском
    sleep 2
    
    ssh "$SERVER" "cd $REMOTE_PATH && docker compose -f $COMPOSE_FILE up -d --build"
    
    if [ $? -eq 0 ]; then
        success "Контейнеры перезапущены"
        
        # Ждем запуска контейнеров
        info "⏳ Ожидание запуска контейнеров..."
        sleep 10
        
        # Проверяем статус
        ssh "$SERVER" "cd $REMOTE_PATH && docker compose -f $COMPOSE_FILE ps"
        return 0
    else
        error "Ошибка при перезапуске контейнеров"
        return 1
    fi
}

# Функция для применения всех миграций
apply_migrations() {
    info "📦 Применение миграций базы данных..."
    
    MIGRATIONS_DIR="$PROJECT_ROOT/migrations"
    
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        warning "Директория миграций не найдена, пропускаем"
        return 0
    fi
    
    # Применяем миграции в порядке создания
    for migration in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration" ]; then
            apply_migration "$migration" || {
                error "Ошибка при применении миграций. Бэкап сохранен в $BACKUP_DIR"
                exit 1
            }
        fi
    done
    
    success "Все миграции применены"
}

# Основной процесс деплоя
main() {
    echo ""
    info "═══════════════════════════════════════════════════════"
    info "           ДЕПЛОЙ НА ПРОДАКШН СЕРВЕР"
    info "═══════════════════════════════════════════════════════"
    echo ""
    
    # Шаг 1: Создание бэкапа
    if ! backup_database; then
        error "Не удалось создать бэкап. Деплой отменен."
        exit 1
    fi
    
    # Шаг 2: Проверка изображений в БД
    check_images_in_db
    
    # Шаг 3: Загрузка файлов
    if ! upload_files; then
        error "Не удалось загрузить файлы. Деплой отменен."
        exit 1
    fi
    
    # Шаг 4: Применение миграций (до перезапуска контейнеров)
    apply_migrations
    
    # Шаг 5: Перезапуск контейнеров
    if ! restart_containers; then
        error "Не удалось перезапустить контейнеры."
        warning "Бэкап сохранен в $BACKUP_DIR"
        warning "Вы можете восстановить базу данных командой:"
        warning "  cat $BACKUP_DIR/db_backup_${TIMESTAMP}.sql | ssh $SERVER 'cd $REMOTE_PATH && docker exec -i \$(docker compose -f $COMPOSE_FILE ps -q supabase) psql -U postgres -d postgres'"
        exit 1
    fi
    
    echo ""
    success "═══════════════════════════════════════════════════════"
    success "           ДЕПЛОЙ УСПЕШНО ЗАВЕРШЕН!"
    success "═══════════════════════════════════════════════════════"
    echo ""
    info "📊 Бэкап базы данных: $BACKUP_DIR/db_backup_${TIMESTAMP}.sql"
    info "🌐 Проверьте работу сайта на сервере"
    echo ""
}

# Запуск
main
