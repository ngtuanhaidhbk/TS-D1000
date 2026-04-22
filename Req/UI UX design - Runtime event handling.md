# UI/UX Design Document – Runtime Event Handling / Manual Control / Realtime Monitoring

Tài liệu này bám theo **Requirement + Use Cases (Runtime Event Handling) + Detail Design – Runtime Event Handling** đã chốt, không thêm feature ngoài scope.

## 1. UI/UX Overview

### 1.1 Mục tiêu

Thiết kế UI/UX cho phần runtime giúp người vận hành:

* nhìn thấy ngay ai đang yêu cầu nói / đang nói
* xử lý approve / reject nhanh trong Manual mode
* theo dõi trạng thái camera và room realtime
* phát hiện nhanh lỗi kết nối TS-D1000 / SSE
* thao tác ít click, dễ hiểu khi đang vận hành

### 1.2 Người dùng

| Role     | Quyền                                                                             |
| -------- | --------------------------------------------------------------------------------- |
| Admin    | xem toàn bộ runtime, approve/reject, điều khiển camera, start/stop runtime nếu có |
| Operator | xem runtime, approve/reject, điều khiển camera theo quyền được cấp                |

### 1.3 Core UX Principles

* ưu tiên thông tin realtime quan trọng nhất ở vùng dễ nhìn
* xử lý queue nhanh bằng 1–2 click
* trạng thái rõ bằng màu + badge + icon
* lỗi kết nối phải nổi bật
* map là trung tâm trực quan, queue là trung tâm thao tác
* một trạng thái hiển thị nhất quán trên mọi màn

### 1.4 Assumptions

1. Runtime UI là một phần trong desktop/web app chính.
2. Có 2 mode: `MANUAL` và `AUTOMATIC`.
3. UI nhận state qua realtime channel nội bộ (websocket/polling nội bộ), không mô tả chi tiết transport trong tài liệu này.
4. Operator có quyền approve/reject request.
5. Admin có quyền runtime-level control (start/stop/recovery) nếu backend cho phép.
6. Camera live preview là optional panel trên runtime screen.

---

## 2. Navigation Structure

### 2.1 Sidebar

#### Admin

```text
Dashboard
Map View
Camera View
Manual Control
Runtime Monitor
System Configuration
Logs
```

#### Operator

```text
Dashboard
Map View
Camera View
Manual Control
Runtime Monitor
System Configuration
```

### 2.2 Top Navigation

* Room Name
* Current Mode badge (`MANUAL` / `AUTOMATIC`)
* SSE status badge (`CONNECTED` / `RECONNECTING` / `DISCONNECTED`)
* User info
* Logout

### 2.3 Page Hierarchy

```text
Runtime
  ├── Manual Control
  ├── Map View
  ├── Camera View
  └── Runtime Monitor
```

---

## 3. Page Map

```text
Runtime Module
   ├── Manual Control Page
   │    ├── Request Queue Panel
   │    ├── Active Speaker Panel
   │    ├── Quick Action Buttons
   │    └── Confirm Modals
   ├── Map View Page
   │    ├── Realtime Layout Canvas
   │    ├── Device Legend
   │    ├── Selected Unit Detail Panel
   │    └── Camera Target Indicator
   ├── Camera View Page
   │    ├── Live View Grid
   │    ├── Current Camera Target
   │    └── Manual Camera Action Panel
   └── Runtime Monitor Page
        ├── SSE Status
        ├── Runtime Snapshot
        ├── Event Feed
        └── Recovery / Diagnostics
```

---

## 4. Page-by-Page Design

### 4.1 Manual Control Page

#### Purpose

* xử lý speaking request trong Manual mode
* xem speaker active
* approve/reject nhanh

#### Main Actions

* approve request
* reject request
* theo dõi speaker hiện tại

#### Layout

```text
[Header]
 Title + room name + mode badge + SSE badge

[Main Layout]
 Left: Request Queue
 Center: Active Speaker + Current Focus
 Right: Quick Status / Camera Target / Selected Unit Detail
```

#### Components

* Request Queue Panel: danh sách `PENDING` (oldest-first mặc định), mỗi item có Approve/Reject.
* Active Speaker Panel: speaker đang SPEAKING, hiển thị camera/preset mapping (nếu có).
* Quick Status Panel: mode, queue count, active speaker count, camera target, SSE status.
* Confirm Modal: optional; khuyến nghị bỏ confirm cho Approve, giữ confirm cho Reject nếu môi trường dễ bấm nhầm.

#### Data Mapping

| UI Element            | Backend / Runtime Data                 |
| --------------------- | -------------------------------------- |
| Mode badge            | `GET /api/v1/runtime/snapshot`         |
| SSE badge             | `GET /api/v1/runtime/snapshot`         |
| Pending Requests      | `GET /api/v1/runtime/requests`         |
| Active Speakers       | `GET /api/v1/runtime/snapshot`         |
| Current Camera Target | `GET /api/v1/runtime/snapshot`         |
| Unit state            | runtime snapshot / runtime state store |

---

### 4.2 Map View Page

#### Purpose

* hiển thị trạng thái realtime trực quan trên layout
* highlight unit đang request / speaking
* theo dõi camera target

#### Layout

```text
[Header]
 Title + mode badge + SSE badge

[Main Layout]
 Left: Legend + Filters
 Center: Layout Canvas
 Right: Selected Device Detail + Runtime Info
```

#### Highlight Rules

* `REQUEST`: amber/orange pulse
* `SPEAKING`: green active glow
* `OFFLINE`: gray/red muted
* `IDLE`: neutral

#### Empty State

* Nếu chưa có layout: hiển thị CTA dẫn sang System Configuration (Layout & Map).

#### Data Mapping

| UI Element             | Backend Data                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| Layout background      | `layouts.*` (system configuration)                                   |
| Device positions       | `layout_devices.*` (system configuration)                            |
| Unit state             | runtime snapshot / runtime state store                                |
| Selected unit metadata | `tsd_units.*` (system configuration, đã sync trước)                  |
| Mapping                | `mic_camera_mappings.*` (system configuration)                        |
| Camera target          | `GET /api/v1/runtime/snapshot -> currentCameraTarget`                |

---

### 4.3 Camera View Page

#### Purpose

* theo dõi 1–4 luồng camera
* biết camera đang focus ai
* manual camera action nếu được cấp quyền

#### Layout

```text
[Header]
 Title + layout selector + mode badge

[Main Layout]
 Center: Live Grid
 Right: Camera Status / Current Target / Manual Control
```

#### Rules

* Manual Control Panel chỉ hiển thị nếu policy backend cho phép (tối thiểu: Admin).
* Lỗi trigger camera không block speaking flow; hiển thị warning trong panel/monitor.

---

### 4.4 Runtime Monitor Page

#### Purpose

* theo dõi tình trạng runtime engine
* hỗ trợ debug khi có lỗi

#### Layout

```text
[Header]
 Title + runtime controls (Admin only)

[Top Row]
 SSE Status Card
 Runtime Snapshot Card
 Request Queue Summary
 Active Speaker Summary

[Bottom Row]
 Recent Event Feed
 Diagnostics / Recovery Panel
```

#### Data Mapping

| UI Element       | Backend Data / API                            |
| ---------------- | --------------------------------------------- |
| SSE status       | `GET /api/v1/runtime/snapshot -> sseStatus`   |
| Snapshot         | `GET /api/v1/runtime/snapshot`                |
| Event feed       | (nếu expose) `runtime_events.*`               |
| Recovery action  | (Admin) internal runtime control endpoints    |

---

## 5. Actions & Validation (UI)

### 5.1 Approve Request

* action-only (không cần form)
* validate UI:
  * request tồn tại trong list
  * status = `PENDING`
* lỗi hiển thị:
  * `Request is no longer pending`
  * `Manual mode is required` (nếu backend enforce)
  * `You do not have permission`

### 5.2 Reject Request

* action-only + optional confirm
* validate UI: request tồn tại, status = `PENDING`

### 5.3 Manual Camera Control (optional)

* chỉ hiển thị nếu role/policy cho phép
* disable preset dropdown nếu camera không có preset

---

## 6. Tables / Lists

### 6.1 Pending Request List

| Column / Field | Notes                    |
| -------------- | ------------------------ |
| Unit ID / Name | primary identifier       |
| Device Type    | Chairman / Delegate badge|
| Requested At   | timestamp                |
| Status         | `PENDING`                |
| Actions        | Approve / Reject         |

Default sorting: oldest-first.

### 6.2 Event Feed

| Column     | Notes      |
| ---------- | ---------- |
| Time       | sortable   |
| Event Type | filterable |
| Unit       | searchable |
| Result     | badge      |
| Message    | short text |

---

## 7. Interaction Flows

### 7.1 Approve Flow (Manual)

1. Queue cập nhật khi nhận event request.
2. Operator click `Approve`.
3. UI gọi approve API, hiển thị loading trên item.
4. Khi backend success: item rời queue; speaker panel cập nhật sau event SPEAKING; camera target cập nhật.

### 7.2 Reject Flow (Manual)

1. Operator click `Reject` (confirm optional).
2. UI gọi reject API.
3. Item rời queue; không trigger camera.

### 7.3 Auto Speaking Flow

1. Khi event SPEAKING đến: active speaker panel + map highlight + camera target cập nhật.

### 7.4 Reconnect Flow

1. SSE disconnect: badge `RECONNECTING`, warning banner.
2. Reconnect thành công: badge `CONNECTED`, snapshot refresh.
3. Fail dài: badge `DISCONNECTED`, banner mạnh hơn.

---

## 8. State Handling

* Loading: skeleton cho queue/cards/canvas.
* Empty: `No pending requests`, `No camera streams available`, hoặc “No layout configured” + CTA.
* Error: page-level alert cho load fail; inline error cho approve/reject stale.
* Success: toast hoặc inline success, tự refresh snapshot/queue.

---

## 9. Role-Based Behavior

| Capability            | Admin | Operator |
| --------------------- | :---: | :------: |
| View snapshot         |   Y   |    Y     |
| View queue            |   Y   |    Y     |
| Approve/Reject        |   Y   |    Y     |
| Manual camera control |   Y   | optional |
| Start/stop runtime    |   Y   |    N     |
| Recovery              |   Y   |    N     |

UI chỉ hỗ trợ ẩn/disable; backend vẫn là source-of-truth.

---

## 10. Edge Case UX

* Request stale: hiển thị `Request is no longer pending`, auto refresh queue.
* Unit not mapped: speaker/map vẫn highlight; camera target panel hiển thị `No active mapping`.
* Camera trigger failed: warning non-blocking + event log.
* Session expired: redirect login + message.

---

## 11. Design System Guidelines

* Speaking/Active: green
* Pending/Request: orange/amber
* Disconnected/Error: red
* Neutral/Idle: gray
* Info: blue

Badges: `MANUAL`, `AUTOMATIC`, `CONNECTED`, `RECONNECTING`, `DISCONNECTED`, `PENDING`, `SPEAKING`, `IDLE`.

---

## 12. Suggested Routes & Components

Routes:

```text
/runtime/manual-control
/runtime/map
/runtime/cameras
/runtime/monitor
```

Core components:

* `ManualControlPage`
* `PendingRequestList`
* `ActiveSpeakerPanel`
* `RuntimeMapPage`
* `CameraViewPage`
* `RuntimeMonitorPage`
* `RuntimeTopBar`
* `SseStatusBadge`

