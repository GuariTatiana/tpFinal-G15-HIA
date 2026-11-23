# Seguridad e Integridad de la Infraestructura y Aplicación — Actividad 14 (DevSecOps)

Este documento detalla las medidas de seguridad implementadas en la plataforma **FutbolGest**, cubriendo la infraestructura de contenedores y redes, el código de la aplicación (frontend y backend) y el pipeline de CI/CD.

---

## 1. Matriz de Controles Implementados

| Capa | Control Aplicado | Implementación / Evidencia |
| :--- | :--- | :--- |
| **Secretos y Credenciales** | Exclusión de archivos sensibles en Git e inyección segura en despliegue | Ningún archivo `.env` está versionado (solo `.env.example` en `.gitignore`). En CD (`cd.yml`) los secretos se inyectan desde GitHub Secrets con permisos restringidos (`umask 077`). |
| **Autenticación y Tokens** | Eliminación de secretos hardcodeados y hash de contraseñas | Contraseñas almacenadas con `bcrypt`. Firma y verificación de sesiones JWT mediante `process.env.JWT_SECRET` (se eliminó secreto estático residual en el middleware `verifyToken`). |
| **Hardening HTTP (Backend)** | Cabeceras defensivas y ocultamiento de firma tecnológica | Uso de `helmet` (CSP, HSTS, X-Frame-Options, nosniff, Cross-Origin Policies) y `app.disable("x-powered-by")` para evitar enumeración de tecnología. |
| **Protección contra Fuerza Bruta y Ráfagas (DoS)** | Rate limiting en dos niveles con `express-rate-limit` | **Nivel 1 (Auth):** Máx. **25 peticiones / 15 min** por IP en `/api/auth` contra fuerza bruta de credenciales.<br>**Nivel 2 (General):** Máx. **150 peticiones / min** por IP en `/api` para mitigar ráfagas masivas y proteger el pool de conexiones de PostgreSQL. |
| **Hardening HTTP (Reverse Proxy)** | Encabezados defensivos y control de carga en Nginx | En `nginx.conf`: `server_tokens off`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy` (bloquea geolocalización, cámara y micrófono) y `client_max_body_size 10m`. |
| **Aislamiento de Redes y Puertos** | Principio de mínima exposición | En `docker-compose.yml`, ni PostgreSQL (`5432`) ni el Backend (`3000`) publican puertos hacia el host. El único punto de entrada es Nginx (`127.0.0.1:8080`) detrás del túnel cifrado (Tailscale / Cloudflare). |
| **Contenedores (Hardening)** | Ejecución sin privilegios y reducción de superficie | Backend construido con multi-stage build sobre `node:22-alpine` ejecutando bajo usuario no-root (`USER node`). Frontend sobre `nginx:1.27-alpine` actualizado con `apk upgrade --no-cache`. |
| **Seguridad Continua (CI/CD)** | Análisis automático de dependencias e imágenes | En `.github/workflows/ci.yml`: `npm audit --omit=dev --audit-level=high` bloquea el PR ante dependencias vulnerables y **Trivy** escanea ambas imágenes Docker bloqueando vulnerabilidades `CRITICAL` con parche disponible. |

---

## 2. Guía de Pruebas de Seguridad y Verificación

A continuación se detallan las pruebas ejecutables para verificar cada control implementado:

1. **Verificación de Cabeceras HTTP y Rate Limit Policy:**
   `curl -I http://localhost:8080/api/hello`
2. **Prueba de mitigación de ráfagas / Fuerza Bruta (HTTP 429):**
   Envío de 30 peticiones consecutivas a `/api/auth/login` comprobando el bloqueo automático a partir de la petición 26.
3. **Verificación de aislamiento de puertos y usuario no-root:**
   Inspección con `docker ps` y `docker exec g15-backend whoami`.
4. **Auditoría de dependencias y código:**
   `npm audit --omit=dev` y `git ls-files "*.env*"`.
