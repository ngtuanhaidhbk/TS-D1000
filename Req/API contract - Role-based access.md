# API Contract - Role-Based Access

System: Desktop Meeting Control Application for TS-D1000 + PTZ Cameras  
Scope: Authentication + Role-Based Access behavior for protected resources

This contract is derived from:

- Requirement documents in `Req`
- `Use cases - Role-based access.md`
- `UI UX design - Role-based access.md`
- `Detail design - Authentication + Role-based access.md`

If a rule is not explicit in those documents, it is marked as an assumption.

---

## 1. Overview

### 1.1 Objective

The Role-Based Access contract must:

- authenticate users through session-backed access tokens
- authorize access to protected resources
- enforce role restrictions consistently in backend APIs
- provide current auth context for frontend role-aware rendering
- support invalid session handling across the application

### 1.2 Roles

| Role | Description |
| --- | --- |
| `ADMIN` | Full application access |
| `OPERATOR` | Limited access to non-admin modules/features |

### 1.3 Scope Boundary

This contract covers:

- authentication-related APIs needed for RBAC context
- backend auth guard behavior
- backend role guard behavior
- access-denied and invalid-session response mapping

This contract does not define all business module APIs.  
It defines the authorization rules that those APIs must follow.

### 1.4 Base API Rules

- Base URL: `/api/v1`
- Content-Type: `application/json`
- Protected header:

```http
Authorization: Bearer <access_token>
```

- Success format:

```json
{
  "success": true,
  "data": {}
}
```

- Error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": []
  }
}
```

---

## 2. Modules & Endpoints List

| Module | Related UC | Endpoint / Mechanism |
| --- | --- | --- |
| Authentication | UC-AUTH-01 | `POST /auth/login` |
| Authentication | UC-AUTH-02 | `POST /auth/logout` |
| Authentication | UC-AUTH-03 | `GET /auth/me` |
| Authorization | UC-AUTHZ-01 | Internal `AuthGuard` on protected APIs |
| Authorization | UC-AUTHZ-02 | Internal `RoleGuard` on role-protected APIs |
| Session Lifecycle | UC-AUTHZ-03 | Auth error handling for expired/revoked session |
| Authorization Reference | whole-app RBAC | Example protected admin API behavior contract |

---

## 3. Naming Conventions

### 3.1 JSON Naming

- Use `camelCase`

Examples:

- `expiresAt`
- `requiredRoles`
- `sessionId`

### 3.2 Database Naming

- Use `snake_case`

Examples:

- `password_hash`
- `token_jti`
- `expires_at`
- `actor_user_id`

### 3.3 Path Naming

- Use resource-oriented naming
- Use `kebab-case` or lowercase resource segments
- Avoid duplicate role-specific endpoints when guard metadata can enforce access

Examples:

- `/auth/login`
- `/auth/logout`
- `/auth/me`

---

## 4. Core Data Mapping

## 4.1 User

| API Field | Entity Field | DB Field | Notes |
| --- | --- | --- | --- |
| `id` | `User.id` | `id` | UUID |
| `username` | `User.username` | `username` | case-insensitive unique |
| `role` | `User.role` | `role` | `ADMIN` / `OPERATOR` |
| `status` | `User.status` | `status` | `ACTIVE` / `INACTIVE` |

## 4.2 Auth Session

| API / Token Field | Entity Field | DB Field | Notes |
| --- | --- | --- | --- |
| `sid` | `AuthSession.id` | `id` | current session id |
| `jti` | `AuthSession.tokenJti` | `token_jti` | must match token |
| `expiresAt` | `AuthSession.expiresAt` | `expires_at` | ISO datetime |
| session status | `AuthSession.status` | `status` | `ACTIVE`, `REVOKED`, `EXPIRED` |

## 4.3 Access Denial / Auth Context

| API Field | Source | Notes |
| --- | --- | --- |
| `role` | token + user lookup | used for RoleGuard |
| `sessionId` | token + session lookup | current session only |
| `requiredRoles` | endpoint metadata | implementation-side, not always returned in API |

---

## 5. Detailed API Specification

## 5.1 POST `/auth/login`

### Basic Info

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/auth/login` |
| Description | Authenticate user and create a session-backed token |
| Related Use Case | `UC-AUTH-01` |
| Permission | Public |

### Request Body

| Field | Type | Required | Validation | Description |
| --- | --- | --- | --- | --- |
| `username` | string | Yes | trim, not empty | login username |
| `password` | string | Yes | not empty | plaintext password |

### Example Request

```json
{
  "username": "admin",
  "password": "StrongPass123"
}
```

### Success Response

```json
{
  "success": true,
  "data": {
    "token": "<jwt-access-token>",
    "expiresAt": "2026-04-20T16:00:00Z",
    "user": {
      "id": "8dbd2d15-9ef8-4c3f-b279-49d52a2f3d18",
      "username": "admin",
      "role": "ADMIN",
      "status": "ACTIVE"
    }
  }
}
```

### Error Responses

#### 400 Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "username is required",
    "details": [
      {
        "field": "username",
        "message": "must not be empty"
      }
    ]
  }
}
```

#### 401 Invalid Credentials

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password",
    "details": []
  }
}
```

#### 403 Inactive User

```json
{
  "success": false,
  "error": {
    "code": "USER_INACTIVE",
    "message": "User account is inactive",
    "details": []
  }
}
```

### Side Effects

- create `auth_sessions` record
- issue JWT with `sub`, `sid`, `jti`, `role`, `exp`
- write `LOGIN` audit log

---

## 5.2 POST `/auth/logout`

### Basic Info

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/auth/logout` |
| Description | Revoke the current session |
| Related Use Case | `UC-AUTH-02` |
| Permission | Authenticated (`ADMIN`, `OPERATOR`) |

### Request Body

Empty JSON object or empty body.

### Success Response

```json
{
  "success": true,
  "data": {
    "message": "Logged out"
  }
}
```

### Error Responses

| HTTP | Code | Condition |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | missing / invalid token |
| 401 | `SESSION_EXPIRED` | session already expired |
| 401 | `SESSION_REVOKED` | session already revoked |
| 500 | `INTERNAL_ERROR` | server failure |

### Side Effects

- set current session status to `REVOKED`
- set `revokedAt`
- set `revokedReason = USER_LOGOUT`
- write `LOGOUT` audit log

---

## 5.3 GET `/auth/me`

### Basic Info

| Item | Value |
| --- | --- |
| Method | `GET` |
| Path | `/auth/me` |
| Description | Return current authenticated user and session context |
| Related Use Case | `UC-AUTH-03` |
| Permission | Authenticated (`ADMIN`, `OPERATOR`) |

### Success Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "8dbd2d15-9ef8-4c3f-b279-49d52a2f3d18",
      "username": "operator1",
      "role": "OPERATOR",
      "status": "ACTIVE"
    },
    "session": {
      "id": "0e0c42dd-8b8e-4734-a9ee-0d94081d6b2d",
      "expiresAt": "2026-04-20T16:00:00Z"
    }
  }
}
```

### Error Responses

| HTTP | Code | Condition |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | token missing / malformed / invalid |
| 401 | `SESSION_EXPIRED` | session expired |
| 401 | `SESSION_REVOKED` | session revoked |
| 403 | `USER_INACTIVE` | user deactivated after login |

### Side Effects

- optional update of `lastSeenAt`

---

## 5.4 Internal Auth Guard Contract

### Basic Info

| Item | Value |
| --- | --- |
| Type | Internal mechanism |
| Name | `AuthGuard` |
| Description | Validate access token, session, and active user before protected resource access |
| Related Use Case | `UC-AUTHZ-01`, `UC-AUTHZ-03` |

### Checks

1. `Authorization` header exists
2. bearer token format valid
3. JWT signature valid
4. token not expired
5. session exists by `sid`
6. session `status = ACTIVE`
7. session `expires_at > now()`
8. session `token_jti` matches token `jti`
9. user exists by `sub`
10. user `status = ACTIVE`

### Attached Auth Context

```json
{
  "userId": "user-uuid",
  "role": "ADMIN",
  "sessionId": "session-uuid"
}
```

### Failure Mapping

| Condition | HTTP | Code |
| --- | --- | --- |
| Missing token | 401 | `UNAUTHORIZED` |
| Invalid token | 401 | `UNAUTHORIZED` |
| Expired token/session | 401 | `SESSION_EXPIRED` |
| Revoked session | 401 | `SESSION_REVOKED` |
| Inactive user | 403 | `USER_INACTIVE` |

### Side Effects

- optional write `AUTH_CHECK_FAILED`
- optional update `last_seen_at` on success

---

## 5.5 Internal Role Guard Contract

### Basic Info

| Item | Value |
| --- | --- |
| Type | Internal mechanism |
| Name | `RoleGuard` |
| Description | Enforce endpoint role access after successful auth |
| Related Use Case | `UC-AUTHZ-02` |

### Input

| Field | Source | Description |
| --- | --- | --- |
| `requiredRoles` | endpoint metadata | allowed roles for endpoint |
| `role` | auth context | current user role |

### Success Rule

- if `role` is included in `requiredRoles`, request continues

### Failure Rule

- if `role` is not included, return `403 FORBIDDEN`

### Example Error

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource",
    "details": []
  }
}
```

### Side Effects

- optional write `ACCESS_DENIED` audit entry

---

## 5.6 Example Protected Admin Endpoint Contract Pattern

This is a reference contract pattern for all future admin-only APIs in the application.

### GET `/admin/example-protected-resource`

| Item | Value |
| --- | --- |
| Method | `GET` |
| Path | `/admin/example-protected-resource` |
| Description | Example admin-only protected resource |
| Related Use Case | `UC-AUTHZ-02` |
| Permission | `ADMIN` only |

### Success Response

```json
{
  "success": true,
  "data": {
    "resource": "example"
  }
}
```

### Error Responses

| HTTP | Code | Condition |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | not authenticated |
| 401 | `SESSION_EXPIRED` | invalid session |
| 403 | `FORBIDDEN` | authenticated operator tries to access |

### Purpose

- establish reusable RBAC pattern for the rest of the platform

---

## 6. Validation Rules

## 6.1 Field-Level Validation

| API | Field | Rule |
| --- | --- | --- |
| `POST /auth/login` | `username` | required, string, trimmed, non-empty |
| `POST /auth/login` | `password` | required, string, non-empty |

## 6.2 Cross-Field Validation

| Rule | Description |
| --- | --- |
| session expiry | `expires_at > issued_at` |
| token/session consistency | token `sid` and `jti` must match DB |
| session ownership | `auth_sessions.user_id` must reference existing user |

## 6.3 Business Validation

| Rule | Description |
| --- | --- |
| active login only | only `ACTIVE` users may log in |
| generic credential failure | username/password errors use same response category |
| logout current session only | logout affects current session only |
| auth before role check | role guard runs only after auth guard success |
| backend is final authority | frontend hide/disable is UX only |

---

## 7. Authorization Rules

## 7.1 Role Matrix for Current Auth Scope

| Endpoint / Mechanism | Public | ADMIN | OPERATOR | Access Scope |
| --- | :---: | :---: | :---: | --- |
| `POST /auth/login` | Y | Y | Y | public |
| `POST /auth/logout` | N | Y | Y | current session |
| `GET /auth/me` | N | Y | Y | self / current session |
| Admin-only future protected endpoint pattern | N | Y | N | module-defined |

## 7.2 Whole Application RBAC Rule

| Role | Access Rule |
| --- | --- |
| `ADMIN` | Full application access |
| `OPERATOR` | Limited access to non-admin features only |

## 7.3 Restrictions

- frontend must not expose admin-only menu to operator
- direct URL access must still be blocked by backend
- no API may expose another user's auth session or credentials

---

## 8. State Transition Rules

## 8.1 User Status

| Current | Trigger | Next | Impact |
| --- | --- | --- | --- |
| `ACTIVE` | admin deactivation | `INACTIVE` | future protected requests fail with `USER_INACTIVE` |
| `INACTIVE` | admin activation | `ACTIVE` | login allowed again |

## 8.2 Auth Session Status

| Current | Trigger | Next | Rule |
| --- | --- | --- | --- |
| `ACTIVE` | logout | `REVOKED` | current session invalidated |
| `ACTIVE` | expiry time reached | `EXPIRED` | session invalid even before cleanup updates DB |
| `REVOKED` | any protected request | no transition | reject |
| `EXPIRED` | any protected request | no transition | reject |

Invalid transitions:

- `REVOKED -> ACTIVE`
- `EXPIRED -> ACTIVE`

---

## 9. Error Handling

### 9.1 Standard Error Body

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": []
  }
}
```

### 9.2 Common Error Catalog

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | invalid request payload |
| 401 | `INVALID_CREDENTIALS` | wrong username/password |
| 401 | `UNAUTHORIZED` | missing/invalid token |
| 401 | `SESSION_EXPIRED` | session expired |
| 401 | `SESSION_REVOKED` | session revoked |
| 403 | `USER_INACTIVE` | user inactive |
| 403 | `FORBIDDEN` | role denied |
| 500 | `INTERNAL_ERROR` | system error |

---

## 10. Pagination, Filtering, Sorting

This RBAC/auth scope has no list APIs.  
Therefore:

- no pagination
- no filtering
- no sorting

---

## 11. Side Effects

| API / Mechanism | Side Effects |
| --- | --- |
| `POST /auth/login` | create session, sign token, audit `LOGIN` |
| `POST /auth/logout` | revoke session, audit `LOGOUT` |
| `GET /auth/me` | optional update of `lastSeenAt` |
| `AuthGuard` failure | optional `AUTH_CHECK_FAILED` logging |
| `RoleGuard` denial | optional `ACCESS_DENIED` logging |

Notifications:

- none defined in current requirement/design

Async jobs:

- optional session expiry cleanup job

---

## 12. Request / Response Schemas

## 12.1 Login Request

```json
{
  "username": "admin",
  "password": "StrongPass123"
}
```

## 12.2 Login Response

```json
{
  "success": true,
  "data": {
    "token": "<jwt-access-token>",
    "expiresAt": "2026-04-20T16:00:00Z",
    "user": {
      "id": "uuid",
      "username": "admin",
      "role": "ADMIN",
      "status": "ACTIVE"
    }
  }
}
```

## 12.3 Current User Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "operator1",
      "role": "OPERATOR",
      "status": "ACTIVE"
    },
    "session": {
      "id": "uuid",
      "expiresAt": "2026-04-20T16:00:00Z"
    }
  }
}
```

## 12.4 Logout Response

```json
{
  "success": true,
  "data": {
    "message": "Logged out"
  }
}
```

---

## 13. Assumptions

1. `GET /auth/me` is mandatory for frontend bootstrap and route/role guards.
2. `FORBIDDEN` response message for role denial follows the UI/UX guidance: `You do not have permission to access this resource`.
3. `AUTH_CHECK_FAILED` and `ACCESS_DENIED` logging are policy-supported but may be optional in MVP implementation.
4. This contract defines the RBAC enforcement pattern for future protected module APIs, even though those module APIs are not yet fully specified here.
