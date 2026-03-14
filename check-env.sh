#!/usr/bin/env bash
set -euo pipefail

print_vars() {
  local env_file="$1"

  if [[ ! -f "$env_file" ]]; then
    echo "Файл $env_file не найден!"
    return
  fi

  echo "Найден файл $env_file"

  while IFS= read -r line; do
    [[ "$line" =~ ^SMTP_ ]] || continue
    [[ -n "${line// }" ]] || continue
    [[ "$line" =~ ^# ]] && continue

    local key="${line%%=*}"
    local value="${line#*=}"

    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"

    if [[ "$key" == "SMTP_PASSWORD" ]]; then
      echo "$key = ***скрыто***"
    else
      echo "$key = $value"
    fi
  done < "$env_file"
}

echo "Проверка переменных окружения SMTP..."
echo

print_vars ".env.local"

echo
echo "Проверка файла .env..."
print_vars ".env"

echo
echo "Для запуска сервера используйте: bun run dev"
echo "Для проверки SMTP откройте: http://localhost:3000/api/test-smtp"
