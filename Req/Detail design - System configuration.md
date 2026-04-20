# Detail Design - System Configuration

Dưới đây là **Detail Design – phần Cấu hình hệ thống (System Configuration)**, bám theo requirement + UC bạn đã chốt cho hệ thống điều khiển phòng họp dùng **TS-D1000 + camera PTZ**. Về mặt nền tảng sản phẩm, dòng TS-D1000 có browser-based settings/control từ PC/tablet và TOA có tài liệu riêng cho browser settings, nên việc tách riêng một module “Cấu hình hệ thống” là phù hợp với bản chất hệ thống này. ([Toa Products][1])

# 1. Overview

## 1.1 Mục tiêu

Module **System Configuration** cho phép **Admin** cấu hình toàn bộ hệ thống trước khi vận hành runtime, bao gồm:

* cấu hình kết nối TS-D1000
* đồng bộ danh sách chairman/delegate unit
* cấu hình camera PTZ
* cấu hình preset camera
* upload layout PDF/JPG
* đặt vị trí mic/camera trên map
* tạo mapping mic → camera preset
* chọn chế độ vận hành `MANUAL` / `AUTOMATIC`
* kiểm tra mức độ sẵn sàng của cấu hình

## 1.2 Phạm vi

Tài liệu này chỉ bao phủ phần **cấu hình hệ thống**, không bao gồm:

* authentication chi tiết
* runtime event engine chi tiết
* manual speaking queue chi tiết
* live video playback engine chi tiết
* licensing
* multi-room / multi-site

## 1.3 Roles

* `ADMIN`: full configuration access
* `OPERATOR`: view-only access

## 1.4 Use Cases Covered

* UC-CONFIG-01: View System Configuration Overview
* UC-TSDCFG-01: Configure TS-D1000 Connection
* UC-TSDCFG-02: Update TS-D1000 Connection
* UC-TSDCFG-03: Load TS-D1000 Device List
* UC-CFGCAM-01: Add Camera
* UC-CFGCAM-02: Update Camera
* UC-CFGCAM-03: Deactivate Camera
* UC-CFGCAM-04: Configure Camera Preset
* UC-LAYOUT-01: Upload Layout File
* UC-LAYOUT-02: Place Devices on Layout
* UC-LAYOUT-03: Add or Update Layout Annotation
* UC-MAPCFG-01: Create Mic-to-Camera Mapping
* UC-MAPCFG-02: Update Mic-to-Camera Mapping
* UC-MAPCFG-03: View Mic-to-Camera Mapping List
* UC-MODE-01: Set System Operation Mode
* UC-TEST-01: Test TS-D1000 Connection
* UC-TEST-02: Test Camera Connection
* UC-TEST-03: Test System Configuration Readiness

## 1.5 Assumptions

1. MVP chỉ có **1 room active**.
2. Mỗi room có:

   * 1 cấu hình TS-D1000 active
   * 1 layout active
   * tối đa 4 camera active
3. Xóa camera/mapping trong phase này được hiểu là **deactivate**, không hard delete.
4. Preset camera có thể được lưu từ phần mềm hoặc nhập như preset đã có.
5. Operator chỉ xem cấu hình, không sửa.
6. Runtime engine sẽ chỉ dùng dữ liệu config active mới nhất.

---

# 2. Module Breakdown

## 2.1 System Configuration Overview Module

**Responsibility**

* hiển thị trạng thái tổng thể cấu hình room
* tập hợp dữ liệu từ các module con

**Related UCs**

* UC-CONFIG-01

## 2.2 TS-D1000 Configuration Module

**Responsibility**

* lưu kết nối TS-D1000
* test kết nối
* load/sync device list

**Related UCs**

* UC-TSDCFG-01
* UC-TSDCFG-02
* UC-TSDCFG-03
* UC-TEST-01

## 2.3 Camera Configuration Module

**Responsibility**

* thêm/sửa/deactivate camera
* test kết nối camera
* quản lý preset

**Related UCs**

* UC-CFGCAM-01
* UC-CFGCAM-02
* UC-CFGCAM-03
* UC-CFGCAM-04
* UC-TEST-02

## 2.4 Layout & Map Configuration Module

**Responsibility**

* upload layout
* lưu vị trí thiết bị
* quản lý annotation

**Related UCs**

* UC-LAYOUT-01
* UC-LAYOUT-02
* UC-LAYOUT-03

## 2.5 Mic-Camera Mapping Module

**Responsibility**

* tạo/cập nhật/xem mapping giữa unit và camera preset
* đảm bảo chỉ có 1 mapping active cho mỗi unit

**Related UCs**

* UC-MAPCFG-01
* UC-MAPCFG-02
* UC-MAPCFG-03

## 2.6 Operation Mode Configuration Module

**Responsibility**

* lưu mode vận hành của room
* cung cấp mode cho runtime engine

**Related UCs**

* UC-MODE-01

## 2.7 Configuration Readiness Module

**Responsibility**

* kiểm tra tính đầy đủ và hợp lệ của cấu hình
* trả kết quả Passed / Warning / Failed

**Related UCs**

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

* Mỗi room có đúng 1 `operation_mode` active tại một thời điểm.

---

## 3.2.2 `tsd_connection_configs`

| Field              | Type         | Required | Constraints                 |
| ------------------ | ------------ | -------: | --------------------------- |
| id                 | uuid         |        Y | PK                          |
| room_id            | uuid         |        Y | FK `rooms.id`, unique       |
| base_url           | varchar(255) |        Y | required                    |
| username           | varchar(100) |        N |                             |
| password_encrypted | text         |        N | encrypted at rest           |
| sse_endpoint       | varchar(255) |        Y | default `/api/event`        |
| is_active          | boolean      |        Y | default true                |
| last_test_result   | varchar(20)  |        N | enum `ConnectionTestResult` |
| last_test_at       | datetime     |        N |                             |
| created_at         | datetime     |        Y |                             |
| updated_at         | datetime     |        Y |                             |

**Indexes**

* unique index on `room_id`

**Business rules**

* 1 room chỉ có 1 cấu hình TS-D1000 active.
* `base_url` là bắt buộc.

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

**Business rules**

* `external_unit_id` là định danh duy nhất của unit trong room.
* Unit phải thuộc một room.

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

**Business rules**

* Tối đa 4 camera active trong MVP.
* Camera inactive không được dùng cho runtime mapping active.

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
| room_id    | uuid         |        Y | FK `rooms.id`, unique |
| file_name  | varchar(255) |        Y |                       |
| file_path  | varchar(500) |        Y |                       |
| file_type  | varchar(10)  |        Y | enum `LayoutFileType` |
| width      | integer      |        N |                       |
| height     | integer      |        N |                       |
| created_at | datetime     |        Y |                       |
| updated_at | datetime     |        Y |                       |

**Business rules**

* Mỗi room chỉ có 1 layout active.

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
* `ref_id` phải tồn tại tương ứng với `ref_type`.

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
* Camera inactive không được dùng trong mapping active.

---

## 3.2.10 `configuration_readiness_results`

Bảng này là **optional**. Nếu không muốn persist kết quả readiness, có thể chỉ tính runtime. Đưa ra ở đây như lựa chọn kỹ thuật, không bắt buộc.

| Field      | Type         | Required | Constraints                                  |
| ---------- | ------------ | -------: | -------------------------------------------- |
| id         | uuid         |        Y | PK                                           |
| room_id    | uuid         |        Y | FK `rooms.id`                                |
| category   | varchar(50)  |        Y | `TSD`, `CAMERA`, `LAYOUT`, `MAPPING`, `MODE` |
| status     | varchar(20)  |        Y | enum `ReadinessStatus`                       |
| message    | varchar(500) |        N |                                              |
| checked_at | datetime     |        Y |                                              |

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

---

## 4.2 Configuration Overview

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
      "lastTestResult": "SUCCESS",
      "lastTestAt": "2026-04-20T10:00:00Z"
    },
    "layout": {
      "configured": true,
      "fileType": "PDF"
    },
    "cameraSummary": {
      "total": 3,
      "active": 3
    },
    "mappingSummary": {
      "total": 20,
      "active": 20
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

**Validation**

* `baseUrl` required
* `sseEndpoint` required if provided must be non-empty

---

### PUT `/api/v1/config/tsd/{id}`

**UC:** UC-TSDCFG-02
**Permission:** `ADMIN`

**Request**

```json
{
  "baseUrl": "http://192.168.1.10",
  "username": "admin",
  "password": "new-secret",
  "sseEndpoint": "/api/event"
}
```

---

### POST `/api/v1/config/tsd/{id}/test`

**UC:** UC-TEST-01
**Permission:** `ADMIN`

**Response**

```json
{
  "success": true,
  "data": {
    "result": "SUCCESS",
    "testedAt": "2026-04-20T10:15:00Z"
  }
}
```

---

### POST `/api/v1/config/tsd/{id}/sync-units`

**UC:** UC-TSDCFG-03
**Permission:** `ADMIN`

**Response**

```json
{
  "success": true,
  "data": {
    "synced": 24,
    "created": 4,
    "updated": 20
  }
}
```

---

## 4.4 Camera Configuration

### GET `/api/v1/config/cameras`

**UC:** UC-CONFIG-01, UC-MAPCFG-03
**Permission:** `ADMIN`, `OPERATOR`

---

### POST `/api/v1/config/cameras`

**UC:** UC-CFGCAM-01
**Permission:** `ADMIN`

**Request**

```json
{
  "name": "Camera 1",
  "protocol": "ONVIF",
  "ipAddress": "192.168.1.21",
  "port": 80,
  "username": "admin",
  "password": "secret",
  "rtspUrl": "rtsp://192.168.1.21/stream1",
  "vendor": "Hikvision",
  "model": "DS-2DE"
}
```

**Validation**

* `name` required
* `protocol` must be `ONVIF` or `VISCA`
* `ipAddress` required
* max 4 active cameras

---

### PUT `/api/v1/config/cameras/{id}`

**UC:** UC-CFGCAM-02
**Permission:** `ADMIN`

---

### PATCH `/api/v1/config/cameras/{id}/deactivate`

**UC:** UC-CFGCAM-03
**Permission:** `ADMIN`

**Request**

```json
{
  "reason": "Camera removed from room"
}
```

---

### POST `/api/v1/config/cameras/{id}/test`

**UC:** UC-TEST-02
**Permission:** `ADMIN`

**Response**

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

---

### GET `/api/v1/config/cameras/{id}/presets`

**UC:** UC-CFGCAM-04
**Permission:** `ADMIN`, `OPERATOR`

---

### POST `/api/v1/config/cameras/{id}/presets`

**UC:** UC-CFGCAM-04
**Permission:** `ADMIN`

**Request**

```json
{
  "presetCode": "P01",
  "presetName": "Delegate 01"
}
```

---

### PUT `/api/v1/config/presets/{id}`

**UC:** UC-CFGCAM-04
**Permission:** `ADMIN`

---

## 4.5 Layout & Map Configuration

### POST `/api/v1/config/layout`

**UC:** UC-LAYOUT-01
**Permission:** `ADMIN`
**Content-Type:** multipart/form-data

**Form data**

* `file`: PDF/JPG/JPEG

---

### GET `/api/v1/config/layout`

**UC:** UC-CONFIG-01
**Permission:** `ADMIN`, `OPERATOR`

---

### PUT `/api/v1/config/layout/devices`

**UC:** UC-LAYOUT-02
**Permission:** `ADMIN`

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
      "posY": 0.20,
      "iconLabel": "Camera A"
    }
  ]
}
```

---

### POST `/api/v1/config/layout/annotations`

**UC:** UC-LAYOUT-03
**Permission:** `ADMIN`

**Request**

```json
{
  "text": "Chairman Table",
  "posX": 0.50,
  "posY": 0.15
}
```

---

### PUT `/api/v1/config/layout/annotations/{id}`

**UC:** UC-LAYOUT-03
**Permission:** `ADMIN`

---

## 4.6 Mic-Camera Mapping

### GET `/api/v1/config/mappings`

**UC:** UC-MAPCFG-03
**Permission:** `ADMIN`, `OPERATOR`

---

### POST `/api/v1/config/mappings`

**UC:** UC-MAPCFG-01
**Permission:** `ADMIN`

**Request**

```json
{
  "unitId": "unit-uuid",
  "cameraId": "camera-uuid",
  "presetId": "preset-uuid"
}
```

**Validation**

* unit exists
* camera exists
* preset exists
* preset belongs to camera
* camera is active
* one active mapping per unit

---

### PUT `/api/v1/config/mappings/{id}`

**UC:** UC-MAPCFG-02
**Permission:** `ADMIN`

**Request**

```json
{
  "cameraId": "camera-uuid",
  "presetId": "preset-uuid",
  "isActive": true
}
```

---

## 4.7 Operation Mode

### GET `/api/v1/config/mode`

**UC:** UC-CONFIG-01
**Permission:** `ADMIN`, `OPERATOR`

### PUT `/api/v1/config/mode`

**UC:** UC-MODE-01
**Permission:** `ADMIN`

**Request**

```json
{
  "mode": "MANUAL"
}
```

---

## 4.8 Configuration Readiness

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
        "message": "TS-D1000 connection is configured and test passed"
      },
      {
        "category": "LAYOUT",
        "status": "PASSED",
        "message": "Layout exists"
      },
      {
        "category": "MAPPING",
        "status": "WARNING",
        "message": "3 units do not have active mapping"
      }
    ]
  }
}
```

---

# 5. Business Logic (Service Layer)

## 5.1 UC-CONFIG-01 View System Configuration Overview

### Service

`SystemConfigOverviewService.getOverview(roomId, actor)`

### Logic

1. Check actor role: `ADMIN` or `OPERATOR`.
2. Load room.
3. Load current TS-D config.
4. Load camera summary.
5. Load layout status.
6. Load mapping summary.
7. Load operation mode.
8. Return aggregated overview object.

### Edge cases

* If some modules have no data, return `configured = false` or count = 0, not error.
* If room not found, return 404.

---

## 5.2 UC-TSDCFG-01 Configure TS-D1000 Connection

### Service

`TsdConfigService.createConfig(roomId, payload, actor)`

### Logic

1. Check actor role = `ADMIN`.
2. Validate payload.
3. Check room exists.
4. Ensure room does not already have active TS-D config.
5. Encrypt password if provided.
6. Insert config.
7. Write audit log.
8. Return created record.

### Edge cases

* Existing config already present → 409 conflict
* invalid base URL → 400 validation error

---

## 5.3 UC-TSDCFG-02 Update TS-D1000 Connection

### Service

`TsdConfigService.updateConfig(configId, payload, actor)`

### Logic

1. Check `ADMIN`.
2. Load config.
3. Validate payload.
4. Encrypt password if password updated.
5. Update record.
6. Reset test status optionally to null or keep old result depending on implementation decision.
   Với phase này, có thể giữ `last_test_result` cũ nhưng UI nên khuyến nghị test lại.
7. Write audit log.

### Edge cases

* config not found → 404
* empty required field → 400

---

## 5.4 UC-TSDCFG-03 Load TS-D1000 Device List

### Service

`TsdUnitSyncService.syncUnits(configId, actor)`

### Logic

1. Check `ADMIN`.
2. Load TS-D config.
3. Call TS-D endpoint để lấy unit list.
4. Parse response.
5. For each unit:

   * match by `(room_id, external_unit_id)`
   * create if not exists
   * update if exists
6. Mark sync summary counts.
7. Write audit + system log.
8. Return summary.

### Edge cases

* TS-D not reachable → 502/503
* malformed response → 502
* partial invalid records → skip invalid row, log warning

---

## 5.5 UC-CFGCAM-01 Add Camera

### Service

`CameraConfigService.createCamera(roomId, payload, actor)`

### Logic

1. Check `ADMIN`.
2. Validate payload.
3. Count active cameras in room.
4. If active >= 4 → reject.
5. Encrypt password if provided.
6. Insert camera.
7. Write audit log.

### Edge cases

* duplicate IP/port in same room → 409
* invalid protocol → 400

---

## 5.6 UC-CFGCAM-02 Update Camera

### Service

`CameraConfigService.updateCamera(cameraId, payload, actor)`

### Logic

1. Check `ADMIN`.
2. Load camera.
3. Validate payload.
4. Encrypt password if changed.
5. Update record.
6. Write audit log.

### Edge cases

* camera not found → 404
* update causes duplicate IP/port → 409

---

## 5.7 UC-CFGCAM-03 Deactivate Camera

### Service

`CameraConfigService.deactivateCamera(cameraId, actor)`

### Logic

1. Check `ADMIN`.
2. Load camera.
3. Ensure camera is currently `ACTIVE`.
4. Check if camera is referenced by active mappings.
5. If referenced:

   * return warning/conflict depending on UX flow
   * recommended: block and require mapping cleanup first
6. Update `status = INACTIVE`.
7. Write audit log.

### Edge cases

* already inactive → 409 invalid state
* active mapping exists → 422 business error

---

## 5.8 UC-CFGCAM-04 Configure Camera Preset

### Service

`CameraPresetService.createOrUpdatePreset(cameraId, payload, actor)`

### Logic

1. Check `ADMIN`.
2. Load camera.
3. Validate camera supports preset if capability is known.
4. Validate `presetCode`.
5. If create:

   * ensure `(camera_id, preset_code)` unique
6. If implementation includes remote save preset:

   * call adapter save preset first
7. Insert/update preset.
8. Write audit log.

### Edge cases

* camera not found → 404
* preset duplicate → 409
* unsupported preset capability → 422

---

## 5.9 UC-LAYOUT-01 Upload Layout File

### Service

`LayoutService.uploadLayout(roomId, file, actor)`

### Logic

1. Check `ADMIN`.
2. Validate file exists.
3. Validate extension/type PDF/JPG/JPEG.
4. Store file in local storage.
5. Upsert room layout.
6. Write audit log.

### Edge cases

* invalid file type → 400
* upload/storage failure → 500

---

## 5.10 UC-LAYOUT-02 Place Devices on Layout

### Service

`LayoutDeviceService.savePositions(roomId, devices, actor)`

### Logic

1. Check `ADMIN`.
2. Ensure layout exists.
3. Validate each device entry:

   * `refType` valid
   * referenced entity exists
   * `posX`, `posY` within 0..1
4. Upsert each `(room_id, ref_type, ref_id)` record.
5. Write audit log.

### Edge cases

* layout missing → 422
* referenced unit/camera missing → 400
* duplicate same device in same payload → 400

---

## 5.11 UC-LAYOUT-03 Add or Update Layout Annotation

### Service

`LayoutAnnotationService.saveAnnotation(roomId or annotationId, payload, actor)`

### Logic

1. Check `ADMIN`.
2. Validate `text`, `posX`, `posY`.
3. Create or update annotation.
4. Write audit log.

### Edge cases

* blank text → 400
* invalid coordinates → 400

---

## 5.12 UC-MAPCFG-01 Create Mic-to-Camera Mapping

### Service

`MappingService.createMapping(roomId, payload, actor)`

### Logic

1. Check `ADMIN`.
2. Validate referenced unit, camera, preset exist.
3. Ensure all belong to same room.
4. Ensure preset belongs to selected camera.
5. Ensure camera is `ACTIVE`.
6. Ensure unit does not already have active mapping.
7. Insert mapping with `is_active = true`.
8. Write audit log.

### Edge cases

* preset-camera mismatch → 422
* existing active mapping for unit → 409
* inactive camera → 422

---

## 5.13 UC-MAPCFG-02 Update Mic-to-Camera Mapping

### Service

`MappingService.updateMapping(mappingId, payload, actor)`

### Logic

1. Check `ADMIN`.
2. Load mapping.
3. Validate new camera/preset relation.
4. Validate target camera active if `isActive = true`.
5. Update mapping.
6. Enforce one active mapping per unit.
7. Write audit log.

### Edge cases

* mapping not found → 404
* update creates two active mappings for same unit → 409

---

## 5.14 UC-MAPCFG-03 View Mic-to-Camera Mapping List

### Service

`MappingQueryService.listMappings(roomId, actor)`

### Logic

1. Check actor role = `ADMIN` or `OPERATOR`.
2. Query mappings with unit/camera/preset joins.
3. Return list.

### Edge cases

* no mappings → return empty list
* room missing → 404

---

## 5.15 UC-MODE-01 Set System Operation Mode

### Service

`OperationModeService.updateMode(roomId, mode, actor)`

### Logic

1. Check `ADMIN`.
2. Validate mode enum.
3. Load room.
4. Update `operation_mode`.
5. Write audit log.
6. Return updated room mode.

### Edge cases

* invalid mode → 400
* room missing → 404

---

## 5.16 UC-TEST-01 Test TS-D1000 Connection

### Service

`TsdConnectionTestService.test(configId, actor)`

### Logic

1. Check `ADMIN`.
2. Load config.
3. Attempt health/check endpoint call.
4. If success:

   * update `last_test_result = SUCCESS`
   * update `last_test_at`
5. If fail:

   * update `last_test_result = FAILED`
   * update `last_test_at`
6. Write audit + system log.
7. Return result.

### Edge cases

* config not found → 404
* network timeout → 502/503

---

## 5.17 UC-TEST-02 Test Camera Connection

### Service

`CameraConnectionTestService.test(cameraId, actor)`

### Logic

1. Check `ADMIN`.
2. Load camera.
3. Select adapter by protocol/vendor.
4. Test network/auth/capabilities.
5. Update:

   * `last_test_result`
   * `last_test_at`
   * capability flags if detection is supported
6. Write audit + system log.
7. Return result object.

### Edge cases

* unsupported adapter → 422 or 501 depending on implementation policy
* camera auth failure → 502/503 with meaningful code

---

## 5.18 UC-TEST-03 Test System Configuration Readiness

### Service

`SystemReadinessService.check(roomId, actor)`

### Logic

1. Check `ADMIN`.
2. Load room.
3. Evaluate categories:

   * TSD config exists
   * TS-D connection last test success
   * at least 1 camera exists
   * layout exists
   * units synced
   * mode selected
   * mappings valid
4. For each category, build item with status/message.
5. Compute overall status:

   * `FAILED` if any required item failed
   * else `WARNING` if any warning
   * else `PASSED`
6. Return result.
7. Optionally persist check result if chosen.

### Edge cases

* partial data missing → return warning/failed, not exception
* system cannot read data → 500

---

# 6. Validation Rules

## 6.1 Field-Level Validation

### TS-D Config

* `baseUrl`: required, non-empty
* `sseEndpoint`: optional but if sent must be non-empty

### Camera

* `name`: required
* `protocol`: must be `ONVIF` or `VISCA`
* `ipAddress`: required
* `port`: optional, if sent 1..65535

### Preset

* `presetCode`: required
* `presetName`: optional

### Layout

* file type: PDF/JPG/JPEG only

### Layout Device / Annotation

* `posX`: between 0 and 1
* `posY`: between 0 and 1
* `text` for annotation: non-empty

### Mapping

* `unitId`: required
* `cameraId`: required
* `presetId`: required

### Mode

* `mode`: `MANUAL` or `AUTOMATIC`

---

## 6.2 Cross-Field Validation

* `presetId` must belong to `cameraId`
* `cameraId`, `unitId` and mapping must belong to same room
* `refType = TSD_UNIT` → `refId` must exist in `tsd_units`
* `refType = CAMERA` → `refId` must exist in `cameras`
* if `mapping.is_active = true`, then target camera must be `ACTIVE`

---

## 6.3 Business Validation

* only `ADMIN` may modify config
* `OPERATOR` is read-only
* max 4 active cameras per room
* one active TS-D config per room
* one active layout per room
* one active mapping per unit
* inactive camera cannot be used in active mapping
* readiness check does not auto-fix data

---

## 6.4 Uniqueness Constraints

* `tsd_connection_configs.room_id` unique
* `tsd_units (room_id, external_unit_id)` unique
* `cameras (room_id, ip_address, port)` unique
* `camera_presets (camera_id, preset_code)` unique
* `layout_devices (room_id, ref_type, ref_id)` unique
* partial unique active mapping per unit

---

## 6.5 Date Rules

Không có business date rule phức tạp trong module này, ngoài:

* mọi thay đổi phải update `updated_at`
* test connection phải update `last_test_at`

---

# 7. State Transitions

## 7.1 Camera Status

```text
ACTIVE -> INACTIVE
INACTIVE -> ACTIVE
ACTIVE -> OFFLINE
OFFLINE -> ACTIVE
```

### Rules

* `INACTIVE`: camera bị loại khỏi config active
* `OFFLINE`: trạng thái kỹ thuật, không phải lựa chọn config của user

### Invalid usage

* camera `INACTIVE` không được dùng trong active mapping

---

## 7.2 Operation Mode

```text
MANUAL <-> AUTOMATIC
```

### Rules

* chỉ 1 mode active tại một thời điểm
* đổi mode ảnh hưởng tới runtime behavior mới về sau

---

## 7.3 Mapping State

Thực chất chỉ dùng cờ `is_active`.

```text
ACTIVE -> INACTIVE
INACTIVE -> ACTIVE
```

### Rules

* mỗi unit chỉ có 1 mapping active

---

## 7.4 Readiness Status

```text
PASSED / WARNING / FAILED
```

### Rules

* là trạng thái đánh giá, không phải entity workflow có transition cứng

---

# 8. Authorization Rules

## Roles

* `ADMIN`
* `OPERATOR`

## Access Matrix

| API Group                       | ADMIN | OPERATOR |
| ------------------------------- | :---: | :------: |
| View config overview            |   Y   |     Y    |
| Create/update TS-D config       |   Y   |     N    |
| Sync TS-D units                 |   Y   |     N    |
| Create/update/deactivate camera |   Y   |     N    |
| Test camera / TS-D              |   Y   |     N    |
| Create/update preset            |   Y   |     N    |
| View cameras/presets            |   Y   |     Y    |
| Upload layout                   |   Y   |     N    |
| Save layout devices             |   Y   |     N    |
| Save annotations                |   Y   |     N    |
| View mapping list               |   Y   |     Y    |
| Create/update mapping           |   Y   |     N    |
| Get mode                        |   Y   |     Y    |
| Update mode                     |   Y   |     N    |
| Readiness check                 |   Y   |     N    |

**Data restriction**

* Operator chỉ được xem dữ liệu config, không có API sửa đổi nào.

---

# 9. Background Jobs / Automation

## 9.1 No mandatory scheduled job in scope

Module config không yêu cầu cron bắt buộc theo requirement.

## 9.2 Event / Async candidates

Các xử lý sau có thể là async nội bộ:

* test TS-D connection
* test camera connection
* sync unit list
* readiness check lớn nếu muốn chạy background

## 9.3 Runtime trigger linkage

Khi config đổi, runtime module có thể cần reload config cache.
Đây là **side effect kỹ thuật**, không phải use case mới:

* update TS-D config → runtime reconnect policy
* update mapping → runtime dùng mapping mới
* update mode → runtime dùng mode mới

---

# 10. Logging & Audit

## 10.1 Actions to Audit

* create/update TS-D config
* sync TS-D units
* add/update/deactivate camera
* create/update preset
* upload layout
* save layout positions
* add/update annotation
* create/update mapping
* change operation mode
* run TS-D connection test
* run camera connection test
* run readiness check

## 10.2 Audit Log Structure

```json
{
  "actorUserId": "admin-uuid",
  "action": "CREATE_MAPPING",
  "targetType": "MIC_CAMERA_MAPPING",
  "targetId": "mapping-uuid",
  "result": "SUCCESS",
  "detailJson": {
    "roomId": "room-uuid",
    "unitId": "unit-uuid",
    "cameraId": "camera-uuid",
    "presetId": "preset-uuid"
  }
}
```

## 10.3 System Logs

Cần ghi system log cho:

* TS-D API call failures
* camera adapter failures
* unit sync parse errors
* readiness computation errors
* storage/upload failures

---

# 11. Error Handling

## 11.1 Error Types

### Validation Error

* thiếu trường bắt buộc
* enum sai
* tọa độ sai
* file type sai

**HTTP:** `400 Bad Request`

### Unauthorized

* chưa login / token sai

**HTTP:** `401 Unauthorized`

### Forbidden

* Operator cố sửa config

**HTTP:** `403 Forbidden`

### Not Found

* config/camera/unit/mapping không tồn tại

**HTTP:** `404 Not Found`

### Conflict

* duplicate IP camera
* duplicate preset code
* unit đã có active mapping
* room đã có TS-D config

**HTTP:** `409 Conflict`

### Business Rule Error

* camera inactive nhưng được chọn làm active mapping
* deactivate camera đang bị active mapping tham chiếu

**HTTP:** `422 Unprocessable Entity`

### Integration Error

* TS-D unreachable
* camera connection failure
* malformed external response

**HTTP:** `502 Bad Gateway` hoặc `503 Service Unavailable`

### System Error

* DB/storage failure
* unexpected exception

**HTTP:** `500 Internal Server Error`

---

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

# 12. Traceability: UC → API → Service

| UC           | API                                                             | Service                                   |
| ------------ | --------------------------------------------------------------- | ----------------------------------------- |
| UC-CONFIG-01 | `GET /config/overview`                                          | `SystemConfigOverviewService.getOverview` |
| UC-TSDCFG-01 | `POST /config/tsd`                                              | `TsdConfigService.createConfig`           |
| UC-TSDCFG-02 | `PUT /config/tsd/{id}`                                          | `TsdConfigService.updateConfig`           |
| UC-TSDCFG-03 | `POST /config/tsd/{id}/sync-units`                              | `TsdUnitSyncService.syncUnits`            |
| UC-CFGCAM-01 | `POST /config/cameras`                                          | `CameraConfigService.createCamera`        |
| UC-CFGCAM-02 | `PUT /config/cameras/{id}`                                      | `CameraConfigService.updateCamera`        |
| UC-CFGCAM-03 | `PATCH /config/cameras/{id}/deactivate`                         | `CameraConfigService.deactivateCamera`    |
| UC-CFGCAM-04 | `POST /config/cameras/{id}/presets`, `PUT /config/presets/{id}` | `CameraPresetService`                     |
| UC-LAYOUT-01 | `POST /config/layout`                                           | `LayoutService.uploadLayout`              |
| UC-LAYOUT-02 | `PUT /config/layout/devices`                                    | `LayoutDeviceService.savePositions`       |
| UC-LAYOUT-03 | `POST/PUT /config/layout/annotations`                           | `LayoutAnnotationService`                 |
| UC-MAPCFG-01 | `POST /config/mappings`                                         | `MappingService.createMapping`            |
| UC-MAPCFG-02 | `PUT /config/mappings/{id}`                                     | `MappingService.updateMapping`            |
| UC-MAPCFG-03 | `GET /config/mappings`                                          | `MappingQueryService.listMappings`        |
| UC-MODE-01   | `PUT /config/mode`                                              | `OperationModeService.updateMode`         |
| UC-TEST-01   | `POST /config/tsd/{id}/test`                                    | `TsdConnectionTestService.test`           |
| UC-TEST-02   | `POST /config/cameras/{id}/test`                                | `CameraConnectionTestService.test`        |
| UC-TEST-03   | `POST /config/readiness/check`                                  | `SystemReadinessService.check`            |

---

# 13. Suggested Backend Structure

```text
src/
  modules/
    system-config/
      system-config.controller.ts
      services/
        system-config-overview.service.ts
        system-readiness.service.ts
    tsd-config/
      tsd-config.controller.ts
      tsd-config.service.ts
      tsd-unit-sync.service.ts
      tsd-connection-test.service.ts
    camera-config/
      camera-config.controller.ts
      camera-config.service.ts
      camera-preset.service.ts
      camera-connection-test.service.ts
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
  common/
    guards/
    exceptions/
    validators/
    audit/
```

---

# 14. Developer Notes

## 14.1 Update strategy

* Cấu hình hệ thống nên dùng **upsert** ở các module phù hợp để UI thao tác đơn giản.
* Với mapping, nên dùng **strict create/update** thay vì upsert mù để tránh ghi đè logic ngoài ý muốn.

## 14.2 Sensitive fields

* Password TS-D và camera phải được mã hóa khi lưu.
* API response không được trả plain password.

## 14.3 Readiness design

* `readiness check` nên là phép kiểm tra tổng hợp read-only.
* Không tự sửa dữ liệu hoặc tự sinh mapping.

---

# 15. Out of Scope

Không bao gồm trong tài liệu này:

* runtime event engine chi tiết
* anti-jitter camera switching logic
* manual queue runtime
* stream playback pipeline
* multi-room config orchestration
* licensing

---

[1]: https://www.toa-products.com/international/products/ts-d1000-series.html "TS-D1000 Series - Conference Systems - TOA Electronics"
