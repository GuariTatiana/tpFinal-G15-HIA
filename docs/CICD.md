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
