# Control de versiones (Actividad 3)

## Estrategia de ramas
| Rama | Uso |
|------|-----|
| `main` | Versión estable. Solo recibe PR desde `develop`. Dispara CD. |
| `develop` | Integración. Todo PR de feature/fix apunta acá. Dispara CI. |
| `feature/*` | Nuevas funcionalidades (`feature/docker-app`, `feature/ci-cd`). |
| `fix/*` | Correcciones (`fix/frontend-spec`, `fix/backend-audit`). |

## Convención de commits
`tipo(alcance): descripción (G15-N)` — tipos: `feat`, `fix`, `docs`, `chore`, `ci`, `test`.
Ej.: `feat(docker): contenerizar backend y frontend (G15-12)`. La clave Jira vincula commit y tarea.

## Flujo
1. `git checkout develop && git pull && git checkout -b feature/mi-cambio`
2. Commits chicos y descriptivos.
3. Push y Pull Request hacia `develop` (plantilla en `.github/`).
4. CI en verde + 1 revisión → merge.
5. Al cierre, PR `develop` → `main`.

## Protección de ramas (GitHub → Settings → Branches)
Reglas para `main` y `develop`: Require a pull request (1 aprobación), Require status checks
(`Backend`, `Frontend`, `Imágenes Docker`), Block force pushes, Do not allow bypassing.

## Secretos
`.env` está en `.gitignore`; solo se versiona `.env.example`. Los secretos del pipeline viven en
GitHub → Settings → Secrets and variables → Actions (`DB_NAME`, `DB_USER`, `DB_PASSWORD`,
`JWT_SECRET`, `CORS_ORIGIN`).

## Registro de correcciones
- `node_modules` (4752 archivos) estaba versionado en el backend → removido y agregado a `.gitignore`.
- Servicios Angular importaban `environment.development` → el build de producción apuntaba a `localhost:3000`.
- `app.spec.ts` de plantilla fallaba → corregido para que el CI tenga tests verdes.
- Dependencias del backend: 9 vulnerabilidades (1 crítica) → 2 moderadas (`uuid`, requiere cambio mayor).
