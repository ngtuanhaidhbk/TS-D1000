# Unit Test Input Specification - System Configuration

## 1. Test Scope Summary

### 1.1 Scope

Tài liệu này xác định đầu vào kiểm thử đơn vị cho module **System Configuration**, bao gồm:

* configuration overview
* TS-D1000 configuration
* TS-D1000 unit sync
* camera configuration
* camera preset configuration
* layout upload and map placement
* layout annotation
* mic-camera mapping
* operation mode configuration
* readiness check
* role-based access for `ADMIN` / `OPERATOR`

### 1.2 Roles In Scope

* `ADMIN`
* `OPERATOR`

### 1.3 Test Objectives

* xác nhận business rules của cấu hình hệ thống
* xác nhận validation field-level, cross-field, business validation
* xác nhận permission `ADMIN` vs `OPERATOR`
* xác nhận UI read-only behavior cho `OPERATOR`
* xác nhận error handling, empty state, loading state, success state
* xác nhận mapping UI ↔ API ↔ data model

### 1.4 Out Of Scope

* authentication flow chi tiết
* runtime event engine
* live video playback
* anti-jitter runtime logic
* multi-room orchestration

---

## 2. Modules / Features to Test

| Module | Feature | Related UC | Related API | Related UI |
| ------ | ------- | ---------- | ----------- | ---------- |
| Overview | View system config overview | UC-CONFIG-01 | `GET /config/overview` | `ConfigOverviewPage` |
| TS-D1000 | Create config | UC-TSDCFG-01 | `POST /config/tsd` | `TsdConfigDrawer` |
| TS-D1000 | Update config | UC-TSDCFG-02 | `PUT /config/tsd/{id}` | `TsdConfigDrawer` |
| TS-D1000 | Test connection | UC-TEST-01 | `POST /config/tsd/{id}/test` | `TsdConfigPage` |
| TS-D1000 | Sync units | UC-TSDCFG-03 | `POST /config/tsd/{id}/sync-units` | `TsdConfigPage` |
| Cameras | List cameras | UC-CONFIG-01 | `GET /config/cameras` | `CameraListPage` |
| Cameras | Add camera | UC-CFGCAM-01 | `POST /config/cameras` | `CameraFormDrawer` |
| Cameras | Update camera | UC-CFGCAM-02 | `PUT /config/cameras/{id}` | `CameraFormDrawer` |
| Cameras | Deactivate camera | UC-CFGCAM-03 | `PATCH /config/cameras/{id}/deactivate` | deactivate modal |
| Cameras | Test camera | UC-TEST-02 | `POST /config/cameras/{id}/test` | `CameraListPage` |
| Presets | List presets | UC-CFGCAM-04 | `GET /config/cameras/{id}/presets` | `CameraPresetPanel` |
| Presets | Create/update preset | UC-CFGCAM-04 | `POST /config/cameras/{id}/presets`, `PUT /config/presets/{id}` | preset form |
| Layout | Upload layout | UC-LAYOUT-01 | `POST /config/layout` | upload modal |
| Layout | View layout | UC-CONFIG-01 | `GET /config/layout` | `LayoutEditorPage` |
| Layout | Save device positions | UC-LAYOUT-02 | `PUT /config/layout/devices` | layout canvas |
| Layout | Create/update annotation | UC-LAYOUT-03 | `POST/PUT /config/layout/annotations` | `AnnotationModal` |
| Mapping | List mappings | UC-MAPCFG-03 | `GET /config/mappings` | `MappingListPage` |
| Mapping | Create mapping | UC-MAPCFG-01 | `POST /config/mappings` | `MappingDrawer` |
| Mapping | Update mapping | UC-MAPCFG-02 | `PUT /config/mappings/{id}` | `MappingDrawer` |
| Mode | View mode | UC-CONFIG-01 | `GET /config/mode` | `ModeConfigPage` |
| Mode | Update mode | UC-MODE-01 | `PUT /config/mode` | `ModeConfigPage` |
| Readiness | Run readiness check | UC-TEST-03 | `POST /config/readiness/check` | `ReadinessCheckPage` |

---

## 3. Requirement-to-Test Mapping

| Requirement / Rule | Test Area |
| ------------------ | --------- |
| Only `ADMIN` may modify configuration | permission tests for all write APIs and edit actions |
| `OPERATOR` is view-only | read-only UI tests and `403` API tests |
| One active TS-D config per room | TS-D create/update conflict tests |
| Maximum 4 active cameras | camera create business rule tests |
| Preset must belong to selected camera | mapping validation tests |
| One active mapping per unit | mapping create/update conflict tests |
| Inactive camera cannot be used in active mapping | mapping validation tests |
| Layout accepts only PDF/JPG/JPEG | layout upload validation tests |
| `posX`, `posY` must be 0..1 | layout device / annotation validation tests |
| Readiness check is read-only | service behavior and side-effect tests |
| Test connection updates latest result/time | TS-D/camera test service tests |
| Deactivate camera blocked if active mappings reference it | camera deactivate business rule tests |

---

## 4. Backend Unit Test Input Matrix

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock / Dependency Setup | Action | Expected Result | Expected Error | Notes |
| ------------ | ---------------- | ------------------------- | -------------- | ------------- | ---------- | ----------------------- | ------ | --------------- | -------------- | ----- |
| SC-BE-001 | Overview | UC-CONFIG-01 | trả overview đầy đủ khi có đủ dữ liệu | room exists | `roomId=room-01`, actor=`ADMIN` | mock room, tsd config, layout, camera summary, mapping summary | call `getOverview` | aggregated overview returned | null | happy path |
| SC-BE-002 | Overview | UC-CONFIG-01 | trả configured=false hoặc count=0 khi thiếu data | room exists | same | mock no tsd, no layout, no camera, no mapping | call `getOverview` | no exception, empty summary returned | null | empty-state backend |
| SC-BE-003 | Overview | permission | chặn actor không có quyền | room exists | actor role invalid | mock room exists | call `getOverview` | no data returned | `FORBIDDEN` | if non-admin/operator is modeled |
| SC-BE-004 | TS-D create | UC-TSDCFG-01 | tạo config TS-D hợp lệ | room exists, no config | valid `baseUrl`, `username`, `password`, `sseEndpoint` | mock room repo, encryptor, repo save | `createConfig` | config persisted, encrypted password, audit written | null | happy path |
| SC-BE-005 | TS-D create | validation | reject missing `baseUrl` | room exists | `baseUrl=""` | mock validator | `createConfig` | no insert | `VALIDATION_ERROR` | field required |
| SC-BE-006 | TS-D create | conflict | reject second config for room | existing active config | valid payload | mock existing config | `createConfig` | no insert | `TSD_CONFIG_EXISTS` / 409 | one active config rule |
| SC-BE-007 | TS-D update | UC-TSDCFG-02 | update config and re-encrypt password if changed | config exists | new password | mock existing config + encryptor | `updateConfig` | updated persisted | null | changed secret path |
| SC-BE-008 | TS-D update | not found | reject missing config | no config | valid payload | repo returns null | `updateConfig` | no update | `CONFIG_NOT_FOUND` | |
| SC-BE-009 | TS-D test | UC-TEST-01 | mark success and update timestamp | config exists | configId valid | mock adapter returns success | `test(configId)` | `lastTestResult=SUCCESS`, `lastTestAt` updated | null | side effect required |
| SC-BE-010 | TS-D test | integration error | mark failed when unreachable | config exists | configId valid | mock adapter throws unreachable | `test(configId)` | failed status persisted | `TSD_UNREACHABLE` | system log expected |
| SC-BE-011 | TS-D sync | UC-TSDCFG-03 | create and update unit list correctly | config exists | TS-D payload with 3 units, 1 existing | mock external API + repos | `syncUnits` | counts `synced=3`, `created=2`, `updated=1` | null | happy path |
| SC-BE-012 | TS-D sync | malformed external | skip invalid row and log warning | config exists | payload contains 1 valid, 1 missing external id | mock parser/log | `syncUnits` | valid row processed, skipped count/log written | null or warning result | partial success |
| SC-BE-013 | Camera create | UC-CFGCAM-01 | create camera with valid payload | active cameras < 4 | valid camera payload | mock repo count=2, encryptor, insert | `createCamera` | new camera persisted | null | |
| SC-BE-014 | Camera create | validation | reject invalid protocol | active cameras < 4 | `protocol="HTTP"` | validator mock | `createCamera` | no insert | `VALIDATION_ERROR` | enum validation |
| SC-BE-015 | Camera create | business rule | reject when active camera count reaches 4 | count active = 4 | valid payload | repo count=4 | `createCamera` | no insert | `CAMERA_LIMIT_REACHED` | max 4 rule |
| SC-BE-016 | Camera create | conflict | reject duplicate IP/port in room | room camera exists | same `ipAddress`, `port` | repo duplicate check | `createCamera` | no insert | `CAMERA_DUPLICATE_ENDPOINT` | uniqueness |
| SC-BE-017 | Camera update | UC-CFGCAM-02 | update camera fields | camera exists | changed RTSP/vendor | mock load + save | `updateCamera` | changed fields saved | null | |
| SC-BE-018 | Camera deactivate | UC-CFGCAM-03 | deactivate active camera without dependent mappings | camera active | cameraId | mock no active mapping refs | `deactivateCamera` | status becomes `INACTIVE` | null | |
| SC-BE-019 | Camera deactivate | business rule | block deactivate when active mapping references camera | camera active | cameraId | mock active mapping exists | `deactivateCamera` | status unchanged | `CAMERA_ALREADY_IN_USE` / 422 | critical business rule |
| SC-BE-020 | Camera deactivate | invalid state | reject already inactive camera | camera inactive | cameraId | mock inactive camera | `deactivateCamera` | no update | `CAMERA_ALREADY_INACTIVE` / 409 | |
| SC-BE-021 | Camera test | UC-TEST-02 | detect full capability success | camera exists | cameraId | adapter returns ptz/preset/stream true | `test(cameraId)` | status updated to `SUCCESS` and capability flags persisted | null | |
| SC-BE-022 | Camera test | partial success | set partial result when stream unsupported | camera exists | cameraId | adapter returns ptz=true,preset=true,stream=false | `test(cameraId)` | `PARTIAL` result persisted | null | partial success rule |
| SC-BE-023 | Camera test | unsupported adapter | reject unsupported camera adapter | camera exists | camera protocol/vendor combo | adapter factory returns unsupported | `test(cameraId)` | no successful update | `CAMERA_ADAPTER_UNSUPPORTED` | |
| SC-BE-024 | Preset create | UC-CFGCAM-04 | create preset when code unique | camera exists | `presetCode=P01`, `presetName=Delegate 01` | mock camera active and unique check | create preset | preset saved | null | |
| SC-BE-025 | Preset create | conflict | reject duplicate preset code in same camera | camera exists | duplicate `presetCode` | repo duplicate mock | create preset | no insert | `PRESET_CODE_EXISTS` | |
| SC-BE-026 | Preset create | business rule | reject when camera does not support preset | camera capability false | valid preset payload | mock capability false | create preset | no insert | `PRESET_NOT_SUPPORTED` | |
| SC-BE-027 | Layout upload | UC-LAYOUT-01 | upload valid PDF layout | admin actor | file `layout.pdf` | storage mock success | `uploadLayout` | layout upserted and file stored | null | |
| SC-BE-028 | Layout upload | validation | reject invalid file type | admin actor | file `layout.png` | mime/ext validator | `uploadLayout` | no store | `INVALID_FILE_TYPE` | |
| SC-BE-029 | Layout positions | UC-LAYOUT-02 | save valid device positions | layout exists | valid device array | mock layout exists, refs exist | `savePositions` | upserted positions saved | null | |
| SC-BE-030 | Layout positions | validation | reject `posX` out of range | layout exists | `posX=1.2` | validator | `savePositions` | no save | `VALIDATION_ERROR` | boundary check |
| SC-BE-031 | Layout positions | cross-field | reject invalid `refType/refId` relation | layout exists | `refType=CAMERA`, `refId=missing` | ref lookup null | `savePositions` | no save | `REF_NOT_FOUND` | |
| SC-BE-032 | Layout positions | payload rule | reject duplicate same device in same request | layout exists | same `refType+refId` twice | validator | `savePositions` | no save | `DUPLICATE_LAYOUT_DEVICE` | |
| SC-BE-033 | Annotation save | UC-LAYOUT-03 | create annotation with valid text and position | layout exists | `text`, `posX`, `posY` valid | repo save mock | `saveAnnotation` | annotation saved | null | |
| SC-BE-034 | Annotation save | validation | reject blank text | layout exists | `text=""` | validator | `saveAnnotation` | no save | `VALIDATION_ERROR` | |
| SC-BE-035 | Mapping create | UC-MAPCFG-01 | create valid active mapping | unit/camera/preset exist, same room, camera active, no existing active mapping | valid IDs | repo and joins mocked | `createMapping` | mapping inserted active | null | |
| SC-BE-036 | Mapping create | cross-field | reject preset not belonging to selected camera | entities exist | cameraId A, presetId from camera B | preset relation mock mismatch | `createMapping` | no insert | `PRESET_CAMERA_MISMATCH` | |
| SC-BE-037 | Mapping create | business rule | reject inactive camera in active mapping | camera inactive | valid IDs | camera status `INACTIVE` | `createMapping` | no insert | `CAMERA_INACTIVE` | |
| SC-BE-038 | Mapping create | conflict | reject unit with existing active mapping | unit already active mapped | valid IDs | existing active mapping mock | `createMapping` | no insert | `ACTIVE_MAPPING_EXISTS` | |
| SC-BE-039 | Mapping update | UC-MAPCFG-02 | update preset for existing mapping | mapping exists | new valid preset in same camera | load/save mocks | `updateMapping` | mapping updated | null | |
| SC-BE-040 | Mapping update | conflict | reject creating second active mapping for same unit | other active mapping exists | mapping update with `isActive=true` | duplicate active check mock | `updateMapping` | no update | `ACTIVE_MAPPING_EXISTS` | |
| SC-BE-041 | Mapping list | UC-MAPCFG-03 | return joined mapping list for admin/operator | mappings exist | actor=`OPERATOR` | query mock returns rows | `listMappings` | joined list returned | null | read-only role |
| SC-BE-042 | Mode update | UC-MODE-01 | update room mode to `AUTOMATIC` | room exists | `mode=AUTOMATIC` | room repo mock | `updateMode` | room operation mode updated | null | |
| SC-BE-043 | Mode update | validation | reject invalid enum | room exists | `mode=SEMI_AUTO` | validator | `updateMode` | no update | `VALIDATION_ERROR` | |
| SC-BE-044 | Readiness | UC-TEST-03 | compute `PASSED` when all required config valid | room + all config present | roomId | mock all categories pass | `check(roomId)` | `overallStatus=PASSED` | null | |
| SC-BE-045 | Readiness | warning | compute `WARNING` when optional/partial issue exists | some mappings missing, others valid | roomId | mock mapping gaps only | `check(roomId)` | `overallStatus=WARNING`, item message reflects gap | null | |
| SC-BE-046 | Readiness | failed | compute `FAILED` when required config missing | no layout or no tsd config | roomId | mock missing required category | `check(roomId)` | `overallStatus=FAILED` | null | |
| SC-BE-047 | Permission guard | role restriction | block operator on write API service path | actor=`OPERATOR` | valid create payload | role guard or service role check mock | call write service | no mutation | `FORBIDDEN` | apply to all mutating services |
| SC-BE-048 | Audit side effect | logging | verify audit log written for successful create mapping | valid state | valid mapping payload | audit service mock/spies | create mapping | audit called once with target detail | null | side effect |
| SC-BE-049 | System log side effect | integration failure | verify system log written on TS-D sync parse error | config exists | malformed external row | log service spy | sync units | warning/system log emitted | null | |

---

## 5. Frontend Unit Test Input Matrix

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock / Dependency Setup | Action | Expected Result | Expected Error | Notes |
| ------------ | ---------------- | ------------------------- | -------------- | ------------- | ---------- | ----------------------- | ------ | --------------- | -------------- | ----- |
| SC-FE-001 | Config Overview | UC-CONFIG-01 | render summary cards with overview data | authenticated user | overview response success | mock API hook returns overview | render page | cards show TS-D, Cameras, Layout, Mappings, Mode | null | |
| SC-FE-002 | Config Overview | role UI | hide `Run Readiness Check` for operator | operator auth | overview success | mock role `OPERATOR` | render page | no admin CTA visible | null | read-only |
| SC-FE-003 | Config Overview | loading state | show skeleton while overview loading | authenticated user | n/a | hook loading=true | render page | skeleton placeholders visible | null | |
| SC-FE-004 | Config Overview | error state | show section alert when overview load fails | authenticated user | n/a | hook error state | render page | alert shown, no crash | load error message | |
| SC-FE-005 | TS-D form | create flow | submit valid create form | admin auth | valid `baseUrl`, `username`, `password`, `sseEndpoint` | mock create mutation success | open drawer, fill, submit | success toast, drawer closes, card refreshes | null | |
| SC-FE-006 | TS-D form | validation | show error for empty `baseUrl` | admin auth | `baseUrl=""` | form only | blur/submit | `Base URL is required` shown | validation message | |
| SC-FE-007 | TS-D page | role UI | operator sees TS-D page read-only | operator auth | existing config | mock data success | render | no `Edit`, `Test Connection`, `Sync Units` buttons | null | |
| SC-FE-008 | TS-D page | action state | after save success, show recommendation to test | admin auth | updated config | mock update success | submit edit | success toast + test CTA/hint shown | null | UX guidance |
| SC-FE-009 | Cameras list | render | render rows and badges | auth user | camera list success | hook returns items | render page | rows show name, protocol, status, last test | null | |
| SC-FE-010 | Cameras list | empty state | show empty CTA for admin when no cameras | admin auth | empty list | hook returns 0 items | render page | `No cameras configured yet` + `Add Camera` button | null | |
| SC-FE-011 | Cameras list | read-only | operator cannot see add/edit/deactivate/test actions | operator auth | camera list with items | role mock `OPERATOR` | render page | admin row actions hidden/disabled | null | |
| SC-FE-012 | Camera form | validation | show port range validation | admin auth | `port=70000` | form validation | blur/submit | `Port must be between 1 and 65535` | validation message | |
| SC-FE-013 | Camera form | validation | show required name and ip | admin auth | blank `name`, blank `ipAddress` | form validation | submit | required field errors shown | validation messages | |
| SC-FE-014 | Camera create | business error | surface `Maximum 4 active cameras allowed` from API | admin auth | valid payload | mutation rejects with `CAMERA_LIMIT_REACHED` | submit | top-form or inline error shown, values kept | business error | |
| SC-FE-015 | Camera deactivate | conflict UX | show blocking modal/error if camera in active mapping | admin auth | selected active camera | mutation rejects `CAMERA_ALREADY_IN_USE` | click deactivate confirm | error modal/alert shown, row unchanged | business error | |
| SC-FE-016 | Camera test | partial success | show partial badge and capability details | admin auth | test response `PARTIAL` | mock test mutation success | click test | badge updates, capability panel shows stream false | null | |
| SC-FE-017 | Preset panel | list render | show preset list for selected camera | auth user | presets success | selected camera + presets mock | render panel | preset rows visible | null | |
| SC-FE-018 | Preset form | duplicate error | show duplicate preset code error | admin auth | `presetCode=P01` duplicate | mutation rejects `PRESET_CODE_EXISTS` | submit | field/top error shown, input kept | business error | |
| SC-FE-019 | Layout page | missing dependency | without layout, show upload CTA and no canvas interaction | auth user | no layout | layout query returns null | render page | upload CTA visible, canvas editor disabled | null | |
| SC-FE-020 | Layout upload | validation | reject unsupported file type before upload or after API | admin auth | `.png` file | client validator or API reject | choose file, submit | `Only PDF, JPG, JPEG are allowed` | validation message | |
| SC-FE-021 | Layout editor | save positions | save valid drag-drop positions | admin auth | moved unit/camera | mock save success | drag items, click `Save Positions` | success toast, inspector updates | null | |
| SC-FE-022 | Layout editor | invalid position | show error if backend rejects invalid coordinates | admin auth | position outside bounds | mutation rejects `VALIDATION_ERROR` | save | error banner shown, local state preserved | validation error | |
| SC-FE-023 | Annotation modal | validation | require non-empty text | admin auth | `text=""` | form validation | submit | `Annotation text is required` | validation message | |
| SC-FE-024 | Mapping list | render | show joined unit/camera/preset columns | auth user | mapping list success | query returns joined data | render page | columns visible with badges | null | |
| SC-FE-025 | Mapping drawer | dependency UI | preset selector only shows presets of selected camera | admin auth | selected camera with 2 presets | preset query mock | select camera | preset dropdown options filtered | null | critical UI rule |
| SC-FE-026 | Mapping drawer | missing dependency | disable preset selector when selected camera has no presets | admin auth | camera selected, no presets | preset query empty | select camera | preset disabled, helper text shown | null | |
| SC-FE-027 | Mapping drawer | business error | show `Unit already has an active mapping` | admin auth | valid unit+camera+preset | mutation rejects `ACTIVE_MAPPING_EXISTS` | submit | top-form error shown, form values kept | business error | |
| SC-FE-028 | Mapping drawer | cross-field error | show mismatch message for preset-camera mismatch | admin auth | invalid combination | mutation rejects `PRESET_CAMERA_MISMATCH` | submit | `Selected preset does not belong to selected camera` | business error | |
| SC-FE-029 | Mode page | render current mode | show current mode badge and selector | auth user | mode=`MANUAL` | query success | render page | `MANUAL` selected and badge visible | null | |
| SC-FE-030 | Mode page | operator read-only | hide save button for operator | operator auth | mode loaded | role mock operator | render page | selector disabled/read-only, no save CTA | null | |
| SC-FE-031 | Mode page | save | admin changes mode and topbar updates | admin auth | switch to `AUTOMATIC` | update mutation success + topbar state mock | save | success toast and badge updated | null | |
| SC-FE-032 | Readiness page | run check | run readiness check and render result cards | admin auth | readiness response warning | mutation success | click `Run Check` | overall banner + category cards shown | null | |
| SC-FE-033 | Readiness page | operator restrictions | hide `Run Check` for operator | operator auth | existing last result optional | role mock | render page | no run button | null | |
| SC-FE-034 | Readiness page | loading state | show spinner/skeleton while check running | admin auth | n/a | mutation pending | click run | loading indicator shown | null | |
| SC-FE-035 | Readiness page | quick fix links | clicking category quick link navigates to corresponding config screen | admin auth | readiness items with failed categories | router mock | click quick link | route changed to target page | null | |
| SC-FE-036 | Session handling | expired auth | redirect to login when config API returns auth expiration | authenticated user | expired token | API hook/interceptor returns auth error | render/load page | redirect login and message shown | `Session expired. Please login again.` | shared auth behavior |

---

## 6. Validation Test Inputs

### 6.1 TS-D Config Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| valid | `baseUrl=http://192.168.1.10`, `sseEndpoint=/api/event` | pass |
| missing baseUrl | `baseUrl=""` | `VALIDATION_ERROR` |
| blank baseUrl | `baseUrl="   "` | `VALIDATION_ERROR` |
| blank sseEndpoint provided | `sseEndpoint=" "` | `VALIDATION_ERROR` |
| null optional creds | `username=null`, `password=null` | pass if API allows null/omitted |

### 6.2 Camera Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| valid ONVIF | protocol=`ONVIF`, port=`80` | pass |
| valid VISCA | protocol=`VISCA`, port=`52381` | pass |
| invalid protocol | protocol=`HTTP` | `VALIDATION_ERROR` |
| missing name | `name=""` | `VALIDATION_ERROR` |
| missing ipAddress | `ipAddress=""` | `VALIDATION_ERROR` |
| port too low | `port=0` | `VALIDATION_ERROR` |
| port too high | `port=65536` | `VALIDATION_ERROR` |

### 6.3 Preset Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| valid | `presetCode=P01` | pass |
| blank code | `presetCode=""` | `VALIDATION_ERROR` |
| duplicate code | same camera + `presetCode=P01` existing | `PRESET_CODE_EXISTS` |

### 6.4 Layout Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| valid PDF | `layout.pdf` | pass |
| valid JPG | `layout.jpg` | pass |
| invalid PNG | `layout.png` | `INVALID_FILE_TYPE` |
| pos lower bound | `posX=0`, `posY=0` | pass |
| pos upper bound | `posX=1`, `posY=1` | pass |
| pos below bound | `posX=-0.01` | `VALIDATION_ERROR` |
| pos above bound | `posY=1.01` | `VALIDATION_ERROR` |

### 6.5 Mapping Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| valid mapping | unit A + camera A + preset A1 | pass |
| missing unitId | `unitId=null` | `VALIDATION_ERROR` |
| preset-camera mismatch | camera A + preset B1 | `PRESET_CAMERA_MISMATCH` |
| inactive camera | camera status `INACTIVE` | `CAMERA_INACTIVE` |
| duplicate active mapping | same unit already active | `ACTIVE_MAPPING_EXISTS` |

### 6.6 Mode Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| valid manual | `mode=MANUAL` | pass |
| valid automatic | `mode=AUTOMATIC` | pass |
| invalid | `mode=SEMI_AUTO` | `VALIDATION_ERROR` |

---

## 7. Permission Test Inputs

| Test ID | Area | Actor | Action | Expected Result |
| ------- | ---- | ----- | ------ | --------------- |
| SC-PERM-001 | Overview | `OPERATOR` | view overview | allowed |
| SC-PERM-002 | TS-D | `OPERATOR` | create/update/test/sync | `FORBIDDEN` |
| SC-PERM-003 | Cameras | `OPERATOR` | add/edit/deactivate/test | `FORBIDDEN` |
| SC-PERM-004 | Presets | `OPERATOR` | create/update preset | `FORBIDDEN` |
| SC-PERM-005 | Layout | `OPERATOR` | upload/save positions/save annotation | `FORBIDDEN` |
| SC-PERM-006 | Mappings | `OPERATOR` | create/update mapping | `FORBIDDEN` |
| SC-PERM-007 | Mode | `OPERATOR` | update mode | `FORBIDDEN` |
| SC-PERM-008 | Readiness | `OPERATOR` | run readiness check | `FORBIDDEN` |
| SC-PERM-009 | UI | `OPERATOR` | open config pages | view-only state |
| SC-PERM-010 | UI | `OPERATOR` | try direct admin-only edit route/action | disabled/hidden or 403 flow |

---

## 8. State Transition Test Inputs

### 8.1 Camera Status

| Test ID | From | To | Expected Result |
| ------- | ---- | -- | --------------- |
| SC-ST-001 | `ACTIVE` | `INACTIVE` | allowed if no active mappings |
| SC-ST-002 | `ACTIVE` | `INACTIVE` with active mapping refs | blocked with `CAMERA_ALREADY_IN_USE` |
| SC-ST-003 | `INACTIVE` | `ACTIVE` | allowed if implementation supports re-activation |
| SC-ST-004 | `OFFLINE` | `ACTIVE` | allowed as technical recovery state |

### 8.2 Operation Mode

| Test ID | From | To | Expected Result |
| ------- | ---- | -- | --------------- |
| SC-ST-005 | `MANUAL` | `AUTOMATIC` | allowed |
| SC-ST-006 | `AUTOMATIC` | `MANUAL` | allowed |
| SC-ST-007 | `MANUAL` | `MANUAL` | no-op or success with unchanged state |

### 8.3 Mapping Active State

| Test ID | From | To | Expected Result |
| ------- | ---- | -- | --------------- |
| SC-ST-008 | active mapping A | update preset same mapping | allowed |
| SC-ST-009 | inactive mapping | activate while another active exists for same unit | blocked `ACTIVE_MAPPING_EXISTS` |

### 8.4 Readiness Status

| Test ID | Inputs | Expected Overall |
| ------- | ------ | ---------------- |
| SC-ST-010 | all required config valid | `PASSED` |
| SC-ST-011 | some non-critical gaps | `WARNING` |
| SC-ST-012 | required config missing | `FAILED` |

---

## 9. Error / Negative Test Inputs

| Test ID | Area | Scenario | Expected Result |
| ------- | ---- | -------- | --------------- |
| SC-NEG-001 | TS-D | room missing when creating config | `ROOM_NOT_FOUND` |
| SC-NEG-002 | TS-D | external API timeout on test | `TSD_TIMEOUT` |
| SC-NEG-003 | TS-D sync | malformed external payload | `TSD_MALFORMED_RESPONSE` or skipped rows with warnings |
| SC-NEG-004 | Camera | duplicate IP/port | `CAMERA_DUPLICATE_ENDPOINT` |
| SC-NEG-005 | Camera | unsupported adapter | `CAMERA_ADAPTER_UNSUPPORTED` |
| SC-NEG-006 | Preset | camera not found | `CAMERA_NOT_FOUND` |
| SC-NEG-007 | Layout | save positions without layout | `LAYOUT_NOT_CONFIGURED` |
| SC-NEG-008 | Layout | save position with missing referenced device | `REF_NOT_FOUND` |
| SC-NEG-009 | Mapping | cross-room unit/camera/preset relation | `CROSS_ROOM_MAPPING_INVALID` |
| SC-NEG-010 | Mapping | mapping id not found on update | `MAPPING_NOT_FOUND` |
| SC-NEG-011 | Mode | room missing | `ROOM_NOT_FOUND` |
| SC-NEG-012 | Readiness | unexpected repo failure | `INTERNAL_ERROR` |
| SC-NEG-013 | UI | API save failure | form values retained, alert shown |
| SC-NEG-014 | UI | operator attempts forbidden action | hidden/disabled UI or forbidden response |

---

## 10. Edge Case Test Inputs

| Test ID | Area | Edge Case | Input | Expected Result |
| ------- | ---- | --------- | ----- | --------------- |
| SC-EDGE-001 | TS-D | trim username/password | username with spaces | trimmed before save if spec/code standard applies |
| SC-EDGE-002 | Camera | null optional fields | `vendor=null`, `model=null`, `rtspUrl=null` | accepted |
| SC-EDGE-003 | Camera | exactly 4 active cameras | active count=3 then add 1 | allowed |
| SC-EDGE-004 | Camera | 5th active camera | active count=4 then add 1 | blocked |
| SC-EDGE-005 | Layout | boundary positions | `posX=0`, `posY=1` | accepted |
| SC-EDGE-006 | Layout | duplicate device in same payload | two same refs | rejected |
| SC-EDGE-007 | Mapping | no mappings exist | list call | empty list, no error |
| SC-EDGE-008 | Mapping UI | selected camera has zero presets | no preset rows | preset selector disabled |
| SC-EDGE-009 | Readiness | no camera configured | check run | warning or failed per rule implementation |
| SC-EDGE-010 | Units list | no synced units | list call | empty paginated result |
| SC-EDGE-011 | Annotation | very long text near max length | 500 chars | accepted if within limit |
| SC-EDGE-012 | Annotation | text over limit | >500 chars if validator exists | validation error or assumption |

---

## 11. Mock Data Suggestions

### 11.1 Valid Entity Samples

```json
{
  "room": {
    "id": "room-01",
    "name": "Meeting Room A",
    "operationMode": "MANUAL"
  },
  "tsdConfig": {
    "id": "tsd-01",
    "roomId": "room-01",
    "baseUrl": "http://192.168.1.10",
    "username": "admin",
    "sseEndpoint": "/api/event",
    "isActive": true
  },
  "camera": {
    "id": "cam-01",
    "roomId": "room-01",
    "name": "Camera 1",
    "protocol": "ONVIF",
    "ipAddress": "192.168.1.21",
    "port": 80,
    "status": "ACTIVE",
    "capabilityPtz": true,
    "capabilityPreset": true,
    "capabilityStream": true
  },
  "preset": {
    "id": "preset-01",
    "cameraId": "cam-01",
    "presetCode": "P01",
    "presetName": "Delegate 01"
  },
  "unit": {
    "id": "unit-01",
    "roomId": "room-01",
    "externalUnitId": "D01",
    "unitName": "Delegate 01",
    "deviceType": "DELEGATE"
  },
  "mapping": {
    "id": "map-01",
    "roomId": "room-01",
    "unitId": "unit-01",
    "cameraId": "cam-01",
    "presetId": "preset-01",
    "isActive": true
  }
}
```

### 11.2 Invalid Entity Samples

```json
{
  "invalidCamera": {
    "name": "",
    "protocol": "HTTP",
    "ipAddress": "",
    "port": 70000
  },
  "invalidMapping": {
    "unitId": "unit-01",
    "cameraId": "cam-01",
    "presetId": "preset-from-cam-02"
  },
  "invalidLayoutDevice": {
    "refType": "CAMERA",
    "refId": "missing-camera",
    "posX": 1.2,
    "posY": -0.1
  }
}
```

### 11.3 Duplicate / Conflict Samples

```json
{
  "duplicateCamera": {
    "roomId": "room-01",
    "ipAddress": "192.168.1.21",
    "port": 80
  },
  "duplicatePreset": {
    "cameraId": "cam-01",
    "presetCode": "P01"
  },
  "duplicateActiveMapping": {
    "unitId": "unit-01",
    "existingActiveMappingId": "map-01"
  }
}
```

### 11.4 Expired / Offboard / Invalid State Samples

```json
{
  "inactiveCamera": {
    "id": "cam-02",
    "status": "INACTIVE"
  },
  "offlineCamera": {
    "id": "cam-03",
    "status": "OFFLINE"
  },
  "missingLayout": null
}
```

### 11.5 Permission-Denied Samples

```json
{
  "adminActor": {
    "id": "user-admin-01",
    "role": "ADMIN"
  },
  "operatorActor": {
    "id": "user-operator-01",
    "role": "OPERATOR"
  }
}
```

### 11.6 Null / Missing Relation Samples

```json
{
  "missingUnit": null,
  "missingCamera": null,
  "missingPreset": null,
  "layoutWithoutDevices": [],
  "cameraWithoutPresets": []
}
```

---

## 12. Assumptions / Open Points

1. `GET /config/tsd` và `GET /config/tsd/{id}/units` được dùng để hỗ trợ UI đọc dữ liệu hiện tại và danh sách unit, dù một phần chỉ được implied từ Detail Design/API Contract tổng hợp.
2. Với `OPERATOR`, UI ưu tiên `read-only state`; route admin-only có thể trả `403` tùy cách implement frontend router.
3. `Readiness check` phân loại `WARNING` hay `FAILED` cho một số thiếu hụt phụ thuộc rule cấu hình “required vs optional” của runtime; test script sau cần bám đúng matrix final của service implementation.
4. Trường hợp `Annotation text > 500 chars` chưa có message lỗi cụ thể trong tài liệu; nếu implementation thêm validator max length thì test cần cập nhật theo DTO thực tế.
5. `Update TS-D config` có thể giữ `lastTestResult` cũ nhưng UI khuyến nghị test lại; unit test nên xác nhận đúng policy implementation đã chọn, không giả định reset nếu code không reset.
