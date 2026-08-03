#!/usr/bin/env bash
# Deploy Abundish Medusa backend to staging or production.
# Usage: deploy.sh staging|prod

set -euo pipefail

ENV="${1:-}"
if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  echo "Usage: deploy.sh staging|prod"
  exit 1
fi

case "$ENV" in
  staging)
    DEPLOY_DIR="${STAGING_DIR:-/home/deploy/new-store-staging}"
    COMPOSE_FILE="docker-compose.staging.yml"
    BRANCH="${STAGING_BRANCH:-main}"
    LABEL="Staging"
    ;;
  prod)
    DEPLOY_DIR="${PROD_DIR:-/home/deploy/new-store}"
    COMPOSE_FILE="docker-compose.yml"
    BRANCH="${PROD_BRANCH:-main}"
    LABEL="Production"
    ;;
esac

if [[ ! -d "$DEPLOY_DIR" ]]; then
  echo "Deploy directory not found: $DEPLOY_DIR"
  exit 1
fi

cd "$DEPLOY_DIR"

echo "========================================"
echo "  $LABEL deploy — $(date -Is)"
echo "  Directory: $DEPLOY_DIR"
echo "========================================"

if [[ -d .git ]]; then
  echo "==> Pulling latest code (branch: $BRANCH)..."
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  echo "==> WARNING: $DEPLOY_DIR is not a git repository — skipping pull."
  echo "    Clone the repo or run: git init && git remote add origin <repo-url>"
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $DEPLOY_DIR/$COMPOSE_FILE"
  exit 1
fi

echo "==> Building medusa container..."
BUILD_ARGS=()
if [[ "${DEPLOY_NO_CACHE:-}" == "1" ]]; then
  BUILD_ARGS+=(--no-cache)
fi
docker compose -f "$COMPOSE_FILE" build "${BUILD_ARGS[@]}" medusa

echo "==> Starting containers..."
docker compose -f "$COMPOSE_FILE" up -d

echo "==> Running database migrations..."
docker compose -f "$COMPOSE_FILE" exec -T medusa sh -c "cd /server && npx medusa db:migrate"

echo "==> $LABEL deployment complete ($(date -Is))"
docker compose -f "$COMPOSE_FILE" ps
