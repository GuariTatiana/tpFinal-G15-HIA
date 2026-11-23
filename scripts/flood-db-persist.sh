#!/bin/sh
# Flood persistente: mantiene N conexiones ocupadas y REINTENTA si caen.
# Uso: sh /tmp/flood.sh [workers] [sleep_seg]
N=${1:-120}
SLEEP=${2:-600}

worker() {
  while true; do
    psql -U postgres -d canchas_db -c "SELECT pg_sleep($SLEEP)" >/dev/null 2>&1
  done
}

i=0
while [ $i -lt $N ]; do
  worker &
  i=$((i+1))
done
wait
