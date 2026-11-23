# Infraestructura, Monitoreo y Automatización — TP Final G15

Documentación de todo lo desplegado: clúster de replicación PostgreSQL, stack de
monitoreo (Prometheus + Grafana), automatización con n8n, backups con `pg_dump` y
la cadena de alertas que genera incidencias en Mantis.

---

## 1. Arquitectura general

```
                        ┌─────────────────────────────────────────────┐
                        │              USUARIO (navegador)            │
                        └───────────────────┬─────────────────────────┘
                                            │ HTTP
                        ┌───────────────────▼─────────────────────────┐
                        │   g15-frontend (Angular)  :8080             │
                        └───────────────────┬─────────────────────────┘
                                            │ /api
                        ┌───────────────────▼─────────────────────────┐
                        │   g15-backend (Node/Express)  :3000         │
                        └───────────────────┬─────────────────────────┘
                                            │ SQL (DB_HOST=pg-proxy)
                        ┌───────────────────▼─────────────────────────┐
                        │   futbolgest-pg-proxy (HAProxy)  :5436      │
                        │   enruta al PRIMARY; si cae -> REPLICA      │
                        └───────┬───────────────────────┬─────────────┘
                  ┌─────────────▼──────┐      ┌─────────▼────────────┐
                  │ futbolgest-db-     │      │ futbolgest-db-       │
                  │ primary (PG16)     │ ───► │ replica (PG16)       │
                  └────────────────────┘ repl │ (streaming)          │
                        ▲                       └────────────────────┘
                        │ pg_isready cada 5s
                  ┌─────┴──────────────────────────────────────────┐
                  │ futbolgest-failover-watchdog                    │
                  │ si el primary cae -> pg_promote() en la réplica │
                  └────────────────────────────────────────────────┘

   Monitoreo:  Prometheus scrapea exporters -> Grafana evalúa alertas
               -> webhook -> n8n Flujo 1 -> ticket en Mantis

   Backups:    n8n Flujo 4 -> HTTP -> backup-runner -> pg_dump -> /backups
```

---

## 2. Componentes

### 2.1 Clúster de replicación — `tp-futbolgest-replicacion/`

| Servicio | Contenedor | Puerto | Rol |
|---|---|---|---|
| `db-primary` | `futbolgest-db-primary` | 5434 | PostgreSQL primario (read-write) |
| `db-replica` | `futbolgest-db-replica` | 5435 | Réplica en streaming recovery |
| `pg-proxy` | `futbolgest-pg-proxy` | 5436 | HAProxy TCP; backend se conecta acá |
| `failover-watchdog` | `futbolgest-failover-watchdog` | — | Promueve la réplica si el primary cae |

- **HAProxy** (`haproxy.cfg`): `db-primary` como server principal, `db-replica`
  como `backup`. Health check `pgsql-check` cada 5s.
- **Watchdog** (`watchdog.sh`): cada 5s hace `pg_isready` al primary; tras 3
  fallos ejecuta `pg_promote()` en la réplica.
- El backend de la app se conecta a `pg-proxy:5432` (vía `DB_HOST=pg-proxy`).

### 2.2 Stack de monitoreo — `infra-monitoreo/`

| Servicio | Contenedor | Función |
|---|---|---|
| `prometheus` | `prometheus` | Recolecta métricas (15s) y evalúa `alert.rules.yml` |
| `grafana` | `grafana` | Dashboards + alertas gestionadas (unified alerting) |
| `node-exporter` | `node-exporter` | Métricas del host (CPU, RAM, disco) |
| `cadvisor` | `cadvisor` | Métricas por contenedor |
| `postgres-exporter-app` | `postgres-exporter-app` | Métricas de `g15-postgres` |
| `postgres-exporter-replica` | `postgres-exporter-replica` | Métricas de `futbolgest-db-primary` |
| `blackbox-exporter` | `blackbox-exporter` | Chequeos HTTP de frontend/backend/túnel |
| `n8n` | `n8n` | Automatización (imagen custom `g15-n8n:local`) |

### 2.3 Microservicio de backups — `tp-futbolgest-docker/backup-runner/`

- `backup_server.py`: servidor HTTP (Python) que en `POST /backup` ejecuta
  `pg_dump`, comprime con gzip y guarda en `/backups` + `/backups/last/*-latest.sql.gz`.
- `GET /health`: healthcheck.
- Existe porque la imagen hardened de n8n **no incluye** el nodo *Execute Command*.

### 2.4 Bases de datos

| Contenedor | Base | Uso |
|---|---|---|
| `g15-postgres` | `canchas_db` | DB local del stack de la app |
| `futbolgest-db` | `canchas_db` | DB del dataset (backup con pg_dump) |
| `futbolgest-db-primary` / `-replica` | clúster | DB a la que se conecta la app vía `pg-proxy` |

---

## 3. Flujos de n8n

| Flujo | ID | Disparador | Acción |
|---|---|---|---|
| **Flujo 1** — Alertas Infraestructura a Mantis | `anaEbXcNOFAGFoyq` | Webhook `POST /webhook/alerta-infraestructura` | Si `body.status=="firing"` crea ticket en Mantis |
| **Flujo 2** — Verificación de Backups | `DinUjSmldIxw2vUx` | Schedule cada 6h | Lee `/backups/last/*-latest.sql.gz`, valida >1KB; adjunta al mail solo si <20MB |
| **Flujo 3** — Informe Rendimiento IA a Nextcloud | `lZjNXZjtuy41jImO` | Schedule | Genera informe y lo sube a Nextcloud |
| **Flujo 4** — Backup BD desde n8n (pg_dump) | `Flujo4BackupN8n0001` | Schedule diario 2AM + manual | `HTTP POST → backup-runner:8080/backup` → email con metadatos |

Definiciones JSON en `infra-monitoreo/n8n-workflows/`.

---

## 4. Cadena de alertas (Grafana → n8n → Mantis)

```
Servicio cae
   │
   ▼
Prometheus detecta (pg_up=0 / probe_success=0 / pg_replication_lag>5)
   │
   ▼
Grafana evalúa sus alert rules (folder "futbolgest-alertas")
   │  state = firing
   ▼
Contact point "n8n-alertas-infra" (webhook)
   │  POST http://n8n:5678/webhook/alerta-infraestructura
   ▼
n8n Flujo 1  ──IF body.status=="firing"──►  POST Mantis API /issues
                                              │
                                              ▼
                                        Ticket en Mantis
```

### Alert rules configuradas en Grafana

| Regla | Expresión PromQL | Umbral | Severidad |
|---|---|---|---|
| DB Primario Caido | `pg_up{job="postgres-replicacion"}` | `< 1` | critical |
| DB App Caida | `pg_up{job="postgres-app"}` | `< 1` | critical |
| Retraso Replicacion Alto | `pg_replication_lag` | `> 5` | warning |
| App Web Inaccesible | `probe_success` | `< 1` | critical |

> **Importante**: se usa `pg_up` (métrica del postgres-exporter que indica si la
> DB responde) y **no** `up` (que solo detecta si el exporter está caído, no la DB).

---

## 5. Cómo desplegar

### 5.1 Prerequisitos

- Docker Desktop con Docker Compose.
- Las redes externas deben existir antes de levantar monitoreo (se crean solas al
  levantar cada stack).

### 5.2 Variables de entorno (.env)

Cada stack tiene su `.env` (nunca se versiona). Completar desde los `.env.example`.

**Raíz `.env`** (app):
```env
DB_NAME=canchas_db
DB_USER=postgres
DB_PASSWORD=<clave>
DB_HOST=pg-proxy          # apunta al clúster de replicación
JWT_SECRET=<secreto_32+>
CORS_ORIGIN=http://localhost:8080
APP_PORT=8080
```

**`tp-futbolgest-replicacion/.env`**:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<clave>
POSTGRES_DB=canchas_db
REPLICATION_USER=replicador
REPLICATION_PASSWORD=<clave>
```

**`tp-futbolgest-docker/.env`**:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<clave>
POSTGRES_DB=canchas_db
```

**`infra-monitoreo/.env`**:
```env
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<clave>
N8N_ENCRYPTION_KEY=<clave_32+>
DB_NAME=canchas_db
DB_USER=postgres
DB_PASSWORD=<clave_g15-postgres>
REPL_DB=canchas_db
REPL_USER=postgres
REPL_PASSWORD=<clave_primary>
BACKUP_DB_NAME=canchas_db
BACKUP_DB_USER=postgres
BACKUP_DB_PASSWORD=<clave_futbolgest-db>
```

### 5.3 Orden de despliegue

```powershell
# 1) Clúster de replicación (crea replication-net)
cd tp-futbolgest-replicacion
docker compose up -d

# 2) Dataset / DB simple (crea futbolgest-net)
cd ..\tp-futbolgest-docker
docker compose up -d

# 3) App principal (crea g15-app-net, g15-db-net; backend+frontend)
cd ..
docker compose up -d --build

# 4) Mantis (crea mantis_net)  y  Nextcloud (crea nextcloud_net)
cd mantis; docker compose up -d
cd ..\nextcloud; docker compose up -d

# 5) Monitoreo + n8n (usa todas las redes externas)
cd ..\infra-monitoreo
docker compose up -d --build
```

### 5.4 Importar / publicar los flujos de n8n

Los JSON están en `infra-monitoreo/n8n-workflows/`. Se importan desde la UI de n8n
(`http://localhost:5678`) o por CLI dentro del contenedor:

```powershell
docker cp "infra-monitoreo\n8n-workflows\Flujo 4 - Backup BD desde n8n (pg_dump).json" n8n:/tmp/f4.json
docker exec n8n n8n import:workflow --input=/tmp/f4.json
docker exec n8n n8n publish:workflow --id=Flujo4BackupN8n0001
```

> Repetir para Flujo 1, 2 y 3. `publish:workflow` es necesario para registrar los
> webhooks y activar los schedules.

### 5.5 Configurar el alerting de Grafana

Grafana (`http://localhost:3001`, admin) → **Alerting**:

1. **Contact points** → New → *Webhook*:
   - Name: `n8n-alertas-infra`
   - URL: `http://n8n:5678/webhook/alerta-infraestructura`
   - Method: `POST`
2. **Notification policies** → receiver por defecto → `n8n-alertas-infra`.
3. **Alert rules** (folder `futbolgest-alertas`) con las expresiones de la sección 4.

> Estas reglas también pueden crearse por API (ver scripts usados en la sesión).

---

## 6. Cómo probar los escenarios

### 6.1 Caer UN nodo → la app sigue funcionando + se genera incidencia

```powershell
docker stop futbolgest-db-primary
# Esperar ~2 min:
#  - HAProxy hace failover a la réplica (el navegador SIGUE funcionando)
#  - el watchdog promueve la réplica
#  - Grafana dispara "DB Primario Caido" -> n8n -> ticket en Mantis
docker start futbolgest-db-primary
```

### 6.2 Caer TODOS los nodos → la app deja de funcionar

```powershell
docker stop futbolgest-db-primary futbolgest-db-replica
# El navegador deja de funcionar (HAProxy sin backend)
docker start futbolgest-db-primary futbolgest-db-replica
```

### 6.3 Backup manual

```powershell
# Opción A: vía backup-runner
docker exec futbolgest-backup-runner wget -qO- --post-data='' http://localhost:8080/backup

# Opción B: ejecutar Flujo 4 manualmente desde la UI de n8n
# Opción C: pg_dump directo
docker exec futbolgest-db pg_dump -U postgres canchas_db | gzip > backup.sql.gz
```

Ver backups:
```powershell
Get-ChildItem "tp-futbolgest-docker\backups" -File | Sort LastWriteTime -Desc
```

---

## 7. Notas y troubleshooting

- **`up` vs `pg_up`**: `up==0` solo detecta que el *exporter* cayó. Para detectar que
  la *base de datos* cayó usar `pg_up==0` (postgres-exporter).
- **Réplica no monitoreada**: hoy no hay exporter que vigile `futbolgest-db-replica`
  directamente; su caída no genera incidencia automática.
- **Split-brain tras failover**: si el watchdog promueve la réplica y después vuelve
  el primary, ambos quedan como primarios (`pg_is_in_recovery=f`). Para re-sincronizar
  hay que reconfigurar la réplica como standby.
- **Adjuntos de email**: Gmail rechaza adjuntos >25MB; por eso Flujo 4 envía solo
  metadatos y Flujo 2 adjunta el backup únicamente si pesa <20MB.
- **n8n draft vs published**: al importar workflows por CLI, sincronizar siempre
  draft (`workflow_entity`) y published (`workflow_history`) para evitar nodos
  "Unrecognized" al ejecutar manualmente.

---

## 8. Accesos rápidos

| Servicio | URL |
|---|---|
| App (frontend) | http://localhost:8080 |
| Backend API | http://localhost:3000 |
| Grafana | http://localhost:3001 (admin) |
| Prometheus | http://localhost:9090 |
| n8n | http://localhost:5678 |
| Mantis | http://localhost:8989 |
| pgAdmin | http://localhost:5050 |
