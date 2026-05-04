# API Contract – Live Monitoring Module

**System:** Desktop Meeting Control Application for TS-D1000 + PTZ Cameras
**Scope:** Live Monitoring, realtime status, alerts, event feed, and admin recovery APIs.

## 1. Overview

### 1.1 Purpose

This document defines the implementation-ready API contract for the Live Monitoring module. It is derived from:

- `Req/Use cases - Live Monitoring.md`
- `Req/Detail design - Live Monitoring.md`
- `Req/Use cases.md`

It protects the contract surface for frontend and backend developers while aligning with business requirements and runtime state design.

### 1.2 Base Rules

- Base URL: `/api/v1`
- JSON naming: `camelCase`
- DB naming: `snake_case`
- Protected APIs require `Authorization: Bearer <token>`
- Success wrapper:

```json
{
  "success": true,
  "data": {}
}
```

- Error wrapper:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": null
  }
}
```

### 1.3 Roles

- `ADMIN`
- `OPERATOR`

### 1.4 Access Model

- `ADMIN`: view monitoring, acknowledge alerts, run runtime recovery.
- `OPERATOR`: view monitoring, acknowledge alerts only.

### 1.5 Live Monitoring Behavior

- All Live Monitoring APIs are read-only except:
  - `POST /live/alerts/{id}/acknowledge`
  - `POST /live/runtime/recovery`
- Runtime state is driven by backend runtime event handling.
- UI should treat stale runtime data as a warning, not as actual system behavior.

## 2. Modules & Endpoints List

| Module | Related UC | Endpoints |
| --- | --- | --- |
| Live Dashboard | UC-LIVE-01, UC-LIVE-02 | `GET /live/dashboard`, `GET /live/snapshot` |
| Realtime Map | UC-LIVE-03, UC-LIVE-04 | `GET /live/map` |
| Speaker Monitoring | UC-LIVE-05, UC-LIVE-06, UC-LIVE-07 | `GET /live/speakers/active`, `GET /live/requests/summary`, `GET /live/units/{unitId}` |
| Camera Monitoring | UC-LIVE-08, UC-LIVE-09, UC-LIVE-10 | `GET /live/cameras/status`, `GET /live/cameras/target`, `GET /live/cameras/triggers` |
| Event Feed | UC-LIVE-11, UC-LIVE-12 | `GET /live/events` |
| Alert Monitoring | UC-LIVE-13, UC-LIVE-14 | `GET /live/alerts`, `POST /live/alerts/{id}/acknowledge` |
| Runtime Connection | UC-LIVE-15, UC-LIVE-16 | `GET /live/runtime/status` |
| Recovery | UC-LIVE-17 | `POST /live/runtime/recovery` |

## 3. Detailed API Specification

### 3.1 GET /live/dashboard

| Field | Value |
| --- | --- |
| Description | Get high-level live dashboard data for the current room.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-01

#### Request

- no path params
- no query params
- no request body

#### Response

```json
{
  "success": true,
  "data": {
    "roomId": "room-uuid",
    "operationMode": "MANUAL",
    "sseStatus": "CONNECTED",
    "lastEventAt": "2026-05-04T10:15:00Z",
    "activeSpeakerCount": 1,
    "pendingRequestCount": 3,
    "currentCameraTarget": {
      "cameraId": "cam-01",
      "cameraName": "Camera 1",
      "unitId": "unit-01",
      "unitName": "Delegate 01",
      "presetId": "preset-01",
      "presetName": "Delegate 01"
    },
    "activeAlerts": [
      {
        "id": "alert-01",
        "severity": "WARNING",
        "source": "MAPPING",
        "message": "Unit Delegate 05 has no active camera mapping"
      }
    ]
  }
}
```

#### Field Mapping

- `roomId` → `rooms.id`
- `operationMode` → `runtime_room_state.operation_mode`
- `sseStatus` → `runtime_room_state.sse_status`
- `lastEventAt` → `runtime_room_state.last_event_at`
- `activeSpeakerCount` → count of `runtime_units_state` where `state = SPEAKING`
- `pendingRequestCount` → count of pending requests from runtime state or `speaking_requests`
- `currentCameraTarget` → `runtime_room_state.current_camera_target_json`
- `activeAlerts` → `runtime_alerts`

#### Errors

- 401 Unauthorized
- 403 Forbidden
- 503 RUNTIME_UNAVAILABLE
- 500 SYSTEM_ERROR

---

### 3.2 GET /live/snapshot

| Field | Value |
| --- | --- |
| Description | Get the full runtime snapshot used for live monitoring.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-02

#### Query Parameters

- none

#### Response

```json
{
  "success": true,
  "data": {
    "roomState": {
      "operationMode": "AUTOMATIC",
      "sseStatus": "CONNECTED",
      "updatedAt": "2026-05-04T10:16:00Z"
    },
    "units": [
      {
        "unitId": "unit-01",
        "unitName": "Delegate 01",
        "deviceType": "DELEGATE",
        "state": "SPEAKING",
        "lastEventAt": "2026-05-04T10:15:58Z"
      }
    ],
    "cameras": [
      {
        "cameraId": "cam-01",
        "cameraName": "Camera 1",
        "status": "ACTIVE",
        "lastResult": "SUCCESS"
      }
    ]
  }
}
```

#### Field Mapping

- `units` → `runtime_units_state` joined with `tsd_units`
- `cameras` → `runtime_camera_state` joined with `cameras`

#### Errors

- 401 Unauthorized
- 403 Forbidden
- 503 RUNTIME_UNAVAILABLE
- 500 SYSTEM_ERROR

---

### 3.3 GET /live/map

| Field | Value |
| --- | --- |
| Description | Get layout and device runtime positions for realtime map display.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-03, UC-LIVE-04

#### Response

```json
{
  "success": true,
  "data": {
    "layout": {
      "id": "layout-uuid",
      "filePath": "/uploads/layouts/room-a.pdf",
      "fileType": "PDF"
    },
    "devices": [
      {
        "refType": "TSD_UNIT",
        "refId": "unit-01",
        "label": "Delegate 01",
        "posX": 0.45,
        "posY": 0.62,
        "runtimeState": "SPEAKING"
      },
      {
        "refType": "CAMERA",
        "refId": "cam-01",
        "label": "Camera 1",
        "posX": 0.10,
        "posY": 0.15,
        "runtimeState": "ACTIVE"
      }
    ]
  }
}
```

#### Field Mapping

- `layout` → layout metadata
- `devices[].posX/posY` → layout device positions
- `devices[].runtimeState` → `runtime_units_state.state` or camera runtime status

#### Validation

- if layout is missing: `layout = null` and `devices = []`

#### Errors

- 401 Unauthorized
- 403 Forbidden
- 500 SYSTEM_ERROR

---

### 3.4 GET /live/speakers/active

| Field | Value |
| --- | --- |
| Description | Get list of active speakers.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-05

#### Response

```json
{
  "success": true,
  "data": [
    {
      "unitId": "unit-01",
      "unitName": "Delegate 01",
      "deviceType": "DELEGATE",
      "state": "SPEAKING",
      "speakingSince": "2026-05-04T10:15:58Z",
      "mappedCameraId": "cam-01",
      "mappedCameraName": "Camera 1",
      "mappedPresetId": "preset-01",
      "mappedPresetName": "Delegate 01"
    }
  ]
}
```

#### Field Mapping

- speaker rows from `runtime_units_state` where `state = SPEAKING`
- joined with `tsd_units` and mapping tables

#### Errors

- 401 Unauthorized
- 403 Forbidden
- 500 SYSTEM_ERROR

---

### 3.5 GET /live/requests/summary

| Field | Value |
| --- | --- |
| Description | Get pending request queue summary for Manual mode.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-06

#### Response

```json
{
  "success": true,
  "data": {
    "operationMode": "MANUAL",
    "queueUsed": true,
    "pendingRequestCount": 3,
    "pendingRequests": [
      {
        "requestId": "req-01",
        "unitId": "unit-02",
        "unitName": "Delegate 02",
        "requestedAt": "2026-05-04T10:14:30Z"
      }
    ]
  }
}
```

#### Business Rules

- if `operationMode != MANUAL`, `queueUsed = false` and `pendingRequests` can be empty.

#### Errors

- 401 Unauthorized
- 403 Forbidden
- 500 SYSTEM_ERROR

---

### 3.6 GET /live/units/{unitId}

| Field | Value |
| --- | --- |
| Description | Get runtime detail for a specific unit.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-07

#### Path Parameters

- `unitId` (uuid, required)

#### Response

```json
{
  "success": true,
  "data": {
    "unitId": "unit-01",
    "externalUnitId": "D001",
    "unitName": "Delegate 01",
    "deviceType": "DELEGATE",
    "state": "SPEAKING",
    "lastEventAt": "2026-05-04T10:15:58Z",
    "mapping": {
      "cameraId": "cam-01",
      "cameraName": "Camera 1",
      "presetId": "preset-01",
      "presetName": "Delegate 01"
    }
  }
}
```

#### Field Mapping

- `unitId` → `runtime_units_state.unit_id`
- `state` → `runtime_units_state.state`
- `mapping` → active mic-camera mapping data

#### Errors

- 401 Unauthorized
- 403 Forbidden
- 404 NOT_FOUND
- 500 SYSTEM_ERROR

---

### 3.7 GET /live/cameras/status

| Field | Value |
| --- | --- |
| Description | Get runtime status for all cameras.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-08

#### Response

```json
{
  "success": true,
  "data": [
    {
      "cameraId": "cam-01",
      "cameraName": "Camera 1",
      "status": "ACTIVE",
      "currentTargetUnitId": "unit-01",
      "currentPresetId": "preset-01",
      "lastSwitchAt": "2026-05-04T10:15:58Z",
      "lastResult": "SUCCESS"
    }
  ]
}
```

#### Field Mapping

- `cameraId` → `runtime_camera_state.camera_id`
- `lastResult` → `runtime_camera_state.last_result`

#### Errors

- 401 Unauthorized
- 403 Forbidden
- 500 SYSTEM_ERROR

---

### 3.8 GET /live/cameras/target

| Field | Value |
| --- | --- |
| Description | Get current camera target status across the room.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-09

#### Response

```json
{
  "success": true,
  "data": [
    {
      "cameraId": "cam-01",
      "cameraName": "Camera 1",
      "targetUnitId": "unit-01",
      "targetUnitName": "Delegate 01",
      "presetId": "preset-01",
      "presetName": "Delegate 01",
      "switchedAt": "2026-05-04T10:15:58Z",
      "lastResult": "SUCCESS"
    }
  ]
}
```

#### Errors

- 401 Unauthorized
- 403 Forbidden
- 500 SYSTEM_ERROR

---

### 3.9 GET /live/cameras/triggers

| Field | Value |
| --- | --- |
| Description | Get recent camera trigger results.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-10

#### Query Parameters

- `cameraId` (uuid, optional)
- `limit` (integer, optional, default 20)
- `result` (enum: `SUCCESS`, `FAILED`, `SKIPPED`, optional)

#### Response

```json
{
  "success": true,
  "data": [
    {
      "cameraId": "cam-01",
      "targetUnitId": "unit-01",
      "presetId": "preset-01",
      "result": "FAILED",
      "reason": "Invalid mapping",
      "triggeredAt": "2026-05-04T10:15:58Z"
    }
  ]
}
```

#### Validation

- `result` must be one of `SUCCESS`, `FAILED`, `SKIPPED`.

#### Errors

- 400 VALIDATION_ERROR
- 401 Unauthorized
- 403 Forbidden
- 500 SYSTEM_ERROR

---

### 3.10 GET /live/events

| Field | Value |
| --- | --- |
| Description | Get realtime event feed list with filters.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-11, UC-LIVE-12

#### Query Parameters

- `eventType` (string, optional)
- `unitId` (uuid, optional)
- `result` (enum: `SUCCESS`, `FAILED`, `SKIPPED`, `IGNORED`, optional)
- `from` (ISO 8601 datetime, optional)
- `to` (ISO 8601 datetime, optional)
- `page` (integer, optional, default 1)
- `pageSize` (integer, optional, default 20)
- `sortBy` (enum: `occurredAt`, optional, default `occurredAt`)
- `sortOrder` (enum: `asc`, `desc`, optional, default `desc`)

#### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "event-01",
        "time": "2026-05-04T10:15:58Z",
        "eventType": "response-unitstart",
        "unitName": "Delegate 01",
        "result": "SUCCESS",
        "message": "Unit started speaking"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 120,
      "totalPages": 6
    }
  }
}
```

#### Validation

- `from <= to` if both provided.

#### Errors

- 400 VALIDATION_ERROR
- 401 Unauthorized
- 403 Forbidden
- 500 SYSTEM_ERROR

---

### 3.11 GET /live/alerts

| Field | Value |
| --- | --- |
| Description | Get active runtime alerts.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-13

#### Query Parameters

- `status` (enum: `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`, optional, default `ACTIVE`)
- `severity` (enum: `INFO`, `WARNING`, `ERROR`, `CRITICAL`, optional)
- `source` (string, optional)
- `page` (integer, optional, default 1)
- `pageSize` (integer, optional, default 20)

#### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "alert-01",
        "severity": "WARNING",
        "source": "MAPPING",
        "message": "Unit Delegate 05 has no active camera mapping",
        "status": "ACTIVE",
        "createdAt": "2026-05-04T10:15:00Z"
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

#### Errors

- 400 VALIDATION_ERROR
- 401 Unauthorized
- 403 Forbidden
- 500 SYSTEM_ERROR

---

### 3.12 POST /live/alerts/{id}/acknowledge

| Field | Value |
| --- | --- |
| Description | Acknowledge an active runtime alert.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-14

#### Path Parameters

- `id` (uuid, required)

#### Request Body

- none

#### Response

```json
{
  "success": true,
  "data": {
    "alertId": "alert-01",
    "status": "ACKNOWLEDGED",
    "acknowledgedAt": "2026-05-04T10:16:00Z"
  }
}
```

#### Business Rules

- if alert is already acknowledged, return current state without error.
- acknowledge does not resolve the underlying issue.

#### Errors

- 401 Unauthorized
- 403 Forbidden
- 404 NOT_FOUND
- 422 BUSINESS_RULE_ERROR
- 500 SYSTEM_ERROR

---

### 3.13 GET /live/runtime/status

| Field | Value |
| --- | --- |
| Description | Get current runtime connection and data freshness status.
| Permissions | `ADMIN`, `OPERATOR`
| Related UC | UC-LIVE-15, UC-LIVE-16

#### Response

```json
{
  "success": true,
  "data": {
    "sseStatus": "RECONNECTING",
    "lastConnectedAt": "2026-05-04T10:00:00Z",
    "lastDisconnectedAt": "2026-05-04T10:14:00Z",
    "lastEventAt": "2026-05-04T10:13:58Z",
    "isDataStale": true
  }
}
```

#### Validation

- `isDataStale` true if `now - lastEventAt > configured threshold`.

#### Errors

- 401 Unauthorized
- 403 Forbidden
- 500 SYSTEM_ERROR

---

### 3.14 POST /live/runtime/recovery

| Field | Value |
| --- | --- |
| Description | Run runtime recovery operations if available.
| Permissions | `ADMIN`
| Related UC | UC-LIVE-17

#### Request Body

```json
{
  "action": "RECONNECT"
}
```

#### Body Schema

- `action` (required, string, one of `RECONNECT`, `RECOVER_STATE`, `REFRESH_SNAPSHOT`)

#### Response

```json
{
  "success": true,
  "data": {
    "action": "RECONNECT",
    "result": "SUCCESS",
    "message": "Runtime SSE reconnect initiated"
  }
}
```

#### Business Rules

- only Admin may execute recovery.
- action must not change system configuration.
- result may be `SUCCESS` or `FAILED`.
- `REFRESH_SNAPSHOT` may be a no-op if runtime already current.

#### Errors

- 400 VALIDATION_ERROR
- 401 Unauthorized
- 403 RECOVERY_ADMIN_ONLY
- 422 INVALID_ACTION
- 503 RUNTIME_UNAVAILABLE
- 500 SYSTEM_ERROR

---

## 4. Data Mapping

| API Field | Database / Entity Field | Notes |
| --- | --- | --- |
| `operationMode` | `runtime_room_state.operation_mode` | snapshot of runtime operating mode |
| `sseStatus` | `runtime_room_state.sse_status` | runtime SSE connection state |
| `activeSpeakerCount` | count of `runtime_units_state` | derived count |
| `pendingRequestCount` | count of pending speaking requests | derived count |
| `currentCameraTarget` | `runtime_room_state.current_camera_target_json` | joined with metadata |
| `state` | `runtime_units_state.state` | `IDLE`, `REQUEST`, `SPEAKING`, `OFFLINE` |
| `lastResult` | `runtime_camera_state.last_result` | camera trigger result |
| `createdAt` | `runtime_alerts.created_at` | alert creation timestamp |
| `status` | `runtime_alerts.status` | ACTIVE / ACKNOWLEDGED / RESOLVED |
| `lastEventAt` | `runtime_room_state.last_event_at` | last runtime event timestamp |

## 5. Validation Rules

### Field-Level

- `action` in recovery must be one of: `RECONNECT`, `RECOVER_STATE`, `REFRESH_SNAPSHOT`.
- `sortOrder` must be `asc` or `desc`.
- `page` must be integer ≥ 1.
- `pageSize` must be integer between 1 and 100.
- `from` / `to` must be valid ISO 8601 datetimes.
- `result` filters must follow enum values for each endpoint.

### Cross-Field

- `from <= to` when both are provided in event feed.
- `unitId` in `GET /live/units/{unitId}` must belong to the current room.
- `status` and `severity` filters in alerts must match defined enums.

### Business Rules

- If runtime snapshot is unavailable, return partial data with `RUNTIME_UNAVAILABLE` rather than stale success.
- Pending request summary is only meaningful in `MANUAL` mode.
- Missing layout does not block dashboard, map endpoint should gracefully return empty map state.
- Acknowledging an alert does not resolve it.

## 6. Authorization Rules

| Endpoint | Admin | Operator |
| --- | :---: | :------: |
| `GET /live/dashboard` | Y | Y |
| `GET /live/snapshot` | Y | Y |
| `GET /live/map` | Y | Y |
| `GET /live/speakers/active` | Y | Y |
| `GET /live/requests/summary` | Y | Y |
| `GET /live/units/{unitId}` | Y | Y |
| `GET /live/cameras/status` | Y | Y |
| `GET /live/cameras/target` | Y | Y |
| `GET /live/cameras/triggers` | Y | Y |
| `GET /live/events` | Y | Y |
| `GET /live/alerts` | Y | Y |
| `POST /live/alerts/{id}/acknowledge` | Y | Y |
| `GET /live/runtime/status` | Y | Y |
| `POST /live/runtime/recovery` | Y | N |

## 7. State Transition Rules

### Alerts

- `ACTIVE -> ACKNOWLEDGED`
- `ACTIVE -> RESOLVED`
- `ACKNOWLEDGED -> RESOLVED`

**Rule:** acknowledgement does not resolve.

### Runtime Connection

- `CONNECTED -> RECONNECTING -> CONNECTED`
- `CONNECTED -> DISCONNECTED`
- `DISCONNECTED -> RECONNECTING`

### Unit Runtime

- `IDLE -> REQUEST -> SPEAKING -> IDLE`
- `IDLE -> SPEAKING -> IDLE`
- `ANY -> OFFLINE`
- `OFFLINE -> IDLE`

## 8. Error Handling

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": null
  }
}
```

### Common Errors

| HTTP | Code | Description |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | invalid input or query values |
| 401 | UNAUTHORIZED | missing or invalid token |
| 403 | FORBIDDEN | insufficient permission |
| 404 | NOT_FOUND | resource not found |
| 409 | CONFLICT | duplicate or inconsistent state |
| 422 | BUSINESS_RULE_ERROR | business rule violation |
| 503 | RUNTIME_UNAVAILABLE | runtime data not available |
| 500 | SYSTEM_ERROR | unexpected server error |

### Endpoint-Specific Errors

- `POST /live/runtime/recovery`: `RECOVERY_ADMIN_ONLY`, `INVALID_ACTION`, `RUNTIME_UNAVAILABLE`
- `POST /live/alerts/{id}/acknowledge`: `NOT_FOUND`, `BUSINESS_RULE_ERROR`

## 9. Pagination, Filtering, Sorting

### List API Response Format

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### Standard Query Parameters

- `page`: integer, default `1`
- `pageSize`: integer, default `20`, maximum `100`
- `sortBy`: field-specific
- `sortOrder`: `asc` or `desc`

## 10. Side Effects

- `POST /live/alerts/{id}/acknowledge` must write audit log for alert acknowledgement.
- `POST /live/runtime/recovery` must write recovery log in `runtime_recovery_logs`.
- `GET /live/snapshot`, `GET /live/dashboard`, and related runtime endpoints may trigger realtime UI broadcast side effects in the backend if runtime snapshots are rebuilt.

## 11. Naming Conventions

- JSON: `camelCase`
- DB fields: `snake_case`
- Collections: plural nouns
- IDs: UUID strings
- Status fields: uppercase enum values

## 12. Assumptions

- Live Monitoring uses a single active room context.
- Runtime snapshot can be rebuilt from event/state tables.
- `currentCameraTarget` may be absent if no active target exists.
- `pendingRequestCount` may be derived from runtime state or request queue.
- Camera trigger history is read-only monitoring data.

## 13. OpenAPI Reference

A companion OpenAPI 3.0 definition is available in `Req/openapi-3.0-live-monitoring.yaml`.
