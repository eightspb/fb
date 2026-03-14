#!/usr/bin/env bash
set -euo pipefail

server="root@155.212.217.60"
ssh_port="2222"
local_port="54321"
remote_port="5432"
db_container="fb-net-db"
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
shutdown_signal=""

info() { printf '\033[36m[INFO]\033[0m %s\n' "$*"; }
success() { printf '\033[32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[WARN]\033[0m %s\n' "$*"; }
error() { printf '\033[31m[ERROR]\033[0m %s\n' "$*" >&2; }

usage() {
  cat <<'EOF'
Usage: bash scripts/dev-remote.sh [options]

Options:
  --server HOST         SSH host (default: root@155.212.217.60)
  --ssh-port PORT       SSH port (default: 2222)
  --local-port PORT     Local forwarded PostgreSQL port (default: 54321)
  --remote-port PORT    Remote PostgreSQL port (default: 5432)
  --db-container NAME   Docker container with PostgreSQL (default: fb-net-db)
  -h, --help            Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server) server="$2"; shift 2 ;;
    --ssh-port) ssh_port="$2"; shift 2 ;;
    --local-port) local_port="$2"; shift 2 ;;
    --remote-port) remote_port="$2"; shift 2 ;;
    --db-container) db_container="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) error "Неизвестный аргумент: $1"; usage; exit 1 ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    error "Не найдена команда: $1"
    exit 1
  }
}

handle_signal() {
  shutdown_signal="${1:-TERM}"
  exit 130
}

preflight_check() {
  info "Проверка локального окружения..."

  if [[ ! -d "$project_root/node_modules" ]]; then
    error "Не найдены локальные зависимости (node_modules). Сначала выполните: bun install"
    exit 1
  fi

  local preflight_output
  if ! preflight_output="$(
    cd "$project_root" && node <<'NODE'
const checks = [
  { name: 'next', hint: 'bun install' },
  { name: 'lightningcss', hint: 'bun install' },
  { name: 'sharp', hint: 'bun install' },
];

let failed = false;

for (const check of checks) {
  try {
    require(check.name);
    console.log(`[OK] ${check.name}`);
  } catch (error) {
    failed = true;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[FAIL] ${check.name}: ${message}`);
    console.log(`[HINT] ${check.name}: ${check.hint}`);
  }
}

if (failed) {
  process.exit(1);
}
NODE
  )"; then
    printf '%s\n' "$preflight_output"
    error "Локальное окружение не готово. Исправьте ошибки выше и повторите запуск."
    exit 1
  fi

  printf '%s\n' "$preflight_output"
  success "Локальное окружение готово"
}

cleanup() {
  local exit_code=$?

  trap - EXIT INT TERM
  echo
  info "Останавливаю процессы..."

  if [[ -n "$shutdown_signal" ]]; then
    sleep 1
  else
    for pid in "${site_pid:-}" "${admin_pid:-}" "${tunnel_pid:-}"; do
      [[ -n "${pid:-}" ]] || continue
      if kill -0 "$pid" >/dev/null 2>&1; then
        kill "$pid" >/dev/null 2>&1 || true
      fi
    done
    sleep 1
  fi

  for pid in "${site_pid:-}" "${admin_pid:-}" "${tunnel_pid:-}"; do
    [[ -n "${pid:-}" ]] || continue
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done

  sleep 1

  for pid in "${site_pid:-}" "${admin_pid:-}" "${tunnel_pid:-}"; do
    [[ -n "${pid:-}" ]] || continue
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  done

  if command -v lsof >/dev/null 2>&1; then
    local leftover
    leftover="$(lsof -tiTCP:"$local_port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$leftover" ]]; then
      for pid in $leftover; do
        local comm
        comm="$(ps -p "$pid" -o comm= 2>/dev/null | tr -d ' ')"
        if [[ "$comm" == *ssh* ]]; then
          kill "$pid" >/dev/null 2>&1 || true
        fi
      done
    fi
  fi

  success "Всё остановлено"
  exit "$exit_code"
}

require_cmd ssh
require_cmd bun
require_cmd docker
require_cmd lsof

trap cleanup EXIT
trap 'handle_signal INT' INT
trap 'handle_signal TERM' TERM

preflight_check

info "Проверка SSH подключения к серверу..."
if ! ssh -p "$ssh_port" -o ConnectTimeout=5 -o BatchMode=yes "$server" "echo OK" >/dev/null 2>&1; then
  error "Не удалось подключиться к серверу $server"
  exit 1
fi
success "SSH подключение работает"

info "Проверка PostgreSQL контейнера на сервере..."
db_check="$(ssh -p "$ssh_port" "$server" "docker ps --filter name=$db_container --format '{{.Names}}'" 2>&1 || true)"
if [[ "$db_check" != *"$db_container"* ]]; then
  error "PostgreSQL контейнер '$db_container' не запущен на сервере"
  exit 1
fi
success "PostgreSQL контейнер '$db_container' запущен"

info "Проверка доступности порта $local_port..."
existing_pids="$(lsof -tiTCP:"$local_port" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$existing_pids" ]]; then
  warn "Порт $local_port уже используется, пробую освободить SSH-процессы"
  for pid in $existing_pids; do
    comm="$(ps -p "$pid" -o comm= 2>/dev/null | tr -d ' ')"
    if [[ "$comm" == *ssh* ]]; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  sleep 1
fi

info "Получение IP адреса PostgreSQL контейнера..."
container_ip="$(ssh -p "$ssh_port" "$server" "docker inspect $db_container --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'" 2>/dev/null | tr -d '\r\n')"
if [[ -z "$container_ip" ]]; then
  error "Не удалось получить IP адрес контейнера $db_container"
  exit 1
fi
success "IP адрес PostgreSQL контейнера: $container_ip"

info "Создание SSH туннеля localhost:$local_port -> $container_ip:$remote_port"
ssh -p "$ssh_port" -N -o ExitOnForwardFailure=yes -L "${local_port}:${container_ip}:${remote_port}" "$server" &
tunnel_pid=$!

for _ in 1 2 3 4 5 6 7 8; do
  if lsof -tiTCP:"$local_port" -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$tunnel_pid" >/dev/null 2>&1; then
    error "SSH туннель завершился раньше времени"
    exit 1
  fi
  sleep 1
done

if ! lsof -tiTCP:"$local_port" -sTCP:LISTEN >/dev/null 2>&1; then
  error "Не удалось поднять SSH туннель на порту $local_port"
  exit 1
fi
success "SSH туннель создан"

echo
echo "==============================================================="
echo "  Локальная разработка с удалённой базой данных"
echo "==============================================================="
echo "  SSH туннель: localhost:$local_port -> PostgreSQL на сервере"
echo "  Сайт:       http://localhost:3000"
echo "  Админка:    http://localhost:3001/admin"
echo
warn "Нажмите Ctrl+C для остановки"
echo

(
  cd "$project_root"
  exec bun run dev:site
) &
site_pid=$!
info "Запущен site (PID: $site_pid)"

sleep 2

(
  cd "$project_root"
  exec bun run dev:admin
) &
admin_pid=$!
info "Запущен admin (PID: $admin_pid)"

while true; do
  if ! kill -0 "$site_pid" >/dev/null 2>&1; then
    warn "Процесс site завершился"
    break
  fi

  if ! kill -0 "$admin_pid" >/dev/null 2>&1; then
    warn "Процесс admin завершился"
    break
  fi

  if ! kill -0 "$tunnel_pid" >/dev/null 2>&1; then
    warn "SSH туннель завершился"
    break
  fi

  sleep 1
done
