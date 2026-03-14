#!/usr/bin/env bash
set -euo pipefail

message=""
allow_secrets="false"

info() { echo "[commit-and-push] $*"; }
fail() { echo "[commit-and-push] $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: bash scripts/commit-and-push.sh [options]

Options:
  -m, --message TEXT   Commit message
  --allow-secrets      Allow committing matching secret-like files
  -h, --help           Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message) message="$2"; shift 2 ;;
    --allow-secrets) allow_secrets="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Неизвестный аргумент: $1" ;;
  esac
done

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Not inside a git repository."

get_auto_commit_message() {
  local changes
  changes="$(git diff --cached --name-status || true)"

  if [[ -z "$changes" ]]; then
    auto_subject="chore: update $(date '+%Y-%m-%d %H:%M')"
    auto_body=""
    return
  fi

  local added=0 modified=0 deleted=0 renamed=0 total=0
  local file_lines=""

  while IFS=$'\t' read -r status path1 path2; do
    [[ -n "${status:-}" ]] || continue
    case "$status" in
      A*)
        added=$((added + 1))
        total=$((total + 1))
        file_lines+="A  ${path1}"$'\n'
        ;;
      M*)
        modified=$((modified + 1))
        total=$((total + 1))
        file_lines+="M  ${path1}"$'\n'
        ;;
      D*)
        deleted=$((deleted + 1))
        total=$((total + 1))
        file_lines+="D  ${path1}"$'\n'
        ;;
      R*)
        renamed=$((renamed + 1))
        total=$((total + 1))
        file_lines+="R  ${path1} -> ${path2}"$'\n'
        ;;
      *)
        total=$((total + 1))
        file_lines+="${status}  ${path1}"$'\n'
        ;;
    esac
  done <<< "$changes"

  local details=""
  [[ $added -gt 0 ]] && details+=" A:${added}"
  [[ $modified -gt 0 ]] && details+=" M:${modified}"
  [[ $deleted -gt 0 ]] && details+=" D:${deleted}"
  [[ $renamed -gt 0 ]] && details+=" R:${renamed}"

  details="${details# }"
  if [[ -n "$details" ]]; then
    details=" (${details})"
  fi

  auto_subject="chore: update ${total} file(s)${details}"
  auto_body=$(
    cat <<EOF
Summary: ${total} file(s) changed${details}
Generated: $(date '+%Y-%m-%d %H:%M')

Files:
${file_lines:-"(no detailed file list available)"}
EOF
  )
}

if [[ "$allow_secrets" != "true" ]]; then
  blocked_match="$(
    git status --porcelain | while IFS= read -r line; do
      path="${line:3}"
      case "$path" in
        .env|.env.local|.env.*|credentials.json|secrets.json)
          echo "$path"
          ;;
      esac
    done
  )"

  if [[ -n "$blocked_match" ]]; then
    fail "Refusing to commit potential secrets: ${blocked_match//$'\n'/, }. Re-run with --allow-secrets if needed."
  fi
fi

info "Staging all changes..."
git add -A

status="$(git status --porcelain)"
if [[ -z "$status" ]]; then
  info "No changes to commit."
  exit 0
fi

message_body=""
if [[ -z "$message" ]]; then
  get_auto_commit_message
  message="$auto_subject"
  message_body="$auto_body"
fi

info "Using commit message: $message"
info "Creating commit..."
if [[ -n "$message_body" ]]; then
  git commit -m "$message" -m "$message_body"
else
  git commit -m "$message"
fi

info "Pushing to current branch..."
git push

info "Done."
