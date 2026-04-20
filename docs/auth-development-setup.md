# Authentication Development Environment Setup

Scope: local development setup for the Authentication feature of the TS-D1000 platform.

This setup assumes:

- Backend: NestJS
- Frontend: React + Vite
- Database: PostgreSQL
- Package manager: `pnpm`
- Node version: `22`

---

## 1. Runtime Setup

### Node Version

Use the repo root Node version file:

```text
.nvmrc -> 22
```

### Package Manager

Use `pnpm` through Corepack.

Install flow:

```bash
nvm use
corepack enable
pnpm install
```

---

## 2. Authentication Environment Configuration

## 2.1 Root `.env`

Copy from:

```bash
cp .env.example .env
```

Relevant variables for Authentication:

| Variable | Example | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | App runtime mode |
| `API_PORT` | `3000` | Backend exposed port |
| `API_INTERNAL_PORT` | `3000` | Backend internal port |
| `API_PREFIX` | `api/v1` | API route prefix |
| `DATABASE_URL` | `postgresql://postgres:postgres@database:5432/tsd1000` | Backend DB connection |
| `JWT_SECRET` | `change-me-for-development` | JWT signing secret for auth |
| `JWT_EXPIRES_IN` | `8h` | Access token lifetime |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `VITE_API_BASE_URL` | `http://localhost:3000/api/v1` | Frontend API base URL |

## 2.2 Backend Auth `.env`

Copy from:

```bash
cp apps/api/.env.example apps/api/.env
```

Authentication-related variables:

```env
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tsd1000
JWT_SECRET=change-me-for-development
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
```

Field explanation:

- `DATABASE_URL`: required because login/logout/session validation need persistent user/session storage
- `JWT_SECRET`: signs and verifies access tokens
- `JWT_EXPIRES_IN`: token/session TTL policy for local auth testing
- `CORS_ORIGIN`: allows the frontend login page to call backend auth APIs

## 2.3 Frontend Auth `.env`

Copy from:

```bash
cp apps/web/.env.example apps/web/.env
```

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Used by:

- login page
- logout action
- `/auth/me` bootstrap check

---

## 3. Local Development Setup

## 3.1 Install Commands

From repo root:

```bash
nvm use
corepack enable
pnpm install
```

## 3.2 Start Database Only

Recommended:

```bash
docker compose up -d database
```

## 3.3 Run Authentication Stack Locally

Run backend:

```bash
pnpm dev:api
```

Run frontend:

```bash
pnpm dev:web
```

Run both:

```bash
pnpm dev
```

## 3.4 Build Commands

Backend:

```bash
pnpm build:api
```

Frontend:

```bash
pnpm build:web
```

Whole workspace:

```bash
pnpm build
```

---

## 4. Docker Setup For Authentication

The existing root `docker-compose.yml` already supports:

- `database`
- `backend`
- `frontend`

Authentication-relevant behavior:

- backend receives `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`
- frontend receives `VITE_API_BASE_URL`
- database persists auth-related tables such as `users` and `auth_sessions`

## 4.1 Run With Docker

```bash
cp .env.example .env
docker compose up --build
```

Auth-only Docker stack:

```bash
docker compose -f docker-compose.auth.yml up --build
```

## 4.2 Access URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health: `http://localhost:3000/api/v1/health`

## 4.3 Stop

```bash
docker compose down
```

---

## 5. Authentication Developer Onboarding

## Step 1. Clone Repo

```bash
git clone <repo-url>
cd TS-D1000
```

## Step 2. Select Runtime

```bash
nvm use
corepack enable
```

## Step 3. Install Dependencies

```bash
pnpm install
```

## Step 4. Setup Environment

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

PowerShell helper:

```powershell
.\Start-AuthTestEnv.ps1
```

At minimum, verify:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `VITE_API_BASE_URL`

## Step 5. Start PostgreSQL

```bash
docker compose up -d database
```

## Step 6. Prepare Authentication Data

If Prisma and migrations are being used:

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
pnpm --filter api prisma:seed
```

## Step 7. Run Backend + Frontend

```bash
pnpm dev
```

## Step 8. Test Authentication

Open frontend:

```text
http://localhost:5173
```

Then test:

1. Login with valid credentials
2. Refresh app and verify `/auth/me` bootstrap works
3. Logout and verify protected routes are blocked

---

## 6. Minimum Auth Test Checklist

- Backend starts with valid `JWT_SECRET`
- Backend connects to PostgreSQL
- User table exists
- Session table exists
- `POST /auth/login` returns token for active user
- `GET /auth/me` works with valid token
- `POST /auth/logout` revokes session
- Frontend redirects unauthenticated user to login
- Frontend hides protected shell until authenticated

---

## 7. Files To Use

- Root runtime config: [.nvmrc](/d:/Works/Software/Create%20software/TS-D1000/.nvmrc)
- Root env example: [.env.example](/d:/Works/Software/Create%20software/TS-D1000/.env.example)
- Docker stack: [docker-compose.yml](/d:/Works/Software/Create%20software/TS-D1000/docker-compose.yml)
- Auth-only Docker stack: [docker-compose.auth.yml](/d:/Works/Software/Create%20software/TS-D1000/docker-compose.auth.yml)
- Auth environment helper: [Start-AuthTestEnv.ps1](/d:/Works/Software/Create%20software/TS-D1000/Start-AuthTestEnv.ps1)
- Backend env example: [apps/api/.env.example](/d:/Works/Software/Create%20software/TS-D1000/apps/api/.env.example)
- Frontend env example: [apps/web/.env.example](/d:/Works/Software/Create%20software/TS-D1000/apps/web/.env.example)

This document is intentionally scoped to the Authentication feature so a developer can start, run, and verify auth independently from the rest of the product modules.
