# Detail Design Document – Live Monitoring Module

## 1. Overview

### Purpose

Module **Live Monitoring** cho phép Admin/Operator giám sát realtime:

* operation mode
* SSE/runtime connection
* active speaker
* pending request
* unit state trên map
* camera target
* camera trigger result
* runtime event feed
* alert/warning
* recovery action cho Admin

### Scope

Bao gồm:

* live dashboard
* realtime map monitoring
* speaker monitoring
* camera monitoring
* event feed
* alert monitoring
* runtime connection status
* admin recovery

Không bao gồm:

* cấu hình TS-D1000/camera
* xử lý runtime event gốc
* điều khiển approve/reject chi tiết
* camera adapter implementation

### Roles

| Role     | Permission                                       |
| -------- | ------------------------------------------------ |
| Admin    | View monitoring, acknowledge alert, run recovery |
| Operator | View monitoring, acknowledge alert               |

---

## 2. Module Breakdown

| Module                  | Responsibility                                 | Related UC         |
| ----------------------- | ---------------------------------------------- | ------------------ |
| Live Dashboard          | tổng quan runtime state                        | UC-LIVE-01, 02     |
| Realtime Map Monitoring | hiển thị trạng thái unit/camera trên layout    | UC-LIVE-03, 04     |
| Speaker Monitoring      | active speakers, pending requests, unit detail | UC-LIVE-05, 06, 07 |
| Camera Monitoring       | camera status, target, trigger result          | UC-LIVE-08, 09, 10 |
| Event Feed              | runtime event list/filter                      | UC-LIVE-11, 12     |
| Alert Monitoring        | warning/error/acknowledge                      | UC-LIVE-13, 14     |
| Runtime Connection      | SSE/runtime status                             | UC-LIVE-15, 16     |
| Recovery                | admin recovery/reconnect                       | UC-LIVE-17         |

---

## 3. Data Model

### 3.1 Enums

```text
RuntimeConnectionStatus
- CONNECTED
- RECONNECTING
- DISCONNECTED
- UNAVAILABLE

UnitRuntimeState
- IDLE
- REQUEST
- SPEAKING
- OFFLINE

CameraRuntimeResult
- SUCCESS
- FAILED
- SKIPPED

AlertSeverity
- INFO
- WARNING
- ERROR
- CRITICAL

AlertStatus
- ACTIVE
- ACKNOWLEDGED
- RESOLVED

RuntimeEventResult
- SUCCESS
- FAILED
- SKIPPED
- IGNORED
```

---

### 3.2 `runtime_room_state`

| Field                      | Type        | Required | Constraints                    |
| -------------------------- | ----------- | -------: | ------------------------------ |
| room_id                    | uuid        |        Y | PK, FK `rooms.id`              |
| operation_mode             | varchar(20) |        Y | MANUAL/AUTOMATIC snapshot      |
| sse_status                 | varchar(30) |        Y | enum `RuntimeConnectionStatus` |
| active_speakers_json       | json/text   |        N | array of unit ids              |
| pending_requests_json      | json/text   |        N | array of request ids           |
| current_camera_target_json | json/text   |        N | camera target object           |
| last_event_at              | datetime    |        N |                                |
| updated_at                 | datetime    |        Y |                                |

**Business Rules**

* Đây là snapshot chính cho live dashboard.
* Có thể rebuild từ runtime event/state tables.

---

### 3.3 `runtime_units_state`

| Field           | Type         | Required | Constraints             |
| --------------- | ------------ | -------: | ----------------------- |
| id              | uuid         |        Y | PK                      |
| room_id         | uuid         |        Y | FK `rooms.id`           |
| unit_id         | uuid         |        Y | FK `tsd_units.id`       |
| state           | varchar(20)  |        Y | enum `UnitRuntimeState` |
| last_event_type | varchar(100) |        N |                         |
| last_event_at   | datetime     |        N |                         |
| updated_at      | datetime     |        Y |                         |

**Indexes**

* unique `(room_id, unit_id)`
* index `(room_id, state)`

---

### 3.4 `runtime_camera_state`

| Field                  | Type         | Required | Constraints                |
| ---------------------- | ------------ | -------: | -------------------------- |
| camera_id              | uuid         |        Y | PK, FK `cameras.id`        |
| room_id                | uuid         |        Y | FK `rooms.id`              |
| current_target_unit_id | uuid         |        N | FK `tsd_units.id`          |
| current_preset_id      | uuid         |        N | FK `camera_presets.id`     |
| last_switch_at         | datetime     |        N |                            |
| last_result            | varchar(20)  |        N | enum `CameraRuntimeResult` |
| last_reason            | varchar(500) |        N |                            |
| updated_at             | datetime     |        Y |                            |

---

### 3.5 `runtime_events`

| Field            | Type         | Required | Constraints               |
| ---------------- | ------------ | -------: | ------------------------- |
| id               | uuid         |        Y | PK                        |
| room_id          | uuid         |        Y | FK `rooms.id`             |
| event_type       | varchar(100) |        Y |                           |
| unit_id          | uuid         |        N | FK `tsd_units.id`         |
| external_unit_id | varchar(100) |        N |                           |
| result           | varchar(20)  |        Y | enum `RuntimeEventResult` |
| message          | varchar(500) |        N |                           |
| payload_json     | json/text    |        N |                           |
| occurred_at      | datetime    |        Y |                           |
| processed_at     | datetime     |        N |                           |

**Indexes**

* index `(room_id, occurred_at desc)`
* index `(room_id, event_type)`
* index `(room_id, result)`

---

### 3.6 `runtime_alerts`

| Field           | Type         | Required | Constraints                                       |
| --------------- | ------------ | -------: | ------------------------------------------------- |
| id              | uuid         |        Y | PK                                                |
| room_id         | uuid         |        Y | FK `rooms.id`                                     |
| source          | varchar(50)  |        Y | `SSE`, `CAMERA`, `MAPPING`, `RUNTIME`, `TS_D1000` |
| severity        | varchar(20)  |        Y | enum `AlertSeverity`                              |
| status          | varchar(20)  |        Y | enum `AlertStatus`, default ACTIVE                |
| message         | varchar(500) |        Y |                                                   |
| detail_json     | json/text    |        N |                                                   |
| acknowledged_by | uuid         |        N | FK `users.id`                                     |
| acknowledged_at | datetime     |        N |                                                   |
| resolved_at     | datetime     |        N |                                                   |
| created_at      | datetime     |        Y |                                                   |
| updated_at      | datetime     |        Y |                                                   |

**Indexes**

* index `(room_id, status, severity)`
* index `(room_id, created_at desc)`

---

### 3.7 `runtime_recovery_logs`

| Field         | Type         | Required | Constraints                                      |
| ------------- | ------------ | -------: | ------------------------------------------------ |
| id            | uuid         |        Y | PK                                               |
| room_id       | uuid         |        Y | FK `rooms.id`                                    |
| actor_user_id | uuid         |        Y | FK `users.id`                                    |
| action        | varchar(50)  |        Y | `RECONNECT`, `RECOVER_STATE`, `REFRESH_SNAPSHOT` |
| result        | varchar(20)  |        Y | SUCCESS/FAILED                                   |
| message       | varchar(500) |        N |                                                  |
| created_at    | datetime     |        Y |                                                  |

---

## 4. API Design

### 4.1 Response Convention

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "error": {
    "code": "RUNTIME_UNAVAILABLE",
    "message": "Runtime state is not available",
    "details": []
  }
}
```

---

### 4.2 Live Dashboard APIs

#### GET `/api/v1/live/dashboard`

**UC:** UC-LIVE-01
**Permission:** Admin, Operator

**Response**

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

---

#### GET `/api/v1/live/snapshot`

**UC:** UC-LIVE-02
**Permission:** Admin, Operator

**Response**

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

---

### 4.3 Realtime Map APIs

#### GET `/api/v1/live/map`

**UC:** UC-LIVE-03, UC-LIVE-04
**Permission:** Admin, Operator

**Response**

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

---

### 4.4 Speaker Monitoring APIs

#### GET `/api/v1/live/speakers/active`

**UC:** UC-LIVE-05
**Permission:** Admin, Operator

#### GET `/api/v1/live/requests/summary`

**UC:** UC-LIVE-06
**Permission:** Admin, Operator

#### GET `/api/v1/live/units/{unitId}`

**UC:** UC-LIVE-07
**Permission:** Admin, Operator

**Response**

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

---

### 4.5 Camera Monitoring APIs

#### GET `/api/v1/live/cameras/status`

**UC:** UC-LIVE-08
**Permission:** Admin, Operator

#### GET `/api/v1/live/cameras/target`

**UC:** UC-LIVE-09
**Permission:** Admin, Operator

#### GET `/api/v1/live/cameras/triggers`

**UC:** UC-LIVE-10
**Permission:** Admin, Operator

Query:

* `cameraId`
* `limit`
* `result`

---

### 4.6 Event Feed APIs

#### GET `/api/v1/live/events`

**UC:** UC-LIVE-11, UC-LIVE-12
**Permission:** Admin, Operator

Query:

* `eventType`
* `unitId`
* `result`
* `from`
* `to`
* `limit`
* `page`

**Response**

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
      "limit": 50,
      "total": 120
    }
  }
}
```

---

### 4.7 Alert APIs

#### GET `/api/v1/live/alerts`

**UC:** UC-LIVE-13
**Permission:** Admin, Operator

Query:

* `status=ACTIVE`
* `severity`
* `source`

#### POST `/api/v1/live/alerts/{id}/acknowledge`

**UC:** UC-LIVE-14
**Permission:** Admin, Operator

**Response**

```json
{
  "success": true,
  "data": {
    "alertId": "alert-01",
    "status": "ACKNOWLEDGED"
  }
}
```

---

### 4.8 Runtime Connection APIs

#### GET `/api/v1/live/runtime/status`

**UC:** UC-LIVE-15, UC-LIVE-16
**Permission:** Admin, Operator

**Response**

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

---

### 4.9 Recovery API

#### POST `/api/v1/live/runtime/recovery`

**UC:** UC-LIVE-17
**Permission:** Admin

**Request**

```json
{
  "action": "RECONNECT"
}
```

Allowed actions:

* `RECONNECT`
* `RECOVER_STATE`
* `REFRESH_SNAPSHOT`

---

## 5. Business Logic

### 5.1 UC-LIVE-01 View Live Monitoring Dashboard

#### Service

`LiveDashboardService.getDashboard(roomId, actor)`

#### Logic

1. Validate actor role is Admin or Operator.
2. Load `runtime_room_state`.
3. Count active speakers from `runtime_units_state`.
4. Count pending requests from `speaking_requests`.
5. Load current camera target.
6. Load active alerts.
7. Return dashboard DTO.

#### Edge Cases

* Runtime state missing → return partial dashboard with `runtimeAvailable=false`.
* No alerts → return empty array.

---

### 5.2 UC-LIVE-02 Refresh Live Runtime Snapshot

#### Service

`LiveSnapshotService.getSnapshot(roomId, actor)`

#### Logic

1. Validate permission.
2. Load room runtime state.
3. Load unit runtime states.
4. Load camera runtime states.
5. Return full snapshot.

#### Side Effects

* None. Read-only.

---

### 5.3 UC-LIVE-03 View Realtime Map State

#### Service

`LiveMapService.getMapState(roomId, actor)`

#### Logic

1. Validate permission.
2. Load active layout.
3. Load layout devices.
4. Join unit runtime states and camera statuses.
5. Return map DTO.

#### Edge Cases

* No layout → return `layout=null`, devices empty, message `LAYOUT_NOT_CONFIGURED`.
* Device position missing → device still appears in unit list but not on map.

---

### 5.4 UC-LIVE-04 Highlight Unit Runtime State on Map

#### Service

`LiveMapHighlightService.resolveDeviceState(roomId)`

#### Logic

1. Load all layout device records.
2. For each TSD unit, join runtime state.
3. Map state to UI state:

   * IDLE → neutral
   * REQUEST → pending highlight
   * SPEAKING → active highlight
   * OFFLINE → offline highlight
4. Return normalized map state.

---

### 5.5 UC-LIVE-05 View Active Speaker List

#### Service

`LiveSpeakerService.getActiveSpeakers(roomId, actor)`

#### Logic

1. Validate permission.
2. Query runtime unit states where `state=SPEAKING`.
3. Join `tsd_units`.
4. Join active mapping if available.
5. Return active speaker list.

---

### 5.6 UC-LIVE-06 View Pending Request Queue Summary

#### Service

`LiveRequestSummaryService.getPendingSummary(roomId, actor)`

#### Logic

1. Validate permission.
2. Load current operation mode.
3. If mode is AUTOMATIC:

   * return `queueUsed=false`
4. If mode is MANUAL:

   * query pending speaking requests
   * return count + summary list.

---

### 5.7 UC-LIVE-07 View Unit Runtime Detail

#### Service

`LiveUnitDetailService.getDetail(unitId, actor)`

#### Logic

1. Validate permission.
2. Load unit.
3. Load runtime state.
4. Load active mapping.
5. Load mapped camera/preset.
6. Return unit detail DTO.

#### Edge Cases

* No mapping → return `mapping=null` and warning code.

---

### 5.8 UC-LIVE-08 View Camera Runtime Status

#### Service

`LiveCameraStatusService.list(roomId, actor)`

#### Logic

1. Validate permission.
2. Load cameras.
3. Join `runtime_camera_state`.
4. Return status list.

---

### 5.9 UC-LIVE-09 View Current Camera Target

#### Service

`LiveCameraTargetService.getCurrentTarget(roomId, actor)`

#### Logic

1. Validate permission.
2. Load current camera target from `runtime_room_state` or `runtime_camera_state`.
3. Join camera/unit/preset metadata.
4. Return target DTO.

---

### 5.10 UC-LIVE-10 View Camera Trigger Result

#### Service

`LiveCameraTriggerService.getRecentResults(roomId, filters, actor)`

#### Logic

1. Validate permission.
2. Query `runtime_camera_logs`.
3. Apply filters.
4. Return paginated result.

---

### 5.11 UC-LIVE-11 View Live Event Feed

#### Service

`LiveEventFeedService.list(roomId, filters, actor)`

#### Logic

1. Validate permission.
2. Query `runtime_events`.
3. Sort by `occurred_at desc`.
4. Return paginated list.

---

### 5.12 UC-LIVE-12 Filter Live Event Feed

#### Service

Same as `LiveEventFeedService.list`

#### Logic

1. Validate filter values.
2. Apply query filters:

   * event type
   * unit
   * result
   * date range
3. Return filtered list.

---

### 5.13 UC-LIVE-13 View Runtime Alerts

#### Service

`LiveAlertService.list(roomId, filters, actor)`

#### Logic

1. Validate permission.
2. Query alerts by room.
3. Apply status/severity/source filters.
4. Return alerts.

---

### 5.14 UC-LIVE-14 Acknowledge Runtime Alert

#### Service

`LiveAlertService.acknowledge(alertId, actor)`

#### Logic

1. Validate actor is Admin or Operator.
2. Load alert.
3. If already acknowledged, return current state.
4. Set:

   * status = ACKNOWLEDGED
   * acknowledged_by = actor.id
   * acknowledged_at = now
5. Write audit log.
6. Return updated alert.

#### Important

* Acknowledge does not resolve root cause.

---

### 5.15 UC-LIVE-15 View SSE / Runtime Connection Status

#### Service

`LiveRuntimeStatusService.getStatus(roomId, actor)`

#### Logic

1. Validate permission.
2. Load runtime connection fields from runtime service/state.
3. Determine if data is stale:

   * current time - last_event_at > configured threshold
4. Return connection status.

---

### 5.16 UC-LIVE-16 Handle Runtime Disconnected State

#### Service

`LiveRuntimeStatusService.buildDisconnectedState(roomId)`

#### Logic

1. Detect status `RECONNECTING` or `DISCONNECTED`.
2. Mark `isDataStale=true` when threshold exceeded.
3. Create or update runtime alert if needed.
4. Return degraded monitoring state.

---

### 5.17 UC-LIVE-17 Run Runtime Recovery Action

#### Service

`RuntimeRecoveryService.run(roomId, action, actor)`

#### Logic

1. Validate actor = Admin.
2. Validate recovery action enum.
3. Execute action:

   * RECONNECT: restart/reconnect SSE consumer.
   * RECOVER_STATE: reload current TS-D state and rebuild snapshot.
   * REFRESH_SNAPSHOT: rebuild snapshot from DB/runtime memory.
4. Write recovery log.
5. Return result.

#### Edge Cases

* TS-D not reachable → FAILED recovery log.
* Runtime already connected → action may be no-op success.

---

## 6. Validation Rules

### Field-Level

* `alertId` required for acknowledge.
* `action` required for recovery.
* `action` must be one of `RECONNECT`, `RECOVER_STATE`, `REFRESH_SNAPSHOT`.
* Event feed filter enums must be valid.

### Cross-Field

* Unit must belong to current room.
* Camera target unit/camera/preset must exist if referenced.
* Alert must belong to current room.
* Recovery action applies only to active room runtime.

### Business Validation

* Admin/Operator can view monitoring.
* Admin/Operator can acknowledge alerts.
* Only Admin can run recovery.
* Live monitoring APIs are read-only except acknowledge/recovery.
* Missing layout must not break dashboard.
* Camera failure must not break speaker monitoring.

### Date Rules

* `from <= to` for event feed filters.
* `acknowledged_at` set only when alert acknowledged.
* Recovery log `created_at` always set when action attempted.

---

## 7. State Transitions

### 7.1 Runtime Connection

```text
CONNECTED -> RECONNECTING -> CONNECTED
CONNECTED -> DISCONNECTED
DISCONNECTED -> RECONNECTING
```

### 7.2 Unit Runtime

```text
IDLE -> REQUEST -> SPEAKING -> IDLE
IDLE -> SPEAKING -> IDLE
ANY -> OFFLINE
OFFLINE -> IDLE
```

### 7.3 Runtime Alert

```text
ACTIVE -> ACKNOWLEDGED
ACTIVE -> RESOLVED
ACKNOWLEDGED -> RESOLVED
```

**Rules**

* Acknowledged does not mean resolved.
* Critical active alerts may remain visible after acknowledge.

---

## 8. Authorization Rules

| API / Capability       | Admin | Operator |
| ---------------------- | :---: | :------: |
| View live dashboard    |   Y   |     Y    |
| View snapshot          |   Y   |     Y    |
| View map               |   Y   |     Y    |
| View speakers          |   Y   |     Y    |
| View camera monitoring |   Y   |     Y    |
| View event feed        |   Y   |     Y    |
| Filter event feed      |   Y   |     Y    |
| View alerts            |   Y   |     Y    |
| Acknowledge alert      |   Y   |     Y    |
| View runtime status    |   Y   |     Y    |
| Run recovery           |   Y   |     N    |

---

## 9. Background Jobs / Automation

### 9.1 Runtime Snapshot Update

Triggered by Runtime Event Handling:

1. Event processed.
2. Runtime state updated.
3. Snapshot rebuilt/updated.
4. UI broadcaster emits update.

### 9.2 Runtime Alert Generation

Triggered by:

* SSE disconnected
* camera trigger failed
* missing mapping
* runtime recovery failed
* malformed event

### 9.3 Stale Data Detection

Recommended lightweight check:

* If `now - last_event_at > threshold`, mark `isDataStale=true`.

No mandatory cron is required unless system does not have runtime event broadcaster.

---

## 10. Logging & Audit

### 10.1 Audit Logs

Must audit:

* alert acknowledged
* recovery action run

Example:

```json
{
  "actorUserId": "user-uuid",
  "action": "ACKNOWLEDGE_RUNTIME_ALERT",
  "targetType": "RUNTIME_ALERT",
  "targetId": "alert-uuid",
  "result": "SUCCESS",
  "detailJson": {
    "roomId": "room-uuid",
    "source": "CAMERA",
    "severity": "WARNING"
  }
}
```

### 10.2 Runtime/System Logs

Must log:

* snapshot refresh failed
* live dashboard API failed
* event feed query error
* runtime disconnected
* recovery success/failure
* alert generation

---

## 11. Error Handling

### Error Types

* `VALIDATION_ERROR`
* `UNAUTHORIZED`
* `FORBIDDEN`
* `NOT_FOUND`
* `BUSINESS_RULE_ERROR`
* `RUNTIME_UNAVAILABLE`
* `SYSTEM_ERROR`

### HTTP Mapping

| HTTP | Case                        |
| ---- | --------------------------- |
| 400  | invalid filter/action       |
| 401  | not authenticated           |
| 403  | insufficient permission     |
| 404  | alert/unit/camera not found |
| 422  | invalid runtime state       |
| 503  | runtime unavailable         |
| 500  | unexpected error            |

### Example Errors

#### Runtime unavailable

```json
{
  "success": false,
  "error": {
    "code": "RUNTIME_UNAVAILABLE",
    "message": "Runtime monitoring data is currently unavailable",
    "details": []
  }
}
```

#### Recovery forbidden

```json
{
  "success": false,
  "error": {
    "code": "RECOVERY_ADMIN_ONLY",
    "message": "Only Admin can run runtime recovery",
    "details": []
  }
}
```

---

## 12. Traceability: UC → API → Service

| UC         | API                                  | Service                                           |
| ---------- | ------------------------------------ | ------------------------------------------------- |
| UC-LIVE-01 | `GET /live/dashboard`                | `LiveDashboardService.getDashboard`               |
| UC-LIVE-02 | `GET /live/snapshot`                 | `LiveSnapshotService.getSnapshot`                 |
| UC-LIVE-03 | `GET /live/map`                      | `LiveMapService.getMapState`                      |
| UC-LIVE-04 | `GET /live/map`                      | `LiveMapHighlightService.resolveDeviceState`      |
| UC-LIVE-05 | `GET /live/speakers/active`          | `LiveSpeakerService.getActiveSpeakers`            |
| UC-LIVE-06 | `GET /live/requests/summary`         | `LiveRequestSummaryService.getPendingSummary`     |
| UC-LIVE-07 | `GET /live/units/{unitId}`           | `LiveUnitDetailService.getDetail`                 |
| UC-LIVE-08 | `GET /live/cameras/status`           | `LiveCameraStatusService.list`                    |
| UC-LIVE-09 | `GET /live/cameras/target`           | `LiveCameraTargetService.getCurrentTarget`        |
| UC-LIVE-10 | `GET /live/cameras/triggers`         | `LiveCameraTriggerService.getRecentResults`       |
| UC-LIVE-11 | `GET /live/events`                   | `LiveEventFeedService.list`                       |
| UC-LIVE-12 | `GET /live/events`                   | `LiveEventFeedService.list`                       |
| UC-LIVE-13 | `GET /live/alerts`                   | `LiveAlertService.list`                           |
| UC-LIVE-14 | `POST /live/alerts/{id}/acknowledge` | `LiveAlertService.acknowledge`                    |
| UC-LIVE-15 | `GET /live/runtime/status`           | `LiveRuntimeStatusService.getStatus`              |
| UC-LIVE-16 | `GET /live/runtime/status`           | `LiveRuntimeStatusService.buildDisconnectedState` |
| UC-LIVE-17 | `POST /live/runtime/recovery`        | `RuntimeRecoveryService.run`                      |

---

## 13. Suggested Backend Structure

```text
src/
  modules/
    live-monitoring/
      live-dashboard.controller.ts
      live-dashboard.service.ts

      live-snapshot.controller.ts
      live-snapshot.service.ts

      live-map.controller.ts
      live-map.service.ts
      live-map-highlight.service.ts

      live-speaker.controller.ts
      live-speaker.service.ts
      live-unit-detail.service.ts
      live-request-summary.service.ts

      live-camera.controller.ts
      live-camera-status.service.ts
      live-camera-target.service.ts
      live-camera-trigger.service.ts

      live-event-feed.controller.ts
      live-event-feed.service.ts

      live-alert.controller.ts
      live-alert.service.ts

      live-runtime-status.controller.ts
      live-runtime-status.service.ts
      runtime-recovery.service.ts
```

---

## 14. Final Summary

**Live Monitoring Detail Design** đã cover đầy đủ:

* dashboard realtime
* runtime snapshot
* map state/highlight
* speaker monitoring
* camera monitoring
* event feed/filtering
* alert/acknowledge
* SSE/runtime connection status
* admin recovery
* data model, API, service logic, validation, permission, logging, error handling

Module này là lớp **read/monitoring + limited action** nằm trên các module:

* Runtime Event Handling
* Manual/Automatic Behavior
* Camera Integration
* System Configuration
