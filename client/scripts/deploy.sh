#!/usr/bin/env bash
# Builds the app and rsyncs dist/ to DreamHost over SSH.
# Requires .env.deploy.local (copy .env.deploy.local.example and fill it in).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.deploy.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE" >&2
  echo "Copy .env.deploy.local.example to .env.deploy.local and fill in your DreamHost details." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${DEPLOY_USER:?Set DEPLOY_USER in .env.deploy.local}"
: "${DEPLOY_HOST:?Set DEPLOY_HOST in .env.deploy.local}"
: "${DEPLOY_PATH:?Set DEPLOY_PATH in .env.deploy.local}"

# The API URL is baked into the bundle at build time (Vite inlines VITE_* variables).
# Without it the build would silently point at http://localhost:8080.
if ! grep -qs '^VITE_API_URL=.' "$PROJECT_ROOT/.env.production.local"; then
  echo "Missing VITE_API_URL in .env.production.local" >&2
  echo "Copy .env.production.local.example and set your Render API URL." >&2
  exit 1
fi

echo "Building..."
(cd "$PROJECT_ROOT" && yarn build)

# --delete makes the remote folder mirror dist/ exactly, which is what you
# want for a Vite build (old fingerprinted JS/CSS chunks get cleaned up).
# Only point DEPLOY_PATH at a directory dedicated to this app -- anything
# else already in that folder on the server will be removed.
echo "Uploading dist/ to $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH ..."
rsync -avz --delete \
  "$PROJECT_ROOT/dist/" \
  "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"

echo "Deploy complete."
