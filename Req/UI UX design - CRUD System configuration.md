# 1. UI/UX Overview

## 1.1 Mục tiêu

Thiết kế UI/UX cho module **CRUD Cấu hình hệ thống** phải cho phép:

* Admin tạo, xem, sửa, vô hiệu hóa cấu hình hệ thống
* Operator xem cấu hình ở chế độ read-only
* phản ánh đúng ràng buộc backend:

  * 1 TS-D1000 config active / room
  * 1 layout active / room
  * tối đa 4 camera active / room
  * 1 active mapping / unit
  * preset phải thuộc camera
  * camera inactive không được dùng trong active mapping

## 1.2 Người dùng

* **Admin**

  * full CRUD
  * test connection
  * sync units
  * readiness check
* **Operator**

  * chỉ xem

## 1.3 Nguyên tắc UX

* cấu hình theo đúng thứ tự triển khai thực tế
* read-only rõ ràng cho Operator
* ưu tiên flow ít click
* luôn hiển thị dependency giữa các cấu hình
* mọi lỗi business phải hiện rõ, không chỉ lỗi kỹ thuật

## 1.4 Assumptions

1. MVP chỉ có 1 room active.
2. CRUD của TS-D1000 config dùng `Deactivate/Replace`, không hard delete.
3. CRUD của camera/mapping ưu tiên `Deactivate` thay vì xóa vật lý nếu còn dependency.
4. Readiness check là thao tác đánh giá, không tự sửa dữ liệu.

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
* User menu:

  * username
  * role
  * logout

## 2.3 Breadcrumb

Ví dụ:

```text
System Configuration / Cameras
System Configuration / Layout & Map
System Configuration / Mappings
```

## 2.4 Navigation Rules

* Admin thấy toàn bộ action button
* Operator thấy cùng page structure nhưng:

  * nút create/edit/delete/test/check bị ẩn hoặc disabled
  * form hiển thị read-only
* direct URL vào action page vẫn phải bị backend chặn

---

# 3. Page Map

```text
System Configuration
   ├── Overview
   ├── TS-D1000
   │    ├── View Config
   │    ├── Create/Edit Drawer
   │    ├── Deactivate Confirm Modal
   │    ├── Test Connection Action
   │    └── Sync Units Action
   ├── Cameras
   │    ├── Camera List
   │    ├── Camera Detail Drawer/Page
   │    ├── Add/Edit Drawer
   │    ├── Deactivate Confirm Modal
   │    ├── Preset List Panel
   │    ├── Preset Create/Edit Drawer
   │    └── Preset Delete Confirm Modal
   ├── Layout & Map
   │    ├── Upload Layout Modal
   │    ├── Replace Layout Modal
   │    ├── Layout Editor Canvas
   │    ├── Device Placement Inspector
   │    ├── Annotation Create Modal
   │    └── Annotation Edit Modal
   ├── Mappings
   │    ├── Mapping List
   │    ├── Create/Edit Drawer
   │    └── Deactivate Confirm Modal
   ├── Operation Mode
   │    └── Mode Selector Card
   └── Readiness Check
        └── Result Summary Panel
```

---

# 4. Page-by-Page Design

# 4.1 System Configuration Overview

## Page Overview

**Purpose**

* xem nhanh toàn bộ cấu hình hệ thống
* xác định phần nào thiếu hoặc lỗi

**Main Actions**

* chuyển nhanh sang trang con
* chạy readiness check

## Layout

```text
[Header]
 Title + description
 [Run Readiness Check] (Admin)

[Summary Cards Row]
 TS-D1000 | Cameras | Layout | Mappings | Mode

[Detailed Sections]
 TS-D1000 summary
 Camera summary
 Layout summary
 Mapping summary
 Mode summary
```

## Components

* summary cards
* status badges
* quick links
* readiness CTA

## Data Mapping

| UI                   | API / Backend                                          |
| -------------------- | ------------------------------------------------------ |
| Room name            | `rooms.name`                                           |
| Operation mode       | `rooms.operation_mode`                                 |
| TS-D configured      | `GET /config/overview -> tsdConnection.configured`     |
| TS-D last test       | `GET /config/overview -> tsdConnection.lastTestResult` |
| Camera total/active  | `GET /config/overview -> cameraSummary`                |
| Layout configured    | `GET /config/overview -> layout.configured`            |
| Mapping total/active | `GET /config/overview -> mappingSummary`               |

## Interactions

* click summary card -> open corresponding page
* click readiness CTA -> readiness page or quick modal result

---

# 4.2 TS-D1000 Configuration Page

## Page Overview

**Purpose**

* tạo/xem/sửa/vô hiệu hóa cấu hình TS-D1000
* test kết nối
* sync unit list

**Main Actions**

* Create Configuration
* Edit Configuration
* Deactivate
* Test Connection
* Sync Units

## Layout

```text
[Header]
 Title
 [Create/Edit] [Test] [Sync Units] [Deactivate]

[Connection Card]
 Base URL
 Username
 SSE Endpoint
 Status
 Last Test Result
 Last Test At

[Sync Summary Section]
 Last Sync Time
 Synced / Created / Updated / Skipped
```

## Components

* config info card
* create/edit drawer
* action buttons
* deactivate confirm modal
* sync result table/modal

## Data Mapping

| UI Field         | Backend                                   |
| ---------------- | ----------------------------------------- |
| Base URL         | `tsd_connection_configs.base_url`         |
| Username         | `tsd_connection_configs.username`         |
| SSE Endpoint     | `tsd_connection_configs.sse_endpoint`     |
| Active state     | `tsd_connection_configs.is_active`        |
| Last test result | `tsd_connection_configs.last_test_result` |
| Last test at     | `tsd_connection_configs.last_test_at`     |

---

# 4.3 Camera List Page

## Page Overview

**Purpose**

* quản lý danh sách camera trong room

**Main Actions**

* add camera
* view detail
* edit
* deactivate
* test connection
* open preset management

## Layout

```text
[Header]
 Title
 [Add Camera] (Admin)

[Filter Bar]
 Search by name/IP
 Filter by status
 Filter by protocol

[Table]
```

## Components

* searchable/filterable table
* row action menu
* status badges
* test result badge

## Data Mapping

| Column     | Backend                                    |
| ---------- | ------------------------------------------ |
| Name       | `cameras.name`                             |
| Protocol   | `cameras.protocol`                         |
| IP Address | `cameras.ip_address`                       |
| Status     | `cameras.status`                           |
| PTZ        | `cameras.capability_ptz`                   |
| Preset     | `cameras.capability_preset`                |
| Stream     | `cameras.capability_stream`                |
| Last Test  | `cameras.last_test_result`, `last_test_at` |

---

# 4.4 Camera Detail / Edit Drawer

## Page Overview

**Purpose**

* xem chi tiết camera
* sửa camera
* test camera
* quản lý preset

## Layout

```text
[Drawer Header]
 Camera Name
 [Save] [Test] [Deactivate]

[General Info]
 Name / Protocol / IP / Port

[Credentials]
 Username / Password

[Streaming]
 RTSP URL

[Vendor Info]
 Vendor / Model

[Capabilities]
 PTZ / Preset / Stream

[Preset Section]
 Preset list + Add Preset
```

## Components

* form sections
* capability badges
* preset table/list
* inline actions

## Data Mapping

Toàn bộ map trực tiếp tới `cameras.*` và preset list từ `camera_presets`.

---

# 4.5 Preset Management

## Page Overview

**Purpose**

* tạo/sửa/xóa preset theo camera

**Main Actions**

* add preset
* edit preset
* delete preset

## Layout

Có thể nằm trong **camera detail drawer** hoặc tab riêng:

```text
[Preset List]
 Code | Name | Actions
```

## Components

* compact table/list
* preset form drawer
* delete confirm modal

## Data Mapping

| UI          | Backend                      |
| ----------- | ---------------------------- |
| Preset Code | `camera_presets.preset_code` |
| Preset Name | `camera_presets.preset_name` |
| Camera      | `camera_presets.camera_id`   |

---

# 4.6 Layout & Map Page

## Page Overview

**Purpose**

* upload/replace layout
* đặt vị trí unit/camera
* tạo/sửa annotation

## Main Actions

* upload layout
* replace layout
* drag-drop devices
* save positions
* add/update annotation

## Layout

```text
[Header]
 Title
 [Upload/Replace Layout] [Save Positions] [Add Annotation]

[Left Sidebar]
 Unplaced Units
 Unplaced Cameras

[Center Canvas]
 Layout image/PDF render
 Device icons
 Annotation labels

[Right Inspector]
 Selected item
 Coordinates
 Label / metadata
```

## Components

* canvas/editor
* draggable icons
* upload modal
* annotation modal
* inspector panel

## Data Mapping

| UI                  | Backend                                                |
| ------------------- | ------------------------------------------------------ |
| Layout file         | `layouts.file_name`, `file_type`, `file_path`          |
| Device position     | `layout_devices.pos_x`, `layout_devices.pos_y`         |
| Device label        | `layout_devices.icon_label`                            |
| Annotation text     | `layout_annotations.text`                              |
| Annotation position | `layout_annotations.pos_x`, `layout_annotations.pos_y` |

---

# 4.7 Mapping List Page

## Page Overview

**Purpose**

* quản lý mapping giữa unit và camera preset

## Main Actions

* create mapping
* edit mapping
* deactivate mapping
* filter/search mapping

## Layout

```text
[Header]
 Title
 [Create Mapping] (Admin)

[Filter Bar]
 Search unit
 Filter camera
 Filter active
 Filter device type

[Mapping Table]
```

## Components

* table
* filter bar
* create/edit drawer
* deactivate confirm modal
* active badge

## Data Mapping

| Column      | Backend                                                 |
| ----------- | ------------------------------------------------------- |
| Unit        | `mic_camera_mappings.unit_id` + join `tsd_units`        |
| Device Type | `tsd_units.device_type`                                 |
| Camera      | `mic_camera_mappings.camera_id` + join `cameras.name`   |
| Preset      | `mic_camera_mappings.preset_id` + join `camera_presets` |
| Active      | `mic_camera_mappings.is_active`                         |

---

# 4.8 Operation Mode Page

## Page Overview

**Purpose**

* xem và đổi mode vận hành của room

## Main Actions

* view current mode
* change mode
* save mode

## Layout

```text
[Header]
 Title

[Mode Card]
 ( ) MANUAL
 ( ) AUTOMATIC

[Description Section]
 Meaning of selected mode

[Save Button]
```

## Components

* radio cards or segmented control
* current mode badge
* save button

## Data Mapping

| UI            | Backend                |
| ------------- | ---------------------- |
| Selected mode | `rooms.operation_mode` |

---

# 4.9 Readiness Check Page

## Page Overview

**Purpose**

* đánh giá mức độ sẵn sàng của cấu hình trước khi vận hành

## Main Actions

* run check
* view category result
* jump to fix page

## Layout

```text
[Header]
 Title
 [Run Check] (Admin)

[Overall Status Banner]

[Checklist Cards]
 TSD
 Cameras
 Layout
 Mapping
 Mode
```

## Components

* overall status banner
* checklist items
* status badges
* quick-fix links

## Data Mapping

| UI             | API                                        |
| -------------- | ------------------------------------------ |
| Overall Status | `/config/readiness/check.overallStatus`    |
| Category       | `/config/readiness/check.items[].category` |
| Status         | `/config/readiness/check.items[].status`   |
| Message        | `/config/readiness/check.items[].message`  |

---

# 5. Forms & Validation Design

# 5.1 TS-D1000 Form

| Field        | Type     | Required | Validation           | Default      |
| ------------ | -------- | -------: | -------------------- | ------------ |
| Base URL     | text     |        Y | non-empty            | empty        |
| Username     | text     |        N | trim                 | empty        |
| Password     | password |        N | trim                 | empty        |
| SSE Endpoint | text     |        N | non-empty if entered | `/api/event` |

**Create Flow**

* empty form in drawer
* submit -> create
* success toast
* prompt to test connection

**Edit Flow**

* prefilled drawer
* change fields
* save
* keep current config card updated

**Errors**

* `Base URL is required`
* `SSE endpoint must not be empty`

---

# 5.2 Camera Form

| Field      | Type     | Required | Validation       |
| ---------- | -------- | -------: | ---------------- |
| Name       | text     |        Y | non-empty        |
| Protocol   | select   |        Y | ONVIF/VISCA only |
| IP Address | text     |        Y | non-empty        |
| Port       | number   |        N | 1..65535         |
| Username   | text     |        N | trim             |
| Password   | password |        N | trim             |
| RTSP URL   | text     |        N | string           |
| Vendor     | text     |        N | trim             |
| Model      | text     |        N | trim             |

**Business Errors**

* `Maximum 4 active cameras allowed`
* `A camera with the same IP and port already exists`

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

* `Only PDF, JPG, JPEG files are allowed`

---

# 5.5 Annotation Form

| Field      | Type           | Required | Validation |
| ---------- | -------------- | -------: | ---------- |
| Text       | textarea       |        Y | non-empty  |
| Position X | hidden/runtime |        Y | 0..1       |
| Position Y | hidden/runtime |        Y | 0..1       |

---

# 5.6 Mapping Form

| Field  | Type              | Required | Validation                     |
| ------ | ----------------- | -------: | ------------------------------ |
| Unit   | searchable select |        Y | must exist                     |
| Camera | searchable select |        Y | must be active                 |
| Preset | dependent select  |        Y | must belong to selected camera |
| Active | switch            |        Y | boolean                        |

**Business Errors**

* `Selected preset does not belong to selected camera`
* `Unit already has an active mapping`
* `Selected camera is inactive`

---

# 5.7 Operation Mode Form

| Field | Type              | Required | Validation             |
| ----- | ----------------- | -------: | ---------------------- |
| Mode  | radio / segmented |        Y | `MANUAL` / `AUTOMATIC` |

---

# 6. Table / List Design

# 6.1 Camera Table

| Column     | Sort | Filter | Notes              |
| ---------- | :--: | :----: | ------------------ |
| Name       |   Y  | Search |                    |
| Protocol   |   Y  |    Y   | badge              |
| IP Address |   N  | Search |                    |
| Status     |   Y  |    Y   | badge              |
| PTZ        |   N  |    Y   | icon               |
| Preset     |   N  |    Y   | icon               |
| Last Test  |   Y  |    Y   | result + timestamp |
| Actions    |   N  |    N   | row menu           |

**Row Actions**

* View
* Edit
* Test
* Manage Presets
* Deactivate

**Empty State**

* `No cameras configured yet`

**Loading State**

* skeleton rows

---

# 6.2 Preset List

| Column      | Notes                   |
| ----------- | ----------------------- |
| Preset Code | searchable if long list |
| Preset Name |                         |
| Actions     | edit / delete           |

**Empty State**

* `No presets configured`

---

# 6.3 Mapping Table

| Column      | Sort | Filter |
| ----------- | :--: | :----: |
| Unit        |   Y  | Search |
| Device Type |   Y  |    Y   |
| Camera      |   Y  |    Y   |
| Preset      |   N  |    N   |
| Active      |   Y  |    Y   |
| Actions     |   N  |    N   |

**Row Actions**

* Edit
* Deactivate

---

# 6.4 Search / Pagination Rules

* server-side filtering preferred
* debounce search 300ms
* pagination:

  * cameras: >10 rows
  * mappings: >20 rows
  * presets: only if large list

---

# 7. Interaction Flows

# 7.1 Create TS-D Config

1. Open TS-D page
2. Click `Create Configuration`
3. Fill form
4. Save
5. Show success toast
6. Show `Test Connection` prompt

# 7.2 Add Camera

1. Open Cameras
2. Click `Add Camera`
3. Fill camera form
4. Save
5. Refresh table
6. Offer `Test Camera`

# 7.3 Create Preset

1. Open Camera Detail
2. Open Preset panel
3. Click `Add Preset`
4. Fill preset form
5. Save
6. Update preset list

# 7.4 Upload / Replace Layout

1. Open Layout page
2. Click `Upload Layout` or `Replace Layout`
3. Select file
4. Confirm if replace
5. Upload
6. Render new layout

# 7.5 Place Devices

1. Drag unit/camera from side panel
2. Drop on canvas
3. Adjust if needed
4. Click `Save Positions`
5. Show success toast

# 7.6 Create Mapping

1. Open Mappings
2. Click `Create Mapping`
3. Select unit
4. Select camera
5. Load preset list based on camera
6. Select preset
7. Save
8. Refresh table

# 7.7 Deactivate Camera

1. Click `Deactivate`
2. Backend checks dependency
3. If dependency exists -> show business error modal/alert
4. Else confirm
5. Success toast

# 7.8 Change Mode

1. Open Operation Mode
2. Choose mode
3. Save
4. Update top bar badge

# 7.9 Run Readiness Check

1. Click `Run Check`
2. Show loading
3. Render category cards
4. Click failed item -> navigate to target config page

---

# 8. State Handling

## 8.1 Loading

* page skeleton for Overview
* table skeleton for Cameras/Mappings
* canvas placeholder for Layout
* button spinner for Save/Test/Sync/Check

## 8.2 Empty

* no TS-D config
* no cameras
* no presets
* no layout
* no mappings

Each empty state should include:

* explanation
* Admin CTA where relevant

## 8.3 Error

* inline form errors
* section-level alert for API failures
* modal-level error for destructive action conflicts

## 8.4 Success

* toast confirmation
* refreshed card/table/list
* timestamp update for test actions

---

# 9. Role-Based Behavior

| Screen / Action                    | Admin | Operator |
| ---------------------------------- | :---: | :------: |
| View Overview                      |   Y   |     Y    |
| View TS-D config                   |   Y   |     Y    |
| Create/Edit/Deactivate TS-D config |   Y   |     N    |
| Sync units                         |   Y   |     N    |
| View cameras                       |   Y   |     Y    |
| Add/Edit/Deactivate camera         |   Y   |     N    |
| View presets                       |   Y   |     Y    |
| Create/Edit/Delete preset          |   Y   |     N    |
| View layout                        |   Y   |     Y    |
| Upload/Replace layout              |   Y   |     N    |
| Place devices                      |   Y   |     N    |
| Add/Edit annotations               |   Y   |     N    |
| View mappings                      |   Y   |     Y    |
| Create/Edit/Deactivate mappings    |   Y   |     N    |
| View mode                          |   Y   |     Y    |
| Update mode                        |   Y   |     N    |
| Run readiness                      |   Y   |     N    |

## UI Rules

* Operator sees pages in read-only mode
* admin-only actions:

  * hidden by default, or
  * disabled with tooltip in selected places
* backend permission remains source of truth

---

# 10. Edge Case UX

## 10.1 Invalid Input

* field border red
* message below field
* preserve entered data

## 10.2 API Failure

* form stays open
* show inline/top-form alert
* no silent reset

## 10.3 Conflict Cases

### Camera in active mapping

Message:

* `This camera is referenced by active mappings. Please update or deactivate related mappings first.`

### Preset in active mapping

Message:

* `This preset is used by active mappings and cannot be deleted.`

### Duplicate active mapping

Message:

* `Selected unit already has an active mapping.`

## 10.4 Restricted Access

* Operator opening admin-only route:

  * show 403 page or redirect to Overview

## 10.5 Session Expired

* redirect to login
* message:

  * `Session expired. Please login again.`

## 10.6 Missing Dependency UX

### No layout

* show upload CTA
* hide canvas interactions

### No presets for selected camera

* disable preset dropdown
* helper text:

  * `No presets available for selected camera`

---

# 11. Design System Guidelines

## 11.1 Buttons

| Type      | Usage                      |
| --------- | -------------------------- |
| Primary   | Save, Add, Run Check, Sync |
| Secondary | Cancel, Back               |
| Tertiary  | View Detail                |
| Danger    | Deactivate, Delete         |

## 11.2 Colors

| Meaning            | Color  |
| ------------------ | ------ |
| Success            | Green  |
| Warning            | Orange |
| Error / Failed     | Red    |
| Info               | Blue   |
| Inactive / Neutral | Gray   |

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

* desktop: 2-column when possible
* drawer width: medium for forms, large for camera detail
* 16px field spacing
* 24px section spacing

## 11.5 Typography

* page title: 24px semibold
* section title: 18px semibold
* body: 14-16px
* helper/error: 12-13px

## 11.6 Icons

* TS-D: network/device icon
* camera: camera icon
* preset: bookmark/target icon
* layout: map/grid icon
* mapping: link icon
* readiness: checklist icon

---

# 12. UX Improvements & Recommendations

## 12.1 Setup Wizard Entry

Nên có CTA:

* `Initial Setup`

Flow:

1. TS-D Config
2. Sync Units
3. Add Cameras
4. Presets
5. Upload Layout
6. Place Devices
7. Create Mappings
8. Set Mode
9. Run Readiness

Đây chỉ là **shortcut UX**, không thêm business logic mới.

## 12.2 Smart Next Action

* save TS-D config -> suggest test
* add camera -> suggest test
* upload layout -> suggest place devices
* sync units -> suggest create mappings

## 12.3 Dependency Awareness

* mapping form phải load preset theo camera
* deactivate/delete actions phải cảnh báo dependency rõ ràng
* readiness page nên có quick link sang màn sửa lỗi

## 12.4 Accessibility Basics

* labels đầy đủ
* keyboard navigable
* visible focus state
* readable contrast
* screen reader-friendly action labels

---

# 13. Frontend Implementation Notes

## Suggested Routes

```text
/config
/config/tsd
/config/cameras
/config/cameras/:id
/config/layout
/config/mappings
/config/mode
/config/readiness
```

## Suggested Core Components

* `ConfigOverviewPage`
* `TsdConfigPage`
* `TsdConfigDrawer`
* `CameraListPage`
* `CameraDetailDrawer`
* `CameraFormDrawer`
* `PresetFormDrawer`
* `LayoutEditorPage`
* `AnnotationModal`
* `MappingListPage`
* `MappingDrawer`
* `OperationModePage`
* `ReadinessCheckPage`

## Suggested State Shape

```ts
type SystemConfigState = {
  overview: ConfigOverview | null;
  tsdConfig: TsdConfig | null;
  cameras: Camera[];
  selectedCamera: Camera | null;
  presets: CameraPreset[];
  layout: Layout | null;
  layoutDevices: LayoutDevice[];
  annotations: LayoutAnnotation[];
  mappings: Mapping[];
  operationMode: "MANUAL" | "AUTOMATIC";
  readiness: ReadinessResult | null;
};
```

---

# 14. Final Summary

UI/UX cho **CRUD Cấu hình hệ thống** đã cover:

* page map đầy đủ
* CRUD screens cho TS-D, camera, preset, layout, mapping
* mode + readiness
* forms, validation, tables, actions
* role-based behavior
* edge-case UX
* developer-friendly mapping UI -> backend
