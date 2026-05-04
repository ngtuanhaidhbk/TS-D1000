# UI UX Design - System Configuration

Dưới đây là **UI/UX Design Document – Chức năng Cấu hình hệ thống (System Configuration)**, bám theo Requirement + UC + Detail Design mà bạn đã chốt. Phần thiết kế này phù hợp với bối cảnh TS-D1000 có browser-based settings/control và hệ thống của bạn cần một lớp cấu hình riêng để quản lý TS-D1000, camera, layout, mapping và mode vận hành. ([Toa Products][1])

# 1. UI/UX Overview

## 1.1 Mục tiêu

Module **Cấu hình hệ thống** cho phép:

* cấu hình kết nối TS-D1000
* đồng bộ danh sách thiết bị TS-D1000
* cấu hình camera PTZ
* cấu hình preset camera
* upload và chỉnh sửa layout map
* đặt vị trí mic/camera trên layout
* tạo mapping mic → camera preset
* chọn mode `MANUAL` / `AUTOMATIC`
* kiểm tra readiness trước khi vận hành

## 1.2 Vai trò người dùng

| Role     | Quyền                                      |
| -------- | ------------------------------------------ |
| Admin    | Xem + tạo + sửa + test + cập nhật cấu hình |
| Operator | Chỉ xem cấu hình                           |

## 1.3 Nguyên tắc UX

* gom toàn bộ cấu hình vào một module duy nhất
* ưu tiên flow cấu hình theo thứ tự vận hành thực tế
* giảm số click cho các tác vụ Admin thường dùng
* mọi màn hình đều phản ánh đúng trạng thái backend
* UI read-only rõ ràng cho Operator

## 1.4 Assumptions

1. MVP chỉ có 1 room active.
2. Chỉ Admin mới sửa được config.
3. Operator chỉ xem, không thao tác thay đổi.
4. Camera deactivate không bị hard delete.
5. Mapping active là mapping runtime sẽ dùng.

---

# 2. Navigation Structure

## 2.1 Sidebar

### Admin

```text
Dashboard
Map View
Camera View
Manual Control
-----------------
System Configuration
  ├── Overview
  ├── TS-D1000
  ├── Cameras
  ├── Layout & Map
  ├── Mappings
  ├── Operation Mode
  └── Readiness Check
Logs
```

### Operator

```text
Dashboard
Map View
Camera View
Manual Control
-----------------
System Configuration
  ├── Overview
  ├── TS-D1000
  ├── Cameras
  ├── Layout & Map
  ├── Mappings
  ├── Operation Mode
  └── Readiness Check
```

## 2.2 Top Navigation

* Room name
* Current operation mode badge
* Current user
* User menu: Logout

## 2.3 Breadcrumb

Ví dụ:

```text
System Configuration / Cameras
System Configuration / Layout & Map
```

## 2.4 Page Hierarchy

```text
System Configuration
  ├── Overview
  ├── TS-D1000 Configuration
  ├── Camera Configuration
  ├── Layout & Map
  ├── Mic-Camera Mapping
  ├── Operation Mode
  └── Readiness Check
```

---

# 3. Page Map

```text
System Configuration
   ├── Overview
   ├── TS-D1000
   │    ├── View Config
   │    ├── Create/Edit Config Drawer
   │    └── Test / Sync Actions
   ├── Cameras
   │    ├── Camera List
   │    ├── Add/Edit Camera Drawer
   │    ├── Preset Panel
   │    └── Test / Deactivate Actions
   ├── Layout & Map
   │    ├── Upload Layout
   │    ├── Device Placement Canvas
   │    └── Annotation Editor
   ├── Mappings
   │    ├── Mapping List
   │    └── Create/Edit Mapping Drawer
   ├── Operation Mode
   │    └── Mode Selector Card
   └── Readiness Check
        └── Result Summary Panel
```

---

# 4. Page-by-Page Design

# 4.1 System Configuration Overview

## Purpose

Cho Admin và Operator xem nhanh trạng thái tổng thể của cấu hình hệ thống.

## Main Actions

* xem status từng nhóm cấu hình
* điều hướng nhanh đến trang con
* chạy readiness check nhanh

## Layout

```text
[Header]
  Title + description
  [Run Readiness Check] (Admin)

[Summary Cards Row]
  TS-D1000 | Cameras | Layout | Mappings | Mode

[Configuration Sections]
  TS-D1000 summary card
  Camera summary card
  Layout summary card
  Mapping summary card
  Mode summary card
```

## Components

* summary cards
* status badges
* quick action buttons
* section links

## Data Mapping

| UI Element           | Backend/API                                     |
| -------------------- | ----------------------------------------------- |
| Room name            | `rooms.name`                                    |
| Operation mode       | `rooms.operation_mode`                          |
| TS-D configured      | `/config/overview.tsdConnection.configured`     |
| TS-D last test       | `/config/overview.tsdConnection.lastTestResult` |
| Camera total/active  | `/config/overview.cameraSummary`                |
| Layout configured    | `/config/overview.layout.configured`            |
| Mapping total/active | `/config/overview.mappingSummary`               |

---

# 4.2 TS-D1000 Configuration Page

## Purpose

Cấu hình kết nối TS-D1000, test kết nối, sync danh sách unit.

## Main Actions

* tạo cấu hình
* sửa cấu hình
* test kết nối
* sync unit list

## Layout

```text
[Header]
  Title
  [Edit Configuration] (Admin)
  [Test Connection] (Admin)
  [Sync Units] (Admin)

[Connection Card]
  Base URL
  Username
  SSE Endpoint
  Last Test Result
  Last Test At

[Device Sync Summary]
  Total synced
  Last sync result
```

## Components

* read-only config card
* edit drawer
* primary/secondary action buttons
* test result badge
* sync summary panel

## Data Mapping

| UI Field         | Backend Field                             |
| ---------------- | ----------------------------------------- |
| Base URL         | `tsd_connection_configs.base_url`         |
| Username         | `tsd_connection_configs.username`         |
| SSE Endpoint     | `tsd_connection_configs.sse_endpoint`     |
| Last test result | `tsd_connection_configs.last_test_result` |
| Last test time   | `tsd_connection_configs.last_test_at`     |

---

# 4.3 Camera Configuration Page

## Purpose

Quản lý camera, test kết nối, xem capability, cấu hình preset.

## Main Actions

* thêm camera
* sửa camera
* deactivate camera
* test camera
* quản lý preset

## Layout

```text
[Header]
  Title
  [Add Camera] (Admin)

[Filter Bar]
  Search by name/IP
  Filter by status
  Filter by protocol

[Camera Table]

[Right Side or Bottom Detail Panel]
  Selected camera details
  Capabilities
  Presets
```

## Components

* table
* filter bar
* add/edit drawer
* deactivate confirm modal
* preset list panel
* test result badge

## Data Mapping

| UI Field          | Backend Field               |
| ----------------- | --------------------------- |
| Name              | `cameras.name`              |
| Protocol          | `cameras.protocol`          |
| IP Address        | `cameras.ip_address`        |
| Port              | `cameras.port`              |
| RTSP URL          | `cameras.rtsp_url`          |
| Vendor            | `cameras.vendor`            |
| Model             | `cameras.model`             |
| Status            | `cameras.status`            |
| PTZ capability    | `cameras.capability_ptz`    |
| Preset capability | `cameras.capability_preset` |
| Stream capability | `cameras.capability_stream` |
| Last test result  | `cameras.last_test_result`  |
| Last test at      | `cameras.last_test_at`      |

---

# 4.4 Layout & Map Page

## Purpose

Upload layout, đặt vị trí thiết bị, quản lý annotation.

## Main Actions

* upload layout
* replace layout
* drag-drop devices
* save positions
* add/edit annotation

## Layout

```text
[Header]
  Title
  [Upload/Replace Layout] (Admin)
  [Save Positions] (Admin)
  [Add Annotation] (Admin)

[Canvas Area - large]
  Layout image/PDF render
  Device icons
  Annotation labels

[Left Panel]
  Unplaced devices
  Cameras
  Units

[Right Panel]
  Selected item properties
  Position
  Label
```

## Components

* layout canvas
* draggable device items
* annotation modal
* upload modal
* selected-item inspector

## Data Mapping

| UI Element          | Backend Field                                                 |
| ------------------- | ------------------------------------------------------------- |
| Layout file         | `layouts.file_name`, `layouts.file_type`, `layouts.file_path` |
| Device position     | `layout_devices.pos_x`, `layout_devices.pos_y`                |
| Device label        | `layout_devices.icon_label`                                   |
| Annotation text     | `layout_annotations.text`                                     |
| Annotation position | `layout_annotations.pos_x`, `layout_annotations.pos_y`        |

---

# 4.5 Mic-Camera Mapping Page

## Purpose

Tạo và quản lý mapping giữa unit và camera preset.

## Main Actions

* xem mapping list
* tạo mapping
* sửa mapping
* lọc theo unit/camera
* kiểm tra trạng thái active

## Layout

```text
[Header]
  Title
  [Create Mapping] (Admin)

[Filter Bar]
  Search unit
  Filter by camera
  Filter by active status

[Mapping Table]
```

## Components

* mapping table
* create/edit drawer
* status badges
* validation messages
* linked camera/preset selectors

## Data Mapping

| UI Field | Backend Field                                                                     |
| -------- | --------------------------------------------------------------------------------- |
| Unit     | `mic_camera_mappings.unit_id` + join `tsd_units.external_unit_id / unit_name`     |
| Camera   | `mic_camera_mappings.camera_id` + join `cameras.name`                             |
| Preset   | `mic_camera_mappings.preset_id` + join `camera_presets.preset_code / preset_name` |
| Active   | `mic_camera_mappings.is_active`                                                   |

---

# 4.6 Operation Mode Page

## Purpose

Chọn mode vận hành hiện tại của room.

## Main Actions

* xem mode hiện tại
* đổi mode
* lưu mode

## Layout

```text
[Header]
  Title

[Mode Selection Card]
  Radio/Segmented control:
    ( ) MANUAL
    ( ) AUTOMATIC

  Description panel
  [Save] (Admin)
```

## Components

* segmented control / radio cards
* info panel
* save button
* current mode badge

## Data Mapping

| UI Field      | Backend Field          |
| ------------- | ---------------------- |
| Selected mode | `rooms.operation_mode` |

---

# 4.7 Readiness Check Page

## Purpose

Kiểm tra mức độ sẵn sàng của cấu hình hệ thống trước khi vận hành.

## Main Actions

* chạy readiness check
* xem kết quả từng category
* điều hướng tới phần cần sửa

## Layout

```text
[Header]
  Title
  [Run Check] (Admin)

[Overall Status Banner]

[Checklist Result Cards]
  TSD
  Cameras
  Layout
  Mapping
  Mode
```

## Components

* overall status banner
* checklist cards
* passed/warning/failed badges
* quick fix links

## Data Mapping

| UI Field       | Backend/API                                |
| -------------- | ------------------------------------------ |
| Overall status | `/config/readiness/check.overallStatus`    |
| Category       | `/config/readiness/check.items[].category` |
| Status         | `/config/readiness/check.items[].status`   |
| Message        | `/config/readiness/check.items[].message`  |

---

# 5. Forms & Validation Design

# 5.1 TS-D1000 Form

| Field        | Type     | Required | Validation           | Default      |
| ------------ | -------- | -------: | -------------------- | ------------ |
| Base URL     | text     |        Y | non-empty, URL-like  | empty        |
| Username     | text     |        N | trim                 | empty        |
| Password     | password |        N | trim                 | empty        |
| SSE Endpoint | text     |        N | if filled, non-empty | `/api/event` |

**Create Flow**

* open drawer
* fill form
* save
* success toast + refresh card

**Edit Flow**

* open drawer prefilled
* update changed fields
* save
* prompt: “Test connection recommended”

**Errors**

* `Base URL is required`
* `SSE endpoint must not be empty`

---

# 5.2 Camera Form

| Field      | Type     | Required | Validation  | Default |
| ---------- | -------- | -------: | ----------- | ------- |
| Name       | text     |        Y | non-empty   | empty   |
| Protocol   | select   |        Y | ONVIF/VISCA | ONVIF   |
| IP Address | text     |        Y | non-empty   | empty   |
| Port       | number   |        N | 1..65535    | empty   |
| Username   | text     |        N | trim        | empty   |
| Password   | password |        N | trim        | empty   |
| RTSP URL   | text     |        N | string      | empty   |
| Vendor     | text     |        N | trim        | empty   |
| Model      | text     |        N | trim        | empty   |

**Inline Validation**

* show below field on blur
* block submit if required invalid

**Errors**

* `Name is required`
* `Protocol is invalid`
* `IP address is required`
* `Port must be between 1 and 65535`
* `Maximum 4 active cameras allowed`

---

# 5.3 Preset Form

| Field       | Type | Required | Validation           |
| ----------- | ---- | -------: | -------------------- |
| Preset Code | text |        Y | unique within camera |
| Preset Name | text |        N | trim                 |

**Errors**

* `Preset code is required`
* `Preset code already exists for this camera`

---

# 5.4 Layout Upload Form

| Field | Type | Required | Validation        |
| ----- | ---- | -------: | ----------------- |
| File  | file |        Y | PDF/JPG/JPEG only |

**Errors**

* `Please select a file`
* `Only PDF, JPG, JPEG are allowed`

---

# 5.5 Annotation Form

| Field      | Type           | Required | Validation |
| ---------- | -------------- | -------: | ---------- |
| Text       | textarea       |        Y | non-empty  |
| Position X | hidden/runtime |        Y | 0..1       |
| Position Y | hidden/runtime |        Y | 0..1       |

**Errors**

* `Annotation text is required`
* `Annotation position is invalid`

---

# 5.6 Mapping Form

| Field  | Type              | Required | Validation            |
| ------ | ----------------- | -------: | --------------------- |
| Unit   | searchable select |        Y | must exist            |
| Camera | searchable select |        Y | must be active        |
| Preset | dependent select  |        Y | must belong to camera |
| Active | switch            |        Y | boolean               |

**Errors**

* `Unit is required`
* `Camera is required`
* `Preset is required`
* `Selected preset does not belong to selected camera`
* `Unit already has an active mapping`
* `Selected camera is inactive`

---

# 5.7 Operation Mode Form

| Field | Type              | Required | Validation       |
| ----- | ----------------- | -------: | ---------------- |
| Mode  | radio / segmented |        Y | MANUAL/AUTOMATIC |

**Errors**

* `Mode is required`

---

# 6. Table / List Design

# 6.1 Camera Table

| Column     | Type              | Notes       |
| ---------- | ----------------- | ----------- |
| Name       | text              | sortable    |
| Protocol   | badge             | filterable  |
| IP Address | text              | searchable  |
| Status     | badge             | filterable  |
| PTZ        | icon/yes-no       |             |
| Preset     | icon/yes-no       |             |
| Last Test  | badge + timestamp |             |
| Actions    | buttons           | row actions |

**Row Actions**

* View
* Edit
* Test
* Manage Presets
* Deactivate

**Empty State**

* `No cameras configured yet`
* show CTA `Add Camera` for Admin

---

# 6.2 Mapping Table

| Column         | Notes                   |
| -------------- | ----------------------- |
| Unit ID / Name | searchable              |
| Device Type    | chairman/delegate badge |
| Camera         | searchable              |
| Preset         |                         |
| Active         | badge                   |
| Actions        | edit                    |

**Filters**

* by camera
* by active status
* by device type

**Empty State**

* `No mappings configured`

---

# 6.3 TS-D Unit Sync Result List

Nếu có màn hình phụ hoặc modal:

| Column           | Notes                   |
| ---------------- | ----------------------- |
| External Unit ID |                         |
| Device Type      |                         |
| Status           | created/updated/skipped |

---

# 6.4 Pagination / Search

* Camera list: pagination if >10 rows
* Mapping list: pagination if >20 rows
* search should debounce ~300ms on frontend
* server-side filtering preferred for scalability

---

# 7. Interaction Flows

# 7.1 Configure TS-D1000

1. Admin mở TS-D1000 page
2. click `Create` hoặc `Edit`
3. nhập dữ liệu
4. click `Save`
5. success toast
6. UI hiển thị `Test Connection` CTA

# 7.2 Add Camera

1. Admin mở Cameras
2. click `Add Camera`
3. nhập form
4. save
5. row mới xuất hiện trong table
6. gợi ý `Test Camera`

# 7.3 Configure Layout

1. Admin upload layout
2. hệ thống render layout
3. Admin kéo thiết bị vào canvas
4. click `Save Positions`
5. success toast

# 7.4 Create Mapping

1. Admin mở Mappings
2. click `Create Mapping`
3. chọn unit
4. chọn camera
5. preset dropdown chỉ hiển thị preset của camera đã chọn
6. save
7. refresh table

# 7.5 Change Mode

1. Admin mở Mode page
2. chọn `MANUAL` hoặc `AUTOMATIC`
3. click `Save`
4. success toast + topbar mode badge update

# 7.6 Run Readiness Check

1. Admin mở Readiness Check
2. click `Run Check`
3. loading skeleton/spinner
4. hiển thị overall status + item list
5. từng item có link sang màn cần sửa

---

# 8. Role-Based Behavior

## 8.1 Visibility

| Screen / Action            | Admin | Operator |
| -------------------------- | :---: | :------: |
| View Overview              |   Y   |     Y    |
| View TS-D config           |   Y   |     Y    |
| Edit TS-D config           |   Y   |     N    |
| Sync units                 |   Y   |     N    |
| View cameras               |   Y   |     Y    |
| Add/Edit/Deactivate camera |   Y   |     N    |
| Manage presets             |   Y   |     N    |
| View layout                |   Y   |     Y    |
| Upload/replace layout      |   Y   |     N    |
| Move devices               |   Y   |     N    |
| Manage annotations         |   Y   |     N    |
| View mappings              |   Y   |     Y    |
| Create/Edit mappings       |   Y   |     N    |
| View mode                  |   Y   |     Y    |
| Change mode                |   Y   |     N    |
| Run readiness check        |   Y   |     N    |

## 8.2 UI Rules

* Operator thấy toàn bộ trang cấu hình ở dạng read-only
* nút action của Admin:

  * hidden hoàn toàn hoặc disabled + tooltip
* direct URL access:

  * backend phải chặn
  * frontend hiển thị 403 page nếu cần

---

# 9. State Handling

## 9.1 Loading State

* page-level skeleton for Overview
* table skeleton for Cameras / Mappings
* canvas loader for Layout
* button spinner for save/test/check actions

## 9.2 Empty State

* Cameras: no camera configured
* Layout: no layout uploaded
* Mappings: no mapping configured
* TS-D: no configuration yet

## 9.3 Error State

* inline form error
* section-level alert for API fail
* non-blocking banner for partial load issues

## 9.4 Success State

* toast message
* updated badge/table row
* timestamp refresh where relevant

---

# 10. Edge Case UX

## 10.1 Invalid Input

* field turns red
* message under field
* submit button remains enabled but submit returns inline errors, or disabled if form library supports real-time validity

## 10.2 Failed API Calls

* show section alert:

  * `Unable to save configuration`
  * `Connection test failed`
* keep user input intact in drawer/form

## 10.3 Conflicting Actions

### Deactivate camera in active mapping

* block action
* modal message:

  * `This camera is used by active mappings. Please update or deactivate related mappings first.`

### Create mapping when unit already has active mapping

* show business error inline in form or top-form alert

## 10.4 Restricted Access

* Operator opening edit page:

  * show read-only state or 403 if route is admin-only

## 10.5 Expired Session

* redirect login
* message:

  * `Session expired. Please login again.`

## 10.6 Missing Dependencies

### Layout page without uploaded layout

* show upload CTA, no canvas interactions

### Mapping form with no camera preset

* disable preset selector
* helper text:

  * `No presets available for selected camera`

---

# 11. Design System Guidelines

## 11.1 Buttons

| Type      | Usage                                           |
| --------- | ----------------------------------------------- |
| Primary   | Save, Add, Run Check                            |
| Secondary | Cancel, Back                                    |
| Tertiary  | View, Open Detail                               |
| Danger    | Deactivate, Replace if destructive confirmation |

## 11.2 Color Usage

| Meaning          | Color       |
| ---------------- | ----------- |
| Success / Passed | Green       |
| Warning          | Orange      |
| Failed / Error   | Red         |
| Info / Neutral   | Blue / Gray |

## 11.3 Badges

* `ACTIVE`: green
* `INACTIVE`: gray
* `OFFLINE`: red
* `MANUAL`: orange
* `AUTOMATIC`: blue
* `PASSED`: green
* `WARNING`: orange
* `FAILED`: red

## 11.4 Form Layout

* 2-column form for desktop
* 1-column on narrow window
* field spacing: 16px
* section spacing: 24px

## 11.5 Typography

* Page title: 24px semibold
* Section title: 18px semibold
* Body: 14–16px
* Helper/error text: 12–13px

## 11.6 Icon Usage

* connection: plug / network
* camera: camera icon
* map/layout: map pin / grid
* mapping: link icon
* mode: toggle icon
* readiness: checklist/shield icon

---

# 12. UX Improvements & Recommendations

## 12.1 Recommended Wizard Entry

Ngoài nav page thường, có thể thêm CTA:

* `Initial Setup`
  để dẫn Admin qua thứ tự:

1. TS-D1000
2. Sync Units
3. Add Cameras
4. Presets
5. Upload Layout
6. Place Devices
7. Create Mappings
8. Set Mode
9. Run Readiness Check

Điều này **không tạo business logic mới**, chỉ là UX shortcut cho first-time setup.

## 12.2 Smart Guidance

* sau khi save TS-D config → gợi ý `Test Connection`
* sau khi add camera → gợi ý `Test Camera`
* sau khi upload layout → gợi ý `Place Devices`
* sau khi sync units → gợi ý `Create Mappings`

## 12.3 Reduce User Errors

* preset selector phụ thuộc camera selector
* disable save nếu thiếu dependency rõ ràng
* highlight readiness issues bằng quick links

## 12.4 Accessibility Basics

* label rõ cho mọi field
* keyboard navigable drawers and modals
* focus ring visible
* sufficient text contrast
* table row actions accessible by keyboard

---

# 13. Frontend Implementation Notes

## 13.1 Suggested Component Map

* `ConfigOverviewPage`
* `TsdConfigPage`
* `TsdConfigDrawer`
* `CameraListPage`
* `CameraFormDrawer`
* `CameraPresetPanel`
* `LayoutEditorPage`
* `AnnotationModal`
* `MappingListPage`
* `MappingDrawer`
* `ModeConfigPage`
* `ReadinessCheckPage`

## 13.2 Suggested State Shape

```ts
type SystemConfigState = {
  overview: ConfigOverview | null;
  tsdConfig: TsdConfig | null;
  cameras: Camera[];
  layout: Layout | null;
  mappings: Mapping[];
  operationMode: "MANUAL" | "AUTOMATIC";
  readiness: ReadinessResult | null;
};
```

## 13.3 Route Suggestion

```text
/config
/config/tsd
/config/cameras
/config/layout
/config/mappings
/config/mode
/config/readiness
```

---

# 14. Final Summary

Thiết kế UI/UX cho **Cấu hình hệ thống** đã cover:

* cấu trúc page rõ ràng
* mapping trực tiếp UI ↔ backend
* forms + validation đầy đủ
* list/table cho camera và mapping
* read-only behavior cho Operator
* state handling cho loading / empty / error / success
* edge-case UX đúng với business rules
* sẵn sàng cho frontend React triển khai

---

[1]: https://www.toa-products.com/international/products/ts-d1000-series.html "TS-D1000 Series - Conference Systems - TOA Electronics"
