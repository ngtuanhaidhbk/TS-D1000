# Detail Design Document – Manual / Automatic Behavior Module (Provided)

> Nguồn: user-provided DD (Requirement + Use Case). Tài liệu này được lưu lại để traceability.

## Alignment notes (repo hiện tại)

* Repo demo hiện tại dùng **mode source-of-truth** tại `PUT/GET /api/v1/config/mode` (System Configuration), và `GET /api/v1/runtime/snapshot` trả về `operationMode`.
* API `GET/PUT /api/v1/runtime/mode` và helper `GET /api/v1/runtime/mode/switch-impact` trong DD bên dưới **chưa được implement** trong demo backend hiện tại. Nếu bạn muốn chuẩn hoá theo DD này, mình sẽ cập nhật API contract + implement thêm các endpoint wrapper tương ứng.

---

# 1. Overview

## 1.1 Purpose

Module **Manual / Automatic Behavior** định nghĩa cách hệ thống xử lý luồng phát biểu và camera tracking theo 2 chế độ vận hành:

* **MANUAL**

  * khi chairman/delegate nhấn Talk, hệ thống tạo request chờ
  * Operator/Admin phải approve hoặc reject
  * camera chỉ trigger sau khi speaking thực sự được kích hoạt

* **AUTOMATIC**

  * không có request queue
  * khi có event speaking hợp lệ, hệ thống xử lý ngay
  * camera auto-tracking theo speaker active

## 1.2 Scope

Bao gồm:

* xem mode hiện tại
* đổi mode
* speaking request flow trong Manual
* auto speaking flow trong Automatic
* mode-based UI/runtime behavior
* safeguard khi đổi mode trong active session

Không bao gồm:

* Authentication
* System configuration CRUD
* SSE low-level listener internals
* Camera adapter protocol implementation chi tiết

## 1.3 Roles

* `ADMIN`
* `OPERATOR`

## 1.4 Related Use Cases

* UC-MODE-01: View Current Operation Mode
* UC-MODE-02: Change Operation Mode
* UC-MANUAL-01: Create Speaking Request in Manual Mode
* UC-MANUAL-02: View Pending Request Queue in Manual Mode
* UC-MANUAL-03: Approve Speaking Request in Manual Mode
* UC-MANUAL-04: Reject Speaking Request in Manual Mode
* UC-AUTO-01: Activate Speaker Automatically
* UC-AUTO-02: Handle Camera Auto-Tracking in Automatic Mode
* UC-BEHAVIOR-01: Show Mode-Specific Runtime UI
* UC-BEHAVIOR-02: Hide Invalid Actions by Mode
* UC-SWITCH-01: Warn Before Switching Mode During Active Session
* UC-SWITCH-02: Apply Runtime State After Mode Change

## 1.5 Assumptions

1. Mode là thuộc tính ở cấp **room**.
2. Mỗi room chỉ có **1 mode active** tại một thời điểm.
3. `PENDING request` chỉ tồn tại trong `MANUAL`.
4. `APPROVED` không tự đồng nghĩa với `SPEAKING`; cần event xác nhận thực tế từ TS-D1000.
5. Cả `ADMIN` và `OPERATOR` đều được approve/reject request trong Manual mode.
6. Chỉ `ADMIN` được đổi mode.
7. Camera trigger luôn dựa trên speaker active thực tế, không dựa trên request pending.

---

# 2. Module Breakdown

| Module                    | Responsibility                                 | Related UC                     |
| ------------------------- | ---------------------------------------------- | ------------------------------ |
| Operation Mode Service    | đọc/ghi mode hiện tại của room                 | UC-MODE-01, UC-MODE-02         |
| Manual Request Service    | tạo, xem, approve, reject request trong MANUAL | UC-MANUAL-01..04               |
| Automatic Speaker Service | xử lý speaking flow trực tiếp trong AUTOMATIC  | UC-AUTO-01, UC-AUTO-02         |
| Mode Behavior Service     | áp dụng UI/runtime behavior theo mode          | UC-BEHAVIOR-01, UC-BEHAVIOR-02 |
| Mode Switch Guard Service | cảnh báo và apply state khi đổi mode           | UC-SWITCH-01, UC-SWITCH-02     |

---

# 3. Data Model

## 3.1 Enums / Constants

```text
OperationMode
- MANUAL
- AUTOMATIC

UnitRuntimeState
- IDLE
- REQUEST
- SPEAKING
- OFFLINE

SpeakingRequestStatus
- PENDING
- APPROVED
- REJECTED
- CANCELLED
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

* Mỗi room chỉ có 1 `operation_mode` active.
* `operation_mode` là source of truth cho runtime behavior.

---

## 3.2.2 `runtime_units_state`

| Field         | Type        | Required | Constraints                        |
| ------------- | ----------- | -------: | ---------------------------------- |
| id            | uuid        |        Y | PK                                 |
| room_id       | uuid        |        Y | FK `rooms.id`                      |
| unit_id       | uuid        |        Y | FK `tsd_units.id`, unique per room |
| state         | varchar(20) |        Y | enum `UnitRuntimeState`            |
| last_event_at | datetime    |        N |                                    |
| updated_at    | datetime    |        Y |                                    |

**Indexes**

* unique `(room_id, unit_id)`
* index `(room_id, state)`

**Business rules**

* mỗi unit có 1 runtime state hiện tại
* unit state phải phù hợp với mode và event flow

---

## 3.2.3 `speaking_requests`

| Field      | Type        | Required | Constraints                  |
| ---------- | ----------- | -------: | ---------------------------- |
| id         | uuid        |        Y | PK                           |
| room_id    | uuid        |        Y | FK `rooms.id`                |
| unit_id    | uuid        |        Y | FK `tsd_units.id`            |
| status     | varchar(20) |        Y | enum `SpeakingRequestStatus` |
| created_at | datetime    |        Y |                              |
| updated_at | datetime    |        Y |                              |
| handled_by | uuid        |        N | FK `users.id`                |
| handled_at | datetime    |        N |                              |

**Indexes**

* index `(room_id, status, created_at desc)`
* unique partial `(room_id, unit_id)` where `status = 'PENDING'`

**Business rules**

* request chỉ được tạo trong `MANUAL`
* 1 unit chỉ có tối đa 1 request `PENDING`
* `APPROVED` là trạng thái request, không phải unit state

---

## 3.2.4 `runtime_room_state`

| Field                      | Type      | Required | Constraints          |
| -------------------------- | --------- | -------: | -------------------- |
| room_id                    | uuid      |        Y | PK, FK `rooms.id`    |
| active_speakers_json       | json/text |        N | array of unit ids    |
| pending_requests_json      | json/text |        N | array of request ids |
| current_camera_target_json | json/text |        N | current target info  |
| updated_at                 | datetime  |        Y |                      |

**Business rules**

* đây là snapshot runtime tổng hợp cho UI
* dữ liệu này có thể được rebuild từ source tables nếu cần

---

## 3.2.5 `audit_logs`

| Field         | Type         | Required | Constraints      |
| ------------- | ------------ | -------: | ---------------- |
| id            | uuid         |        Y | PK               |
| actor_user_id | uuid         |        N | FK `users.id`    |
| action        | varchar(50)  |        Y |                  |
| target_type   | varchar(50)  |        Y |                  |
| target_id     | varchar(100) |        N |                  |
| result        | varchar(20)  |        Y | SUCCESS / FAILED |
| detail_json   | json/text    |        N |                  |
| created_at    | datetime     |        Y |                  |

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
    "code": "REQUEST_NOT_PENDING",
    "message": "Request is not in pending state",
    "details": []
  }
}
```

---

## 4.2 Operation Mode APIs

### GET `/api/v1/runtime/mode`

**UC:** UC-MODE-01
**Permission:** `ADMIN`, `OPERATOR`

**Response**

```json
{
  "success": true,
  "data": {
    "roomId": "room-uuid",
    "mode": "MANUAL"
  }
}
```

---

### PUT `/api/v1/runtime/mode`

**UC:** UC-MODE-02
**Permission:** `ADMIN`

**Request**

```json
{
  "mode": "AUTOMATIC"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "roomId": "room-uuid",
    "mode": "AUTOMATIC"
  }
}
```

**Validation**

* `mode` phải là `MANUAL` hoặc `AUTOMATIC`

**Errors**

* 400: invalid mode
* 403: actor not admin

---

## 4.3 Manual Mode Request APIs

### GET `/api/v1/runtime/requests`

**UC:** UC-MANUAL-02
**Permission:** `ADMIN`, `OPERATOR`

**Query**

* `status=PENDING` mặc định

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": "req-01",
      "unitId": "unit-01",
      "unitName": "Delegate 01",
      "deviceType": "DELEGATE",
      "status": "PENDING",
      "createdAt": "2026-04-22T09:00:00Z"
    }
  ]
}
```

---

### POST `/api/v1/runtime/requests/{id}/approve`

**UC:** UC-MANUAL-03
**Permission:** `ADMIN`, `OPERATOR`

**Request**

```json
{}
```

**Response**

```json
{
  "success": true,
  "data": {
    "requestId": "req-01",
    "status": "APPROVED"
  }
}
```

**Business note**

* request được đánh dấu approved ở lớp request
* unit state `SPEAKING` chỉ được set khi event speaking thực tế đến

---

### POST `/api/v1/runtime/requests/{id}/reject`

**UC:** UC-MANUAL-04
**Permission:** `ADMIN`, `OPERATOR`

**Request**

```json
{}
```

**Response**

```json
{
  "success": true,
  "data": {
    "requestId": "req-01",
    "status": "REJECTED"
  }
}
```

---

## 4.4 Runtime Snapshot APIs

### GET `/api/v1/runtime/snapshot`

**Supports:** UC-BEHAVIOR-01, UC-SWITCH-02
**Permission:** `ADMIN`, `OPERATOR`

**Response**

```json
{
  "success": true,
  "data": {
    "roomId": "room-uuid",
    "operationMode": "MANUAL",
    "activeSpeakers": ["unit-01"],
    "pendingRequests": ["req-02", "req-03"],
    "currentCameraTarget": {
      "unitId": "unit-01",
      "cameraId": "cam-01",
      "presetId": "preset-01"
    }
  }
}
```

---

## 4.5 Mode Switch Warning API (Optional helper)

### GET `/api/v1/runtime/mode/switch-impact`

**Supports:** UC-SWITCH-01
**Permission:** `ADMIN`

**Response**

```json
{
  "success": true,
  "data": {
    "hasActiveSpeakers": true,
    "hasPendingRequests": true,
    "warningMessage": "Switching mode may affect current speaking session"
  }
}
```

---

# 5. Business Logic (Service Layer)

## 5.1 UC-MODE-01 View Current Operation Mode

### Service

`RuntimeModeQueryService.getCurrentMode(roomId, actor)`

### Logic

1. Validate actor authenticated
2. Validate actor role in `ADMIN`, `OPERATOR`
3. Load `rooms.operation_mode`
4. Return current mode

### Edge cases

* room not found → 404
* mode null/unexpected → system error

---

## 5.2 UC-MODE-02 Change Operation Mode

### Service

`RuntimeModeService.changeMode(roomId, mode, actor)`

### Logic

1. Validate actor = `ADMIN`
2. Validate mode enum
3. Load room
4. If new mode = current mode:
   * return success/no-op
5. Update `rooms.operation_mode`
6. Publish runtime state refresh event
7. Write audit log
8. Return updated mode

### Side effects

* runtime UI must reload mode-specific behavior
* subsequent events follow new mode

---

## 5.3 UC-MANUAL-01 Create Speaking Request in Manual Mode

`ManualRequestService.createFromRuntimeEvent(roomId, unitId)`

1. Load room mode
2. If mode != `MANUAL`, stop and do not create request
3. Validate unit exists
4. Check existing pending request for unit
5. If already exists: ignore duplicate
6. Insert `speaking_requests` with `PENDING`
7. Update `runtime_units_state.state = REQUEST`
8. Refresh `runtime_room_state.pending_requests`
9. Broadcast runtime update

---

## 5.4 UC-MANUAL-02 View Pending Request Queue

`ManualRequestQueryService.listPending(roomId, actor)`

1. Validate actor role
2. Load room mode
3. If mode != `MANUAL`, return empty list or mode-specific response
4. Query `speaking_requests` where `status = PENDING`
5. Join unit metadata
6. Return queue

---

## 5.5 UC-MANUAL-03 Approve Speaking Request

`ManualRequestService.approve(requestId, actor)`

1. Validate actor in `ADMIN`, `OPERATOR`
2. Load request
3. Validate room mode = `MANUAL`
4. Validate request status = `PENDING`
5. Send approve command to TS-D1000
6. Update request `status = APPROVED`
7. Set `handled_by`, `handled_at`
8. Write audit log
9. Wait for actual speaking event to move unit state to `SPEAKING`

---

## 5.6 UC-MANUAL-04 Reject Speaking Request

`ManualRequestService.reject(requestId, actor)`

1. Validate actor in `ADMIN`, `OPERATOR`
2. Load request
3. Validate room mode = `MANUAL`
4. Validate request status = `PENDING`
5. Send reject command to TS-D1000 if required
6. Update request `status = REJECTED`
7. Set `handled_by`, `handled_at`
8. Update unit runtime state back to `IDLE`
9. Refresh runtime snapshot
10. Write audit log

---

## 5.7 UC-AUTO-01 Activate Speaker Automatically

`AutomaticSpeakerService.handleSpeakingEvent(roomId, unitId)`

1. Load room mode
2. If mode != `AUTOMATIC`, do not use this flow
3. Validate unit exists
4. Update unit state = `SPEAKING`
5. Add unit to active speaker list
6. Refresh runtime snapshot
7. Trigger camera flow
8. Broadcast runtime update

---

## 5.8 UC-AUTO-02 Handle Camera Auto-Tracking in Automatic Mode

`AutomaticCameraService.triggerByActiveSpeaker(roomId, unitId)`

1. Validate room mode = `AUTOMATIC`
2. Load active mapping by unit
3. Validate mapping exists
4. Validate camera active
5. Validate preset belongs to camera
6. Apply anti-jitter check
7. If allowed: send camera preset command + update current target in snapshot
8. Broadcast update

---

# 6. State & Status Transitions

## 6.1 Operation Mode

```text
MANUAL <-> AUTOMATIC
```

## 6.2 Unit Runtime State

```text
IDLE -> REQUEST -> SPEAKING -> IDLE
IDLE -> SPEAKING -> IDLE
REQUEST -> IDLE
```

## 6.3 Speaking Request Status

```text
PENDING -> APPROVED
PENDING -> REJECTED
PENDING -> CANCELLED
```

---

# 7. Validation Rules

* Change Mode: `mode` required, enum
* Approve/Reject: requestId required, request must exist
* Business: only admin change mode; only pending can approve/reject; queue only in manual; approve/reject not allowed in automatic; camera trigger only on speaking

---

# 8. Authorization Rules

| Capability            | ADMIN | OPERATOR |
| --------------------- | :---: | :------: |
| View current mode     |   Y   |     Y    |
| Change mode           |   Y   |     N    |
| View request queue    |   Y   |     Y    |
| Approve request       |   Y   |     Y    |
| Reject request        |   Y   |     Y    |
| View runtime snapshot |   Y   |     Y    |
| Get switch impact     |   Y   |     N    |

