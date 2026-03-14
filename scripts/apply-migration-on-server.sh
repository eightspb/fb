#!/usr/bin/env bash
set -euo pipefail

server="root@155.212.217.60"
ssh_port="2222"
remote_path="/opt/fb-net"
compose_file="docker-compose.ssl.yml"
migration_name="006_fix_app_logs_rls"

usage() {
  cat <<'EOF'
Usage: bash scripts/apply-migration-on-server.sh [options]

Options:
  --server HOST        SSH host
  --ssh-port PORT      SSH port
  --remote-path PATH   Remote project path
  --compose-file FILE  docker compose file on server
  -h, --help           Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server) server="$2"; shift 2 ;;
    --ssh-port) ssh_port="$2"; shift 2 ;;
    --remote-path) remote_path="$2"; shift 2 ;;
    --compose-file) compose_file="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Неизвестный аргумент: $1" >&2; usage; exit 1 ;;
  esac
done

remote_exec() {
  ssh -p "$ssh_port" "$server" "cd $remote_path && $1"
}

echo
echo "=== Проверка и применение миграции ${migration_name} ==="

echo
echo "1. Проверка применённых миграций..."
migration_exists="$(remote_exec "docker compose -f $compose_file exec -T postgres psql -U postgres -d postgres -tA -c \"SELECT name FROM schema_migrations WHERE name = '${migration_name}';\"" | tr -d '[:space:]' || true)"

if [[ "$migration_exists" == "$migration_name" ]]; then
  echo "   Миграция уже применена"
else
  echo "   Миграция не применена, применяем..."
  echo
  echo "2. Применение миграции..."
  remote_exec "docker compose -f $compose_file exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f migrations/${migration_name}.sql"
  remote_exec "docker compose -f $compose_file exec -T postgres psql -U postgres -d postgres -c \"INSERT INTO schema_migrations (name) VALUES ('${migration_name}');\""
  echo "   Миграция применена успешно"
fi

echo
echo "3. Проверка статуса RLS для таблицы app_logs..."
remote_exec "docker compose -f $compose_file exec -T postgres psql -U postgres -d postgres -c \"SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'app_logs';\""

echo
echo "4. Проверка политик RLS..."
remote_exec "docker compose -f $compose_file exec -T postgres psql -U postgres -d postgres -c \"SELECT * FROM pg_policies WHERE tablename = 'app_logs';\""

echo
echo "5. Тест SELECT запроса (последние 3 лога)..."
remote_exec "docker compose -f $compose_file exec -T postgres psql -U postgres -d postgres -c \"SELECT id, level, LEFT(message, 50) AS message_preview, created_at FROM app_logs ORDER BY created_at DESC LIMIT 3;\""

echo
echo "=== Проверка завершена ==="
echo "Теперь откройте https://fibroadenoma.net/admin/logs и проверьте страницу логов"
