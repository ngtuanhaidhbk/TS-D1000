# API Contract - Authentication

System: Desktop Meeting Control Application for TS-D1000 + PTZ Cameras  
Scope: Authentication module only

This contract is derived from:

- Requirement documents in `Req`
- `Use cases - Authentication.md`
- `Detail design - Authentication.md`
- Authentication-related sections in `Detail design document.md`

If a rule is not explicit in those documents, it is marked as an assumption.

---

## 1. Overview

### 1.1 Objective

The Authentication API must:

- authenticate users by `username + password`
- allow only `ACTIVE` users to log in
- create and validate session-backed access tokens
- support logout with effective session revocation
- provide current auth context for frontend bootstrap and route guarding

### 1.2 Roles

| Role | Description |
| --- | --- |
| `ADMIN` | Full system access |
| `OPERATOR` | Limited operational access |

### 1.3 Authentication Model

Based on the detail design:

- account store: `users`
- session store: `auth_sessions`
- access token: JWT signed token
- token payload includes at least:
  - `sub`
  - `sid`
  - `jti`
  - `role`
  - `exp`

Protected API validation must check:

1. token signature
2. token expiry
3. session existence and `ACTIVE` status
4. user existence and `ACTIVE` status

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

| Module | Related UC | Endpoint |
| --- | --- | --- |
| Authentication | UC-AUTH-01 | `POST /auth/login` |
| Authentication | UC-AUTH-02 | `POST /auth/logout` |
| Authentication | UC-AUTH-03 | `GET /auth/me` |
| Authentication | UC-AUTH-04 | internal auth guard / middleware validation |

---

## 3. Naming Conventions

### 3.1 JSON Naming

- Use `camelCase`

Examples:

- `expiresAt`
- `actorUserId`
- `createdAt`

### 3.2 Database Mapping

- Use `snake_case`

Examples:

- `password_hash`
- `user_id`
- `expires_at`
- `revoked_at`

### 3.3 Path Naming

- Use resource-oriented paths
- Use verb/action only where domain action is explicit

Examples:

- `/auth/login`
- `/auth/logout`
- `/auth/me`

---

## 4. Core Data Mapping

## 4.1 Users

| API Field | Entity Field | DB Field | Notes |
| --- | --- | --- | --- |
| `id` | `User.id` | `id` | UUID |
| `username` | `User.username` | `username` | case-insensitive unique |
| `role` | `User.role` | `role` | `ADMIN` / `OPERATOR` |
| `status` | `User.status` | `status` | `ACTIVE` / `INACTIVE` |

## 4.2 Auth Sessions

| API/Token Field | Entity Field | DB Field | Notes |
| --- | --- | --- | --- |
| `sid` | `AuthSession.id` | `id` | session id |
| `jti` | `AuthSession.tokenJti` | `token_jti` | unique token id |
| `expiresAt` | `AuthSession.expiresAt` | `expires_at` | ISO datetime |
| session status | `AuthSession.status` | `status` | `ACTIVE`, `REVOKED`, `EXPIRED` |

---

## 5. Detailed API Specification

## 5.1 POST `/auth/login`

### Basic Info

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/auth/login` |
| Description | Authenticate a user and create a new session-backed access token |
| Related Use Case | `UC-AUTH-01` |
| Permission | Public |

### Request Body

| Field | Type | Required | Validation | Description |
| --- | --- | --- | --- | --- |
| `username` | string | Yes | trim, not empty | login username |
| `password` | string | Yes | not empty | plaintext password input |

### Example Request

```json
{
  "username": "admin",
  "password": "StrongPass123"
}
```

### Validation Rules

#### Field-Level

- `username` required
- `password` required
- `username` trimmed before lookup

#### Business Rules

- lookup by username is case-insensitive
- if username does not exist or password is wrong, return the same error category
- only `ACTIVE` users may log in
- each successful login creates a new session

### Success Response

```json
{
  "success": true,
  "data": {
    "token": "<jwt-access-token>",
    "expiresAt": "2026-04-15T12:00:00Z",
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

#### 500 Internal Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Unexpected server error",
    "details": []
  }
}
```

### Side Effects

- create new `auth_sessions` record
- generate JWT
- write audit log `LOGIN`

---

## 5.2 POST `/auth/logout`

### Basic Info

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/auth/logout` |
| Description | Revoke the current session |
| Related Use Case | `UC-AUTH-02` |
| Permission | `ADMIN`, `OPERATOR` |

### Request

- No request body

### Success Response

```json
{
  "success": true,
  "data": {
    "message": "Logged out"
  }
}
```

### Validation / Business Rules

- request must contain valid bearer token
- resolved session must belong to current user
- only `ACTIVE` session is considered valid for successful revoke
- logout only revokes the current session
- frontend may still clear local auth state if backend returns auth-related failure

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized",
    "details": []
  }
}
```

#### 401 Session Expired

```json
{
  "success": false,
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "Session expired",
    "details": []
  }
}
```

#### 401 Session Revoked

```json
{
  "success": false,
  "error": {
    "code": "SESSION_REVOKED",
    "message": "Session revoked",
    "details": []
  }
}
```

### Side Effects

- set session status to `REVOKED`
- set `revokedAt`
- set `revokedReason = USER_LOGOUT`
- write audit log `LOGOUT`

---

## 5.3 GET `/auth/me`

### Basic Info

| Item | Value |
| --- | --- |
| Method | `GET` |
| Path | `/auth/me` |
| Description | Return the current authenticated user and session context |
| Related Use Case | `UC-AUTH-03` |
| Permission | `ADMIN`, `OPERATOR` |

### Request

- No path params
- No query params
- Bearer token required

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
      "expiresAt": "2026-04-15T12:00:00Z"
    }
  }
}
```

### Business Rules

- token must be valid
- session must exist and be `ACTIVE`
- session must not be expired
- user must still be `ACTIVE`
- endpoint only returns the current user/session, not other users or sessions

### Error Responses

| HTTP | Code | Condition |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | missing / malformed / invalid token |
| 401 | `SESSION_EXPIRED` | session expired |
| 401 | `SESSION_REVOKED` | revoked session |
| 403 | `USER_INACTIVE` | user deactivated after login |

### Side Effects

- optionally update `lastSeenAt` for current session

---

## 5.4 Internal Authentication Validation

This is not a public API endpoint but is part of the authentication contract because it governs all protected endpoints.

### Name

Protected Request Session Validation

### Related Use Case

`UC-AUTH-04`

### Responsibility

For every protected request:

1. read `Authorization` header
2. parse bearer token
3. verify signature
4. verify expiry
5. load session by `sid`
6. validate session status = `ACTIVE`
7. validate `token_jti` match
8. load user by `sub`
9. validate user status = `ACTIVE`
10. attach auth context to request

### Failure Mapping

| Condition | HTTP | Code |
| --- | --- | --- |
| Missing auth header | 401 | `UNAUTHORIZED` |
| Malformed token | 401 | `UNAUTHORIZED` |
| Invalid signature | 401 | `UNAUTHORIZED` |
| Expired token/session | 401 | `SESSION_EXPIRED` |
| Revoked session | 401 | `SESSION_REVOKED` |
| User inactive | 403 | `USER_INACTIVE` |

---

## 6. Validation Rules

## 6.1 Field-Level Validation

| API | Field | Rule |
| --- | --- | --- |
| `POST /auth/login` | `username` | required, string, trimmed, not blank |
| `POST /auth/login` | `password` | required, string, not blank |

## 6.2 Cross-Field Validation

| Rule | Description |
| --- | --- |
| session expiry | `expires_at > issued_at` |
| token-session consistency | token `sid` and `jti` must match stored session |
| session ownership | current session must belong to authenticated user |

## 6.3 Business Validation

| Rule | Description |
| --- | --- |
| active login only | only `ACTIVE` user can log in |
| generic credential error | invalid username and invalid password share same response category |
| logout current session only | logout affects current session only |
| active session required | protected requests require active non-expired session |
| active user required | protected requests require active user |

---

## 7. Authorization Rules

| Endpoint | Public | ADMIN | OPERATOR | Access Scope |
| --- | :---: | :---: | :---: | --- |
| `POST /auth/login` | Y | Y | Y | public |
| `POST /auth/logout` | N | Y | Y | current session |
| `GET /auth/me` | N | Y | Y | current session / self only |

Restrictions:

- no endpoint in auth module may expose other users' sessions
- `/auth/me` must only return the current authenticated context
- logout must not revoke another user's session

---

## 8. State Transition Rules

## 8.1 User Status

| Current | Trigger | Next | API Impact |
| --- | --- | --- | --- |
| `ACTIVE` | admin deactivation | `INACTIVE` | future protected requests fail with `USER_INACTIVE` |
| `INACTIVE` | admin activation | `ACTIVE` | login allowed again |

## 8.2 Auth Session Status

| Current | Trigger | Next | Notes |
| --- | --- | --- | --- |
| `ACTIVE` | logout | `REVOKED` | explicit revoke |
| `ACTIVE` | time passes beyond expiry | `EXPIRED` | runtime-invalid even before cleanup |
| `REVOKED` | any protected request | no transition | rejected |
| `EXPIRED` | any protected request | no transition | rejected |

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
| 400 | `VALIDATION_ERROR` | request body invalid |
| 401 | `INVALID_CREDENTIALS` | login credentials invalid |
| 401 | `UNAUTHORIZED` | token missing or invalid |
| 401 | `SESSION_EXPIRED` | session expired |
| 401 | `SESSION_REVOKED` | session revoked |
| 403 | `USER_INACTIVE` | user inactive |
| 500 | `INTERNAL_ERROR` | unexpected server failure |

---

## 10. Pagination, Filtering, Sorting

Authentication module does not require list endpoints in current scope.  
Therefore:

- no pagination
- no filtering
- no sorting

---

## 11. Side Effects

| API | Side Effects |
| --- | --- |
| `POST /auth/login` | create session, sign token, write audit log |
| `POST /auth/logout` | revoke session, write audit log |
| `GET /auth/me` | optional session last-seen update |
| internal auth guard | may mark expired session invalid at runtime; may update session last-seen |

Notifications:

- none defined in requirement/design for authentication

Async jobs:

- optional session expiry cleanup job may mark old `ACTIVE` sessions as `EXPIRED`

Session revocation:

- explicit on logout
- implicit invalidation when expired

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
    "expiresAt": "2026-04-15T12:00:00Z",
    "user": {
      "id": "uuid",
      "username": "admin",
      "role": "ADMIN",
      "status": "ACTIVE"
    }
  }
}
```

## 12.3 Auth Me Response

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
      "expiresAt": "2026-04-15T12:00:00Z"
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

1. No refresh token flow is part of MVP.
2. `GET /auth/me` is required for frontend bootstrap even though it is a supporting endpoint, not a named UC in the original full-system UC list.
3. `details` in error response is always an array for consistency.
4. Session cleanup job is optional and not required for runtime validity checking.
