# Developer Onboarding

This repository uses a `pnpm` workspace with:

- `apps/api`: NestJS backend
- `apps/web`: React + Vite frontend
- `PostgreSQL`: local development database

## 1. Prerequisites

- Node.js `22.x`
- `pnpm` `9.x`
- Docker Desktop (recommended)

## 2. Clone The Repository

```bash
git clone <your-repo-url>
cd TS-D1000
```

## 3. Select Node Version

```bash
nvm use
```

If `nvm` is not available, install Node.js `22.x` manually.

## 4. Install Dependencies

```bash
corepack enable
pnpm install
```

## 5. Configure Environment

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Update values only if your local ports, database credentials, or allowed origins differ from the defaults.

## 6. Start PostgreSQL

Recommended:

```bash
docker compose up -d database
```

## 7. Run The Project Locally

Start both backend and frontend:

```bash
pnpm dev
```

Or run each app separately:

```bash
pnpm dev:api
pnpm dev:web
```

## 8. Access The Application

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/api/v1/health`

## 9. Build Commands

```bash
pnpm build
pnpm build:api
pnpm build:web
```

## 10. Docker Full Stack

```bash
cp .env.example .env
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

Stop:

```bash
docker compose down
```

## 11. Common Developer Commands

```bash
pnpm docker:up
pnpm docker:down
pnpm docker:logs
```
