# Environment Variables

## Root `.env`

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `COMPOSE_PROJECT_NAME` | No | `tsd1000` | Docker Compose project prefix for container naming. |
| `NODE_ENV` | Yes | `development` | Global runtime mode used by both applications. |
| `POSTGRES_DB` | Yes | `tsd1000` | PostgreSQL database name for local development. |
| `POSTGRES_USER` | Yes | `postgres` | PostgreSQL username. |
| `POSTGRES_PASSWORD` | Yes | `postgres` | PostgreSQL password. |
| `POSTGRES_PORT` | Yes | `5432` | Host port exposed for PostgreSQL. |
| `API_PORT` | Yes | `3000` | Host port for the backend service. |
| `API_INTERNAL_PORT` | Yes | `3000` | Internal port used by the backend container/app. |
| `API_PREFIX` | Yes | `api/v1` | HTTP prefix used by NestJS routes. |
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@database:5432/tsd1000` | Connection string consumed by the backend. |
| `JWT_SECRET` | Yes | none | Signing secret for access tokens. Must be changed outside local development. |
| `JWT_EXPIRES_IN` | Yes | `8h` | Access-token/session lifetime. |
| `CORS_ORIGIN` | Yes | `http://localhost:5173` | Allowed frontend origin for browser requests. |
| `WEB_PORT` | Yes | `5173` | Host port for the frontend service. |
| `WEB_INTERNAL_PORT` | Yes | `5173` | Internal port used by the frontend container/app. |
| `VITE_API_BASE_URL` | Yes | `http://localhost:3000/api/v1` | API base URL injected into the frontend build/runtime. |

## Backend `apps/api/.env`

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Yes | Enables development-specific NestJS behavior. |
| `PORT` | Yes | Local backend port. |
| `API_PREFIX` | Yes | Route prefix for the API. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `JWT_SECRET` | Yes | Signing secret used for tokens. |
| `JWT_EXPIRES_IN` | Yes | Token lifetime string, such as `8h`. |
| `CORS_ORIGIN` | Yes | Allowed browser origin for local frontend requests. |

## Frontend `apps/web/.env`

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Public base URL for backend requests from the frontend. |
