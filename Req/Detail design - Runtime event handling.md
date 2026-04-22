# Detail Design Document – Runtime Event Handling Module

(Bám sát Requirement + UC đã xác định, không thêm feature ngoài scope)

---

# 1. Overview

## 1.1 Purpose

Module Runtime Event Handling chịu trách nhiệm:

* nhận event realtime từ TS-D1000 (SSE)
* xử lý logic Manual / Automatic mode
* quản lý trạng thái mic (unit)
* xử lý speaking request
* trigger camera preset
* cập nhật runtime state cho UI
* ghi log và đảm bảo hệ thống ổn định khi mất kết nối

## 1.2 Scope

Bao gồm:

* SSE ingestion
* event processing
* runtime state
* speaking request
* camera trigger
* UI broadcast
* reconnect & recovery

Không bao gồm:

* cấu hình hệ thống (config module)
* UI rendering
* camera protocol implementation chi tiết

---

# 2. Module Breakdown

| Module               | Responsibility                | Related UC    |
| -------------------- | ----------------------------- | ------------- |
| Runtime Listener     | Kết nối SSE, nhận event       | UC-01, UC-03  |
| Event Processor      | Parse & route event           | UC-02         |
| Runtime State        | Quản lý trạng thái room/unit  | UC-04, UC-05  |
| Request Manager      | Quản lý request (manual mode) | UC-06 -> UC-09 |
| Auto Speaker Handler | Xử lý auto mode               | UC-10, UC-11  |
| Camera Engine        | Trigger camera                | UC-12, UC-13  |
| UI Broadcaster       | Push state cho UI             | UC-14, UC-15  |
| Recovery Service     | Phục hồi state                | UC-16         |
| Logging Service      | Log runtime                   | UC-17         |

---

# 3. Data Model

## 3.1 runtime_events

```sql
id (PK, uuid)
event_type (varchar)
external_unit_id (varchar)
payload (jsonb)
occurred_at (timestamp)
processed_at (timestamp)
status (enum: SUCCESS, FAILED, IGNORED)
error_message (text)
```

---

## 3.2 runtime_units_state

```sql
id (PK)
unit_id (FK -> tsd_units.id)
state (enum: IDLE, REQUEST, SPEAKING, OFFLINE)
last_event_at (timestamp)
```

---

## 3.3 speaking_requests

```sql
id (PK)
unit_id (FK)
status (enum: PENDING, APPROVED, REJECTED, CANCELLED)
created_at
updated_at
handled_by (FK -> users.id)
```

Constraints:

* unique (unit_id, status=PENDING)

---

## 3.4 runtime_room_state

```sql
room_id (PK)
operation_mode (MANUAL, AUTOMATIC)
active_speakers (jsonb)
pending_requests (jsonb)
current_camera_target (jsonb)
sse_status (CONNECTED, RECONNECTING, DISCONNECTED)
updated_at
```

---

## 3.5 runtime_camera_logs

```sql
id
unit_id
camera_id
preset_id
triggered_at
result (SUCCESS, FAILED, SKIPPED)
reason
```

---

# 4. API Design

## 4.1 Get Runtime Snapshot

### GET /api/v1/runtime/snapshot

#### Response

```json
{
  "success": true,
  "data": {
    "operationMode": "MANUAL",
    "sseStatus": "CONNECTED",
    "activeSpeakers": ["unit-01"],
    "pendingRequests": ["req-01"],
    "currentCameraTarget": {
      "unitId": "unit-01",
      "cameraId": "cam-01",
      "presetId": "preset-01"
    }
  }
}
```

---

## 4.2 Get Speaking Requests

### GET /api/v1/runtime/requests

---

## 4.3 Approve Request

### POST /api/v1/runtime/requests/{id}/approve

#### Response

```json
{
  "success": true
}
```

---

## 4.4 Reject Request

### POST /api/v1/runtime/requests/{id}/reject

---

## 4.5 Runtime Control (Internal)

```http
POST /internal/runtime/start
POST /internal/runtime/stop
```

---

# 5. Business Logic (Service Layer)

## 5.1 SSE Listener Service

### Flow

1. Load TS-D config
2. Open connection `/api/event`
3. Listen stream
4. For each event -> call EventProcessor
5. On disconnect -> trigger reconnect

---

## 5.2 Event Processor

### Flow

1. Receive raw event
2. Parse:
   * event type
   * payload
   * unit id
3. Validate
4. Save runtime_events
5. Route:

| Event              | Handler         |
| ------------------ | --------------- |
| request-talkreq    | Request Manager |
| response-unitstart | Speaker Handler |
| system             | System Handler  |

---

## 5.3 Request Manager

### Create Request

1. Validate mode = MANUAL
2. Check no existing pending
3. Insert speaking_requests (PENDING)
4. Update unit state = REQUEST

### Approve Request

1. Validate request = PENDING
2. Validate role permission
3. Send command to TS-D
4. Update request = APPROVED
5. Wait for SPEAKING event

### Reject Request

1. Validate request = PENDING
2. Update request = REJECTED
3. Update unit state = IDLE

---

## 5.4 Speaker Handler

### On SPEAKING event

1. Update unit state = SPEAKING
2. Close request if exists
3. Trigger camera
4. Update runtime snapshot

### On STOP event

1. Update state = IDLE
2. Remove from active speakers

---

## 5.5 Auto Mode Handler

1. Skip request logic
2. Direct SPEAKING -> camera trigger

---

## 5.6 Camera Engine

### Flow

1. Find mapping by unit
2. Validate camera active
3. Validate preset
4. Check anti-jitter
5. Send PTZ command
6. Log result

---

## 5.7 Anti-Jitter Logic

```text
if now - last_switch < threshold:
    skip
else:
    trigger camera
```

---

## 5.8 UI Broadcaster

1. Runtime snapshot updated
2. Emit event (websocket/internal)
3. UI refresh

---

## 5.9 Recovery Service

1. After reconnect:
2. Call TS-D REST:
   * current speaking units
3. Rebuild:
   * runtime_units_state
   * active speakers
4. Update snapshot

---

# 6. State Transitions

## 6.1 Unit State

```text
IDLE -> REQUEST -> SPEAKING -> IDLE
IDLE -> SPEAKING -> IDLE
REQUEST -> IDLE
```

Invalid:

* SPEAKING -> REQUEST
* REQUEST -> APPROVED (unit level)

---

## 6.2 Request State

```text
PENDING -> APPROVED
PENDING -> REJECTED
PENDING -> CANCELLED
```

---

## 6.3 SSE State

```text
CONNECTED -> RECONNECTING -> CONNECTED
CONNECTED -> DISCONNECTED
```

---

# 7. Validation Rules

## Field-level

* event_type required
* occurred_at required
* requestId required (approve/reject)

## Cross-field

* preset must belong to camera
* unit must exist
* request must belong to room

## Business

* only 1 pending request per unit
* only approve in MANUAL mode
* camera must be active
* mapping must exist

---

# 8. Authorization Rules

| API             | Admin | Operator |
| --------------- | ----- | -------- |
| View snapshot   | Y     | Y        |
| View requests   | Y     | Y        |
| Approve request | Y     | Y        |
| Reject request  | Y     | Y        |
| Start runtime   | Y     | N        |
| Stop runtime    | Y     | N        |

---

# 9. Background Jobs / Automation

## 9.1 SSE Reconnect

* retry with backoff (2s -> 10s)
* infinite retry

## 9.2 Recovery Job

* trigger after reconnect
* rebuild runtime state

---

# 10. Logging & Audit

## Must log

* SSE connect/disconnect
* reconnect attempts
* event processing result
* request created/approved/rejected
* camera trigger

## Audit log

* operator actions (approve/reject)

---

# 11. Error Handling

## Error Types

* VALIDATION_ERROR
* BUSINESS_ERROR
* INTEGRATION_ERROR
* SYSTEM_ERROR

## HTTP Mapping

| Code | Meaning       |
| ---- | ------------- |
| 400  | Validation    |
| 401  | Unauthorized  |
| 403  | Forbidden     |
| 404  | Not found     |
| 422  | Business rule |
| 500  | System        |
| 502  | TS-D error    |

## Error Response

```json
{
  "success": false,
  "error": {
    "code": "REQUEST_NOT_PENDING",
    "message": "Request is not in pending state"
  }
}
```

---

# 12. Final Summary

Thiết kế này đảm bảo:

* mapping 1-1 từ UC -> API -> logic
* xử lý đầy đủ: realtime SSE, manual/auto mode, request flow, camera trigger, map/UI update, reconnect & recovery
* phù hợp MVP 1 phòng
* đủ chi tiết để dev backend implement

