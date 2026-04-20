# Unit Test Input Specification - Role-Based Access

## 1. Test Scope Summary

### 1.1 Scope

Tai lieu nay bao phu `Authentication + Role-Based Access` cho he thong Desktop Meeting Control Application, nhung trong tam la cac hanh vi RBAC:

- auth context bootstrap
- auth guard
- role guard
- protected resource access
- unauthorized / forbidden handling
- session invalid handling
- role-aware UI visibility

### 1.2 Source Documents Used

- Requirement Specification
- `Use cases - Role-based access.md`
- `Detail design - Authentication + Role-based access.md`
- `UI UX design - Role-based access.md`
- `API contract - Role-based access.md`
- `openapi-3.0-role-based-access.yaml`

### 1.3 Objectives

- Xac dinh day du nhung gi can test cho RBAC.
- Bao phu backend auth/role enforcement va frontend role-aware UX.
- Lam nguon dau vao de sinh unit test thuc te sau nay.

### 1.4 Roles In Scope

- `ADMIN`
- `OPERATOR`
- `System`

### 1.5 Features In Scope

- Login role resolution
- Current authenticated user bootstrap
- Protected request authentication validation
- Protected request role validation
- Session expired / revoked handling
- Role-based sidebar visibility
- Direct URL / restricted access handling

---

## 2. Modules / Features To Test

| Module | Feature | Related Requirement / UC | Related API / Mechanism | Related UI |
| --- | --- | --- | --- | --- |
| Authentication | Login and role resolution | UC-AUTH-01 | `POST /auth/login` | Login Page |
| Authentication | Current user bootstrap | UC-AUTH-03 | `GET /auth/me` | Auth bootstrap, app shell |
| Authentication | Logout current session | UC-AUTH-02 | `POST /auth/logout` | Avatar menu, Logout modal |
| Authorization | Auth guard | UC-AUTHZ-01 | Internal `AuthGuard` | ProtectedRoute |
| Authorization | Role guard | UC-AUTHZ-02 | Internal `RoleGuard` | RoleGuard, unauthorized page |
| Session Lifecycle | Invalid/expired session handling | UC-AUTHZ-03 | `AuthGuard`, `/auth/me`, `/auth/logout` | Login redirect, auth message |
| UI RBAC | Sidebar/menu visibility by role | UI/UX RBAC | auth context-driven UI | Main Layout |
| UI RBAC | Restricted action/page behavior | UC-AUTHZ-02 | protected route / future admin-only API pattern | Unauthorized page, hidden menu |

---

## 3. Requirement-to-Test Mapping

| Requirement / Rule | Test Coverage Area |
| --- | --- |
| only ACTIVE users can login | login service, `/auth/login`, current-user validation |
| role must be loaded after login | login response mapping, auth provider bootstrap |
| backend is final authority for role checks | role guard tests, protected endpoint access denial |
| frontend must reflect role in UI | sidebar visibility, hidden admin modules |
| logout only revokes current session | logout service, session repository interaction |
| invalid session must force re-login | `/auth/me` handling, auth provider reset |
| direct URL access by operator to admin page must be blocked | role guard + route guard tests |
| generic credential error must not reveal which field is wrong | login error mapping |
| auth guard must verify token, session, user | auth guard / JWT strategy tests |
| role guard must return 403 for denied role | backend role guard tests, frontend unauthorized behavior |

---

## 4. Backend Unit Test Input Matrix

### 4.1 DTO Validation

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-BE-DTO-001 | Login DTO | UC-AUTH-01 | Accept valid login payload | None | `{ username: "admin", password: "StrongPass123" }` | Validation pipe enabled | Validate DTO | Pass | None | Happy path |
| RBAC-BE-DTO-002 | Login DTO | UC-AUTH-01 | Reject blank username | None | `{ username: "   ", password: "StrongPass123" }` | Validation pipe enabled | Validate DTO | Reject | `VALIDATION_ERROR` | Trim + non-empty |
| RBAC-BE-DTO-003 | Login DTO | UC-AUTH-01 | Reject blank password | None | `{ username: "admin", password: "" }` | Validation pipe enabled | Validate DTO | Reject | `VALIDATION_ERROR` | Required password |
| RBAC-BE-DTO-004 | Login DTO | UC-AUTH-01 | Reject null username/password | None | `{ username: null, password: null }` | Validation pipe enabled | Validate DTO | Reject | `VALIDATION_ERROR` | Null case |

### 4.2 Login Service / Role Resolution

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-BE-SVC-001 | AuthService.login | UC-AUTH-01 | Resolve ADMIN role on successful login | Active admin user exists | `username=admin`, `password=StrongPass123` | Mock user repo active admin, password match true, session insert success, token sign success | Call `login()` | Response includes `role=ADMIN` and active session | None | Role propagation |
| RBAC-BE-SVC-002 | AuthService.login | UC-AUTH-01 | Resolve OPERATOR role on successful login | Active operator user exists | `username=operator1`, `password=Operator123!` | Same with operator fixture | Call `login()` | Response includes `role=OPERATOR` | None | Role propagation |
| RBAC-BE-SVC-003 | AuthService.login | UC-AUTH-01 | Reject inactive user regardless of valid password | User exists, `INACTIVE` | valid username/password | User fixture inactive | Call `login()` | No token, no valid session | `USER_INACTIVE` | Active-only rule |
| RBAC-BE-SVC-004 | AuthService.login | UC-AUTH-01 | Use generic credential error for unknown username | No user found | `username=ghost`, `password=x` | User repo returns null | Call `login()` | Reject | `INVALID_CREDENTIALS` | Security UX |
| RBAC-BE-SVC-005 | AuthService.login | UC-AUTH-01 | Use generic credential error for wrong password | User exists | wrong password | Password service returns false | Call `login()` | Reject | `INVALID_CREDENTIALS` | Same category as unknown user |
| RBAC-BE-SVC-006 | AuthService.login | UC-AUTH-01 | Create session with token claims for RBAC | Active user exists | valid login input | Capture saved session and signed payload | Call `login()` | Session has `tokenJti`, token has `sid`, `jti`, `role` | None | RBAC token basis |

### 4.3 Current Authenticated User

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-BE-SVC-007 | AuthService.getCurrentUser | UC-AUTH-03 | Return current user and role from valid auth context | Valid token/session/user | auth context fixture | Mock active user + active session | Call `getCurrentUser()` | Returns user id, username, role, status, session expiry | None | Bootstrap API |
| RBAC-BE-SVC-008 | AuthService.getCurrentUser | UC-AUTH-03 | Reject inactive user after login | Session valid, user now inactive | auth context fixture | Mock session active, user inactive | Call `getCurrentUser()` | Reject | `USER_INACTIVE` | Post-login deactivation |
| RBAC-BE-SVC-009 | AuthService.getCurrentUser | UC-AUTH-03 | Reject expired session | User active, session expired | auth context fixture | Mock expired session | Call `getCurrentUser()` | Reject | `SESSION_EXPIRED` | Session lifecycle |

### 4.4 Auth Guard

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-BE-GUARD-001 | AuthGuard | UC-AUTHZ-01 | Allow protected request with valid token, session, user | Protected endpoint | valid bearer token | JWT valid, session active, user active | Validate request | Request continues with auth context | None | Happy path |
| RBAC-BE-GUARD-002 | AuthGuard | UC-AUTHZ-01 | Reject missing authorization header | Protected endpoint | no header | No downstream calls expected | Validate request | Request blocked | `UNAUTHORIZED` | Missing token |
| RBAC-BE-GUARD-003 | AuthGuard | UC-AUTHZ-01 | Reject invalid token signature | Protected endpoint | malformed/invalid JWT | JWT verification fails | Validate request | Request blocked | `UNAUTHORIZED` | Invalid token |
| RBAC-BE-GUARD-004 | AuthGuard | UC-AUTHZ-03 | Reject expired token/session | Protected endpoint | expired token or active token with expired DB session | Mock expiry path | Validate request | Request blocked | `SESSION_EXPIRED` | Expiry rule |
| RBAC-BE-GUARD-005 | AuthGuard | UC-AUTHZ-03 | Reject revoked session | Protected endpoint | valid token + revoked session | Session status `REVOKED` | Validate request | Request blocked | `SESSION_REVOKED` | Revoke rule |
| RBAC-BE-GUARD-006 | AuthGuard | UC-AUTHZ-01 | Reject token/session jti mismatch | Protected endpoint | valid token with wrong `jti` | Session exists but `tokenJti` mismatch | Validate request | Request blocked | `UNAUTHORIZED` | Cross-field consistency |
| RBAC-BE-GUARD-007 | AuthGuard | UC-AUTHZ-01 | Reject inactive user even if session active | Protected endpoint | valid token | Session active, user inactive | Validate request | Request blocked | `USER_INACTIVE` | Active-user rule |
| RBAC-BE-GUARD-008 | AuthGuard | UC-AUTHZ-01 | Attach auth context on success | Protected endpoint | valid token | Session + user valid | Validate request | Request gets `userId`, `role`, `sessionId` | None | Auth context contract |

### 4.5 Role Guard

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-BE-GUARD-009 | RoleGuard | UC-AUTHZ-02 | Allow ADMIN on admin-only resource | Auth context exists | `role=ADMIN`, `requiredRoles=[ADMIN]` | Auth context present | Check access | Access granted | None | Happy path |
| RBAC-BE-GUARD-010 | RoleGuard | UC-AUTHZ-02 | Allow OPERATOR on shared resource | Auth context exists | `role=OPERATOR`, `requiredRoles=[ADMIN, OPERATOR]` | Auth context present | Check access | Access granted | None | Shared endpoint |
| RBAC-BE-GUARD-011 | RoleGuard | UC-AUTHZ-02 | Deny OPERATOR on admin-only resource | Auth context exists | `role=OPERATOR`, `requiredRoles=[ADMIN]` | Auth context present | Check access | Request blocked | `FORBIDDEN` | Role denial |
| RBAC-BE-GUARD-012 | RoleGuard | UC-AUTHZ-02 | Deny when auth context missing | No auth context | no role | Missing auth context | Check access | Request blocked | `FORBIDDEN` or auth failure by architecture | Assumption: auth guard should normally run first |

### 4.6 Logout / Session Lifecycle / Side Effects

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-BE-SVC-010 | AuthService.logout | UC-AUTH-02 | Revoke current session only | Active current session exists | `sessionId=current` | Mock current and another session for same user | Call `logout()` | Only current session revoked | None | Current-session rule |
| RBAC-BE-SVC-011 | AuthService.logout | UC-AUTH-02 | Reject already revoked session | Revoked session exists | `sessionId=revoked` | Mock revoked session | Call `logout()` | Reject | `SESSION_REVOKED` | State rule |
| RBAC-BE-SVC-012 | AuthService.logout | UC-AUTH-02 | Reject expired session on logout | Expired session exists | `sessionId=expired` | Mock expired session | Call `logout()` | Reject | `SESSION_EXPIRED` | State rule |
| RBAC-BE-LOG-001 | Audit logging | UC-AUTH-01 | Write LOGIN SUCCESS log | Login success | admin login | Mock audit service | Execute login | Audit action recorded | None | Side effect |
| RBAC-BE-LOG-002 | Audit logging | UC-AUTH-01 | Write LOGIN FAILED log for invalid credentials | Login failure | invalid login | Mock audit service | Execute login | Failed audit recorded | `INVALID_CREDENTIALS` | Side effect |
| RBAC-BE-LOG-003 | Audit logging | UC-AUTH-02 | Write LOGOUT SUCCESS log | Logout success | active session | Mock audit service | Execute logout | Logout audit recorded | None | Side effect |
| RBAC-BE-LOG-004 | Access denied logging | UC-AUTHZ-02 | Optionally record ACCESS_DENIED for role failure | Role denial path | operator to admin API | Mock policy-enabled audit service | Execute role guard | Access denied log written | `FORBIDDEN` | Optional by design |

### 4.7 Session Cleanup Job

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-BE-JOB-001 | Session cleanup | UC-AUTHZ-03 | Mark overdue active sessions as EXPIRED | Sessions exist | `now=2026-04-20T10:00:00Z` | Mock sessions with mixed expiry | Run cleanup job | Overdue active sessions marked `EXPIRED` | None | Maintenance job |
| RBAC-BE-JOB-002 | Session cleanup | UC-AUTHZ-03 | Do not update future sessions | Sessions exist | future-dated expiry | Mock future active sessions | Run cleanup job | No update on future sessions | None | Boundary |

---

## 5. Frontend Unit Test Input Matrix

### 5.1 Login / Auth Bootstrap / Role Context

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-FE-001 | Login Page | UC-AUTH-01 | Submit valid admin login and store role context | User unauthenticated | admin credentials | Mock `/auth/login` success admin | Submit form | Token and user role stored, redirect to app | None | Happy path |
| RBAC-FE-002 | Login Page | UC-AUTH-01 | Submit valid operator login and store role context | User unauthenticated | operator credentials | Mock `/auth/login` success operator | Submit form | Token and operator role stored | None | Happy path |
| RBAC-FE-003 | Auth bootstrap | UC-AUTH-03 | Restore current user and role from `/auth/me` | Token exists in storage | stored token | Mock `/auth/me` success with operator | Mount app | Role-aware app shell rendered | None | Bootstrap |
| RBAC-FE-004 | Auth bootstrap | UC-AUTHZ-03 | Redirect to login on expired session | Token exists | stored token | Mock `/auth/me` -> `401 SESSION_EXPIRED` | Mount app | Clear auth state, redirect login, show message | `SESSION_EXPIRED` | Session invalid UX |
| RBAC-FE-005 | Auth bootstrap | UC-AUTHZ-03 | Redirect to login on revoked session | Token exists | stored token | Mock `/auth/me` -> `401 SESSION_REVOKED` | Mount app | Clear auth state, redirect login | `SESSION_REVOKED` | Same UX category |
| RBAC-FE-006 | Auth bootstrap | UC-AUTH-03 | Clear auth on inactive user after login | Token exists | stored token | Mock `/auth/me` -> `403 USER_INACTIVE` | Mount app | Redirect login, show inactive error or auth reset | `USER_INACTIVE` | Post-login deactivation |

### 5.2 Role-Based UI Visibility

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-FE-007 | Main Layout | UC-AUTHZ-02 | Show admin menu items for admin | Admin authenticated | `role=ADMIN` | Mock auth provider admin user | Render layout | `User Management`, `Config`, `Logs` visible | None | Admin visibility |
| RBAC-FE-008 | Main Layout | UC-AUTHZ-02 | Hide admin-only menu items for operator | Operator authenticated | `role=OPERATOR` | Mock auth provider operator user | Render layout | `User Management`, `Config`, `Logs` hidden | None | Operator visibility |
| RBAC-FE-009 | Main Layout | UC-AUTHZ-02 | Keep shared menu items visible to both roles | Authenticated | `role=ADMIN/OPERATOR` | Render both variants | Render layout | `Dashboard`, `Map View`, `Camera View`, `Manual Control` visible | None | Shared visibility |

### 5.3 Protected Route / Role Guard / Unauthorized Page

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-FE-010 | ProtectedRoute | UC-AUTHZ-01 | Redirect unauthenticated user to login | No auth state | no token | Render protected route | Visit protected screen | Redirect login | None | Auth guard UX |
| RBAC-FE-011 | RoleGuard | UC-AUTHZ-02 | Allow admin into admin page | Admin authenticated | `role=ADMIN` | RoleGuard requires admin | Visit admin page | Page rendered | None | Happy path |
| RBAC-FE-012 | RoleGuard | UC-AUTHZ-02 | Deny operator direct URL access to admin page | Operator authenticated | `role=OPERATOR` | RoleGuard requires admin | Visit admin page | Unauthorized page shown | None | Direct URL case |
| RBAC-FE-013 | Unauthorized Page | UC-AUTHZ-02 | Render access denied message clearly | Role denied | none | Render unauthorized page | Open page | `Access Denied` and permission message visible | None | UX alignment |

### 5.4 Logout / Session Failure UX

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-FE-014 | Logout flow | UC-AUTH-02 | Clear auth and redirect after successful logout | Authenticated | none | Mock `/auth/logout` success | Confirm logout | Local auth cleared, redirect login | None | Happy path |
| RBAC-FE-015 | Logout flow | UC-AUTH-02 | Clear auth even if session already invalid | Authenticated locally | none | Mock `/auth/logout` -> `401 SESSION_REVOKED` | Confirm logout | Local auth cleared, redirect login | `SESSION_REVOKED` | Safe client behavior |
| RBAC-FE-016 | Logout flow | UC-AUTH-02 | Keep current session when canceling confirm modal | Authenticated | none | Logout API should not be called | Open modal then cancel | Dialog closes, auth remains | None | Alternative flow |

### 5.5 Login Form Validation / Error Mapping

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RBAC-FE-017 | Login Form | UC-AUTH-01 | Show required error for empty username | On login page | username empty | API not called | Submit | Inline username error shown | None | Validation UX |
| RBAC-FE-018 | Login Form | UC-AUTH-01 | Show required error for empty password | On login page | password empty | API not called | Submit | Inline password error shown | None | Validation UX |
| RBAC-FE-019 | Login Form | UC-AUTH-01 | Show generic invalid credential message | On login page | invalid credentials | Mock `401 INVALID_CREDENTIALS` | Submit | Global auth error shown | `INVALID_CREDENTIALS` | Security UX |
| RBAC-FE-020 | Login Form | UC-AUTH-01 | Show inactive account error | On login page | inactive credentials | Mock `403 USER_INACTIVE` | Submit | `User account is inactive` shown | `USER_INACTIVE` | Error mapping |
| RBAC-FE-021 | Login Form | Network error | Show network failure message | On login page | any credentials | Mock network failure | Submit | `Cannot connect to server` or network-safe equivalent | Network failure | UI/UX spec |

---

## 6. Validation Test Inputs

### 6.1 Backend Validation

| Area | Field / Rule | Valid Input | Invalid Input | Expected Result |
| --- | --- | --- | --- | --- |
| Login request | `username` | `"admin"` | `""`, `"   "`, `null` | `VALIDATION_ERROR` for invalid |
| Login request | `password` | `"StrongPass123"` | `""`, `null`, `undefined` | `VALIDATION_ERROR` for invalid |
| User role | `role` enum | `ADMIN`, `OPERATOR` | `USER`, `GUEST`, empty | Validation/business failure |
| User status | `status` enum | `ACTIVE`, `INACTIVE` | any unsupported string | Validation/business failure |
| Session rule | `expires_at > issued_at` | future expiry | equal/past expiry | Session invalid |
| Token/session consistency | `sid` + `jti` match | matching pair | mismatched `jti` | `UNAUTHORIZED` |

### 6.2 Frontend Validation

| Screen | Input | Invalid Value | Expected UI Behavior |
| --- | --- | --- | --- |
| Login Page | Username | empty | Show `Username is required` |
| Login Page | Password | empty | Show `Password is required` |
| Login Page | Invalid login | wrong credentials | Show generic error |
| Login Page | Inactive user | valid inactive credentials | Show inactive error |

---

## 7. Permission Test Inputs

| Test Area | Actor | Preconditions | Action | Expected Result |
| --- | --- | --- | --- | --- |
| Login API | Public | None | Call `/auth/login` | Allowed |
| Logout API | Admin | Authenticated | Call `/auth/logout` | Allowed |
| Logout API | Operator | Authenticated | Call `/auth/logout` | Allowed |
| Current user API | Admin | Authenticated | Call `/auth/me` | Allowed |
| Current user API | Operator | Authenticated | Call `/auth/me` | Allowed |
| Admin-only resource | Admin | Authenticated | Access admin-only endpoint | Allowed |
| Admin-only resource | Operator | Authenticated | Access admin-only endpoint | `403 FORBIDDEN` |
| Direct URL admin page | Operator | Authenticated in UI | Navigate to admin route | Show unauthorized page |

---

## 8. State Transition Test Inputs

### 8.1 User Status

| From | To | Trigger | Expected Result |
| --- | --- | --- | --- |
| `ACTIVE` | login success | valid login | Access granted |
| `INACTIVE` | login attempt | valid credential | `USER_INACTIVE` |
| `ACTIVE` after login | `INACTIVE` | admin deactivation | next protected request denied |

### 8.2 Auth Session Status

| From | To | Trigger | Expected Result |
| --- | --- | --- | --- |
| none | `ACTIVE` | login success | session created |
| `ACTIVE` | `REVOKED` | logout | session invalid |
| `ACTIVE` | `EXPIRED` | timeout / cleanup | session invalid |
| `REVOKED` | request reuse | protected access | denied |
| `EXPIRED` | request reuse | protected access | denied |

---

## 9. Error / Negative Test Inputs

| Case | Input / Situation | Expected Output / Behavior |
| --- | --- | --- |
| Wrong username | unknown user login | `401 INVALID_CREDENTIALS` |
| Wrong password | invalid password | `401 INVALID_CREDENTIALS` |
| Inactive user login | inactive account | `403 USER_INACTIVE` |
| Missing token | protected API without auth | `401 UNAUTHORIZED` |
| Corrupted token | malformed JWT | `401 UNAUTHORIZED` |
| Expired session | expired DB session | `401 SESSION_EXPIRED` |
| Revoked session | revoked DB session | `401 SESSION_REVOKED` |
| Operator to admin endpoint | wrong role | `403 FORBIDDEN` |
| Operator direct admin URL | wrong role in UI | unauthorized page |
| Network failure during login | frontend cannot reach backend | network error message |

---

## 10. Edge Case Test Inputs

| Area | Edge Case | Input Data | Expected Result |
| --- | --- | --- | --- |
| Login | username with leading/trailing spaces | `"  admin  "` | Trim and continue |
| Login | uppercase username | `"ADMIN"` | Case-insensitive lookup if supported by design |
| Session | expiry boundary | `expiresAt == now` | Treat as expired |
| Auth bootstrap | corrupted token in storage | invalid token | Force logout / redirect login |
| Role guard | required roles empty/undefined | metadata missing | Assumption-based safe behavior; usually allow if route not role-protected |
| Unauthorized page | operator hits admin page directly | role mismatch | Consistent 403 page |
| Logout | backend session already invalid | revoked/expired session | Client still clears local auth state |

---

## 11. Mock Data Suggestions

### 11.1 Valid Samples

```json
{
  "adminUser": {
    "id": "u-admin-001",
    "username": "admin",
    "role": "ADMIN",
    "status": "ACTIVE",
    "passwordHash": "<hash-of-StrongPass123>"
  },
  "operatorUser": {
    "id": "u-operator-001",
    "username": "operator1",
    "role": "OPERATOR",
    "status": "ACTIVE",
    "passwordHash": "<hash-of-Operator123!>"
  },
  "activeAdminSession": {
    "id": "s-admin-001",
    "userId": "u-admin-001",
    "tokenJti": "jti-admin-001",
    "status": "ACTIVE",
    "issuedAt": "2026-04-20T08:00:00Z",
    "expiresAt": "2026-04-20T16:00:00Z"
  }
}
```

### 11.2 Invalid / Conflict Samples

```json
{
  "inactiveOperator": {
    "id": "u-operator-002",
    "username": "operator2",
    "role": "OPERATOR",
    "status": "INACTIVE",
    "passwordHash": "<valid-hash>"
  },
  "revokedSession": {
    "id": "s-revoked-001",
    "userId": "u-admin-001",
    "tokenJti": "jti-revoked-001",
    "status": "REVOKED",
    "issuedAt": "2026-04-20T08:00:00Z",
    "expiresAt": "2026-04-20T16:00:00Z"
  },
  "expiredSession": {
    "id": "s-expired-001",
    "userId": "u-admin-001",
    "tokenJti": "jti-expired-001",
    "status": "ACTIVE",
    "issuedAt": "2026-04-20T06:00:00Z",
    "expiresAt": "2026-04-20T07:00:00Z"
  },
  "permissionDeniedContext": {
    "userId": "u-operator-001",
    "role": "OPERATOR",
    "sessionId": "s-operator-001",
    "requiredRoles": ["ADMIN"]
  }
}
```

### 11.3 Frontend Mock API Responses

```json
{
  "authMeAdminSuccess": {
    "success": true,
    "data": {
      "user": {
        "id": "u-admin-001",
        "username": "admin",
        "role": "ADMIN",
        "status": "ACTIVE"
      },
      "session": {
        "id": "s-admin-001",
        "expiresAt": "2026-04-20T16:00:00Z"
      }
    }
  },
  "forbiddenResponse": {
    "success": false,
    "error": {
      "code": "FORBIDDEN",
      "message": "You do not have permission to access this resource",
      "details": []
    }
  },
  "sessionExpiredResponse": {
    "success": false,
    "error": {
      "code": "SESSION_EXPIRED",
      "message": "Session expired",
      "details": []
    }
  }
}
```

### 11.4 Suggested Mock Dependencies

- `UsersRepository`
- `AuthSessionRepository`
- `AuthService`
- `TokenService`
- `PasswordService`
- `AuditLogService`
- `AuthGuard`
- `RoleGuard`
- Frontend `AuthProvider`
- Frontend `ProtectedRoute`
- Frontend `RoleGuard`
- Frontend router navigation mock
- Frontend API client mock
- Local storage/session storage mock

---

## 12. Assumptions / Open Points

### 12.1 Assumptions

1. RBAC tests for admin-only resources use the example protected endpoint pattern because full downstream module APIs are not yet specified.
2. Frontend should prefer hiding admin-only navigation instead of showing disabled items in MVP.
3. `FORBIDDEN` uses a stable user-facing message for unauthorized resource access.
4. `AUTH_CHECK_FAILED` and `ACCESS_DENIED` logs may be optional depending on final logging policy, but test inputs should still note them.

### 12.2 Open Points To Confirm Before Writing Real Tests

1. When role metadata is absent on a protected endpoint, should `RoleGuard` allow access or fail safe?
2. Should frontend use a dedicated unauthorized page or redirect to dashboard with toast for some modules?
3. Is `USER_INACTIVE` always `403`, or can some guarded flows map it to `401` for security policy reasons?
4. Should auth bootstrap messages for `SESSION_REVOKED` and `SESSION_EXPIRED` be identical in UI?
5. Will future module APIs expose a formal permission matrix that should replace the current example protected endpoint pattern?

---

## 13. Recommended Next Step

Tai lieu nay da san sang cho buoc tiep theo:

1. Sinh backend unit test cases cho:
- `AuthGuard`
- `RoleGuard`
- `AuthService.getCurrentUser`
- session lifecycle

2. Sinh frontend unit test cases cho:
- `AuthProvider`
- `ProtectedRoute`
- `RoleGuard`
- unauthorized page
- role-based sidebar rendering
