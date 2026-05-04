# UI/UX Design Document – Live Monitoring Module

Tài liệu này bám theo **Requirement + Use Cases (Live Monitoring) + Detail Design – Live Monitoring** đã chốt, không thêm feature ngoài scope.

## 1. UI/UX Overview

### Mục tiêu

Live Monitoring giúp Admin/Operator giám sát realtime:

* trạng thái runtime/SSE
* operation mode
* active speaker
* pending requests
* trạng thái unit trên map
* camera target hiện tại
* camera trigger result
* runtime alerts
* event feed

### Roles

| Role     | Quyền                                           |
| -------- | ----------------------------------------------- |
| Admin    | Xem monitoring, acknowledge alert, run recovery |
| Operator | Xem monitoring, acknowledge alert               |

### UX Principles

* trạng thái realtime phải dễ nhìn trong 1–2 giây
* lỗi kết nối phải nổi bật
* camera lỗi không làm mất speaker monitoring
* map, speaker, camera, alert phải đồng bộ cùng runtime snapshot
* chỉ Admin thấy recovery action

---

## 2. Navigation Structure

### Sidebar

```text
Dashboard
Live Monitoring
  ├── Live Dashboard
  ├── Realtime Map
  ├── Speakers
  ├── Cameras
  ├── Event Feed
  └── Alerts
Runtime Monitor
System Configuration
```

### Top Bar

Luôn hiển thị:

```text
[Room Name] [Mode: MANUAL/AUTOMATIC] [SSE: CONNECTED/RECONNECTING/DISCONNECTED] [User]
```

### Breadcrumb

```text
Live Monitoring / Dashboard
Live Monitoring / Realtime Map
Live Monitoring / Cameras
```

---

## 3. Page Map

```text
Live Monitoring
  ├── Live Dashboard
  ├── Realtime Map View
  ├── Speaker Monitoring
  ├── Camera Monitoring
  ├── Event Feed
  ├── Runtime Alerts
  └── Runtime Connection / Recovery
```

---

## 4. Page-by-Page Design

### 4.1 Live Dashboard

#### Purpose

Màn hình tổng quan realtime cho vận hành.

#### Layout

```text
[Header]
Title + Mode Badge + SSE Badge

[Top Summary Cards]
Operation Mode | SSE Status | Active Speakers | Pending Requests | Alerts

[Main Area]
Left: Active Speaker
Center: Current Camera Target
Right: Runtime Alerts

[Bottom]
Recent Events
```

#### Components

* status cards
* active speaker card
* camera target card
* alert list
* recent event feed
* recovery button Admin-only

#### Data Mapping

| UI                    | API / Field                         |
| --------------------- | ----------------------------------- |
| Mode                  | `GET /live/dashboard.operationMode` |
| SSE Status            | `sseStatus`                         |
| Active speaker count  | `activeSpeakerCount`                |
| Pending request count | `pendingRequestCount`               |
| Current camera target | `currentCameraTarget`               |
| Active alerts         | `activeAlerts`                      |

---

### 4.2 Realtime Map View

#### Purpose

Hiển thị trạng thái unit/camera trực quan trên layout phòng.

#### Layout

```text
[Header]
Title + SSE Status

[Left Panel]
Legend + Filters

[Center]
Realtime Layout Canvas

[Right Panel]
Selected Device Detail
```

#### Components

* layout canvas
* unit icons
* camera icons
* legend
* filter controls
* selected unit detail drawer/panel

#### Runtime Highlight

| State    | UI                  |
| -------- | ------------------- |
| IDLE     | icon xám            |
| REQUEST  | cam/orange pulse    |
| SPEAKING | xanh/highlight mạnh |
| OFFLINE  | đỏ/xám              |

#### Data Mapping

| UI              | Backend                            |
| --------------- | ---------------------------------- |
| Layout          | `GET /live/map.layout`             |
| Device position | `devices[].posX`, `devices[].posY` |
| Runtime state   | `devices[].runtimeState`           |
| Device label    | `devices[].label`                  |

---

### 4.3 Speaker Monitoring

#### Purpose

Theo dõi speaker active, request pending và chi tiết từng unit.

#### Layout

```text
[Header]
Title

[Tabs]
Active Speakers | Pending Requests | All Units

[Table/List]
Unit runtime data

[Right Drawer]
Unit detail
```

#### Components

* active speaker list
* pending request summary
* unit detail drawer
* state badges

#### Data Mapping

| UI               | API                          |
| ---------------- | ---------------------------- |
| Active speakers  | `GET /live/speakers/active`  |
| Pending requests | `GET /live/requests/summary` |
| Unit detail      | `GET /live/units/{unitId}`   |

#### Table Columns

| Column         | Notes                               |
| -------------- | ----------------------------------- |
| Unit Name / ID | searchable                          |
| Device Type    | Chairman / Delegate                 |
| State          | IDLE / REQUEST / SPEAKING / OFFLINE |
| Last Event     | sortable                            |
| Mapped Camera  | warning if missing                  |
| Mapped Preset  | warning if missing                  |

---

### 4.4 Camera Monitoring

#### Purpose

Theo dõi camera runtime target và trigger result.

#### Layout

```text
[Header]
Title

[Camera Status Cards/Grid]
Camera 1 | Camera 2 | Camera 3 | Camera 4

[Selected Camera Detail]
Current Target
Last Trigger Result
Trigger History
```

#### Components

* camera status cards
* target panel
* trigger result badges
* trigger history table

#### Data Mapping

| UI              | API                          |
| --------------- | ---------------------------- |
| Camera status   | `GET /live/cameras/status`   |
| Current target  | `GET /live/cameras/target`   |
| Trigger results | `GET /live/cameras/triggers` |

#### Status Display

| Result  | UI                |
| ------- | ----------------- |
| SUCCESS | green badge       |
| FAILED  | red badge         |
| SKIPPED | gray/orange badge |

---

### 4.5 Event Feed

#### Purpose

Xem log realtime để giám sát/debug.

#### Layout

```text
[Header]
Title

[Filter Bar]
Event Type | Unit | Result | Time Range

[Event Table]
```

#### Table Columns

| Column     | Sort | Filter |
| ---------- | :--: | :----: |
| Time       |   Y  |    Y   |
| Event Type |   Y  |    Y   |
| Unit       |   N  | Search |
| Result     |   Y  |    Y   |
| Message    |   N  |    N   |

#### Data Mapping

`GET /live/events`

---

### 4.6 Runtime Alerts

#### Purpose

Xem và acknowledge cảnh báo runtime.

#### Layout

```text
[Header]
Title

[Filter Bar]
Severity | Source | Status

[Alert List/Table]
```

#### Components

* alert cards/table
* severity badges
* acknowledge button
* alert detail drawer

#### Data Mapping

| UI          | Backend                              |
| ----------- | ------------------------------------ |
| Alert list  | `GET /live/alerts`                   |
| Acknowledge | `POST /live/alerts/{id}/acknowledge` |

#### Alert States

| Status       | UI                           |
| ------------ | ---------------------------- |
| ACTIVE       | nổi bật                      |
| ACKNOWLEDGED | giảm độ nổi                  |
| RESOLVED     | ẩn mặc định / show by filter |

---

### 4.7 Runtime Connection / Recovery

#### Purpose

Giám sát kết nối SSE/runtime và cho Admin recovery.

#### Layout

```text
[Connection Status Card]
SSE Status
Last Connected
Last Disconnected
Last Event
Data Stale

[Recovery Actions]
Reconnect
Recover State
Refresh Snapshot
```

#### Role Behavior

* Admin: thấy recovery actions
* Operator: chỉ xem status

#### Data Mapping

| UI              | API                           |
| --------------- | ----------------------------- |
| Runtime status  | `GET /live/runtime/status`    |
| Recovery action | `POST /live/runtime/recovery` |

---

## 5. Forms & Validation Design

### 5.1 Acknowledge Alert

| Field   | Type   | Required | Validation       |
| ------- | ------ | -------: | ---------------- |
| alertId | hidden |        Y | alert must exist |

Errors:

* `Alert not found`
* `Alert already acknowledged`

### 5.2 Recovery Action

| Field  | Type          | Required | Validation                                   |
| ------ | ------------- | -------: | -------------------------------------------- |
| action | select/button |        Y | RECONNECT / RECOVER_STATE / REFRESH_SNAPSHOT |

Errors:

* `Only Admin can run recovery`
* `Runtime recovery failed`
* `Invalid recovery action`

---

## 6. Table/List Design

### 6.1 Event Feed Table

* default sort: newest first
* pagination: yes
* filters:

  * event type
  * unit
  * result
  * time range

### 6.2 Alert Table

| Column   | Notes                            |
| -------- | -------------------------------- |
| Severity | badge                            |
| Source   | SSE / CAMERA / MAPPING / RUNTIME |
| Message  | short text                       |
| Status   | ACTIVE / ACKNOWLEDGED / RESOLVED |
| Time     | sortable                         |
| Actions  | Acknowledge                      |

### 6.3 Speaker Table

* search by unit name/id
* filter by state/device type
* click row opens detail drawer

---

## 7. Interaction Flows

### 7.1 View Live Dashboard

1. User opens Live Monitoring.
2. UI calls `/live/dashboard`.
3. UI renders cards, target, alerts.
4. Runtime update arrives.
5. UI refreshes affected sections only.

### 7.2 Map Highlight Update

1. Runtime event updates unit state.
2. Snapshot/map data updates.
3. UI changes icon style.
4. If user selected that unit, detail panel updates.

### 7.3 Acknowledge Alert

1. User clicks Acknowledge.
2. UI calls acknowledge API.
3. Alert status becomes `ACKNOWLEDGED`.
4. Toast shows success.

### 7.4 Runtime Disconnected

1. SSE status becomes `DISCONNECTED`.
2. Top badge turns red.
3. Dashboard shows warning banner.
4. Data is marked stale.
5. Admin can run recovery.

### 7.5 Admin Recovery

1. Admin clicks Recovery.
2. Confirmation modal opens.
3. Admin confirms.
4. Backend runs action.
5. UI shows result and refreshes runtime status.

---

## 8. State Handling

| Screen    | Loading        | Empty             | Error                  | Success         |
| --------- | -------------- | ----------------- | ---------------------- | --------------- |
| Dashboard | skeleton cards | no runtime data   | dashboard error banner | realtime cards  |
| Map       | canvas loading | no layout         | map unavailable        | highlighted map |
| Speakers  | table skeleton | no active speaker | load failed            | speaker list    |
| Cameras   | card skeleton  | no camera status  | camera load error      | camera cards    |
| Events    | table skeleton | no events         | feed error             | event table     |
| Alerts    | list skeleton  | no alerts         | alert load error       | alert list      |

---

## 9. Role-Based UI Behavior

| Capability              | Admin | Operator |
| ----------------------- | :---: | :------: |
| View dashboard          |   Y   |     Y    |
| View map                |   Y   |     Y    |
| View speaker monitoring |   Y   |     Y    |
| View camera monitoring  |   Y   |     Y    |
| View event feed         |   Y   |     Y    |
| View alerts             |   Y   |     Y    |
| Acknowledge alert       |   Y   |     Y    |
| View runtime status     |   Y   |     Y    |
| Run recovery            |   Y   |     N    |

---

## 10. Edge Case UX

### No Layout

* Dashboard still works.
* Map page shows:

  * `Layout is not configured`
  * link to System Configuration for Admin

### Missing Mapping

* Unit detail shows warning:

  * `No active camera mapping`
* Camera target not updated.
* Alert shown if generated.

### Camera Trigger Failed

* Speaker state remains visible.
* Camera panel shows:

  * `Last trigger failed`
* Event feed logs failure.

### Runtime Disconnected

* persistent red/orange warning.
* data marked stale.
* do not clear old data immediately.

### Alert Already Acknowledged

* show current status.
* refresh alert list.

### Operator Opens Recovery

* button hidden.
* direct route/API returns forbidden.

---

## 11. Design System Guidelines

### Buttons

| Type      | Usage                                         |
| --------- | --------------------------------------------- |
| Primary   | Recovery confirm, acknowledge important alert |
| Secondary | Refresh, cancel                               |
| Danger    | Recovery action that restarts runtime         |
| Tertiary  | View detail                                   |

### Colors

| Meaning                          | Color  |
| -------------------------------- | ------ |
| Connected / Success / Speaking   | Green  |
| Request / Warning / Reconnecting | Orange |
| Error / Disconnected / Failed    | Red    |
| Idle / Neutral                   | Gray   |
| Info / Automatic / Runtime       | Blue   |

### Badges

* `CONNECTED`: green
* `RECONNECTING`: orange
* `DISCONNECTED`: red
* `SPEAKING`: green
* `REQUEST`: orange
* `FAILED`: red
* `SKIPPED`: gray/orange

### Typography

* Page title: 24px semibold
* Section title: 18px semibold
* Card metric: 28–32px
* Body: 14–16px
* Helper/error: 12–13px

### Icons

* microphone: speaker/unit
* camera: camera status
* network: SSE/runtime
* warning triangle: alert
* map pin: layout position
* refresh: recovery/refresh

---

## 12. UX Improvements & Recommendations

### Recommended Default Landing

* Operator: **Live Dashboard** hoặc **Realtime Map**
* Admin: **Live Dashboard** với recovery access

### Information Priority

1. SSE status
2. Active speaker
3. Pending request count
4. Current camera target
5. Alerts
6. Event feed

### Smart Warnings

* show mapping warning near unit detail
* show camera failure near camera target
* show runtime disconnected globally

### Accessibility

* status must include text, not only color
* map icons must have tooltip/label
* alert actions keyboard accessible
* tables support keyboard navigation

---

## 13. Frontend Implementation Notes

### Suggested Routes

```text
/live
/live/map
/live/speakers
/live/cameras
/live/events
/live/alerts
/live/runtime-status
```

### Suggested Components

```text
LiveDashboardPage
RuntimeStatusBadge
ModeBadge
LiveMetricCard
RealtimeMapCanvas
SpeakerList
UnitDetailDrawer
CameraStatusGrid
CameraTargetPanel
EventFeedTable
AlertList
AlertDetailDrawer
RecoveryPanel
```

### Suggested State Shape

```ts
type LiveMonitoringState = {
  dashboard: LiveDashboard | null;
  snapshot: LiveSnapshot | null;
  mapState: LiveMapState | null;
  activeSpeakers: Speaker[];
  cameraStatuses: CameraRuntimeStatus[];
  events: RuntimeEvent[];
  alerts: RuntimeAlert[];
  runtimeStatus: {
    sseStatus: "CONNECTED" | "RECONNECTING" | "DISCONNECTED" | "UNAVAILABLE";
    lastEventAt?: string;
    isDataStale: boolean;
  };
};
```

---

## 14. Final Summary

UI/UX cho **Live Monitoring** đã cover đầy đủ:

* live dashboard
* realtime map
* speaker monitoring
* camera monitoring
* event feed
* runtime alerts
* SSE/runtime status
* Admin recovery
* role-based behavior
* loading/empty/error/success states
* edge-case UX
* mapping UI ↔ backend API rõ ràng
