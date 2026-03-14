#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEGACY_DEPLOY_SCRIPT="$ROOT_DIR/scripts/deploy-from-github.sh"

mode="app"
branch=""
server=""
ssh_port=""
remote_path=""
repo_url=""
skip_backup="false"
skip_migrations="false"
init_mode="false"

info() { printf '\033[36m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[warn]\033[0m %s\n' "$*"; }
error() { printf '\033[31m[error]\033[0m %s\n' "$*" >&2; }

usage() {
  cat <<'EOF'
Usage:
  bash scripts/deploy.sh [mode] [options]

Modes:
  app        Deploy site + admin only (default)
  site       Deploy only public site/API
  admin      Deploy only admin panel
  full       Full deploy with DB migrations

Options:
  --branch NAME         Deploy a specific branch
  --server HOST         Override SSH host
  --ssh-port PORT       Override SSH port
  --remote-path PATH    Override remote project path
  --repo-url URL        Override Git repository URL
  --skip-backup         Skip DB backup
  --skip-migrations     Skip migrations in full mode
  --init                First-time server setup
  -h, --help            Show this help

Examples:
  bash scripts/deploy.sh
  bash scripts/deploy.sh app
  bash scripts/deploy.sh admin
  bash scripts/deploy.sh full --branch main
EOF
}

if [[ ! -f "$LEGACY_DEPLOY_SCRIPT" ]]; then
  error "Base deploy script not found: $LEGACY_DEPLOY_SCRIPT"
  exit 1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    app|site|admin|full)
      mode="$1"
      shift
      ;;
    --branch)
      branch="$2"
      shift 2
      ;;
    --server)
      server="$2"
      shift 2
      ;;
    --ssh-port)
      ssh_port="$2"
      shift 2
      ;;
    --remote-path)
      remote_path="$2"
      shift 2
      ;;
    --repo-url)
      repo_url="$2"
      shift 2
      ;;
    --skip-backup)
      skip_backup="true"
      shift
      ;;
    --skip-migrations)
      skip_migrations="true"
      shift
      ;;
    --init)
      init_mode="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      error "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

cmd=(bash "$LEGACY_DEPLOY_SCRIPT")

case "$mode" in
  app)
    cmd+=(--app-only)
    ;;
  site)
    cmd+=(--site-only)
    ;;
  admin)
    cmd+=(--admin-only)
    ;;
  full)
    ;;
esac

if [[ "$init_mode" == "true" ]]; then
  cmd+=(--init)
fi

if [[ "$skip_backup" == "true" ]]; then
  cmd+=(--skip-backup)
fi

if [[ "$skip_migrations" == "true" ]]; then
  if [[ "$mode" != "full" ]]; then
    warn "--skip-migrations has no effect outside full deploy mode"
  fi
  cmd+=(--skip-migrations)
fi

if [[ -n "$branch" ]]; then
  cmd+=(--branch "$branch")
fi

if [[ -n "$server" ]]; then
  cmd+=(--server "$server")
fi

if [[ -n "$ssh_port" ]]; then
  cmd+=(--ssh-port "$ssh_port")
fi

if [[ -n "$remote_path" ]]; then
  cmd+=(--remote-path "$remote_path")
fi

if [[ -n "$repo_url" ]]; then
  cmd+=(--repo-url "$repo_url")
fi

info "Mode: $mode"
if [[ -n "$branch" ]]; then
  info "Branch: $branch"
fi

exec "${cmd[@]}"
