#!/usr/bin/env bash
set -euo pipefail

server="${SERVER:-root@155.212.217.60}"
ssh_port="${SSH_PORT:-2222}"
local_port="${LOCAL_PORT:-54321}"
remote_port="${REMOTE_PORT:-5432}"
db_container="${DB_CONTAINER:-fb-net-db}"

container_ip="$(ssh -p "$ssh_port" "$server" "docker inspect $db_container --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'" | tr -d '\r\n')"

if [[ -z "$container_ip" ]]; then
  echo "Не удалось определить IP контейнера $db_container" >&2
  exit 1
fi

echo "Tunnel: localhost:${local_port} -> ${container_ip}:${remote_port} via ${server}"
exec ssh -p "$ssh_port" -N -L "${local_port}:${container_ip}:${remote_port}" "$server"
