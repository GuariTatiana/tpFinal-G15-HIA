#!/bin/bash
# Watchdog de failover: si el primario deja de responder, promueve la réplica.
set -u

FAILS=0
REQUIRED_FAILS=3

while true; do
  if pg_isready -h db-primary -p 5432 -d postgres >/dev/null 2>&1; then
    FAILS=0
  else
    FAILS=$((FAILS + 1))
    if [ "$FAILS" -ge "$REQUIRED_FAILS" ]; then
      IN_REC=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h db-replica -p 5432 -U "$POSTGRES_USER" -d postgres -tAc "SELECT pg_is_in_recovery();" 2>/dev/null || echo "err")
      if [ "$IN_REC" = "t" ]; then
        echo "[watchdog] primario caido (${FAILS} checks). Promoviendo db-replica..."
        PGPASSWORD="$POSTGRES_PASSWORD" psql -h db-replica -p 5432 -U "$POSTGRES_USER" -d postgres -c "SELECT pg_promote();" || true
      fi
    fi
  fi
  sleep 5
done
