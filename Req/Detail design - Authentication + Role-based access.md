# Detail Design Document — Authentication + Role-Based Access

## 1. Overview

### 1.1 Scope

Tài liệu này chỉ bao phủ **Authentication** và **Role-Based Access** cho hệ thống desktop điều khiển phòng họp.

### 1.2 In-Scope Use Cases

* **UC-AUTH-01**: Login
* **UC-AUTH-02**: Logout
* **UC-AUTH-03**: Get Current Authenticated User
* **UC-AUTHZ-01**: Authorize Access to Protected Resource
* **UC-AUTHZ-02**: Restrict Access by Role
* **UC-AUTHZ-03**: Handle Session Expired or Invalid Session

### 1.3 Objective

Module này phải:

* xác thực user bằng `username + password`
* chỉ cho phép user `ACTIVE` đăng nhập
* nạp đúng `role` sau đăng nhập
* chặn truy cập trái quyền ở cả **UI** và **backend**
* vô hiệu hóa phiên hiện tại khi logout
* hỗ trợ auth guard cho toàn bộ API protected

### 1.4 External technical context

TS-D1000 có giao diện cấu hình qua trình duyệt và TOA cũng nêu khả năng xây dựng phần mềm vận hành tùy biến cho hệ thống này, nên mô hình desktop app + local backend + auth nội bộ là phù hợp với bối cảnh sản phẩm của bạn. Về bảo mật, password nên được lưu bằng **secure password hashing**, không dùng mã hóa thuận nghịch. ([toa-products.com][1])

### 1.5 Assumptions

Các điểm sau chưa được mô tả chi tiết trong Requirement/UC, nên được ghi rõ là giả định kỹ thuật:

1. Authentication dùng **local account**, không dùng SSO/LDAP/OAuth.
2. Có 2 role:

   * `ADMIN`
   * `OPERATOR`
3. Backend cấp **access token** sau login.
4. Để logout có hiệu lực ngay, hệ thống dùng **session persistence** thay vì JWT stateless thuần.
5. Mỗi login tạo một session mới.
6. Chưa bao gồm:

   * forgot password
   * reset password
   * change password
   * MFA
   * brute-force policy
   * concurrent session policy
7. Frontend phải gọi auth bootstrap API sau login hoặc khi app reload.

---

## 2. Module Breakdown

| Module            | Responsibility                               | Related UC               |
| ----------------- | -------------------------------------------- | ------------------------ |
| Authentication    | Login, logout, issue token, validate session | UC-AUTH-01, UC-AUTH-02   |
| Auth Context      | Resolve current authenticated user/session   | UC-AUTH-03               |
| Authorization     | Auth guard + role guard cho protected API    | UC-AUTHZ-01, UC-AUTHZ-02 |
| Session Lifecycle | Session expiry / invalid session handling    | UC-AUTHZ-03              |
| Audit Logging     | Ghi audit cho login/logout/auth failure      | hỗ trợ cho toàn module   |

---

## 3. Data Model

## 3.1 Enums / Constants

```text
UserRole
- ADMIN
- OPERATOR

UserStatus
- ACTIVE
- INACTIVE

AuthSessionStatus
- ACTIVE
- REVOKED
- EXPIRED

AuditAction
- LOGIN
- LOGOUT
- AUTH_CHECK_FAILED
- ACCESS_DENIED

AuditResult
- SUCCESS
- FAILED
```

---

## 3.2 Tables

## 3.2.1 `users`

| Field         | Type         | Required | Constraints                              |
| ------------- | ------------ | -------: | ---------------------------------------- |
| id            | uuid         |        Y | PK                                       |
| username      | varchar(100) |        Y | unique, trimmed, case-insensitive unique |
| password_hash | varchar(255) |        Y | hashed only                              |
| role          | varchar(20)  |        Y | enum `UserRole`                          |
| status        | varchar(20)  |        Y | enum `UserStatus`, default `ACTIVE`      |
| created_at    | datetime     |        Y |                                          |
| updated_at    | datetime     |        Y |                                          |
| created_by    | uuid         |        N | FK `users.id`                            |
| updated_by    | uuid         |        N | FK `users.id`                            |

**Indexes**

* unique index on `lower(username)`

**Data rules**

* `username` phải unique, không phân biệt hoa thường
* `password_hash` không được null
* chỉ user `ACTIVE` mới đăng nhập được

---

## 3.2.2 `auth_sessions`

| Field          | Type         | Required | Constraints                                |
| -------------- | ------------ | -------: | ------------------------------------------ |
| id             | uuid         |        Y | PK                                         |
| user_id        | uuid         |        Y | FK `users.id`                              |
| token_jti      | varchar(100) |        Y | unique                                     |
| status         | varchar(20)  |        Y | enum `AuthSessionStatus`, default `ACTIVE` |
| issued_at      | datetime     |        Y |                                            |
| expires_at     | datetime     |        Y | must be > `issued_at`                      |
| revoked_at     | datetime     |        N |                                            |
| revoked_reason | varchar(100) |        N |                                            |
| last_seen_at   | datetime     |        N |                                            |
| client_type    | varchar(50)  |        N | default `DESKTOP_APP`                      |
| created_at     | datetime     |        Y |                                            |
| updated_at     | datetime     |        Y |                                            |

**Indexes**

* unique index on `token_jti`
* index on `(user_id, status)`
* index on `(status, expires_at)`

**Data rules**

* chỉ session `ACTIVE` mới hợp lệ
* `REVOKED` và `EXPIRED` không được dùng để gọi API
* logout chỉ revoke session hiện tại

---

## 3.2.3 `audit_logs`

| Field         | Type         | Required | Constraints                                                |
| ------------- | ------------ | -------: | ---------------------------------------------------------- |
| id            | uuid         |        Y | PK                                                         |
| actor_user_id | uuid         |        N | FK `users.id`, null nếu login fail trước khi xác định user |
| action        | varchar(50)  |        Y | enum-like                                                  |
| target_type   | varchar(50)  |        Y | `USER` / `AUTH_SESSION` / `RESOURCE`                       |
| target_id     | varchar(100) |        N |                                                            |
| result        | varchar(20)  |        Y | `SUCCESS` / `FAILED`                                       |
| detail_json   | json/text    |        N |                                                            |
| created_at    | datetime     |        Y |                                                            |

**Indexes**

* index on `(action, created_at desc)`
* index on `(actor_user_id, created_at desc)`

---

## 3.3 Relationships

* `users (1) -> (N) auth_sessions`
* `users (1) -> (N) audit_logs`

---

## 4. API Design

## 4.1 API Conventions

**Base URL**

```http
/api/v1
```

**Protected Header**

```http
Authorization: Bearer <access_token>
```

**Success Response**

```json
{
  "success": true,
  "data": {}
}
```

**Error Response**

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

---

## 4.2 Authentication APIs

### POST `/auth/login`

**Use Case:** UC-AUTH-01  
**Permission:** Public

**Request**

```json
{
  "username": "admin",
  "password": "StrongPass123"
}
```

**Validation**

* `username`: required, string, trimmed, not empty
* `password`: required, string, not empty

**Success Response**

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

**Errors**

| HTTP | Code                | Condition                                |
| ---- | ------------------- | ---------------------------------------- |
| 400  | VALIDATION_ERROR    | missing/blank field                      |
| 401  | INVALID_CREDENTIALS | username không tồn tại hoặc password sai |
| 403  | USER_INACTIVE       | user tồn tại nhưng inactive              |
| 500  | INTERNAL_ERROR      | lỗi hệ thống                             |

**Permission rule**

* Public API

---

### POST `/auth/logout`

**Use Case:** UC-AUTH-02  
**Permission:** Authenticated (`ADMIN`, `OPERATOR`)

**Request**

```json
{}
```

**Success Response**

```json
{
  "success": true,
  "data": {
    "message": "Logged out"
  }
}
```

**Errors**

| HTTP | Code            | Condition            |
| ---- | --------------- | -------------------- |
| 401  | UNAUTHORIZED    | token thiếu hoặc sai |
| 401  | SESSION_EXPIRED | session hết hạn      |
| 401  | SESSION_REVOKED | session đã revoke    |
| 500  | INTERNAL_ERROR  | lỗi hệ thống         |

---

### GET `/auth/me`

**Use Case:** UC-AUTH-03  
**Permission:** Authenticated (`ADMIN`, `OPERATOR`)

**Success Response**

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

**Errors**

| HTTP | Code            | Condition               |
| ---- | --------------- | ----------------------- |
| 401  | UNAUTHORIZED    | token invalid / missing |
| 401  | SESSION_EXPIRED | session invalid         |
| 403  | USER_INACTIVE   | user bị deactivate      |

---

## 4.3 Authorization / Role-Based Access

### Internal Guard: Auth Guard

**Use Case:** UC-AUTHZ-01  
**Applied to:** mọi protected API

**Checks**

1. Authorization header exists
2. Token signature valid
3. Token not expired
4. Session exists and `ACTIVE`
5. User exists and `ACTIVE`

**Failure**

* `401 UNAUTHORIZED`
* `401 SESSION_EXPIRED`
* `401 SESSION_REVOKED`
* `403 USER_INACTIVE`

---

### Internal Guard: Role Guard

**Use Case:** UC-AUTHZ-02  
**Applied to:** endpoint theo role

**Role matrix for current auth module**

| API                 | ADMIN | OPERATOR |
| ------------------- | :---: | :------: |
| POST `/auth/login`  |   Y   |     Y    |
| POST `/auth/logout` |   Y   |     Y    |
| GET `/auth/me`      |   Y   |     Y    |

**Supportive behavior for whole app**

* `ADMIN`: full access
* `OPERATOR`: limited access theo module khác
* Backend luôn là điểm kiểm tra cuối cùng, không phụ thuộc UI

---

## 5. Business Logic (Service Layer)

## 5.1 UC-AUTH-01 — Login

### Service

`AuthService.login(username, password)`

### Logic

1. Validate payload.
2. Normalize `username`:

   * trim spaces
   * case-insensitive lookup
3. Query `users` by `lower(username)`.
4. If user not found:

   * write audit `LOGIN FAILED`
   * return `401 INVALID_CREDENTIALS`
5. If `user.status != ACTIVE`:

   * write audit `LOGIN FAILED`
   * return `403 USER_INACTIVE`
6. Verify `password` against `password_hash`.
7. If password mismatch:

   * write audit `LOGIN FAILED`
   * return `401 INVALID_CREDENTIALS`
8. Create `auth_sessions` row:

   * `user_id`
   * `token_jti`
   * `status = ACTIVE`
   * `issued_at`
   * `expires_at`
9. Sign access token containing:

   * `sub = user.id`
   * `sid = session.id`
   * `jti = token_jti`
   * `role = user.role`
   * `exp`
10. Write audit `LOGIN SUCCESS`.
11. Return token + user info.

### DB Operations

* `SELECT users`
* `INSERT auth_sessions`
* `INSERT audit_logs`

### Side Effects

* create session
* create audit log

### Edge Cases

* DB fail while creating session → fail login
* audit log fail → write system log, do not rollback successful login
* username with leading/trailing spaces → still support after trim

---

## 5.2 UC-AUTH-02 — Logout

### Service

`AuthService.logout(currentSessionId, currentUserId)`

### Logic

1. Resolve auth context from token.
2. Load current session.
3. If session not found or not active:

   * return `401`
4. Update session:

   * `status = REVOKED`
   * `revoked_at = now()`
   * `revoked_reason = 'USER_LOGOUT'`
5. Write audit `LOGOUT SUCCESS`.
6. Return success.

### DB Operations

* `SELECT auth_sessions`
* `UPDATE auth_sessions`
* `INSERT audit_logs`

### Side Effects

* invalidate current session only

### Edge Cases

* session already revoked/expired → return `401`
* frontend should still clear local auth state

---

## 5.3 UC-AUTH-03 — Get Current Authenticated User

### Service

`AuthService.getCurrentUser(authContext)`

### Logic

1. Auth guard validates token/session/user.
2. Load current user and session.
3. Return:

   * user id
   * username
   * role
   * status
   * session expiry
4. Optionally update `last_seen_at`.

### DB Operations

* `SELECT users`
* `SELECT auth_sessions`
* optional `UPDATE auth_sessions.last_seen_at`

### Edge Cases

* session valid but user inactive → `403 USER_INACTIVE`
* session expired → `401 SESSION_EXPIRED`

---

## 5.4 UC-AUTHZ-01 — Authorize Access to Protected Resource

### Service

`AuthGuard.validateRequest(token)`

### Logic

1. Check `Authorization` header.
2. Parse Bearer token.
3. Verify signature and expiry.
4. Extract:

   * `sub`
   * `sid`
   * `jti`
   * `role`
5. Load `auth_sessions` by `sid`.
6. Validate:

   * exists
   * `status = ACTIVE`
   * `expires_at > now()`
   * `token_jti` matches
7. Load `users` by `sub`.
8. Validate:

   * exists
   * `status = ACTIVE`
9. Attach auth context to request:

   * `userId`
   * `role`
   * `sessionId`
10. Allow request to continue.

### Failure Cases

* missing token → `401 UNAUTHORIZED`
* invalid signature → `401 UNAUTHORIZED`
* expired token/session → `401 SESSION_EXPIRED`
* revoked session → `401 SESSION_REVOKED`
* inactive user → `403 USER_INACTIVE`

---

## 5.5 UC-AUTHZ-02 — Restrict Access by Role

### Service

`RoleGuard.checkAccess(requiredRoles, authContext)`

### Logic

1. Ensure auth context exists.
2. Read `role` from auth context.
3. Compare with endpoint allowed roles.
4. If allowed → continue.
5. If denied:

   * write audit `ACCESS_DENIED` if required by policy
   * return `403 FORBIDDEN`

### Rules

* backend role check is mandatory
* UI hide/disable is supportive only

---

## 5.6 UC-AUTHZ-03 — Handle Session Expired or Invalid Session

### Service

`AuthErrorHandler.handleAuthFailure(error)`

### Backend Logic

1. Detect invalid/expired/revoked session at guard layer.
2. Return standard `401` or `403`.

### Frontend Expected Behavior

1. Clear local auth state.
2. Redirect to login.
3. Show:

   * `Session expired. Please login again.`

---

## 6. State & Status Transitions

## 6.1 User Status

```text
ACTIVE <-> INACTIVE
```

### Authentication Rules

* `ACTIVE`: can login
* `INACTIVE`: cannot login
* If user becomes `INACTIVE` after login:

  * next protected request must be denied

---

## 6.2 Auth Session Status

```text
ACTIVE -> REVOKED
ACTIVE -> EXPIRED
```

### Valid Transitions

* `ACTIVE -> REVOKED`: logout
* `ACTIVE -> EXPIRED`: timeout / cleanup

### Invalid Transitions

* `REVOKED -> ACTIVE`
* `EXPIRED -> ACTIVE`

### Rules

* only `ACTIVE` sessions are accepted
* logout only affects current session

---

## 7. Validation Rules

## 7.1 Field-Level Validation

### Login Request

| Field    | Rule                                 |
| -------- | ------------------------------------ |
| username | required, string, trimmed, non-empty |
| password | required, string, non-empty          |

### User

| Field         | Rule                           |
| ------------- | ------------------------------ |
| username      | required, unique, <=100 chars  |
| password_hash | required                       |
| role          | must be `ADMIN` or `OPERATOR`  |
| status        | must be `ACTIVE` or `INACTIVE` |

### Auth Session

| Field      | Rule             |
| ---------- | ---------------- |
| user_id    | required         |
| token_jti  | required, unique |
| status     | enum             |
| issued_at  | required         |
| expires_at | required         |

---

## 7.2 Cross-Field Validation

| Rule                      | Description                                 |
| ------------------------- | ------------------------------------------- |
| session expiry            | `expires_at > issued_at`                    |
| token/session consistency | token `sid` and `jti` must match DB         |
| session ownership         | `auth_sessions.user_id` must exist in users |

---

## 7.3 Business Validation

| Rule                       | Description                                         |
| -------------------------- | --------------------------------------------------- |
| login active only          | only ACTIVE users can login                         |
| generic login error        | do not reveal whether username or password is wrong |
| logout active session only | only ACTIVE session can be revoked                  |
| protected resource rule    | every protected API must pass auth guard            |
| role restriction           | protected role-based API must pass role guard       |

---

## 7.4 Uniqueness Constraints

* `lower(users.username)` unique
* `auth_sessions.token_jti` unique

---

## 7.5 Date Rules

* `expires_at > issued_at`
* `revoked_at` only set when session revoked
* expired session is invalid even before cleanup job updates its status

---

## 8. Authorization Rules

## 8.1 Roles

* `ADMIN`
* `OPERATOR`

## 8.2 Access Rules

### Authentication Module

| Endpoint            | ADMIN | OPERATOR | Public |
| ------------------- | :---: | :------: | :----: |
| POST `/auth/login`  |   Y   |     Y    |    Y   |
| POST `/auth/logout` |   Y   |     Y    |    N   |
| GET `/auth/me`      |   Y   |     Y    |    N   |

### Whole Application Rule

* `ADMIN`: full application access
* `OPERATOR`: only non-admin modules/features
* direct URL access by operator to admin page must still be blocked by backend

## 8.3 Data Access Restrictions

* user can only resolve current auth context via `/auth/me`
* logout only revokes current session
* auth module does not expose other users’ credentials or sessions

---

## 9. Background Jobs / Automation

## 9.1 Session Expiry Cleanup Job

**Purpose**

* mark overdue active sessions as `EXPIRED`

**Schedule**

* every 5–10 minutes

**Logic**

1. Find `auth_sessions` where:

   * `status = ACTIVE`
   * `expires_at <= now()`
2. Update status to `EXPIRED`
3. Write system log summary

**Note**

* runtime auth guard must still enforce expiry immediately
* cleanup job is synchronization/maintenance only

## 9.2 No Other Automation In Scope

Not included:

* forgot password mail flow
* MFA enrollment
* brute-force lockout
* force logout all sessions

---

## 10. Logging & Audit

## 10.1 Actions to Log

| Action            | When                                   | Type                  |
| ----------------- | -------------------------------------- | --------------------- |
| LOGIN success     | login successful                       | audit                 |
| LOGIN failed      | invalid credentials / inactive user    | audit                 |
| LOGOUT success    | logout successful                      | audit                 |
| AUTH_CHECK_FAILED | invalid token/session on protected API | optional audit/system |
| ACCESS_DENIED     | role denied                            | optional audit        |

## 10.2 Audit Log Examples

### Login Success

```json
{
  "actorUserId": "8dbd2d15-9ef8-4c3f-b279-49d52a2f3d18",
  "action": "LOGIN",
  "targetType": "AUTH_SESSION",
  "targetId": "0e0c42dd-8b8e-4734-a9ee-0d94081d6b2d",
  "result": "SUCCESS",
  "detailJson": {
    "username": "admin"
  }
}
```

### Login Failed

```json
{
  "actorUserId": null,
  "action": "LOGIN",
  "targetType": "USER",
  "targetId": null,
  "result": "FAILED",
  "detailJson": {
    "username": "admin",
    "reason": "INVALID_CREDENTIALS"
  }
}
```

### Logout Success

```json
{
  "actorUserId": "8dbd2d15-9ef8-4c3f-b279-49d52a2f3d18",
  "action": "LOGOUT",
  "targetType": "AUTH_SESSION",
  "targetId": "0e0c42dd-8b8e-4734-a9ee-0d94081d6b2d",
  "result": "SUCCESS",
  "detailJson": {
    "reason": "USER_LOGOUT"
  }
}
```

---

## 11. Error Handling

## 11.1 Error Types

### Validation Errors

* missing username/password
* blank string after trim

**HTTP:** `400 Bad Request`

### Authentication Errors

* invalid credentials
* missing token
* invalid token
* expired session
* revoked session

**HTTP:** `401 Unauthorized`

### Authorization Errors

* inactive user
* forbidden role

**HTTP:** `403 Forbidden`

### System Errors

* DB failure
* token signing failure
* unexpected exception

**HTTP:** `500 Internal Server Error`

---

## 11.2 Standard Error Response

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

## 11.3 Error Code Catalog

| HTTP | Code                | Meaning                   |
| ---- | ------------------- | ------------------------- |
| 400  | VALIDATION_ERROR    | invalid request body      |
| 401  | INVALID_CREDENTIALS | username/password wrong   |
| 401  | UNAUTHORIZED        | token missing/invalid     |
| 401  | SESSION_EXPIRED     | session expired           |
| 401  | SESSION_REVOKED     | session revoked           |
| 403  | USER_INACTIVE       | user not active           |
| 403  | FORBIDDEN           | role denied               |
| 500  | INTERNAL_ERROR      | unexpected system failure |

---

## 12. Traceability: UC → API → Logic

| UC                                                    | API / Mechanism                    | Service                                        |
| ----------------------------------------------------- | ---------------------------------- | ---------------------------------------------- |
| UC-AUTH-01 Login                                      | `POST /auth/login`                 | `AuthService.login`                            |
| UC-AUTH-02 Logout                                     | `POST /auth/logout`                | `AuthService.logout`                           |
| UC-AUTH-03 Get Current Authenticated User             | `GET /auth/me`                     | `AuthService.getCurrentUser`                   |
| UC-AUTHZ-01 Authorize Access to Protected Resource    | internal auth guard                | `AuthGuard.validateRequest`                    |
| UC-AUTHZ-02 Restrict Access by Role                   | internal role guard                | `RoleGuard.checkAccess`                        |
| UC-AUTHZ-03 Handle Session Expired or Invalid Session | guard + frontend redirect handling | `AuthErrorHandler` / frontend auth interceptor |

---

## 13. Recommended Backend Structure

```text
src/
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.guard.ts
      role.guard.ts
      auth.types.ts
      dto/
        login.request.dto.ts
      entities/
        auth-session.entity.ts
      repositories/
        auth-session.repository.ts
      utils/
        password.util.ts
        token.util.ts
    users/
      user.entity.ts
      user.repository.ts
    audit/
      audit-log.service.ts
  common/
    exceptions/
    guards/
    interceptors/
    constants/
```

---

## 14. Developer Notes

### 14.1 Token Payload

```json
{
  "sub": "user-uuid",
  "sid": "session-uuid",
  "jti": "token-jti",
  "role": "ADMIN",
  "exp": 1770000000
}
```

### 14.2 Password Handling

Password phải được lưu bằng secure password hashing; không dùng reversible encryption cho password. Đây là khuyến nghị bảo mật chuẩn và phù hợp cho local-account authentication. ([OWASP Cheat Sheet Series][2])

### 14.3 Session Timeout

Requirement hiện chưa chốt TTL cụ thể.  
Vì vậy TTL nên để ở config kỹ thuật, ví dụ:

```text
ACCESS_TOKEN_TTL_MINUTES
SESSION_IDLE_TIMEOUT_MINUTES
```

---

## 15. Out of Scope

Không thiết kế trong tài liệu này:

* forgot password
* reset password
* change password
* MFA
* captcha
* brute-force throttling policy
* admin force logout all sessions
* device binding

It is for Role-Based access 
