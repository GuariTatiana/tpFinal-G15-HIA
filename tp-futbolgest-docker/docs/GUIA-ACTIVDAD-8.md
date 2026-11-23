# Guía de Puesta en Marcha y Evidencias — Actividad 8 (CI/CD)

Esta guía contiene los pasos exactos para activar el pipeline de Integración Continua (`ci.yml`) y Despliegue Continuo (`cd.yml`) en el repositorio, conectar el servidor local como runner y generar las evidencias exigidas por la consigna (commit de prueba, despliegue automático y rollback).

---

## Paso 1: Verificar los 5 Secretos en GitHub
Ir a **Settings → Secrets and variables → Actions → Repository secrets** y confirmar que estén cargados estos 5 valores (coincidentes con el `.env` del clúster):
1. `DB_NAME` (ej. `canchas_db`)
2. `DB_USER` (ej. `postgres`)
3. `DB_PASSWORD` (contraseña de Postgres del clúster de replicación)
4. `JWT_SECRET` (clave aleatoria de 32+ caracteres)
5. `CORS_ORIGIN` (ej. `http://localhost:8080` o la URL pública del túnel)

---

## Paso 2: Registrar la PC Servidor como Self-Hosted Runner (`g15`)
*(Nota: En Windows es necesario tener instalado **Git for Windows** para que GitHub Actions ejecute los scripts `.sh` con Bash).*

1. En GitHub ir a **Settings → Actions → Runners → New self-hosted runner**.
2. Seleccionar **Windows** (o Linux si el servidor corre en Linux) y arquitectura **x64**.
3. Abrir PowerShell (o terminal) en la PC que aloja los contenedores Docker y ejecutar los comandos de descarga y extracción que muestra GitHub en una carpeta dedicada (ej. `C:\actions-runner`).
4. Ejecutar el comando `./config.cmd --url https://github.com<usuario>/<repo> --token <TOKEN>`:
   - **Runner group:** presionar `Enter` (Default).
   - **Runner name:** presionar `Enter` o escribir `servidor-g15`.
   - **Additional labels:** escribir **`g15`** *(obligatorio: `cd.yml` busca `runs-on: [self-hosted, g15]`)*.
   - **Work folder:** presionar `Enter` (`_work`).
5. Iniciar el runner ejecutando `./run.cmd` (dejar esta terminal abierta mientras se realizan las pruebas; en GitHub → *Runners* debe aparecer en verde como **Idle**).

---

## Paso 3: Prueba de Integración Continua (CI) y Despliegue Continuo (CD)
1. **Crear rama de prueba:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/prueba-cicd
   ```
2. **Hacer un cambio visible en el frontend** (por ejemplo, agregar la versión o texto `"v1.0.1 - Despliegue Continuo"` en el footer de `proyfrontendgrupo15-main/src/...`).
3. **Subir y abrir Pull Request hacia `develop`:**
   ```bash
   git add .
   git commit -m "feat: prueba de pipeline CI/CD"
   git push -u origin feature/prueba-cicd
   ```
   - En GitHub, crear un **Pull Request** de `feature/prueba-cicd` → `develop`.
   - **Evidencia 1 (CI):** Esperar a que el workflow **`CI`** termine en verde (valida sintaxis backend, `npm audit`, tests Angular, build producción y escaneo Trivy) y **tomar captura**. Mergear el PR a `develop`.
4. **Promover a `main` para disparar el Despliegue Continuo:**
   - Crear un **Pull Request** de `develop` → `main` y mergearlo.
   - **Evidencia 2 (CD):** Ir a la pestaña **Actions → CD** y verificar que los jobs **`Publicar imágenes en GHCR`** y **`Desplegar en servidor local (self-hosted)`** terminen en verde. **Tomar captura**.
   - **Evidencia 3 (App en vivo):** Abrir `http://localhost:8080` (y la URL de Tailscale) y comprobar que el texto nuevo aparece publicado sin intervención manual. **Tomar captura** junto con `docker ps` mostrando las imágenes con el tag del commit (`ghcr.io/.../g15-frontend:<sha>`).

---

## Paso 4: Prueba de Reversión (Rollback)
Para demostrar recuperación ante fallos sin reconstruir código:
1. Ir en GitHub a **Packages** (o a la ejecución anterior de `CD`) y copiar el **tag corto (SHA de 7 caracteres)** de la versión previa.
2. Ir a **Actions → CD → Run workflow** (botón desplegable a la derecha).
3. En el campo **`rollback_tag`**, pegar el SHA anterior y ejecutar.
4. **Evidencia 4 (Rollback):** Capturar la ejecución en verde del workflow y refrescar `http://localhost:8080` comprobando que la aplicación volvió automáticamente a la versión anterior.
