#!/bin/sh
# Flood de conexiones para saturar PostgreSQL (max_connections=100)
# Uso: sh /tmp/flood.sh [cantidad] [segundos]
N=${1:-150}
SLEEP=${2:-1800}
i=0
while [ $i -lt $N ]; do
  psql -U postgres -d canchas_db -c "SELECT pg_sleep($SLEEP)" >/dev/null 2>&1 &
  i=$((i+1))
done
wait
