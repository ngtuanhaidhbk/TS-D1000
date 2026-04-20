# Detail Design Document

**System:** Desktop Meeting Control Application for TS-D1000 + PTZ Cameras  
**Scope:** MVP for single room, on-premise LAN deployment

## 1. Overview

### 1.1 Objective

He thong la ung dung desktop dung de:

- ket noi `TS-D1000` qua Web API chinh thuc
- nhan event thoi gian thuc qua `SSE`
- dieu khien `1-4 camera PTZ` qua ONVIF hoac VISCA
- hien thi trang thai mic/camera tren layout map
- ho tro `Manual mode` va `Automatic mode`
- ho tro live view, logging, audit

TOA cong bo tai lieu Web API cho TS-D1000/D1100, va TS-D1000 ho tro browser settings/web-based operation. ONVIF cung co dac ta PTZ rieng cho dieu khien pan/tilt/zoom. SSE dung `text/event-stream` voi ket noi HTTP mo lien tuc. ([Landing page | TOA Corporation][1])

### 1.2 Assumptions

1. Co 2 role: `ADMIN`, `OPERATOR`.
2. MVP chi ho tro `1 room active`.
3. TS-D1000 co API du de:
   - subscribe event qua SSE
   - doc cau hinh/trang thai
   - approve/reject speaking request trong manual mode
4. Live view lay tu RTSP cua camera va hien thi trong desktop app qua media bridge noi bo.
5. Chua ho tro licensing, multi-room, multi-site.
6. Chua ho tro SSO/LDAP.
7. Password duoc hash; credential thiet bi duoc ma hoa khi luu.
8. Camera switching co anti-jitter bang cau hinh ky thuat, khong phai business rule nguoi dung nhap.

### 1.3 Architecture Direction

- **Desktop shell:** Electron
- **Frontend:** React
- **Backend local service:** NestJS
- **Database:** SQLite cho MVP
- **Runtime:** SSE consumer + camera adapter layer + rule engine
- **Storage:** local file storage cho layout va logs

---

## 2. Module Breakdown

| Module | Responsibility | Related UC |
| --- | --- | --- |
| Authentication | Login, logout, token/session handling | UC-AUTH-01, UC-AUTH-02 |
| User Management | CRUD user, activate/deactivate, role assignment | UC-USER-01..04 |
| Layout & Map | Upload layout, place devices, annotations, render highlight | UC-LAYOUT-01..03, UC-RT-02 |
| TS-D1000 Integration | Save config, test connection, sync units, subscribe SSE, manual speaking command | UC-TSD-01..03, UC-RT-01, UC-MANUAL-02, UC-MANUAL-03 |
| Camera Integration | Add/update/test camera, capability detection, preset/PTZ control | UC-CAM-01..04, UC-PTZ-01, UC-PTZ-02 |
| Mic-Camera Mapping | Map unit to camera preset, maintain active mapping | UC-MAP-01..03 |
| Operation Mode | Switch MANUAL / AUTOMATIC | UC-TSD-03, UC-MODE-01 |
| Runtime Event Processing | Process SSE events, maintain runtime states, trigger camera | UC-RT-01..03 |
| Manual Speaking Control | Queue, approve, reject | UC-MANUAL-01..03 |
| Live Video Monitoring | 1-4 stream display config | UC-VIDEO-01, UC-VIDEO-02 |
| Logging & Audit | Audit user actions, system logs | UC-LOG-01, UC-LOG-02 |

---

## 3. Data Model

### 3.1 Enums

```text
UserRole = ADMIN | OPERATOR
UserStatus = ACTIVE | INACTIVE

LayoutFileType = PDF | JPG | JPEG

DeviceType = CHAIRMAN | DELEGATE
UnitRuntimeState = IDLE | REQUEST | SPEAKING | OFFLINE

CameraProtocol = ONVIF | VISCA
CameraStatus = ACTIVE | INACTIVE | OFFLINE

OperationMode = MANUAL | AUTOMATIC

SpeakingRequestStatus = PENDING | APPROVED | REJECTED | EXPIRED | CANCELLED

RuntimeEventStatus = RECEIVED | PROCESSED | FAILED

LogLevel = INFO | WARN | ERROR
```

---

### 3.2 Tables

#### 3.2.1 `users`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| username | varchar(100) | Y | unique, trimmed |
| password_hash | varchar(255) | Y | hashed |
| role | varchar(20) | Y | enum `UserRole` |
| status | varchar(20) | Y | enum `UserStatus`, default ACTIVE |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |
| created_by | uuid | N | FK `users.id` |
| updated_by | uuid | N | FK `users.id` |

**Indexes**

- unique index on `lower(username)`

**Data rules**

- username unique case-insensitive
- cannot deactivate last active admin

---

#### 3.2.2 `rooms`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| name | varchar(150) | Y | unique |
| operation_mode | varchar(20) | Y | enum `OperationMode`, default MANUAL |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

---

#### 3.2.3 `layouts`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK `rooms.id`, unique |
| file_name | varchar(255) | Y |  |
| file_path | varchar(500) | Y |  |
| file_type | varchar(10) | Y | enum `LayoutFileType` |
| width | integer | N |  |
| height | integer | N |  |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Rule**

- 1 active layout per room

---

#### 3.2.4 `layout_annotations`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK `rooms.id` |
| text | varchar(500) | Y | non-empty |
| pos_x | decimal(10,4) | Y | 0..1 normalized |
| pos_y | decimal(10,4) | Y | 0..1 normalized |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

---

#### 3.2.5 `layout_devices`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK `rooms.id` |
| ref_type | varchar(20) | Y | `TSD_UNIT` / `CAMERA` |
| ref_id | uuid | Y |  |
| pos_x | decimal(10,4) | Y | 0..1 |
| pos_y | decimal(10,4) | Y | 0..1 |
| icon_label | varchar(100) | N |  |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- unique `(room_id, ref_type, ref_id)`

---

#### 3.2.6 `tsd_connection_configs`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK `rooms.id`, unique |
| base_url | varchar(255) | Y |  |
| username | varchar(100) | N |  |
| password_encrypted | text | N | encrypted |
| sse_endpoint | varchar(255) | Y | default `/api/event` |
| is_active | boolean | Y | default true |
| last_test_at | datetime | N |  |
| last_test_result | varchar(20) | N | SUCCESS / FAILED |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

---

#### 3.2.7 `tsd_units`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK `rooms.id` |
| external_unit_id | varchar(100) | Y | unique per room |
| unit_name | varchar(150) | N |  |
| device_type | varchar(20) | Y | enum `DeviceType` |
| runtime_state | varchar(20) | Y | enum `UnitRuntimeState`, default IDLE |
| is_connected | boolean | Y | default true |
| last_event_at | datetime | N |  |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- unique `(room_id, external_unit_id)`
- index `(room_id, runtime_state)`

---

#### 3.2.8 `cameras`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK `rooms.id` |
| name | varchar(150) | Y |  |
| protocol | varchar(20) | Y | enum `CameraProtocol` |
| ip_address | varchar(100) | Y |  |
| port | integer | N | 1..65535 |
| username | varchar(100) | N |  |
| password_encrypted | text | N | encrypted |
| rtsp_url | varchar(500) | N |  |
| status | varchar(20) | Y | enum `CameraStatus`, default ACTIVE |
| capability_ptz | boolean | Y | default false |
| capability_preset | boolean | Y | default false |
| capability_stream | boolean | Y | default false |
| vendor | varchar(100) | N |  |
| model | varchar(100) | N |  |
| last_test_at | datetime | N |  |
| last_test_result | varchar(20) | N | SUCCESS / PARTIAL / FAILED |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- unique `(room_id, ip_address, port)`

**Rule**

- max 4 cameras per room in MVP

---

#### 3.2.9 `camera_presets`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| camera_id | uuid | Y | FK `cameras.id` |
| preset_code | varchar(50) | Y | unique per camera |
| preset_name | varchar(150) | N |  |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- unique `(camera_id, preset_code)`

---

#### 3.2.10 `mic_camera_mappings`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK `rooms.id` |
| unit_id | uuid | Y | FK `tsd_units.id` |
| camera_id | uuid | Y | FK `cameras.id` |
| preset_id | uuid | Y | FK `camera_presets.id` |
| is_active | boolean | Y | default true |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- unique partial `(unit_id)` where `is_active = true`
- index `(room_id, is_active)`

**Rules**

- preset must belong to camera
- one active mapping per unit

---

#### 3.2.11 `speaking_requests`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK `rooms.id` |
| unit_id | uuid | Y | FK `tsd_units.id` |
| status | varchar(20) | Y | enum `SpeakingRequestStatus` |
| requested_at | datetime | Y |  |
| approved_at | datetime | N |  |
| rejected_at | datetime | N |  |
| resolved_by | uuid | N | FK `users.id` |
| source_event_id | uuid | N | FK `runtime_events.id` |
| note | varchar(255) | N |  |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

**Indexes**

- `(room_id, status, requested_at desc)`
- `(unit_id, status)`

**Rule**

- only used in MANUAL mode
- one unresolved pending request per unit

---

#### 3.2.12 `runtime_events`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | Y | FK `rooms.id` |
| event_type | varchar(100) | Y | raw event name |
| unit_id | uuid | N | FK `tsd_units.id` |
| payload_json | text/json | Y | raw payload |
| received_at | datetime | Y |  |
| processed_at | datetime | N |  |
| processing_status | varchar(20) | Y | enum `RuntimeEventStatus` |
| error_message | varchar(500) | N |  |

**Indexes**

- `(room_id, received_at desc)`
- `(event_type, received_at desc)`

---

#### 3.2.13 `camera_runtime_states`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| camera_id | uuid | Y | FK `cameras.id`, unique |
| current_preset_id | uuid | N | FK `camera_presets.id` |
| current_unit_id | uuid | N | FK `tsd_units.id` |
| last_switch_at | datetime | N |  |
| created_at | datetime | Y |  |
| updated_at | datetime | Y |  |

---

#### 3.2.14 `system_logs`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| room_id | uuid | N | FK `rooms.id` |
| module | varchar(100) | Y |  |
| level | varchar(20) | Y | enum `LogLevel` |
| message | varchar(1000) | Y |  |
| context_json | text/json | N |  |
| created_at | datetime | Y |  |

---

#### 3.2.15 `audit_logs`

| Field | Type | Req | Constraints |
| --- | --- | ---: | --- |
| id | uuid | Y | PK |
| actor_user_id | uuid | N | FK `users.id` |
| action | varchar(50) | Y |  |
| target_type | varchar(50) | Y |  |
| target_id | varchar(100) | N |  |
| result | varchar(20) | Y | SUCCESS / FAILED |
| detail_json | text/json | N |  |
| created_at | datetime | Y |  |

---

### 3.3 Relationships Summary

- `rooms` 1-1 `layouts`
- `rooms` 1-N `layout_annotations`
- `rooms` 1-N `layout_devices`
- `rooms` 1-1 `tsd_connection_configs`
- `rooms` 1-N `tsd_units`
- `rooms` 1-N `cameras`
- `cameras` 1-N `camera_presets`
- `tsd_units` 1-N `mic_camera_mappings`
- `rooms` 1-N `speaking_requests`
- `rooms` 1-N `runtime_events`

---

## 4. API Design

### 4.1 API Conventions

**Base URL**

```http
/api/v1
```

**Auth header**

```http
Authorization: Bearer <token>
```

**Success**

```json
{
  "success": true,
  "data": {}
}
```

**Error**

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

---

### 4.2 Authentication

#### POST `/auth/login`

**Permission:** Public

**Request**

```json
{
  "username": "admin",
  "password": "StrongPass123"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "uuid",
      "username": "admin",
      "role": "ADMIN",
      "status": "ACTIVE"
    }
  }
}
```

**Validation**

- username required
- password required

**Errors**

- 401 INVALID_CREDENTIALS
- 403 USER_INACTIVE

---

#### POST `/auth/logout`

**Permission:** Authenticated

**Response**

```json
{
  "success": true,
  "data": {
    "message": "Logged out"
  }
}
```

---

### 4.3 Users

#### GET `/users`

**Permission:** ADMIN

**Response**

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

---

#### POST `/users`

**Permission:** ADMIN

**Request**

```json
{
  "username": "operator1",
  "password": "StrongPass123",
  "role": "OPERATOR",
  "status": "ACTIVE"
}
```

**Validation**

- username unique
- password min 8
- role valid
- status valid

**Errors**

- 409 USERNAME_ALREADY_EXISTS

---

#### PUT `/users/{id}`

**Permission:** ADMIN

**Request**

```json
{
  "password": "NewStrongPass123",
  "role": "OPERATOR",
  "status": "ACTIVE"
}
```

---

#### PATCH `/users/{id}/status`

**Permission:** ADMIN

**Request**

```json
{
  "status": "INACTIVE"
}
```

**Business rule**

- cannot deactivate the last active admin

---

### 4.4 Layout & Map

#### POST `/rooms/{roomId}/layout`

**Permission:** ADMIN  
**Content-Type:** multipart/form-data

**Form Data**

- `file`: PDF/JPG/JPEG

**Response**

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

---

#### PUT `/rooms/{roomId}/layout/devices`

**Permission:** ADMIN

**Request**

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
      "posX": 0.10,
      "posY": 0.15,
      "iconLabel": "Cam A"
    }
  ]
}
```

**Validation**

- layout exists
- refType valid
- refId exists
- posX/posY within 0..1

---

#### POST `/rooms/{roomId}/annotations`

**Permission:** ADMIN

**Request**

```json
{
  "text": "Main table",
  "posX": 0.45,
  "posY": 0.30
}
```

---

#### PUT `/annotations/{id}`

**Permission:** ADMIN

**Request**

```json
{
  "
```

---

## Note

Tai lieu nguon ban cung cap bi cat tai phan `PUT /annotations/{id}`. File nay luu nguyen trang noi dung hien co va danh dau diem dung de tiep tuc o lan sau.

[1]: https://www.sound-toa.com/download_form_ts-d1000.html?utm_source=chatgpt.com "Digital Conference System | TS-D1000 protocol document"
