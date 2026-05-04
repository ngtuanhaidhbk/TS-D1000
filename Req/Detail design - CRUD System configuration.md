# 1. Overview

## 1.1 Objective

Module **CRUD System Configuration** cho phép **Admin** quản lý cấu hình hệ thống trước khi vận hành runtime, bao gồm:

* tạo/xem/cập nhật/deactivate cấu hình kết nối TS-D1000
* đồng bộ danh sách chairman/delegate unit từ TS-D1000
* tạo/xem/cập nhật/deactivate camera
* tạo/xem/cập nhật/xóa preset của camera
* upload/replace layout
* đặt vị trí thiết bị và quản lý annotation trên layout
* tạo/xem/cập nhật/deactivate mapping mic -> camera preset
* xem/cập nhật operation mode
* test kết nối và chạy readiness check

## 1.2 Scope

Tài liệu này chỉ bao phủ phần **CRUD cấu hình hệ thống**, không bao gồm:

* authentication chi tiết
* session lifecycle chi tiết
* runtime event engine chi tiết
* camera switching runtime
* live stream playback engine
* multi-room orchestration
* licensing

## 1.3 Roles

* `ADMIN`: create/view/update/test/deactivate configuration
* `OPERATOR`: view-only access

## 1.4 Use Cases Covered

* UC-CONFIG-01: View System Configuration Overview
* UC-TSDCFG-01: Create TS-D1000 Configuration
* UC-TSDCFG-02: View TS-D1000 Configuration
* UC-TSDCFG-03: Update TS-D1000 Configuration
* UC-TSDCFG-04: Deactivate TS-D1000 Configuration
* UC-TSDCFG-05: Sync TS-D1000 Device List
* UC-CFGCAM-01: Create Camera
* UC-CFGCAM-02: View Camera List
* UC-CFGCAM-03: View Camera Detail
* UC-CFGCAM-04: Update Camera
* UC-CFGCAM-05: Deactivate Camera
* UC-PRESET-01: Create Camera Preset
* UC-PRESET-02: View Camera Preset List
* UC-PRESET-03: Update Camera Preset
* UC-PRESET-04: Delete Camera Preset
* UC-LAYOUT-01: Upload Layout File
* UC-LAYOUT-02: Replace Layout File
* UC-LAYOUT-03: Place Devices on Layout
* UC-LAYOUT-04: Add Layout Annotation
* UC-LAYOUT-05: Update Layout Annotation
* UC-MAPCFG-01: Create Mic-to-Camera Mapping
* UC-MAPCFG-02: View Mic-to-Camera Mapping List
* UC-MAPCFG-03: Update Mic-to-Camera Mapping
* UC-MAPCFG-04: Deactivate Mic-to-Camera Mapping
* UC-MODE-01: View System Operation Mode
* UC-MODE-02: Update System Operation Mode
* UC-TEST-01: Test TS-D1000 Connection
* UC-TEST-02: Test Camera Connection
* UC-TEST-03: Run System Configuration Readiness Check

## 1.5 Assumptions

1. MVP chỉ có **1 room active**.
2. Mỗi room chỉ có:
   * 1 TS-D1000 configuration active
   * 1 layout active
   * tối đa 4 camera active
3. `Deactivate` được dùng thay cho hard delete đối với TS-D1000 config, camera, và mapping.
4. Camera preset là thực thể con của camera.
5. Mapping active là mapping runtime engine sử dụng.
6. Readiness check là thao tác read-only, không tự sửa dữ liệu.
7. Password TS-D1000 và camera phải được mã hóa khi lưu và không trả về plain text qua API.

---

# 2. Module Breakdown

## 2.1 System Configuration Overview Module

**Responsibility**

* tổng hợp trạng thái cấu hình hiện tại của room
* cung cấp số liệu nhanh cho UI overview

**Related UCs**

* UC-CONFIG-01

## 2.2 TS-D1000 Configuration Module

**Responsibility**

* create/view/update/deactivate TS-D1000 config
* test TS-D1000 connection
* sync unit list

**Related UCs**

* UC-TSDCFG-01
* UC-TSDCFG-02
* UC-TSDCFG-03
* UC-TSDCFG-04
* UC-TSDCFG-05
* UC-TEST-01

## 2.3 Camera Configuration Module

**Responsibility**

* create/view/update/deactivate camera
* view camera detail
* test camera connection

**Related UCs**

* UC-CFGCAM-01
* UC-CFGCAM-02
* UC-CFGCAM-03
* UC-CFGCAM-04
* UC-CFGCAM-05
* UC-TEST-02

## 2.4 Camera Preset Configuration Module

**Responsibility**

* create/view/update/delete camera presets
* enforce preset uniqueness per camera

**Related UCs**

* UC-PRESET-01
* UC-PRESET-02
* UC-PRESET-03
* UC-PRESET-04

## 2.5 Layout & Map Configuration Module

**Responsibility**

* upload/replace layout file
* save device positions
* create/update annotations

**Related UCs**

* UC-LAYOUT-01
* UC-LAYOUT-02
* UC-LAYOUT-03
* UC-LAYOUT-04
* UC-LAYOUT-05

## 2.6 Mic-Camera Mapping Module

**Responsibility**

* create/view/update/deactivate mapping
* enforce one active mapping per unit

**Related UCs**

* UC-MAPCFG-01
* UC-MAPCFG-02
* UC-MAPCFG-03
* UC-MAPCFG-04

## 2.7 Operation Mode Configuration Module

**Responsibility**

* view current operation mode
* update room operation mode

**Related UCs**

* UC-MODE-01
* UC-MODE-02

## 2.8 Configuration Testing & Readiness Module

**Responsibility**

* test TS-D1000 connection
* test camera connection and capability
* evaluate overall configuration readiness

**Related UCs**

* UC-TEST-01
* UC-TEST-02
* UC-TEST-03

---

# 3. Data Model

## 3.1 Enums / Constants

```text
UserRole
- ADMIN
- OPERATOR

OperationMode
- MANUAL
- AUTOMATIC

LayoutFileType
- PDF
- JPG
- JPEG

DeviceType
- CHAIRMAN
- DELEGATE

UnitRuntimeState
- IDLE
- REQUEST
- SPEAKING
- OFFLINE

CameraProtocol
- ONVIF
- VISCA

CameraStatus
- ACTIVE
- INACTIVE
- OFFLINE

TsdConfigStatus
- ACTIVE
- INACTIVE

ConnectionTestResult
- SUCCESS
- PARTIAL
- FAILED

ReadinessStatus
- PASSED
- WARNING
- FAILED

LayoutRefType
- TSD_UNIT
- CAMERA
```

---

## 3.2 Tables

## 3.2.1 `rooms`

| Field          | Type         | Required | Constraints                            |
| -------------- | ------------ | -------: | -------------------------------------- |
| id             | uuid         |        Y | PK                                     |
| name           | varchar(150) |        Y | unique                                 |
| operation_mode | varchar(20)  |        Y | enum `OperationMode`, default `MANUAL` |
| created_at     | datetime     |        Y |                                        |
| updated_at     | datetime     |        Y |                                        |

**Business rules**

* Mỗi room chỉ có 1 `operation_mode` active tại một thời điểm.

---

## 3.2.2 `tsd_connection_configs`

| Field              | Type         | Required | Constraints                 |
| ------------------ | ------------ | -------: | --------------------------- |
| id                 | uuid         |        Y | PK                          |
| room_id            | uuid         |        Y | FK `rooms.id`               |
| base_url           | varchar(255) |        Y | required                    |
| username           | varchar(100) |        N |                             |
| password_encrypted | text         |        N | encrypted at rest           |
| sse_endpoint       | varchar(255) |        Y | default `/api/event`        |
| status             | varchar(20)  |        Y | enum `TsdConfigStatus`      |
| last_test_result   | varchar(20)  |        N | enum `ConnectionTestResult` |
| last_test_at       | datetime     |        N |                             |
| created_at         | datetime     |        Y |                             |
| updated_at         | datetime     |        Y |                             |

**Indexes**

* unique partial index on `(room_id)` where `status = 'ACTIVE'`
* index on `(room_id, status)`

**Business rules**

* Mỗi room chỉ có 1 cấu hình TS-D1000 active.
* Deactivate không xóa vật lý bản ghi.

---

## 3.2.3 `tsd_units`

| Field            | Type         | Required | Constraints                             |
| ---------------- | ------------ | -------: | --------------------------------------- |
| id               | uuid         |        Y | PK                                      |
| room_id          | uuid         |        Y | FK `rooms.id`                           |
| external_unit_id | varchar(100) |        Y | unique per room                         |
| unit_name        | varchar(150) |        N |                                         |
| device_type      | varchar(20)  |        Y | enum `DeviceType`                       |
| runtime_state    | varchar(20)  |        Y | enum `UnitRuntimeState`, default `IDLE` |
| is_connected     | boolean      |        Y | default true                            |
| last_event_at    | datetime     |        N |                                         |
| created_at       | datetime     |        Y |                                         |
| updated_at       | datetime     |        Y |                                         |

**Indexes**

* unique `(room_id, external_unit_id)`
* index `(room_id, device_type)`

---

## 3.2.4 `cameras`

| Field              | Type         | Required | Constraints                           |
| ------------------ | ------------ | -------: | ------------------------------------- |
| id                 | uuid         |        Y | PK                                    |
| room_id            | uuid         |        Y | FK `rooms.id`                         |
| name               | varchar(150) |        Y |                                       |
| protocol           | varchar(20)  |        Y | enum `CameraProtocol`                 |
| ip_address         | varchar(100) |        Y |                                       |
| port               | integer      |        N | 1..65535                              |
| username           | varchar(100) |        N |                                       |
| password_encrypted | text         |        N | encrypted                             |
| rtsp_url           | varchar(500) |        N |                                       |
| vendor             | varchar(100) |        N |                                       |
| model              | varchar(100) |        N |                                       |
| status             | varchar(20)  |        Y | enum `CameraStatus`, default `ACTIVE` |
| capability_ptz     | boolean      |        Y | default false                         |
| capability_preset  | boolean      |        Y | default false                         |
| capability_stream  | boolean      |        Y | default false                         |
| last_test_result   | varchar(20)  |        N | enum `ConnectionTestResult`           |
| last_test_at       | datetime     |        N |                                       |
| created_at         | datetime     |        Y |                                       |
| updated_at         | datetime     |        Y |                                       |

**Indexes**

* unique `(room_id, ip_address, port)`
* index `(room_id, status)`

**Business rules**

* Tối đa 4 camera `ACTIVE` trong MVP.
* Camera `INACTIVE` không được dùng cho active mapping.

---

## 3.2.5 `camera_presets`

| Field       | Type         | Required | Constraints       |
| ----------- | ------------ | -------: | ----------------- |
| id          | uuid         |        Y | PK                |
| camera_id   | uuid         |        Y | FK `cameras.id`   |
| preset_code | varchar(50)  |        Y | unique per camera |
| preset_name | varchar(150) |        N |                   |
| created_at  | datetime     |        Y |                   |
| updated_at  | datetime     |        Y |                   |

**Indexes**

* unique `(camera_id, preset_code)`

**Business rules**

* Preset phải thuộc đúng camera.
* `preset_code` phải duy nhất trong phạm vi camera.

---

## 3.2.6 `layouts`

| Field      | Type         | Required | Constraints           |
| ---------- | ------------ | -------: | --------------------- |
| id         | uuid         |        Y | PK                    |
| room_id    | uuid         |        Y | FK `rooms.id`         |
| file_name  | varchar(255) |        Y |                       |
| file_path  | varchar(500) |        Y |                       |
| file_type  | varchar(10)  |        Y | enum `LayoutFileType` |
| is_active  | boolean      |        Y | default true          |
| width      | integer      |        N |                       |
| height     | integer      |        N |                       |
| created_at | datetime     |        Y |                       |
| updated_at | datetime     |        Y |                       |

**Indexes**

* unique partial index on `(room_id)` where `is_active = true`

**Business rules**

* Mỗi room chỉ có 1 layout active.
* Replace layout tạo active layout mới hoặc cập nhật bản active hiện tại tùy strategy triển khai, nhưng kết quả cuối phải chỉ còn 1 layout active.

---

## 3.2.7 `layout_devices`

| Field      | Type          | Required | Constraints          |
| ---------- | ------------- | -------: | -------------------- |
| id         | uuid          |        Y | PK                   |
| room_id    | uuid          |        Y | FK `rooms.id`        |
| ref_type   | varchar(20)   |        Y | enum `LayoutRefType` |
| ref_id     | uuid          |        Y |                      |
| pos_x      | decimal(10,4) |        Y | range 0..1           |
| pos_y      | decimal(10,4) |        Y | range 0..1           |
| icon_label | varchar(100)  |        N |                      |
| created_at | datetime      |        Y |                      |
| updated_at | datetime      |        Y |                      |

**Indexes**

* unique `(room_id, ref_type, ref_id)`

**Business rules**

* Mỗi thiết bị chỉ có 1 vị trí active trên layout.

---

## 3.2.8 `layout_annotations`

| Field      | Type          | Required | Constraints   |
| ---------- | ------------- | -------: | ------------- |
| id         | uuid          |        Y | PK            |
| room_id    | uuid          |        Y | FK `rooms.id` |
| text       | varchar(500)  |        Y | non-empty     |
| pos_x      | decimal(10,4) |        Y | range 0..1    |
| pos_y      | decimal(10,4) |        Y | range 0..1    |
| created_at | datetime      |        Y |               |
| updated_at | datetime      |        Y |               |

---

## 3.2.9 `mic_camera_mappings`

| Field      | Type     | Required | Constraints            |
| ---------- | -------- | -------: | ---------------------- |
| id         | uuid     |        Y | PK                     |
| room_id    | uuid     |        Y | FK `rooms.id`          |
| unit_id    | uuid     |        Y | FK `tsd_units.id`      |
| camera_id  | uuid     |        Y | FK `cameras.id`        |
| preset_id  | uuid     |        Y | FK `camera_presets.id` |
| is_active  | boolean  |        Y | default true           |
| created_at | datetime |        Y |                        |
| updated_at | datetime |        Y |                        |

**Indexes**

* unique partial `(unit_id)` where `is_active = true`
* index `(room_id, is_active)`

**Business rules**

* Mỗi unit chỉ có 1 mapping active.
* `preset_id` phải thuộc `camera_id`.
* Camera inactive không được dùng trong active mapping.

---

## 3.2.10 `configuration_readiness_results`

Bảng này là optional nếu muốn persist kết quả readiness gần nhất.

| Field      | Type         | Required | Constraints                                  |
| ---------- | ------------ | -------: | -------------------------------------------- |
| id         | uuid         |        Y | PK                                           |
| room_id    | uuid         |        Y | FK `rooms.id`                                |
| category   | varchar(50)  |        Y | `TSD`, `CAMERA`, `LAYOUT`, `MAPPING`, `MODE` |
| status     | varchar(20)  |        Y | enum `ReadinessStatus`                       |
| message    | varchar(500) |        N |                                              |
| checked_at | datetime     |        Y |                                              |

---

## 3.3 Relationships

* `rooms (1) -> (N) tsd_connection_configs`
* `rooms (1) -> (N) tsd_units`
* `rooms (1) -> (N) cameras`
* `cameras (1) -> (N) camera_presets`
* `rooms (1) -> (N) layouts`
* `rooms (1) -> (N) layout_devices`
* `rooms (1) -> (N) layout_annotations`
* `rooms (1) -> (N) mic_camera_mappings`

---

# 4. API Design

## 4.1 Response Convention

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
    "message": "baseUrl is required",
    "details": []
  }
}
```

## 4.2 System Configuration Overview

### GET `/api/v1/config/overview`

**UC:** UC-CONFIG-01  
**Permission:** `ADMIN`, `OPERATOR`

**Response**

```json
{
  "success": true,
  "data": {
    "room": {
      "id": "room-uuid",
      "name": "Meeting Room A",
      "operationMode": "MANUAL"
    },
    "tsdConnection": {
      "configured": true,
      "status": "ACTIVE",
      "lastTestResult": "SUCCESS",
      "lastTestAt": "2026-04-21T09:00:00Z"
    },
    "layout": {
      "configured": true,
      "fileType": "PDF"
    },
    "cameraSummary": {
      "total": 3,
      "active": 2
    },
    "mappingSummary": {
      "total": 20,
      "active": 18
    }
  }
}
```

---

## 4.3 TS-D1000 Configuration

### POST `/api/v1/config/tsd`

**UC:** UC-TSDCFG-01  
**Permission:** `ADMIN`

**Request**

```json
{
  "baseUrl": "http://192.168.1.10",
  "username": "admin",
  "password": "secret",
  "sseEndpoint": "/api/event"
}
```

### GET `/api/v1/config/tsd/current`

**UC:** UC-TSDCFG-02  
**Permission:** `ADMIN`, `OPERATOR`

### PUT `/api/v1/config/tsd/{id}`

**UC:** UC-TSDCFG-03  
**Permission:** `ADMIN`

### PATCH `/api/v1/config/tsd/{id}/deactivate`

**UC:** UC-TSDCFG-04  
**Permission:** `ADMIN`

**Request**

```json
{
  "reason": "Replaced by new TS-D1000 endpoint"
}
```

### POST `/api/v1/config/tsd/{id}/sync-units`

**UC:** UC-TSDCFG-05  
**Permission:** `ADMIN`

### POST `/api/v1/config/tsd/{id}/test`

**UC:** UC-TEST-01  
**Permission:** `ADMIN`

---

## 4.4 Camera Configuration

### GET `/api/v1/config/cameras`

**UC:** UC-CFGCAM-02  
**Permission:** `ADMIN`, `OPERATOR`

### GET `/api/v1/config/cameras/{id}`

**UC:** UC-CFGCAM-03  
**Permission:** `ADMIN`, `OPERATOR`

### POST `/api/v1/config/cameras`

**UC:** UC-CFGCAM-01  
**Permission:** `ADMIN`

### PUT `/api/v1/config/cameras/{id}`

**UC:** UC-CFGCAM-04  
**Permission:** `ADMIN`

### PATCH `/api/v1/config/cameras/{id}/deactivate`

**UC:** UC-CFGCAM-05  
**Permission:** `ADMIN`

### POST `/api/v1/config/cameras/{id}/test`

**UC:** UC-TEST-02  
**Permission:** `ADMIN`

---

## 4.5 Camera Preset Configuration

### GET `/api/v1/config/cameras/{id}/presets`

**UC:** UC-PRESET-02  
**Permission:** `ADMIN`, `OPERATOR`

### POST `/api/v1/config/cameras/{id}/presets`

**UC:** UC-PRESET-01  
**Permission:** `ADMIN`

### PUT `/api/v1/config/presets/{id}`

**UC:** UC-PRESET-03  
**Permission:** `ADMIN`

### DELETE `/api/v1/config/presets/{id}`

**UC:** UC-PRESET-04  
**Permission:** `ADMIN`

---

## 4.6 Layout & Map Configuration

### GET `/api/v1/config/layout/current`

**UC:** UC-LAYOUT-01, UC-LAYOUT-02  
**Permission:** `ADMIN`, `OPERATOR`

### POST `/api/v1/config/layout`

**UC:** UC-LAYOUT-01  
**Permission:** `ADMIN`  
**Content-Type:** `multipart/form-data`

### PUT `/api/v1/config/layout/{id}/replace`

**UC:** UC-LAYOUT-02  
**Permission:** `ADMIN`  
**Content-Type:** `multipart/form-data`

### PUT `/api/v1/config/layout/devices`

**UC:** UC-LAYOUT-03  
**Permission:** `ADMIN`

### POST `/api/v1/config/layout/annotations`

**UC:** UC-LAYOUT-04  
**Permission:** `ADMIN`

### PUT `/api/v1/config/layout/annotations/{id}`

**UC:** UC-LAYOUT-05  
**Permission:** `ADMIN`

---

## 4.7 Mic-Camera Mapping Configuration

### GET `/api/v1/config/mappings`

**UC:** UC-MAPCFG-02  
**Permission:** `ADMIN`, `OPERATOR`

### POST `/api/v1/config/mappings`

**UC:** UC-MAPCFG-01  
**Permission:** `ADMIN`

### PUT `/api/v1/config/mappings/{id}`

**UC:** UC-MAPCFG-03  
**Permission:** `ADMIN`

### PATCH `/api/v1/config/mappings/{id}/deactivate`

**UC:** UC-MAPCFG-04  
**Permission:** `ADMIN`

---

## 4.8 Operation Mode Configuration

### GET `/api/v1/config/mode`

**UC:** UC-MODE-01  
**Permission:** `ADMIN`, `OPERATOR`

### PUT `/api/v1/config/mode`

**UC:** UC-MODE-02  
**Permission:** `ADMIN`

---

## 4.9 Configuration Testing & Readiness

### POST `/api/v1/config/readiness/check`

**UC:** UC-TEST-03  
**Permission:** `ADMIN`

**Response**

```json
{
  "success": true,
  "data": {
    "overallStatus": "WARNING",
    "items": [
      {
        "category": "TSD",
        "status": "PASSED",
        "message": "TS-D1000 configuration exists and last test succeeded"
      },
      {
        "category": "MAPPING",
        "status": "WARNING",
        "message": "2 units do not have active mappings"
      }
    ]
  }
}
```

---

# 5. Business Logic (Service Layer)

## 5.1 UC-CONFIG-01 View System Configuration Overview

**Service:** `SystemConfigOverviewService.getOverview(roomId, actor)`

1. Check actor role: `ADMIN` or `OPERATOR`.
2. Load active room.
3. Load active TS-D config summary.
4. Load camera counts.
5. Load active layout summary.
6. Load mapping counts.
7. Return aggregated overview.

**Edge cases**

* missing sub-config returns `configured = false`, not server error
* room not found -> `404`

---

## 5.2 UC-TSDCFG-01 Create TS-D1000 Configuration

**Service:** `TsdConfigService.createConfig(roomId, payload, actor)`

1. Check `ADMIN`.
2. Validate payload.
3. Ensure room exists.
4. Ensure no active TS-D config exists for room.
5. Encrypt password if provided.
6. Insert new config with `status = ACTIVE`.
7. Write audit log.
8. Return created config without plain password.

**Edge cases**

* active config already exists -> `409`
* invalid base URL -> `400`

---

## 5.3 UC-TSDCFG-02 View TS-D1000 Configuration

**Service:** `TsdConfigQueryService.getCurrent(roomId, actor)`

1. Check `ADMIN` or `OPERATOR`.
2. Load active config if any.
3. Mask sensitive fields.
4. Return config or `null/not configured`.

---

## 5.4 UC-TSDCFG-03 Update TS-D1000 Configuration

**Service:** `TsdConfigService.updateConfig(configId, payload, actor)`

1. Check `ADMIN`.
2. Load config by id.
3. Validate payload.
4. Encrypt password only if password changed.
5. Update allowed fields.
6. Keep config status unchanged.
7. Write audit log.

**Edge cases**

* config not found -> `404`
* required field empty -> `400`

---

## 5.5 UC-TSDCFG-04 Deactivate TS-D1000 Configuration

**Service:** `TsdConfigService.deactivateConfig(configId, actor)`

1. Check `ADMIN`.
2. Load config.
3. Ensure config is currently `ACTIVE`.
4. Update `status = INACTIVE`.
5. Write audit log.

**Edge cases**

* config missing -> `404`
* already inactive -> `409`

---

## 5.6 UC-TSDCFG-05 Sync TS-D1000 Device List

**Service:** `TsdUnitSyncService.syncUnits(configId, actor)`

1. Check `ADMIN`.
2. Load config and ensure it is `ACTIVE`.
3. Call TS-D integration endpoint.
4. Parse response.
5. For each record:
   * validate required external ID
   * match by `(room_id, external_unit_id)`
   * create if not exists
   * update if exists
6. Count created/updated/skipped.
7. Write audit and system logs.
8. Return sync summary.

**Edge cases**

* TS-D unreachable -> `502/503`
* malformed payload -> `502`
* invalid row -> skip row, log warning

---

## 5.7 UC-CFGCAM-01 Create Camera

**Service:** `CameraConfigService.createCamera(roomId, payload, actor)`

1. Check `ADMIN`.
2. Validate payload.
3. Count active cameras.
4. Reject if active count >= 4.
5. Ensure `(room_id, ip_address, port)` unique.
6. Encrypt password if provided.
7. Insert camera with `status = ACTIVE`.
8. Write audit log.

**Edge cases**

* duplicate IP/port -> `409`
* invalid protocol -> `400`

---

## 5.8 UC-CFGCAM-02 View Camera List

**Service:** `CameraQueryService.listCameras(roomId, actor, filters)`

1. Check `ADMIN` or `OPERATOR`.
2. Query cameras by room.
3. Apply filter/search/sort if present.
4. Return list without plain password.

---

## 5.9 UC-CFGCAM-03 View Camera Detail

**Service:** `CameraQueryService.getCameraDetail(cameraId, actor)`

1. Check `ADMIN` or `OPERATOR`.
2. Load camera.
3. Load presets for camera.
4. Return detail object without plain password.

**Edge cases**

* camera not found -> `404`

---

## 5.10 UC-CFGCAM-04 Update Camera

**Service:** `CameraConfigService.updateCamera(cameraId, payload, actor)`

1. Check `ADMIN`.
2. Load camera.
3. Validate payload.
4. Ensure updated IP/port remains unique.
5. Encrypt password if changed.
6. Update allowed fields.
7. Write audit log.

**Edge cases**

* camera not found -> `404`
* duplicate IP/port after update -> `409`

---

## 5.11 UC-CFGCAM-05 Deactivate Camera

**Service:** `CameraConfigService.deactivateCamera(cameraId, actor)`

1. Check `ADMIN`.
2. Load camera.
3. Ensure camera is `ACTIVE`.
4. Check active mappings referencing this camera.
5. If active mapping exists, reject operation.
6. Update `status = INACTIVE`.
7. Write audit log.

**Edge cases**

* already inactive -> `409`
* active mapping dependency exists -> `422`

---

## 5.12 UC-PRESET-01 Create Camera Preset

**Service:** `CameraPresetService.createPreset(cameraId, payload, actor)`

1. Check `ADMIN`.
2. Load camera.
3. Validate camera supports preset if capability is known.
4. Validate preset code.
5. Ensure `(camera_id, preset_code)` unique.
6. Insert preset.
7. Write audit log.

**Edge cases**

* camera missing -> `404`
* duplicate preset code -> `409`
* unsupported preset capability -> `422`

---

## 5.13 UC-PRESET-02 View Camera Preset List

**Service:** `CameraPresetQueryService.listPresets(cameraId, actor)`

1. Check `ADMIN` or `OPERATOR`.
2. Load camera.
3. Query presets for camera.
4. Return list.

---

## 5.14 UC-PRESET-03 Update Camera Preset

**Service:** `CameraPresetService.updatePreset(presetId, payload, actor)`

1. Check `ADMIN`.
2. Load preset with camera relation.
3. Validate new values.
4. Ensure updated preset code stays unique in same camera.
5. Update preset.
6. Write audit log.

**Edge cases**

* preset not found -> `404`
* duplicate preset code -> `409`

---

## 5.15 UC-PRESET-04 Delete Camera Preset

**Service:** `CameraPresetService.deletePreset(presetId, actor)`

1. Check `ADMIN`.
2. Load preset.
3. Check active mappings referencing preset.
4. Reject delete if dependency exists.
5. Delete preset record.
6. Write audit log.

**Edge cases**

* preset not found -> `404`
* preset used by active mapping -> `422`

---

## 5.16 UC-LAYOUT-01 Upload Layout File

**Service:** `LayoutService.uploadLayout(roomId, file, actor)`

1. Check `ADMIN`.
2. Validate file exists and extension/type is allowed.
3. Store file.
4. Ensure only one active layout for room.
5. Insert or upsert active layout.
6. Write audit log.

**Edge cases**

* invalid file type -> `400`
* storage failure -> `500`

---

## 5.17 UC-LAYOUT-02 Replace Layout File

**Service:** `LayoutService.replaceLayout(layoutId, file, actor)`

1. Check `ADMIN`.
2. Load active layout.
3. Validate replacement file.
4. Store new file.
5. Deactivate old layout or update current record according to strategy.
6. Ensure exactly one active layout remains.
7. Write audit log.

**Edge cases**

* layout not found -> `404`
* invalid file type -> `400`

---

## 5.18 UC-LAYOUT-03 Place Devices on Layout

**Service:** `LayoutDeviceService.savePositions(roomId, devices, actor)`

1. Check `ADMIN`.
2. Ensure active layout exists.
3. Validate each device entry:
   * `refType` valid
   * `refId` exists and matches ref type
   * `posX`, `posY` within `0..1`
4. Reject duplicate same `(refType, refId)` in same payload.
5. Upsert each layout device record.
6. Write audit log.

**Edge cases**

* no active layout -> `422`
* referenced entity missing -> `400`
* duplicate same device in payload -> `400`

---

## 5.19 UC-LAYOUT-04 Add Layout Annotation

**Service:** `LayoutAnnotationService.createAnnotation(roomId, payload, actor)`

1. Check `ADMIN`.
2. Ensure active layout exists.
3. Validate text and coordinates.
4. Insert annotation.
5. Write audit log.

**Edge cases**

* blank text -> `400`
* invalid coordinates -> `400`

---

## 5.20 UC-LAYOUT-05 Update Layout Annotation

**Service:** `LayoutAnnotationService.updateAnnotation(annotationId, payload, actor)`

1. Check `ADMIN`.
2. Load annotation.
3. Validate updated text/coordinates.
4. Update annotation.
5. Write audit log.

**Edge cases**

* annotation not found -> `404`
* invalid payload -> `400`

---

## 5.21 UC-MAPCFG-01 Create Mic-to-Camera Mapping

**Service:** `MappingService.createMapping(roomId, payload, actor)`

1. Check `ADMIN`.
2. Validate referenced unit, camera, preset.
3. Ensure all belong to same room.
4. Ensure preset belongs to camera.
5. Ensure camera is `ACTIVE`.
6. Ensure unit has no active mapping.
7. Insert mapping with `is_active = true`.
8. Write audit log.

**Edge cases**

* preset-camera mismatch -> `422`
* unit already has active mapping -> `409`
* inactive camera -> `422`

---

## 5.22 UC-MAPCFG-02 View Mic-to-Camera Mapping List

**Service:** `MappingQueryService.listMappings(roomId, actor, filters)`

1. Check `ADMIN` or `OPERATOR`.
2. Query mappings with joins to unit/camera/preset.
3. Apply filters.
4. Return list.

---

## 5.23 UC-MAPCFG-03 Update Mic-to-Camera Mapping

**Service:** `MappingService.updateMapping(mappingId, payload, actor)`

1. Check `ADMIN`.
2. Load mapping.
3. Validate camera/preset relation.
4. Validate target camera active when `isActive = true`.
5. If update enables active state, enforce one active mapping per unit.
6. Update mapping.
7. Write audit log.

**Edge cases**

* mapping not found -> `404`
* preset-camera mismatch -> `422`
* duplicate active mapping for unit -> `409`

---

## 5.24 UC-MAPCFG-04 Deactivate Mic-to-Camera Mapping

**Service:** `MappingService.deactivateMapping(mappingId, actor)`

1. Check `ADMIN`.
2. Load mapping.
3. Ensure mapping is active.
4. Update `is_active = false`.
5. Write audit log.

**Edge cases**

* mapping not found -> `404`
* already inactive -> `409`

---

## 5.25 UC-MODE-01 View System Operation Mode

**Service:** `OperationModeQueryService.getMode(roomId, actor)`

1. Check `ADMIN` or `OPERATOR`.
2. Load room.
3. Return current mode.

---

## 5.26 UC-MODE-02 Update System Operation Mode

**Service:** `OperationModeService.updateMode(roomId, mode, actor)`

1. Check `ADMIN`.
2. Validate mode enum.
3. Load room.
4. Update `operation_mode`.
5. Write audit log.
6. Return updated mode.

**Edge cases**

* invalid mode -> `400`
* room missing -> `404`

---

## 5.27 UC-TEST-01 Test TS-D1000 Connection

**Service:** `TsdConnectionTestService.test(configId, actor)`

1. Check `ADMIN`.
2. Load config.
3. Attempt connectivity test using active config.
4. Update `last_test_result` and `last_test_at`.
5. Write audit and system logs.
6. Return result.

**Edge cases**

* config not found -> `404`
* network timeout -> `502/503`

---

## 5.28 UC-TEST-02 Test Camera Connection

**Service:** `CameraConnectionTestService.test(cameraId, actor)`

1. Check `ADMIN`.
2. Load camera.
3. Resolve adapter by protocol/vendor.
4. Test network/auth/capabilities.
5. Update:
   * `last_test_result`
   * `last_test_at`
   * capability flags if detectable
6. Write audit and system logs.
7. Return result object.

**Edge cases**

* camera missing -> `404`
* unsupported adapter -> `422` or `501`
* camera unreachable -> `502/503`

---

## 5.29 UC-TEST-03 Run System Configuration Readiness Check

**Service:** `SystemReadinessService.check(roomId, actor)`

1. Check `ADMIN`.
2. Load room.
3. Evaluate:
   * active TS-D config exists
   * TS-D last test success
   * at least one active camera exists
   * active layout exists
   * units synced
   * operation mode set
   * mappings valid
4. Build item list with `PASSED`, `WARNING`, `FAILED`.
5. Compute overall status:
   * `FAILED` if any blocking item failed
   * else `WARNING` if any warning
   * else `PASSED`
6. Optionally persist result.
7. Return readiness result.

**Edge cases**

* partial data missing -> readiness result, not exception
* cannot read required data -> `500`

---

# 6. Validation Rules

## 6.1 Field-Level Validation

### TS-D Config

* `baseUrl`: required, non-empty
* `username`: optional, trim
* `password`: optional, trim
* `sseEndpoint`: optional, but if sent must be non-empty

### Camera

* `name`: required
* `protocol`: must be `ONVIF` or `VISCA`
* `ipAddress`: required
* `port`: optional, if sent must be `1..65535`

### Preset

* `presetCode`: required
* `presetName`: optional

### Layout

* file type: only `PDF`, `JPG`, `JPEG`

### Layout Device / Annotation

* `posX`: `0..1`
* `posY`: `0..1`
* `text`: non-empty for annotation

### Mapping

* `unitId`: required
* `cameraId`: required
* `presetId`: required

### Mode

* `mode`: `MANUAL` or `AUTOMATIC`

---

## 6.2 Cross-Field Validation

* `presetId` must belong to `cameraId`
* `cameraId`, `unitId`, and mapping must belong to same room
* `refType = TSD_UNIT` -> `refId` must exist in `tsd_units`
* `refType = CAMERA` -> `refId` must exist in `cameras`
* if `mapping.is_active = true`, target camera must be `ACTIVE`

---

## 6.3 Business Validation

* only `ADMIN` may modify configuration
* `OPERATOR` is read-only
* max 4 active cameras per room
* one active TS-D config per room
* one active layout per room
* one active mapping per unit
* inactive camera cannot be used in active mapping
* preset in active mapping cannot be deleted
* deactivate camera must be blocked if active mapping depends on it
* readiness check does not auto-fix data

---

## 6.4 Uniqueness Constraints

* active `tsd_connection_configs.room_id`
* `tsd_units (room_id, external_unit_id)`
* `cameras (room_id, ip_address, port)`
* `camera_presets (camera_id, preset_code)`
* `layout_devices (room_id, ref_type, ref_id)`
* active mapping per unit

---

## 6.5 Date Rules

* every mutation updates `updated_at`
* test connection updates `last_test_at`

---

# 7. State Transitions

## 7.1 TS-D1000 Configuration Status

```text
ACTIVE -> INACTIVE
```

**Rules**

* only active config can be used for sync/test/runtime
* inactive config remains in history

---

## 7.2 Camera Status

```text
ACTIVE -> INACTIVE
INACTIVE -> ACTIVE
ACTIVE -> OFFLINE
OFFLINE -> ACTIVE
```

**Rules**

* `INACTIVE` is admin-driven config state
* `OFFLINE` is technical state from connectivity/runtime observation
* inactive camera cannot be used in active mapping

---

## 7.3 Mapping State

```text
ACTIVE -> INACTIVE
INACTIVE -> ACTIVE
```

**Rules**

* represented by `is_active`
* only one active mapping per unit

---

## 7.4 Operation Mode

```text
MANUAL <-> AUTOMATIC
```

**Rules**

* exactly one mode is active at a time at room level

---

# 8. Authorization Rules

## Roles

* `ADMIN`
* `OPERATOR`

## Access Matrix

| API Group                         | ADMIN | OPERATOR |
| --------------------------------- | :---: | :------: |
| View config overview              |   Y   |     Y    |
| Create/view/update/deactivate TSD |   Y   |  view Y  |
| Sync TS-D units                   |   Y   |     N    |
| Create/view/update/deactivate cam |   Y   |  view Y  |
| Test camera / TS-D                |   Y   |     N    |
| Create/update/delete preset       |   Y   |     N    |
| View preset list                  |   Y   |     Y    |
| Upload/replace layout             |   Y   |     N    |
| Save layout devices               |   Y   |     N    |
| Create/update annotation          |   Y   |     N    |
| Create/update/deactivate mapping  |   Y   |     N    |
| View mapping list                 |   Y   |     Y    |
| View/update mode                  | view/update Y | view Y |
| Run readiness check               |   Y   |     N    |

**Data restrictions**

* operator chỉ được đọc dữ liệu config
* password fields never returned in plain text for any role

---

# 9. Background Jobs / Automation

## 9.1 No mandatory scheduled job in scope

Module CRUD config không yêu cầu cron bắt buộc theo UC hiện tại.

## 9.2 Async / Integration Candidates

Các xử lý sau có thể triển khai sync hoặc async nội bộ:

* test TS-D1000 connection
* sync TS-D unit list
* test camera connection
* readiness check nếu muốn chạy nền với dataset lớn

## 9.3 Runtime Side Effects

Khi config đổi, runtime module có thể cần reload cache:

* update/deactivate TS-D config -> reconnect policy
* create/update/deactivate mapping -> refresh mapping cache
* update mode -> runtime switches mode behavior

Đây là side effect kỹ thuật, không phải use case mới.

---

# 10. Logging & Audit

## 10.1 Actions to Audit

* create/update/deactivate TS-D config
* sync TS-D units
* create/update/deactivate camera
* create/update/delete preset
* upload/replace layout
* save layout positions
* create/update annotation
* create/update/deactivate mapping
* update operation mode
* run TS-D test
* run camera test
* run readiness check

## 10.2 Audit Log Structure

```json
{
  "actorUserId": "admin-uuid",
  "action": "DEACTIVATE_CAMERA",
  "targetType": "CAMERA",
  "targetId": "camera-uuid",
  "result": "SUCCESS",
  "detailJson": {
    "roomId": "room-uuid",
    "previousStatus": "ACTIVE",
    "newStatus": "INACTIVE"
  }
}
```

## 10.3 System Logs

System log cần ghi cho:

* TS-D API failures
* camera adapter failures
* sync parse errors
* readiness calculation errors
* storage/upload failures

---

# 11. Error Handling

## 11.1 Error Types

### Validation Error

* missing required field
* invalid enum
* invalid coordinate
* invalid file type

**HTTP:** `400 Bad Request`

### Unauthorized

* missing/invalid token

**HTTP:** `401 Unauthorized`

### Forbidden

* operator attempts to modify config

**HTTP:** `403 Forbidden`

### Not Found

* room/config/camera/preset/layout/annotation/mapping not found

**HTTP:** `404 Not Found`

### Conflict

* duplicate active TS-D config
* duplicate IP/port camera
* duplicate preset code
* duplicate active mapping per unit
* deactivate inactive entity

**HTTP:** `409 Conflict`

### Business Rule Error

* inactive camera used for active mapping
* camera referenced by active mapping on deactivate
* preset referenced by active mapping on delete

**HTTP:** `422 Unprocessable Entity`

### Integration Error

* TS-D unreachable
* camera connection failure
* malformed external response

**HTTP:** `502 Bad Gateway` or `503 Service Unavailable`

### System Error

* DB failure
* storage failure
* unexpected exception

**HTTP:** `500 Internal Server Error`

## 11.2 Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "CAMERA_ALREADY_IN_USE",
    "message": "Camera is referenced by active mappings",
    "details": []
  }
}
```

---

# 12. Traceability: UC -> API -> Service

| UC           | API                                        | Service                                   |
| ------------ | ------------------------------------------ | ----------------------------------------- |
| UC-CONFIG-01 | `GET /config/overview`                     | `SystemConfigOverviewService.getOverview` |
| UC-TSDCFG-01 | `POST /config/tsd`                         | `TsdConfigService.createConfig`           |
| UC-TSDCFG-02 | `GET /config/tsd/current`                  | `TsdConfigQueryService.getCurrent`        |
| UC-TSDCFG-03 | `PUT /config/tsd/{id}`                     | `TsdConfigService.updateConfig`           |
| UC-TSDCFG-04 | `PATCH /config/tsd/{id}/deactivate`        | `TsdConfigService.deactivateConfig`       |
| UC-TSDCFG-05 | `POST /config/tsd/{id}/sync-units`         | `TsdUnitSyncService.syncUnits`            |
| UC-CFGCAM-01 | `POST /config/cameras`                     | `CameraConfigService.createCamera`        |
| UC-CFGCAM-02 | `GET /config/cameras`                      | `CameraQueryService.listCameras`          |
| UC-CFGCAM-03 | `GET /config/cameras/{id}`                 | `CameraQueryService.getCameraDetail`      |
| UC-CFGCAM-04 | `PUT /config/cameras/{id}`                 | `CameraConfigService.updateCamera`        |
| UC-CFGCAM-05 | `PATCH /config/cameras/{id}/deactivate`    | `CameraConfigService.deactivateCamera`    |
| UC-PRESET-01 | `POST /config/cameras/{id}/presets`        | `CameraPresetService.createPreset`        |
| UC-PRESET-02 | `GET /config/cameras/{id}/presets`         | `CameraPresetQueryService.listPresets`    |
| UC-PRESET-03 | `PUT /config/presets/{id}`                 | `CameraPresetService.updatePreset`        |
| UC-PRESET-04 | `DELETE /config/presets/{id}`              | `CameraPresetService.deletePreset`        |
| UC-LAYOUT-01 | `POST /config/layout`                      | `LayoutService.uploadLayout`              |
| UC-LAYOUT-02 | `PUT /config/layout/{id}/replace`          | `LayoutService.replaceLayout`             |
| UC-LAYOUT-03 | `PUT /config/layout/devices`               | `LayoutDeviceService.savePositions`       |
| UC-LAYOUT-04 | `POST /config/layout/annotations`          | `LayoutAnnotationService.createAnnotation`|
| UC-LAYOUT-05 | `PUT /config/layout/annotations/{id}`      | `LayoutAnnotationService.updateAnnotation`|
| UC-MAPCFG-01 | `POST /config/mappings`                    | `MappingService.createMapping`            |
| UC-MAPCFG-02 | `GET /config/mappings`                     | `MappingQueryService.listMappings`        |
| UC-MAPCFG-03 | `PUT /config/mappings/{id}`                | `MappingService.updateMapping`            |
| UC-MAPCFG-04 | `PATCH /config/mappings/{id}/deactivate`   | `MappingService.deactivateMapping`        |
| UC-MODE-01   | `GET /config/mode`                         | `OperationModeQueryService.getMode`       |
| UC-MODE-02   | `PUT /config/mode`                         | `OperationModeService.updateMode`         |
| UC-TEST-01   | `POST /config/tsd/{id}/test`               | `TsdConnectionTestService.test`           |
| UC-TEST-02   | `POST /config/cameras/{id}/test`           | `CameraConnectionTestService.test`        |
| UC-TEST-03   | `POST /config/readiness/check`             | `SystemReadinessService.check`            |

---

# 13. Suggested Backend Structure

```text
src/
  modules/
    system-config/
      overview/
        system-config.controller.ts
        system-config-overview.service.ts
      tsd-config/
        tsd-config.controller.ts
        tsd-config.service.ts
        tsd-config-query.service.ts
        tsd-unit-sync.service.ts
        tsd-connection-test.service.ts
      camera-config/
        camera-config.controller.ts
        camera-config.service.ts
        camera-query.service.ts
        camera-connection-test.service.ts
      camera-presets/
        camera-preset.controller.ts
        camera-preset.service.ts
        camera-preset-query.service.ts
      layout/
        layout.controller.ts
        layout.service.ts
        layout-device.service.ts
        layout-annotation.service.ts
      mappings/
        mapping.controller.ts
        mapping.service.ts
        mapping-query.service.ts
      mode/
        operation-mode.controller.ts
        operation-mode.service.ts
        operation-mode-query.service.ts
      readiness/
        readiness.controller.ts
        system-readiness.service.ts
  common/
    guards/
    exceptions/
    validators/
    audit/
    integrations/
```

---

# 14. Developer Notes

## 14.1 Sensitive fields

* TS-D1000 password và camera password phải được mã hóa khi lưu.
* API response không được trả plain password.

## 14.2 Delete strategy

* TS-D1000 config: deactivate
* camera: deactivate
* mapping: deactivate
* preset: hard delete được phép nếu không có active dependency

## 14.3 Readiness policy

* readiness là phép kiểm tra read-only
* không tự sinh mapping
* không tự sync unit
* không tự test connection

---

# 15. Out of Scope

Không bao gồm trong tài liệu này:

* runtime event engine chi tiết
* anti-jitter camera switching
* manual speaking queue logic
* live stream playback pipeline
* multi-room orchestration
* licensing
