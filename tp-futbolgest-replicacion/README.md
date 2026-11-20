# Replicación PostgreSQL — FutbolGest (Streaming Replication)

Stack de demostración de replicación asíncrona con PostgreSQL 16:

- **`db-primary`** (puerto host `5434`): nodo primario, acepta escritura.
- **`db-replica`** (puerto host `5435`): standby en *hot standby* (solo lectura), clonado con `pg_basebackup` al primer arranque.

## Puesta en marcha (deploy desde cero)

```bash
cd tp-futbolgest-replicacion
cp .env.example .env   # completar credenciales
docker compose up -d
```

El primario ejecuta los scripts de `primary-init/` solo en el primer arranque (volumen vacío):

1. `01-hba.sh` — habilita conexiones de replicación en `pg_hba.conf`.
2. `02-replication-role.sh` — crea el rol `replicator` con permiso `REPLICATION`.

La réplica ejecuta `replica-init/01-setup-replica.sh`, que espera al primario, clona con `pg_basebackup -R` y arranca en modo standby.

> **Importante:** los scripts `.sh` deben tener finales de línea **LF** (no CRLF). Si se editan en Windows, verificar con `git config core.autocrlf` o un `.gitattributes` con `*.sh text eol=lf`.

## Verificación

```bash
# En el primario: debe haber un walsender activo
docker exec futbolgest-db-primary psql -U postgres -c \
  "SELECT client_addr, state, sync_state FROM pg_stat_replication;"

# En la réplica: debe devolver true (está en recovery)
docker exec futbolgest-db-replica psql -U postgres -c \
  "SELECT pg_is_in_recovery();"
```

## Failover manual (si el watchdog no está corriendo)

Si el watchdog está detenido, la promoción es manual:

```bash
docker exec futbolgest-db-replica psql -U postgres -c "SELECT pg_promote();"
docker exec futbolgest-db-replica psql -U postgres -c "SELECT pg_is_in_recovery();"  -- false
```

HAProxy desvía el tráfico a la réplica por sí solo en cuanto el health check del primario falla; la promoción manual solo hace falta para que la réplica **acepte escritura**.

## Recuperación / vuelta atrás

Ver la sección "Recuperación tras el failover" más arriba: hay que re-clonar la réplica (`docker compose restart db-replica`) para evitar split-brain. `pg_rewind` no está disponible porque el primario no tiene `wal_log_hints=on` ni replication slots.

## Notas

- `pg_hba.conf` en la raíz del proyecto **no se usa**: el primario genera el suyo en `$PGDATA` y `01-hba.sh` le agrega la línea de replicación.
- El backend de la app (`g15-backend`) se conecta a **`pg-proxy:5432`**, no directo a `db-primary`. La contraseña es `POSTGRES_PASSWORD` de este stack (configurada como `DB_APP_PASSWORD` en el `.env` raíz del proyecto).
- `futbolgest-db` (stack `tp-futbolgest-docker`, puerto 5433) quedó como copia de respaldo del dataset; la app ya no la usa.
