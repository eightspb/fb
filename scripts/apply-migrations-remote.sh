#!/bin/bash
# Скрипт для применения миграций на удаленном сервере
set -e

COMPOSE_FILE="${1:-docker-compose.ssl.yml}"

echo "=== Применение миграций БД ==="

# Инициализируем таблицу миграций
bash scripts/init-migrations-table.sh "$COMPOSE_FILE"

# Получаем список миграций
migrations=$(ls migrations/*.sql 2>/dev/null | sort)

if [ -z "$migrations" ]; then
    echo "Папка migrations/ пуста или не найдена"
    exit 0
fi

# Применяем каждую миграцию
for migration_path in $migrations; do
    migration_name=$(basename "$migration_path" .sql)
    
    # Проверяем, применена ли миграция
    applied=$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -d postgres -tA -c "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE name = '$migration_name');")
    
    if [ "$applied" = "t" ]; then
        echo "  [SKIP] $migration_name (уже применена)"
    else
        echo "  [APPLY] $migration_name"
        if docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f "$migration_path"; then
            # Записываем успешную миграцию
            docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -d postgres -c "INSERT INTO schema_migrations (name) VALUES ('$migration_name');"
        else
            echo "  ❌ Ошибка при применении миграции $migration_name"
            exit 1
        fi
    fi
done

echo "[OK] Миграции обработаны"
