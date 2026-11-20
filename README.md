# Reservas de Canchas — Grupo 15 (HIA)

App web: **Angular 21** (frontend) + **Node/Express 5 + Sequelize** (backend) + **PostgreSQL 16**.

## Levantar con Docker
```bash
cp .env.example .env        # completar DB_PASSWORD y JWT_SECRET
docker compose up -d --build
# App: http://localhost:8080   (nginx sirve el frontend y reenvía /api al backend)
```
Desarrollo (puertos 3000/5432 en localhost, hot reload del backend):
`docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`

## Arquitectura de contenedores
| Contenedor | Red(es) | Puerto host |
|---|---|---|
| `g15-frontend` (nginx) | `g15-app-net` | `127.0.0.1:8080` |
| `g15-backend` (Node) | `g15-app-net`, `g15-db-net` | — |
| `g15-postgres` | `g15-db-net` | — (solo en dev) |

Volumen persistente: `g15-pgdata`. Ver `docs/CONTROL_VERSIONES.md` para ramas y commits.
