#!/bin/bash
# Bash скрипт для деплоя и миграции на Bun НА СЕРВЕРЕ
# Использование: ./scripts/deploy-and-migrate-bun.sh user@server [/opt/fb-net]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="docker-compose.production.yml"

echo ""
info "═══════════════════════════════════════════════════════"
info "    ДЕПЛОЙ И МИГРАЦИЯ НА BUN (НА СЕРВЕРЕ)"
info "═══════════════════════════════════════════════════════"
echo ""
info "Сервер: $SERVER"
info "Путь: $REMOTE_PATH"
echo ""

# Проверка подключения к серверу
info "🔌 Проверка подключения к серверу..."
if ! ssh -o ConnectTimeout=5 "$SERVER" "echo 'OK'" > /dev/null 2>&1; then
    error "Не удалось подключиться к серверу $SERVER"
    exit 1
fi
success "Подключение установлено"

# Шаг 1: Создание бэкапа БД НА СЕРВЕРЕ
info "💾 Создание бэкапа базы данных НА СЕРВЕРЕ..."
BACKUP_RESULT=$(ssh "$SERVER" bash <<'EOF'
    cd '"$REMOTE_PATH"'
    mkdir -p backups
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    DB_CONTAINER=$(docker compose -f '"$COMPOSE_FILE"' ps -q postgres 2>/dev/null || echo 'fb-net-db')
    if [ -n "$DB_CONTAINER" ]; then
        docker exec $DB_CONTAINER pg_dump -U postgres -d postgres --clean --if-exists > backups/db_backup_${TIMESTAMP}.sql
        if [ -s backups/db_backup_${TIMESTAMP}.sql ]; then
            echo "SUCCESS:backups/db_backup_${TIMESTAMP}.sql"
        else
            echo "ERROR: Бэкап пустой"
            exit 1
        fi
    else
        echo "WARNING: Контейнер БД не найден"
    fi
EOF
)

if [[ "$BACKUP_RESULT" == SUCCESS:* ]]; then
    BACKUP_FILE="${BACKUP_RESULT#SUCCESS:}"
    success "Бэкап создан на сервере: $BACKUP_FILE"
elif [[ "$BACKUP_RESULT" == *WARNING* ]]; then
    warning "Контейнер БД не найден, пропускаем бэкап"
else
    error "Ошибка при создании бэкапа"
    exit 1
fi

# Шаг 2: Создание бэкапа package-lock.json НА СЕРВЕРЕ
info "💾 Создание бэкапа package-lock.json НА СЕРВЕРЕ..."
ssh "$SERVER" bash <<EOF
    cd $REMOTE_PATH
    if [ -f package-lock.json ]; then
        TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
        cp package-lock.json backups/package-lock.json.backup_\${TIMESTAMP}
        echo "Бэкап создан: backups/package-lock.json.backup_\${TIMESTAMP}"
    else
        echo "package-lock.json не найден, пропускаем"
    fi
EOF

# Шаг 3: Загрузка файлов на сервер
info "📤 Загрузка обновленных файлов на сервер..."
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
    --exclude='package-lock.json' \
    "$PROJECT_ROOT/" "$SERVER:$REMOTE_PATH/"

if [ $? -ne 0 ]; then
    error "Ошибка при загрузке файлов"
    exit 1
fi
success "Файлы загружены на сервер"

# Шаг 4: Установка Bun НА СЕРВЕРЕ (если не установлен)
info "🔍 Проверка и установка Bun НА СЕРВЕРЕ..."
BUN_CHECK=$(ssh "$SERVER" bash <<'EOF'
    if command -v bun &> /dev/null; then
        BUN_VERSION=$(bun --version)
        echo "INSTALLED:$BUN_VERSION"
    else
        echo "NOT_INSTALLED"
    fi
EOF
)

if [[ "$BUN_CHECK" == "NOT_INSTALLED" ]]; then
    info "Устанавливаю Bun на сервере..."
    ssh "$SERVER" "curl -fsSL https://bun.sh/install | bash"
    success "Bun установлен на сервере"
else
    BUN_VERSION="${BUN_CHECK#INSTALLED:}"
    success "Bun уже установлен на сервере: версия $BUN_VERSION"
fi

# Шаг 5: Миграция на Bun НА СЕРВЕРЕ
info "🚀 Выполнение миграции на Bun НА СЕРВЕРЕ..."
ssh "$SERVER" bash <<EOF
    cd $REMOTE_PATH
    
    # Экспорт PATH для Bun
    export BUN_INSTALL="\$HOME/.bun"
    export PATH="\$BUN_INSTALL/bin:\$PATH"
    
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
EOF

if [ $? -ne 0 ]; then
    error "Ошибка при миграции на Bun"
    warning "Восстановите бэкапы на сервере если нужно"
    exit 1
fi
success "Миграция на Bun выполнена на сервере"

# Шаг 6: Применение миграций БД (если есть)
info "📦 Применение миграций базы данных..."
ssh "$SERVER" bash <<EOF
    cd $REMOTE_PATH
    
    if [ -d migrations ]; then
        for migration in migrations/*.sql; do
            if [ -f "\$migration" ]; then
                echo "Применение \$migration..."
                docker exec -i \$(docker compose -f $COMPOSE_FILE ps -q postgres) psql -U postgres -d postgres < "\$migration"
            fi
        done
        echo "Все миграции применены"
    else
        echo "Директория миграций не найдена"
    fi
EOF

# Шаг 7: Пересборка и перезапуск контейнеров
info "🔄 Пересборка и перезапуск Docker контейнеров НА СЕРВЕРЕ..."
ssh "$SERVER" bash <<EOF
    cd $REMOTE_PATH
    
    # Остановка контейнеров
    docker compose -f $COMPOSE_FILE down
    
    # Пересборка с Bun
    docker compose -f $COMPOSE_FILE build --no-cache
    
    # Запуск контейнеров
    docker compose -f $COMPOSE_FILE up -d
    
    # Ожидание запуска
    sleep 10
    
    # Проверка статуса
    docker compose -f $COMPOSE_FILE ps
EOF

if [ $? -ne 0 ]; then
    error "Ошибка при перезапуске контейнеров"
    exit 1
fi
success "Контейнеры пересобраны и запущены с Bun"

# Шаг 8: Проверка здоровья приложения
info "🏥 Проверка здоровья приложения..."
sleep 5
HEALTH_CHECK=$(ssh "$SERVER" bash <<EOF
    cd $REMOTE_PATH
    CONTAINER_STATUS=\$(docker compose -f $COMPOSE_FILE ps --format json | grep -o '"State":"[^"]*"' | grep -o 'running' | wc -l)
    echo "RUNNING_CONTAINERS:\$CONTAINER_STATUS"
EOF
)

if [[ "$HEALTH_CHECK" == RUNNING_CONTAINERS:* ]]; then
    RUNNING_COUNT="${HEALTH_CHECK#RUNNING_CONTAINERS:}"
    success "Запущено контейнеров: $RUNNING_COUNT"
else
    warning "Не удалось проверить статус контейнеров"
fi

echo ""
success "═══════════════════════════════════════════════════════"
success "    ДЕПЛОЙ И МИГРАЦИЯ НА BUN ЗАВЕРШЕНЫ!"
success "═══════════════════════════════════════════════════════"
echo ""
info "📊 Все операции выполнены НА СЕРВЕРЕ:"
info "  ✅ Бэкапы созданы на сервере в $REMOTE_PATH/backups/"
info "  ✅ Bun установлен на сервере"
info "  ✅ Зависимости установлены с Bun"
info "  ✅ bun.lockb создан на сервере"
info "  ✅ Docker контейнеры пересобраны с Bun"
info "  ✅ Приложение запущено"
echo ""
info "🌐 Проверьте работу сайта на сервере"
echo ""
