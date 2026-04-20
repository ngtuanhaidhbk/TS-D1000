# API Contract

System: Desktop Meeting Control Application for TS-D1000 + PTZ Cameras  
Scope: MVP for single room, on-premise LAN deployment

This API contract is derived from:

- Requirement and context documents in `Req`
- Use cases in `Req/Use cases.md`
- System detail design in `Req/Detail design document.md`
- Authentication detail design in `Req/Detail design - Authentication.md`

If a rule is not explicit in those documents, it is marked as an assumption.

---

## 1. Overview

### 1.1 API Goals

The API must:

- support authentication and authorization
- expose configuration and operational APIs for a single meeting room MVP
- align with the runtime and business rules in the detailed design
- be predictable for frontend and backend development
- support documentation and future OpenAPI-driven tooling

### 1.2 Base Rules

- Base URL: `/api/v1`
- Request/response JSON uses `camelCase`
- Database fields use `snake_case`
- Protected APIs require `Authorization: Bearer <token>`
- Success response wrapper:

```json
{
  "success": true,
  "data": {}
}
```

- Error response wrapper:

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

### 1.3 Roles

- `ADMIN`
- `OPERATOR`

### 1.4 Access Model

- `ADMIN`: full system access
- `OPERATOR`: runtime operation, camera control, live view, and manual speaking workflow only

---

## 2. Modules & Endpoints List

| Module | Related UC | Endpoints |
| --- | --- | --- |
| Authentication | UC-AUTH-01, UC-AUTH-02 | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| User Management | UC-USER-01..04 | `GET /users`, `POST /users`, `PUT /users/{id}`, `PATCH /users/{id}/status` |
| Layout & Map | UC-LAYOUT-01..03 | `POST /rooms/{roomId}/layout`, `PUT /rooms/{roomId}/layout/devices`, `POST /rooms/{roomId}/annotations`, `PUT /annotations/{id}` |
| TS-D1000 | UC-TSD-01..03 | `PUT /rooms/{roomId}/tsd/connection`, `POST /rooms/{roomId}/tsd/test-connection`, `POST /rooms/{roomId}/tsd/sync-units`, `GET /rooms/{roomId}/operation-mode`, `PUT /rooms/{roomId}/operation-mode` |
| Cameras | UC-CAM-01..04, UC-PTZ-01..02 | `GET /rooms/{roomId}/cameras`, `POST /rooms/{roomId}/cameras`, `PUT /cameras/{id}`, `POST /cameras/{id}/test-connection`, `GET /cameras/{id}/presets`, `POST /cameras/{id}/presets`, `PUT /presets/{id}`, `POST /cameras/{id}/recall-preset`, `POST /cameras/{id}/ptz` |
| Mapping | UC-MAP-01..03 | `GET /rooms/{roomId}/mappings`, `POST /rooms/{roomId}/mappings`, `PUT /mappings/{id}` |
| Manual Speaking | UC-MANUAL-01..03 | `GET /rooms/{roomId}/speaking-requests`, `POST /speaking-requests/{id}/approve`, `POST /speaking-requests/{id}/reject` |
| Live View | UC-VIDEO-01..02 | `GET /rooms/{roomId}/live-view/config`, `PUT /rooms/{roomId}/live-view/layout` |
| Logs | UC-LOG-01, UC-LOG-02 | `GET /audit-logs`, `GET /system-logs` |
| Health | Supporting | `GET /health` |

---

## 3. Naming Conventions

### 3.1 JSON Naming

- `camelCase` for request/response payloads
- Examples:
  - `userId`
  - `operationMode`
  - `requestedAt`
  - `lastTestResult`

### 3.2 Database Mapping

- `snake_case` in persistence
- Examples:
  - `user_id`
  - `operation_mode`
  - `requested_at`
  - `last_test_result`

### 3.3 Resource Naming

- plural nouns for collections
- singular path parameter names
- command-style subpaths only when action semantics are required

Examples:

- `/users`
- `/rooms/{roomId}/cameras`
- `/speaking-requests/{id}/approve`

---

## 4. Common Schemas

### 4.1 User

| JSON Field | Type | DB Field | Notes |
| --- | --- | --- | --- |
| `id` | string UUID | `id` | Primary key |
| `username` | string | `username` | Case-insensitive unique |
| `role` | enum | `role` | `ADMIN` or `OPERATOR` |
| `status` | enum | `status` | `ACTIVE` or `INACTIVE` |
| `createdAt` | datetime | `created_at` | UTC ISO 8601 |

### 4.2 Pagination

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Assumption:

- The source design documents explicitly define pagination format, but do not assign pagination to every list endpoint.
- For MVP, pagination is strongly recommended for logs and user lists. For small room-scoped lists like mappings and cameras, it may remain optional.

---

## 5. Detailed API Specification

## 5.1 Authentication

### POST `/auth/login`

**Description**  
Authenticate a user with local credentials and create a session-backed access token.

**Related UC**  
UC-AUTH-01

**Authorization**  
Public

**Request Body**

| Field | Type | Required | Validation | DB Mapping |
| --- | --- | --- | --- | --- |
| `username` | string | Yes | trim, not empty | `users.username` |
| `password` | string | Yes | not empty | compared with `users.password_hash` |

**Example Request**

```json
{
  "username": "admin",
  "password": "StrongPass123"
}
```

**Success Response**

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
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

**Validation Rules**

- `username` required
- `password` required
- username lookup is case-insensitive

**Business Rules**

- only `ACTIVE` users may log in
- invalid username and invalid password must return the same error category
- successful login creates a new active session

**Error Cases**

| HTTP | Code | Condition |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | missing or blank fields |
| 401 | `INVALID_CREDENTIALS` | unknown username or wrong password |
| 403 | `USER_INACTIVE` | user exists but inactive |
| 500 | `INTERNAL_ERROR` | token/session/system failure |

**Side Effects**

- create `auth_sessions` row
- write audit log `LOGIN`

---

### POST `/auth/logout`

**Description**  
Revoke the current authenticated session.

**Related UC**  
UC-AUTH-02

**Authorization**  
`ADMIN`, `OPERATOR`

**Request Body**  
Empty

**Success Response**

```json
{
  "success": true,
  "data": {
    "message": "Logged out"
  }
}
```

**Business Rules**

- only active session may be revoked successfully
- logout is idempotent at UX level; frontend must clear local state even if backend returns auth failure

**Error Cases**

| HTTP | Code | Condition |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | missing/invalid token |
| 401 | `SESSION_EXPIRED` | expired session |
| 401 | `SESSION_REVOKED` | revoked session |
| 500 | `INTERNAL_ERROR` | system failure |

**Side Effects**

- set session status to revoked
- write audit log `LOGOUT`

---

### GET `/auth/me`

**Description**  
Return the currently authenticated user and session context.

**Authorization**  
`ADMIN`, `OPERATOR`

**Success Response**

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

**Error Cases**

| HTTP | Code | Condition |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | invalid token |
| 401 | `SESSION_EXPIRED` | expired session |
| 401 | `SESSION_REVOKED` | revoked session |
| 403 | `USER_INACTIVE` | user deactivated after login |

---

## 5.2 User Management

### GET `/users`

**Description**  
Return the list of managed users.

**Related UC**  
UC-USER-03

**Authorization**  
`ADMIN`

**Query Parameters**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `page` | integer | No | default `1` |
| `pageSize` | integer | No | default `20` |
| `search` | string | No | username filter |
| `status` | enum | No | `ACTIVE` / `INACTIVE` |
| `role` | enum | No | `ADMIN` / `OPERATOR` |
| `sortBy` | string | No | default `createdAt` |
| `sortOrder` | enum | No | `asc` / `desc` |

**Success Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "username": "operator1",
        "role": "OPERATOR",
        "status": "ACTIVE",
        "createdAt": "2026-04-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### POST `/users`

**Description**  
Create a new user.

**Related UC**  
UC-USER-01

**Authorization**  
`ADMIN`

**Request Body**

| Field | Type | Required | Validation | DB Mapping |
| --- | --- | --- | --- | --- |
| `username` | string | Yes | trim, unique, 3-100 chars | `username` |
| `password` | string | Yes | min 8 chars | hashed to `password_hash` |
| `role` | enum | Yes | `ADMIN` / `OPERATOR` | `role` |
| `status` | enum | Yes | `ACTIVE` / `INACTIVE` | `status` |

**Example Request**

```json
{
  "username": "operator1",
  "password": "StrongPass123",
  "role": "OPERATOR",
  "status": "ACTIVE"
}
```

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "uuid"
  }
}
```

**Validation Rules**

- username required and unique case-insensitively
- password min 8
- role must be supported enum
- status must be supported enum

**Error Cases**

| HTTP | Code | Condition |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | invalid body |
| 409 | `USERNAME_ALREADY_EXISTS` | duplicate username |
| 403 | `FORBIDDEN` | non-admin actor |

**Side Effects**

- hash password
- write audit log `CREATE_USER`

---

### PUT `/users/{id}`

**Description**  
Update user attributes.

**Related UC**  
UC-USER-02

**Authorization**  
`ADMIN`

**Path Params**

| Field | Type | Required |
| --- | --- | --- |
| `id` | UUID | Yes |

**Request Body**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `password` | string | No | min 8 if provided |
| `role` | enum | No | `ADMIN` / `OPERATOR` |
| `status` | enum | No | `ACTIVE` / `INACTIVE` |

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "uuid"
  }
}
```

**Error Cases**

| HTTP | Code | Condition |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | invalid body |
| 404 | `USER_NOT_FOUND` | user does not exist |

**Side Effects**

- write audit log `UPDATE_USER`

---

### PATCH `/users/{id}/status`

**Description**  
Activate or deactivate a user account.

**Related UC**  
UC-USER-04

**Authorization**  
`ADMIN`

**Request Body**

```json
{
  "status": "INACTIVE"
}
```

**Business Rules**

- deactivated users cannot log in
- system cannot be left without an active admin

**Error Cases**

| HTTP | Code | Condition |
| --- | --- | --- |
| 404 | `USER_NOT_FOUND` | target missing |
| 422 | `LAST_ACTIVE_ADMIN` | trying to deactivate last active admin |

**Side Effects**

- write audit log `ACTIVATE_USER` or `DEACTIVATE_USER`

---

## 5.3 Layout & Map

### POST `/rooms/{roomId}/layout`

**Description**  
Upload room layout file.

**Related UC**  
UC-LAYOUT-01

**Authorization**  
`ADMIN`

**Content-Type**  
`multipart/form-data`

**Form Data**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `file` | file | Yes | extension `PDF` / `JPG` / `JPEG` |

**Success Response**

```json
{
  "success": true,
  "data": {
    "layoutId": "uuid",
    "fileName": "layout.pdf",
    "fileType": "PDF"
  }
}
```

**Side Effects**

- store layout file locally
- upsert layout record
- write audit log `UPLOAD_LAYOUT`

---

### PUT `/rooms/{roomId}/layout/devices`

**Description**  
Save device positions on current layout.

**Related UC**  
UC-LAYOUT-02

**Authorization**  
`ADMIN`

**Request Body**

```json
{
  "devices": [
    {
      "refType": "TSD_UNIT",
      "refId": "unit-uuid",
      "posX": 0.35,
      "posY": 0.52,
      "iconLabel": "Delegate 01"
    },
    {
      "refType": "CAMERA",
      "refId": "camera-uuid",
      "posX": 0.1,
      "posY": 0.2,
      "iconLabel": "Cam A"
    }
  ]
}
```

**Validation Rules**

- layout must exist
- `refType` must be `TSD_UNIT` or `CAMERA`
- `refId` must exist for the selected type
- `posX`, `posY` range `0..1`

**Side Effects**

- upsert `layout_devices`
- optionally remove stale positions only if full replacement semantics are used
- write audit log `UPDATE_LAYOUT`

---

### POST `/rooms/{roomId}/annotations`

**Description**  
Create a layout annotation.

**Related UC**  
UC-LAYOUT-03

**Authorization**  
`ADMIN`

**Request Body**

```json
{
  "text": "Main table",
  "posX": 0.45,
  "posY": 0.3
}
```

**Validation Rules**

- `text` non-empty
- `posX`, `posY` range `0..1`

---

### PUT `/annotations/{id}`

**Description**  
Update an existing annotation.

**Related UC**  
UC-LAYOUT-03

**Authorization**  
`ADMIN`

**Assumption**

- The design source lists this endpoint but the later `v2` document is truncated before the example body.
- Update semantics are assumed to mirror create semantics with full replacement of `text`, `posX`, `posY`.

---

## 5.4 TS-D1000

### PUT `/rooms/{roomId}/tsd/connection`

**Description**  
Save TS-D1000 connection configuration.

**Related UC**  
UC-TSD-01

**Authorization**  
`ADMIN`

**Request Body**

```json
{
  "baseUrl": "http://192.168.1.10",
  "username": "admin",
  "password": "secret",
  "sseEndpoint": "/api/event"
}
```

**Validation Rules**

- `baseUrl` required
- `sseEndpoint` required

**Side Effects**

- encrypt password at rest
- write audit log

---

### POST `/rooms/{roomId}/tsd/test-connection`

**Description**  
Perform a TS-D1000 connectivity test.

**Authorization**  
`ADMIN`

**Success Response**

```json
{
  "success": true,
  "data": {
    "result": "SUCCESS"
  }
}
```

**Integration Error Cases**

| HTTP | Code | Condition |
| --- | --- | --- |
| 502 | `TSD_CONNECTION_FAILED` | adapter/HTTP failure |
| 503 | `TSD_UNAVAILABLE` | timeout/unreachable |

**Side Effects**

- update last test metadata
- write system log

---

### POST `/rooms/{roomId}/tsd/sync-units`

**Description**  
Load or refresh the TS-D unit list from the device.

**Related UC**  
UC-TSD-02

**Authorization**  
`ADMIN`

**Success Response**

```json
{
  "success": true,
  "data": {
    "synced": 24
  }
}
```

**Business Rules**

- upsert units by `(roomId, externalUnitId)`
- chairman/delegate type must be mapped when provided by source

**Side Effects**

- write audit log
- write system log

---

### GET `/rooms/{roomId}/operation-mode`

**Description**  
Return the room operation mode.

**Authorization**  
`ADMIN`, `OPERATOR`

**Success Response**

```json
{
  "success": true,
  "data": {
    "mode": "MANUAL"
  }
}
```

---

### PUT `/rooms/{roomId}/operation-mode`

**Description**  
Switch room mode between manual and automatic.

**Related UC**  
UC-TSD-03, UC-MODE-01

**Authorization**  
`ADMIN`

**Request Body**

```json
{
  "mode": "MANUAL"
}
```

**Validation Rules**

- `mode` must be `MANUAL` or `AUTOMATIC`

**State Rules**

- exactly one active mode per room
- mode change affects runtime behavior for new incoming events immediately
- existing pending manual requests remain visible unless later policy changes

**Side Effects**

- update room operation mode
- write audit log `CHANGE_MODE`

---

## 5.5 Cameras

### GET `/rooms/{roomId}/cameras`

**Description**  
List configured cameras for a room.

**Authorization**  
`ADMIN`, `OPERATOR`

**Success Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Camera 1",
        "protocol": "ONVIF",
        "ipAddress": "192.168.1.20",
        "status": "ACTIVE",
        "capabilities": {
          "ptz": true,
          "preset": true,
          "stream": true
        }
      }
    ]
  }
}
```

Assumption:

- Pagination is optional for the MVP because the room limit is 4 cameras.

---

### POST `/rooms/{roomId}/cameras`

**Description**  
Add a camera to the room.

**Related UC**  
UC-CAM-01

**Authorization**  
`ADMIN`

**Request Body**

```json
{
  "name": "Camera 1",
  "protocol": "ONVIF",
  "ipAddress": "192.168.1.20",
  "port": 80,
  "username": "admin",
  "password": "secret",
  "rtspUrl": "rtsp://192.168.1.20/stream1",
  "vendor": "Hikvision",
  "model": "DS-2DE"
}
```

**Validation Rules**

- `name` required
- `protocol` in `ONVIF`, `VISCA`
- `ipAddress` required
- `port` between `1..65535` if provided
- room may not exceed 4 cameras in MVP

**Business Rules**

- camera uniqueness scoped by `(roomId, ipAddress, port)`

**Error Cases**

| HTTP | Code | Condition |
| --- | --- | --- |
| 409 | `MAX_CAMERAS_EXCEEDED` | room already has 4 cameras |
| 409 | `CAMERA_ALREADY_EXISTS` | duplicate camera endpoint |

**Side Effects**

- create camera runtime state
- write audit log `ADD_CAMERA`

---

### PUT `/cameras/{id}`

**Description**  
Update camera configuration.

**Related UC**  
UC-CAM-02

**Authorization**  
`ADMIN`

**Validation**

- same field rules as create for provided fields

**Side Effects**

- write audit log `UPDATE_CAMERA`

---

### POST `/cameras/{id}/test-connection`

**Description**  
Test camera connectivity and detect capabilities.

**Related UC**  
UC-CAM-03

**Authorization**  
`ADMIN`

**Success Response**

```json
{
  "success": true,
  "data": {
    "result": "PARTIAL",
    "capabilities": {
      "ptz": true,
      "preset": true,
      "stream": false
    }
  }
}
```

**Business Rules**

- must distinguish `SUCCESS`, `PARTIAL`, `FAILED`

**Side Effects**

- update stored capability flags
- update last test metadata
- write audit log and system log

---

### GET `/cameras/{id}/presets`

**Description**  
List presets for a camera.

**Authorization**  
`ADMIN`, `OPERATOR`

**Success Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "presetCode": "P01",
        "presetName": "Delegate 01"
      }
    ]
  }
}
```

---

### POST `/cameras/{id}/presets`

**Description**  
Create a preset for a camera.

**Related UC**  
UC-CAM-04

**Authorization**  
`ADMIN`

**Request Body**

```json
{
  "presetCode": "P01",
  "presetName": "Delegate 01"
}
```

**Validation Rules**

- `presetCode` required
- unique per camera

**Business Rules**

- if adapter supports remote preset save, device save occurs before DB persistence
- camera must support preset capability

**Side Effects**

- write audit log `SAVE_PRESET`

---

### PUT `/presets/{id}`

**Description**  
Update preset metadata.

**Authorization**  
`ADMIN`

**Assumption**

- Update body mirrors preset create fields and is limited to metadata unless camera-specific remote update is supported.

---

### POST `/cameras/{id}/recall-preset`

**Description**  
Recall a preset on a camera.

**Related UC**  
UC-PTZ-01

**Authorization**  
`ADMIN`, `OPERATOR`

**Request Body**

```json
{
  "presetId": "preset-uuid"
}
```

**Business Rules**

- preset must belong to the target camera
- camera must be active

**Side Effects**

- update `camera_runtime_states`
- write audit log `RECALL_PRESET`

---

### POST `/cameras/{id}/ptz`

**Description**  
Send manual PTZ command to a camera.

**Related UC**  
UC-PTZ-02

**Authorization**  
`ADMIN`, `OPERATOR`

**Request Body**

```json
{
  "action": "PAN_LEFT",
  "speed": 0.5,
  "durationMs": 300
}
```

**Validation Rules**

- `action` must be supported PTZ action
- `speed` range `0..1`
- `durationMs > 0` when required

**Business Rules**

- camera must support PTZ capability

**Side Effects**

- write audit log `PTZ_CONTROL`

---

## 5.6 Mapping

### GET `/rooms/{roomId}/mappings`

**Description**  
List mic-camera mappings for a room.

**Related UC**  
UC-MAP-03

**Authorization**  
`ADMIN`

---

### POST `/rooms/{roomId}/mappings`

**Description**  
Create a mic-camera-preset mapping.

**Related UC**  
UC-MAP-01

**Authorization**  
`ADMIN`

**Request Body**

```json
{
  "unitId": "unit-uuid",
  "cameraId": "camera-uuid",
  "presetId": "preset-uuid"
}
```

**Validation Rules**

- `unitId` exists in room
- `cameraId` exists in room
- `presetId` belongs to `cameraId`

**Business Rules**

- one active mapping per unit
- implementation may deactivate the previous active mapping or reject if strict mode is chosen

**Error Cases**

| HTTP | Code | Condition |
| --- | --- | --- |
| 422 | `PRESET_CAMERA_MISMATCH` | preset not owned by camera |
| 409 | `ACTIVE_MAPPING_EXISTS` | if strict conflict strategy is used |

**Side Effects**

- write audit log `CREATE_MAPPING`

---

### PUT `/mappings/{id}`

**Description**  
Update existing mapping.

**Related UC**  
UC-MAP-02

**Authorization**  
`ADMIN`

**Request Body**

```json
{
  "cameraId": "camera-uuid",
  "presetId": "preset-uuid",
  "isActive": true
}
```

**Validation Rules**

- if provided, `presetId` must belong to `cameraId`

**Side Effects**

- enforce one active mapping per unit
- write audit log `UPDATE_MAPPING`

---

## 5.7 Manual Speaking

### GET `/rooms/{roomId}/speaking-requests`

**Description**  
List speaking requests, commonly filtered by pending status.

**Related UC**  
UC-MANUAL-01

**Authorization**  
`ADMIN`, `OPERATOR`

**Query Parameters**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `status` | enum | No | typically `PENDING` |
| `page` | integer | No | optional pagination |
| `pageSize` | integer | No | optional pagination |

**Business Rules**

- primarily meaningful in `MANUAL` mode
- pending queue sorted by `requestedAt ASC`

---

### POST `/speaking-requests/{id}/approve`

**Description**  
Approve a pending speaking request.

**Related UC**  
UC-MANUAL-02

**Authorization**  
`ADMIN`, `OPERATOR`

**Request Body**

```json
{
  "note": "Approved by operator"
}
```

**Business Rules**

- room must be `MANUAL`
- request must be `PENDING`
- camera is triggered only after actual active speaker confirmation, unless TS-D API guarantees immediate speaking activation

**Success Response**

```json
{
  "success": true,
  "data": {
    "status": "APPROVED"
  }
}
```

**Error Cases**

| HTTP | Code | Condition |
| --- | --- | --- |
| 404 | `SPEAKING_REQUEST_NOT_FOUND` | missing request |
| 422 | `REQUEST_NOT_PENDING` | invalid request state |
| 422 | `ROOM_NOT_MANUAL` | invalid room mode |
| 502 | `TSD_COMMAND_FAILED` | integration failure |

**Side Effects**

- write audit log `APPROVE_REQUEST`

---

### POST `/speaking-requests/{id}/reject`

**Description**  
Reject a pending speaking request.

**Related UC**  
UC-MANUAL-03

**Authorization**  
`ADMIN`, `OPERATOR`

**Request Body**

```json
{
  "note": "Rejected by operator"
}
```

**Business Rules**

- room must be `MANUAL`
- request must be `PENDING`
- no camera action must be triggered

**Side Effects**

- write audit log `REJECT_REQUEST`

---

## 5.8 Live View

### GET `/rooms/{roomId}/live-view/config`

**Description**  
Return live view layout configuration and stream-capable cameras.

**Related UC**  
UC-VIDEO-01

**Authorization**  
`ADMIN`, `OPERATOR`

**Success Response**

```json
{
  "success": true,
  "data": {
    "maxViews": 4,
    "selectedLayout": 4,
    "cameras": [
      {
        "cameraId": "uuid",
        "name": "Camera 1",
        "rtspUrl": "rtsp://..."
      }
    ]
  }
}
```

---

### PUT `/rooms/{roomId}/live-view/layout`

**Description**  
Change live view layout and selected cameras.

**Related UC**  
UC-VIDEO-02

**Authorization**  
`ADMIN`, `OPERATOR`

**Request Body**

```json
{
  "layout": 4,
  "cameraIds": ["cam1", "cam2", "cam3", "cam4"]
}
```

**Validation Rules**

- `layout` in `1`, `2`, `3`, `4`
- selected camera count must be `<= layout`
- selected camera count must be `<= 4`
- selected camera IDs must belong to room

---

## 5.9 Logs

### GET `/audit-logs`

**Description**  
Return audit logs.

**Related UC**  
UC-LOG-02

**Authorization**  
`ADMIN`

**Query Parameters**

| Field | Type | Required |
| --- | --- | --- |
| `actorUserId` | UUID | No |
| `action` | string | No |
| `from` | datetime | No |
| `to` | datetime | No |
| `page` | integer | No |
| `pageSize` | integer | No |
| `sortBy` | string | No |
| `sortOrder` | enum | No |

**Success Response**

Uses paginated response wrapper.

---

### GET `/system-logs`

**Description**  
Return system logs.

**Authorization**  
`ADMIN`

**Query Parameters**

| Field | Type | Required |
| --- | --- | --- |
| `module` | string | No |
| `level` | enum | No |
| `from` | datetime | No |
| `to` | datetime | No |
| `page` | integer | No |
| `pageSize` | integer | No |

---

## 5.10 Health

### GET `/health`

**Description**  
Application health endpoint.

**Authorization**  
Public

**Success Response**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "api",
    "timestamp": "2026-04-20T00:00:00Z"
  }
}
```

---

## 6. Authorization Rules

| Endpoint Group | ADMIN | OPERATOR | Notes |
| --- | :---: | :---: | --- |
| Authentication login | Y | Y | Public entry |
| Authentication logout/me | Y | Y | Current session only |
| Users | Y | N | Admin-only |
| Layout upload/edit | Y | N | Admin-only |
| TS-D config/test/sync/change mode | Y | N | Admin-only |
| Read operation mode | Y | Y | Shared |
| Cameras list | Y | Y | Shared |
| Camera add/update/test/save preset | Y | N | Admin-only |
| Camera recall preset / PTZ | Y | Y | Shared, capability constrained |
| Mapping CRUD | Y | N | Admin-only |
| Speaking request queue | Y | Y | Manual operations |
| Approve / reject request | Y | Y | Manual mode only |
| Live view | Y | Y | Shared |
| Audit/system logs | Y | N | Admin-only |

Access scope:

- MVP uses single-room operation
- APIs are effectively scoped by room or by current session

---

## 7. Validation Rules

### 7.1 Field-Level Validation

- required strings must not be blank after trim
- enum fields must match supported values exactly
- coordinates must be within `0..1`
- camera port must be within `1..65535`
- password min length `8` where applicable
- file upload extensions restricted by layout rules

### 7.2 Cross-Field Validation

- `presetId` must belong to `cameraId`
- `layoutDevices.refId` must exist for the supplied `refType`
- `liveView.cameraIds` must belong to `roomId`
- selected live view camera count must not exceed `layout`
- user deactivation must not leave zero active admins

### 7.3 Uniqueness Constraints

- username unique case-insensitively
- camera endpoint unique by room + IP + port
- preset code unique per camera
- one active mapping per unit
- one layout per room
- one TS-D config per room

---

## 8. State Transition Rules

### 8.1 Unit Runtime State

Allowed:

- `IDLE -> REQUEST`
- `REQUEST -> SPEAKING`
- `REQUEST -> IDLE`
- `SPEAKING -> IDLE`

Invalid:

- `SPEAKING -> REQUEST`
- `IDLE -> APPROVED`

### 8.2 Speaking Request State

Allowed:

- `PENDING -> APPROVED`
- `PENDING -> REJECTED`
- `PENDING -> EXPIRED`
- `PENDING -> CANCELLED`

Rules:

- only for manual mode
- only one unresolved pending request per unit
- rejected request never triggers camera action

### 8.3 Session State

Allowed:

- `ACTIVE -> REVOKED`
- `ACTIVE -> EXPIRED`

Invalid:

- `REVOKED -> ACTIVE`
- `EXPIRED -> ACTIVE`

---

## 9. Pagination, Filtering, Sorting

### 9.1 Standard Query Parameters

| Field | Type | Notes |
| --- | --- | --- |
| `page` | integer | default 1 |
| `pageSize` | integer | default 20 |
| `search` | string | free text where supported |
| `sortBy` | string | field name |
| `sortOrder` | enum | `asc`, `desc` |

### 9.2 Standard List Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

Recommended for:

- `/users`
- `/audit-logs`
- `/system-logs`
- `/rooms/{roomId}/speaking-requests`

Optional for small MVP room-scoped lists:

- `/rooms/{roomId}/cameras`
- `/rooms/{roomId}/mappings`

---

## 10. Error Handling

### 10.1 Standard Error Body

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

### 10.2 Common Error Catalog

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | malformed body, invalid field, enum mismatch |
| 401 | `UNAUTHORIZED` | missing or invalid token |
| 401 | `INVALID_CREDENTIALS` | invalid login credentials |
| 401 | `SESSION_EXPIRED` | token/session expired |
| 401 | `SESSION_REVOKED` | revoked session |
| 403 | `FORBIDDEN` | insufficient role |
| 403 | `USER_INACTIVE` | inactive user |
| 404 | `*_NOT_FOUND` | missing resource |
| 409 | `CONFLICT` | duplicate or incompatible unique state |
| 422 | `BUSINESS_RULE_VIOLATION` | valid payload but invalid domain rule |
| 500 | `INTERNAL_ERROR` | unexpected internal failure |
| 502 | `*_COMMAND_FAILED` | upstream integration failure |
| 503 | `*_UNAVAILABLE` | upstream unavailable |

### 10.3 Example Error

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

---

## 11. Side Effects

| Endpoint / Action | Side Effect |
| --- | --- |
| Login | create session, write audit log |
| Logout | revoke session, write audit log |
| Create/update/deactivate user | write audit log |
| Upload/update layout | write audit log |
| Save TS-D config | encrypt password, write audit log |
| Test TS-D connection | update test metadata, write system log |
| Sync units | upsert units, write audit + system logs |
| Change operation mode | write audit log |
| Add/update/test camera | update runtime or capability metadata, write logs |
| Save preset | optionally call adapter before DB save, write audit log |
| Recall preset | update camera runtime state, write audit log |
| PTZ control | write audit log |
| Create/update mapping | write audit log |
| Approve/reject speaking request | send TS-D command, write audit log |
| Runtime event processing | update runtime state, write system log on failures |

---

## 12. Assumptions

| Topic | Assumption |
| --- | --- |
| API contract source | No standalone API contract document was provided; API definitions are sourced from detail design documents |
| Annotation update body | `PUT /annotations/{id}` uses same fields as create |
| Mapping conflict behavior | Active mapping conflict may be resolved by auto-deactivation or rejection; implementation must choose one consistent policy |
| Small collection pagination | Cameras, mappings, and presets may omit pagination for MVP because room size is limited |
| Operation mode data source | `GET /rooms/{roomId}/operation-mode` returns room-level persisted mode only |
| Health endpoint | Included as support endpoint for operations and dev setup, not a formal UC |

---

## 13. Traceability Summary

| UC | Endpoint(s) |
| --- | --- |
| UC-AUTH-01 | `POST /auth/login` |
| UC-AUTH-02 | `POST /auth/logout` |
| UC-USER-01 | `POST /users` |
| UC-USER-02 | `PUT /users/{id}` |
| UC-USER-03 | `GET /users` |
| UC-USER-04 | `PATCH /users/{id}/status` |
| UC-LAYOUT-01 | `POST /rooms/{roomId}/layout` |
| UC-LAYOUT-02 | `PUT /rooms/{roomId}/layout/devices` |
| UC-LAYOUT-03 | `POST /rooms/{roomId}/annotations`, `PUT /annotations/{id}` |
| UC-TSD-01 | `PUT /rooms/{roomId}/tsd/connection`, `POST /rooms/{roomId}/tsd/test-connection` |
| UC-TSD-02 | `POST /rooms/{roomId}/tsd/sync-units` |
| UC-TSD-03 | `GET/PUT /rooms/{roomId}/operation-mode` |
| UC-CAM-01 | `POST /rooms/{roomId}/cameras` |
| UC-CAM-02 | `PUT /cameras/{id}` |
| UC-CAM-03 | `POST /cameras/{id}/test-connection` |
| UC-CAM-04 | `GET/POST /cameras/{id}/presets`, `PUT /presets/{id}` |
| UC-MAP-01 | `POST /rooms/{roomId}/mappings` |
| UC-MAP-02 | `PUT /mappings/{id}` |
| UC-MAP-03 | `GET /rooms/{roomId}/mappings` |
| UC-MODE-01 | `PUT /rooms/{roomId}/operation-mode` |
| UC-MANUAL-01 | `GET /rooms/{roomId}/speaking-requests` |
| UC-MANUAL-02 | `POST /speaking-requests/{id}/approve` |
| UC-MANUAL-03 | `POST /speaking-requests/{id}/reject` |
| UC-PTZ-01 | `POST /cameras/{id}/recall-preset` |
| UC-PTZ-02 | `POST /cameras/{id}/ptz` |
| UC-VIDEO-01 | `GET /rooms/{roomId}/live-view/config` |
| UC-VIDEO-02 | `PUT /rooms/{roomId}/live-view/layout` |
| UC-LOG-02 | `GET /audit-logs`, `GET /system-logs` |
