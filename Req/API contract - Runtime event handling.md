# API Contract – Runtime Event Handling Module (MVP, 1 Room)

Tài liệu này đặc tả API cho module **Runtime Event Handling** dựa trên:

* Use Cases: Runtime Event Handling (UC-RUNTIME-01 → UC-RUNTIME-17)
* Detail Design: Runtime Event Handling Module

Không thêm business logic ngoài scope đã nêu.

---

## 1. Overview

### 1.1 Goals

API runtime phục vụ:

* UI đọc **runtime snapshot** (mode, SSE status, active speaker, camera target)
* UI đọc **speaking request queue** (Manual mode)
* Operator/Admin **approve/reject** request (Manual mode)
* (Internal) Admin start/stop runtime listener

### 1.2 Base URL

`/api/v1`

### 1.3 Conventions

#### Success envelope

```json
{
  "success": true,
  "data": {}
}
```

#### Error envelope

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

### 1.4 Naming & Mapping

* JSON: `camelCase`
* DB: `snake_case` (nếu persist)
* IDs: `uuid` (theo DD)
* Time: ISO-8601 UTC string, ví dụ `2026-04-21T10:00:00Z`

### 1.5 Roles & Permissions

| Capability                       | ADMIN | OPERATOR |
| -------------------------------- | :---: | :------: |
| View runtime snapshot            |   Y   |    Y     |
| View request queue               |   Y   |    Y     |
| Approve speaking request         |   Y   |    Y     |
| Reject speaking request          |   Y   |    Y     |
| Internal start/stop runtime      |   Y   |    N     |

Backend authorization là source-of-truth.

---

## 2. Modules & Endpoints List (Traceability)

### 2.1 Runtime Snapshot

* UC-RUNTIME-05: Maintain Room Runtime Snapshot
* UC-RUNTIME-15: Broadcast Runtime State to UI

Endpoints:

* `GET /api/v1/runtime/snapshot`

### 2.2 Speaking Requests (Manual Mode)

* UC-RUNTIME-06: Create Speaking Request (system-created from SSE)
* UC-RUNTIME-07: Approve Speaking Request
* UC-RUNTIME-08: Reject Speaking Request
* UC-RUNTIME-09: Cancel Speaking Request (system)

Endpoints:

* `GET /api/v1/runtime/requests`
* `POST /api/v1/runtime/requests/{id}/approve`
* `POST /api/v1/runtime/requests/{id}/reject`

### 2.3 Runtime Control (Internal)

* UC-RUNTIME-01: Start SSE Event Listener
* UC-RUNTIME-03: Handle SSE Disconnection & Reconnection
* UC-RUNTIME-16: Run Runtime State Recovery

Endpoints:

* `POST /internal/runtime/start`
* `POST /internal/runtime/stop`

---

## 3. Schemas (JSON)

### 3.1 Enums

```text
OperationMode: MANUAL | AUTOMATIC
SseStatus: CONNECTED | RECONNECTING | DISCONNECTED

UnitRuntimeState: IDLE | REQUEST | SPEAKING | OFFLINE

SpeakingRequestStatus: PENDING | APPROVED | REJECTED | CANCELLED
```

### 3.2 RuntimeSnapshot

| Field                | Type                            | Required | Notes |
| -------------------- | ------------------------------- | :------: | ----- |
| operationMode        | `OperationMode`                 |    Y     | from room config runtime |
| sseStatus            | `SseStatus`                     |    Y     | listener status |
| activeSpeakers       | `string[]`                      |    Y     | list of `externalUnitId` hoặc `unitId` (assumption: `unitId` UUID) |
| pendingRequests      | `string[]`                      |    Y     | list of request ids |
| currentCameraTarget  | `CurrentCameraTarget \| null`   |    Y     | null nếu không có |

#### CurrentCameraTarget

| Field     | Type     | Required |
| --------- | -------- | :------: |
| unitId    | `string` |    Y     |
| cameraId  | `string` |    Y     |
| presetId  | `string` |    Y     |

**Assumption:** snapshot trả về `unitId/cameraId/presetId` dạng UUID theo data model.

### 3.3 SpeakingRequest

| Field       | Type                    | Required | Notes |
| ----------- | ----------------------- | :------: | ----- |
| id          | `string`                |    Y     | uuid |
| unitId      | `string`                |    Y     | uuid |
| status      | `SpeakingRequestStatus` |    Y     | |
| createdAt   | `string`                |    Y     | ISO datetime |
| updatedAt   | `string`                |    Y     | ISO datetime |
| handledBy   | `string \| null`         |    Y     | user id (uuid) nếu có |

---

## 4. Detailed API Specification

## 4.1 Get Runtime Snapshot

### `GET /api/v1/runtime/snapshot`

**Description:** Lấy snapshot realtime của room (mode, SSE status, speakers, requests, camera target).

**Related UCs:** UC-RUNTIME-05, UC-RUNTIME-15

**Auth:** `ADMIN`, `OPERATOR`

**Query params:** none

**Request body:** none

**Success Response (200)**

```json
{
  "success": true,
  "data": {
    "operationMode": "MANUAL",
    "sseStatus": "CONNECTED",
    "activeSpeakers": ["11111111-1111-1111-1111-111111111111"],
    "pendingRequests": ["22222222-2222-2222-2222-222222222222"],
    "currentCameraTarget": {
      "unitId": "11111111-1111-1111-1111-111111111111",
      "cameraId": "33333333-3333-3333-3333-333333333333",
      "presetId": "44444444-4444-4444-4444-444444444444"
    }
  }
}
```

**Error responses**

* 401 `UNAUTHORIZED`
* 403 `FORBIDDEN`
* 500 `SYSTEM_ERROR`

**Side effects:** none (read-only)

**Data mapping (indicative)**

* `operationMode` ↔ `runtime_room_state.operation_mode` hoặc `rooms.operation_mode`
* `sseStatus` ↔ `runtime_room_state.sse_status`
* `activeSpeakers` ↔ `runtime_room_state.active_speakers`
* `pendingRequests` ↔ `runtime_room_state.pending_requests`
* `currentCameraTarget` ↔ `runtime_room_state.current_camera_target`

---

## 4.2 List Speaking Requests

### `GET /api/v1/runtime/requests`

**Description:** Lấy danh sách speaking requests (đặc biệt dùng cho Manual mode queue).

**Related UCs:** UC-RUNTIME-06, UC-RUNTIME-07, UC-RUNTIME-08, UC-RUNTIME-09

**Auth:** `ADMIN`, `OPERATOR`

**Query params (optional)**

| Name   | Type     | Required | Description |
| ------ | -------- | :------: | ----------- |
| status | string   |    N     | filter theo status, default trả all |
| page   | integer  |    N     | default 1 |
| pageSize | integer |   N     | default 20 |

**Pagination response format**

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

**Success Response (200) – example**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "22222222-2222-2222-2222-222222222222",
        "unitId": "11111111-1111-1111-1111-111111111111",
        "status": "PENDING",
        "createdAt": "2026-04-21T10:00:00Z",
        "updatedAt": "2026-04-21T10:00:00Z",
        "handledBy": null
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

**Validation**

* `page` >= 1
* `pageSize` in 1..100
* `status` nếu có phải thuộc enum `SpeakingRequestStatus`

**Error responses**

* 400 `VALIDATION_ERROR`
* 401 `UNAUTHORIZED`
* 403 `FORBIDDEN`
* 500 `SYSTEM_ERROR`

**Side effects:** none (read-only)

**Data mapping**

* items ↔ `speaking_requests.*`

---

## 4.3 Approve Speaking Request

### `POST /api/v1/runtime/requests/{id}/approve`

**Description:** Operator/Admin approve request đang `PENDING`. Hệ thống gửi command tới TS-D1000 và chờ event SPEAKING để update unit state.

**Related UCs:** UC-RUNTIME-07

**Auth:** `ADMIN`, `OPERATOR`

**Path params**

| Name | Type   | Required | Description |
| ---- | ------ | :------: | ----------- |
| id   | string |    Y     | request uuid |

**Request body:** none (MVP)

**Success Response (200)**

```json
{
  "success": true,
  "data": {
    "requestId": "22222222-2222-2222-2222-222222222222",
    "status": "APPROVED",
    "approvedAt": "2026-04-21T10:01:00Z"
  }
}
```

**Validation & Business Rules**

* request phải tồn tại
* request.status phải là `PENDING`
* chỉ hợp lệ khi `operationMode = MANUAL`
* không tự set unit SPEAKING nếu chưa có event xác nhận từ TS-D (theo DD/UC)

**Error responses**

* 400 `VALIDATION_ERROR` (id invalid)
* 401 `UNAUTHORIZED`
* 403 `FORBIDDEN`
* 404 `REQUEST_NOT_FOUND`
* 422 `REQUEST_NOT_PENDING`
* 422 `MANUAL_MODE_REQUIRED`
* 502/503 `INTEGRATION_ERROR` (TS-D unreachable/timeout)
* 500 `SYSTEM_ERROR`

**Side effects**

* ghi audit log: `APPROVE_SPEAKING_REQUEST`
* ghi system log nếu TS-D command fail

---

## 4.4 Reject Speaking Request

### `POST /api/v1/runtime/requests/{id}/reject`

**Description:** Reject request đang `PENDING`. Không trigger camera.

**Related UCs:** UC-RUNTIME-08

**Auth:** `ADMIN`, `OPERATOR`

**Path params**

| Name | Type   | Required |
| ---- | ------ | :------: |
| id   | string |    Y     |

**Request body:** none (MVP)

**Success Response (200)**

```json
{
  "success": true,
  "data": {
    "requestId": "22222222-2222-2222-2222-222222222222",
    "status": "REJECTED",
    "rejectedAt": "2026-04-21T10:01:30Z"
  }
}
```

**Validation & Business Rules**

* request phải tồn tại
* request.status phải là `PENDING`
* (Manual mode): reject chỉ tồn tại trong flow manual (theo UC/DD). Nếu backend choose strict: require MANUAL.
* reject không trigger camera
* unit state set về `IDLE` (theo DD)

**Error responses**

* 400 `VALIDATION_ERROR`
* 401 `UNAUTHORIZED`
* 403 `FORBIDDEN`
* 404 `REQUEST_NOT_FOUND`
* 422 `REQUEST_NOT_PENDING`
* 422 `MANUAL_MODE_REQUIRED` (nếu enforce)
* 502/503 `INTEGRATION_ERROR` (nếu reject cần TS-D command)
* 500 `SYSTEM_ERROR`

**Side effects**

* audit log: `REJECT_SPEAKING_REQUEST`

---

## 4.5 Internal Runtime Start

### `POST /internal/runtime/start`

**Description:** Start runtime listener (SSE) cho room active (MVP single-room).

**Related UCs:** UC-RUNTIME-01, UC-RUNTIME-03

**Auth:** `ADMIN` only

**Request body:** none

**Success Response (200)**

```json
{
  "success": true,
  "data": {
    "started": true,
    "sseStatus": "CONNECTED"
  }
}
```

**Error responses**

* 401 `UNAUTHORIZED`
* 403 `FORBIDDEN`
* 502/503 `INTEGRATION_ERROR`
* 500 `SYSTEM_ERROR`

**Side effects**

* start SSE connection
* log connect/disconnect/retry
* optional trigger recovery after connect

---

## 4.6 Internal Runtime Stop

### `POST /internal/runtime/stop`

**Description:** Stop runtime listener.

**Related UCs:** UC-RUNTIME-01, UC-RUNTIME-03

**Auth:** `ADMIN` only

**Request body:** none

**Success Response (200)**

```json
{
  "success": true,
  "data": {
    "stopped": true,
    "sseStatus": "DISCONNECTED"
  }
}
```

**Error responses**

* 401 `UNAUTHORIZED`
* 403 `FORBIDDEN`
* 500 `SYSTEM_ERROR`

---

## 5. Validation Rules (Consolidated)

### 5.1 Field-level

* `requests/{id}`: `id` must be UUID-like non-empty string.
* pagination: `page >= 1`, `pageSize in 1..100`.
* `status` filter must be `SpeakingRequestStatus`.

### 5.2 Cross-field / Business

* Approve/Reject:
  * request tồn tại
  * request.status == `PENDING`
  * (strict) operationMode == `MANUAL`
* System rules (from DD):
  * 1 pending request per unit
  * event malformed không crash runtime; ignore + log
  * camera trigger chỉ khi state `SPEAKING`

---

## 6. State & Transition Rules

### 6.1 Request State

```text
PENDING -> APPROVED
PENDING -> REJECTED
PENDING -> CANCELLED
```

Invalid: APPROVED/REJECTED/CANCELLED -> PENDING.

### 6.2 Unit State (runtime)

```text
IDLE -> REQUEST -> SPEAKING -> IDLE
IDLE -> SPEAKING -> IDLE
REQUEST -> IDLE
```

---

## 7. Error Handling

### 7.1 Common error codes

| HTTP | Code                  | When |
| ---- | --------------------- | ---- |
| 400  | `VALIDATION_ERROR`    | invalid params/query |
| 401  | `UNAUTHORIZED`        | not logged in |
| 403  | `FORBIDDEN`           | role not allowed |
| 404  | `REQUEST_NOT_FOUND`   | request id not exist |
| 422  | `REQUEST_NOT_PENDING` | stale request state |
| 422  | `MANUAL_MODE_REQUIRED`| approve/reject in non-manual (if enforced) |
| 502  | `INTEGRATION_ERROR`   | TS-D unreachable/malformed response |
| 500  | `SYSTEM_ERROR`        | unexpected server error |

---

## 8. Assumptions / Open Points

1. Snapshot `activeSpeakers` đại diện bởi `unitId` (uuid). Nếu UI muốn `externalUnitId`, cần add field song song (không bắt buộc bởi DD hiện tại).
2. Reject action có/không cần gửi command TS-D chưa được chốt rõ; contract giữ `POST` và cho phép backend implement phù hợp, nhưng vẫn enforce business state.
3. Event feed APIs chưa nằm trong DD API section; không đưa vào MVP contract.

