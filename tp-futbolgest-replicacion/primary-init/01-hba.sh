#!/bin/bash
set -e

# Agregar permiso de replicación al archivo pg_hba.conf
echo "host replication replicator 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"