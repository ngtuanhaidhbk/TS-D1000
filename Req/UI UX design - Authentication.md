# UI/UX Design - Module Authentication

Implementation-ready, bam sat Requirement + UC + Detail Design.

---

## 1. UI/UX Overview - Authentication

### Purpose

Module Authentication cho phep:

- User dang nhap he thong
- Xac thuc quyen (Admin / Operator)
- Kiem soat truy cap vao toan bo he thong

### Scope

- Login
- Logout
- Session handling (frontend behavior)

### Roles

| Role | Behavior |
| --- | --- |
| Admin | Full access |
| Operator | Limited access |

---

## 2. Navigation Structure

### Entry Point

```text
App Start -> Login Page
```

### Post-login Routing

| Role | Landing Page |
| --- | --- |
| Admin | Dashboard / Monitoring |
| Operator | Dashboard / Monitoring |

### Global Navigation Behavior

- Khi chua login:
  - Khong hien thi sidebar
  - Khong truy cap API
- Khi login:
  - Load user info
  - Render sidebar theo role

---

## 3. Page Map - Authentication

```text
Login Page
   ↓
Main App
   ├── Dashboard
   ├── Map View
   ├── Camera View
   ├── Config (Admin only)
   └── Logs (Admin only)
```

---

## 4. Page-by-Page Design

### 4.1 Login Page

#### 1. Page Overview

**Purpose**

- Cho phep user dang nhap

**Main Actions**

- Nhap username/password
- Login

#### 2. Layout

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

#### 3. Components

| Component | Type | Description |
| --- | --- | --- |
| Username Input | text | nhap username |
| Password Input | password | masked input |
| Login Button | primary | submit form |
| Error Message | alert | hien thi loi |
| Loading Spinner | overlay/button | khi dang login |

#### 4. Data Mapping

| UI Field | Backend Field |
| --- | --- |
| username | users.username |
| password | users.password |

##### API Mapping

```text
POST /api/v1/auth/login
```

---

## 5. Form Design - Login

### Fields

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| Username | text | Yes | not empty |
| Password | password | Yes | not empty |

### Validation Behavior

#### Inline

- blur -> validate required

#### Submit

- neu thieu field:
  - highlight do
  - show message duoi field

### Error Messages

| Case | Message |
| --- | --- |
| Empty username | "Username is required" |
| Empty password | "Password is required" |
| Wrong credential | "Invalid username or password" |
| Inactive user | "User account is inactive" |

### Loading State

- Disable button
- Show spinner inside button

### Success Flow

1. Login success
2. Store token
3. Redirect -> Dashboard

---

## 6. Logout Design

### Trigger Locations

- Top right avatar menu

### UI

```text
[User Avatar] ▼
   ├── Profile (optional)
   └── Logout
```

### Interaction

#### Click Logout

1. Show confirm dialog:

```text
"Are you sure you want to logout?"
[Cancel] [Logout]
```

2. If confirm:
- call API `/auth/logout`
- clear token
- redirect Login

---

## 7. Interaction Design

### Login Flow

```text
User Input -> Click Login
        ↓
Frontend validate
        ↓
Call API
        ↓
Success -> redirect
Fail -> show error
```

### Error Handling

| Scenario | UI Behavior |
| --- | --- |
| API 401 | show error message |
| API 500 | show "System error" |
| Network fail | show retry message |

---

## 8. State Handling

### Login Page

| State | UI |
| --- | --- |
| Idle | form enabled |
| Loading | button loading |
| Error | error alert |
| Success | redirect |

---

## 9. Role-Based UI Behavior

### Before Login

- Khong hien thi bat ky module nao

### After Login

#### Admin

- full sidebar

#### Operator

- hide:
  - User Management
  - Config pages
  - Logs

---

## 10. Edge Case UX

### 1. Token Expired

- Auto redirect Login
- Show message:

> "Session expired. Please login again."

### 2. API Timeout

- Show:

> "Unable to connect. Please check network."

### 3. Multiple Login (future)

- Not implemented MVP
- assumption: overwrite session

### 4. Invalid State

- user inactive -> block login

---

## 11. Design System Guidelines

### Buttons

| Type | Usage |
| --- | --- |
| Primary | Login |
| Secondary | Cancel |
| Danger | Logout confirm |

### Colors

| State | Color |
| --- | --- |
| Success | Green |
| Error | Red |
| Warning | Orange |
| Info | Blue |

### Inputs

- Height: 40px
- Border radius: 6px
- Focus: blue outline

### Typography

| Level | Usage |
| --- | --- |
| H1 | App title |
| H2 | Page title |
| Body | form text |
| Caption | error message |

### Spacing

- 8px grid system
- Form spacing: 16px

---

## 12. UX Optimization

### Key Improvements

#### 1. Fast Login

- auto focus username
- Enter = submit

#### 2. Error Clarity

- show error duoi input + global alert

#### 3. Minimal Steps

- khong co step trung gian

#### 4. Security UX

- hide password toggle
- disable brute force (future)

#### 5. Accessibility

- label for inputs
- keyboard navigation
- focus visible

---

## 13. Summary for Frontend Dev

### Components Needed

- LoginForm
- InputField
- PasswordField
- Button
- Alert
- Spinner
- ConfirmDialog

### API Needed

- POST `/auth/login`
- POST `/auth/logout`

### State Needed

```ts
auth = {
  token: string
  user: {
    id
    username
    role
  }
  isAuthenticated: boolean
}
```

---

## Next Step

Neu ban muon di tiep chuan Product + UX flow, cac phan tiep theo hop ly la:

1. Dashboard + Map UI
2. Camera Control UI
3. Manual Mode Control Panel
4. Admin Config UI

Co the tiep tuc theo muc do implementation-ready cho React frontend.
