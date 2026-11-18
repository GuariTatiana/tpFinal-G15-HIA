#!/bin/sh
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup"
DB_BACKUP_FILE="${BACKUP_DIR}/db_nextcloud_${DATE}.sql.gz"
DATA_BACKUP_FILE="${BACKUP_DIR}/nextcloud_files_${DATE}.tar.gz"

echo "[$(date)] Iniciando proceso de backup de Nextcloud..."

# 1. Dump de la base de datos PostgreSQL
echo "[$(date)] Realizando dump de la base de datos PostgreSQL (${POSTGRES_DB})..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h db -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${DB_BACKUP_FILE}"
echo "[$(date)] Dump de base de datos PostgreSQL completado: ${DB_BACKUP_FILE}"

# 2. Backup de los datos y configuraciones de Nextcloud
echo "[$(date)] Comprimiendo datos y configuraciones (/var/www/html)..."
tar -czf "${DATA_BACKUP_FILE}" -C /var/www/html config data
echo "[$(date)] Archivo de datos completado: ${DATA_BACKUP_FILE}"

# 3. Rotación: Mantener solo los últimos 7 días de backups
echo "[$(date)] Limpiando backups antiguos (mayores a 7 dias)..."
find "${BACKUP_DIR}" -type f -name "*.gz" -mtime +7 -delete

echo "[$(date)] Proceso de backup finalizado exitosamente."
