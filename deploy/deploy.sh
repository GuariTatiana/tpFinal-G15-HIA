#!/usr/bin/env bash
# Uso: deploy/deploy.sh <tag> <owner>
# Despliega las imágenes <tag>; si el healthcheck falla vuelve al tag anterior.
set -euo pipefail
TAG="$1"; OWNER="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
STATE=".deployed_tag"; PREV="$(cat "$STATE" 2>/dev/null || true)"
APP_PORT="$(grep -E '^APP_PORT=' .env | cut -d= -f2)"; APP_PORT="${APP_PORT:-8080}"

up() {
  export BACKEND_IMAGE="ghcr.io/$OWNER/g15-backend:$1"
  export FRONTEND_IMAGE="ghcr.io/$OWNER/g15-frontend:$1"
  docker compose pull backend frontend
  docker compose up -d --no-build
}
healthy() {
  for _ in $(seq 1 30); do
    curl -fsS "http://127.0.0.1:${APP_PORT}/api/hello" >/dev/null 2>&1 && return 0
    sleep 5
  done
  return 1
}

echo ">> Desplegando $TAG (anterior: ${PREV:-ninguno})"
up "$TAG"
if healthy; then
  echo "$TAG" > "$STATE"; echo ">> OK: $TAG en producción"
else
  echo "!! Healthcheck falló con $TAG"
  docker compose logs --tail=50 backend || true
  if [ -n "$PREV" ]; then echo ">> Rollback a $PREV"; up "$PREV"; healthy && echo ">> Rollback OK"; fi
  exit 1
fi
