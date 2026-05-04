# Unit Test Input Specification – Live Monitoring Module

## Test Scope Summary

This document defines unit test inputs for the Live Monitoring module of the TS-D1000 + Camera PTZ system.
It covers backend service logic, API contract behavior, permission and state transition rules, and frontend UI conditions for:

* Live Dashboard
* Realtime Map
* Speaker Monitoring
* Camera Monitoring
* Event Feed
* Alert Monitoring
* Runtime Connection
* Admin Recovery

### Scope Includes

* validation of endpoint payloads and responses
* business rules for runtime snapshot, alert acknowledgement, recovery action
* permission enforcement for Admin / Operator
* state transition validation for runtime connection, alerts, unit runtime
* UI state behavior for loading, empty, error, success

### Scope Excludes

* TS-D1000 configuration flows
* camera adapter implementation
* manual approve/reject request command details

---

## Modules / Features to Test

| Module | Feature | Related Documents |
| --- | --- | --- |
| Live Dashboard | `GET /live/dashboard` | Use Cases Live Monitoring, Detail Design Live Monitoring, API contract Live Monitoring, UI/UX Live Monitoring |
| Runtime Snapshot | `GET /live/snapshot` | same |
| Realtime Map | `GET /live/map` | same |
| Speaker Monitoring | `GET /live/speakers/active`, `GET /live/requests/summary`, `GET /live/units/{unitId}` | same |
| Camera Monitoring | `GET /live/cameras/status`, `GET /live/cameras/target`, `GET /live/cameras/triggers` | same |
| Event Feed | `GET /live/events` | same |
| Alert Monitoring | `GET /live/alerts`, `POST /live/alerts/{id}/acknowledge` | same |
| Runtime Status | `GET /live/runtime/status` | same |
| Admin Recovery | `POST /live/runtime/recovery` | same |

---

## Requirement-to-Test Mapping

| Requirement / UC | Test Focus |
| --- | --- |
| UC-LIVE-01 | Dashboard fields, runtime availability, active alerts, UI summary cards |
| UC-LIVE-02 | Snapshot data refresh, map/speaker/camera/alert data coherence |
| UC-LIVE-03 | Map layout load, device position, runtime state mapping |
| UC-LIVE-04 | Unit runtime highlight mapping by state |
| UC-LIVE-05 | Active speaker list correct filtering and mapping |
| UC-LIVE-06 | Pending request summary only in MANUAL mode |
| UC-LIVE-07 | Unit runtime detail fetch and missing mapping warning |
| UC-LIVE-08 | Camera status listing, inactive/offline display |
| UC-LIVE-09 | Current camera target display and missing target handling |
| UC-LIVE-10 | Camera trigger result display, result + reason semantics |
| UC-LIVE-11 | Event feed retrieval and real-time list semantics |
| UC-LIVE-12 | Event feed filters and empty state |
| UC-LIVE-13 | Runtime alerts retrieval and severity display |
| UC-LIVE-14 | Alert acknowledgement behavior and permission |
| UC-LIVE-15 | Runtime connection status retrieval and stale flag |
| UC-LIVE-16 | Disconnected/reconnecting degraded UI behavior |
| UC-LIVE-17 | Recovery action permission, action enum, audit log side effect |

---

## Backend Unit Test Input Matrix

### Service / API Level Coverage

| Test Case ID | Feature | Related API | Objective | Preconditions | Input | Mock Dependencies | Expected Result | Error Expected |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LM-BE-001 | Dashboard data | `GET /live/dashboard` | Return dashboard summary and active alerts | valid authenticated Admin | none | runtime_room_state, runtime_units_state, runtime_alerts | success response with operationMode, sseStatus, activeSpeakerCount, pendingRequestCount, currentCameraTarget, activeAlerts | none |
| LM-BE-002 | Dashboard missing runtime | `GET /live/dashboard` | Handle no runtime snapshot gracefully | valid authenticated Operator, no runtime_room_state | none | null runtime_room_state | success response with `runtimeAvailable=false` or partial data and no crash | none |
| LM-BE-003 | Snapshot data | `GET /live/snapshot` | Return full snapshot payload | valid authenticated user | none | runtime_room_state, runtime_units_state, runtime_camera_state | success response with roomState, units, cameras | none |
| LM-BE-004 | Snapshot missing runtime | `GET /live/snapshot` | Return runtime unavailable error or partial snapshot | valid authenticated user | none | missing runtime_room_state | 503 `RUNTIME_UNAVAILABLE` or defined partial response | yes |
| LM-BE-005 | Map load | `GET /live/map` | Return layout and devices for map | valid authenticated user, layout configured | none | layout records, layout_device positions, runtime state | success response with layout and devices | none |
| LM-BE-006 | Map no layout | `GET /live/map` | Return empty map state when layout absent | valid authenticated user, no layout | none | no layout | success response with `layout: null`, `devices: []` | none |
| LM-BE-007 | Active speakers | `GET /live/speakers/active` | Return only speaking units | valid authenticated user | none | runtime_units_state with mixed states | success response includes only SPEAKING units | none |
| LM-BE-008 | Pending summary manual | `GET /live/requests/summary` | Show queue in MANUAL mode | valid authenticated user; op mode MANUAL | none | runtime_room_state.operation_mode=MANUAL, pending speaking requests | success response with queueUsed=true, pendingRequestCount+requests list | none |
| LM-BE-009 | Pending summary automatic | `GET /live/requests/summary` | Show queue not used in AUTOMATIC mode | valid authenticated user; op mode AUTOMATIC | none | runtime_room_state.operation_mode=AUTOMATIC | success response with queueUsed=false and empty requests | none |
| LM-BE-010 | Unit detail | `GET /live/units/{unitId}` | Return unit runtime details and mapping | valid auth user, unit exists | unitId | runtime_units_state, tsd_units, mapping tables | success response with unit state and mapping | none |
| LM-BE-011 | Unit detail not found | `GET /live/units/{unitId}` | Handle nonexistent unit | valid auth user, missing unit | invalid unitId | no unit record | 404 NOT_FOUND | yes |
| LM-BE-012 | Camera status | `GET /live/cameras/status` | Return camera runtime status list | valid auth user | none | runtime_camera_state, cameras | success response with camera statuses | none |
| LM-BE-013 | Camera target | `GET /live/cameras/target` | Return current target list | valid auth user | none | runtime_camera_state data | success response with camera target info | none |
| LM-BE-014 | Trigger results filters | `GET /live/cameras/triggers` | Filter by result and cameraId | valid auth user | query cameraId, result | runtime_camera_logs | success response with filtered triggers | none |
| LM-BE-015 | Trigger results invalid filter | `GET /live/cameras/triggers` | Reject invalid result enum | valid auth user | result=INVALID | none | 400 VALIDATION_ERROR | yes |
| LM-BE-016 | Event feed filters | `GET /live/events` | Return filtered event feed | valid auth user | eventType, unitId, result, from, to | runtime_events | success response with items and pagination | none |
| LM-BE-017 | Event feed invalid date range | `GET /live/events` | Reject from > to | valid auth user | from=`2026-05-05`, to=`2026-05-04` | none | 400 VALIDATION_ERROR | yes |
| LM-BE-018 | Alert list active | `GET /live/alerts` | Return only active alerts by default | valid auth user | none | runtime_alerts active/inactive | success response with active alerts list | none |
| LM-BE-019 | Alert acknowledge | `POST /live/alerts/{id}/acknowledge` | Acknowledge alert and write audit log | valid auth user, alert active | path id | runtime_alerts alert record, audit logger | success response with status ACKNOWLEDGED | none |
| LM-BE-020 | Alert acknowledge already acked | `POST /live/alerts/{id}/acknowledge` | Return current state if already acknowledged | valid auth user | path id | alert status ACKNOWLEDGED | success response with same ack state | none |
| LM-BE-021 | Alert acknowledge not found | `POST /live/alerts/{id}/acknowledge` | Return not found | valid auth user | invalid id | no alert | 404 NOT_FOUND | yes |
| LM-BE-022 | Runtime status | `GET /live/runtime/status` | Return connection status and stale flag | valid auth user | none | runtime_room_state.last_event_at older/newer than threshold | success response with isDataStale correct | none |
| LM-BE-023 | Recovery action valid | `POST /live/runtime/recovery` | Accept valid recovery action for Admin | Admin auth | action=RECONNECT | runtime recovery executor, audit logger | success response SUCCESS | none |
| LM-BE-024 | Recovery action forbidden | `POST /live/runtime/recovery` | Deny Operator recovery | Operator auth | action=RECONNECT | none | 403 RECOVERY_ADMIN_ONLY | yes |
| LM-BE-025 | Recovery invalid action | `POST /live/runtime/recovery` | Reject unknown action | Admin auth | action=INVALID | none | 422 BUSINESS_RULE_ERROR | yes |

### DTO / Validation Coverage

| Test Case ID | DTO / Schema | Field | Condition | Input | Expected Result |
| --- | --- | --- | --- | --- | --- |
| LM-BE-026 | RuntimeRecoveryRequest | action | required enum | missing action | 400 VALIDATION_ERROR |
| LM-BE-027 | RuntimeRecoveryRequest | action | invalid enum | action=RESET | 422 BUSINESS_RULE_ERROR |
| LM-BE-028 | EventFeed query | from/to | cross-field | from after to | 400 VALIDATION_ERROR |
| LM-BE-029 | CameraTrigger query | result | invalid enum | result=UNKNOWN | 400 VALIDATION_ERROR |
| LM-BE-030 | Pagination params | page,pageSize | boundaries | page=0 | 400 VALIDATION_ERROR |
| LM-BE-031 | Pagination params | pageSize | max boundary | pageSize=101 | 400 VALIDATION_ERROR |
| LM-BE-032 | Alert query | status | invalid enum | status=OPEN | 400 VALIDATION_ERROR |

### Permission / Guard Coverage

| Test Case ID | Feature | Role | Input | Expected Result |
| --- | --- | --- | --- | --- |
| LM-BE-033 | Live dashboard | Operator | `GET /live/dashboard` | success |
| LM-BE-034 | Live dashboard | Admin | `GET /live/dashboard` | success |
| LM-BE-035 | Recovery action | Operator | `POST /live/runtime/recovery` | 403 RECOVERY_ADMIN_ONLY |
| LM-BE-036 | Recovery action | Admin | `POST /live/runtime/recovery` | success |
| LM-BE-037 | Alert acknowledge | Operator | `POST /live/alerts/{id}/acknowledge` | success |
| LM-BE-038 | Alert acknowledge | Admin | `POST /live/alerts/{id}/acknowledge` | success |

### Repository Interaction / Side Effect Coverage

| Test Case ID | Service | Dependency | Mock | Expected Side Effect |
| --- | --- | --- | --- | --- |
| LM-BE-039 | AlertService.acknowledge | AlertRepository | existing alert | update alert status and ack fields |
| LM-BE-040 | RecoveryService.run | RuntimeRecoveryLogRepository | valid action | insert recovery log with result |
| LM-BE-041 | MapService.getMapState | LayoutRepository | no layout | return null layout no exception |
| LM-BE-042 | EventFeedService.list | RuntimeEventRepository | no events | return empty items with pagination |
| LM-BE-043 | DashboardService.getDashboard | RuntimeRoomStateRepository | missing runtime state | return partial / error per contract |

---

## Frontend Unit Test Input Matrix

### UI Rendering & State Coverage

| Test Case ID | Screen / Component | Scenario | Input Props / API Response | Expected UI State | Notes |
| --- | --- | --- | --- | --- | --- |
| LM-FE-001 | LiveDashboardPage | normal dashboard | dashboard data with connected SSE and one active alert | show operation mode badge, SSE badge green, active speaker count, pending request count, current camera target card, alert list | |
| LM-FE-002 | LiveDashboardPage | no runtime data | API returns `runtimeAvailable=false` or partial data | show "No runtime data yet" banner, cards disabled or empty | requires UI fallback state |
| LM-FE-003 | LiveDashboardPage | disconnected runtime | `sseStatus=DISCONNECTED`, `isDataStale=true` | show red SSE badge, warning banner, stale indicator | |
| LM-FE-004 | RealtimeMapView | layout loaded | map response with layout and devices | render canvas, device icons at posX/posY, legend | |
| LM-FE-005 | RealtimeMapView | no layout | layout=null | show `Layout is not configured`, no canvas icons | |
| LM-FE-006 | RealtimeMapView | unit states | device runtimeState REQUEST/SPEAKING/OFFLINE | icon styling changes per state | REQUEST orange pulse, SPEAKING green, OFFLINE red/gray |
| LM-FE-007 | SpeakerMonitoring | active speakers tab | active speakers API returns list | show rows for each speaker, unit name, device type, last event, mapped camera/preset | |
| LM-FE-008 | SpeakerMonitoring | pending requests tab in AUTOMATIC mode | summary response with queueUsed=false | show `Request queue not used in Automatic mode` | |
| LM-FE-009 | SpeakerMonitoring | unit detail drawer | selected unit API returns mapping null | show warning `No active camera mapping` | |
| LM-FE-010 | CameraMonitoring | status cards | camera statuses API returns cameras | show each camera with status and last result badge | |
| LM-FE-011 | CameraMonitoring | no current target | target API returns empty | show `No current target` | |
| LM-FE-012 | CameraMonitoring | trigger history filter | triggers data filtered by result | show table with filtered rows | |
| LM-FE-013 | EventFeed | filter by eventType | event API returns filtered results | show matching rows; if none, show `No recent events` | |
| LM-FE-014 | AlertsPage | acknowledge button | alert list with ACTIVE | button enabled for each alert | |
| LM-FE-015 | AlertsPage | already acknowledged alert | alert status ACKNOWLEDGED | show subdued style, action button hidden or disabled | |
| LM-FE-016 | RuntimeStatusPanel | disconnected | status API returns DISCONNECTED and stale | red badge, stale text, recovery panel visible for Admin | |
| LM-FE-017 | RecoveryPanel | Admin click recovery | API returns success | show result toast, refresh runtime status | |
| LM-FE-018 | RecoveryPanel | Operator view | recovery action hidden | no recovery buttons shown | |

### Form / Validation Coverage

| Test Case ID | Form / Component | Field | Invalid Input | Expected UI Validation | Contract Reference |
| --- | --- | --- | --- | --- | --- |
| LM-FE-019 | RecoveryModal | action | empty selection | disable submit / show `action is required` | API schema required action |
| LM-FE-020 | EventFeedFilter | from/to | from later than to | show validation error `From must be before To` | API cross-field validation |
| LM-FE-021 | TriggerResultsFilter | result | invalid enum input | filter control only allows enum options | UI should prevent invalid submissions |
| LM-FE-022 | AlertAcknowledge | alertId | missing id | button disabled / error on action | path param required |

---

## Validation Test Inputs

### Common Mock Values

| Field | Valid Value | Invalid Value | Boundary / Edge Value |
| --- | --- | --- | --- |
| page | 1 | 0 | 1000 |
| pageSize | 20 | 0 / 101 | 100 |
| action | RECONNECT | RESET | RECOVER_STATE |
| result (trigger) | SUCCESS | INVALID | SKIPPED |
| status (alert) | ACTIVE | OPEN | ACKNOWLEDGED |
| sseStatus | CONNECTED | CONNECT | DISCONNECTED |
| from/to | `2026-05-04T10:00:00Z` | `2026-05-05T10:00:00Z` | boundary date/time |

### Endpoint-specific Validation

| Endpoint | Field | Invalid Value | Expected Error |
| --- | --- | --- | --- |
| `GET /live/events` | from/to | from > to | VALIDATION_ERROR |
| `GET /live/cameras/triggers` | result | UNKNOWN | VALIDATION_ERROR |
| `POST /live/runtime/recovery` | action | null | VALIDATION_ERROR |
| `POST /live/runtime/recovery` | action | REFRESH | BUSINESS_RULE_ERROR or invalid action |
| `GET /live/alerts` | status | OPEN | VALIDATION_ERROR |
| `GET /live/units/{unitId}` | unitId | non-uuid | VALIDATION_ERROR |

---

## Permission Test Inputs

### Role-specific Expectations

| Test Case ID | Endpoint | Role | Input | Expected Authorization Result |
| --- | --- | --- | --- | --- |
| LM-PM-001 | `GET /live/dashboard` | Admin | valid auth token | 200 |
| LM-PM-002 | `GET /live/dashboard` | Operator | valid auth token | 200 |
| LM-PM-003 | `POST /live/runtime/recovery` | Admin | valid auth token | 200 |
| LM-PM-004 | `POST /live/runtime/recovery` | Operator | valid auth token | 403 |
| LM-PM-005 | `POST /live/alerts/{id}/acknowledge` | Admin | valid auth token | 200 |
| LM-PM-006 | `POST /live/alerts/{id}/acknowledge` | Operator | valid auth token | 200 |
| LM-PM-007 | any live endpoint | missing auth | none | 401 |

---

## State Transition Test Inputs

### Runtime Connection

| Test Case ID | Source State | Trigger | Expected Target State | Validation |
| --- | --- | --- | --- | --- |
| LM-ST-001 | CONNECTED | SSE disconnect event | DISCONNECTED | runtime status returns DISCONNECTED |
| LM-ST-002 | DISCONNECTED | reconnect success | RECONNECTING or CONNECTED | status transitions appropriately |
| LM-ST-003 | RECONNECTING | event resume | CONNECTED | stale false after resume |

### Alert Status

| Test Case ID | Source Status | Action | Expected Status | Notes |
| --- | --- | --- | --- | --- |
| LM-ST-004 | ACTIVE | acknowledge alert | ACKNOWLEDGED | alert still visible until resolved |
| LM-ST-005 | ACKNOWLEDGED | backend resolution | RESOLVED | not in scope for API but should be allowed |

### Unit Runtime

| Test Case ID | Source State | Event | Expected State | Notes |
| --- | --- | --- | --- | --- |
| LM-ST-006 | IDLE | request started | REQUEST | request appears in pending queue |
| LM-ST-007 | REQUEST | speaker becomes active | SPEAKING | active speaker list updated |
| LM-ST-008 | SPEAKING | speaker ends | IDLE | active speakers removed |
| LM-ST-009 | ANY | connectivity loss or offline signal | OFFLINE | map highlights offline state |

---

## Error / Negative Test Inputs

| Test Case ID | Scenario | Input | Mock Condition | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- |
| LM-NEG-001 | missing runtime state | `GET /live/dashboard` | runtime_room_state = null | 503 RUNTIME_UNAVAILABLE or partial response | backend should not crash |
| LM-NEG-002 | invalid recovery action | `POST /live/runtime/recovery` | action=RESET | 422 BUSINESS_RULE_ERROR | reject unknown enum |
| LM-NEG-003 | stale event feed date range | `GET /live/events` | from > to | 400 VALIDATION_ERROR | catch cross-field validation |
| LM-NEG-004 | alert acknowledge missing id | `POST /live/alerts/{id}/acknowledge` | invalid uuid | 400 VALIDATION_ERROR | path param invalid |
| LM-NEG-005 | unauthorized access | any live endpoint | missing auth | 401 UNAUTHORIZED | standard security |
| LM-NEG-006 | forbidden recovery | `POST /live/runtime/recovery` | Operator auth | 403 RECOVERY_ADMIN_ONLY | role guard logic |
| LM-NEG-007 | invalid request filter | `GET /live/cameras/triggers` | result=INVALID | 400 VALIDATION_ERROR | filter validation |

---

## Edge Case Test Inputs

| Test Case ID | Scenario | Input | Mock Condition | Expected Behavior |
| --- | --- | --- | --- | --- |
| LM-EDGE-001 | empty alerts | `GET /live/alerts` | runtime_alerts = [] | success with empty pagination list | UI should show no alerts state |
| LM-EDGE-002 | no active speaker | `GET /live/speakers/active` | runtime_units_state has no SPEAKING | success with empty list | show `No active speaker` |
| LM-EDGE-003 | no camera target | `GET /live/cameras/target` | current_camera_target_json = null | success with empty list or null target | UI should show `No current target` |
| LM-EDGE-004 | no layout defined | `GET /live/map` | layout absent | success with layout=null, devices=[] | map page should show config prompt |
| LM-EDGE-005 | large event feed | `GET /live/events` | 1000+ runtime_events | return paginated results | pagination works and performance considered |
| LM-EDGE-006 | stale runtime data | `GET /live/runtime/status` | lastEventAt far older than threshold | isDataStale=true | UI warns stale data |

---

## Mock Data Suggestions

### Valid Sample Entities

| Entity | Sample Data |
| --- | --- |
| runtime_room_state | { room_id: `room-123`, operation_mode: `MANUAL`, sse_status: `CONNECTED`, active_speakers_json: `["unit-1"]`, pending_requests_json: `["req-1"]`, current_camera_target_json: `{...}`, last_event_at: `2026-05-04T10:15:00Z` } |
| runtime_units_state | { unit_id: `unit-1`, state: `SPEAKING`, last_event_at: `2026-05-04T10:15:58Z` } |
| runtime_camera_state | { camera_id: `cam-1`, current_target_unit_id: `unit-1`, current_preset_id: `preset-1`, last_switch_at: `2026-05-04T10:15:58Z`, last_result: `SUCCESS` } |
| runtime_events | { id: `evt-1`, event_type: `response-unitstart`, unit_id: `unit-1`, result: `SUCCESS`, occurred_at: `2026-05-04T10:15:58Z` } |
| runtime_alerts | { id: `alert-1`, severity: `WARNING`, status: `ACTIVE`, source: `MAPPING`, message: `No active camera mapping`, created_at: `2026-05-04T10:16:00Z` } |
| recovery log | { action: `RECONNECT`, result: `SUCCESS`, created_at: `2026-05-04T10:20:00Z` } |

### Invalid / Conflict Samples

| Scenario | Sample Data |
| --- | --- |
| invalid enum | action: `RESET` |
| no runtime state | runtime_room_state = null |
| missing layout | layout record absent |
| already acknowledged | runtime_alerts.status = `ACKNOWLEDGED` |
| invalid unit path | unitId: `not-a-uuid` |
| stale event timestamp | last_event_at = `2026-04-01T00:00:00Z` |

### Permission Mock Samples

| Role | Token / Context | Expected Access |
| --- | --- | --- |
| ADMIN | valid admin token | full live monitoring access + recovery |
| OPERATOR | valid operator token | live monitoring access, no recovery |
| anonymous | missing token | 401 unauthorized |

---

## Assumptions / Open Points

* `GET /live/dashboard` may return partial data when runtime snapshot is unavailable; exact fallback contract can be implemented as `runtimeAvailable=false` or partial payload.
* `pendingRequestCount` is derived from runtime queue data; if runtime mode is `AUTOMATIC`, queue should be hidden or returned as unused.
* `currentCameraTarget` may be `null` when no target exists.
* `GET /live/map` should not fail when layout is missing; it should return `layout: null` and `devices: []`.
* The UI should always display text labels for statuses, not only colors, for accessibility.
* Recovery actions write audit/recovery logs, but the unit tests focus on service invocation and log insertion rather than actual runtime side effects.

---

## Notes for Test Implementation

* Use role-based auth context mocks for Admin / Operator.
* Mock repositories/services for runtime state, layout, units, cameras, alerts, and recovery logs.
* Validate both API schema errors and business-rule errors separately.
* For frontend tests, mock API hook results to verify page state transitions.
* Prefer explicit expected values for each field rather than generic success assertions.
