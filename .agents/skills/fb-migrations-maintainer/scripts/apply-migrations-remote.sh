#!/usr/bin/env bash
set -euo pipefail

# Idempotent placeholder for remote migration apply.
# This script intentionally performs no destructive action until configured.

MIGRATION_FILE="${1:-}"

if [[ -z "${MIGRATION_FILE}" ]]; then
  echo "usage: $0 <migration-file.sql>" >&2
  exit 1
fi

echo "[apply-migrations-remote] requested migration: ${MIGRATION_FILE}"
echo "[apply-migrations-remote] TODO: connect to remote host and apply migration safely"
echo "[apply-migrations-remote] TODO: record migration in schema_migrations"
echo "[apply-migrations-remote] completed (placeholder)"

