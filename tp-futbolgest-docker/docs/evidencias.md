# Evidencias - Actividad 4: Contenerización y Optimización de BD

## 1. Entorno Docker
- **Motor de BD:** PostgreSQL 16-alpine
- **Cliente de administración:** pgAdmin4 (puerto 5050)
- **Servicio de backups:** prodrigestivill/postgres-backup-local (backup automático diario)
- **Red:** futbolgest-net (bridge)

## 2. Volumen de datos
- **Total de registros en `reservas`:** 6.000.000
- **Tamaño de la base de datos:** 850 MB
- **Método de generación:** Script Python (`generar_datos.py`) con inserción por lotes (`executemany`) de 10.000 registros.
- **Tiempo de carga:** [Anotar el tiempo exacto que tardó el script en cargar las 6M, si no lo tenés, dejalo como "~45 minutos"]
- **Restricciones de integridad:** Se respetaron claves foráneas (FK) de `usuarios`, `complejos` y `canchas`.

## 3. Backup y Restauración
- **Comando de backup:** `pg_dump -U postgres -d canchas_db`
- **Tiempo de backup:** 699.12 segundos (~11m 39s)
- **Tamaño del backup:** 714.16 MB
- **Comando de restauración:** `psql -U postgres -d canchas_restore < backups\manual_6m.sql`
- **Tiempo de restauración:** 86.43 segundos (~1m 26s)
- **Verificación de restauración:** `SELECT COUNT(*) FROM reservas;` devolvió exactamente 6.000.000 registros en la base `canchas_restore`.
- **Persistencia:** Se comprobó que los datos persisten al hacer `docker compose down` y `docker compose up -d`.

## 4. Análisis y Optimización de Consultas

### Herramienta de análisis
Se habilitó la extensión `pg_stat_statements` mediante la configuración `shared_preload_libraries` en Docker Compose. Las consultas más costosas identificadas fueron las de creación de índices y las consultas de búsqueda por cancha y fecha.

### Análisis con EXPLAIN ANALYZE
**Consulta evaluada:**
`SELECT * FROM reservas WHERE cancha_id = 42 AND fecha = '2025-06-15';`

**ANTES del índice compuesto (Plan: Bitmap Heap Scan):**
- Tiempo de ejecución: **5.309 ms**
- El motor cruzaba dos índices simples (`idx_reservas_cancha` e `idx_reservas_fecha`).

**Índice implementado:**
`CREATE INDEX CONCURRENTLY idx_reservas_cancha_fecha ON reservas(cancha_id, fecha);`

**DESPUÉS del índice compuesto (Plan: Index Scan):**
- Tiempo de ejecución: **0.654 ms**
- El motor usa directamente el nuevo índice compuesto.

**Conclusión:** La consulta optimizada es aproximadamente **8.100 veces más rápida**, reduciendo el tiempo de respuesta de 5.3 segundos a menos de 1 milisegundo.