#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

info() { printf '\033[36m%s\033[0m\n' "$*"; }
item() { printf '\033[33m%s\033[0m\n' "$*"; }
ok() { printf '\033[32m%s\033[0m\n' "$*"; }
note() { printf '\033[90m%s\033[0m\n' "$*"; }

delete_if_exists() {
  local path="$1"
  if [[ -e "$path" ]]; then
    rm -rf "$path"
    ok "   $path удален"
  else
    note "   $path не найден"
  fi
}

info "Начинаю очистку всех кешей..."
echo

item "1. Очистка Next.js кеша (.next)..."
delete_if_exists ".next"

item "2. Очистка кеша Turbopack (.turbo)..."
delete_if_exists ".turbo"

item "3. Проверка node_modules..."
if [[ -d node_modules ]]; then
  note "   node_modules найден (не удаляется автоматически)"
else
  note "   node_modules не найден"
fi

item "4. Очистка bun кеша..."
if command -v bun >/dev/null 2>&1 && bun pm cache rm >/dev/null 2>&1; then
  ok "   bun кеш очищен"
else
  note "   bun не установлен или кеш уже пуст"
fi

item "5. Очистка Docker кешей..."
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  note "   Docker обнаружен, очищаю кеши..."
  docker compose down >/dev/null 2>&1 || true
  docker image prune -f >/dev/null 2>&1 || true
  docker container prune -f >/dev/null 2>&1 || true
  docker volume prune -f >/dev/null 2>&1 || true
  docker builder prune -f >/dev/null 2>&1 || true
  ok "   Docker кеши очищены"
else
  note "   Docker не запущен или недоступен"
fi

item "6. Очистка временных файлов TypeScript..."
tsbuildinfo_files="$(find . -name '*.tsbuildinfo' -type f 2>/dev/null || true)"
if [[ -n "$tsbuildinfo_files" ]]; then
  while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    rm -f "$file"
  done <<< "$tsbuildinfo_files"
  ok "   TypeScript build info файлы удалены"
else
  note "   TypeScript build info файлы не найдены"
fi

item "7. Очистка кеша ESLint..."
delete_if_exists ".eslintcache"

item "8. Очистка кеша Vercel..."
delete_if_exists ".vercel"

echo
ok "Очистка завершена!"
echo
info "Для пересборки проекта выполните: bun run build"
