#!/usr/bin/env bash
set -euo pipefail

server="root@155.212.217.60"
ssh_port="2222"
remote_path="/opt/fb-net"
branch=""
repo_url="https://github.com/eightspb/fb.git"
init_mode="false"
skip_backup="false"
skip_migrations="false"
app_only="false"
site_only="false"
admin_only="false"
timestamp="$(date '+%Y%m%d_%H%M%S')"
remote_backup_dir="${remote_path}/backups"
ssh_retry_count=3
ssh_retry_delay_sec=3

info() { printf '\033[36m[INFO]\033[0m %s\n' "$*"; }
success() { printf '\033[32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[WARN]\033[0m %s\n' "$*"; }
error() { printf '\033[31m[ERROR]\033[0m %s\n' "$*" >&2; }
step() { printf '\n\033[35m=== %s ===\033[0m\n' "$*"; }

usage() {
  cat <<'EOF'
Usage: bash scripts/deploy-from-github.sh [options]

Options:
  --server HOST         SSH host
  --ssh-port PORT       SSH port
  --remote-path PATH    Remote project path
  --branch NAME         Git branch to deploy
  --repo-url URL        Git repository URL
  --init                Initial clone/setup on server
  --skip-backup         Skip DB backup
  --skip-migrations     Skip DB migrations
  --app-only            Deploy site + admin only
  --site-only           Deploy only site
  --admin-only          Deploy only admin
  -h, --help            Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server) server="$2"; shift 2 ;;
    --ssh-port) ssh_port="$2"; shift 2 ;;
    --remote-path) remote_path="$2"; remote_backup_dir="${2}/backups"; shift 2 ;;
    --branch) branch="$2"; shift 2 ;;
    --repo-url) repo_url="$2"; shift 2 ;;
    --init) init_mode="true"; shift ;;
    --skip-backup) skip_backup="true"; shift ;;
    --skip-migrations) skip_migrations="true"; shift ;;
    --app-only) app_only="true"; shift ;;
    --site-only) site_only="true"; shift ;;
    --admin-only) admin_only="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) error "Неизвестный аргумент: $1"; usage; exit 1 ;;
  esac
done

command -v ssh >/dev/null 2>&1 || { error "SSH не найден"; exit 1; }
command -v git >/dev/null 2>&1 || { error "git не найден"; exit 1; }

invoke_ssh() {
  local last_output=""
  local attempt=1

  while [[ $attempt -le $ssh_retry_count ]]; do
    if last_output="$(ssh \
      -p "$ssh_port" \
      -o ServerAliveInterval=30 \
      -o ServerAliveCountMax=6 \
      -o TCPKeepAlive=yes \
      -o ConnectTimeout=15 \
      -o ConnectionAttempts=3 \
      "$server" "$1" 2>&1)"; then
      [[ -n "$last_output" ]] && printf '%s\n' "$last_output"
      return 0
    fi

    if [[ $attempt -lt $ssh_retry_count ]]; then
      warn "SSH команда завершилась с ошибкой (попытка ${attempt}/${ssh_retry_count}). Повтор через ${ssh_retry_delay_sec}с..."
      sleep "$ssh_retry_delay_sec"
    fi
    attempt=$((attempt + 1))
  done

  [[ -n "$last_output" ]] && printf '%s\n' "$last_output" >&2
  return 1
}

get_compose_file() {
  if invoke_ssh "test -d $remote_path/certbot/conf/live/fibroadenoma.net && echo YES || echo NO" | grep -q YES; then
    echo "docker-compose.ssl.yml"
  else
    echo "docker-compose.production.yml"
  fi
}

resolve_default_branch() {
  local detected_branch=""

  detected_branch="$(git ls-remote --symref "$repo_url" HEAD 2>/dev/null | awk '/^ref:/ { sub("refs/heads/", "", $2); print $2; exit }')"

  if [[ -z "$detected_branch" ]] && git remote get-url origin >/dev/null 2>&1; then
    detected_branch="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')"
  fi

  if [[ -z "$detected_branch" ]]; then
    detected_branch="master"
    warn "Не удалось определить default branch у репозитория. Использую fallback: $detected_branch"
  else
    info "Автоопределена default branch репозитория: $detected_branch"
  fi

  printf '%s\n' "$detected_branch"
}

test_connection() {
  step "Проверка подключения к серверу"
  if ! ssh -p "$ssh_port" -o ConnectTimeout=10 -o BatchMode=yes "$server" "echo OK" >/dev/null 2>&1; then
    error "Не удалось подключиться к серверу $server"
    exit 1
  fi
  success "Подключение установлено"
}

initialize_server() {
  step "Первоначальная настройка сервера"

  info "Проверка Docker на сервере..."
  invoke_ssh "which docker >/dev/null 2>&1 || { echo NOT_FOUND; exit 1; }" >/dev/null || {
    error "Docker не установлен на сервере"
    exit 1
  }
  success "Docker найден"

  info "Проверка Git на сервере..."
  invoke_ssh "which git >/dev/null 2>&1 || { echo NOT_FOUND; exit 1; }" >/dev/null || {
    error "Git не установлен на сервере"
    exit 1
  }
  success "Git найден"

  parent_path="$(dirname "$remote_path")"
  invoke_ssh "mkdir -p $parent_path"

  if invoke_ssh "test -d $remote_path && echo YES || echo NO" | grep -q YES; then
    info "Директория существует, обновляем..."
    invoke_ssh "cd $remote_path && git fetch origin && git checkout $branch && git pull origin $branch"
  else
    info "Клонируем репозиторий..."
    invoke_ssh "git clone -b $branch $repo_url $remote_path"
  fi

  invoke_ssh "cd $remote_path && git log -1 --oneline"
  success "Репозиторий подготовлен в $remote_path"
}

backup_database() {
  local compose_file="$1"

  if [[ "$skip_backup" == "true" ]]; then
    warn "Бэкап БД пропущен"
    return
  fi

  step "Создание бэкапа базы данных"

  if ! invoke_ssh "cd $remote_path && docker compose -f $compose_file ps --status running 2>/dev/null | grep -q postgres"; then
    warn "Контейнер БД не запущен, пропускаем бэкап"
    return
  fi

  backup_file="${remote_backup_dir}/db_backup_${timestamp}.sql"
  invoke_ssh "mkdir -p $remote_backup_dir"
  info "Сохранение бэкапа на сервере: $backup_file"

  if invoke_ssh "cd $remote_path && docker compose -f $compose_file exec -T postgres pg_dump -U postgres -d postgres --clean --if-exists > $backup_file" >/dev/null; then
    size_bytes="$(invoke_ssh "stat -f %z $backup_file 2>/dev/null || stat -c %s $backup_file 2>/dev/null || echo 0" | tail -n1)"
    success "Бэкап создан на сервере: $backup_file (${size_bytes} bytes)"
  else
    warn "Не удалось создать бэкап"
  fi
}

update_repository() {
  step "Обновление кода из GitHub"
  invoke_ssh "cd $remote_path && if [ -d certbot ]; then chmod -R 700 certbot 2>/dev/null || true; fi"
  invoke_ssh "cd $remote_path && git stash push --keep-index -m 'temp-stash' 2>/dev/null || true"
  invoke_ssh "cd $remote_path && git fetch origin $branch && git checkout $branch && git pull origin $branch"
  invoke_ssh "cd $remote_path && if [ -d certbot ]; then chmod -R 755 certbot 2>/dev/null || true; fi"
  info "Последний коммит:"
  invoke_ssh "cd $remote_path && git log -1 --oneline"
  success "Код обновлен"
}

setup_server_dependencies() {
  step "Проверка и установка зависимостей сервера"
  invoke_ssh "cd $remote_path && bash scripts/setup-server-dependencies.sh"
  success "Зависимости проверены и установлены"
}

invoke_migrations() {
  local compose_file="$1"

  if [[ "$skip_migrations" == "true" ]]; then
    warn "Миграции БД пропущены"
    return
  fi

  step "Применение миграций БД"
  if ! invoke_ssh "cd $remote_path && docker compose -f $compose_file ps --status running 2>/dev/null | grep -q postgres"; then
    warn "Контейнер БД не запущен, пропускаем миграции"
    return
  fi

  invoke_ssh "cd $remote_path && bash scripts/apply-migrations-remote.sh $compose_file"
}

restart_containers() {
  local compose_file="$1"

  step "Перезапуск Docker контейнеров"

  if [[ "$site_only" == "true" ]]; then
    targets=(site)
    info "Режим: только site"
  elif [[ "$admin_only" == "true" ]]; then
    targets=(admin)
    info "Режим: только admin"
  elif [[ "$app_only" == "true" ]]; then
    targets=(site admin)
    info "Режим: site + admin"
  else
    targets=()
    info "Режим: полный деплой"
  fi

  if [[ ${#targets[@]} -gt 0 ]]; then
    target_str="${targets[*]}"
    invoke_ssh "cd $remote_path && docker compose -f $compose_file stop $target_str"
    invoke_ssh "cd $remote_path && docker compose -f $compose_file build --no-cache $target_str"
    invoke_ssh "cd $remote_path && docker compose -f $compose_file up -d --no-deps $target_str"
    sleep 10

    if invoke_ssh "cd $remote_path && docker compose -f $compose_file ps --status running 2>/dev/null | grep -q nginx"; then
      info "Перезапускаем nginx..."
      invoke_ssh "cd $remote_path && docker compose -f $compose_file restart nginx"
    fi
  else
    invoke_ssh "cd $remote_path && docker compose -f $compose_file down"
    invoke_ssh "cd $remote_path && docker compose -f $compose_file up -d --build"
    sleep 15
  fi

  invoke_ssh "cd $remote_path && docker compose -f $compose_file ps"
  success "Контейнеры запущены"
}

setup_telegram_webhook() {
  step "Настройка Telegram webhook"
  if invoke_ssh "cd $remote_path && bash scripts/fix-telegram-now.sh --non-interactive"; then
    success "Telegram webhook настроен успешно"
  else
    warn "Не удалось автоматически настроить Telegram webhook"
  fi
}

show_logs() {
  local compose_file="$1"
  step "Последние логи"

  if [[ "$site_only" == "true" ]]; then
    invoke_ssh "cd $remote_path && docker compose -f $compose_file logs --tail=20 site 2>/dev/null || true"
  elif [[ "$admin_only" == "true" ]]; then
    invoke_ssh "cd $remote_path && docker compose -f $compose_file logs --tail=20 admin 2>/dev/null || true"
  else
    invoke_ssh "cd $remote_path && docker compose -f $compose_file logs --tail=20 site admin 2>/dev/null || true"
  fi
}

echo
echo "==============================================================="
echo "  ДЕПЛОЙ ИЗ GITHUB НА СЕРВЕР"
echo "==============================================================="

if [[ -z "$branch" ]]; then
  branch="$(resolve_default_branch)"
fi

info "Сервер: $server"
info "Путь: $remote_path"
info "Ветка: $branch"

test_connection
compose_file="$(get_compose_file)"
if [[ "$compose_file" == "docker-compose.ssl.yml" ]]; then
  info "SSL сертификат найден, используем docker-compose.ssl.yml"
else
  info "SSL сертификат не найден, используем docker-compose.production.yml"
fi
info "Используется конфигурация: $compose_file"

if [[ "$init_mode" == "true" ]]; then
  initialize_server
  success "Первоначальная настройка завершена"
  exit 0
fi

backup_database "$compose_file"
update_repository
setup_server_dependencies
invoke_migrations "$compose_file"
restart_containers "$compose_file"
setup_telegram_webhook
show_logs "$compose_file"

echo
success "Деплой успешно завершен"
