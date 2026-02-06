#!/bin/bash

# Скрипт для применения миграций к базе данных
# Использование: ./scripts/apply-migrations.sh [migration_file]
# Если migration_file не указан, применяются все миграции по порядку

set -e  # Прерывать при ошибках

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         ПРИМЕНЕНИЕ МИГРАЦИЙ БАЗЫ ДАННЫХ                      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    exit 1
fi

# Загружаем переменные окружения
export $(grep -v '^#' .env | xargs)

# Проверяем наличие POSTGRES_PASSWORD
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ POSTGRES_PASSWORD не установлен в .env"
    exit 1
fi

# Определяем контейнер базы данных
DB_CONTAINER="fb-net-db"

# Проверяем, запущен ли контейнер
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo "❌ Контейнер $DB_CONTAINER не запущен"
    echo "   Запустите его командой: docker-compose -f docker-compose.production.yml up -d"
    exit 1
fi

echo "✅ Контейнер базы данных найден: $DB_CONTAINER"
echo ""

# Функция для применения одной миграции
apply_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file" .sql)
    
    echo "📝 Применение миграции: $migration_name"
    
    # Копируем файл миграции в контейнер
    docker cp "$migration_file" "$DB_CONTAINER:/tmp/$migration_name.sql"
    
    # Применяем миграцию
    if docker exec "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f "/tmp/$migration_name.sql"; then
        echo "   ✅ Миграция $migration_name применена успешно"
        # Удаляем временный файл
        docker exec "$DB_CONTAINER" rm "/tmp/$migration_name.sql"
        return 0
    else
        echo "   ❌ Ошибка при применении миграции $migration_name"
        docker exec "$DB_CONTAINER" rm "/tmp/$migration_name.sql" 2>/dev/null || true
        return 1
    fi
}

# Если указан конкретный файл миграции
if [ -n "$1" ]; then
    if [ -f "$1" ]; then
        apply_migration "$1"
    else
        echo "❌ Файл миграции не найден: $1"
        exit 1
    fi
else
    # Применяем все миграции по порядку
    echo "🔍 Поиск файлов миграций в папке migrations/..."
    
    if [ ! -d "migrations" ]; then
        echo "❌ Папка migrations не найдена"
        exit 1
    fi
    
    # Находим все SQL файлы и сортируем их
    migration_files=$(find migrations -name "*.sql" -type f | sort)
    
    if [ -z "$migration_files" ]; then
        echo "⚠️  Файлы миграций не найдены"
        exit 0
    fi
    
    echo "Найдено миграций: $(echo "$migration_files" | wc -l)"
    echo ""
    
    # Применяем каждую миграцию
    failed=0
    for migration_file in $migration_files; do
        if ! apply_migration "$migration_file"; then
            failed=$((failed + 1))
        fi
        echo ""
    done
    
    if [ $failed -eq 0 ]; then
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║         ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ УСПЕШНО                       ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
    else
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║         НЕКОТОРЫЕ МИГРАЦИИ НЕ БЫЛИ ПРИМЕНЕНЫ                 ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo ""
        echo "❌ Не удалось применить $failed миграций"
        exit 1
    fi
fi

echo ""
echo "✅ Готово!"
echo ""
