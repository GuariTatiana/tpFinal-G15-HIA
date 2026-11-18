# Despliegue de Mantis Bug Tracker
**Práctica Integradora Final - Actividad 11 (Gestión de Incidencias)**

Este módulo contiene la infraestructura contenerizada de **Mantis Bug Tracker** para el registro, seguimiento y resolución de incidencias del proyecto, así como su integración automática con **n8n** y **Prometheus**.

---

## 1. Servicios y Puertos

- **`mantis_app_hia` (`vimagick/mantisbt:latest`)**: Interfaz web y API REST de Mantis.
  - **Puerto Host:** `8989` (Acceso: `http://localhost:8989`)
- **`mantis_db_hia` (`mariadb:10.5`)**: Base de datos MariaDB para almacenamiento de incidencias y usuarios.

---

## 2. Puesta en Marcha

Desde la carpeta `mantis/`:

```powershell
docker compose up -d
```

Verificar estado:
```powershell
docker compose ps
```

---

## 3. Configuración Inicial en la Interfaz Web

1. **Abrir en el Navegador**:
   Ir a: [http://localhost:8989](http://localhost:8989)
2. **Instalación de la Base de Datos**:
   Si aparece la pantalla de instalación (`/admin/install.php`), verificar que los datos coincidan con el archivo `.env`:
   - Type: `MySQL (default)` o `MySQL Improved (mysqli)`
   - Hostname: `db`
   - Database name: `bugtracker`
   - Username: `mantis`
   - Password: `MantisDbPassword2026!`
   - Presionar el botón **"Install/Upgrade Database"**.
3. **Inicio de Sesión por Defecto**:
   - **Usuario:** `administrator`
   - **Contraseña:** `root`
   *(El sistema solicitará cambiar la contraseña en el primer inicio de sesión)*.

---

## 4. Generación del API Token para n8n

Para que el flujo de **n8n** (Alertas de infraestructura desde Prometheus) pueda crear tickets automáticamente:

1. Iniciar sesión como `administrator`.
2. En la barra superior derecha, hacer clic en el nombre de usuario -> **Mi cuenta** (My Account).
3. Seleccionar la pestaña **Tokens de API** (API Tokens).
4. En el campo "Crear un token de API":
   - Nombre: `n8n_prometheus`
   - Clic en **Crear token de API**.
5. **Copiar y guardar el token generado** (solo se muestra una vez).

---

## 5. Parámetros de Integración para n8n

| Parámetro | Valor para entorno local | Valor si n8n corre en Docker |
| :--- | :--- | :--- |
| **URL Base de la API** | `http://localhost:8989/api/rest` | `http://host.docker.internal:8989/api/rest` |
| **Endpoint para crear issues** | `http://localhost:8989/api/rest/issues` | `http://host.docker.internal:8989/api/rest/issues` |
| **Header de Autorización** | `Authorization: <TU_API_TOKEN>` | `Authorization: <TU_API_TOKEN>` |
| **Método HTTP** | `POST` | `POST` |
