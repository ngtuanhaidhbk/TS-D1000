# API Contract - System Configuration

## 1. Overview

### 1.1 Scope

Tài liệu này định nghĩa API contract cho module **System Configuration** của hệ thống điều khiển phòng họp TS-D1000 + PTZ Cameras.

### 1.2 Covered Modules

* Configuration Overview
* TS-D1000 Configuration
* Camera Configuration
* Camera Presets
* Layout & Map Configuration
* Mic-Camera Mapping
* Operation Mode
* Configuration Readiness

### 1.3 Roles

* `ADMIN`: full configuration access
* `OPERATOR`: read-only access

### 1.4 Related Use Cases

* UC-CONFIG-01
* UC-TSDCFG-01
* UC-TSDCFG-02
* UC-TSDCFG-03
* UC-CFGCAM-01
* UC-CFGCAM-02
* UC-CFGCAM-03
* UC-CFGCAM-04
* UC-LAYOUT-01
* UC-LAYOUT-02
* UC-LAYOUT-03
* UC-MAPCFG-01
* UC-MAPCFG-02
* UC-MAPCFG-03
* UC-MODE-01
* UC-TEST-01
* UC-TEST-02
* UC-TEST-03

### 1.5 Assumptions

1. MVP chỉ có 1 room active, nhưng API vẫn dùng `roomId` nội bộ nếu cần ở service layer.
2. JSON dùng `camelCase`; DB dùng `snake_case`.
3. Password TS-D1000 và camera chỉ nhận ở request, không trả lại ở response.
4. Camera deactivate là cập nhật trạng thái, không hard delete.
5. Kết quả readiness có thể tính runtime, không bắt buộc persist.

---

## 2. API Conventions

### 2.1 Base URL

```http
/api/v1
```

### 2.2 Auth Header

```http
Authorization: Bearer <access_token>
```

### 2.3 Success Format

```json
{
  "success": true,
  "data": {}
}
```

### 2.4 Error Format

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

### 2.5 Pagination Format

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

---

## 3. Modules & Endpoints List

### 3.1 Configuration Overview

* `GET /config/overview`

### 3.2 TS-D1000 Configuration

* `GET /config/tsd`
* `POST /config/tsd`
* `PUT /config/tsd/{id}`
* `POST /config/tsd/{id}/test`
* `POST /config/tsd/{id}/sync-units`
* `GET /config/tsd/{id}/units`

### 3.3 Camera Configuration

* `GET /config/cameras`
* `GET /config/cameras/{id}`
* `POST /config/cameras`
* `PUT /config/cameras/{id}`
* `PATCH /config/cameras/{id}/deactivate`
* `POST /config/cameras/{id}/test`

### 3.4 Camera Presets

* `GET /config/cameras/{id}/presets`
* `POST /config/cameras/{id}/presets`
* `PUT /config/presets/{id}`

### 3.5 Layout & Map

* `GET /config/layout`
* `POST /config/layout`
* `PUT /config/layout/devices`
* `GET /config/layout/devices`
* `POST /config/layout/annotations`
* `PUT /config/layout/annotations/{id}`
* `GET /config/layout/annotations`

### 3.6 Mic-Camera Mapping

* `GET /config/mappings`
* `POST /config/mappings`
* `PUT /config/mappings/{id}`

### 3.7 Operation Mode

* `GET /config/mode`
* `PUT /config/mode`

### 3.8 Readiness

* `POST /config/readiness/check`

---

## 4. Detailed API Specification

## 4.1 GET `/config/overview`

**Description**
Trả về tổng quan cấu hình active hiện tại của room.

**Related UC**
UC-CONFIG-01

**Permission**
`ADMIN`, `OPERATOR`

**Request**

No path params. No query params.

**Success Response**

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

**Errors**

| HTTP | Code         | Condition          |
| ---- | ------------ | ------------------ |
| 401  | UNAUTHORIZED | token invalid      |
| 403  | FORBIDDEN    | role not allowed   |
| 404  | ROOM_NOT_FOUND | room missing     |
| 500  | INTERNAL_ERROR | system failure   |

**Side Effects**

None

---

## 4.2 GET `/config/tsd`

**Description**
Lấy cấu hình TS-D1000 active hiện tại.

**Related UC**
UC-CONFIG-01

**Permission**
`ADMIN`, `OPERATOR`

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "config-uuid",
    "baseUrl": "http://192.168.1.10",
    "username": "admin",
    "sseEndpoint": "/api/event",
    "isActive": true,
    "lastTestResult": "SUCCESS",
    "lastTestAt": "2026-04-20T10:15:00Z"
  }
}
```

**Errors**

| HTTP | Code           | Condition        |
| ---- | -------------- | ---------------- |
| 401  | UNAUTHORIZED   | token invalid    |
| 404  | CONFIG_NOT_FOUND | config missing |

---

## 4.3 POST `/config/tsd`

**Description**
Tạo cấu hình TS-D1000 mới.

**Related UC**
UC-TSDCFG-01

**Permission**
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

**Field Rules**

| Field       | Required | Rules                         |
| ----------- | -------- | ----------------------------- |
| baseUrl     | Y        | non-empty, URL-like           |
| username    | N        | trim                          |
| password    | N        | trim                          |
| sseEndpoint | N        | if provided, non-empty        |

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "config-uuid",
    "baseUrl": "http://192.168.1.10",
    "username": "admin",
    "sseEndpoint": "/api/event",
    "isActive": true,
    "lastTestResult": null,
    "lastTestAt": null
  }
}
```

**Errors**

| HTTP | Code                 | Condition                      |
| ---- | -------------------- | ------------------------------ |
| 400  | VALIDATION_ERROR     | invalid payload                |
| 403  | FORBIDDEN            | operator tries to create       |
| 404  | ROOM_NOT_FOUND       | room missing                   |
| 409  | TSD_CONFIG_EXISTS    | active config already exists   |
| 500  | INTERNAL_ERROR       | save/encryption failure        |

**Side Effects**

* audit log: create TS-D config

---

## 4.4 PUT `/config/tsd/{id}`

**Description**
Cập nhật cấu hình TS-D1000 hiện có.

**Related UC**
UC-TSDCFG-02

**Permission**
`ADMIN`

**Path Params**

| Name | Type | Required |
| ---- | ---- | -------- |
| id   | uuid | Y        |

**Request Body**

```json
{
  "baseUrl": "http://192.168.1.10",
  "username": "admin",
  "password": "new-secret",
  "sseEndpoint": "/api/event"
}
```

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "config-uuid",
    "baseUrl": "http://192.168.1.10",
    "username": "admin",
    "sseEndpoint": "/api/event",
    "isActive": true,
    "lastTestResult": "SUCCESS",
    "lastTestAt": "2026-04-20T10:15:00Z"
  }
}
```

**Errors**

| HTTP | Code              | Condition            |
| ---- | ----------------- | -------------------- |
| 400  | VALIDATION_ERROR  | invalid payload      |
| 403  | FORBIDDEN         | role denied          |
| 404  | CONFIG_NOT_FOUND  | config missing       |
| 500  | INTERNAL_ERROR    | save failure         |

**Side Effects**

* audit log: update TS-D config

---

## 4.5 POST `/config/tsd/{id}/test`

**Description**
Test kết nối TS-D1000 bằng cấu hình hiện tại.

**Related UC**
UC-TEST-01

**Permission**
`ADMIN`

**Success Response**

```json
{
  "success": true,
  "data": {
    "result": "SUCCESS",
    "testedAt": "2026-04-20T10:15:00Z"
  }
}
```

**Errors**

| HTTP | Code                 | Condition               |
| ---- | -------------------- | ----------------------- |
| 403  | FORBIDDEN            | role denied             |
| 404  | CONFIG_NOT_FOUND     | config missing          |
| 502  | TSD_UNREACHABLE      | TS-D unreachable        |
| 503  | TSD_TIMEOUT          | timeout                 |
| 500  | INTERNAL_ERROR       | unexpected error        |

**Side Effects**

* update `lastTestResult`
* update `lastTestAt`
* audit log
* system log on failure

---

## 4.6 POST `/config/tsd/{id}/sync-units`

**Description**
Đồng bộ danh sách unit từ TS-D1000.

**Related UC**
UC-TSDCFG-03

**Permission**
`ADMIN`

**Success Response**

```json
{
  "success": true,
  "data": {
    "synced": 24,
    "created": 4,
    "updated": 20,
    "skipped": 0
  }
}
```

**Errors**

| HTTP | Code                     | Condition              |
| ---- | ------------------------ | ---------------------- |
| 403  | FORBIDDEN                | role denied            |
| 404  | CONFIG_NOT_FOUND         | config missing         |
| 502  | TSD_SYNC_FAILED          | external API error     |
| 502  | TSD_MALFORMED_RESPONSE   | invalid response       |
| 500  | INTERNAL_ERROR           | persistence failure    |

**Side Effects**

* create/update `tsd_units`
* audit log
* system logs for skipped/invalid rows

---

## 4.7 GET `/config/tsd/{id}/units`

**Description**
Lấy danh sách units đã sync.

**Related UC**
UC-TSDCFG-03

**Permission**
`ADMIN`, `OPERATOR`

**Query Params**

| Name      | Type   | Required | Notes                     |
| --------- | ------ | -------- | ------------------------- |
| page      | number | N        | default 1                 |
| pageSize  | number | N        | default 20, max 100       |
| search    | string | N        | by unit id or unit name   |
| deviceType| string | N        | `CHAIRMAN` or `DELEGATE`  |
| sortBy    | string | N        | `externalUnitId`, `unitName`, `deviceType` |
| sortOrder | string | N        | `asc` or `desc`           |

**Success Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "unit-uuid",
        "externalUnitId": "D01",
        "unitName": "Delegate 01",
        "deviceType": "DELEGATE",
        "runtimeState": "IDLE",
        "isConnected": true,
        "lastEventAt": null
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

## 4.8 GET `/config/cameras`

**Description**
Lấy danh sách camera.

**Related UC**
UC-CONFIG-01, UC-MAPCFG-03

**Permission**
`ADMIN`, `OPERATOR`

**Query Params**

| Name      | Type   | Required | Notes                               |
| --------- | ------ | -------- | ----------------------------------- |
| page      | number | N        | default 1                           |
| pageSize  | number | N        | default 10, max 100                 |
| search    | string | N        | name or ipAddress                   |
| status    | string | N        | `ACTIVE`, `INACTIVE`, `OFFLINE`     |
| protocol  | string | N        | `ONVIF`, `VISCA`                    |
| sortBy    | string | N        | `name`, `ipAddress`, `status`, `lastTestAt` |
| sortOrder | string | N        | `asc`, `desc`                       |

**Success Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "camera-uuid",
        "name": "Camera 1",
        "protocol": "ONVIF",
        "ipAddress": "192.168.1.21",
        "port": 80,
        "rtspUrl": "rtsp://192.168.1.21/stream1",
        "vendor": "Hikvision",
        "model": "DS-2DE",
        "status": "ACTIVE",
        "capabilities": {
          "ptz": true,
          "preset": true,
          "stream": true
        },
        "lastTestResult": "SUCCESS",
        "lastTestAt": "2026-04-20T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

## 4.9 GET `/config/cameras/{id}`

**Description**
Lấy chi tiết một camera.

**Permission**
`ADMIN`, `OPERATOR`

**Errors**

| HTTP | Code              | Condition      |
| ---- | ----------------- | -------------- |
| 404  | CAMERA_NOT_FOUND  | camera missing |

---

## 4.10 POST `/config/cameras`

**Description**
Thêm camera mới.

**Related UC**
UC-CFGCAM-01

**Permission**
`ADMIN`

**Request Body**

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

| Field     | Required | Rules               |
| --------- | -------- | ------------------- |
| name      | Y        | non-empty           |
| protocol  | Y        | `ONVIF` or `VISCA`  |
| ipAddress | Y        | non-empty           |
| port      | N        | 1..65535            |

**Errors**

| HTTP | Code                       | Condition                    |
| ---- | -------------------------- | ---------------------------- |
| 400  | VALIDATION_ERROR           | invalid payload              |
| 403  | FORBIDDEN                  | role denied                  |
| 409  | CAMERA_DUPLICATE_ENDPOINT  | duplicate `(room, ip, port)` |
| 422  | CAMERA_LIMIT_REACHED       | > 4 active cameras           |

**Side Effects**

* audit log

---

## 4.11 PUT `/config/cameras/{id}`

**Description**
Cập nhật camera hiện có.

**Related UC**
UC-CFGCAM-02

**Permission**
`ADMIN`

**Errors**

| HTTP | Code                       | Condition               |
| ---- | -------------------------- | ----------------------- |
| 404  | CAMERA_NOT_FOUND           | camera missing          |
| 409  | CAMERA_DUPLICATE_ENDPOINT  | duplicate endpoint      |

**Side Effects**

* audit log

---

## 4.12 PATCH `/config/cameras/{id}/deactivate`

**Description**
Deactivate camera.

**Related UC**
UC-CFGCAM-03

**Permission**
`ADMIN`

**Request Body**

```json
{
  "reason": "Camera removed from room"
}
```

**Errors**

| HTTP | Code                    | Condition                          |
| ---- | ----------------------- | ---------------------------------- |
| 404  | CAMERA_NOT_FOUND        | camera missing                     |
| 409  | CAMERA_ALREADY_INACTIVE | invalid state                      |
| 422  | CAMERA_ALREADY_IN_USE   | active mapping still references it |

**Side Effects**

* update camera status
* audit log

---

## 4.13 POST `/config/cameras/{id}/test`

**Description**
Test camera connection và capability.

**Related UC**
UC-TEST-02

**Permission**
`ADMIN`

**Success Response**

```json
{
  "success": true,
  "data": {
    "result": "PARTIAL",
    "testedAt": "2026-04-20T10:40:00Z",
    "capabilities": {
      "ptz": true,
      "preset": true,
      "stream": false
    }
  }
}
```

**Errors**

| HTTP | Code                        | Condition             |
| ---- | --------------------------- | --------------------- |
| 404  | CAMERA_NOT_FOUND            | camera missing        |
| 422  | CAMERA_ADAPTER_UNSUPPORTED  | unsupported adapter   |
| 502  | CAMERA_CONNECTION_FAILED    | external error        |
| 503  | CAMERA_TIMEOUT              | timeout               |

**Side Effects**

* update test result
* update capability flags if detected
* audit log
* system log on failure

---

## 4.14 GET `/config/cameras/{id}/presets`

**Description**
Lấy danh sách preset theo camera.

**Related UC**
UC-CFGCAM-04

**Permission**
`ADMIN`, `OPERATOR`

**Success Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "preset-uuid",
        "cameraId": "camera-uuid",
        "presetCode": "P01",
        "presetName": "Delegate 01"
      }
    ]
  }
}
```

---

## 4.15 POST `/config/cameras/{id}/presets`

**Description**
Tạo preset cho camera.

**Related UC**
UC-CFGCAM-04

**Permission**
`ADMIN`

**Request Body**

```json
{
  "presetCode": "P01",
  "presetName": "Delegate 01"
}
```

**Errors**

| HTTP | Code                        | Condition                  |
| ---- | --------------------------- | -------------------------- |
| 404  | CAMERA_NOT_FOUND            | camera missing             |
| 409  | PRESET_CODE_EXISTS          | duplicate code             |
| 422  | PRESET_NOT_SUPPORTED        | camera capability missing  |

**Side Effects**

* audit log

---

## 4.16 PUT `/config/presets/{id}`

**Description**
Cập nhật preset.

**Permission**
`ADMIN`

**Errors**

| HTTP | Code               | Condition        |
| ---- | ------------------ | ---------------- |
| 404  | PRESET_NOT_FOUND   | preset missing   |
| 409  | PRESET_CODE_EXISTS | duplicate code   |

---

## 4.17 GET `/config/layout`

**Description**
Lấy layout active hiện tại.

**Permission**
`ADMIN`, `OPERATOR`

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "layout-uuid",
    "fileName": "room-layout.pdf",
    "filePath": "/storage/layouts/room-layout.pdf",
    "fileType": "PDF",
    "width": 1920,
    "height": 1080
  }
}
```

---

## 4.18 POST `/config/layout`

**Description**
Upload hoặc replace layout.

**Related UC**
UC-LAYOUT-01

**Permission**
`ADMIN`

**Content-Type**
`multipart/form-data`

**Form Fields**

| Field | Required | Rules             |
| ----- | -------- | ----------------- |
| file  | Y        | PDF/JPG/JPEG only |

**Errors**

| HTTP | Code                  | Condition         |
| ---- | --------------------- | ----------------- |
| 400  | INVALID_FILE_TYPE     | invalid extension |
| 500  | STORAGE_UPLOAD_FAILED | store failed      |

**Side Effects**

* upsert layout
* audit log

---

## 4.19 GET `/config/layout/devices`

**Description**
Lấy danh sách vị trí thiết bị trên layout.

**Permission**
`ADMIN`, `OPERATOR`

**Success Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "layout-device-uuid",
        "refType": "TSD_UNIT",
        "refId": "unit-uuid",
        "posX": 0.35,
        "posY": 0.52,
        "iconLabel": "Delegate 01"
      }
    ]
  }
}
```

---

## 4.20 PUT `/config/layout/devices`

**Description**
Lưu vị trí mic/camera trên layout.

**Related UC**
UC-LAYOUT-02

**Permission**
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
      "iconLabel": "Camera A"
    }
  ]
}
```

**Errors**

| HTTP | Code                      | Condition                |
| ---- | ------------------------- | ------------------------ |
| 400  | VALIDATION_ERROR          | invalid coordinates      |
| 400  | DUPLICATE_LAYOUT_DEVICE   | duplicate in payload     |
| 422  | LAYOUT_NOT_CONFIGURED     | no active layout         |
| 404  | REF_NOT_FOUND             | missing unit/camera      |

**Side Effects**

* upsert `layout_devices`
* audit log

---

## 4.21 GET `/config/layout/annotations`

**Description**
Lấy danh sách annotations.

**Permission**
`ADMIN`, `OPERATOR`

---

## 4.22 POST `/config/layout/annotations`

**Description**
Tạo annotation.

**Related UC**
UC-LAYOUT-03

**Permission**
`ADMIN`

**Request Body**

```json
{
  "text": "Chairman Table",
  "posX": 0.5,
  "posY": 0.15
}
```

**Errors**

| HTTP | Code                 | Condition            |
| ---- | -------------------- | -------------------- |
| 400  | VALIDATION_ERROR     | blank text or invalid position |
| 422  | LAYOUT_NOT_CONFIGURED| no layout            |

**Side Effects**

* create annotation
* audit log

---

## 4.23 PUT `/config/layout/annotations/{id}`

**Description**
Cập nhật annotation.

**Permission**
`ADMIN`

**Errors**

| HTTP | Code                  | Condition         |
| ---- | --------------------- | ----------------- |
| 404  | ANNOTATION_NOT_FOUND  | missing annotation|

---

## 4.24 GET `/config/mappings`

**Description**
Lấy danh sách mapping.

**Related UC**
UC-MAPCFG-03

**Permission**
`ADMIN`, `OPERATOR`

**Query Params**

| Name      | Type   | Required | Notes                    |
| --------- | ------ | -------- | ------------------------ |
| page      | number | N        | default 1                |
| pageSize  | number | N        | default 20               |
| search    | string | N        | unit/camera/preset       |
| cameraId  | uuid   | N        | filter by camera         |
| isActive  | boolean| N        | filter active            |
| deviceType| string | N        | `CHAIRMAN`/`DELEGATE`    |

**Success Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "mapping-uuid",
        "unit": {
          "id": "unit-uuid",
          "externalUnitId": "D01",
          "unitName": "Delegate 01",
          "deviceType": "DELEGATE"
        },
        "camera": {
          "id": "camera-uuid",
          "name": "Camera 1",
          "status": "ACTIVE"
        },
        "preset": {
          "id": "preset-uuid",
          "presetCode": "P01",
          "presetName": "Delegate 01"
        },
        "isActive": true
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

## 4.25 POST `/config/mappings`

**Description**
Tạo mapping unit -> camera preset.

**Related UC**
UC-MAPCFG-01

**Permission**
`ADMIN`

**Request Body**

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
* no existing active mapping for unit

**Errors**

| HTTP | Code                         | Condition                       |
| ---- | ---------------------------- | ------------------------------- |
| 404  | UNIT_NOT_FOUND               | unit missing                    |
| 404  | CAMERA_NOT_FOUND             | camera missing                  |
| 404  | PRESET_NOT_FOUND             | preset missing                  |
| 409  | ACTIVE_MAPPING_EXISTS        | one active mapping per unit     |
| 422  | PRESET_CAMERA_MISMATCH       | invalid relation                |
| 422  | CAMERA_INACTIVE              | inactive camera                 |
| 422  | CROSS_ROOM_MAPPING_INVALID   | entities not in same room       |

**Side Effects**

* create mapping
* audit log

---

## 4.26 PUT `/config/mappings/{id}`

**Description**
Cập nhật mapping.

**Related UC**
UC-MAPCFG-02

**Permission**
`ADMIN`

**Request Body**

```json
{
  "cameraId": "camera-uuid",
  "presetId": "preset-uuid",
  "isActive": true
}
```

**Errors**

| HTTP | Code                         | Condition                    |
| ---- | ---------------------------- | ---------------------------- |
| 404  | MAPPING_NOT_FOUND            | mapping missing              |
| 409  | ACTIVE_MAPPING_EXISTS        | second active mapping        |
| 422  | PRESET_CAMERA_MISMATCH       | invalid relation             |
| 422  | CAMERA_INACTIVE              | invalid active target        |

**Side Effects**

* update mapping
* audit log

---

## 4.27 GET `/config/mode`

**Description**
Lấy mode hiện tại.

**Related UC**
UC-CONFIG-01

**Permission**
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

## 4.28 PUT `/config/mode`

**Description**
Cập nhật operation mode.

**Related UC**
UC-MODE-01

**Permission**
`ADMIN`

**Request Body**

```json
{
  "mode": "MANUAL"
}
```

**Errors**

| HTTP | Code              | Condition        |
| ---- | ----------------- | ---------------- |
| 400  | VALIDATION_ERROR  | invalid enum     |
| 404  | ROOM_NOT_FOUND    | room missing     |

**Side Effects**

* update room mode
* audit log
* runtime may reload config cache

---

## 4.29 POST `/config/readiness/check`

**Description**
Chạy readiness check.

**Related UC**
UC-TEST-03

**Permission**
`ADMIN`

**Success Response**

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

**Errors**

| HTTP | Code              | Condition            |
| ---- | ----------------- | -------------------- |
| 403  | FORBIDDEN         | operator tries check |
| 404  | ROOM_NOT_FOUND    | room missing         |
| 500  | INTERNAL_ERROR    | computation failure  |

**Side Effects**

* optional persist readiness result
* audit log
* system log on computation failure

---

## 5. Request / Response Schemas

### 5.1 TsdConfig

```json
{
  "id": "uuid",
  "baseUrl": "string",
  "username": "string|null",
  "sseEndpoint": "string",
  "isActive": true,
  "lastTestResult": "SUCCESS|PARTIAL|FAILED|null",
  "lastTestAt": "ISO-8601|null"
}
```

### 5.2 Camera

```json
{
  "id": "uuid",
  "name": "string",
  "protocol": "ONVIF|VISCA",
  "ipAddress": "string",
  "port": 80,
  "rtspUrl": "string|null",
  "vendor": "string|null",
  "model": "string|null",
  "status": "ACTIVE|INACTIVE|OFFLINE",
  "capabilities": {
    "ptz": true,
    "preset": true,
    "stream": true
  },
  "lastTestResult": "SUCCESS|PARTIAL|FAILED|null",
  "lastTestAt": "ISO-8601|null"
}
```

### 5.3 CameraPreset

```json
{
  "id": "uuid",
  "cameraId": "uuid",
  "presetCode": "string",
  "presetName": "string|null"
}
```

### 5.4 Layout

```json
{
  "id": "uuid",
  "fileName": "string",
  "filePath": "string",
  "fileType": "PDF|JPG|JPEG",
  "width": 1920,
  "height": 1080
}
```

### 5.5 LayoutDevice

```json
{
  "id": "uuid",
  "refType": "TSD_UNIT|CAMERA",
  "refId": "uuid",
  "posX": 0.35,
  "posY": 0.52,
  "iconLabel": "string|null"
}
```

### 5.6 LayoutAnnotation

```json
{
  "id": "uuid",
  "text": "string",
  "posX": 0.5,
  "posY": 0.15
}
```

### 5.7 Mapping

```json
{
  "id": "uuid",
  "unitId": "uuid",
  "cameraId": "uuid",
  "presetId": "uuid",
  "isActive": true
}
```

### 5.8 ReadinessResult

```json
{
  "overallStatus": "PASSED|WARNING|FAILED",
  "items": [
    {
      "category": "TSD|CAMERA|LAYOUT|MAPPING|MODE",
      "status": "PASSED|WARNING|FAILED",
      "message": "string"
    }
  ]
}
```

---

## 6. Validation Rules

### 6.1 Field-Level Validation

* `baseUrl`: required, non-empty
* `sseEndpoint`: if sent, non-empty
* `name`: required for camera
* `protocol`: `ONVIF` or `VISCA`
* `ipAddress`: required
* `port`: 1..65535 if sent
* `presetCode`: required
* layout file type: `PDF`, `JPG`, `JPEG`
* `posX`, `posY`: 0..1
* annotation `text`: non-empty
* `mode`: `MANUAL` or `AUTOMATIC`

### 6.2 Cross-Field Validation

* `presetId` must belong to `cameraId`
* mapping entities must belong to same room
* layout `refType/refId` must point to existing entity
* active mapping cannot target inactive camera

### 6.3 Business Validation

* only `ADMIN` can modify configuration
* `OPERATOR` is read-only
* max 4 active cameras per room
* one active TS-D config per room
* one active layout per room
* one active mapping per unit
* deactivate blocked if camera used by active mapping

### 6.4 Uniqueness

* `tsd_connection_configs.room_id`
* `(room_id, external_unit_id)` for units
* `(room_id, ip_address, port)` for camera
* `(camera_id, preset_code)` for preset
* `(room_id, ref_type, ref_id)` for layout device
* one active mapping per unit

---

## 7. Authorization Rules

| Endpoint Group                 | ADMIN | OPERATOR |
| ----------------------------- | :---: | :------: |
| View overview                  | Y     | Y        |
| View TS-D config/units         | Y     | Y        |
| Create/update/test/sync TS-D   | Y     | N        |
| View cameras/presets           | Y     | Y        |
| Create/update/test/deactivate camera | Y | N      |
| Create/update preset           | Y     | N        |
| View layout/devices/annotations| Y     | Y        |
| Upload layout / save positions / save annotation | Y | N |
| View mappings                  | Y     | Y        |
| Create/update mappings         | Y     | N        |
| View mode                      | Y     | Y        |
| Update mode                    | Y     | N        |
| Run readiness check            | Y     | N        |

---

## 8. State Transition Rules

### Camera Status

Allowed:
* `ACTIVE -> INACTIVE`
* `INACTIVE -> ACTIVE`
* `ACTIVE -> OFFLINE`
* `OFFLINE -> ACTIVE`

Restriction:
* `INACTIVE` camera cannot be used in active mapping

### Operation Mode

Allowed:
* `MANUAL <-> AUTOMATIC`

### Mapping Active Flag

Allowed:
* `true -> false`
* `false -> true`

Restriction:
* only one active mapping per unit

### Readiness

* `PASSED`, `WARNING`, `FAILED` are computed statuses, not persisted workflow transitions

---

## 9. Error Handling

### 9.1 Standard Codes

| HTTP | Code                        | Meaning                          |
| ---- | --------------------------- | -------------------------------- |
| 400  | VALIDATION_ERROR            | invalid request                  |
| 401  | UNAUTHORIZED                | missing/invalid token            |
| 403  | FORBIDDEN                   | role denied                      |
| 404  | ROOM_NOT_FOUND              | room missing                     |
| 404  | CONFIG_NOT_FOUND            | TS-D config missing              |
| 404  | CAMERA_NOT_FOUND            | camera missing                   |
| 404  | PRESET_NOT_FOUND            | preset missing                   |
| 404  | UNIT_NOT_FOUND              | unit missing                     |
| 404  | MAPPING_NOT_FOUND           | mapping missing                  |
| 404  | ANNOTATION_NOT_FOUND        | annotation missing               |
| 409  | TSD_CONFIG_EXISTS           | duplicate TS-D config            |
| 409  | CAMERA_DUPLICATE_ENDPOINT   | duplicate IP/port                |
| 409  | PRESET_CODE_EXISTS          | duplicate preset code            |
| 409  | ACTIVE_MAPPING_EXISTS       | duplicate active mapping         |
| 409  | CAMERA_ALREADY_INACTIVE     | invalid state                    |
| 422  | CAMERA_LIMIT_REACHED        | >4 active cameras                |
| 422  | CAMERA_ALREADY_IN_USE       | active mapping reference exists  |
| 422  | CAMERA_INACTIVE             | invalid active mapping target    |
| 422  | PRESET_CAMERA_MISMATCH      | invalid preset-camera relation   |
| 422  | CROSS_ROOM_MAPPING_INVALID  | cross-room relation              |
| 422  | PRESET_NOT_SUPPORTED        | camera capability issue          |
| 422  | LAYOUT_NOT_CONFIGURED       | no layout for dependent action   |
| 502  | TSD_UNREACHABLE             | TS-D unreachable                 |
| 502  | TSD_SYNC_FAILED             | TS-D sync failed                 |
| 502  | TSD_MALFORMED_RESPONSE      | invalid external payload         |
| 502  | CAMERA_CONNECTION_FAILED    | camera connection failed         |
| 503  | TSD_TIMEOUT                 | TS-D timeout                     |
| 503  | CAMERA_TIMEOUT              | camera timeout                   |
| 500  | INTERNAL_ERROR              | unexpected failure               |

---

## 10. Pagination, Filtering, Sorting

List APIs supporting pagination:
* `GET /config/tsd/{id}/units`
* `GET /config/cameras`
* `GET /config/mappings`

Common rules:
* `page`: default `1`
* `pageSize`: default `20`, camera list may default `10`
* `search`: case-insensitive partial match
* `sortOrder`: `asc` or `desc`

---

## 11. Naming Conventions

### 11.1 JSON

Use `camelCase`:

* `baseUrl`
* `ipAddress`
* `presetCode`
* `operationMode`
* `lastTestResult`

### 11.2 DB Mapping

Use `snake_case`:

* `base_url`
* `ip_address`
* `preset_code`
* `operation_mode`
* `last_test_result`

### 11.3 Enum Values

Use uppercase strings:

* `MANUAL`
* `AUTOMATIC`
* `ACTIVE`
* `INACTIVE`
* `SUCCESS`

---

## 12. Side Effects Summary

| Endpoint Group                | Side Effects |
| ---------------------------- | ------------ |
| TS-D create/update           | audit log |
| TS-D test                    | update test status, audit, system log on failure |
| TS-D sync                    | create/update units, audit, system log |
| Camera create/update         | audit log |
| Camera deactivate            | update status, audit log |
| Camera test                  | update capability/test fields, audit, system log |
| Preset create/update         | audit log |
| Layout upload                | storage write, audit log |
| Layout devices/annotations   | audit log |
| Mapping create/update        | audit log |
| Mode update                  | audit log, runtime reload hint |
| Readiness check              | audit log, optional persistence |

