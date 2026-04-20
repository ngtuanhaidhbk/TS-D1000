# 1. UI/UX Overview

## Purpose

Thiết kế UI/UX cho:

* Authentication (Login / Logout / Session)
* Role-Based Access (Admin vs Operator)
* Guard toàn bộ hệ thống theo role và session

## Roles

| Role     | Quyền          |
| -------- | -------------- |
| Admin    | Full access    |
| Operator | Limited access |

---

## Core UX Principles

* 🔐 **Security-first**: Auth guard mọi hành động
* ⚡ **Fast access**: Login nhanh, không bước thừa
* 🎯 **Role clarity**: UI phản ánh đúng quyền
* 🧠 **Low cognitive load**: ẩn chức năng không liên quan
* 🔄 **Consistent state handling**

---

# 2. Navigation Structure

## 2.1 App Entry

```text
App Start -> Login -> Auth Check -> Main App
```

---

## 2.2 Sidebar Structure (After Login)

### Admin

```text
Dashboard
Map View
Camera View
Manual Control
-----------------
User Management
System Config
Logs
```

### Operator

```text
Dashboard
Map View
Camera View
Manual Control
```

---

## 2.3 Top Navigation

| Element     | Description      |
| ----------- | ---------------- |
| App Name    | Left             |
| Room Name   | Center           |
| User Avatar | Right            |
| Dropdown    | Profile / Logout |

---

## 2.4 Breadcrumb

```text
Dashboard / Camera / Control
```

---

# 3. Page Map

```text
Login Page
   ↓
Auth Bootstrap (/auth/me)
   ↓
Main Layout
   ├── Dashboard
   ├── Map View
   ├── Camera View
   ├── Manual Control
   ├── User Management (Admin)
   ├── Config (Admin)
   └── Logs (Admin)
```

---

# 4. Page-by-Page Design

---

# 4.1 Login Page

## 1. Overview

* đăng nhập hệ thống

## 2. Layout

```text
Centered Card
  Logo
  Title
  Username
  Password
  Login Button
  Error
```

---

## 3. Components

| Component | Type    |
| --------- | ------- |
| Input     | text    |
| Password  | masked  |
| Button    | primary |
| Alert     | error   |

---

## 4. Data Mapping

| UI       | Backend        |
| -------- | -------------- |
| username | users.username |
| password | login API      |

API:

```text
POST /auth/login
```

---

---

# 4.2 Main Layout (Authenticated)

## Layout Structure

```text
[Sidebar] [Main Content]
         [Top Bar]
```

---

## Components

| Component    | Description  |
| ------------ | ------------ |
| Sidebar      | navigation   |
| Header       | user info    |
| Content Area | page content |

---

## Role-Based Behavior

| Component       | Admin | Operator |
| --------------- | ----- | -------- |
| User Management | ✔     | ❌        |
| Config          | ✔     | ❌        |
| Logs            | ✔     | ❌        |

---

# 4.3 User Avatar Menu

## Layout

```text
Avatar ▼
  ├── Username
  └── Logout
```

---

## Interaction

* Click Logout → confirm modal

---

# 4.4 Unauthorized Page

## Purpose

Hiển thị khi user không có quyền

## UI

```text
🚫 Access Denied
"You do not have permission"
[Back]
```

---

# 5. Forms & Validation Design

---

## 5.1 Login Form

| Field    | Type     | Required |
| -------- | -------- | -------- |
| Username | text     | ✔        |
| Password | password | ✔        |

---

## Validation

### Inline

* blur → check empty

### Submit

* highlight error

---

## Error Messages

| Case           | Message                      |
| -------------- | ---------------------------- |
| empty username | Username is required         |
| empty password | Password is required         |
| invalid        | Invalid username or password |
| inactive       | User account is inactive     |

---

# 6. Table/List Design

(Authentication module không có table lớn)

→ chỉ có:

* user menu
* minimal session info

---

# 7. Interaction Flows

---

## 7.1 Login Flow

```text
Input → Validate → API → Success → Redirect
```

---

## 7.2 Logout Flow

```text
Click Logout → Confirm → API → Clear → Login
```

---

## 7.3 Auth Guard Flow

```text
Request → Check token
        ↓
Valid → allow
Invalid → redirect login
```

---

## 7.4 Role Guard Flow

```text
User action → check role
        ↓
Allowed → execute
Denied → show error
```

---

# 8. State Handling

## Login Page

| State   | UI             |
| ------- | -------------- |
| idle    | form           |
| loading | button spinner |
| error   | alert          |
| success | redirect       |

---

## App State

| State           | Behavior       |
| --------------- | -------------- |
| not logged in   | redirect login |
| logged in       | show app       |
| session expired | redirect login |
| unauthorized    | show 403 page  |

---

# 9. 🔐 Role-Based UI Behavior

---

## 9.1 Visibility Rules

| Feature        | Admin | Operator |
| -------------- | ----- | -------- |
| Dashboard      | ✔     | ✔        |
| Camera         | ✔     | ✔        |
| Manual Control | ✔     | ✔        |
| User Mgmt      | ✔     | ❌        |
| Config         | ✔     | ❌        |
| Logs           | ✔     | ❌        |

---

## 9.2 Interaction Rules

| Action                 | Admin | Operator |
| ---------------------- | ----- | -------- |
| Login                  | ✔     | ✔        |
| Logout                 | ✔     | ✔        |
| Access restricted page | ✔     | ❌        |

---

## 9.3 UI Handling

| Case              | Behavior        |
| ----------------- | --------------- |
| No permission     | hide menu       |
| Direct URL access | show 403        |
| Button restricted | disable or hide |

---

# 10. ⚠️ Edge Case UX

---

## 1. Invalid Login

* show error message
* keep input

---

## 2. Session Expired

* redirect login
* show:

```text
Session expired. Please login again.
```

---

## 3. Unauthorized Access

* show 403 page

---

## 4. Network Error

```text
Cannot connect to server
```

---

## 5. Token Corrupted

* force logout

---

# 11. 🎨 Design System Guidelines

---

## Buttons

| Type      | Usage  |
| --------- | ------ |
| Primary   | Login  |
| Secondary | Cancel |
| Danger    | Logout |

---

## Colors

| State   | Color  |
| ------- | ------ |
| Success | Green  |
| Error   | Red    |
| Warning | Orange |
| Info    | Blue   |

---

## Inputs

* height: 40px
* border-radius: 6px
* focus: blue outline

---

## Typography

| Level   | Usage      |
| ------- | ---------- |
| H1      | page title |
| H2      | section    |
| Body    | text       |
| Caption | error      |

---

## Icons

| Icon | Usage         |
| ---- | ------------- |
| 🔒   | login         |
| 👤   | user          |
| 🚫   | access denied |

---

# 12. 🚀 UX Optimization

---

## 1. Fast Login

* auto focus
* Enter submit

---

## 2. Reduce Errors

* inline validation
* clear messages

---

## 3. Role Awareness

* hide irrelevant UI

---

## 4. Security UX

* generic error message
* no info leak

---

## 5. Smooth Session Handling

* silent redirect
* no broken screen

---

## 6. Accessibility

* keyboard support
* label inputs
* contrast readable

---

# 13. 📦 Frontend Implementation Notes

---

## Auth State

```ts
auth = {
  user: {
    id: string
    username: string
    role: "ADMIN" | "OPERATOR"
  },
  token: string
}
```

---

## Guards

### Auth Guard

```ts
if (!token) redirect('/login')
```

### Role Guard

```ts
if (user.role !== 'ADMIN') show403()
```

---

## Key Components

* LoginPage
* AuthProvider
* ProtectedRoute
* RoleGuard
* LogoutModal

---

# 14. ✅ Final Summary

UI/UX đã đảm bảo:

✔ Align với UC + Detail Design
✔ Role-based access rõ ràng
✔ Auth guard + role guard đầy đủ
✔ Không over-design
✔ Ready cho React implement

---

# 👉 Nếu bạn muốn đi tiếp

Mình đề xuất bước tiếp theo:

👉 Design UI/UX cho:

* **🎛️ Manual Control (core nhất hệ thống)**
* **🗺️ Map View (highlight + realtime)**
* **🎥 Camera Control UI**

Các phần này mới là “trái tim” của product — mình có thể design sâu như Figma spec cho dev code luôn.
