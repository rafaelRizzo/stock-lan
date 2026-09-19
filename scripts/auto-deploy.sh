#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="/tmp/stock-lan-auto-deploy.lock"
LOG_FILE="$REPO_DIR/scripts/auto-deploy.log"

exec 200>"$LOCK_FILE"
flock -n 200 || exit 0

log() { echo "$(date '+%F %T') $*" >> "$LOG_FILE"; }

cd "$REPO_DIR"

log "verificação iniciada"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

git fetch origin "$BRANCH" --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  log "sem atualização em $BRANCH ($LOCAL)"
  exit 0
fi

log "atualização detectada em $BRANCH ($LOCAL -> $REMOTE)"

if ! git pull --ff-only origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE"; then
  log "ERRO: pull não é fast-forward, abortando (verifique alterações locais no servidor)"
  exit 1
fi

if docker compose --env-file frontend/.env up -d --build --force-recreate 2>&1 | tee -a "$LOG_FILE"; then
  log "deploy concluído em $(git rev-parse HEAD)"
else
  log "ERRO: falha no docker compose up --build"
  exit 1
fi
