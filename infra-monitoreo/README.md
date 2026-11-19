# Infraestructura de Monitoreo, Publicación Segura y Automatización (Grupo 15)

Este módulo implementa la capa de observabilidad, publicación segura hacia Internet y automatización de procesos operativos para el ecosistema **FutbolGest**, cubriendo las **Actividades 9, 10 y 13** del Trabajo Integrador Final.

---

## 1. Arquitectura General del Bloque

```text
[ Usuario Externo (4G/5G) ]
         │  HTTPS (TLS automático)
         ▼
[ Tailscale Funnel (:443 -> 127.0.0.1:8080) ]
         │
         ▼
[ g15-frontend (:80) ] ──► [ g15-backend (:3000) ] ──► [ g15-postgres (:5432) ]
                                    ▲                            ▲
                                    │ (Blackbox HTTP)            │ (Postgres Exporter)
[ Node Exporter ] ──► [ Prometheus (:9090) ] ◄── [ cAdvisor ]    │
                            │        ▲                           │
                            │        └── [ Postgres Exporter Replicación ]
                            ▼
                     [ Grafana (:3001) ] ──(Webhook Auth)──► [ n8n (:5678) ]
                                                                   │
                                       ┌───────────────────────────┼───────────────────────────┐
                                       ▼                           ▼                           ▼
                             [ Mantis / GLPI API ]      [ /backups (PostgreSQL) ]      [ Nextcloud WebDAV ]
```

### Política de Seguridad y Exposición de Puertos
* **Único punto de entrada público:** El frontend (`g15-frontend`) está enlazado exclusivamente a `127.0.0.1:8080` y publicado mediante **Tailscale Funnel** con certificado HTTPS automático.
* **Interfaces administrativas protegidas:** Prometheus (`127.0.0.1:9090`), Grafana (`127.0.0.1:3001`) y n8n (`127.0.0.1:5678`) escuchan únicamente en *localhost* (o dentro de la red privada Tailnet), impidiendo el acceso directo desde Internet.
* **Bases de datos aisladas:** Los contenedores `g15-postgres`, `futbolgest-db-primary` y `futbolgest-db-replica` operan en redes internas de Docker sin exposición pública hacia el exterior.

---

## 2. Requisitos Previos y Orden de Despliegue

Dado que `infra-monitoreo` se conecta a las redes externas de la aplicación y de la base de datos, **es obligatorio levantar primero los stacks base**:

1. **Stack Principal de la Aplicación** (desde la raíz del repositorio):
   ```bash
   cp .env.example .env   # Completar credenciales reales
   docker compose up -d
   ```
   *(Crea las redes `g15-app-net` y `g15-db-net`, y expone el frontend en `127.0.0.1:8080`).*

2. **Stack de Backups y Base de Datos Auxiliar**:
   ```bash
   cd tp-futbolgest-docker
   cp .env.example .env   # Configurar POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
   docker compose up -d
   cd ..
   ```

3. **Stack de Replicación PostgreSQL**:
   ```bash
   cd tp-futbolgest-replicacion
   cp .env.example .env   # Configurar credenciales y REPLICATION_USER / REPLICATION_PASSWORD
   docker compose up -d
   cd ..
   ```

---

## 3. Despliegue de Monitoreo y Automatización (`infra-monitoreo`)

### Paso 1: Configurar Variables de Entorno (`.env`)
Nunca se suben contraseñas reales al repositorio. En cada máquina local se debe generar el archivo `.env` a partir de la plantilla:

```bash
cd infra-monitoreo
cp .env.example .env
```

Edita `infra-monitoreo/.env` asegurando que las credenciales de PostgreSQL coincidan exactamente con las definidas en los stacks anteriores:

```env
# Credenciales de acceso a Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=TuPasswordSeguraGrafana

# Clave de cifrado interno de n8n (mínimo 32 caracteres)
N8N_ENCRYPTION_KEY=futbolgest_g15_clave_secreta_2026_segura

# Credenciales de BD Principal (deben coincidir con .env de la raíz)
DB_NAME=futbolgest
DB_USER=postgres
DB_PASSWORD=TuPasswordDBApp

# Credenciales del Clúster de Replicación (deben coincidir con tp-futbolgest-replicacion/.env)
REPL_DB=futbolgest
REPL_USER=postgres
REPL_PASSWORD=TuPasswordDBReplica
```

### Paso 2: Levantar los Contenedores
```bash
docker compose up -d
```

Servicios desplegados:
* `prometheus` (`http://localhost:9090`)
* `grafana` (`http://localhost:3001`)
* `n8n` (`http://localhost:5678`)
* `node-exporter` (Métricas del Sistema Operativo)
* `cadvisor` (Métricas y reinicios de contenedores Docker)
* `postgres-exporter-app` y `postgres-exporter-replica` (Métricas de PostgreSQL y lag de replicación)
* `blackbox-exporter` (Sondas de disponibilidad HTTP hacia Frontend y Backend)

### Paso 3: Verificación en Prometheus
Acceder a `http://localhost:9090/targets` y comprobar que los **6 jobs** se encuentren en estado **`UP`**:
* `prometheus`
* `node-exporter`
* `cadvisor`
* `postgres-app`
* `postgres-replicacion`
* `disponibilidad-app` (`http://g15-frontend:80` y `http://g15-backend:3000/api/complejos`)

---

## 4. Configuración de Grafana y Alertas (Actividad 10)

### Aprovisionamiento Automático
Al iniciar Grafana (`http://localhost:3001`), la carpeta `./grafana/provisioning` configura de forma automática:
1. El origen de datos **Prometheus** apuntando a `http://prometheus:9090`.
2. El dashboard **`TP Final G15 - Monitoreo de Infraestructura y Contenedores`** con paneles de:
   * Uso de CPU (%) y Memoria RAM (%).
   * Uso de Disco (%) y Tráfico de Red (`RX`/`TX`).
   * Cantidad de contenedores activos, memoria y CPU por contenedor.
   * Disponibilidad HTTP de servicios (`probe_success`).
   * Conexiones activas en PostgreSQL (`pg_stat_activity_count`) y estado del nodo de replicación.

### Reglas de Alerta y Umbrales Definidos
* **`Alerta Servicio Caido FutbolGest` (Grafana):** Evalúa `probe_success{instance!="http://g15-backend:3000/api-docs/"}` cada 10s. Si el valor cae por debajo de `1` durante `30s`, cambia a estado **`Firing`** y dispara una notificación al punto de contacto `Webhook-n8n`.
* **Reglas en Prometheus (`prometheus/alert.rules.yml`):**
  * `ContenedorOServicioCaido`: `up == 0` por `30s` (Crítica).
  * `AplicacionWebInaccesible`: `probe_success == 0` por `30s` (Crítica).
  * `AltoUsoCPU` / `AltoUsoRAM`: Uso superior al `85%` por `1m` (Advertencia).
  * `RetrasoReplicacionAlto`: `pg_replication_lag > 5` segundos por `30s` (Advertencia).

### Prueba Controlada de Alerta
1. Detener el contenedor del backend: `docker stop g15-backend`.
2. Esperar 30 segundos y verificar en **Grafana -> Alertas** el cambio de estado a **`Disparo` (`Firing`)**.
3. Restaurar el servicio: `docker start g15-backend` y confirmar el retorno a **`Normal`**.

---

## 5. Configuración de Flujos y Credenciales en n8n (Actividad 13)

1. Acceder a `http://localhost:5678` y crear la cuenta administrativa local (se almacena cifrada en el volumen `n8n_data` usando `N8N_ENCRYPTION_KEY`).
2. Importar los 3 archivos JSON ubicados en `infra-monitoreo/n8n/`:
   * `flujo1-alertas-mantis.json`
   * `flujo2-verificacion-backups.json`
   * `flujo3-informe-ia-nextcloud.json`
3. **Montaje de Credenciales (Seguridad):**
   * En n8n ir a **Credentials -> Add Credential -> Header Auth**.
   * Crear la credencial **`Header Auth Grafana`** con:
     * **Name:** `Authorization`
     * **Value:** `Bearer token-secreto-g15`
   * Asignar esta credencial en el nodo **Webhook Alerta Grafana** del **Flujo 1** y hacer clic en **Publish**.
   * *(En Grafana -> Alerting -> Contact points -> `Webhook-n8n`, verificar que la URL sea `http://n8n:5678/webhook/alerta-infraestructura` con `Scheme: Bearer` y `Credentials: token-secreto-g15`).*

### Matriz de Flujos Automatizados

| Flujo | Disparador | Validación / Condición | Acción Principal | Manejo de Errores (`onError`) |
| :--- | :--- | :--- | :--- | :--- |
| **Flujo 1: Alertas a Mantis/GLPI** | Webhook HTTP `POST` autenticado desde Grafana | `If`: Verifica si la alerta está en estado `firing` / crítica | Envía `POST` a la API de Mantis/GLPI creando el ticket de incidencia | Si la API externa no responde, captura el fallo en `Manejo de Error API` y encola el evento |
| **Flujo 2: Verificación de Backups** | Cron programado cada 6 horas | Lee `/backups/last/canchas_db-latest.sql.gz` y valida integridad (`> 1 KB`) | Registra auditoría de respaldo íntegro (`EXITO`) | Si el archivo falta o pesa `0 bytes`, emite alerta crítica (`ERROR_CRITICO`) |
| **Flujo 3: Informe de Rendimiento IA** | Manual o programado | Consulta API de Prometheus (`query=up`) y analiza disponibilidad | Genera reporte ejecutivo en Markdown y lo sube a Nextcloud (WebDAV) | Si Nextcloud falla, guarda copia en `Cola de Respaldo Local` sin abortar el flujo |

---

## 6. Publicación Segura en Internet con Tailscale (Actividad 9)

Para permitir el acceso externo durante la demostración sin abrir puertos en el router ni exponer servicios internos:

1. Instalar e iniciar sesión con **Tailscale** en el servidor anfitrión:
   ```bash
   tailscale up
   ```
2. Habilitar **Tailscale Funnel** apuntando **únicamente** al puerto local del frontend (`8080`):
   ```bash
   tailscale funnel --bg 8080
   ```
3. Obtener la URL pública HTTPS asignada:
   ```bash
   tailscale funnel status
   ```
4. **Verificación desde red externa (4G/5G):**
   * Acceder desde un dispositivo móvil fuera de la red local a `https://<nombre-nodo>.<tailnet>.ts.net` -> Carga la aplicación web con cifrado TLS.
   * Intentar acceder desde el exterior a los puertos `:3001`, `:5678`, `:9090` o `:5432` -> Conexión rechazada, validando el aislamiento de interfaces administrativas y bases de datos.
