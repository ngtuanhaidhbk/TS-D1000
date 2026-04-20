# Detail Design Document - Authentication

## 1. Overview

### 1.1 Scope

Tai lieu nay chi bao phu **module Authentication** cua he thong Desktop Meeting Control Application.

### 1.2 In-Scope Use Cases

- **UC-AUTH-01: Login**
- **UC-AUTH-02: Logout**

### 1.3 Objective

Module Authentication phai:

- xac thuc nguoi dung bang `username + password`
- chi cho phep user co trang thai `ACTIVE` dang nhap
- nap dung quyen theo role sau dang nhap
- ho tro logout an toan
- cung cap nen tang xac thuc cho toan bo API con lai

### 1.4 Assumptions

1. Authentication dung **local account**, khong dung SSO/LDAP/OAuth.
2. Backend cap **access token** sau khi login thanh cong.
3. De ho tro logout co hieu luc thuc te, he thong dung **session persistence** thay vi JWT stateless thuan.
4. Moi lan login tao ra mot session moi.
5. Password duoc luu bang **secure password hashing**, khong ma hoa thuan nghich. Session/token phai duoc luu va quan ly an toan. ([OWASP Cheat Sheet Series][1])
6. Requirement hien tai chua yeu cau:
   - forgot password
   - change password self-service
   - MFA
   - account lockout policy
   - concurrent session policy
   - refresh token flow

### 1.5 Technical Authentication Model

De xuat cho MVP:

- **Credential store:** bang `users`
- **Session store:** bang `auth_sessions`
- **Access token:** signed JWT chua `session_id`, `user_id`, `role`
- **Auth check:** moi protected API phai:
  1. verify token signature
  2. kiem tra session con `ACTIVE`
  3. kiem tra user con `ACTIVE`

Cach nay phu hop voi UC logout vi cho phep backend vo hieu hoa session ngay lap tuc, thay vi cho token het han.

---

## 2. Module Breakdown

### 2.1 Authentication Module

**Responsibility**

- login
- logout
- token issuance
- session validation
- current-auth context resolution

**Related Use Cases**

- UC-AUTH-01 Login
- UC-AUTH-02 Logout

### 2.2 Supporting Dependency: Audit Logging

**Responsibility**

- ghi audit cho login/logout success hoac failure theo rule he thong

**Related Use Cases**

- UC-LOG-01 Record Audit Log

---

## 3. Data Model

### 3.1 Enums / Constants

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

AuditResult
- SUCCESS
- FAILED
```

---

### 3.2 Tables

#### 3.2.1 `users`

Bang nay la nguon du lieu account chinh cho authentication.

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| username | varchar(100) | Y | unique, trimmed, case-insensitive unique |
| password_hash | varchar(255) | Y | password hash only |
| role | varchar(20) | Y | enum `UserRole` |
| status | varchar(20) | Y | enum `UserStatus`, default `ACTIVE` |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |
| created_by | uuid | N | FK `users.id` |
| updated_by | uuid | N | FK `users.id` |

**Indexes**

- unique index on `lower(username)`

**Data-level business rules**

- `username` la duy nhat, khong phan biet hoa thuong
- chi user co `status = ACTIVE` moi dang nhap duoc
- `password_hash` khong duoc null
- password khong luu plain text
- role bat buoc thuoc enum

---

#### 3.2.2 `auth_sessions`

Bang session de ho tro logout, token invalidation, expired session handling.

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| user_id | uuid | Y | FK `users.id` |
| token_jti | varchar(100) | Y | unique |
| status | varchar(20) | Y | enum `AuthSessionStatus`, default `ACTIVE` |
| issued_at | datetime | Y |  |
| expires_at | datetime | Y |  |
| revoked_at | datetime | N |  |
| revoked_reason | varchar(100) | N |  |
| last_seen_at | datetime | N |  |
| client_type | varchar(50) | N | e.g. `DESKTOP_APP` |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- unique index on `token_jti`
- index on `(user_id, status)`
- index on `(status, expires_at)`

**Data-level business rules**

- chi session `ACTIVE` moi hop le
- session `REVOKED` hoac `EXPIRED` khong duoc dung cho API
- `expires_at` phai lon hon `issued_at`

---

#### 3.2.3 `audit_logs`

Chi liet ke phan lien quan authentication.

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| actor_user_id | uuid | N | FK `users.id`, null neu login fail truoc khi xac dinh user |
| action | varchar(50) | Y | `LOGIN` / `LOGOUT` |
| target_type | varchar(50) | Y | `AUTH_SESSION` / `USER` |
| target_id | varchar(100) | N | session id hoac user id |
| result | varchar(20) | Y | `SUCCESS` / `FAILED` |
| detail_json | json/text | N | request metadata, reason |
| created_at | datetime | Y |  |

**Indexes**

- index on `(action, created_at desc)`
- index on `(actor_user_id, created_at desc)`

---

### 3.3 Relationships

- `users (1) -> (N) auth_sessions`
- `users (1) -> (N) audit_logs`

---

## 4. API Design

### 4.1 API Conventions

**Base URL**

```http
/api/v1
```

**Protected Header**

```http
Authorization: Bearer <access_token>
```

**Success Format**

```json
{
  "success": true,
  "data": {}
}
```

**Error Format**

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

### 4.2 UC-AUTH-01 -> Login API

#### POST `/auth/login`

**Purpose**  
Xac thuc user va tao session moi.

**Permission**  
Public

#### Request Body

```json
{
  "username": "admin",
  "password": "StrongPass123"
}
```

#### Request Validation

| Field | Rule |
| --- | --- |
| username | required, string, trim, not empty |
| password | required, string, not empty |

#### Success Response

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

#### Error Cases

| HTTP | Code | Condition |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | missing username/password |
| 401 | INVALID_CREDENTIALS | username khong ton tai hoac password sai |
| 403 | USER_INACTIVE | user ton tai nhung status = INACTIVE |
| 500 | INTERNAL_ERROR | loi he thong |

#### Notes

- Khong phan biet loi "username sai" va "password sai" o response de tranh lo thong tin account.
- `expiresAt` phan anh thoi diem het han session/token.

---

### 4.3 UC-AUTH-02 -> Logout API

#### POST `/auth/logout`

**Purpose**  
Ket thuc session hien tai.

**Permission**  
Authenticated (`ADMIN`, `OPERATOR`)

#### Request Body

Empty

#### Success Response

```json
{
  "success": true,
  "data": {
    "message": "Logged out"
  }
}
```

#### Error Cases

| HTTP | Code | Condition |
| --- | --- | --- |
| 401 | UNAUTHORIZED | thieu token / token invalid |
| 401 | SESSION_EXPIRED | session da het han |
| 401 | SESSION_REVOKED | session da bi revoke |
| 500 | INTERNAL_ERROR | loi he thong |

#### Notes

- API logout phai idempotent o muc UX.
- Neu token hop le nhung session da `REVOKED/EXPIRED`, backend co the tra `401`, frontend van phai clear local auth state.

---

### 4.4 Optional Support API for Frontend Guard

API nay khong phai UC rieng, nhung can cho frontend bootstrap va auth guard.

#### GET `/auth/me`

**Purpose**  
Tra thong tin user hien tai tu token/session dang active.

**Permission**  
Authenticated

#### Success Response

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

#### Error Cases

| HTTP | Code | Condition |
| --- | --- | --- |
| 401 | UNAUTHORIZED | token invalid / missing |
| 401 | SESSION_EXPIRED | session invalid |
| 403 | USER_INACTIVE | user bi deactivate sau khi login |

---

## 5. Business Logic (Service Layer)

### 5.1 UC-AUTH-01 Login

#### Service

`AuthService.login(username, password)`

#### Step-by-step Logic

1. Validate request payload:
   - `username` required
   - `password` required
2. Normalize `username`:
   - trim khoang trang dau/cuoi
   - dung lookup case-insensitive
3. Query user by `lower(username)`.
4. Neu khong tim thay user:
   - ghi audit `LOGIN FAILED`
   - tra `401 INVALID_CREDENTIALS`
5. Neu user ton tai nhung `status != ACTIVE`:
   - ghi audit `LOGIN FAILED`
   - tra `403 USER_INACTIVE`
6. Verify password voi `password_hash`.
7. Neu password sai:
   - ghi audit `LOGIN FAILED`
   - tra `401 INVALID_CREDENTIALS`
8. Tao `auth_sessions` record:
   - `user_id`
   - `token_jti`
   - `status = ACTIVE`
   - `issued_at`
   - `expires_at`
9. Sinh signed JWT chua toi thieu:
   - `sub = user.id`
   - `sid = auth_session.id`
   - `jti = token_jti`
   - `role = user.role`
   - `exp`
10. Ghi audit `LOGIN SUCCESS`.
11. Tra token + user info.

#### Database Operations

- `SELECT` from `users`
- `INSERT` into `auth_sessions`
- `INSERT` into `audit_logs`

#### Side Effects

- tao session moi
- ghi audit log

#### Edge Case Handling

- User bi inactive: khong login
- DB fail khi tao session: login fail toan bo
- Audit log fail:
  - neu audit fail do loi nhe, co the ghi system log va van cho login thanh cong
  - khong rollback session vi audit khong phai giao dich nghiep vu chinh

---

### 5.2 UC-AUTH-02 Logout

#### Service

`AuthService.logout(currentSessionId, currentUserId)`

#### Step-by-step Logic

1. Resolve current auth context tu token:
   - `user_id`
   - `session_id`
2. Load session by `session_id`.
3. Neu session khong ton tai / khong active:
   - tra `401`
4. Update session:
   - `status = REVOKED`
   - `revoked_at = now()`
   - `revoked_reason = 'USER_LOGOUT'`
5. Ghi audit `LOGOUT SUCCESS`.
6. Tra success.

#### Database Operations

- `SELECT` from `auth_sessions`
- `UPDATE` `auth_sessions`
- `INSERT` into `audit_logs`

#### Side Effects

- invalidate current session

#### Edge Case Handling

- session da revoke truoc do:
  - backend co the tra `401`
  - frontend van clear token local
- token valid nhung user bi inactive sau do:
  - van cho logout best-effort neu session con ton tai
  - neu middleware chan tu dau thi frontend chi can clear local state

---

### 5.3 Auth Guard / Middleware Logic

#### Service

`AuthGuard.validateRequest(token)`

#### Step-by-step Logic

1. Kiem tra header `Authorization`.
2. Parse Bearer token.
3. Verify signature va `exp`.
4. Extract:
   - `sub`
   - `sid`
   - `jti`
   - `role`
5. Load `auth_sessions` by `sid`.
6. Validate:
   - session exists
   - session.status = ACTIVE
   - `expires_at > now()`
   - `token_jti` match
7. Load user by `sub`.
8. Validate:
   - user exists
   - user.status = ACTIVE
9. Attach auth context vao request:
   - `userId`
   - `role`
   - `sessionId`
10. Cho phep request di tiep.

#### Failure Conditions

- token thieu / malformed -> `401 UNAUTHORIZED`
- token signature invalid -> `401 UNAUTHORIZED`
- token expired -> `401 SESSION_EXPIRED`
- session revoked -> `401 SESSION_REVOKED`
- user inactive -> `403 USER_INACTIVE`

---

## 6. State & Status Transitions

### 6.1 User Status

```text
ACTIVE <-> INACTIVE
```

#### Rules for Authentication

- `ACTIVE`: duoc phep login
- `INACTIVE`: khong duoc phep login
- neu user bi doi sang `INACTIVE` sau khi da login:
  - request protected tiep theo phai bi chan boi auth guard

#### Invalid Transition

Khong co invalid transition o muc data vi day la enum 2 chieu, nhung business rule nam o API authorization.

---

### 6.2 Auth Session Status

```text
ACTIVE -> REVOKED
ACTIVE -> EXPIRED
```

#### Valid Transitions

- `ACTIVE -> REVOKED`
  - khi user logout
  - hoac khi session bi admin/system revoke trong tuong lai
- `ACTIVE -> EXPIRED`
  - khi qua `expires_at`

#### Invalid Transitions

- `REVOKED -> ACTIVE`
- `EXPIRED -> ACTIVE`

#### Rules

- chi session `ACTIVE` moi duoc dung de goi protected API
- `REVOKED` va `EXPIRED` deu bi tu choi nhu unauthorized
- logout chi ap dung len session hien tai

---

## 7. Validation Rules

### 7.1 Field-level Validation

#### Login Request

| Field | Rule |
| --- | --- |
| username | required, string, trimmed, not blank |
| password | required, string, not blank |

#### Session

| Field | Rule |
| --- | --- |
| user_id | required |
| token_jti | required, unique |
| issued_at | required |
| expires_at | required |
| status | enum `ACTIVE/REVOKED/EXPIRED` |

---

### 7.2 Cross-field Validation

| Rule | Description |
| --- | --- |
| session expiry | `expires_at > issued_at` |
| session ownership | `auth_sessions.user_id` must reference existing user |
| token-session consistency | token `sid` and `jti` must match DB session record |

---

### 7.3 Business Validation

| Rule | Description |
| --- | --- |
| login active only | chi user `ACTIVE` moi login duoc |
| generic credential error | khong phan biet username/password sai trong response |
| logout active session only | chi session `ACTIVE` moi logout thanh cong |
| protected APIs require active user | user bi inactive thi moi protected API bi chan |

---

### 7.4 Uniqueness Constraints

- `users.lower(username)` unique
- `auth_sessions.token_jti` unique

---

### 7.5 Date Rules

- `expires_at` phai lon hon `issued_at`
- logout ghi `revoked_at = now()`
- session qua han phai duoc coi la invalid du chua co batch update sang `EXPIRED`

---

## 8. Authorization Rules

### 8.1 Roles

- `ADMIN`
- `OPERATOR`

### 8.2 Role Access for Authentication APIs

| API | Public | ADMIN | OPERATOR |
| --- | :---: | :---: | :---: |
| POST `/auth/login` | Y | Y | Y |
| POST `/auth/logout` | N | Y | Y |
| GET `/auth/me` | N | Y | Y |

### 8.3 Data Access Restrictions

- user chi duoc lay auth context cua chinh session hien tai qua `/auth/me`
- logout chi revoke session hien tai
- authentication module khong cho user doc danh sach user khac

---

## 9. Background Jobs / Automation

### 9.1 Session Expiry Cleanup Job

**Applicability:** Co the ap dung cho MVP

#### Purpose

Don session qua han de DB sach va ho tro reporting.

#### Suggested Schedule

- moi 5 hoac 10 phut

#### Logic

1. Query `auth_sessions` where:
   - `status = ACTIVE`
   - `expires_at <= now()`
2. Update status -> `EXPIRED`
3. Ghi system log tong hop

#### Notes

- Auth guard van phai check `expires_at` realtime
- job nay chi la cleanup/sync trang thai, khong thay the validation runtime

### 9.2 No Other Automation In Scope

Khong co:

- auto-unlock user
- forgot password mail flow
- MFA enrollment

vi chua co trong requirement

---

## 10. Logging & Audit

### 10.1 Actions Must Be Logged

| Action | Trigger | Log Type |
| --- | --- | --- |
| LOGIN success | login thanh cong | audit |
| LOGIN failed | username/password sai hoac inactive | audit |
| LOGOUT success | logout thanh cong | audit |
| session expiry cleanup | background job doi trang thai | system log |

### 10.2 Audit Log Payload Structure

#### Login Success

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

#### Login Failed

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

#### Logout Success

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

### 10.3 Trigger Timing

- login success: sau khi session insert thanh cong
- login failed: ngay khi xac dinh failure
- logout success: sau khi session update thanh cong
- cleanup expiry: sau batch update

---

## 11. Error Handling

### 11.1 Error Types

#### Validation Errors

- thieu username/password
- field rong sau trim

**HTTP:** `400 Bad Request`

#### Authentication Errors

- credential sai
- token invalid
- token missing
- session expired
- session revoked

**HTTP:** `401 Unauthorized`

#### Authorization Errors

- user inactive
- role khong hop le cho endpoint

**HTTP:** `403 Forbidden`

#### Not Found

Authentication module hien tai khong can tra 404 cho login/logout public path.

#### System Errors

- DB connection failure
- token signing failure
- unexpected exception

**HTTP:** `500 Internal Server Error`

---

### 11.2 Standard Error Response

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

### 11.3 Error Code Catalog

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | request body invalid |
| 401 | INVALID_CREDENTIALS | username/password sai |
| 401 | UNAUTHORIZED | token thieu hoac khong hop le |
| 401 | SESSION_EXPIRED | session/token het han |
| 401 | SESSION_REVOKED | session da bi revoke |
| 403 | USER_INACTIVE | user khong active |
| 500 | INTERNAL_ERROR | loi he thong |

---

## 12. Traceability: UC -> API -> Logic

| UC | API | Service Logic |
| --- | --- | --- |
| UC-AUTH-01 Login | `POST /auth/login` | `AuthService.login` |
| UC-AUTH-02 Logout | `POST /auth/logout` | `AuthService.logout` |

**Supportive internal logic**

- Protected request validation -> `AuthGuard.validateRequest`
- Session cleanup -> `AuthSessionCleanupJob`

---

## 13. Recommended Backend Structure

```text
src/
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.guard.ts
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
    middleware/
    guards/
    constants/
```

---

## 14. Developer Notes

### 14.1 Token Payload

JWT toi thieu nen chua:

```json
{
  "sub": "user-uuid",
  "sid": "session-uuid",
  "jti": "token-jti",
  "role": "ADMIN",
  "exp": 1713182400
}
```

### 14.2 Password Handling

Password phai dung secure password hashing; password khong nen luu bang reversible encryption. Session identifiers cung can duoc luu va quan ly an toan. ([OWASP Cheat Sheet Series][1])

### 14.3 Session Timeout

Timeout cu the chua co trong requirement.  
Vi vay:

- dua vao config ky thuat, khong hard-code business rule trong tai lieu nay
- vi du trien khai co the dung `ACCESS_TOKEN_TTL_MINUTES`

---

## 15. Out of Scope

Khong thiet ke trong tai lieu Authentication nay:

- forgot password
- reset password
- change password
- MFA
- admin force logout all sessions
- device binding
- captcha
- brute-force throttling policy

Neu ban muon, minh co the lam tiep ban **Detail Design cho User Management** theo dung format nay de ghep thanh bo design hoan chinh.

[1]: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html?utm_source=chatgpt.com "Password Storage - OWASP Cheat Sheet Series"
