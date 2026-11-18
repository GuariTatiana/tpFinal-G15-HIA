#!/bin/bash
set -e

echo "Iniciando clonación desde el nodo principal..."

# Esperar a que el primario esté listo
until pg_isready -h db-primary -p 5432 -U replicator; do
  echo "Esperando al primario..."
  sleep 2
done

# Limpiar el directorio (por si quedó algo)
rm -rf "$PGDATA"/*

# Clonar desde el primario
pg_basebackup -h db-primary -D "$PGDATA" -U replicator -Fp -Xs -P -R

# Asegurar permisos
chmod 700 "$PGDATA"

echo "Clonación completada. Arrancando como standby..."

# Arrancar PostgreSQL como standby
exec postgres -c config_file=/etc/postgresql/postgresql.conf