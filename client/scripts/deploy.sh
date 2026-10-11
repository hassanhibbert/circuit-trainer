#!/usr/bin/env bash
# build and rsync dist/ to dreamhost
# settings come from env vars, or .env.deploy.local / .env.production.local
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# parsed instead of sourced so it can't run anything, and never overrides an exported var
load_env_file() {
  local file="$1" line key value
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue ;; esac
    key="${line%%=*}"
    value="${line#*=}"
    if [ "$key" = "$line" ] || [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      echo "Ignoring a malformed line in $(basename "$file")" >&2
      continue
    fi
    if ! printenv "$key" >/dev/null 2>&1; then
      export "$key=$value"
    fi
  done < "$file"
}

load_env_file "$PROJECT_ROOT/.env.deploy.local"
load_env_file "$PROJECT_ROOT/.env.production.local"

: "${DEPLOY_USER:?DEPLOY_USER is not set (environment or .env.deploy.local)}"
: "${DEPLOY_HOST:?DEPLOY_HOST is not set (environment or .env.deploy.local)}"
: "${DEPLOY_PATH:?DEPLOY_PATH is not set (environment or .env.deploy.local)}"

: "${VITE_API_URL:?VITE_API_URL is not set (environment or .env.production.local)}"

echo "Building..."
(cd "$PROJECT_ROOT" && yarn build)

echo "Uploading dist/ to DreamHost..."
rsync -avz --delete \
  "$PROJECT_ROOT/dist/" \
  "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"

echo "Deploy complete."
