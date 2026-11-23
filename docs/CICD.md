# CI/CD con GitHub Actions (HU05)

## Flujo
| Evento | Workflow | Qué hace |
|---|---|---|
| Pull Request a `develop` o `main`, push a `develop` | `ci.yml` | Sintaxis y `npm audit` del backend; tests y build del frontend; build de imágenes Docker; escaneo Trivy |
| Push a `main` | `cd.yml` | Publica imágenes en GHCR y despliega en el servidor self-hosted |
| Ejecución manual (`workflow_dispatch`) | `cd.yml` | Con `rollback_tag`, despliega un tag anterior sin reconstruir |

Un cambio defectuoso no llega a `main`: el PR exige los checks de CI en verde y una revisión (ver `CONTROL_VERSIONES.md`).

## Validaciones del CI
1. `node --check` sobre todos los `.js` del backend.
2. `npm audit --omit=dev --audit-level=high` (bloquea con vulnerabilidades altas o críticas).
3. `ng test` y `ng build --configuration production` del frontend.
4. El build no debe contener `localhost:3000` (evita apuntar a una API de desarrollo).
5. Build de las dos imágenes Docker y Trivy con `CRITICAL` bloqueante (solo con corrección disponible).

## Secretos
Se cargan en GitHub → Settings → Secrets and variables → Actions: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ORIGIN`.
- El workflow escribe `.env` en el servidor con `umask 077` a partir de los secrets; nunca existe en el repositorio.
- La publicación en GHCR usa `GITHUB_TOKEN` con permiso `packages: write` solo en `cd.yml`.
- El job de despliegue usa el environment `production` (permite exigir aprobación manual).

## Commit de prueba (evidencia)
1. Hacer un cambio visible (por ejemplo, un texto en el frontend) en una rama `feature/*`.
2. PR a `develop`: el CI debe quedar en verde. Mergear.
3. PR `develop` → `main`: se ejecuta el CD.
4. Verificar: Actions muestra `publish` y `deploy` en verde; `docker ps` muestra las imágenes con el tag del SHA; el cambio se ve en la URL publicada. Guardar capturas.

## Fallos y reversión
**Rollback automático.** `deploy/deploy.sh <tag> <owner>` guarda el tag desplegado en `.deployed_tag`. Tras desplegar, consulta `http://127.0.0.1:8080/api/hello` hasta 30 veces (5 s). Si no responde:
1. Muestra los últimos 50 logs del backend.
2. Vuelve a desplegar el tag anterior.
3. Termina con error, por lo que el workflow queda en rojo y avisa del fallo.

**Rollback manual.** Actions → CD → *Run workflow* → completar `rollback_tag` con el SHA corto de una versión previa (visible en Packages de GitHub). Alternativa en el servidor:
```
cd <carpeta del repo>
./deploy/deploy.sh <sha_anterior> guaritatiana
```

**Fallos frecuentes**
| Síntoma | Causa probable | Acción |
|---|---|---|
| CI falla en `npm audit` | Dependencia vulnerable | `npm audit fix` en una rama `fix/*` |
| CI falla en Trivy | Imagen base con CVE crítico | Actualizar la imagen base |
| `deploy` queda en espera | Runner `g15` apagado | Iniciar el runner en el servidor |
| Healthcheck falla | Backend sin conexión a la base | Revisar `DB_*` y la red de Docker; el rollback ya restaura la versión anterior |
| El runner no puede bajar imágenes | Paquetes privados | Hacer públicos los paquetes o ejecutar `docker login ghcr.io` en el servidor |


# Seguridad
### Prueba 1: Verificación de Cabeceras HTTP Defensivas y Ocultamiento de Versión
Comprueba que Nginx y Helmet estén filtrando cabeceras de seguridad y ocultando las versiones del servidor web y del framework.

* **Comando (Windows PowerShell):**
  ```powershell
  curl.exe -I http://localhost:8080/api/hello
  ```
* **Comando (Linux / Git Bash):**
  ```bash
  curl -I http://localhost:8080/api/hello
  ```
* **Resultado esperado:**
  * Código de estado: `HTTP/1.1 200 OK`
  * `Server: nginx` (sin número de versión) y **ausencia total** de `X-Powered-By: Express`.
  * Presencia de:
    * `Content-Security-Policy: default-src 'self'...`
    * `Strict-Transport-Security: max-age=31536000; includeSubDomains`
    * `X-Content-Type-Options: nosniff`
    * `X-Frame-Options: SAMEORIGIN`
    * `Permissions-Policy: geolocation=(), microphone=(), camera=()`
    * `RateLimit-Policy: 150;w=60`
* **Significado técnico:** Previene ataques de Cross-Site Scripting (XSS), Clickjacking (incrustación en iframes maliciosos), MIME-sniffing y dificulta el reconocimiento automatizado de versiones vulnerables.

---

### Prueba 2: Aislamiento de Puertos y Ejecución Sin Privilegios (`USER node`)
Verifica que el contenedor de la aplicación no corra como `root` y que las bases de datos y la API no estén expuestas directamente en la interfaz de red del host.

* **Comando (PowerShell / Bash):**
  ```bash
  docker exec g15-backend whoami
  docker ps --format "table {{.Names}}\t{{.Ports}}"
  ```
* **Resultado esperado:**
  * `whoami` imprime exactamente: **`node`** (nunca `root`).
  * En la tabla de puertos: `g15-backend` muestra `3000/tcp` (sin mapeo externo), `g15-postgres` muestra `5432/tcp` (sin mapeo externo) y `g15-frontend` muestra únicamente `127.0.0.1:8080->80/tcp`.
* **Significado técnico:** Aplica el **principio de mínimo privilegio** y **segmentación de red**: incluso ante una vulnerabilidad en Node.js, un atacante no obtiene permisos de superusuario en el contenedor ni puede acceder directamente a PostgreSQL desde fuera de la red interna de Docker.

---

### Prueba 3: Control de Secretos en Git y Auditoría de Dependencias
Verifica que no existan credenciales filtradas en el control de versiones y que las dependencias de producción no tengan vulnerabilidades conocidas.

* **Comando (PowerShell / Bash):**
  ```bash
  git ls-files "*.env*"
  cd TPFinalGrupo15_Backend && npm audit --omit=dev && cd ..
  ```
* **Resultado esperado:**
  * `git ls-files` devuelve **únicamente** archivos plantilla `*.env.example`.
  * `npm audit` devuelve **`found 0 vulnerabilities`**.
* **Significado técnico:** Garantiza la confidencialidad de claves (`JWT_SECRET`, `DB_PASSWORD`) en el repositorio y valida la cadena de suministro de paquetes de Node.js (control que también se ejecuta automáticamente en GitHub Actions ante cada PR).

---

### Prueba 4: Mitigación de Fuerza Bruta y Ráfagas de Peticiones (HTTP 429)
Simula un ataque automatizado de 30 intentos seguidos contra el endpoint de autenticación para comprobar el bloqueo automático. *(Ejecutar al final de las pruebas; si se desea limpiar el contador antes de los 15 minutos, basta con reiniciar el contenedor con `docker restart g15-backend`).*

* **Comando (Windows PowerShell):**
  ```powershell
  1..30 | ForEach-Object {
      code = curl.exe -s -o null -w "%{http_code}" -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"prueba@test.com","password":"clave_incorrecta"}'
      Write-Host "Intento \(_ -> HTTP\)code"
  }
  ```
* **Comando (Linux / Git Bash):**
  ```bash
  for i in \$(seq 1 30); do
    code=\$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"prueba@test.com","password":"clave_incorrecta"}')
    echo "Intento i -> HTTP code"
  done
  ```
* **Resultado esperado:**
  * Intentos **1 al 25**: devuelven `HTTP 400` o `HTTP 401` (rechazo normal por credenciales inválidas).
  * Intentos **26 al 30**: devuelven inmediatamente **`HTTP 429`** (*Too Many Requests*).
* **Significado técnico:** Protege el endpoint de login contra ataques de diccionario/fuerza bruta y evita la degradación del servicio (DoS) al rechazar ráfagas en memoria antes de ejecutar operaciones costosas de CPU (`bcrypt`) o agotar el pool de conexiones de PostgreSQL.