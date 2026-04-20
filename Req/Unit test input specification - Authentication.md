# Unit Test Input Specification - Authentication

## 1. Test Scope Summary

### 1.1 Scope

Tai lieu nay chi bao phu module `Authentication` cua he thong Desktop Meeting Control Application.

### 1.2 Source Documents Used

- Requirement Specification
- Use Case document:
  - `UC-AUTH-01 Login`
  - `UC-AUTH-02 Logout`
  - `UC-AUTH-03 Get Current Auth Context`
  - `UC-AUTH-04 Validate Protected Request Session`
- Detail Design:
  - `Detail design - Authentication.md`
- UI/UX Design:
  - `UI UX design - Authentication.md`
  - `UI UX design - Authentication detailed.md`
- API Contract:
  - `API contract - Authentication.md`
  - `openapi-3.0-authentication.yaml`

### 1.3 Objectives Of This Test Input

- Xac dinh chinh xac nhung gi can test cho auth.
- Bao phu service logic, DTO validation, guard logic, API mapping, UI login/logout flow.
- Xac dinh input data, mock setup, expected result, expected error.
- Lam nen tang de sinh unit test code sau nay.

### 1.4 Roles In Scope

- `ADMIN`
- `OPERATOR`
- `System`

### 1.5 Main Features In Scope

- Login
- Logout
- Get current auth context
- Protected request validation
- Auth UI state and interaction
- Role-aware post-login behavior

---

## 2. Modules / Features To Test

| Module | Feature | Related Requirement / UC | Related API | Related UI |
| --- | --- | --- | --- | --- |
| Authentication | Login | UC-AUTH-01 | `POST /api/v1/auth/login` | Login Page, LoginForm |
| Authentication | Logout | UC-AUTH-02 | `POST /api/v1/auth/logout` | Header user menu, ConfirmDialog |
| Authentication | Get current auth context | UC-AUTH-03 | `GET /api/v1/auth/me` | App bootstrap, route guard |
| Authentication | Protected request validation | UC-AUTH-04 | All protected endpoints | ProtectedRoute, auth provider |
| Authentication | Session lifecycle | Detail Design auth session rules | Internal auth/session logic | App auth state |
| Authentication | Role-based UI visibility | Requirement + UI/UX auth | `/auth/login`, `/auth/me` | Sidebar, app shell |
| Authentication | Error and expired session UX | UI/UX auth + API contract | `/auth/me`, `/auth/logout` | Login redirect, alerts |

---

## 3. Requirement-To-Test Mapping

| Requirement / Rule | Test Coverage Area |
| --- | --- |
| User login by username + password | Login DTO, AuthService.login, LoginForm submit |
| Only ACTIVE users can login | AuthService.login, AuthGuard.validateRequest |
| Every login creates a new session | AuthService.login, auth session repository interaction |
| Logout revokes current session | AuthService.logout, logout UI flow |
| Protected API requires valid token | Jwt strategy / guard test input |
| Protected API requires ACTIVE session | Guard + session validation |
| Protected API requires ACTIVE user | Guard + `/auth/me` behavior |
| Generic credential error for wrong username/password | AuthService.login error mapping, login UI alert |
| Frontend stores token and redirects on success | Auth provider + login page flow |
| Expired or invalid session redirects to login | `/auth/me` handling + ProtectedRoute behavior |
| Admin vs Operator role resolution after login | auth context mapping + sidebar visibility |

---

## 4. Backend Unit Test Input Matrix

### 4.1 DTO Validation

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-BE-DTO-001 | Login DTO | UC-AUTH-01 | Accept valid login payload | None | `{ username: "admin", password: "Admin123!" }` | Validation pipe enabled | Validate DTO | DTO passes | None | Baseline happy path |
| AUTH-BE-DTO-002 | Login DTO | UC-AUTH-01 | Reject missing username | None | `{ password: "Admin123!" }` | Validation pipe enabled | Validate DTO | Validation fails | `VALIDATION_ERROR` on `username` | Required field |
| AUTH-BE-DTO-003 | Login DTO | UC-AUTH-01 | Reject missing password | None | `{ username: "admin" }` | Validation pipe enabled | Validate DTO | Validation fails | `VALIDATION_ERROR` on `password` | Required field |
| AUTH-BE-DTO-004 | Login DTO | UC-AUTH-01 | Reject blank username after trim | None | `{ username: "   ", password: "Admin123!" }` | Validation pipe enabled | Validate DTO | Validation fails | `VALIDATION_ERROR` | Trim + not blank |
| AUTH-BE-DTO-005 | Login DTO | UC-AUTH-01 | Reject blank password | None | `{ username: "admin", password: "" }` | Validation pipe enabled | Validate DTO | Validation fails | `VALIDATION_ERROR` | Empty string |
| AUTH-BE-DTO-006 | Login DTO | UC-AUTH-01 | Reject null username | None | `{ username: null, password: "Admin123!" }` | Validation pipe enabled | Validate DTO | Validation fails | `VALIDATION_ERROR` | Null case |
| AUTH-BE-DTO-007 | Login DTO | UC-AUTH-01 | Reject undefined password | None | `{ username: "admin", password: undefined }` | Validation pipe enabled | Validate DTO | Validation fails | `VALIDATION_ERROR` | Undefined case |

### 4.2 AuthService.login

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-BE-SVC-001 | AuthService.login | UC-AUTH-01 | Login succeeds for active admin | User exists and active | `username=admin`, `password=Admin123!` | Mock user repo returns active admin, password service match=true, token service issues token, session repo insert success, audit logger success | Call `login()` | Returns token, expiresAt, user info, session created | None | Role must be `ADMIN` |
| AUTH-BE-SVC-002 | AuthService.login | UC-AUTH-01 | Login succeeds for active operator | User exists and active | `username=operator1`, `password=Operator123!` | Same as above with role `OPERATOR` | Call `login()` | Returns operator profile and token | None | Role propagation |
| AUTH-BE-SVC-003 | AuthService.login | UC-AUTH-01 | Username lookup is case-insensitive | User exists | `username=ADMIN`, `password=Admin123!` | Mock repo resolves same user by lowered username | Call `login()` | Login succeeds | None | Case-insensitive rule |
| AUTH-BE-SVC-004 | AuthService.login | UC-AUTH-01 | Username is trimmed before lookup | User exists | `username="  admin  "`, `password=Admin123!` | Mock repo expects normalized value | Call `login()` | Login succeeds | None | Trim rule |
| AUTH-BE-SVC-005 | AuthService.login | UC-AUTH-01 | Reject unknown username | No matching user | `username=ghost`, `password=Any123!` | Mock user repo returns null | Call `login()` | No token, no session insert | `INVALID_CREDENTIALS` | Generic error |
| AUTH-BE-SVC-006 | AuthService.login | UC-AUTH-01 | Reject wrong password | User exists, active | `username=admin`, `password=Wrong123!` | Mock password match=false | Call `login()` | No token, no session insert | `INVALID_CREDENTIALS` | Generic error must match unknown user case |
| AUTH-BE-SVC-007 | AuthService.login | UC-AUTH-01 | Reject inactive user | User exists with `INACTIVE` | `username=inactiveUser`, `password=Any123!` | Mock user repo returns inactive user | Call `login()` | No token, no session insert | `USER_INACTIVE` | 403 behavior |
| AUTH-BE-SVC-008 | AuthService.login | UC-AUTH-01 | Fail when session creation fails | User valid | Valid login payload | Mock session repo insert throws DB error | Call `login()` | Login fails, no token returned | `INTERNAL_ERROR` or mapped system error | Main business transaction fails |
| AUTH-BE-SVC-009 | AuthService.login | UC-AUTH-01 | Continue success if audit log fails after session creation | User valid | Valid login payload | Mock audit logger throws non-fatal error after session insert | Call `login()` | Login still succeeds | None | Detail design says no rollback on audit failure |
| AUTH-BE-SVC-010 | AuthService.login | UC-AUTH-01 | Generated token contains required claims | User valid | Valid login payload | Mock token service captures payload | Call `login()` | Payload contains `sub`, `sid`, `jti`, `role`, `exp` | None | Token payload contract |

### 4.3 AuthService.logout

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-BE-SVC-011 | AuthService.logout | UC-AUTH-02 | Logout revokes active session | Current session exists and active | `sessionId=s1`, `userId=u1` | Mock session repo returns active session and update succeeds | Call `logout()` | Session status becomes `REVOKED`, response success | None | Happy path |
| AUTH-BE-SVC-012 | AuthService.logout | UC-AUTH-02 | Reject logout if session not found | Session missing | `sessionId=missing`, `userId=u1` | Mock session repo returns null | Call `logout()` | No update | `UNAUTHORIZED` | Invalid context |
| AUTH-BE-SVC-013 | AuthService.logout | UC-AUTH-02 | Reject logout if session already revoked | Session exists with `REVOKED` | `sessionId=s1`, `userId=u1` | Mock repo returns revoked session | Call `logout()` | No second revoke | `SESSION_REVOKED` or `UNAUTHORIZED` | Match API contract |
| AUTH-BE-SVC-014 | AuthService.logout | UC-AUTH-02 | Reject logout if session expired | Session exists expired | `sessionId=s1`, `userId=u1` | Mock repo returns expired session | Call `logout()` | No update | `SESSION_EXPIRED` | Contract behavior |
| AUTH-BE-SVC-015 | AuthService.logout | UC-AUTH-02 | Record revoke metadata on successful logout | Active session exists | `sessionId=s1`, `userId=u1` | Mock repo captures update payload | Call `logout()` | `revokedAt` populated and `revokedReason='USER_LOGOUT'` | None | Data contract |
| AUTH-BE-SVC-016 | AuthService.logout | UC-AUTH-02 | Do not fail logout success if audit write fails after revoke | Active session exists | `sessionId=s1`, `userId=u1` | Mock revoke success, audit logger throws | Call `logout()` | Logout still returns success | None | Best-effort audit |

### 4.4 Auth Guard / JWT Strategy / Protected Request Validation

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-BE-GUARD-001 | Auth guard | UC-AUTH-04 | Allow protected request with valid token, active session, active user | Protected endpoint | Bearer token with valid claims | Mock token verify success, session active, user active | Validate request | Request passes, auth context attached | None | Happy path |
| AUTH-BE-GUARD-002 | Auth guard | UC-AUTH-04 | Reject missing Authorization header | Protected endpoint | No auth header | No further dependency calls expected | Validate request | Request blocked | `UNAUTHORIZED` | Header missing |
| AUTH-BE-GUARD-003 | Auth guard | UC-AUTH-04 | Reject malformed bearer token | Protected endpoint | `Authorization: Bearer abc..bad` | Mock JWT verify throws | Validate request | Request blocked | `UNAUTHORIZED` | Token malformed |
| AUTH-BE-GUARD-004 | Auth guard | UC-AUTH-04 | Reject expired token | Protected endpoint | Expired JWT | Mock JWT verify returns expired error | Validate request | Request blocked | `SESSION_EXPIRED` | Token exp rule |
| AUTH-BE-GUARD-005 | Auth guard | UC-AUTH-04 | Reject when DB session not found | Protected endpoint | Valid JWT claims | Mock session repo returns null | Validate request | Request blocked | `UNAUTHORIZED` | Session missing |
| AUTH-BE-GUARD-006 | Auth guard | UC-AUTH-04 | Reject revoked session | Protected endpoint | Valid JWT claims | Mock session repo returns `REVOKED` | Validate request | Request blocked | `SESSION_REVOKED` | Session state rule |
| AUTH-BE-GUARD-007 | Auth guard | UC-AUTH-04 | Reject expired session based on DB expiry | Protected endpoint | Valid JWT claims | Mock session active status but `expiresAt <= now` | Validate request | Request blocked | `SESSION_EXPIRED` | Runtime expiry check |
| AUTH-BE-GUARD-008 | Auth guard | UC-AUTH-04 | Reject token-session mismatch on jti | Protected endpoint | Valid JWT claims | Mock session with different `tokenJti` | Validate request | Request blocked | `UNAUTHORIZED` | Cross-field consistency |
| AUTH-BE-GUARD-009 | Auth guard | UC-AUTH-04 | Reject inactive user for protected request | Protected endpoint | Valid JWT claims | Session active, user status `INACTIVE` | Validate request | Request blocked | `USER_INACTIVE` | 403 rule |
| AUTH-BE-GUARD-010 | Auth guard | UC-AUTH-04 | Attach current user context on success | Protected endpoint | Valid JWT claims | Session active, user active | Validate request | `userId`, `sessionId`, `role` attached | None | Context resolution |

### 4.5 AuthService.getCurrentUser / `/auth/me`

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-BE-SVC-017 | `/auth/me` logic | UC-AUTH-03 | Return current user and session context for valid auth | Auth already validated | `currentUser={ userId, sessionId, role }` | Mock user and session records | Call service/controller | Response includes `user` and `session.expiresAt` | None | Bootstrap API |
| AUTH-BE-SVC-018 | `/auth/me` logic | UC-AUTH-03 | Reject when user becomes inactive after login | Session still present | Valid auth context | Mock user status `INACTIVE` | Call service/controller | No data returned | `USER_INACTIVE` | Explicit rule |
| AUTH-BE-SVC-019 | `/auth/me` logic | UC-AUTH-03 | Reject when session no longer active | Auth context present | Valid auth context | Mock session revoked | Call service/controller | No data returned | `SESSION_REVOKED` | Session invalid |

### 4.6 Repository / Utility / Side Effect / Scheduled Job

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-BE-UTIL-001 | Password utility | UC-AUTH-01 | Verify correct password hash comparison | Stored hash exists | Plain password + matching hash | Use deterministic mock hash or real hash fixture | Compare password | Returns true | None | Helper logic |
| AUTH-BE-UTIL-002 | Password utility | UC-AUTH-01 | Reject non-matching password hash | Stored hash exists | Plain password + non-matching hash | Same | Compare password | Returns false | None | Helper logic |
| AUTH-BE-UTIL-003 | Token utility | Detail design auth | Generate signed token with configured ttl | Valid user/session ids | token payload fixture | Mock config TTL | Sign token | Token created with expected exp window | None | Config-driven TTL |
| AUTH-BE-JOB-001 | Session expiry cleanup job | Detail design auth | Mark active expired sessions as EXPIRED | Some sessions expired | `now=2026-04-20T10:00:00Z` | Mock repo returns active sessions with `expiresAt <= now` | Run cleanup job | Matching sessions updated to `EXPIRED` | None | Cleanup sync job |
| AUTH-BE-JOB-002 | Session expiry cleanup job | Detail design auth | Ignore still-active future sessions | Some sessions future-dated | `expiresAt > now` | Mock repo returns mixed sessions | Run cleanup job | Only expired ones updated | None | Boundary behavior |
| AUTH-BE-LOG-001 | Audit side effect | UC-AUTH-01 | Create login success audit entry | Login success | user/session context | Mock audit logger capture payload | Call login | Audit action `LOGIN`, result `SUCCESS` | None | Side effect validation |
| AUTH-BE-LOG-002 | Audit side effect | UC-AUTH-01 | Create login failed audit entry for wrong credentials | Login failure | invalid credentials | Mock audit logger capture payload | Call login | Audit action `LOGIN`, result `FAILED`, reason set | `INVALID_CREDENTIALS` | Side effect + failure |
| AUTH-BE-LOG-003 | Audit side effect | UC-AUTH-02 | Create logout success audit entry | Logout success | valid session | Mock audit logger capture payload | Call logout | Audit action `LOGOUT`, result `SUCCESS` | None | Side effect validation |

---

## 5. Frontend Unit Test Input Matrix

### 5.1 Login Page Rendering And Validation

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-FE-UI-001 | Login Page | UC-AUTH-01 | Render login form with username, password, login button | User not authenticated | None | Render component in auth layout | Open page | All controls visible | None | Baseline render |
| AUTH-FE-UI-002 | Login Page | UC-AUTH-01 | Autofocus username input | User not authenticated | None | Render page | Load page | Cursor on username field | None | UX optimization |
| AUTH-FE-UI-003 | Login Form validation | UC-AUTH-01 | Show required error for empty username on submit | User on login page | `username=""`, `password="Admin123!"` | Mock API should not be called | Click Login | Error text under username | None | Client validation |
| AUTH-FE-UI-004 | Login Form validation | UC-AUTH-01 | Show required error for empty password on submit | User on login page | `username="admin"`, `password=""` | Mock API should not be called | Click Login | Error text under password | None | Client validation |
| AUTH-FE-UI-005 | Login Form validation | UC-AUTH-01 | Show both field errors when both fields empty | User on login page | `username=""`, `password=""` | Mock API should not be called | Click Login | Two field errors visible | None | Full blank form |
| AUTH-FE-UI-006 | Login Form validation | UC-AUTH-01 | Submit on Enter key | User on login page | valid credentials | Mock login API success | Press Enter in password field | Login flow executes | None | Keyboard UX |
| AUTH-FE-UI-007 | Login Form loading | UC-AUTH-01 | Disable login button and show spinner during request | Login request in progress | valid credentials | Mock API pending promise | Click Login | Button disabled, spinner visible | None | Loading state |

### 5.2 Login Result Handling

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-FE-UI-008 | Login success flow | UC-AUTH-01 | Persist auth state and redirect on successful login | User unauthenticated | valid admin credentials | Mock `/auth/login` success with admin response | Submit login | Token stored, auth context set, redirect to dashboard | None | Happy path |
| AUTH-FE-UI-009 | Login success flow | UC-AUTH-01 | Load operator role and restrict visible modules | User unauthenticated | valid operator credentials | Mock `/auth/login` success with operator response | Submit login | Redirect success, admin-only menu hidden | None | Role-based UI |
| AUTH-FE-UI-010 | Login error flow | UC-AUTH-01 | Show generic error for wrong credentials | User unauthenticated | invalid credentials | Mock `401 INVALID_CREDENTIALS` | Submit login | Global alert `Invalid username or password` | `INVALID_CREDENTIALS` | UX message mapping |
| AUTH-FE-UI-011 | Login error flow | UC-AUTH-01 | Show inactive account message | User unauthenticated | inactive user credentials | Mock `403 USER_INACTIVE` | Submit login | Alert `User account is inactive` | `USER_INACTIVE` | Backend-to-UI mapping |
| AUTH-FE-UI-012 | Login error flow | UC-AUTH-01 | Show system error message on 500 | User unauthenticated | any credentials | Mock `500 INTERNAL_ERROR` | Submit login | Error alert visible | `INTERNAL_ERROR` | Generic server error |
| AUTH-FE-UI-013 | Login error flow | UC-AUTH-01 | Show network failure message | User unauthenticated | any credentials | Mock network failure / timeout | Submit login | Alert `Unable to connect. Please check network.` | Network error | UI/UX edge case |

### 5.3 Protected Route / Auth Bootstrap / `/auth/me`

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-FE-UI-014 | ProtectedRoute | UC-AUTH-04 | Redirect unauthenticated user to login | No auth state | None | Render protected route without token | Open protected page | Redirect to login | None | Route guard |
| AUTH-FE-UI-015 | App bootstrap | UC-AUTH-03 | Restore session using stored token and `/auth/me` | Token exists in storage | stored token | Mock `/auth/me` success | Mount app | User state restored, protected page shown | None | Bootstrap flow |
| AUTH-FE-UI-016 | App bootstrap | UC-AUTH-03 | Clear auth and redirect on expired session | Expired token in storage | stored token | Mock `/auth/me` returns `401 SESSION_EXPIRED` | Mount app | Auth cleared, redirect to login, message shown | `SESSION_EXPIRED` | Expired session UX |
| AUTH-FE-UI-017 | App bootstrap | UC-AUTH-03 | Clear auth and redirect on inactive user | Token exists | stored token | Mock `/auth/me` returns `403 USER_INACTIVE` | Mount app | Auth cleared, redirect to login | `USER_INACTIVE` | Post-login deactivation |
| AUTH-FE-UI-018 | App bootstrap | UC-AUTH-03 | Do not call `/auth/me` when no token exists | No token in storage | None | Spy on API client | Mount app | Login page shown, no `/auth/me` call | None | Optimization |

### 5.4 Logout UI Flow

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-FE-UI-019 | Logout menu | UC-AUTH-02 | Show logout option in authenticated header | User authenticated | None | Render app with auth state | Open user menu | Logout action visible | None | Header behavior |
| AUTH-FE-UI-020 | Logout confirm dialog | UC-AUTH-02 | Open confirm dialog before logout | User authenticated | None | Render app with auth state | Click Logout | Confirm dialog shown | None | UX requirement |
| AUTH-FE-UI-021 | Logout cancel | UC-AUTH-02 | Keep session when canceling logout | User authenticated | None | Mock logout API not called | Open dialog then cancel | Dialog closes, user remains logged in | None | Alternate flow |
| AUTH-FE-UI-022 | Logout success | UC-AUTH-02 | Clear auth state and redirect after successful logout | User authenticated | None | Mock `/auth/logout` success | Confirm logout | Auth cleared, redirect login | None | Happy path |
| AUTH-FE-UI-023 | Logout expired session fallback | UC-AUTH-02 | Clear local auth even when backend returns session error | User authenticated locally | None | Mock `/auth/logout` returns `401 SESSION_REVOKED` | Confirm logout | Local auth cleared, redirect login | `SESSION_REVOKED` | UX idempotency |

### 5.5 Role-Based UI Visibility

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock/Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-FE-UI-024 | Role-based app shell | Requirement auth/UI | Show full sidebar for admin | Admin authenticated | role=`ADMIN` | Render app with admin auth context | Open app shell | Config and Logs visible | None | Role visibility |
| AUTH-FE-UI-025 | Role-based app shell | Requirement auth/UI | Hide admin-only items for operator | Operator authenticated | role=`OPERATOR` | Render app with operator context | Open app shell | User Management, Config, Logs hidden | None | Role visibility |

---

## 6. Validation Test Inputs

### 6.1 Backend Validation Inputs

| Area | Field | Valid Input | Invalid Input | Expected Result |
| --- | --- | --- | --- | --- |
| Login DTO | username | `"admin"` | `""`, `"   "`, `null`, `undefined` | Invalid inputs rejected with `VALIDATION_ERROR` |
| Login DTO | password | `"Admin123!"` | `""`, `null`, `undefined` | Invalid inputs rejected with `VALIDATION_ERROR` |
| Session model | expiresAt / issuedAt | `expiresAt > issuedAt` | `expiresAt <= issuedAt` | Session creation rejected or flagged invalid |
| Guard validation | token/session consistency | matching `sid` + `jti` | mismatched `jti` | Request blocked |

### 6.2 Frontend Validation Inputs

| Screen | Field | Invalid Input | Expected UI Behavior |
| --- | --- | --- | --- |
| Login Page | Username | empty | Show `Username is required` under field |
| Login Page | Password | empty | Show `Password is required` under field |
| Login Page | Both fields | both empty | Show both errors and do not call API |

---

## 7. Permission Test Inputs

| Test Area | Actor | Preconditions | Action | Expected Result |
| --- | --- | --- | --- | --- |
| Login API | Public | None | Call `/auth/login` | Allowed without token |
| Logout API | Admin | Authenticated session active | Call `/auth/logout` | Allowed |
| Logout API | Operator | Authenticated session active | Call `/auth/logout` | Allowed |
| Logout API | Anonymous | No token | Call `/auth/logout` | `401 UNAUTHORIZED` |
| `/auth/me` | Admin | Valid active session | Call `/auth/me` | Allowed |
| `/auth/me` | Operator | Valid active session | Call `/auth/me` | Allowed |
| `/auth/me` | Inactive user | Token still present but user inactive | Call `/auth/me` | `403 USER_INACTIVE` |
| ProtectedRoute | Anonymous | No token | Open protected screen | Redirect to login |

---

## 8. State Transition Test Inputs

### 8.1 User Status

| Test Area | From | To | Trigger | Expected Behavior |
| --- | --- | --- | --- | --- |
| Login eligibility | ACTIVE | login success | valid login | Allowed |
| Login eligibility | INACTIVE | login attempt | valid password | Blocked with `USER_INACTIVE` |
| Protected request | ACTIVE after login -> INACTIVE | next protected request | `/auth/me` or protected API | Blocked with `USER_INACTIVE` |

### 8.2 Auth Session Status

| Test Area | From | To | Trigger | Expected Behavior |
| --- | --- | --- | --- | --- |
| Login session creation | none | ACTIVE | successful login | Session inserted |
| Logout | ACTIVE | REVOKED | logout success | Session revoked |
| Expiry cleanup | ACTIVE | EXPIRED | cleanup job or runtime expiry | Session invalid |
| Invalid transition | REVOKED | ACTIVE | any request reuse | Rejected |
| Invalid transition | EXPIRED | ACTIVE | any request reuse | Rejected |

---

## 9. Error / Negative Test Inputs

| Case | Input / Situation | Expected Output / Behavior |
| --- | --- | --- |
| Invalid credentials | wrong username or wrong password | `401 INVALID_CREDENTIALS`, generic message |
| User inactive | valid username/password but status `INACTIVE` | `403 USER_INACTIVE` |
| Missing auth header | no bearer token on protected API | `401 UNAUTHORIZED` |
| Malformed token | unreadable or bad signature token | `401 UNAUTHORIZED` |
| Revoked session | token valid, session `REVOKED` | `401 SESSION_REVOKED` |
| Expired session | token or DB session expired | `401 SESSION_EXPIRED` |
| Token/session mismatch | JWT `jti` differs from DB | `401 UNAUTHORIZED` |
| DB failure on session insert | login path infrastructure error | `500 INTERNAL_ERROR` |
| Network failure on login UI | request timeout / offline | Show retry/network message |
| Logout backend auth error | session already revoked | Frontend still clears local auth state |

---

## 10. Edge Case Test Inputs

| Area | Edge Case | Input Data | Expected Result |
| --- | --- | --- | --- |
| Login DTO | null values | `{ username: null, password: null }` | Validation error |
| Login DTO | undefined values | omitted fields | Validation error |
| Login DTO | whitespace username | `"   "` | Validation error |
| Login service | uppercase username | `"ADMIN"` | Case-insensitive lookup success |
| Login service | leading/trailing spaces | `"  admin  "` | Trim then success |
| Session validation | expiry boundary at current time | `expiresAt == now` | Treat as expired |
| Auth bootstrap | token exists but `/auth/me` returns no user | inconsistent backend state | Clear auth and redirect |
| Login UI | repeated click while loading | click login many times | Single in-flight submit, button disabled |
| Logout UI | backend unavailable during logout | network failure | Local auth cleared anyway |

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
    "passwordHash": "<hash-of-Admin123!>"
  },
  "operatorUser": {
    "id": "u-operator-001",
    "username": "operator1",
    "role": "OPERATOR",
    "status": "ACTIVE",
    "passwordHash": "<hash-of-Operator123!>"
  },
  "activeSession": {
    "id": "s-001",
    "userId": "u-admin-001",
    "tokenJti": "jti-001",
    "status": "ACTIVE",
    "issuedAt": "2026-04-20T08:00:00Z",
    "expiresAt": "2026-04-20T12:00:00Z"
  }
}
```

### 11.2 Invalid / Conflict Samples

```json
{
  "inactiveUser": {
    "id": "u-inactive-001",
    "username": "disabled",
    "role": "OPERATOR",
    "status": "INACTIVE",
    "passwordHash": "<valid-hash>"
  },
  "revokedSession": {
    "id": "s-002",
    "userId": "u-admin-001",
    "tokenJti": "jti-002",
    "status": "REVOKED",
    "issuedAt": "2026-04-20T08:00:00Z",
    "expiresAt": "2026-04-20T12:00:00Z",
    "revokedAt": "2026-04-20T09:00:00Z"
  },
  "expiredSession": {
    "id": "s-003",
    "userId": "u-admin-001",
    "tokenJti": "jti-003",
    "status": "ACTIVE",
    "issuedAt": "2026-04-20T06:00:00Z",
    "expiresAt": "2026-04-20T07:00:00Z"
  },
  "mismatchedTokenClaims": {
    "sub": "u-admin-001",
    "sid": "s-001",
    "jti": "wrong-jti",
    "role": "ADMIN"
  }
}
```

### 11.3 Frontend Mock Response Samples

```json
{
  "loginSuccessAdmin": {
    "success": true,
    "data": {
      "token": "jwt-admin",
      "expiresAt": "2026-04-20T12:00:00Z",
      "user": {
        "id": "u-admin-001",
        "username": "admin",
        "role": "ADMIN",
        "status": "ACTIVE"
      }
    }
  },
  "loginInvalidCredentials": {
    "success": false,
    "error": {
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid username or password",
      "details": []
    }
  },
  "loginInactiveUser": {
    "success": false,
    "error": {
      "code": "USER_INACTIVE",
      "message": "User account is inactive",
      "details": []
    }
  }
}
```

### 11.4 Mock Dependency List

- `UsersRepository`
- `AuthSessionRepository`
- `PasswordService`
- `TokenService`
- `AuditLogService`
- `JwtService` or JWT verify utility
- `ConfigService`
- Frontend `apiClient`
- Frontend `localStorage` wrapper
- Frontend router navigation mock

---

## 12. Assumptions / Open Points

### 12.1 Assumptions

1. `/auth/me` la API ho tro frontend bootstrap va route guard, du khong phai UC goc cua requirement ban dau.
2. Login tao session moi cho moi lan dang nhap, khong overwrite session cu.
3. Logout UX la best-effort:
   - neu backend tra `401` do session da het han / revoke, frontend van clear local auth state.
4. Token TTL la cau hinh ky thuat, khong hard-code trong test expectation; chi test logic relative.
5. Session cleanup job co the duoc test nhu scheduled unit logic, khong can test cron framework behavior.

### 12.2 Open Points To Confirm Before Writing Real Test Code

1. `SESSION_EXPIRED` duoc tra truc tiep tu JWT layer hay duoc map tai auth guard?
2. Audit log failure co duoc phep swallow o moi truong hop hay chi o login/logout?
3. `/auth/logout` backend se tra `401` hay `200` neu session da bi revoke truoc do?
4. Frontend co luu token trong `localStorage`, `sessionStorage`, hay storage abstraction rieng?
5. Message UI exact cho loi `500 INTERNAL_ERROR` co can khoa cung theo spec hay chi can assertion theo semantic?

---

## 13. Recommended Next Step

Tai lieu nay da san sang cho buoc tiep theo:

1. Sinh `Jest` unit test cases cho backend auth:
- DTO validation
- AuthService
- AuthGuard
- session cleanup job

2. Sinh `React Testing Library / Vitest` unit test cases cho frontend auth:
- Login page
- Auth provider
- ProtectedRoute
- logout flow
