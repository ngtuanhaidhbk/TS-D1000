# UI/UX Design - Authentication

Scope: Authentication feature only  
System: Desktop Meeting Control Application for TS-D1000 + PTZ Cameras

This document is based on:

- Requirement documents in `Req`
- `Use cases - Authentication.md`
- `Detail design - Authentication.md`
- `API contract.md`

---

## 1. UI/UX Overview

### 1.1 Purpose

The Authentication UI must allow users to:

- log in with `username + password`
- access the system according to their role
- restore session state on app reload
- log out safely
- be redirected correctly when session is invalid or expired

### 1.2 Supported Roles

| Role | Description |
| --- | --- |
| `ADMIN` | Full system access |
| `OPERATOR` | Limited operational access |

### 1.3 Authentication Scope

Included:

- Login page
- Logout interaction
- Session bootstrap via `/auth/me`
- Protected route behavior
- Auth-based app shell visibility

Not included:

- Forgot password
- Reset password
- Change password
- MFA
- Concurrent session management UI

### 1.4 UX Goals

- Fast login with minimal steps
- Clear feedback on auth failures
- No protected content shown before session validation
- Role-based navigation visibility after login
- Predictable recovery for expired or invalid session

---

## 2. Navigation Structure

### 2.1 Entry Flow

```text
App Start
  -> Check local auth state
  -> If no token: Login Page
  -> If token exists: Call GET /auth/me
      -> Success: Main App
      -> Failure: Login Page + session message
```

### 2.2 Post-login Navigation

| Role | Landing Page |
| --- | --- |
| `ADMIN` | Dashboard / Monitoring |
| `OPERATOR` | Dashboard / Monitoring |

### 2.3 Auth Navigation Rules

- Before authentication:
  - no sidebar
  - no app header
  - no protected route access
- After authentication:
  - render app shell
  - render role-based menu
  - allow protected route navigation

---

## 3. Page Map

```text
Authentication
└── Login Page

Authenticated App Shell
├── Header
│   └── User menu
│       └── Logout
├── Sidebar
│   ├── Dashboard
│   ├── Map View
│   ├── Camera View
│   ├── Config (Admin only)
│   └── Logs (Admin only)
└── Main Content
```

### 3.1 Dialogs / Modals

- Logout confirmation dialog

---

## 4. Layout & Navigation Design

## 4.1 Login Page Layout

```text
-------------------------------------------------
|                APP LOGO                       |
|-----------------------------------------------|
|                                               |
|            [ Login Card Center ]              |
|                                               |
|   Username [______________]                   |
|   Password [______________]                   |
|                                               |
|   [ Login Button ]                            |
|                                               |
|   Error Message Area                          |
|                                               |
-------------------------------------------------
```

### 4.2 App Shell Layout After Login

```text
-------------------------------------------------------------
| Sidebar                | Header                            |
| - Dashboard            | App title                         |
| - Map View             | Current user                      |
| - Camera View          | User menu -> Logout               |
| - Config (Admin only)  |-----------------------------------|
| - Logs (Admin only)    | Main content                      |
|                        |                                   |
-------------------------------------------------------------
```

### 4.3 Breadcrumbs

For Authentication:

- not required on Login page
- optional for protected app pages later, but not part of auth scope

---

## 5. Page-by-Page Design

## 5.1 Login Page

### 5.1.1 Page Overview

Purpose:

- authenticate user
- provide immediate validation feedback
- recover gracefully from invalid session or auth failure

Main actions:

- input username
- input password
- submit login

### 5.1.2 Layout Sections

| Section | Purpose |
| --- | --- |
| Logo / Brand | identify system |
| Login card | central form container |
| Form area | credentials input |
| Error area | validation or API error feedback |
| Loading area | button spinner / disabled state |

### 5.1.3 Components

| Component | Type | Purpose |
| --- | --- | --- |
| App logo | branding | system identity |
| Username input | text | enter username |
| Password input | password | enter password |
| Login button | primary | submit credentials |
| Inline field error | caption / alert | required-field feedback |
| Global error alert | alert | API/system/network error |
| Button spinner | loading indicator | show submitting state |

### 5.1.4 Data Mapping

| UI Field | API Field | Backend Field |
| --- | --- | --- |
| Username | `username` | `users.username` |
| Password | `password` | compared against `users.password_hash` |

### 5.1.5 API Mapping

- `POST /auth/login`
- `GET /auth/me` for bootstrap only

---

## 5.2 Logout Interaction

### 5.2.1 Page/Component Overview

Purpose:

- allow safe session termination

Location:

- top-right user menu in header

### 5.2.2 Component Structure

```text
[User Avatar / Username] ▼
  └── Logout
```

### 5.2.3 Logout Confirmation Dialog

```text
Title: Confirm Logout
Message: Are you sure you want to logout?

[Cancel] [Logout]
```

### 5.2.4 API Mapping

- `POST /auth/logout`

### 5.2.5 UX Rule

- even if backend returns auth/session error, frontend still clears local auth state and returns user to login

---

## 5.3 Session Bootstrap Behavior

### 5.3.1 Purpose

- restore authenticated session after refresh or app reopen
- validate whether stored token is still usable

### 5.3.2 Trigger

- app startup
- page refresh

### 5.3.3 Logic

1. Read token from local storage / auth store
2. If no token:
   - show Login page
3. If token exists:
   - call `GET /auth/me`
4. If success:
   - store `user`
   - render app shell
5. If failure:
   - clear local auth state
   - show Login page
   - show session-related error if applicable

---

## 6. Forms & Validation Design

## 6.1 Login Form

### Fields

| Field | Type | Required | Default | Validation |
| --- | --- | --- | --- | --- |
| Username | text | Yes | empty | trim, not empty |
| Password | password | Yes | empty | not empty |

### Grouping

- Credentials group:
  - Username
  - Password

### Inline Validation Behavior

- On blur:
  - validate required field
- On submit:
  - validate all fields
  - show inline errors under invalid fields
  - do not call API if validation fails

### Error Messages

| Case | Message |
| --- | --- |
| Username empty | `Username is required` |
| Password empty | `Password is required` |
| Invalid credentials | `Invalid username or password` |
| Inactive user | `User account is inactive` |
| Session expired | `Session expired. Please login again.` |
| Network failure | `Unable to connect. Please check network.` |
| System failure | `System error` |

### Submit Behavior

- Disable login button while request is in progress
- Show spinner inside button
- Prevent duplicate submit during loading

---

## 7. Table / List Design

Authentication scope does not require a full data table.

Minimal list-like structures:

- sidebar navigation items
- user menu items

### Sidebar Item Rules

| Item | Admin | Operator |
| --- | --- | --- |
| Dashboard | visible | visible |
| Map View | visible | visible |
| Camera View | visible | visible |
| Config | visible | hidden |
| Logs | visible | hidden |

---

## 8. Interaction Flows

## 8.1 Login Flow

```text
User enters credentials
 -> Frontend validates fields
 -> Call POST /auth/login
 -> If success:
      save token + user
      render app shell
      redirect to dashboard
 -> If fail:
      show mapped error
```

### Success Behavior

- store token
- optionally call or rely on `/auth/me` bootstrap data path if architecture requires
- redirect to protected landing page

### Failure Behavior

- keep user on Login page
- preserve entered username
- do not clear password automatically unless security policy later requires it

## 8.2 Logout Flow

```text
User clicks Logout
 -> Show confirm dialog
 -> If cancel: do nothing
 -> If confirm:
      call POST /auth/logout
      clear local auth state
      redirect to Login page
```

## 8.3 Session Expiry Flow

```text
App starts with stored token
 -> Call GET /auth/me
 -> If 401 SESSION_EXPIRED:
      clear auth state
      redirect Login
      show expiry message
```

## 8.4 Protected Route Flow

```text
User navigates to protected route
 -> If authenticated: allow access
 -> If not authenticated: redirect to Login
```

---

## 9. State Handling

## 9.1 Login Page States

| State | UI Behavior |
| --- | --- |
| Idle | inputs enabled, button enabled |
| Editing | inline validation may appear on blur |
| Loading | inputs optional enabled/disabled by team decision, login button disabled, spinner visible |
| Success | redirect to app shell |
| Validation Error | inline field messages visible |
| Auth Error | global alert visible |
| Network Error | global alert visible |
| Session Expired | global info/error message visible on login page |

## 9.2 App Shell States

| State | UI Behavior |
| --- | --- |
| Bootstrap loading | do not render protected content yet |
| Authenticated | render sidebar + header + route content |
| Auth invalid | redirect to login |
| Logging out | optionally disable logout action until complete |

## 9.3 Empty / Error States

| Area | Empty State | Error State |
| --- | --- | --- |
| Login form | not applicable | auth/network/system error banner |
| User menu | not applicable | if logout fails, still redirect after local clear |
| App bootstrap | not applicable | invalid session message on redirect |

---

## 10. Role-Based Behavior

## 10.1 Before Login

- no sidebar visible
- no protected pages accessible
- no app header visible

## 10.2 After Login - Admin

- full sidebar visible
- config and logs navigation visible
- all auth-protected areas available according to backend role

## 10.3 After Login - Operator

- dashboard visible
- map view visible
- camera view visible
- config hidden
- logs hidden

## 10.4 Hidden vs Disabled Rule

For Authentication-related navigation:

- use hidden, not disabled, for pages user should not know/access in MVP

---

## 11. Edge Case UX

### 11.1 Invalid Credentials

- stay on login page
- show global error
- keep username field value

### 11.2 Inactive User

- stay on login page
- show `User account is inactive`

### 11.3 Token Missing

- show login page immediately
- do not try to render protected shell

### 11.4 Session Expired

- clear local auth state
- redirect login
- show expiry message

### 11.5 Session Revoked

- treat same as invalid session from UX perspective
- clear local auth state
- redirect login

### 11.6 Network Failure During Login

- show retry-capable message
- keep entered values

### 11.7 Logout Failure

- still clear local auth state
- still redirect to login

### 11.8 Direct Access To Protected URL

- if not authenticated, redirect to login

---

## 12. Design System Guidelines

## 12.1 Buttons

| Type | Usage |
| --- | --- |
| Primary | Login, confirm primary action |
| Secondary | Cancel |
| Danger | Logout confirm |
| Ghost / Tertiary | user menu item if needed |

## 12.2 Colors

| Usage | Meaning |
| --- | --- |
| Green | success |
| Red | error / destructive |
| Orange | warning |
| Blue | info / focus |
| Neutral gray | borders, labels, muted text |

## 12.3 Badges

Authentication scope minimal:

- Role badge optional in header
- If shown:
  - `ADMIN` -> strong primary/neutral emphasis
  - `OPERATOR` -> secondary emphasis

## 12.4 Inputs

- Height: `40px` to `44px`
- Border radius: `6px` to `10px`
- Clear visible label above input
- Visible focus state with blue outline
- Error state with red border and caption

## 12.5 Typography

| Level | Usage |
| --- | --- |
| H1 | Login title / app title |
| H2 | Section titles |
| Body | field labels, content text |
| Caption | validation/error text |

## 12.6 Spacing

- 8px grid system
- Standard form spacing: `16px`
- Form group spacing: `20px` to `24px`

## 12.7 Icons

Recommended:

- user/avatar icon
- logout icon
- warning/error icon
- loading spinner

Icons must support:

- clear visual meaning
- accessible aria labeling when interactive

---

## 13. UX Improvements & Recommendations

### 13.1 Speed & Efficiency

- Auto-focus username field on login page
- Enter key submits login form
- Preserve username after failed login

### 13.2 Clarity

- Use both inline field validation and global auth error banner
- Keep credential errors generic
- Make session-expired message explicit

### 13.3 Safety

- Require confirmation before logout
- Do not expose protected UI before auth bootstrap finishes

### 13.4 Accessibility Basics

- every input must have visible label
- focus must be clearly visible
- buttons must have readable text
- error text must be near the affected field
- auth alerts should be screen-reader friendly

### 13.5 Implementation Recommendations

- Keep auth state in a dedicated `AuthProvider` / auth store
- Centralize token storage utility
- Centralize API error mapping for auth responses
- Use protected route wrapper instead of per-page manual checks
- Use one app shell layout for authenticated pages

---

## 14. Suggested Frontend Components

### Authentication Module

- `LoginPage`
- `LoginForm`
- `UsernameInput`
- `PasswordInput`
- `LoginButton`
- `AuthErrorAlert`
- `LogoutButton`
- `LogoutConfirmDialog`
- `ProtectedRoute`
- `AuthProvider`

### App Shell

- `AppLayout`
- `Sidebar`
- `Header`
- `UserMenu`
- `RoleAwareNav`

---

## 15. API-to-UI Mapping Summary

| UI Action | API | Success Effect | Error Effect |
| --- | --- | --- | --- |
| Login submit | `POST /auth/login` | store token, redirect | show auth/global error |
| Session bootstrap | `GET /auth/me` | render shell | clear auth, redirect login |
| Logout confirm | `POST /auth/logout` | clear auth, redirect | clear auth, redirect anyway |

---

## 16. Assumptions

1. Authentication is session-backed and uses JWT for access token transport.
2. Frontend stores token locally for MVP.
3. `/auth/me` is used to restore session state after reload.
4. Login redirect target for both roles is the same dashboard/monitoring entry page.
5. Role-based nav hiding is preferred over disabled menu items for admin-only pages.
6. No profile page is required in MVP even if user menu may later include it.
