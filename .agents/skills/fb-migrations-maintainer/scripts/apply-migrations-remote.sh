#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
PROJECT_SCRIPT="$ROOT_DIR/scripts/apply-migrations-remote.sh"
COMPOSE_FILE="${1:-docker-compose.ssl.yml}"

if [[ ! -x "$PROJECT_SCRIPT" ]]; then
  echo "[fb-migrations-maintainer] project script not found: $PROJECT_SCRIPT" >&2
  exit 1
fi

echo "[fb-migrations-maintainer] delegating to project script"
echo "[fb-migrations-maintainer] compose file: $COMPOSE_FILE"

exec "$PROJECT_SCRIPT" "$COMPOSE_FILE"
