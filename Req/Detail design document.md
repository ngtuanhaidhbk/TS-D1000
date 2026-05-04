# Detail Design Document

**System:** Desktop Meeting Control Application for TS-D1000 + PTZ Cameras  
**Scope:** MVP for single meeting room, on-premise LAN deployment

---

## 1. Overview

### 1.1 Purpose

He thong la ung dung desktop dung de:

- ket noi `TS-D1000` qua official API
- nhan event real-time qua `SSE`
- dieu khien `1-4 camera PTZ` qua ONVIF / VISCA
- hien thi trang thai thiet bi tren layout map
- ho tro `Manual mode` va `Automatic mode`
- ho tro van hanh, giam sat, audit log

### 1.2 Design Principles

- bam sat Requirement + UC
- uu tien ro rang, de implement
- MVP cho `1 room / 1 TS-D1000-MU / toi da 4 camera`
- khong thiet ke multi-site, licensing, cloud trong phase nay

### 1.3 Assumptions

1. He thong co 2 role: `ADMIN`, `OPERATOR`.
2. Mot deployment MVP chi co `1 room active`.
3. TS-D1000 co du API de:
   - lay event SSE
   - lay device/config info
   - approve/reject speaking request trong manual mode
4. Camera live view lay tu RTSP va render trong desktop app qua media bridge noi bo.
5. Khong co bulk operation rieng ngoai cac xu ly runtime tu dong.
6. Chua ho tro SSO/LDAP.
7. Password duoc luu hash.

---

## 2. Module Breakdown

### 2.1 Authentication Module

**Responsibility**

- login/logout
- session/token issuance
- role resolution

**Related UCs**

- UC-AUTH-01 Login
- UC-AUTH-02 Logout

### 2.2 User Management Module

**Responsibility**

- create/update/view/deactivate users
- role assignment
- account status management

**Related UCs**

- UC-USER-01
- UC-USER-02
- UC-USER-03
- UC-USER-04

### 2.3 Layout & Map Module

**Responsibility**

- upload layout file
- place devices on map
- manage annotations
- render runtime highlight states

**Related UCs**

- UC-LAYOUT-01
- UC-LAYOUT-02
- UC-LAYOUT-03
- UC-RT-02

### 2.4 TS-D1000 Integration Module

**Responsibility**

- store TS-D1000 connection config
- sync unit list
- subscribe SSE
- fetch runtime/config data
- send manual mode control command

**Related UCs**

- UC-TSD-01
- UC-TSD-02
- UC-TSD-03
- UC-RT-01
- UC-MANUAL-02
- UC-MANUAL-03

### 2.5 Camera Integration Module

**Responsibility**

- manage cameras
- test connection
- manage capabilities
- preset/PTZ control
- camera adapter abstraction

**Related UCs**

- UC-CAM-01
- UC-CAM-02
- UC-CAM-03
- UC-CAM-04
- UC-PTZ-01
- UC-PTZ-02

### 2.6 Mic-Camera Mapping Module

**Responsibility**

- map TS-D1000 unit to camera preset
- support one camera covering multiple mics
- provide mapping data for runtime camera engine

**Related UCs**

- UC-MAP-01
- UC-MAP-02
- UC-MAP-03

### 2.7 Operation Mode Module

**Responsibility**

- switch between manual and automatic mode
- expose mode to runtime engine

**Related UCs**

- UC-TSD-03
- UC-MODE-01

### 2.8 Runtime Event Processing Module

**Responsibility**

- consume TS-D1000 SSE events
- maintain runtime states
- process request/speaking transitions
- trigger map highlight
- trigger camera action

**Related UCs**

- UC-RT-01
- UC-RT-02
- UC-RT-03
- UC-MANUAL-01
- UC-MANUAL-02
- UC-MANUAL-03

### 2.9 Video Monitoring Module

**Responsibility**

- manage live stream sources
- provide 1-4 view layout
- expose selected streams to UI

**Related UCs**

- UC-VIDEO-01
- UC-VIDEO-02

### 2.10 Logging & Audit Module

**Responsibility**

- audit user actions
- persist system/integration logs
- support log viewing

**Related UCs**

- UC-LOG-01
- UC-LOG-02

### 2.11 Live Monitoring Module

**Responsibility**

- provide realtime monitoring UI data
- expose runtime dashboard and map state
- support live event feed and alerts
- support runtime status and admin recovery actions

**Related UCs**

- UC-LIVE-01
- UC-LIVE-02
- UC-LIVE-03
- UC-LIVE-04
- UC-LIVE-05
- UC-LIVE-06
- UC-LIVE-07
- UC-LIVE-08
- UC-LIVE-09
- UC-LIVE-10
- UC-LIVE-11
- UC-LIVE-12
- UC-LIVE-13
- UC-LIVE-14
- UC-LIVE-15
- UC-LIVE-16
- UC-LIVE-17

---

## 3. Data Model

### 3.1 Entity Relationship Summary

- `users` 1-N `audit_logs`
- `rooms` 1-1 `layouts`
- `rooms` 1-N `annotations`
- `rooms` 1-N `tsd_units`
- `rooms` 1-N `cameras`
- `cameras` 1-N `camera_presets`
- `tsd_units` 1-0..1 `layout_devices`
- `cameras` 1-0..1 `layout_devices`
- `tsd_units` 1-N `mic_camera_mappings` (history allowed, one active)
- `camera_presets` 1-N `mic_camera_mappings`
- `rooms` 1-N `speaking_requests`
- `rooms` 1-N `system_logs`

### 3.2 Enums / Constants

```text
UserRole:
- ADMIN
- OPERATOR

UserStatus:
- ACTIVE
- INACTIVE

LayoutFileType:
- PDF
- JPG
- JPEG

DeviceType:
- CHAIRMAN
- DELEGATE

UnitState:
- IDLE
- REQUEST
- SPEAKING
- OFFLINE

CameraProtocol:
- ONVIF
- VISCA

CameraStatus:
- ACTIVE
- INACTIVE
- OFFLINE

OperationMode:
- MANUAL
- AUTOMATIC

SpeakingRequestStatus:
- PENDING
- APPROVED
- REJECTED
- EXPIRED
- CANCELLED

LogLevel:
- INFO
- WARN
- ERROR

AuditAction:
- LOGIN
- LOGOUT
- CREATE_USER
- UPDATE_USER
- ACTIVATE_USER
- DEACTIVATE_USER
- UPLOAD_LAYOUT
- UPDATE_LAYOUT
- ADD_CAMERA
- UPDATE_CAMERA
- TEST_CAMERA
- SAVE_PRESET
- CREATE_MAPPING
- UPDATE_MAPPING
- CHANGE_MODE
- APPROVE_REQUEST
- REJECT_REQUEST
- RECALL_PRESET
- PTZ_CONTROL
```

### 3.3 Tables

#### 3.3.1 `users`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| username | varchar(100) | Y | unique, trimmed, case-insensitive unique |
| password_hash | varchar(255) | Y | bcrypt/argon2 hash |
| role | varchar(20) | Y | enum `UserRole` |
| status | varchar(20) | Y | enum `UserStatus`, default ACTIVE |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |
| created_by | uuid | N | FK users.id |
| updated_by | uuid | N | FK users.id |

**Indexes**

- unique index on `lower(username)`

#### 3.3.2 `rooms`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| name | varchar(150) | Y | unique |
| operation_mode | varchar(20) | Y | enum `OperationMode`, default MANUAL |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Note:** MVP chi can 1 room active, nhung van giu bang rieng de thiet ke khong hard-code.

#### 3.3.3 `layouts`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK rooms.id, unique |
| file_name | varchar(255) | Y |  |
| file_path | varchar(500) | Y |  |
| file_type | varchar(10) | Y | enum `LayoutFileType` |
| width | integer | N | rendered width reference |
| height | integer | N | rendered height reference |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- unique index on `room_id`

#### 3.3.4 `layout_annotations`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK rooms.id |
| text | varchar(500) | Y | non-empty |
| pos_x | decimal(10,4) | Y | normalized coordinate |
| pos_y | decimal(10,4) | Y | normalized coordinate |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

#### 3.3.5 `tsd_connection_configs`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK rooms.id, unique |
| base_url | varchar(255) | Y | valid URL or IP-based URL |
| username | varchar(100) | N |  |
| password_encrypted | text | N | encrypted at rest |
| sse_endpoint | varchar(255) | Y | default `/api/event` |
| is_active | boolean | Y | default true |
| last_test_at | datetime | N |  |
| last_test_result | varchar(20) | N | SUCCESS/FAILED |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

#### 3.3.6 `tsd_units`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK rooms.id |
| external_unit_id | varchar(100) | Y | unique per room |
| unit_name | varchar(150) | N |  |
| device_type | varchar(20) | Y | enum `DeviceType` |
| runtime_state | varchar(20) | Y | enum `UnitState`, default IDLE |
| is_connected | boolean | Y | default true |
| last_event_at | datetime | N |  |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- unique index on `(room_id, external_unit_id)`
- index on `(room_id, runtime_state)`

#### 3.3.7 `cameras`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK rooms.id |
| name | varchar(150) | Y |  |
| protocol | varchar(20) | Y | enum `CameraProtocol` |
| ip_address | varchar(100) | Y |  |
| port | integer | N |  |
| username | varchar(100) | N |  |
| password_encrypted | text | N | encrypted |
| rtsp_url | varchar(500) | N | for live preview |
| status | varchar(20) | Y | enum `CameraStatus`, default ACTIVE |
| capability_ptz | boolean | Y | default false |
| capability_preset | boolean | Y | default false |
| capability_stream | boolean | Y | default false |
| vendor | varchar(100) | N |  |
| model | varchar(100) | N |  |
| last_test_at | datetime | N |  |
| last_test_result | varchar(20) | N | SUCCESS/PARTIAL/FAILED |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- unique index on `(room_id, ip_address, coalesce(port,0))`

#### 3.3.8 `camera_presets`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| camera_id | uuid | Y | FK cameras.id |
| preset_code | varchar(50) | Y | unique per camera |
| preset_name | varchar(150) | N |  |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- unique index on `(camera_id, preset_code)`

#### 3.3.9 `mic_camera_mappings`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK rooms.id |
| unit_id | uuid | Y | FK tsd_units.id |
| camera_id | uuid | Y | FK cameras.id |
| preset_id | uuid | Y | FK camera_presets.id |
| is_active | boolean | Y | default true |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Rules**

- one active mapping per unit
- preset must belong to camera

**Indexes**

- unique partial index on `(unit_id)` where `is_active = true`
- index on `(camera_id)`
- index on `(room_id, is_active)`

#### 3.3.10 `layout_devices`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK rooms.id |
| ref_type | varchar(20) | Y | `TSD_UNIT` or `CAMERA` |
| ref_id | uuid | Y | id of tsd_units or cameras |
| pos_x | decimal(10,4) | Y | normalized 0..1 |
| pos_y | decimal(10,4) | Y | normalized 0..1 |
| icon_label | varchar(100) | N |  |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- unique index on `(room_id, ref_type, ref_id)`

#### 3.3.11 `speaking_requests`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK rooms.id |
| unit_id | uuid | Y | FK tsd_units.id |
| status | varchar(20) | Y | enum `SpeakingRequestStatus` |
| requested_at | datetime | Y |  |
| approved_at | datetime | N |  |
| rejected_at | datetime | N |  |
| resolved_by | uuid | N | FK users.id |
| source_event_id | uuid | N | FK runtime_events.id |
| note | varchar(255) | N |  |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- index on `(room_id, status, requested_at desc)`
- index on `(unit_id, status)`

#### 3.3.12 `runtime_events`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK rooms.id |
| event_type | varchar(100) | Y | raw event type |
| unit_id | uuid | N | FK tsd_units.id |
| payload_json | json/text | Y | raw payload |
| received_at | datetime | Y |  |
| processed_at | datetime | N |  |
| processing_status | varchar(20) | Y | RECEIVED/PROCESSED/FAILED |
| error_message | varchar(500) | N |  |

**Indexes**

- index on `(room_id, received_at desc)`
- index on `(event_type, received_at desc)`

#### 3.3.13 `camera_runtime_states`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| camera_id | uuid | Y | FK cameras.id, unique |
| current_preset_id | uuid | N | FK camera_presets.id |
| current_unit_id | uuid | N | FK tsd_units.id |
| last_switch_at | datetime | N |  |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

#### 3.3.14 `system_logs`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | N | FK rooms.id |
| module | varchar(100) | Y |  |
| level | varchar(20) | Y | enum `LogLevel` |
| message | varchar(1000) | Y |  |
| context_json | json/text | N |  |
| created_at | datetime | Y |  |

**Indexes**

- index on `(level, created_at desc)`
- index on `(module, created_at desc)`

#### 3.3.15 `audit_logs`

| Field | Type | Required | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| actor_user_id | uuid | N | FK users.id |
| action | varchar(50) | Y | enum-like |
| target_type | varchar(50) | Y | USER/CAMERA/MAPPING/MODE/... |
| target_id | varchar(100) | N |  |
| result | varchar(20) | Y | SUCCESS/FAILED |
| detail_json | json/text | N |  |
| created_at | datetime | Y |  |

**Indexes**

- index on `(actor_user_id, created_at desc)`
- index on `(action, created_at desc)`

---

## 4. API Design

### 4.1 API Conventions

#### Base URL

```text
/api/v1
```

#### Auth

```http
Authorization: Bearer <token>
```

#### Success Response Format

```json
{
  "success": true,
  "data": {}
}
```

#### Error Response Format

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

### 4.2 Authentication APIs

#### POST `/auth/login`

**Permission:** Public

##### Request

```json
{
  "username": "admin",
  "password": "123456"
}
```

##### Response

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "uuid",
      "username": "admin",
      "role": "ADMIN",
      "status": "ACTIVE"
    }
  }
}
```

##### Validations

- username required
- password required

##### Errors

- 401 INVALID_CREDENTIALS
- 403 USER_INACTIVE

#### POST `/auth/logout`

**Permission:** Authenticated

##### Request

Empty

##### Response

```json
{
  "success": true,
  "data": {
    "message": "Logged out"
  }
}
```

### 4.3 User APIs

#### GET `/users`

**Permission:** ADMIN

##### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "operator1",
      "role": "OPERATOR",
      "status": "ACTIVE",
      "createdAt": "2026-04-15T10:00:00Z"
    }
  ]
}
```

#### POST `/users`

**Permission:** ADMIN

##### Request

```json
{
  "username": "operator1",
  "password": "StrongPass123",
  "role": "OPERATOR",
  "status": "ACTIVE"
}
```

##### Validation

- username required, unique
- password required, min 8
- role in ADMIN/OPERATOR
- status in ACTIVE/INACTIVE

##### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid"
  }
}
```

##### Errors

- 409 USERNAME_ALREADY_EXISTS

#### PUT `/users/{id}`

**Permission:** ADMIN

##### Request

```json
{
  "password": "NewStrongPass123",
  "role": "OPERATOR",
  "status": "ACTIVE"
}
```

##### Validation

- role valid if provided
- status valid if provided
- password min 8 if provided

#### PATCH `/users/{id}/status`

**Permission:** ADMIN

##### Request

```json
{
  "status": "INACTIVE"
}
```

##### Rules

- cannot deactivate last active admin

### 4.4 Layout APIs

#### POST `/rooms/{roomId}/layout`

**Permission:** ADMIN  
**Content-Type:** multipart/form-data

##### Form Data

- `file`: PDF/JPG/JPEG

##### Response

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

##### Validation

- file required
- extension in PDF/JPG/JPEG

#### PUT `/rooms/{roomId}/layout/devices`

**Permission:** ADMIN

##### Request

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

##### Validation

- refType in TSD_UNIT/CAMERA
- refId must exist
- posX/posY in range 0..1

#### POST `/rooms/{roomId}/annotations`

**Permission:** ADMIN

##### Request

```json
{
  "text": "Main table",
  "posX": 0.45,
  "posY": 0.3
}
```

#### PUT `/annotations/{id}`

**Permission:** ADMIN

##### Request

```json
{
  "text": "Chairman table",
  "posX": 0.44,
  "posY": 0.28
}
```

### 4.5 TS-D1000 APIs

#### PUT `/rooms/{roomId}/tsd/connection`

**Permission:** ADMIN

##### Request

```json
{
  "baseUrl": "http://192.168.1.10",
  "username": "admin",
  "password": "secret",
  "sseEndpoint": "/api/event"
}
```

##### Validation

- baseUrl required
- sseEndpoint required

#### POST `/rooms/{roomId}/tsd/test-connection`

**Permission:** ADMIN

##### Response

```json
{
  "success": true,
  "data": {
    "result": "SUCCESS"
  }
}
```

#### POST `/rooms/{roomId}/tsd/sync-units`

**Permission:** ADMIN

##### Response

```json
{
  "success": true,
  "data": {
    "synced": 24
  }
}
```

#### PUT `/rooms/{roomId}/operation-mode`

**Permission:** ADMIN

##### Request

```json
{
  "mode": "MANUAL"
}
```

##### Validation

- mode in MANUAL/AUTOMATIC

#### GET `/rooms/{roomId}/operation-mode`

**Permission:** ADMIN, OPERATOR

### 4.6 Camera APIs

#### GET `/rooms/{roomId}/cameras`

**Permission:** ADMIN, OPERATOR

#### POST `/rooms/{roomId}/cameras`

**Permission:** ADMIN

##### Request

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

##### Validation

- room max 4 cameras
- protocol valid
- ipAddress required

#### PUT `/cameras/{id}`

**Permission:** ADMIN

#### POST `/cameras/{id}/test-connection`

**Permission:** ADMIN

##### Response

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

#### GET `/cameras/{id}/presets`

**Permission:** ADMIN, OPERATOR

#### POST `/cameras/{id}/presets`

**Permission:** ADMIN

##### Request

```json
{
  "presetCode": "P01",
  "presetName": "Delegate 01"
}
```

##### Note

Neu camera ho tro save preset truc tiep, backend se goi adapter save preset truoc roi moi luu DB.

#### PUT `/presets/{id}`

**Permission:** ADMIN

### 4.7 Mapping APIs

#### GET `/rooms/{roomId}/mappings`

**Permission:** ADMIN

#### POST `/rooms/{roomId}/mappings`

**Permission:** ADMIN

##### Request

```json
{
  "unitId": "unit-uuid",
  "cameraId": "camera-uuid",
  "presetId": "preset-uuid"
}
```

##### Validation

- unit exists in room
- camera exists in room
- preset belongs to camera
- one active mapping per unit

#### PUT `/mappings/{id}`

**Permission:** ADMIN

##### Request

```json
{
  "cameraId": "camera-uuid",
  "presetId": "preset-uuid",
  "isActive": true
}
```

### 4.8 Manual Operation APIs

#### GET `/rooms/{roomId}/speaking-requests`

**Permission:** ADMIN, OPERATOR

##### Query

- `status=PENDING`

#### POST `/speaking-requests/{id}/approve`

**Permission:** ADMIN, OPERATOR

##### Request

```json
{
  "note": "Approved by operator"
}
```

##### Response

```json
{
  "success": true,
  "data": {
    "status": "APPROVED"
  }
}
```

##### Rules

- room must be MANUAL
- request must be PENDING

#### POST `/speaking-requests/{id}/reject`

**Permission:** ADMIN, OPERATOR

##### Request

```json
{
  "note": "Rejected by operator"
}
```

##### Rules

- room must be MANUAL
- request must be PENDING

### 4.9 Camera Control APIs

#### POST `/cameras/{id}/recall-preset`

**Permission:** ADMIN, OPERATOR

##### Request

```json
{
  "presetId": "preset-uuid"
}
```

#### POST `/cameras/{id}/ptz`

**Permission:** ADMIN, OPERATOR

##### Request

```json
{
  "action": "PAN_LEFT",
  "speed": 0.5,
  "durationMs": 300
}
```

##### Validation

- action in allowed PTZ actions
- speed 0..1
- durationMs > 0 when required

### 4.10 Live Video APIs

#### GET `/rooms/{roomId}/live-view/config`

**Permission:** ADMIN, OPERATOR

##### Response

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

#### PUT `/rooms/{roomId}/live-view/layout`

**Permission:** ADMIN, OPERATOR

##### Request

```json
{
  "layout": 4,
  "cameraIds": ["cam1", "cam2", "cam3", "cam4"]
}
```

##### Validation

- layout in 1,2,3,4
- selected camera count <= layout
- selected camera count <= 4

### 4.11 Logs APIs

#### GET `/audit-logs`

**Permission:** ADMIN

##### Query

- actorUserId
- action
- from
- to

#### GET `/system-logs`

**Permission:** ADMIN

##### Query

- module
- level
- from
- to

---

## 5. Business Logic (Service Layer)

### 5.1 Authentication Service

#### Login

1. Validate username/password presence.
2. Load user by case-insensitive username.
3. If not found, return 401.
4. If status != ACTIVE, return 403.
5. Compare password hash.
6. Issue JWT/session token.
7. Write audit log `LOGIN`.

#### Logout

1. Invalidate token/session if stateful.
2. Write audit log `LOGOUT`.

### 5.2 User Service

#### Create User

1. Check requester role = ADMIN.
2. Validate fields.
3. Check username uniqueness.
4. Hash password.
5. Insert user.
6. Write audit log.

#### Update User

1. Check ADMIN.
2. Load target user.
3. Validate provided fields.
4. If password provided, hash new password.
5. Update record.
6. Write audit log.

#### Change Status

1. Check ADMIN.
2. Load user.
3. If deactivating:
   - ensure target is not the last active admin
4. Update status.
5. Write audit log.

### 5.3 Layout Service

#### Upload Layout

1. Check ADMIN.
2. Validate file type.
3. Store file on local storage.
4. Upsert `layouts` by room.
5. Write audit log.

#### Save Device Positions

1. Check ADMIN.
2. Validate layout exists.
3. For each device:
   - validate ref exists
   - validate coordinate range
4. Upsert into `layout_devices`.
5. Remove stale placements not in payload only if UI sends full replacement.
6. Write audit log.

#### Save Annotation

1. Check ADMIN.
2. Validate non-empty text.
3. Validate coordinate range.
4. Insert/update annotation.
5. Write audit log.

### 5.4 TS-D1000 Integration Service

#### Save Connection Config

1. Check ADMIN.
2. Validate base URL and endpoint.
3. Encrypt password.
4. Upsert config.
5. Write audit log.

#### Test Connection

1. Load connection config.
2. Perform health request to TS-D1000.
3. Mark last test result.
4. Log system result.
5. Return SUCCESS/FAILED.

#### Sync Units

1. Check ADMIN.
2. Call TS-D1000 unit config endpoint.
3. Parse unit list.
4. Upsert `tsd_units` by `(room_id, external_unit_id)`.
5. Mark missing units disconnected only if source-of-truth behavior is confirmed.
6. Write audit log and system log.

#### Change Operation Mode

1. Check ADMIN.
2. Validate mode enum.
3. Update `rooms.operation_mode`.
4. Write audit log.

### 5.5 Camera Service

#### Add Camera

1. Check ADMIN.
2. Validate max 4 cameras in room.
3. Validate protocol/IP.
4. Encrypt credentials.
5. Insert camera.
6. Initialize runtime state row.
7. Write audit log.

#### Update Camera

1. Check ADMIN.
2. Load camera.
3. Validate updates.
4. Update camera record.
5. Write audit log.

#### Test Camera Connection

1. Check ADMIN.
2. Load camera config.
3. Select adapter by protocol/vendor.
4. Test connectivity.
5. Detect capabilities:
   - ptz
   - preset
   - stream
6. Update camera capability fields + last_test_result.
7. Write audit log and system log.

#### Save Preset

1. Check ADMIN.
2. Ensure camera exists and preset capability true.
3. If adapter supports remote save preset:
   - invoke adapter
4. Upsert preset by camera + preset code.
5. Write audit log.

#### Recall Preset

1. Check role ADMIN/OPERATOR.
2. Ensure camera exists and active.
3. Ensure preset belongs to camera.
4. Invoke adapter recall preset.
5. Update `camera_runtime_states`.
6. Write audit log.

#### Manual PTZ

1. Check role.
2. Ensure camera PTZ capability true.
3. Validate action/speed.
4. Invoke adapter PTZ command.
5. Write audit log.

### 5.6 Mapping Service

#### Create Mapping

1. Check ADMIN.
2. Validate unit in room.
3. Validate camera in room.
4. Validate preset belongs to camera.
5. Deactivate existing active mapping for unit, or reject if strict mode desired.
6. Insert new active mapping.
7. Write audit log.

#### Update Mapping

1. Check ADMIN.
2. Load mapping.
3. Validate camera/preset relation.
4. Update mapping.
5. Enforce one active mapping per unit.
6. Write audit log.

### 5.7 Runtime Event Processor

#### SSE Lifecycle

1. On app startup/backend startup, load active room + TS-D config.
2. Open SSE stream to `/api/event`.
3. On receive event:
   - persist raw `runtime_events`
   - route to handler by type
4. On disconnect:
   - system log error/warn
   - retry with backoff

#### Event Handling Categories

- talk request event
- speaker start event
- speaker end / idle event
- system event
- recording/other ignored-supported events

#### Handle Talk Request

1. Resolve external unit ID -> `tsd_units`.
2. Update unit runtime state to `REQUEST`.
3. If room mode = MANUAL:
   - create `speaking_requests` PENDING if no existing pending request for same unit
4. If room mode = AUTOMATIC:
   - wait for actual speaking/start event before camera action
5. Update map runtime state broadcast to UI.
6. Mark event processed.

#### Handle Speaker Start

1. Resolve unit.
2. Update unit runtime state to `SPEAKING`.
3. Resolve and close/cross-update request:
   - if pending request exists in MANUAL and system indicates speaking started after approve, mark APPROVED
4. Trigger camera engine.
5. Broadcast runtime state.
6. Mark event processed.

#### Handle Speaker Stop / Idle

1. Resolve unit.
2. Update unit runtime state to `IDLE`.
3. Cancel stale pending request if appropriate and event semantics indicate cancel.
4. Broadcast runtime state.
5. Mark event processed.

### 5.8 Manual Speaking Service

#### View Queue

1. Check role ADMIN/OPERATOR.
2. Ensure room mode = MANUAL or allow viewing historical queue optionally.
3. Return pending requests sorted by requested_at asc.

#### Approve Request

1. Check role ADMIN/OPERATOR.
2. Load request.
3. Ensure request status = PENDING.
4. Ensure room mode = MANUAL.
5. Call TS-D1000 approve endpoint/command.
6. Do not immediately trigger camera unless TS-D1000 confirms active speaking by event.
7. Update request status to APPROVED when confirmation arrives, or tentatively mark as APPROVING only if later needed. For MVP, keep `PENDING` until success event if exact API semantics require it.
8. Write audit log.

**Implementation note:**  
Neu TS-D1000 API approve tra ket qua xac nhan chac chan speaker active, co the cap nhat APPROVED ngay. Neu khong, nen cho SSE speaker-start event de tranh lech trang thai.

#### Reject Request

1. Check role.
2. Ensure request is PENDING.
3. Ensure room mode = MANUAL.
4. Call TS-D reject endpoint/command.
5. Mark request REJECTED if command success.
6. Update unit state back to IDLE or keep REQUEST until confirmed clear, tuy API semantics.
7. Do not trigger camera.
8. Write audit log.

### 5.9 Camera Rule Engine

#### Inputs

- currently active speaking units
- room mode
- active mappings
- last camera switch state
- chairman/delegate priority
- switch delay

#### Rules

1. `CHAIRMAN` priority > `DELEGATE`.
2. Among delegates, choose most recently active speaking unit.
3. Only trigger when a valid active mapping exists.
4. Apply switch delay:
   - if current camera switched too recently, suppress immediate switch
5. No camera action on rejected request.
6. Camera action only on actual speaking-active state, not request-pending.

#### Suggested Config Constants

```text
CAMERA_SWITCH_MIN_INTERVAL_MS = 1500
SSE_RECONNECT_BASE_MS = 2000
SSE_RECONNECT_MAX_MS = 10000
```

These are technical defaults, not business requirements, and may be configurable later.

#### Engine Flow

1. Query all `SPEAKING` units.
2. Rank by:
   - device type priority
   - last_event_at desc
3. Select top unit.
4. Get active mapping.
5. Compare with current camera target state.
6. If same target, do nothing.
7. If too soon since last switch, defer.
8. Recall target preset.
9. Update `camera_runtime_states`.
10. System log success/failure.

### 5.10 Live Video Service

#### Get Live View Config

1. Check role.
2. Load room cameras with stream capability.
3. Return available cameras and current selected layout.

#### Change Layout

1. Check role.
2. Validate layout in [1..4].
3. Validate selected cameras belong to room.
4. Persist UI preference if needed.
5. Return configuration.

### 5.11 Logging Service

#### Audit Logging

Triggered for:

- login/logout
- user CRUD/status change
- layout upload/update
- camera CRUD/test/preset
- mapping create/update
- mode change
- approve/reject
- manual camera control

#### System Logging

Triggered for:

- TS-D connect/disconnect/reconnect
- SSE event parse failures
- camera adapter errors
- runtime engine decisions
- stream issues

---

## 6. State & Status Transitions

### 6.1 Unit Runtime State

```text
IDLE -> REQUEST -> SPEAKING -> IDLE
IDLE -> SPEAKING -> IDLE
REQUEST -> IDLE
```

#### Valid Transitions

- `IDLE -> REQUEST` when talk request event received
- `REQUEST -> SPEAKING` when approved and/or speaking-start event received
- `REQUEST -> IDLE` when rejected, cancelled, or request cleared
- `SPEAKING -> IDLE` when stop/end event received

#### Invalid Transitions

- `SPEAKING -> REQUEST`
- `IDLE -> APPROVED` (no such state at unit level)

### 6.2 Speaking Request Status

```text
PENDING -> APPROVED
PENDING -> REJECTED
PENDING -> EXPIRED
PENDING -> CANCELLED
```

#### Rules

- only in MANUAL mode
- one unresolved pending request per unit at a time
- APPROVED must be tied to actual system approval / speaking activation semantics
- REJECTED never triggers camera

### 6.3 Operation Mode

```text
MANUAL <-> AUTOMATIC
```

#### Rules

- exactly one active mode per room
- switching mode affects runtime behavior immediately for new incoming events
- existing pending manual requests should remain visible; implementation can optionally require operator cleanup, but not defined in requirements, so no forced auto-resolution

---

## 7. Validation Rules

### 7.1 Field-Level Validation

#### User

- username: required, 3-100 chars, trimmed
- password: required on create, min 8 chars
- role: ADMIN/OPERATOR
- status: ACTIVE/INACTIVE

#### Layout

- file type: PDF/JPG/JPEG only
- file required
- posX/posY: 0..1

#### TS-D Config

- baseUrl required
- sseEndpoint required

#### Camera

- name required
- protocol required
- ipAddress required
- port 1..65535 if provided
- rtspUrl optional
- max 4 cameras per room

#### Preset

- presetCode required
- unique per camera

#### Mapping

- unitId required
- cameraId required
- presetId required

#### Operation Mode

- mode must be MANUAL/AUTOMATIC

### 7.2 Cross-Field Validation

- mapping preset must belong to selected camera
- layout device refId must exist for given refType
- live-view selected cameraIds must belong to room
- camera capability must support requested operation
- deactivating user cannot leave system without active admin

### 7.3 Business Validation

- approve/reject only allowed in MANUAL mode
- approve/reject only allowed for PENDING request
- camera action only on active speaking
- operator cannot access admin-only APIs
- one active mapping per unit
- one layout active per room
- username unique case-insensitively
- per room max 4 cameras in MVP

---

## 8. Authorization Rules

### 8.1 Roles

#### ADMIN

Can access:

- all APIs
- user management
- system configuration
- camera config
- mappings
- logs
- operation mode change
- manual operation
- camera control
- live view

#### OPERATOR

Can access:

- login/logout
- read operation mode
- view speaking request queue
- approve/reject request
- camera recall preset / PTZ control
- view cameras
- live view
- runtime dashboard/map view

Cannot access:

- user management
- upload layout
- edit device positions
- camera add/update/test
- save presets
- mapping create/update
- change operation mode
- view full admin logs unless future requirement changes

### 8.2 Permission Matrix

| API Group | ADMIN | OPERATOR |
| --- | :---: | :---: |
| Auth | Y | Y |
| Users | Y | N |
| Layout upload/edit | Y | N |
| TS-D config/sync | Y | N |
| Change operation mode | Y | N |
| Camera list | Y | Y |
| Add/update/test camera | Y | N |
| Preset recall/PTZ | Y | Y |
| Preset create/update | Y | N |
| Mapping CRUD | Y | N |
| View request queue | Y | Y |
| Approve/Reject request | Y | Y |
| Live view | Y | Y |
| Audit/System logs | Y | N |

---

## 9. Background Jobs / Automation

### 9.1 SSE Reconnect Worker

- runs whenever SSE disconnects
- retry with exponential backoff
- writes system log on each retry/failure/reconnect

### 9.2 Optional Pending Request Expiry Job

Not explicitly required. If implemented later, it should mark stale pending requests as `EXPIRED`. For MVP, do **not** auto-expire unless requirement is added.

### 9.3 Stream Health Monitor

- periodic optional health check for live streams
- updates camera stream availability
- system log on failure

### 9.4 Connection Health Checks

- optional scheduled ping/test for TS-D and cameras
- non-blocking
- status update only

---

## 10. Logging & Audit

### 10.1 Audit Log Structure

```json
{
  "actorUserId": "uuid",
  "action": "APPROVE_REQUEST",
  "targetType": "SPEAKING_REQUEST",
  "targetId": "uuid",
  "result": "SUCCESS",
  "detailJson": {
    "roomId": "uuid",
    "unitId": "uuid",
    "note": "Approved by operator"
  }
}
```

### 10.2 Actions That Must Be Audited

- login/logout
- create/update user
- activate/deactivate user
- upload layout
- save device positions
- add/update camera
- test camera
- save/update preset
- create/update mapping
- change operation mode
- approve/reject request
- manual preset recall
- manual PTZ control

### 10.3 System Logs Must Capture

- TS-D connectivity lifecycle
- camera test results
- adapter invocation errors
- event parsing failures
- SSE reconnect attempts
- camera switch decisions
- live stream errors

---

## 11. Error Handling

### 11.1 Error Types

#### Validation Error

- malformed input
- missing fields
- enum mismatch
- invalid coordinate
- invalid mapping relation

**HTTP:** `400 Bad Request`

#### Authentication Error

- invalid login
- expired token
- missing token

**HTTP:** `401 Unauthorized`

#### Authorization Error

- user lacks permission

**HTTP:** `403 Forbidden`

#### Not Found Error

- user/camera/unit/mapping/request not found

**HTTP:** `404 Not Found`

#### Conflict Error

- duplicate username
- duplicate active mapping
- invalid state transition
- max cameras exceeded

**HTTP:** `409 Conflict`

#### Business Rule Error

- approve in automatic mode
- reject non-pending request
- preset does not belong to camera
- last active admin deactivation

**HTTP:** `422 Unprocessable Entity`

#### Integration Error

- TS-D API failure
- camera adapter failure
- stream open failure

**HTTP:** `502 Bad Gateway` or `503 Service Unavailable`

#### System Error

- unexpected server exception

**HTTP:** `500 Internal Server Error`

### 11.2 Standard Error Response

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

## 12. Traceability: UC -> API -> Service

| UC | API | Service |
| --- | --- | --- |
| UC-AUTH-01 | POST `/auth/login` | AuthService.login |
| UC-AUTH-02 | POST `/auth/logout` | AuthService.logout |
| UC-USER-01 | POST `/users` | UserService.create |
| UC-USER-02 | PUT `/users/{id}` | UserService.update |
| UC-USER-03 | GET `/users` | UserService.list |
| UC-USER-04 | PATCH `/users/{id}/status` | UserService.changeStatus |
| UC-LAYOUT-01 | POST `/rooms/{roomId}/layout` | LayoutService.upload |
| UC-LAYOUT-02 | PUT `/rooms/{roomId}/layout/devices` | LayoutService.saveDevicePositions |
| UC-LAYOUT-03 | POST `/rooms/{roomId}/annotations`, PUT `/annotations/{id}` | LayoutService.saveAnnotation |
| UC-TSD-01 | PUT `/rooms/{roomId}/tsd/connection`, POST `/rooms/{roomId}/tsd/test-connection` | TsdConfigService |
| UC-TSD-02 | POST `/rooms/{roomId}/tsd/sync-units` | TsdUnitSyncService |
| UC-TSD-03 | PUT `/rooms/{roomId}/operation-mode` | OperationModeService |
| UC-CAM-01 | POST `/rooms/{roomId}/cameras` | CameraService.create |
| UC-CAM-02 | PUT `/cameras/{id}` | CameraService.update |
| UC-CAM-03 | POST `/cameras/{id}/test-connection` | CameraService.testConnection |
| UC-CAM-04 | POST `/cameras/{id}/presets`, PUT `/presets/{id}` | CameraPresetService |
| UC-MAP-01 | POST `/rooms/{roomId}/mappings` | MappingService.create |
| UC-MAP-02 | PUT `/mappings/{id}` | MappingService.update |
| UC-MAP-03 | GET `/rooms/{roomId}/mappings` | MappingService.list |
| UC-MODE-01 | PUT `/rooms/{roomId}/operation-mode` | OperationModeService |
| UC-RT-01 | internal SSE consumer | RuntimeEventProcessor |
| UC-RT-02 | internal event broadcast/state query | RuntimeStateService |
| UC-RT-03 | internal trigger | CameraRuleEngine |
| UC-MANUAL-01 | GET `/rooms/{roomId}/speaking-requests` | SpeakingRequestService.listPending |
| UC-MANUAL-02 | POST `/speaking-requests/{id}/approve` | SpeakingRequestService.approve |
| UC-MANUAL-03 | POST `/speaking-requests/{id}/reject` | SpeakingRequestService.reject |
| UC-PTZ-01 | POST `/cameras/{id}/recall-preset` | CameraControlService.recallPreset |
| UC-PTZ-02 | POST `/cameras/{id}/ptz` | CameraControlService.ptz |
| UC-VIDEO-01 | GET `/rooms/{roomId}/live-view/config` | LiveViewService.getConfig |
| UC-VIDEO-02 | PUT `/rooms/{roomId}/live-view/layout` | LiveViewService.setLayout |
| UC-LOG-01 | internal | AuditLogService/SystemLogService |
| UC-LOG-02 | GET `/audit-logs`, GET `/system-logs` | LogQueryService |

---

## 13. Suggested Backend Structure

```text
src/
  modules/
    auth/
    users/
    rooms/
    layout/
    tsd/
      controllers/
      services/
      adapters/
      sse/
    cameras/
      controllers/
      services/
      adapters/
        onvif/
        visca/
    mappings/
    speaking-requests/
    runtime/
    live-view/
    logs/
  common/
    guards/
    interceptors/
    exceptions/
    enums/
    utils/
  database/
    entities/
    migrations/
```

---

## 14. Non-Functional Notes

### Performance

- SSE processing should be non-blocking
- camera switch logic should avoid duplicate command bursts
- database writes for runtime events should be efficient; archival can be added later

### Reliability

- SSE auto reconnect required
- adapter errors must not crash runtime engine
- failed camera action should degrade gracefully, with log

### Security

- store passwords hashed
- encrypt device credentials at rest
- LAN deployment does not remove need for auth

---

## 15. Items Intentionally Not Designed Yet

Các mục này không được đưa sâu vào vì chưa có trong Requirement/UC:

- licensing
- multi-room orchestration
- multi-site management
- cloud sync
- notification system
- export report
- request expiry policies
- AI auto-tracking
- Zoom/Teams integration

---

Neu ban muon, buoc tiep theo hop ly nhat la chuyen tai lieu nay thanh `developer-ready API spec + DB schema SQL + module/class design`.
