#!/bin/bash
set -e

# Crear el rol de replicación (la imagen oficial de postgres NO lo crea
# automáticamente a partir de REPLICATION_USER/REPLICATION_PASSWORD).
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE ${REPLICATION_USER} REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD}';
EOSQL
