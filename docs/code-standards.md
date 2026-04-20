# Code Standards And Conventions

This document defines enforceable project standards for the TS-D1000 platform codebase.

It applies to:

- `apps/api` for the NestJS backend
- `apps/web` for the React frontend
- `packages/*` for shared workspace packages

## 1. Core Principles

- Prefer clarity over cleverness.
- Keep controllers and pages thin.
- Keep business rules in services, not transport layers.
- Keep naming predictable and boring.
- Optimize for maintainability by a team, not personal style.
- Duplicate a small amount of code if it avoids premature abstraction.

## 2. Naming Conventions

### 2.1 Variables

- Use `camelCase` for variables, function parameters, and object properties in TypeScript.
- Use nouns for state and data values.
- Use verbs for booleans only when it improves readability.
- Use positive booleans where possible.

Good:

```ts
const activeSession = await this.authSessionRepository.findActiveById(sessionId);
const isAuthenticated = Boolean(token);
const pendingRequests = await this.requestRepository.findPending(roomId);
```

Bad:

```ts
const ActiveSession = ...;
const auth = ...;
const isNotInactive = ...;
```

### 2.2 Functions

- Use `camelCase`.
- Function names must describe outcome or action.
- Use prefixes consistently:
  - `get` for synchronous reads or derived values
  - `find` for lookups that may return null
  - `list` for collection queries
  - `create`, `update`, `delete` for write operations
  - `validate` for validation logic
  - `map` for data transformation
  - `handle` for event handlers

Examples:

```ts
findUserByUsername(username: string)
createSpeakingRequest(data: CreateSpeakingRequestInput)
handleSpeakerStart(event: TsdSpeakerStartEvent)
validateMappingPayload(payload: CreateMappingDto)
```

### 2.3 Classes

- Use `PascalCase`.
- Suffix by role:
  - `Controller`
  - `Service`
  - `Repository`
  - `Module`
  - `Dto`
  - `Entity`
  - `Guard`
  - `Interceptor`

Examples:

```ts
AuthController
CameraService
MappingRepository
UserEntity
LoginRequestDto
```

### 2.4 Files

- Use `kebab-case` for file and folder names.
- One primary exported class/component per file.
- Backend file suffixes are mandatory:
  - `auth.controller.ts`
  - `auth.service.ts`
  - `user.repository.ts`
  - `login.request.dto.ts`
- Frontend route files end with `-page.tsx`.
- Frontend hooks start with `use-`.

### 2.5 Database Fields

- Use `snake_case`.
- Primary key: `id`
- Foreign key: `<entity>_id`
- Timestamps: `created_at`, `updated_at`
- Status enums: `<domain>_status` only when needed for clarity; otherwise use `status`
- Boolean fields must read naturally:
  - `is_active`
  - `is_connected`
  - `capability_ptz`

Examples:

```sql
user_id
room_id
created_at
updated_at
is_active
runtime_state
```

## 3. Code Structure Rules

### 3.1 Backend Layer Responsibilities

#### Controllers

Controllers must:

- accept HTTP requests
- deserialize and validate DTOs
- call application services
- map service results to response shape
- never contain business rules
- never contain database queries

Good:

```ts
@Post('login')
login(@Body() dto: LoginRequestDto) {
  return this.authService.login(dto);
}
```

Bad:

```ts
@Post('login')
async login(@Body() dto: LoginRequestDto) {
  const user = await this.prisma.user.findFirst(...);
  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedException();
  }
}
```

#### Services

Services must:

- contain business logic and orchestration
- coordinate repositories, adapters, and other services
- own domain rules and state transitions
- be the default place for use case implementation

Services must not:

- know HTTP-specific details unless unavoidable
- construct raw SQL directly if repositories exist for that concern
- return framework-specific response objects

#### Repositories

Repositories must:

- encapsulate persistence
- own query logic
- return domain-friendly results
- not contain unrelated business rules

Allowed:

- query composition
- persistence mapping
- transaction wrappers where appropriate

Not allowed:

- permission checks
- role rules
- camera switching logic

### 3.2 Frontend Structure Responsibilities

#### Pages

Pages must:

- represent route-level composition
- load feature components
- keep route-specific layout and page-level orchestration

Pages should not:

- contain low-level API logic
- become the home of reusable business logic

#### Feature Modules

Feature modules must:

- group everything related to one domain feature
- contain feature-specific components, hooks, API services, and types

#### Shared Components

`components/ui` is for reusable presentational primitives only.

Do not place feature logic in shared UI components.

### 3.3 Separation Of Concerns

- Transport logic belongs in controllers and API clients.
- Business logic belongs in services.
- Persistence belongs in repositories.
- Domain integration belongs in adapters.
- Validation belongs at the boundary first, then in business rules if cross-entity.
- Mapping belongs in small mapper functions, not scattered inline everywhere.

## 4. Validation Rules

### 4.1 Where Validation Happens

Validation must happen in three layers:

1. Request boundary validation with DTOs
2. Business validation in services
3. Database constraint validation in persistence/schema

### 4.2 DTO Usage

Use DTOs for:

- request payloads
- query params
- route params
- explicit response contracts when needed

Rules:

- one DTO per request shape
- DTO names must describe direction
- never reuse entity classes as request DTOs

Examples:

```ts
export class LoginRequestDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
```

### 4.3 Validation Categories

Boundary validation examples:

- required fields
- enum membership
- string length
- numeric ranges
- URL format

Business validation examples:

- only active user can login
- only pending request can be approved
- mapping preset must belong to selected camera
- chairman takes priority over delegate

## 5. Error Handling

### 5.1 Standard Error Format

All API errors must use this format:

```json
{
  "success": false,
  "error": {
    "code": "REQUEST_NOT_PENDING",
    "message": "Speaking request is not in pending state",
    "details": []
  }
}
```

Rules:

- `code` is stable and machine-readable
- `message` is readable by developers and UI
- `details` is optional but should be an array when present

### 5.2 Global Error Handling

Backend must use:

- one global exception filter
- one consistent error mapper for known domain exceptions

Map errors by category:

- `400` validation failure
- `401` authentication failure
- `403` authorization failure
- `404` resource not found
- `409` state or uniqueness conflict
- `422` business rule violation
- `500` unexpected internal error
- `502` or `503` integration/system dependency error

### 5.3 Throwing Errors

- Throw framework exceptions only at module boundaries when appropriate.
- Prefer domain-specific custom exceptions in service logic.
- Never swallow errors silently.
- If an error is rethrown, add context.

Good:

```ts
if (request.status !== 'PENDING') {
  throw new BusinessRuleException(
    'REQUEST_NOT_PENDING',
    'Speaking request is not in pending state',
  );
}
```

## 6. Logging

### 6.1 What To Log

Log these categories:

- authentication lifecycle
- permission-sensitive actions
- configuration changes
- external integration failures
- runtime event processing decisions
- recoverable background job failures

### 6.2 What Not To Log

Never log:

- passwords
- raw access tokens
- full device credentials
- personal secrets

If needed, log masked values only.

### 6.3 Where To Log

- Audit logs for user actions with trace value
- System logs for application behavior, integration state, worker/job state
- Controller layer: minimal request context only when necessary
- Service layer: domain decisions, retries, transitions
- Adapter layer: external API failures and latency-sensitive errors

### 6.4 Logging Rules

- Every log entry must include enough context to debug.
- Use structured logging, not string concatenation as the default.
- Use levels correctly:
  - `info`: normal state changes
  - `warn`: recoverable problems or suspicious states
  - `error`: failures that affect behavior

Example:

```ts
this.logger.warn('Camera mapping not found', {
  roomId,
  unitId,
  eventId,
});
```

## 7. Formatting And Tooling

### 7.1 Prettier

Prettier is the single source of truth for formatting.

Rules enforced:

- semicolons enabled
- single quotes
- trailing commas
- 100 character print width
- 2-space indentation

### 7.2 ESLint

ESLint is the source of truth for code-quality rules.

Key enforced rules:

- no unused variables
- prefer `const`
- no `var`
- strict import ordering
- consistent type imports
- React hooks rules
- Prettier compatibility

### 7.3 Required Scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier . --write",
    "format:check": "prettier . --check"
  }
}
```

## 8. Enforceable Team Rules

- No direct DB calls from controllers.
- No API calls directly inside React shared UI components.
- No `any` unless explicitly justified.
- No hidden side effects in getters or render code.
- No cross-module repository access.
- No large files mixing unrelated concerns.
- If a file exceeds roughly 300 lines, review whether it should be split.

## 9. Module Boundaries

### Backend

- `auth` owns token/session logic only.
- `users` owns user lifecycle only.
- `runtime` owns live state transitions and event processing.
- `cameras` owns PTZ/preset/device capability logic.
- `tsd` owns TS-D1000 integration and SSE ingestion.
- `mappings` owns mic-camera assignment.
- `logs` owns audit/system log persistence and querying.

Rule:

- Modules may call exported services from another module.
- Modules must not call another module's repository directly.

### Frontend

- Feature modules own feature hooks, feature API calls, and feature UI.
- Pages compose modules.
- Shared services are transport-only.
- Shared UI is presentation-only.

## 10. Code Examples

### Backend Service Example

```ts
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authSessionRepository: AuthSessionRepository,
  ) {}

  async login(dto: LoginRequestDto) {
    const user = await this.usersRepository.findByUsername(dto.username.trim());

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid username or password');
    }

    return this.authSessionRepository.createForUser(user.id);
  }
}
```

### Frontend Feature API Example

```ts
import { apiClient } from '@/services/api-client';
import type { LoginRequest, LoginResponse } from '../types/auth.dto';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', payload);
  return response.data;
}
```

### Frontend Hook Example

```ts
export function useLoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(values: LoginRequest) {
    setIsSubmitting(true);
    try {
      return await login(values);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, submit };
}
```

## 11. Required Config Files

The repo root now includes:

- `.editorconfig`
- `.prettierrc.json`
- `.prettierignore`
- `eslint.config.mjs`

These files are mandatory and must not be overridden ad hoc inside feature folders without a strong reason.
