# Despliegue de Nextcloud para Gestión y Centralización Documental
**Práctica Integradora Final - Actividad 12**

Este módulo contiene la infraestructura contenerizada completa de **Nextcloud** asistida por un reverse-proxy **Traefik v3** con terminación TLS (HTTPS) y base de datos relacional **PostgreSQL 16**. Ha sido diseñado de forma desacoplada para operar como el repositorio centralizado, versionado y seguro de evidencias, informes de pruebas, diagramas y configuraciones de todo el proyecto.

---

## 1. Arquitectura y Componentes

- **`nextcloud_app` (`nextcloud:28-apache`)**: Servidor de aplicaciones web y WebDAV.
- **`nextcloud_db` (`postgres:16-alpine`)**: Motor de base de datos relacional PostgreSQL 16 optimizado.
- **`nextcloud_cron` (`nextcloud:28-apache`)**: Contenedor dedicado a ejecutar las tareas en segundo plano (`/cron.sh`) sin bloquear peticiones HTTP de usuarios.
- **`nextcloud_traefik` (`traefik:v3.1`)**: Reverse-proxy perimetral con redirección automática HTTP -> HTTPS y emisión automática de certificados con Let's Encrypt (ACME).
- **`nextcloud_backup` (`alpine:latest`)**: Servicio autónomo con cron para dumping de base de datos (`pg_dump`) y compresión de archivos a un volumen dedicado de backup con rotación de 7 días.

---

## 2. Requisitos Previos

- Docker Desktop o Docker Engine (24.0+ con Docker Compose v2).
- Dominio DNS o subdominio apuntado a la IP pública del servidor (o un host local/DynDNS como DuckDNS / ngrok / Cloudflare Tunnel para el cert ACME).
- Puertos `80` y `443` libres en la máquina anfitriona.

---

## 3. Preparación e Instalación Paso a Paso

### Paso 1: Creación de Volúmenes Nombrados
Para asegurar la persistencia estricta de la información independientemente del ciclo de vida de los contenedores, ejecutar:

```bash
docker volume create nextcloud_data
docker volume create db_data
docker volume create nextcloud_backup
docker volume create traefik_certificates
```

### Paso 2: Configuración de Variables de Entorno
Copiar la plantilla de variables de entorno y asignar contraseñas robustas:

```bash
cp .env.example .env
```

Editar el archivo `.env`:
- `NEXTCLOUD_ADMIN_USER`: Usuario administrador inicial.
- `NEXTCLOUD_ADMIN_PASSWORD`: Contraseña segura para el admin.
- `POSTGRES_DB`: Nombre de la BD de Nextcloud (`nextcloud`).
- `POSTGRES_USER`: Usuario de la BD (`nextcloud`).
- `POSTGRES_PASSWORD`: Clave para la base de datos PostgreSQL.
- `TRAEFIK_DOMAIN`: Dominio asignado (ejemplo: `docs.midominio.com` o `localhost`).
- `TRAEFIK_EMAIL`: Correo electrónico de contacto para la emisión de certificados Let's Encrypt.
- `TZ`: `America/Argentina/Buenos_Aires`.

> **IMPORTANTE**: El archivo `.env` contiene credenciales sensibles y está ignorado en Git. Nunca commitear este archivo al repositorio público.

### Paso 3: Inicialización de la Pila Docker
Iniciar los contenedores en segundo plano:

```bash
docker compose up -d
```

Verificar el estado de los servicios:

```bash
docker compose ps
```

---

## 4. Configuración Inicial en la Interfaz Web

1. **Acceso**:
   Abrir en el navegador: `https://<TRAEFIK_DOMAIN>` (o `http://localhost` en desarrollo local).
2. **Primer inicio de sesión**:
   Ingresar con las credenciales definidas en `NEXTCLOUD_ADMIN_USER` y `NEXTCLOUD_ADMIN_PASSWORD`.
3. **Creación de Grupos de Trabajo**:
   Ir al menú superior derecho -> **Usuarios** -> **Grupos**:
   - `admin`: Permisos totales sobre el sistema y configuración.
   - `doc-write`: Integrantes del equipo con permiso para subir documentos, editar informes y versionar entregables.
   - `doc-read`: Evaluadores o auditores con permisos de solo lectura y descarga.
4. **Matriz de Permisos por Carpeta**:
   Compartir las carpetas de trabajo con el grupo `doc-write` (Crear, Editar, Eliminar) y con `doc-read` (Solo Lectura, Bloquear descarga de borradores si aplica).
5. **Habilitación de Autenticación de Dos Factores (2FA)**:
   - Ir a **Aplicaciones** (Apps) -> Buscar y activar **Two-Factor TOTP Provider**.
   - En **Ajustes personales** -> **Seguridad**, escanear el código QR con Google Authenticator, Authy o Aegis y registrar los códigos de respaldo.

---

## 5. Validación de HTTPS y Certificados TLS

El archivo `traefik.yml` viene configurado inicialmente con el endpoint de pruebas de Let's Encrypt (`caServer: "https://acme-staging-v02.api.letsencrypt.org/directory"`) para evitar bloquear el dominio por límite de peticiones (rate limiting).

- **Modo Staging**: El navegador alertará de certificado no confiable (Fake LE Intermediate), lo cual valida que la negociación ACME y el reto HTTP-01 fueron exitosos.
- **Paso a Producción**:
  1. Abrir `traefik.yml`.
  2. Comentar o eliminar la línea:
     ```yaml
     caServer: "https://acme-staging-v02.api.letsencrypt.org/directory"
     ```
  3. Eliminar el archivo de certificados temporal del volumen:
     ```bash
     docker compose stop traefik
     docker volume rm traefik_certificates
     docker volume create traefik_certificates
     docker compose up -d traefik
     ```
  4. Acceder nuevamente para comprobar el certificado de producción emitido por Let's Encrypt Authority.

---

## 6. Procedimiento de Backup y Restauración

### Ejecución de Backup Manual
El servicio de backup cuenta con un script programado automáticamente a las 02:00 AM diario, pero puede dispararse manualmente en cualquier momento:

```bash
docker compose exec backup /usr/local/bin/backup.sh
```

Los respaldos se depositan en el volumen `nextcloud_backup` (mapeado a `/backup`):
- `db_nextcloud_YYYYMMDD_HHMMSS.sql.gz`: Dump comprimido de la base de datos PostgreSQL (`pg_dump`).
- `nextcloud_files_YYYYMMDD_HHMMSS.tar.gz`: Copia comprimida de configuraciones y archivos subidos.

Para copiar los backups al host local:
```bash
docker cp nextcloud_backup:/backup ./backups_locales
```

### Procedimiento de Prueba de Restauración (Disaster Recovery)

Para validar la integridad de los datos ante una catástrofe:

1. **Detener el tráfico hacia Nextcloud**:
   ```bash
   docker compose stop app cron
   ```
2. **Restaurar la Base de Datos PostgreSQL**:
   Descomprimir el archivo `.sql.gz` y restaurarlo en el contenedor `nextcloud_db` mediante `psql`:
   ```bash
   # En Windows PowerShell
   docker compose exec -T -e PGPASSWORD=NextcloudDbPassword456! db psql -U nextcloud -d nextcloud < ./backups_locales/db_nextcloud_YYYYMMDD_HHMMSS.sql
   ```
3. **Restaurar el Sistema de Archivos**:
   ```bash
   docker compose run --rm -v nextcloud_data:/var/www/html -v nextcloud_backup:/backup alpine sh -c "tar -xzf /backup/nextcloud_files_YYYYMMDD_HHMMSS.tar.gz -C /var/www/html"
   ```
4. **Reiniciar servicios y validar permisos**:
   ```bash
   docker compose start app cron
   docker compose exec -u www-data app php occ maintenance:mode --off
   docker compose exec -u www-data app php occ files:scan --all
   ```

---

## 7. Estructura Documental y Buenas Prácticas

Dentro de Nextcloud, organizar la estructura raíz del proyecto de la siguiente forma:

```text
/Documentacion_Proyecto/
├── 01_Arquitectura_y_Diseno/       # Diagramas C4, esquemas de BD, especificaciones de stack
├── 02_Gestion_Agil_Scrum/          # Actas de Sprint, historias de usuario, export de Jira
├── 03_Bases_de_Datos/              # Scripts DDL/DML, reportes de optimización SQL, replicación
├── 04_Infraestructura_Docker/      # Compose files, variables documentadas, diagramas de red
├── 05_Seguridad_y_Auditoria/       # Matriz de riesgos, escaneos de vulnerabilidades, respuesta a incidentes
├── 06_Pruebas_y_QA/                # Informes de pruebas de carga, rendimiento y penetración
└── 07_Entregables_Finales/         # Manuales de instalación, defensa oral y presentaciones
```

### Reglas de Seguridad y Ciberseguridad:
1. **Cero Secretos en Documentos**: Ningún informe o captura debe contener contraseñas en texto plano, tokens API, llaves privadas SSH o strings de conexión con credenciales reales. Utilizar placeholders (ej: `<API_KEY_OCULTA>`).
2. **Control de Versiones**: Utilizar el versionado automático integrado en Nextcloud para revertir modificaciones no deseadas en archivos compartidos.
3. **Auditoría de Actividad**: Revisar periódicamente la pestaña "Actividad" para verificar descargas, modificaciones y accesos de los miembros.
