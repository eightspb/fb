#!/usr/bin/env bash
set -euo pipefail

container_name="fb-net-postgres"
db_user="postgres"
db_name="postgres"
db_password="postgres"
backup_dir="backups"
production="false"

info() { printf '\033[34m[INFO]\033[0m %s\n' "$*"; }
success() { printf '\033[32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[WARN]\033[0m %s\n' "$*"; }
error() { printf '\033[31m[ERROR]\033[0m %s\n' "$*" >&2; }

usage() {
  cat <<'EOF'
Usage: bash scripts/backup-database.sh [options]

Options:
  --container NAME     Docker container name
  --db-user USER       PostgreSQL user
  --db-name NAME       Database name
  --db-password PASS   PostgreSQL password
  --backup-dir DIR     Backup directory relative to project root
  --production         Read production settings from .env
  -h, --help           Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --container) container_name="$2"; shift 2 ;;
    --db-user) db_user="$2"; shift 2 ;;
    --db-name) db_name="$2"; shift 2 ;;
    --db-password) db_password="$2"; shift 2 ;;
    --backup-dir) backup_dir="$2"; shift 2 ;;
    --production) production="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) error "Неизвестный аргумент: $1"; usage; exit 1 ;;
  esac
done

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_path="${project_root}/${backup_dir}"

command -v docker >/dev/null 2>&1 || { error "Docker не найден"; exit 1; }
command -v gzip >/dev/null 2>&1 || { error "gzip не найден"; exit 1; }

if ! docker ps -a --format '{{.Names}}' | grep -qx "$container_name"; then
  error "Контейнер '$container_name' не найден"
  docker ps -a --format '{{.Names}}'
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$container_name"; then
  warn "Контейнер '$container_name' не запущен. Запускаю..."
  docker start "$container_name" >/dev/null
  sleep 5
fi

if [[ "$production" == "true" ]]; then
  env_file="${project_root}/.env"
  if [[ -f "$env_file" ]]; then
    info "Чтение настроек из .env..."
    postgres_password="$(grep -E '^POSTGRES_PASSWORD=' "$env_file" | tail -n1 | cut -d= -f2- || true)"
    if [[ -n "$postgres_password" ]]; then
      db_password="$postgres_password"
    fi
    container_name="fb-net-db"
    db_user="postgres"
  else
    warn ".env файл не найден, используются значения по умолчанию"
  fi
fi

mkdir -p "$backup_path"

timestamp="$(date '+%Y%m%d_%H%M%S')"
backup_file_path="${backup_path}/db_backup_${timestamp}.sql"

info "Создание бэкапа базы данных..."
info "Контейнер: $container_name"
info "База данных: $db_name"
info "Пользователь: $db_user"
info "Файл бэкапа: $backup_file_path"

if PGPASSWORD="$db_password" docker exec -e PGPASSWORD="$db_password" "$container_name" \
  pg_dump -U "$db_user" -d "$db_name" --clean --if-exists --create > "$backup_file_path"; then
  file_size_bytes="$(wc -c < "$backup_file_path" | tr -d ' ')"
  file_size_mb="$(awk "BEGIN { printf \"%.2f\", ${file_size_bytes}/1024/1024 }")"
  success "Бэкап успешно создан"
  info "Размер файла: ${file_size_mb} MB"
  gzip -c "$backup_file_path" > "${backup_file_path}.gz"
  success "Сжатая версия создана: ${backup_file_path}.gz"
else
  error "Ошибка при создании бэкапа"
  exit 1
fi
