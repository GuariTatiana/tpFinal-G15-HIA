# Infraestructura de Monitoreo, Publicación Segura y Automatización (Grupo 15)

Este módulo implementa la capa de observabilidad, publicación segura hacia Internet y automatización de procesos operativos para el ecosistema **FutbolGest**, cubriendo las **Actividades 9, 10 y 13** del Trabajo Integrador Final.

---

## 1. Arquitectura General del Bloque

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
                                 [ MantisBT (:8989) ]       [ /backups (PostgreSQL) ]     [ Nextcloud (:8081) ]

### Política de Seguridad y Exposición de Puertos
* **Único punto de entrada público:** El frontend (`g15-frontend`) está enlazado exclusivamente a `127.0.0.1:8080` y publicado mediante **Tailscale Funnel** con certificado HTTPS automático (ver §7).
* **Interfaces administrativas protegidas:** Prometheus (`127.0.0.1:9090`), Grafana (`127.0.0.1:3001`) y n8n (`127.0.0.1:5678`) escuchan únicamente en *localhost* (o dentro de la red privada Tailnet), impidiendo el acceso directo desde Internet.
* **Bases de datos aisladas:** Los contenedores `g15-postgres`, `futbolgest-db-primary`, `futbolgest-db-replica`, `mantis_db_hia` y `nextcloud_db` operan en redes internas de Docker sin exposición pública hacia el exterior.

---

## 2. Requisitos Previos y Orden de Despliegue

Dado que `infra-monitoreo` se conecta a las redes externas de los demás servicios, **se deben levantar primero los stacks base**:

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

4. **Stacks de Gestión de Incidencias (MantisBT) y Documentación (Nextcloud)**:
   ```bash
   # Levantar MantisBT (Puerto 8989)
   cd mantis
   cp .env.example .env   # Incluir MANTIS_CRYPTO_MASTER_SALT de >=16 caracteres
   docker compose up -d
   cd ..

   # Levantar Nextcloud (Puerto 8081 y PostgreSQL en 5436 para evitar colisión con 8080/5433)
   cd nextcloud
   cp .env.example .env   # Definir NEXTCLOUD_PORT=8081 y POSTGRES_PORT=5436
   docker compose up -d
   cd ..
   ```

---

## 3. Inicialización Única de MantisBT y Nextcloud para Integración

Estos comandos persisten la configuración en los volúmenes de Docker (`mantis_db_data` y `nextcloud_data`), por lo que **solo deben ejecutarse la primera vez** que se despliega el entorno en una máquina nueva:

### A. Restaurar Proyecto `FutbolGest`, Incidencias y API Token en MantisBT
Desde la raíz del repositorio (`tpFinal-G15-HIA`), importar el respaldo inicial incluido en este módulo:

```powershell
Get-Content infra-monitoreo\mantis_seed_futbolgest.sql | docker exec -i mantis_db_hia mysql -u mantis -pMantisDbPassword2026! bugtracker
```
*(Esto deja creado automáticamente el proyecto `FutbolGest`, el historial de incidencias y el token de API `MBwQ9u3lKK7m7ADGi84lVjUCP1c5yFdY` para n8n).*

### B. Habilitar Red Interna y Usuario Bot en Nextcloud
Ejecutar los siguientes comandos `occ` para autorizar el hostname interno `nextcloud_app` y crear el usuario exclusivo de automatización `n8n-bot`:

```powershell
docker exec -u www-data nextcloud_app php occ config:system:set trusted_domains 4 --value="nextcloud_app"
docker exec -u www-data -e OC_PASS="n8n-bot@12345ABC" nextcloud_app php occ user:add --password-from-env --display-name="Bot N8N" n8n-bot
```
---

## 4. Despliegue de Monitoreo y Automatización (`infra-monitoreo`)

### Paso 1: Configurar Variables de Entorno (`.env`)
Nunca se suben contraseñas reales al repositorio. En cada máquina local generar el archivo `.env` a partir de la plantilla:

```bash
cd infra-monitoreo
cp .env.example .env
```

Completar `infra-monitoreo/.env` asegurando que las claves de PostgreSQL coincidan con los stacks anteriores:

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
Acceder a `http://localhost:9090/targets` y comprobar que los **6 jobs** estén en estado **`UP`**:
* `prometheus`
* `node-exporter`
* `cadvisor`
* `postgres-app`
* `postgres-replicacion`
* `disponibilidad-app` (`http://g15-frontend:80` y `http://g15-backend:3000/api/complejos`)

---

## 5. Configuración de Grafana y Alertas (Actividad 10)

### Aprovisionamiento Automático
Al iniciar Grafana (`http://localhost:3001`), la carpeta `./grafana/provisioning` configura automáticamente:
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

## 6. Configuración de Flujos y Credenciales en n8n (Actividad 13)

1. Acceder a `http://localhost:5678` y crear la cuenta administrativa local (almacenada cifrada en el volumen `n8n_data` mediante `N8N_ENCRYPTION_KEY`).
2. Importar los 3 archivos JSON ubicados en `infra-monitoreo/n8n/`:
   * `flujo1-alertas-mantis.json`
   * `flujo2-verificacion-backups.json`
   * `flujo3-informe-ia-nextcloud.json`
3. **Montaje de las 3 Credenciales en n8n (`Credentials -> Add Credential`):**

   | Nombre de Credencial en n8n | Tipo (`Type`) | Parámetros a Configurar | Flujo que la utiliza |
   | :--- | :--- | :--- | :--- |
   | **`Header Auth Grafana`** | `Header Auth` | **Name:** `Authorization`<br>**Value:** `Bearer token-secreto-g15` | Flujo 1 (Nodo `Webhook Alerta Grafana`) |
   | **`Mantis API Token`** | `Header Auth` | **Name:** `Authorization`<br>**Value:** `MBwQ9u3lKK7m7ADGi84lVjUCP1c5yFdY` | Flujo 1 (Nodo `Registrar Incidencia en Mantis`) |
   | **`Nextcloud Bot n8n`** | `Basic Auth` | **User:** `n8n-bot`<br>**Password:** `n8n-bot@12345ABC` | Flujo 3 (Nodo `Guardar Informe en Nextcloud (WebDAV)`) |

4. **Activación:**
   * Asignar cada credencial en su respectivo nodo, guardar los cambios y presionar **`Publish`** en el Flujo 1.
   * *(En Grafana -> Alerting -> Contact points -> `Webhook-n8n`, confirmar que la URL sea `http://n8n:5678/webhook/alerta-infraestructura` con `Scheme: Bearer` y `Credentials: token-secreto-g15`).*

### Matriz de Flujos Automatizados

| Flujo | Disparador | Validación / Condición | Acción Principal | Manejo de Errores (`onError`) |
| :--- | :--- | :--- | :--- | :--- |
| **Flujo 1: Alertas a MantisBT** | Webhook HTTP `POST` autenticado desde Grafana | `If`: Verifica si la alerta está en estado `firing` / crítica | Envía `POST` a `http://docker.internal` creando el ticket en el proyecto `FutbolGest` | Si MantisBT no responde, captura el fallo en `Manejo de Error API` y encola el evento |
| **Flujo 2: Verificación de Backups** | Cron programado cada 6 horas | Lee `/backups/last/canchas_db-latest.sql.gz` y valida existencia e integridad | Registra auditoría de respaldo íntegro (`EXITO`) | Si el archivo falta o pesa `0 bytes`, emite alerta crítica (`ERROR_CRITICO`) |
| **Flujo 3: Informe de Rendimiento IA** | Manual o programado | Consulta API de Prometheus (`query=up`) y analiza disponibilidad | Genera reporte ejecutivo en Markdown y lo sube vía WebDAV a `http://nextcloud_app/remote.php/dav/files/n8n-bot/` | Si Nextcloud falla, guarda copia en `Cola de Respaldo Local` sin abortar el flujo |

---

## 7. Publicación Segura en Internet con Tailscale Funnel (Actividad 9)

Para permitir el acceso externo durante la demostración sin abrir puertos en el router ni exponer servicios internos, se utiliza **Tailscale Funnel**, que publica únicamente el frontend (`127.0.0.1:8080`) en Internet con HTTPS automático.

### Arquitectura de acceso

    Internet ──HTTPS──► Tailscale Funnel (edge de Tailscale)
                              │ túnel WireGuard cifrado
                              ▼
                    127.0.0.1:8080 (g15-frontend / nginx)
                              │ /api/*
                              ▼
                    g15-backend (:3000, solo red interna) ──► g15-postgres (:5432, solo red interna)

* **URL pública vigente:** `https://tat13.tail99c238.ts.net` (estable: se mantiene igual entre reinicios mientras el nodo `tat13` no cambie).
* **Quién puede acceder:** cualquier persona con la URL puede cargar la aplicación, pero todas las operaciones requieren autenticación JWT propia de la app (`/api/auth`). No hay paneles administrativos expuestos.
* **HTTPS:** lo termina Tailscale con certificado válido para `*.ts.net`; el túnel hacia el origen va cifrado con WireGuard.
* **Servicios no expuestos:** `g15-backend` y `g15-postgres` no publican puertos en el host; Funnel solo reenvía el puerto 8080. Acceder a `https://tat13.tail99c238.ts.net:3001`, `:5432`, etc. falla (verificado).

### Puesta en marcha

```bash
# 1. Levantar la aplicación
docker compose up -d --build
# Verificar: http://localhost:8080 abre en el navegador

# 2. Conectar la PC a Tailscale (una sola vez)
#    - Abrir Tailscale desde el menú Inicio e iniciar sesión
#      con cuenta gratuita (Google / GitHub / Microsoft)

# 3. Habilitar Funnel apuntando solo al frontend (queda en background)
tailscale funnel --bg 8080
# La primera vez, la consola muestra un enlace para habilitar HTTPS
# en la consola de Tailscale: abrirlo y presionar Enable.

# 4. Ver la URL pública (siempre la misma)
tailscale funnel status
```

### Verificación desde red externa (4G/5G)

* Con el celular en datos móviles (Wi-Fi apagado), abrir `https://tat13.tail99c238.ts.net` -> carga la SPA con candado HTTPS.
* Probar `https://tat13.tail99c238.ts.net:3001` o `:5432` -> conexión rechazada, validando el aislamiento de interfaces administrativas y bases de datos.

### Apagar el túnel

```bash
tailscale funnel off
# Para la defensa, volver a habilitar con la MISMA URL:
tailscale funnel --bg 8080
```

### Disponibilidad y registro de errores

* La URL pública está registrada como target de la sonda **blackbox** de Prometheus (`disponibilidad-app` en `prometheus/prometheus.yml`), por lo que `probe_success` mide la disponibilidad del endpoint público y las alertas `AplicacionWebInaccesible` / `Alerta Servicio Caido FutbolGest` registran caídas (ver §5).
* `tailscale funnel status` y los logs del servicio Tailscale registran el estado del túnel.
* **Alternativa sin cuenta Tailscale:** existe un perfil `tunnel` en el `docker-compose.yml` raíz que levanta un Cloudflare Quick Tunnel (`docker compose --profile tunnel up -d tunnel`), pero genera una URL efímera `*.trycloudflare.com` en cada reinicio; Tailscale Funnel es la opción elegida por su URL estable.
