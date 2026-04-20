# Database And Testing Foundation

## Database Structure

The backend uses Prisma with PostgreSQL.

Core tables included:

- `users`
- `auth_sessions`
- `rooms`
- `layouts`
- `layout_annotations`
- `layout_devices`
- `tsd_connection_configs`
- `tsd_units`
- `cameras`
- `camera_presets`
- `mic_camera_mappings`
- `runtime_events`
- `speaking_requests`
- `camera_runtime_states`
- `system_logs`
- `audit_logs`

Design choices:

- UUID primary keys for all domain tables
- enum-backed status fields for role, mode, runtime states, and log levels
- explicit indexes for auth lookups, runtime sorting, and room-scoped filtering
- unique constraints for usernames, sessions, room-level layouts, unit IDs, and camera preset codes

## Migration Strategy

Tooling:

- Prisma schema: `apps/api/prisma/schema.prisma`
- SQL migration: `apps/api/prisma/migrations/20260420_init/migration.sql`

Recommended workflow:

1. Change Prisma schema
2. Run `pnpm --filter api prisma:migrate`
3. Commit both schema and generated migration
4. Never edit old committed migrations after they are applied in shared environments

Version control rule:

- one migration per logical schema change
- keep migration folders timestamp-prefixed
- commit migrations with the feature that requires them

## Seed Data

Seed script:

- `apps/api/prisma/seed.ts`

Included seed data:

- `admin / Admin123!`
- `user / User123!`
- one room
- two TS-D units
- one demo camera
- one preset
- two demo mic-camera mappings

## Backend Tests

Tooling:

- Jest
- ts-jest

Files:

- config: `apps/api/jest.config.ts`
- sample test: `apps/api/src/modules/auth/services/auth.service.spec.ts`

Recommended test layout:

- unit tests next to source for service-level logic
- integration or e2e tests under `apps/api/test/`

## Frontend Tests

Tooling:

- Vitest
- React Testing Library
- jsdom

Files:

- config: `apps/web/vitest.config.ts`
- setup: `apps/web/src/test/setup.ts`
- sample test: `apps/web/src/views/login-page.test.tsx`

Recommended test layout:

- component and page tests beside feature files
- shared provider or utility tests near the provider/util itself

## Immediate Development Commands

Backend:

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
pnpm --filter api prisma:seed
pnpm --filter api test
```

Frontend:

```bash
pnpm --filter web test
pnpm --filter web test:watch
```
