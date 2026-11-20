#!/bin/sh
# Watcher de desarrollo: detecta cambios en el código fuente del frontend
# y rebuildea/redeploya el contenedor automáticamente.
# Corre dentro del servicio frontend-watcher (docker-compose.yml).
set -u

cd /project

# Asegurar que el plugin compose esté disponible en la imagen docker:cli
if ! docker compose version >/dev/null 2>&1; then
  apk add --no-cache docker-cli-compose >/dev/null 2>&1 || true
fi

hash_src() {
  find proyfrontendgrupo15-main/src -type f -exec md5sum {} + 2>/dev/null | sort | md5sum | cut -d' ' -f1
}

prev=""
echo "[watcher] observando proyfrontendgrupo15-main/src ..."

while true; do
  cur=$(hash_src)
  if [ -n "$prev" ] && [ "$cur" != "$prev" ]; then
    echo "[watcher] cambios detectados $(date '+%H:%M:%S') - rebuildeando frontend..."
    docker compose up -d --build --no-deps frontend
    echo "[watcher] deploy completo $(date '+%H:%M:%S')"
  fi
  # Actualizar baseline DESPUÉS del build para no disparar rebuilds dobles
  prev=$(hash_src)
  sleep 5
done
