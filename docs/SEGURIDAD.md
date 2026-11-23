# Seguridad e Integridad de la Infraestructura y Aplicación — Actividad 14 (DevSecOps)

Este documento detalla las medidas de seguridad implementadas en la plataforma **FutbolGest**, cubriendo tanto la infraestructura de contenedores y redes como el código de la aplicación (frontend y backend) y el pipeline de CI/CD.

---

## 1. Matriz de Controles Implementados

| Capa | Control Aplicado | Implementación / Evidencia |
| :--- | :--- | :--- |
| **Secretos y Credenciales** | Exclusión de archivos sensibles en Git e inyección segura en despliegue | Ningún archivo `.env` está versionado (solo `.env.example` en `.gitignore`). En CD (`cd.yml`) los secretos se inyectan desde GitHub Secrets con permisos restringidos (`umask 077`). |
| **Autenticación y Tokens** | Eliminación de secretos hardcodeados y hash de contraseñas | Contraseñas almacenadas con `bcrypt`. Firma y verificación de sesiones JWT mediante `process.env.JWT_SECRET` (se eliminó secreto estático residual en middleware). |
| **Hardening HTTP (Backend)** | Cabeceras de seguridad y mitigación de fuerza bruta | Uso de `helmet` (CSP, HSTS, X-Frame-Options, nosniff), ocultamiento de firma tecnológica (`app.disable("x-powered-by")`) y `express-rate-limit` en `/api/auth` (máx. 25 intentos / 15 min por IP). |
| **Hardening HTTP (Reverse Proxy)** | Encabezados defensivos y ocultamiento de versión en Nginx | En `nginx.conf`: `server_tokens off`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy` y `Permissions-Policy` bloqueando geolocalización, cámara y micrófono. |
| **Aislamiento de Redes y Puertos** | Principio de mínima exposición | En `docker-compose.yml`, ni PostgreSQL (`5432`) ni el Backend (`3000`) publican puertos hacia el host. El único punto de entrada es Nginx (`127.0.0.1:8080`) detrás del túnel cifrado (Tailscale / Cloudflare). |
| **Contenedores (Hardening)** | Ejecución sin privilegios y reducción de superficie | Backend construido con multi-stage build sobre `node:22-alpine` ejecutando bajo usuario no-root (`USER node`). Frontend sobre `nginx:1.27-alpine` actualizado con `apk upgrade --no-cache`. |
| **Seguridad Continua (CI/CD)** | Análisis automático de dependencias e imágenes | En `.github/workflows/ci.yml`: `npm audit --omit=dev --audit-level=high` bloquea el PR ante dependencias vulnerables y **Trivy** escanea ambas imágenes Docker bloqueando vulnerabilidades `CRITICAL` con parche disponible. |

---

## 2. Verificación y Auditoría

### Verificación de Cabeceras HTTP en Producción Local
Ejecutando `curl -I http://localhost:8080/api/hello` sobre el stack desplegado se comprueba la presencia activa de todos los encabezados defensivos (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `Permissions-Policy`) y la ausencia de información de versiones de servidor o framework.

### Auditoría de Dependencias
Antes de integrar las mejoras, se ejecutó `npm audit --omit=dev` en el backend verificando ausencia de vulnerabilidades críticas o altas en producción.

---

## 3. Buenas Prácticas Operativas Recomendadas
- **Rotación periódica** de `JWT_SECRET` y credenciales de base de datos en GitHub Secrets y archivos `.env` locales.
- **Control de acceso (RBAC)** en el repositorio de GitHub: rama `main` protegida exigiendo checks de CI (tests + Trivy) en verde y revisión previa antes del merge.
- **Actualización continua** de imágenes base (`node:22-alpine`, `nginx:1.27-alpine`, `postgres:16-alpine`) ante nuevos avisos de seguridad.
