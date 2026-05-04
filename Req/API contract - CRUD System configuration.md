# 1. Overview

## 1.1 Scope

Tài liệu này mô tả API Contract cho module **CRUD System Configuration**, bao gồm:

* System Configuration Overview
* TS-D1000 Configuration
* Camera Configuration
* Camera Preset Configuration
* Layout & Map Configuration
* Mic-Camera Mapping Configuration
* Operation Mode Configuration
* Configuration Testing & Readiness

## 1.2 Roles

* `ADMIN`: create/update/deactivate/test/sync/check
* `OPERATOR`: view-only

## 1.3 Base URL

```http
/api/v1
```

## 1.4 Security

Protected APIs require:

```http
Authorization: Bearer <access_token>
```

## 1.5 Response Convention

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

## 1.6 Assumptions

1. MVP chỉ có 1 room active.
2. `Deactivate` được dùng thay cho hard delete đối với TS-D config, camera, mapping.
3. Camera preset có thể hard delete nếu không bị active mapping tham chiếu.
4. Một số API list hỗ trợ pagination/filtering ngay từ contract để sẵn sàng mở rộng, dù MVP có thể chưa cần nhiều dữ liệu.

---

# 2. Modules & Endpoints List

## 2.1 System Configuration Overview

| Endpoint | Method | Use Case |
| -------- | ------ | -------- |
| `/config/overview` | `GET` | UC-CONFIG-01 |

## 2.2 TS-D1000 Configuration

| Endpoint | Method | Use Case |
| -------- | ------ | -------- |
| `/config/tsd` | `POST` | UC-TSDCFG-01 |
| `/config/tsd/current` | `GET` | UC-TSDCFG-02 |
| `/config/tsd/{id}` | `PUT` | UC-TSDCFG-03 |
| `/config/tsd/{id}/deactivate` | `PATCH` | UC-TSDCFG-04 |
| `/config/tsd/{id}/sync-units` | `POST` | UC-TSDCFG-05 |
| `/config/tsd/{id}/units` | `GET` | UC-TSDCFG-05 |
| `/config/tsd/{id}/test` | `POST` | UC-TEST-01 |

## 2.3 Camera Configuration

| Endpoint | Method | Use Case |
| -------- | ------ | -------- |
| `/config/cameras` | `GET` | UC-CFGCAM-02 |
| `/config/cameras` | `POST` | UC-CFGCAM-01 |
| `/config/cameras/{id}` | `GET` | UC-CFGCAM-03 |
| `/config/cameras/{id}` | `PUT` | UC-CFGCAM-04 |
| `/config/cameras/{id}/deactivate` | `PATCH` | UC-CFGCAM-05 |
| `/config/cameras/{id}/test` | `POST` | UC-TEST-02 |

## 2.4 Camera Preset Configuration

| Endpoint | Method | Use Case |
| -------- | ------ | -------- |
| `/config/cameras/{id}/presets` | `GET` | UC-PRESET-02 |
| `/config/cameras/{id}/presets` | `POST` | UC-PRESET-01 |
| `/config/presets/{id}` | `PUT` | UC-PRESET-03 |
| `/config/presets/{id}` | `DELETE` | UC-PRESET-04 |

## 2.5 Layout & Map Configuration

| Endpoint | Method | Use Case |
| -------- | ------ | -------- |
| `/config/layout/current` | `GET` | UC-LAYOUT-01, UC-LAYOUT-02 |
| `/config/layout` | `POST` | UC-LAYOUT-01 |
| `/config/layout/{id}/replace` | `PUT` | UC-LAYOUT-02 |
| `/config/layout/devices` | `GET` | UC-LAYOUT-03 |
| `/config/layout/devices` | `PUT` | UC-LAYOUT-03 |
| `/config/layout/annotations` | `GET` | UC-LAYOUT-04, UC-LAYOUT-05 |
| `/config/layout/annotations` | `POST` | UC-LAYOUT-04 |
| `/config/layout/annotations/{id}` | `PUT` | UC-LAYOUT-05 |

## 2.6 Mic-Camera Mapping Configuration

| Endpoint | Method | Use Case |
| -------- | ------ | -------- |
| `/config/mappings` | `GET` | UC-MAPCFG-02 |
| `/config/mappings` | `POST` | UC-MAPCFG-01 |
| `/config/mappings/{id}` | `PUT` | UC-MAPCFG-03 |
| `/config/mappings/{id}/deactivate` | `PATCH` | UC-MAPCFG-04 |

## 2.7 Operation Mode Configuration

| Endpoint | Method | Use Case |
| -------- | ------ | -------- |
| `/config/mode` | `GET` | UC-MODE-01 |
| `/config/mode` | `PUT` | UC-MODE-02 |

## 2.8 Configuration Testing & Readiness

| Endpoint | Method | Use Case |
| -------- | ------ | -------- |
| `/config/readiness/check` | `POST` | UC-TEST-03 |

---

# 3. Detailed API Specification

## 3.1 System Configuration Overview

### GET `/api/v1/config/overview`

**Description**

Return current configuration summary for the active room.

**Related UC**

* UC-CONFIG-01

**Permission**

* `ADMIN`, `OPERATOR`

**Request**

No body.

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

**Error Cases**

* `401 UNAUTHORIZED`
* `403 FORBIDDEN`
* `404 ROOM_NOT_FOUND`
* `500 INTERNAL_ERROR`

---

## 3.2 TS-D1000 Configuration

### POST `/api/v1/config/tsd`

**Description**

Create active TS-D1000 configuration for the active room.

**Related UC**

* UC-TSDCFG-01

**Permission**

* `ADMIN`

**Request Body**

```json
{
  "baseUrl": "http://192.168.1.10",
  "username": "admin",
  "password": "secret",
  "sseEndpoint": "/api/event"
}
```

| Field | Type | Required | Validation | DB Mapping |
| ----- | ---- | -------: | ---------- | ---------- |
| `baseUrl` | string | Y | non-empty | `tsd_connection_configs.base_url` |
| `username` | string | N | trim | `tsd_connection_configs.username` |
| `password` | string | N | trim | `tsd_connection_configs.password_encrypted` |
| `sseEndpoint` | string | N | if sent non-empty | `tsd_connection_configs.sse_endpoint` |

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "tsd-config-uuid",
    "roomId": "room-uuid",
    "baseUrl": "http://192.168.1.10",
    "username": "admin",
    "sseEndpoint": "/api/event",
    "status": "ACTIVE",
    "lastTestResult": null,
    "lastTestAt": null,
    "createdAt": "2026-04-21T09:10:00Z",
    "updatedAt": "2026-04-21T09:10:00Z"
  }
}
```

**Error Cases**

* `400 VALIDATION_ERROR`
* `403 FORBIDDEN`
* `409 TSD_CONFIG_ALREADY_EXISTS`
* `500 INTERNAL_ERROR`

### GET `/api/v1/config/tsd/current`

**Description**

Get current active TS-D1000 configuration.

**Related UC**

* UC-TSDCFG-02

**Permission**

* `ADMIN`, `OPERATOR`

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "tsd-config-uuid",
    "roomId": "room-uuid",
    "baseUrl": "http://192.168.1.10",
    "username": "admin",
    "sseEndpoint": "/api/event",
    "status": "ACTIVE",
    "lastTestResult": "SUCCESS",
    "lastTestAt": "2026-04-21T09:20:00Z"
  }
}
```

**Not Configured Example**

```json
{
  "success": true,
  "data": null
}
```

### PUT `/api/v1/config/tsd/{id}`

**Description**

Update TS-D1000 configuration.

**Related UC**

* UC-TSDCFG-03

**Permission**

* `ADMIN`

**Path Params**

| Param | Type | Required |
| ----- | ---- | -------: |
| `id` | uuid | Y |

**Request Body**

```json
{
  "baseUrl": "http://192.168.1.11",
  "username": "admin2",
  "password": "new-secret",
  "sseEndpoint": "/api/event"
}
```

**Error Cases**

* `400 VALIDATION_ERROR`
* `403 FORBIDDEN`
* `404 TSD_CONFIG_NOT_FOUND`
* `500 INTERNAL_ERROR`

### PATCH `/api/v1/config/tsd/{id}/deactivate`

**Description**

Deactivate current TS-D1000 configuration.

**Related UC**

* UC-TSDCFG-04

**Permission**

* `ADMIN`

**Request Body**

```json
{
  "reason": "Replaced by new config"
}
```

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "tsd-config-uuid",
    "status": "INACTIVE",
    "updatedAt": "2026-04-21T09:30:00Z"
  }
}
```

**Error Cases**

* `404 TSD_CONFIG_NOT_FOUND`
* `409 INVALID_TSD_CONFIG_STATE`

### POST `/api/v1/config/tsd/{id}/sync-units`

**Description**

Sync TS-D units from device into system.

**Related UC**

* UC-TSDCFG-05

**Permission**

* `ADMIN`

**Success Response**

```json
{
  "success": true,
  "data": {
    "synced": 24,
    "created": 4,
    "updated": 18,
    "skipped": 2,
    "items": [
      {
        "externalUnitId": "D-01",
        "deviceType": "DELEGATE",
        "status": "CREATED"
      }
    ]
  }
}
```

**Error Cases**

* `404 TSD_CONFIG_NOT_FOUND`
* `409 INVALID_TSD_CONFIG_STATE`
* `502 TSD_UNREACHABLE`
* `502 TSD_MALFORMED_RESPONSE`

### GET `/api/v1/config/tsd/{id}/units`

**Description**

List synced units for room/config context.

**Related UC**

* UC-TSDCFG-05

**Permission**

* `ADMIN`, `OPERATOR`

**Query Params**

| Param | Type | Required | Notes |
| ----- | ---- | -------: | ----- |
| `page` | integer | N | default `1` |
| `pageSize` | integer | N | default `20` |
| `search` | string | N | external unit id or name |
| `deviceType` | enum | N | `CHAIRMAN` / `DELEGATE` |
| `sortBy` | string | N | `externalUnitId`, `unitName`, `deviceType` |
| `sortOrder` | enum | N | `asc`, `desc` |

**Success Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "unit-uuid",
        "externalUnitId": "D-01",
        "unitName": "Delegate 01",
        "deviceType": "DELEGATE",
        "runtimeState": "IDLE",
        "isConnected": true
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 24,
      "totalPages": 2
    }
  }
}
```

---

## 3.3 Camera Configuration

### GET `/api/v1/config/cameras`

**Description**

List cameras in active room.

**Related UC**

* UC-CFGCAM-02

**Permission**

* `ADMIN`, `OPERATOR`

**Query Params**

| Param | Type | Required | Notes |
| ----- | ---- | -------: | ----- |
| `page` | integer | N | default `1` |
| `pageSize` | integer | N | default `10` |
| `search` | string | N | name or IP |
| `status` | enum | N | `ACTIVE`, `INACTIVE`, `OFFLINE` |
| `protocol` | enum | N | `ONVIF`, `VISCA` |
| `sortBy` | string | N | `name`, `status`, `lastTestAt` |
| `sortOrder` | enum | N | `asc`, `desc` |

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
        "status": "ACTIVE",
        "capabilities": {
          "ptz": true,
          "preset": true,
          "stream": false
        },
        "lastTestResult": "SUCCESS",
        "lastTestAt": "2026-04-21T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

### POST `/api/v1/config/cameras`

**Description**

Create new camera.

**Related UC**

* UC-CFGCAM-01

**Permission**

* `ADMIN`

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

* `name` required
* `protocol` in `ONVIF`, `VISCA`
* `ipAddress` required
* `port` if present in `1..65535`
* max 4 active cameras
* unique `ipAddress + port` per room

**Error Cases**

* `400 VALIDATION_ERROR`
* `409 CAMERA_DUPLICATE_IP_PORT`
* `409 CAMERA_LIMIT_REACHED`

### GET `/api/v1/config/cameras/{id}`

**Description**

Get camera detail.

**Related UC**

* UC-CFGCAM-03

**Permission**

* `ADMIN`, `OPERATOR`

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "camera-uuid",
    "roomId": "room-uuid",
    "name": "Camera 1",
    "protocol": "ONVIF",
    "ipAddress": "192.168.1.21",
    "port": 80,
    "username": "admin",
    "rtspUrl": "rtsp://192.168.1.21/stream1",
    "vendor": "Hikvision",
    "model": "DS-2DE",
    "status": "ACTIVE",
    "capabilities": {
      "ptz": true,
      "preset": true,
      "stream": false
    },
    "lastTestResult": "SUCCESS",
    "lastTestAt": "2026-04-21T10:00:00Z"
  }
}
```

### PUT `/api/v1/config/cameras/{id}`

**Description**

Update camera.

**Related UC**

* UC-CFGCAM-04

**Permission**

* `ADMIN`

**Request Body**

```json
{
  "name": "Camera 1 Updated",
  "protocol": "ONVIF",
  "ipAddress": "192.168.1.25",
  "port": 80,
  "username": "admin",
  "password": "new-secret",
  "rtspUrl": "rtsp://192.168.1.25/stream1",
  "vendor": "Hikvision",
  "model": "DS-2DE"
}
```

### PATCH `/api/v1/config/cameras/{id}/deactivate`

**Description**

Deactivate camera.

**Related UC**

* UC-CFGCAM-05

**Permission**

* `ADMIN`

**Request Body**

```json
{
  "reason": "Removed from room"
}
```

**Error Cases**

* `404 CAMERA_NOT_FOUND`
* `409 INVALID_CAMERA_STATE`
* `422 CAMERA_ALREADY_IN_USE`

### POST `/api/v1/config/cameras/{id}/test`

**Description**

Test camera connection and detect capabilities.

**Related UC**

* UC-TEST-02

**Permission**

* `ADMIN`

**Success Response**

```json
{
  "success": true,
  "data": {
    "result": "PARTIAL",
    "testedAt": "2026-04-21T10:15:00Z",
    "capabilities": {
      "ptz": true,
      "preset": true,
      "stream": false
    }
  }
}
```

---

## 3.4 Camera Preset Configuration

### GET `/api/v1/config/cameras/{id}/presets`

**Description**

List presets of selected camera.

**Related UC**

* UC-PRESET-02

**Permission**

* `ADMIN`, `OPERATOR`

**Query Params**

| Param | Type | Required | Notes |
| ----- | ---- | -------: | ----- |
| `page` | integer | N | default `1` |
| `pageSize` | integer | N | default `20` |
| `search` | string | N | preset code or name |

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
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

### POST `/api/v1/config/cameras/{id}/presets`

**Description**

Create camera preset.

**Related UC**

* UC-PRESET-01

**Permission**

* `ADMIN`

**Request Body**

```json
{
  "presetCode": "P01",
  "presetName": "Delegate 01"
}
```

**Validation**

* `presetCode` required
* unique per camera

### PUT `/api/v1/config/presets/{id}`

**Description**

Update camera preset.

**Related UC**

* UC-PRESET-03

**Permission**

* `ADMIN`

**Request Body**

```json
{
  "presetCode": "P02",
  "presetName": "Delegate 02"
}
```

### DELETE `/api/v1/config/presets/{id}`

**Description**

Delete camera preset if no active mapping dependency exists.

**Related UC**

* UC-PRESET-04

**Permission**

* `ADMIN`

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "preset-uuid",
    "deleted": true
  }
}
```

**Error Cases**

* `404 PRESET_NOT_FOUND`
* `422 PRESET_ALREADY_IN_USE`

---

## 3.5 Layout & Map Configuration

### GET `/api/v1/config/layout/current`

**Description**

Get active layout metadata.

**Related UC**

* UC-LAYOUT-01, UC-LAYOUT-02

**Permission**

* `ADMIN`, `OPERATOR`

### POST `/api/v1/config/layout`

**Description**

Upload first layout.

**Related UC**

* UC-LAYOUT-01

**Permission**

* `ADMIN`

**Content-Type**

```http
multipart/form-data
```

**Form Data**

| Field | Type | Required | Validation |
| ----- | ---- | -------: | ---------- |
| `file` | binary | Y | PDF/JPG/JPEG only |

### PUT `/api/v1/config/layout/{id}/replace`

**Description**

Replace active layout.

**Related UC**

* UC-LAYOUT-02

**Permission**

* `ADMIN`

**Content-Type**

```http
multipart/form-data
```

### GET `/api/v1/config/layout/devices`

**Description**

List positioned devices on layout.

**Related UC**

* UC-LAYOUT-03

**Permission**

* `ADMIN`, `OPERATOR`

### PUT `/api/v1/config/layout/devices`

**Description**

Save or update device positions on layout.

**Related UC**

* UC-LAYOUT-03

**Permission**

* `ADMIN`

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

**Validation**

* `refType` in `TSD_UNIT`, `CAMERA`
* `refId` must exist
* `posX`, `posY` in `0..1`
* no duplicate same `refType + refId` in same payload

### GET `/api/v1/config/layout/annotations`

**Description**

List layout annotations.

**Related UC**

* UC-LAYOUT-04, UC-LAYOUT-05

**Permission**

* `ADMIN`, `OPERATOR`

### POST `/api/v1/config/layout/annotations`

**Description**

Create layout annotation.

**Related UC**

* UC-LAYOUT-04

**Permission**

* `ADMIN`

**Request Body**

```json
{
  "text": "Chairman Table",
  "posX": 0.5,
  "posY": 0.15
}
```

### PUT `/api/v1/config/layout/annotations/{id}`

**Description**

Update layout annotation.

**Related UC**

* UC-LAYOUT-05

**Permission**

* `ADMIN`

---

## 3.6 Mic-Camera Mapping Configuration

### GET `/api/v1/config/mappings`

**Description**

List mic-camera mappings.

**Related UC**

* UC-MAPCFG-02

**Permission**

* `ADMIN`, `OPERATOR`

**Query Params**

| Param | Type | Required | Notes |
| ----- | ---- | -------: | ----- |
| `page` | integer | N | default `1` |
| `pageSize` | integer | N | default `20` |
| `search` | string | N | unit id or name |
| `cameraId` | uuid | N | filter by camera |
| `deviceType` | enum | N | `CHAIRMAN`, `DELEGATE` |
| `isActive` | boolean | N | active filter |
| `sortBy` | string | N | `unit`, `camera`, `isActive` |
| `sortOrder` | enum | N | `asc`, `desc` |

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
          "externalUnitId": "D-01",
          "unitName": "Delegate 01",
          "deviceType": "DELEGATE"
        },
        "camera": {
          "id": "camera-uuid",
          "name": "Camera 1"
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
      "total": 12,
      "totalPages": 1
    }
  }
}
```

### POST `/api/v1/config/mappings`

**Description**

Create mic-camera mapping.

**Related UC**

* UC-MAPCFG-01

**Permission**

* `ADMIN`

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
* camera exists and active
* preset exists
* preset belongs to selected camera
* one active mapping per unit

### PUT `/api/v1/config/mappings/{id}`

**Description**

Update mapping.

**Related UC**

* UC-MAPCFG-03

**Permission**

* `ADMIN`

**Request Body**

```json
{
  "cameraId": "camera-uuid",
  "presetId": "preset-uuid",
  "isActive": true
}
```

### PATCH `/api/v1/config/mappings/{id}/deactivate`

**Description**

Deactivate mapping.

**Related UC**

* UC-MAPCFG-04

**Permission**

* `ADMIN`

**Success Response**

```json
{
  "success": true,
  "data": {
    "id": "mapping-uuid",
    "isActive": false
  }
}
```

---

## 3.7 Operation Mode Configuration

### GET `/api/v1/config/mode`

**Description**

Get current room operation mode.

**Related UC**

* UC-MODE-01

**Permission**

* `ADMIN`, `OPERATOR`

**Success Response**

```json
{
  "success": true,
  "data": {
    "roomId": "room-uuid",
    "mode": "MANUAL"
  }
}
```

### PUT `/api/v1/config/mode`

**Description**

Update operation mode.

**Related UC**

* UC-MODE-02

**Permission**

* `ADMIN`

**Request Body**

```json
{
  "mode": "AUTOMATIC"
}
```

---

## 3.8 Configuration Testing & Readiness

### POST `/api/v1/config/readiness/check`

**Description**

Run readiness check for current configuration.

**Related UC**

* UC-TEST-03

**Permission**

* `ADMIN`

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
        "message": "TS-D1000 configuration exists and last test succeeded"
      },
      {
        "category": "LAYOUT",
        "status": "FAILED",
        "message": "No active layout found"
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

# 4. Request/Response Schemas

## 4.1 Common Pagination Response

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

## 4.2 Common Error Schema

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "details": null
}
```

## 4.3 Data Mapping Rules

| JSON Field | DB Field |
| ---------- | -------- |
| `roomId` | `room_id` |
| `baseUrl` | `base_url` |
| `sseEndpoint` | `sse_endpoint` |
| `lastTestResult` | `last_test_result` |
| `lastTestAt` | `last_test_at` |
| `ipAddress` | `ip_address` |
| `rtspUrl` | `rtsp_url` |
| `presetCode` | `preset_code` |
| `presetName` | `preset_name` |
| `refType` | `ref_type` |
| `refId` | `ref_id` |
| `posX` | `pos_x` |
| `posY` | `pos_y` |
| `iconLabel` | `icon_label` |
| `isActive` | `is_active` |
| `operationMode` / `mode` | `operation_mode` |

---

# 5. Validation Rules

## 5.1 Field-Level Validation

* `baseUrl`: required, non-empty
* `sseEndpoint`: if sent, non-empty
* `name`: required for camera
* `protocol`: `ONVIF` or `VISCA`
* `ipAddress`: required
* `port`: `1..65535` if present
* `presetCode`: required
* `file`: PDF/JPG/JPEG only
* `text`: non-empty for annotation
* `posX`, `posY`: range `0..1`
* `mode`: `MANUAL` or `AUTOMATIC`

## 5.2 Cross-Field Validation

* `presetId` must belong to `cameraId`
* mapping unit, camera, preset must belong to same room
* `refType = TSD_UNIT` -> `refId` must exist in units
* `refType = CAMERA` -> `refId` must exist in cameras

## 5.3 Business Validation

* only `ADMIN` can mutate data
* max 4 active cameras
* one active TS-D config per room
* one active layout per room
* one active mapping per unit
* inactive camera cannot be used in active mapping
* preset used by active mapping cannot be deleted
* camera used by active mapping cannot be deactivated

---

# 6. Authorization Rules

| API Group | ADMIN | OPERATOR |
| --------- | :---: | :------: |
| View overview | Y | Y |
| View TS-D config | Y | Y |
| Create/update/deactivate TS-D config | Y | N |
| Sync units | Y | N |
| View units | Y | Y |
| View cameras | Y | Y |
| Create/update/deactivate/test camera | Y | N |
| View presets | Y | Y |
| Create/update/delete preset | Y | N |
| View layout | Y | Y |
| Upload/replace/save positions/annotation | Y | N |
| View mappings | Y | Y |
| Create/update/deactivate mapping | Y | N |
| View mode | Y | Y |
| Update mode | Y | N |
| Run readiness check | Y | N |

---

# 7. State Transition Rules

## 7.1 TS-D Configuration

* `ACTIVE -> INACTIVE`
* inactive config cannot be sync/test target for runtime usage

## 7.2 Camera

* `ACTIVE -> INACTIVE`
* `INACTIVE -> ACTIVE`
* `ACTIVE -> OFFLINE`
* `OFFLINE -> ACTIVE`

Invalid transition handling:

* deactivate already inactive camera -> `409 INVALID_CAMERA_STATE`

## 7.3 Mapping

* `isActive: true -> false`
* `isActive: false -> true`

Invalid transition handling:

* activating mapping that creates duplicate active mapping for unit -> `409 MAPPING_ALREADY_EXISTS`

---

# 8. Error Handling

## 8.1 Standard Error Response

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

## 8.2 Common Error Codes

| HTTP | Code | Meaning |
| ---- | ---- | ------- |
| 400 | `VALIDATION_ERROR` | invalid request body |
| 401 | `UNAUTHORIZED` | missing or invalid token |
| 403 | `FORBIDDEN` | insufficient role |
| 404 | `ROOM_NOT_FOUND` | room not found |
| 404 | `TSD_CONFIG_NOT_FOUND` | TS-D config not found |
| 404 | `CAMERA_NOT_FOUND` | camera not found |
| 404 | `PRESET_NOT_FOUND` | preset not found |
| 404 | `LAYOUT_NOT_FOUND` | layout not found |
| 404 | `ANNOTATION_NOT_FOUND` | annotation not found |
| 404 | `MAPPING_NOT_FOUND` | mapping not found |
| 409 | `TSD_CONFIG_ALREADY_EXISTS` | active TS-D config already exists |
| 409 | `CAMERA_DUPLICATE_IP_PORT` | duplicate camera IP/port |
| 409 | `CAMERA_LIMIT_REACHED` | max camera limit reached |
| 409 | `INVALID_CAMERA_STATE` | camera state invalid for action |
| 409 | `INVALID_TSD_CONFIG_STATE` | TS-D config state invalid |
| 409 | `MAPPING_ALREADY_EXISTS` | unit already has active mapping |
| 422 | `CAMERA_ALREADY_IN_USE` | active mapping dependency exists |
| 422 | `PRESET_ALREADY_IN_USE` | active mapping dependency exists |
| 422 | `PRESET_CAMERA_MISMATCH` | preset does not belong to camera |
| 422 | `CAMERA_INACTIVE` | inactive camera selected for active mapping |
| 502 | `TSD_UNREACHABLE` | TS-D device unavailable |
| 502 | `TSD_MALFORMED_RESPONSE` | invalid external payload |
| 502 | `CAMERA_CONNECTION_FAILED` | camera integration failed |
| 500 | `INTERNAL_ERROR` | unexpected system error |

---

# 9. Pagination, Filtering, Sorting

## 9.1 Pagination Rules

Supported for:

* `/config/tsd/{id}/units`
* `/config/cameras`
* `/config/cameras/{id}/presets`
* `/config/mappings`

Default:

* `page = 1`
* `pageSize = 20`

For cameras recommended UI default:

* `pageSize = 10`

## 9.2 Search & Filtering

* units: `search`, `deviceType`
* cameras: `search`, `status`, `protocol`
* presets: `search`
* mappings: `search`, `cameraId`, `deviceType`, `isActive`

## 9.3 Sorting

Common convention:

* `sortBy`
* `sortOrder = asc | desc`

---

# 10. Side Effects

| API | Side Effects |
| --- | ------------ |
| create/update/deactivate TS-D config | audit log |
| sync units | audit log, system log |
| create/update/deactivate camera | audit log |
| test camera / TS-D | audit log, system log, update last test fields |
| create/update/delete preset | audit log |
| upload/replace layout | audit log |
| save positions / annotations | audit log |
| create/update/deactivate mapping | audit log, runtime cache refresh candidate |
| update mode | audit log, runtime mode refresh candidate |
| readiness check | audit log, optional persisted readiness result |

No notification or session revocation is in scope for this module.

---

# 11. Naming Conventions

* JSON uses `camelCase`
* DB uses `snake_case`
* enums are uppercase
* boolean flags use `is...` / `has...`
* REST path nouns are plural where listing resource collections makes sense

---

# 12. Traceability: UC -> API

| Use Case | API |
| -------- | --- |
| UC-CONFIG-01 | `GET /config/overview` |
| UC-TSDCFG-01 | `POST /config/tsd` |
| UC-TSDCFG-02 | `GET /config/tsd/current` |
| UC-TSDCFG-03 | `PUT /config/tsd/{id}` |
| UC-TSDCFG-04 | `PATCH /config/tsd/{id}/deactivate` |
| UC-TSDCFG-05 | `POST /config/tsd/{id}/sync-units`, `GET /config/tsd/{id}/units` |
| UC-CFGCAM-01 | `POST /config/cameras` |
| UC-CFGCAM-02 | `GET /config/cameras` |
| UC-CFGCAM-03 | `GET /config/cameras/{id}` |
| UC-CFGCAM-04 | `PUT /config/cameras/{id}` |
| UC-CFGCAM-05 | `PATCH /config/cameras/{id}/deactivate` |
| UC-PRESET-01 | `POST /config/cameras/{id}/presets` |
| UC-PRESET-02 | `GET /config/cameras/{id}/presets` |
| UC-PRESET-03 | `PUT /config/presets/{id}` |
| UC-PRESET-04 | `DELETE /config/presets/{id}` |
| UC-LAYOUT-01 | `POST /config/layout`, `GET /config/layout/current` |
| UC-LAYOUT-02 | `PUT /config/layout/{id}/replace` |
| UC-LAYOUT-03 | `GET /config/layout/devices`, `PUT /config/layout/devices` |
| UC-LAYOUT-04 | `GET /config/layout/annotations`, `POST /config/layout/annotations` |
| UC-LAYOUT-05 | `PUT /config/layout/annotations/{id}` |
| UC-MAPCFG-01 | `POST /config/mappings` |
| UC-MAPCFG-02 | `GET /config/mappings` |
| UC-MAPCFG-03 | `PUT /config/mappings/{id}` |
| UC-MAPCFG-04 | `PATCH /config/mappings/{id}/deactivate` |
| UC-MODE-01 | `GET /config/mode` |
| UC-MODE-02 | `PUT /config/mode` |
| UC-TEST-01 | `POST /config/tsd/{id}/test` |
| UC-TEST-02 | `POST /config/cameras/{id}/test` |
| UC-TEST-03 | `POST /config/readiness/check` |
