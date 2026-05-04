# 1. Test Scope Summary

## 1.1 Scope

Tài liệu này mô tả **Unit Test Input Specification** cho module **CRUD System Configuration**, bao gồm:

* System Configuration Overview
* TS-D1000 Configuration
* Camera Configuration
* Camera Preset Configuration
* Layout & Map Configuration
* Mic-Camera Mapping Configuration
* Operation Mode Configuration
* Configuration Testing & Readiness

## 1.2 Roles in Scope

* `ADMIN`
* `OPERATOR`

## 1.3 Test Objectives

Tài liệu này xác định:

* các feature cần test
* business rules cần xác minh
* input data và edge cases cần cover
* expected output / expected behavior
* negative cases
* permission cases
* validation cases
* state transition cases
* UI interaction cases
* API behavior cases

## 1.4 Out of Scope

Không bao gồm:

* actual Jest / RTL test code
* authentication internals ngoài permission assumptions
* runtime event engine
* camera switching runtime
* live streaming pipeline

---

# 2. Modules / Features to Test

| Module | Feature | Related UC | Related APIs | Related UI |
| ------ | ------- | ---------- | ------------ | ---------- |
| Overview | View config overview | UC-CONFIG-01 | `GET /config/overview` | Overview page |
| TS-D Config | Create config | UC-TSDCFG-01 | `POST /config/tsd` | TS-D page, create drawer |
| TS-D Config | View current config | UC-TSDCFG-02 | `GET /config/tsd/current` | TS-D page |
| TS-D Config | Update config | UC-TSDCFG-03 | `PUT /config/tsd/{id}` | TS-D edit drawer |
| TS-D Config | Deactivate config | UC-TSDCFG-04 | `PATCH /config/tsd/{id}/deactivate` | deactivate modal |
| TS-D Config | Sync units | UC-TSDCFG-05 | `POST /config/tsd/{id}/sync-units`, `GET /config/tsd/{id}/units` | sync action, sync result section |
| Camera | Create camera | UC-CFGCAM-01 | `POST /config/cameras` | camera form drawer |
| Camera | View list | UC-CFGCAM-02 | `GET /config/cameras` | camera list page |
| Camera | View detail | UC-CFGCAM-03 | `GET /config/cameras/{id}` | camera detail drawer/page |
| Camera | Update camera | UC-CFGCAM-04 | `PUT /config/cameras/{id}` | camera edit form |
| Camera | Deactivate camera | UC-CFGCAM-05 | `PATCH /config/cameras/{id}/deactivate` | deactivate modal |
| Preset | Create preset | UC-PRESET-01 | `POST /config/cameras/{id}/presets` | preset drawer |
| Preset | View preset list | UC-PRESET-02 | `GET /config/cameras/{id}/presets` | preset list panel |
| Preset | Update preset | UC-PRESET-03 | `PUT /config/presets/{id}` | preset edit drawer |
| Preset | Delete preset | UC-PRESET-04 | `DELETE /config/presets/{id}` | preset delete modal |
| Layout | Upload layout | UC-LAYOUT-01 | `POST /config/layout` | upload modal |
| Layout | Replace layout | UC-LAYOUT-02 | `PUT /config/layout/{id}/replace` | replace modal |
| Layout | Place devices | UC-LAYOUT-03 | `GET/PUT /config/layout/devices` | layout editor |
| Layout | Add annotation | UC-LAYOUT-04 | `POST /config/layout/annotations` | annotation create modal |
| Layout | Update annotation | UC-LAYOUT-05 | `PUT /config/layout/annotations/{id}` | annotation edit modal |
| Mapping | Create mapping | UC-MAPCFG-01 | `POST /config/mappings` | mapping drawer |
| Mapping | View mappings | UC-MAPCFG-02 | `GET /config/mappings` | mapping list page |
| Mapping | Update mapping | UC-MAPCFG-03 | `PUT /config/mappings/{id}` | mapping edit drawer |
| Mapping | Deactivate mapping | UC-MAPCFG-04 | `PATCH /config/mappings/{id}/deactivate` | mapping deactivate modal |
| Mode | View mode | UC-MODE-01 | `GET /config/mode` | mode page |
| Mode | Update mode | UC-MODE-02 | `PUT /config/mode` | mode selector |
| Testing | Test TS-D | UC-TEST-01 | `POST /config/tsd/{id}/test` | TS-D action button |
| Testing | Test camera | UC-TEST-02 | `POST /config/cameras/{id}/test` | camera action button |
| Readiness | Run readiness check | UC-TEST-03 | `POST /config/readiness/check` | readiness page |

---

# 3. Requirement-to-Test Mapping

| Requirement / Rule | Test Coverage Area |
| ------------------ | ------------------ |
| 1 TS-D1000 config active / room | TS-D create, deactivate, view current |
| 1 layout active / room | layout upload, replace, current layout query |
| max 4 active cameras / room | camera create/update/deactivate |
| 1 active mapping / unit | mapping create/update/deactivate |
| preset must belong to camera | mapping create/update |
| inactive camera cannot be used in active mapping | mapping create/update |
| operator is read-only | permission tests across all modules |
| readiness is read-only | readiness service/API/UI tests |
| deactivate instead of hard delete for TS-D/camera/mapping | service/API tests |
| preset hard delete blocked by dependency | preset delete tests |

---

# 4. Backend Unit Test Input Matrix

| Test Case ID | Feature / Module | Related UC | Test Objective | Preconditions | Input Data | Mock / Dependency Setup | Action | Expected Result | Expected Error | Notes |
| ------------ | ---------------- | ---------- | -------------- | ------------- | ---------- | ----------------------- | ------ | --------------- | -------------- | ----- |
| BE-OV-001 | Overview | UC-CONFIG-01 | Return overview with all summaries | active room exists | roomId valid | mock repos return room, tsd, cameras, layout, mappings | call `getOverview` | aggregated overview returned | null | happy path |
| BE-OV-002 | Overview | UC-CONFIG-01 | Return configured false when TS-D/layout missing | room exists, no tsd/layout | roomId valid | mock missing tsd/layout | call `getOverview` | `configured=false`, counts still returned | null | no exception |
| BE-OV-003 | Overview | UC-CONFIG-01 | Reject unauthorized role | actor role invalid | actor=`GUEST` | none | call service | no data | `FORBIDDEN` | permission |
| BE-TSD-001 | TS-D create | UC-TSDCFG-01 | Create active TS-D config successfully | room exists, no active config | valid baseUrl, username, password | mock room repo, config repo empty, encrypt util | call `createConfig` | config inserted, password encrypted, audit logged | null | happy path |
| BE-TSD-002 | TS-D create | UC-TSDCFG-01 | Reject missing baseUrl | room exists | `baseUrl=""` | none | validate dto/service | no insert | `VALIDATION_ERROR` | field validation |
| BE-TSD-003 | TS-D create | UC-TSDCFG-01 | Reject duplicate active TS-D config | active config exists | valid payload | mock active config found | call `createConfig` | no insert | `TSD_CONFIG_ALREADY_EXISTS` | uniqueness |
| BE-TSD-004 | TS-D view | UC-TSDCFG-02 | Return null when not configured | room exists, no active config | roomId valid | repo returns null | call query | `data=null` | null | view empty state |
| BE-TSD-005 | TS-D update | UC-TSDCFG-03 | Update only changed fields | config exists | changed username/password | mock config found | call update | updated config returned, password re-encrypted | null | partial update behavior |
| BE-TSD-006 | TS-D update | UC-TSDCFG-03 | Reject config not found | config missing | valid payload | repo returns null | call update | no update | `TSD_CONFIG_NOT_FOUND` | negative |
| BE-TSD-007 | TS-D deactivate | UC-TSDCFG-04 | Deactivate active config | config active exists | configId valid | mock active config | call deactivate | status becomes INACTIVE, audit logged | null | happy path |
| BE-TSD-008 | TS-D deactivate | UC-TSDCFG-04 | Reject deactivate inactive config | config already inactive | configId valid | mock inactive config | call deactivate | no update | `INVALID_TSD_CONFIG_STATE` | invalid transition |
| BE-TSD-009 | TS-D sync | UC-TSDCFG-05 | Create and update units from sync payload | active config exists | integration payload with new and existing units | mock TSD adapter success | call sync | counts created/updated/skipped correct | null | happy path |
| BE-TSD-010 | TS-D sync | UC-TSDCFG-05 | Skip malformed unit rows and continue | active config exists | payload with one row missing externalUnitId | mock adapter returns mixed rows | call sync | valid rows processed, skipped count incremented | null | edge case |
| BE-TSD-011 | TS-D sync | UC-TSDCFG-05 | Fail when TSD unreachable | active config exists | configId valid | mock adapter timeout | call sync | no sync | `TSD_UNREACHABLE` | integration error |
| BE-TSD-012 | TS-D test | UC-TEST-01 | Update last test result success | config exists | configId valid | mock adapter success | call test | `last_test_result=SUCCESS`, `last_test_at` updated | null | happy path |
| BE-TSD-013 | TS-D test | UC-TEST-01 | Update last test result failed on timeout | config exists | configId valid | mock adapter timeout | call test | last test fields updated to failed | `TSD_UNREACHABLE` or integration fail | verify side effect |
| BE-CAM-001 | Camera create | UC-CFGCAM-01 | Create camera successfully | active camera count < 4 | valid camera payload | room exists, no duplicate ip/port | call create | camera inserted, encrypted password, audit logged | null | happy path |
| BE-CAM-002 | Camera create | UC-CFGCAM-01 | Reject when active camera count already 4 | room has 4 active cameras | valid payload | mock count=4 | call create | no insert | `CAMERA_LIMIT_REACHED` | business rule |
| BE-CAM-003 | Camera create | UC-CFGCAM-01 | Reject duplicate ip/port in room | duplicate exists | same ip/port payload | mock duplicate found | call create | no insert | `CAMERA_DUPLICATE_IP_PORT` | uniqueness |
| BE-CAM-004 | Camera create | UC-CFGCAM-01 | Reject invalid protocol | none | `protocol="RTSP"` | dto/service validation | call create | no insert | `VALIDATION_ERROR` | enum validation |
| BE-CAM-005 | Camera list | UC-CFGCAM-02 | Return paginated filtered camera list | cameras exist | `search`, `status`, `protocol` | mock repo list | call list | items + pagination returned | null | query behavior |
| BE-CAM-006 | Camera detail | UC-CFGCAM-03 | Return camera detail with capabilities | camera exists | cameraId valid | repo returns camera + preset relation | call detail | detail returned without password | null | security |
| BE-CAM-007 | Camera detail | UC-CFGCAM-03 | Reject not found | camera missing | cameraId invalid | repo null | call detail | no data | `CAMERA_NOT_FOUND` | negative |
| BE-CAM-008 | Camera update | UC-CFGCAM-04 | Update camera successfully | camera exists | changed IP/vendor/model | mock camera found | call update | updated record returned | null | happy path |
| BE-CAM-009 | Camera update | UC-CFGCAM-04 | Reject duplicate ip/port after update | target duplicate exists | updated ip/port | mock conflict | call update | no update | `CAMERA_DUPLICATE_IP_PORT` | conflict |
| BE-CAM-010 | Camera deactivate | UC-CFGCAM-05 | Deactivate active camera with no mapping dependency | camera active | cameraId valid | no active mapping references | call deactivate | status INACTIVE | null | happy path |
| BE-CAM-011 | Camera deactivate | UC-CFGCAM-05 | Block deactivate when active mapping exists | camera active, mapping active | cameraId valid | mapping repo returns reference | call deactivate | no update | `CAMERA_ALREADY_IN_USE` | business rule |
| BE-CAM-012 | Camera deactivate | UC-CFGCAM-05 | Reject deactivate inactive camera | camera inactive | cameraId valid | camera status INACTIVE | call deactivate | no update | `INVALID_CAMERA_STATE` | invalid transition |
| BE-CAM-013 | Camera test | UC-TEST-02 | Return partial capability result | camera exists | cameraId valid | adapter returns partial capability | call test | result PARTIAL, capability fields updated | null | happy path |
| BE-CAM-014 | Camera test | UC-TEST-02 | Reject unsupported adapter | camera protocol/vendor unsupported | cameraId valid | adapter factory returns unsupported | call test | no success | `CAMERA_CONNECTION_FAILED` or unsupported code | implementation-specific note |
| BE-PR-001 | Preset create | UC-PRESET-01 | Create preset successfully | camera exists | valid presetCode/name | camera found, no duplicate | call createPreset | preset inserted | null | happy path |
| BE-PR-002 | Preset create | UC-PRESET-01 | Reject duplicate preset code in same camera | camera exists | duplicate code | repo duplicate found | call createPreset | no insert | `CONFLICT` | uniqueness |
| BE-PR-003 | Preset create | UC-PRESET-01 | Reject unsupported preset capability when known false | camera exists capability preset false | valid payload | camera.capability_preset=false | call createPreset | no insert | `UNPROCESSABLE_ENTITY` | business validation |
| BE-PR-004 | Preset list | UC-PRESET-02 | Return empty preset list | camera exists, no presets | cameraId valid | repo returns [] | call listPresets | empty items | null | empty state |
| BE-PR-005 | Preset update | UC-PRESET-03 | Update preset name only | preset exists | same code, changed name | repo found | call updatePreset | preset updated | null | partial update |
| BE-PR-006 | Preset delete | UC-PRESET-04 | Delete preset when no active dependency | preset exists | presetId valid | no active mappings use preset | call deletePreset | deleted=true | null | happy path |
| BE-PR-007 | Preset delete | UC-PRESET-04 | Reject delete when active mapping dependency exists | preset in active mapping | presetId valid | mapping repo returns reference | call deletePreset | not deleted | `PRESET_ALREADY_IN_USE` | business rule |
| BE-LY-001 | Layout upload | UC-LAYOUT-01 | Upload valid PDF layout | room exists | file `.pdf` | storage mock success | call uploadLayout | layout saved active | null | happy path |
| BE-LY-002 | Layout upload | UC-LAYOUT-01 | Reject invalid file extension | room exists | file `.png` | none | call uploadLayout | no save | `VALIDATION_ERROR` | file validation |
| BE-LY-003 | Layout replace | UC-LAYOUT-02 | Replace active layout successfully | active layout exists | new `.jpg` file | storage success | call replaceLayout | new active layout persisted | null | happy path |
| BE-LY-004 | Layout replace | UC-LAYOUT-02 | Reject replace when layout not found | layout missing | layoutId invalid | repo null | call replaceLayout | no update | `LAYOUT_NOT_FOUND` | negative |
| BE-LD-001 | Layout devices | UC-LAYOUT-03 | Save valid unit and camera positions | active layout exists | devices array valid | refs exist, no duplicates | call savePositions | upserted positions returned | null | happy path |
| BE-LD-002 | Layout devices | UC-LAYOUT-03 | Reject when no active layout | no layout | valid devices payload | layout repo null | call savePositions | no save | `UNPROCESSABLE_ENTITY` | missing dependency |
| BE-LD-003 | Layout devices | UC-LAYOUT-03 | Reject invalid coordinates | active layout exists | `posX=-0.1` | refs exist | call savePositions | no save | `VALIDATION_ERROR` | boundary |
| BE-LD-004 | Layout devices | UC-LAYOUT-03 | Reject duplicate same refType+refId in payload | active layout exists | same device appears twice | none | call savePositions | no save | `VALIDATION_ERROR` | cross-record validation |
| BE-AN-001 | Annotation create | UC-LAYOUT-04 | Create annotation successfully | active layout exists | valid text/coords | none | call createAnnotation | annotation saved | null | happy path |
| BE-AN-002 | Annotation create | UC-LAYOUT-04 | Reject blank text | active layout exists | `text="   "` | none | call createAnnotation | no insert | `VALIDATION_ERROR` | validation |
| BE-AN-003 | Annotation update | UC-LAYOUT-05 | Update text and position | annotation exists | valid payload | repo found | call updateAnnotation | annotation updated | null | happy path |
| BE-AN-004 | Annotation update | UC-LAYOUT-05 | Reject annotation not found | missing annotation | annotationId invalid | repo null | call updateAnnotation | no update | `ANNOTATION_NOT_FOUND` | negative |
| BE-MAP-001 | Mapping create | UC-MAPCFG-01 | Create mapping successfully | unit, camera, preset exist | valid ids | same room, camera active, no active mapping for unit | call createMapping | mapping inserted active | null | happy path |
| BE-MAP-002 | Mapping create | UC-MAPCFG-01 | Reject if unit already has active mapping | unit active mapping exists | valid ids | mapping repo conflict | call createMapping | no insert | `MAPPING_ALREADY_EXISTS` | business rule |
| BE-MAP-003 | Mapping create | UC-MAPCFG-01 | Reject if preset does not belong to camera | valid ids mixed | preset.cameraId != cameraId | call createMapping | no insert | `PRESET_CAMERA_MISMATCH` | cross-field |
| BE-MAP-004 | Mapping create | UC-MAPCFG-01 | Reject inactive camera | camera inactive | valid ids | camera.status=INACTIVE | call createMapping | no insert | `CAMERA_INACTIVE` | business rule |
| BE-MAP-005 | Mapping list | UC-MAPCFG-02 | Return filtered mappings with joins | mappings exist | camera filter, active filter | repo join mock | call listMappings | mapping DTO list returned | null | query behavior |
| BE-MAP-006 | Mapping update | UC-MAPCFG-03 | Update mapping camera/preset successfully | mapping exists | valid new camera/preset | camera active, preset belongs to camera | call updateMapping | updated mapping returned | null | happy path |
| BE-MAP-007 | Mapping update | UC-MAPCFG-03 | Reject update not found | mapping missing | mappingId invalid | repo null | call updateMapping | no update | `MAPPING_NOT_FOUND` | negative |
| BE-MAP-008 | Mapping deactivate | UC-MAPCFG-04 | Deactivate active mapping | mapping active exists | mappingId valid | repo found | call deactivateMapping | isActive=false | null | happy path |
| BE-MAP-009 | Mapping deactivate | UC-MAPCFG-04 | Reject deactivate already inactive mapping | mapping inactive | mappingId valid | repo status inactive | call deactivateMapping | no update | `CONFLICT` | invalid state |
| BE-MODE-001 | Mode view | UC-MODE-01 | Return current mode | room exists | roomId valid | repo room found | call getMode | mode returned | null | happy path |
| BE-MODE-002 | Mode update | UC-MODE-02 | Update mode successfully | room exists | `mode=AUTOMATIC` | repo room found | call updateMode | room.operation_mode updated | null | happy path |
| BE-MODE-003 | Mode update | UC-MODE-02 | Reject invalid mode enum | room exists | `mode="AUTO"` | validation | call updateMode | no update | `VALIDATION_ERROR` | enum |
| BE-READY-001 | Readiness | UC-TEST-03 | Return PASSED when all required config exists | room has tsd, successful test, camera, layout, units, mappings, mode | roomId valid | all repos return valid data | call check | `overallStatus=PASSED` | null | happy path |
| BE-READY-002 | Readiness | UC-TEST-03 | Return WARNING when mappings incomplete but core config exists | 2 units missing mappings | room configured | repos return partial mapping coverage | call check | `overallStatus=WARNING` with item message | null | business case |
| BE-READY-003 | Readiness | UC-TEST-03 | Return FAILED when required config missing | no layout or no tsd config | room exists | missing required data | call check | `overallStatus=FAILED` | null | read-only evaluation |
| BE-READY-004 | Readiness | UC-TEST-03 | Reject non-admin actor | actor operator | room exists | none | call check | no data | `FORBIDDEN` | permission |

---

# 5. Frontend Unit Test Input Matrix

| Test Case ID | Feature / Screen | Related UC | Test Objective | Preconditions | Input Data | Mock / Dependency Setup | Action | Expected Result | Expected Error | Notes |
| ------------ | ---------------- | ---------- | -------------- | ------------- | ---------- | ----------------------- | ------ | --------------- | -------------- | ----- |
| FE-OV-001 | Overview page | UC-CONFIG-01 | Render overview cards with backend data | user logged in | overview API success | mock auth admin, mock overview response | render page | summary cards and quick links visible | null | happy path |
| FE-OV-002 | Overview page | UC-CONFIG-01 | Show readiness button only for admin | admin and operator variants | none | mock role variant | render page | admin sees button, operator does not | null | role UI |
| FE-OV-003 | Overview page | UC-CONFIG-01 | Show section error on API fail | logged in | none | overview API returns 500 | render page | error banner shown | section error | error state |
| FE-TSD-001 | TS-D page | UC-TSDCFG-02 | Show not configured state when no config exists | logged in | API returns null | mock current config null | render page | “Not configured” state shown | null | empty state |
| FE-TSD-002 | TS-D create drawer | UC-TSDCFG-01 | Validate required baseUrl before submit | admin | `baseUrl=""` | none | submit form | inline validation shown, API not called | `Base URL is required` | form validation |
| FE-TSD-003 | TS-D create drawer | UC-TSDCFG-01 | Submit valid create form | admin | valid payload | mock create success | submit | toast shown, config card refreshes | null | happy path |
| FE-TSD-004 | TS-D edit drawer | UC-TSDCFG-03 | Prefill current config on edit | admin, config exists | none | mock current config | open drawer | fields prefilled except password masked/empty | null | UI behavior |
| FE-TSD-005 | TS-D actions | UC-TSDCFG-04 | Show deactivate confirm modal and complete action | admin | click deactivate | mock deactivate success | confirm modal | config status updates to inactive | null | destructive action |
| FE-TSD-006 | TS-D actions | UC-TSDCFG-05 | Show sync summary after sync success | admin | click sync | mock sync response | click action | sync counts and result items rendered | null | happy path |
| FE-TSD-007 | TS-D actions | UC-TEST-01 | Show last test badge after test success | admin | click test | mock test success | click action | status badge/timestamp updated | null | state refresh |
| FE-TSD-008 | TS-D page | UC-TSDCFG-01..05 | Operator sees read-only page | operator | none | mock operator auth | render page | create/edit/test/sync/deactivate hidden/disabled | null | permission |
| FE-CAM-001 | Camera list page | UC-CFGCAM-02 | Render camera table with filters | logged in | list response | mock cameras API | render | rows and filter controls visible | null | happy path |
| FE-CAM-002 | Camera list page | UC-CFGCAM-02 | Show empty state when no cameras | logged in | empty list | mock empty items | render | empty state text displayed | null | empty state |
| FE-CAM-003 | Camera create drawer | UC-CFGCAM-01 | Validate required name/protocol/ipAddress | admin | missing fields | none | submit | inline errors shown | validation messages | form validation |
| FE-CAM-004 | Camera create drawer | UC-CFGCAM-01 | Show business error from backend for 4-camera limit | admin | valid payload | create API returns 409 limit | submit | top-form alert shown, drawer stays open | `Maximum 4 active cameras allowed` | business error UX |
| FE-CAM-005 | Camera detail drawer | UC-CFGCAM-03 | Render capabilities and preset section | logged in | detail response | mock detail API | open detail | PTZ/Preset/Stream badges and preset section visible | null | detail rendering |
| FE-CAM-006 | Camera edit drawer | UC-CFGCAM-04 | Save updated camera successfully | admin | changed vendor/model | mock update success | submit | row/detail refresh + toast | null | happy path |
| FE-CAM-007 | Camera deactivate | UC-CFGCAM-05 | Show backend conflict message when camera used in active mapping | admin | click deactivate | deactivate API returns 422 | confirm | modal/alert shows dependency message | dependency error | conflict UX |
| FE-CAM-008 | Camera test | UC-TEST-02 | Render PARTIAL test result and capability update | admin | click test | mock partial response | click | badge becomes PARTIAL, capabilities refreshed | null | API mapping |
| FE-CAM-009 | Camera list page | UC-CFGCAM-01..05 | Operator sees read-only camera page | operator | none | operator auth | render | add/edit/test/deactivate actions hidden | null | role UI |
| FE-PR-001 | Preset list panel | UC-PRESET-02 | Show empty preset state | camera selected, no presets | empty items | mock preset list empty | render panel | empty state shown | null | empty state |
| FE-PR-002 | Preset form | UC-PRESET-01 | Validate presetCode required | admin | `presetCode=""` | none | submit | inline error shown | `Preset code is required` | form validation |
| FE-PR-003 | Preset form | UC-PRESET-01 | Show duplicate preset code conflict from backend | admin | duplicate code | API 409 conflict | submit | top-form alert shown | duplicate message | business error UX |
| FE-PR-004 | Preset delete | UC-PRESET-04 | Block delete UX when preset in active mapping | admin | delete clicked | API 422 preset in use | confirm | modal stays/alert shown | dependency message | conflict UX |
| FE-LY-001 | Layout page | UC-LAYOUT-01 | Show upload CTA when no layout exists | logged in | no layout | mock current layout null | render | upload CTA visible, no canvas interaction | null | empty dependency UX |
| FE-LY-002 | Layout upload modal | UC-LAYOUT-01 | Reject invalid file type before/after submit | admin | `.png` file | file validation or API 400 | submit | validation/alert shown | `Only PDF, JPG, JPEG files are allowed` | validation |
| FE-LY-003 | Layout replace modal | UC-LAYOUT-02 | Confirm replace flow | admin, layout exists | valid file | mock replace success | upload + confirm | new layout metadata rendered | null | happy path |
| FE-LY-004 | Layout editor | UC-LAYOUT-03 | Save positions with selected device coordinates | admin, layout exists | valid device positions | mock save success | click save positions | success toast, positions refreshed | null | core flow |
| FE-LY-005 | Layout editor | UC-LAYOUT-03 | Disable/hide canvas interactions for operator | operator | none | operator auth | render | no draggable save actions | null | permission |
| FE-AN-001 | Annotation modal | UC-LAYOUT-04 | Validate annotation text required | admin | blank text | none | submit | inline validation shown | error text | validation |
| FE-AN-002 | Annotation modal | UC-LAYOUT-05 | Prefill annotation edit modal | admin, annotation exists | none | selected annotation | open edit | text and coords prefilled | null | UI behavior |
| FE-MAP-001 | Mapping list page | UC-MAPCFG-02 | Render mapping table and filters | logged in | mapping list | mock list API | render | rows and filters visible | null | happy path |
| FE-MAP-002 | Mapping form | UC-MAPCFG-01 | Load preset options based on selected camera | admin | choose camera | mock preset list for selected camera | change camera | preset dropdown updates | null | dependency-aware UX |
| FE-MAP-003 | Mapping form | UC-MAPCFG-01 | Disable preset dropdown when selected camera has no presets | admin | camera with zero presets | mock empty preset list | select camera | preset field disabled + helper text | null | missing dependency UX |
| FE-MAP-004 | Mapping form | UC-MAPCFG-01 | Show backend error when unit already has active mapping | admin | valid form | API 409 conflict | submit | top-form alert shown | duplicate active mapping message | business error |
| FE-MAP-005 | Mapping deactivate | UC-MAPCFG-04 | Deactivate mapping from row action | admin | click deactivate | mock API success | confirm | active badge updates false | null | happy path |
| FE-MODE-001 | Operation mode page | UC-MODE-01 | Render current mode from API | logged in | mode response | mock GET mode | render | selected card/badge matches response | null | happy path |
| FE-MODE-002 | Operation mode page | UC-MODE-02 | Save changed mode and update top bar badge | admin | select AUTOMATIC | mock PUT success | save | toast shown and badge updates | null | UI state propagation |
| FE-MODE-003 | Operation mode page | UC-MODE-02 | Operator sees read-only mode selector | operator | none | operator auth | render | save hidden/disabled | null | permission |
| FE-READY-001 | Readiness page | UC-TEST-03 | Render checklist result after run check | admin | click run | mock readiness response | click | cards/banner render statuses and messages | null | happy path |
| FE-READY-002 | Readiness page | UC-TEST-03 | Show loading spinner during readiness API call | admin | click run | mock delayed API | click | spinner visible until resolved | null | loading state |
| FE-READY-003 | Readiness page | UC-TEST-03 | Operator cannot run readiness check | operator | none | operator auth | render | run button hidden/disabled | null | permission |
| FE-READY-004 | Readiness page | UC-TEST-03 | Failed item quick link navigates to target page | admin | failed layout item | mock readiness result | click quick-fix link | navigate to `/config/layout` | null | interaction |

---

# 6. Validation Test Inputs

## 6.1 TS-D1000 Validation Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| missing baseUrl | `{ "baseUrl": "" }` | `VALIDATION_ERROR` |
| blank baseUrl after trim | `{ "baseUrl": "   " }` | `VALIDATION_ERROR` |
| empty sseEndpoint provided | `{ "baseUrl": "http://192.168.1.10", "sseEndpoint": "" }` | `VALIDATION_ERROR` |
| valid minimal payload | `{ "baseUrl": "http://192.168.1.10" }` | accepted |

## 6.2 Camera Validation Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| missing name | `name=""` | `VALIDATION_ERROR` |
| invalid protocol | `protocol="RTSP"` | `VALIDATION_ERROR` |
| missing ipAddress | `ipAddress=""` | `VALIDATION_ERROR` |
| port lower bound invalid | `port=0` | `VALIDATION_ERROR` |
| port upper bound invalid | `port=65536` | `VALIDATION_ERROR` |
| valid min payload | `name + protocol + ipAddress` | accepted |

## 6.3 Preset Validation Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| missing presetCode | `presetCode=""` | `VALIDATION_ERROR` |
| duplicate code in same camera | existing `P01`, new `P01` | `CONFLICT` |
| same code in another camera | existing `P01` on camera A, new `P01` on camera B | accepted |

## 6.4 Layout Validation Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| file `.pdf` | valid file | accepted |
| file `.jpg` | valid file | accepted |
| file `.jpeg` | valid file | accepted |
| file `.png` | invalid file | `VALIDATION_ERROR` |
| annotation text blank | `"   "` | `VALIDATION_ERROR` |
| `posX=-0.01` | invalid coord | `VALIDATION_ERROR` |
| `posY=1.01` | invalid coord | `VALIDATION_ERROR` |

## 6.5 Mapping Validation Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| missing unitId | null | `VALIDATION_ERROR` |
| missing cameraId | null | `VALIDATION_ERROR` |
| missing presetId | null | `VALIDATION_ERROR` |
| preset belongs to other camera | mixed ids | `PRESET_CAMERA_MISMATCH` |
| camera inactive | inactive camera selected | `CAMERA_INACTIVE` |

## 6.6 Mode Validation Inputs

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| `mode="MANUAL"` | valid | accepted |
| `mode="AUTOMATIC"` | valid | accepted |
| `mode="AUTO"` | invalid | `VALIDATION_ERROR` |

---

# 7. Permission Test Inputs

| Test Case ID | Feature | Actor | Action | Expected Result |
| ------------ | ------- | ----- | ------ | --------------- |
| PERM-001 | Overview | OPERATOR | view overview | allowed |
| PERM-002 | TS-D create | OPERATOR | create config | `FORBIDDEN` |
| PERM-003 | TS-D view | OPERATOR | get current config | allowed |
| PERM-004 | Sync units | OPERATOR | sync units | `FORBIDDEN` |
| PERM-005 | Camera list | OPERATOR | list cameras | allowed |
| PERM-006 | Camera create | OPERATOR | create camera | `FORBIDDEN` |
| PERM-007 | Camera detail | OPERATOR | view detail | allowed |
| PERM-008 | Preset list | OPERATOR | list presets | allowed |
| PERM-009 | Preset delete | OPERATOR | delete preset | `FORBIDDEN` |
| PERM-010 | Layout current | OPERATOR | view layout | allowed |
| PERM-011 | Save positions | OPERATOR | save layout devices | `FORBIDDEN` |
| PERM-012 | Mapping list | OPERATOR | view mappings | allowed |
| PERM-013 | Mapping create | OPERATOR | create mapping | `FORBIDDEN` |
| PERM-014 | Mode view | OPERATOR | get mode | allowed |
| PERM-015 | Mode update | OPERATOR | update mode | `FORBIDDEN` |
| PERM-016 | Readiness check | OPERATOR | run readiness | `FORBIDDEN` |

---

# 8. State Transition Test Inputs

## 8.1 TS-D Configuration

| Case | Initial State | Action | Expected Result |
| ---- | ------------- | ------ | --------------- |
| ST-TSD-001 | ACTIVE | deactivate | state -> INACTIVE |
| ST-TSD-002 | INACTIVE | deactivate again | `INVALID_TSD_CONFIG_STATE` |

## 8.2 Camera

| Case | Initial State | Action | Expected Result |
| ---- | ------------- | ------ | --------------- |
| ST-CAM-001 | ACTIVE | deactivate | state -> INACTIVE |
| ST-CAM-002 | INACTIVE | deactivate | `INVALID_CAMERA_STATE` |
| ST-CAM-003 | ACTIVE referenced by active mapping | deactivate | `CAMERA_ALREADY_IN_USE` |

## 8.3 Mapping

| Case | Initial State | Action | Expected Result |
| ---- | ------------- | ------ | --------------- |
| ST-MAP-001 | isActive=true | deactivate | `isActive=false` |
| ST-MAP-002 | isActive=false | deactivate | conflict |
| ST-MAP-003 | inactive mapping -> activate when unit has no other active mapping | update `isActive=true` | allowed |
| ST-MAP-004 | inactive mapping -> activate when unit already has another active mapping | update `isActive=true` | `MAPPING_ALREADY_EXISTS` |

## 8.4 Mode

| Case | Initial State | Action | Expected Result |
| ---- | ------------- | ------ | --------------- |
| ST-MODE-001 | MANUAL | set AUTOMATIC | mode updated |
| ST-MODE-002 | AUTOMATIC | set MANUAL | mode updated |
| ST-MODE-003 | MANUAL | set MANUAL | accepted no-op or unchanged success |

---

# 9. Error / Negative Test Inputs

| Test Case ID | Feature | Scenario | Input | Expected Error |
| ------------ | ------- | -------- | ----- | -------------- |
| NEG-001 | Overview | room missing | invalid room context | `ROOM_NOT_FOUND` |
| NEG-002 | TS-D update | config id invalid | unknown id | `TSD_CONFIG_NOT_FOUND` |
| NEG-003 | TS-D sync | malformed external payload | missing external_unit_id rows | `TSD_MALFORMED_RESPONSE` or skipped rows depending mix |
| NEG-004 | Camera detail | camera not found | unknown id | `CAMERA_NOT_FOUND` |
| NEG-005 | Camera test | adapter timeout | valid id | `CAMERA_CONNECTION_FAILED` or integration fail |
| NEG-006 | Preset update | preset not found | unknown id | `PRESET_NOT_FOUND` |
| NEG-007 | Layout replace | layout not found | unknown id | `LAYOUT_NOT_FOUND` |
| NEG-008 | Annotation update | annotation not found | unknown id | `ANNOTATION_NOT_FOUND` |
| NEG-009 | Mapping update | mapping not found | unknown id | `MAPPING_NOT_FOUND` |
| NEG-010 | Readiness check | repo/system exception | room exists | `INTERNAL_ERROR` |

---

# 10. Edge Case Test Inputs

| Test Case ID | Area | Edge Case | Input / Setup | Expected Result |
| ------------ | ---- | --------- | ------------- | --------------- |
| EDGE-001 | TS-D create | username/password omitted | baseUrl only | config created |
| EDGE-002 | Camera create | `port=null` | valid camera without port | accepted if unique logic supports null port |
| EDGE-003 | Camera list | no result for search | `search="zzz"` | empty list with pagination |
| EDGE-004 | Preset list | large preset list | 50 presets | pagination/search works |
| EDGE-005 | Layout devices | boundary coord zero | `posX=0`, `posY=0` | accepted |
| EDGE-006 | Layout devices | boundary coord one | `posX=1`, `posY=1` | accepted |
| EDGE-007 | Mapping create | same camera used by multiple units with different presets | 2 units, same camera, different preset | accepted |
| EDGE-008 | Mapping deactivate | unit ends with no active mapping | deactivate last active mapping | readiness later warns, operation itself succeeds |
| EDGE-009 | Mode update | same mode selected | current=MANUAL, request=MANUAL | success no-op |
| EDGE-010 | Readiness | no cameras, no layout, no mappings | sparse config | FAILED with multiple items |

---

# 11. Mock Data Suggestions

## 11.1 Shared Roles / Actors

### Valid Admin Actor

```json
{
  "id": "admin-uuid",
  "username": "admin",
  "role": "ADMIN"
}
```

### Valid Operator Actor

```json
{
  "id": "operator-uuid",
  "username": "operator",
  "role": "OPERATOR"
}
```

### Permission Denied Actor

```json
{
  "id": "operator-uuid",
  "username": "operator",
  "role": "OPERATOR"
}
```

Use this actor for all mutate APIs to assert `FORBIDDEN`.

---

## 11.2 Room

### Valid Room

```json
{
  "id": "room-uuid",
  "name": "Meeting Room A",
  "operationMode": "MANUAL"
}
```

### Missing Room

* repository returns `null`

---

## 11.3 TS-D Configuration

### Valid Active Config

```json
{
  "id": "tsd-config-uuid",
  "roomId": "room-uuid",
  "baseUrl": "http://192.168.1.10",
  "username": "admin",
  "passwordEncrypted": "encrypted",
  "sseEndpoint": "/api/event",
  "status": "ACTIVE",
  "lastTestResult": "SUCCESS",
  "lastTestAt": "2026-04-21T09:00:00Z"
}
```

### Inactive Config

```json
{
  "id": "tsd-config-uuid",
  "roomId": "room-uuid",
  "status": "INACTIVE"
}
```

### Invalid Config Input

```json
{
  "baseUrl": "",
  "sseEndpoint": ""
}
```

---

## 11.4 TS-D Units

### Valid Unit

```json
{
  "id": "unit-uuid",
  "roomId": "room-uuid",
  "externalUnitId": "D-01",
  "unitName": "Delegate 01",
  "deviceType": "DELEGATE",
  "runtimeState": "IDLE",
  "isConnected": true
}
```

### Invalid Sync Row

```json
{
  "externalUnitId": null,
  "deviceType": "DELEGATE"
}
```

---

## 11.5 Camera

### Valid Camera

```json
{
  "id": "camera-uuid",
  "roomId": "room-uuid",
  "name": "Camera 1",
  "protocol": "ONVIF",
  "ipAddress": "192.168.1.21",
  "port": 80,
  "username": "admin",
  "passwordEncrypted": "encrypted",
  "rtspUrl": "rtsp://192.168.1.21/stream1",
  "vendor": "Hikvision",
  "model": "DS-2DE",
  "status": "ACTIVE",
  "capabilityPtz": true,
  "capabilityPreset": true,
  "capabilityStream": false
}
```

### Inactive Camera

```json
{
  "id": "camera-inactive-uuid",
  "roomId": "room-uuid",
  "status": "INACTIVE"
}
```

### Duplicate Camera Sample

```json
{
  "id": "camera-dup-uuid",
  "roomId": "room-uuid",
  "ipAddress": "192.168.1.21",
  "port": 80
}
```

### Camera Permission-Denied Action

* actor = operator
* mutate payload valid
* expected `FORBIDDEN`

---

## 11.6 Camera Preset

### Valid Preset

```json
{
  "id": "preset-uuid",
  "cameraId": "camera-uuid",
  "presetCode": "P01",
  "presetName": "Delegate 01"
}
```

### Duplicate Preset

```json
{
  "cameraId": "camera-uuid",
  "presetCode": "P01"
}
```

### Preset In Use

* preset referenced by active mapping

---

## 11.7 Layout / Devices / Annotation

### Valid Layout

```json
{
  "id": "layout-uuid",
  "roomId": "room-uuid",
  "fileName": "room-a.pdf",
  "fileType": "PDF",
  "isActive": true
}
```

### Valid Layout Device

```json
{
  "refType": "TSD_UNIT",
  "refId": "unit-uuid",
  "posX": 0.35,
  "posY": 0.52,
  "iconLabel": "Delegate 01"
}
```

### Invalid Layout Device

```json
{
  "refType": "CAMERA",
  "refId": "camera-uuid",
  "posX": 1.2,
  "posY": -0.1
}
```

### Valid Annotation

```json
{
  "id": "annotation-uuid",
  "roomId": "room-uuid",
  "text": "Chairman Table",
  "posX": 0.5,
  "posY": 0.15
}
```

---

## 11.8 Mapping

### Valid Mapping

```json
{
  "id": "mapping-uuid",
  "roomId": "room-uuid",
  "unitId": "unit-uuid",
  "cameraId": "camera-uuid",
  "presetId": "preset-uuid",
  "isActive": true
}
```

### Duplicate Active Mapping Conflict

* existing mapping active for `unit-uuid`
* create/update another mapping with same `unitId` and `isActive=true`

### Preset-Camera Mismatch Sample

* `cameraId = camera-a`
* `presetId = preset-of-camera-b`

### Null/Missing Relation Sample

* `unitId` missing in repo
* `cameraId` missing in repo
* `presetId` missing in repo

---

## 11.9 Readiness

### Fully Ready Sample

* active TS-D config exists
* last TS-D test success
* at least 1 active camera
* active layout exists
* unit list synced
* operation mode exists
* valid active mappings exist

### Warning Sample

* everything exists except some units missing mappings

### Failed Sample

* missing TS-D config and layout

---

# 12. Assumptions / Open Points

1. `Deactivate` của TS-D config, camera, mapping là soft-state transition, không hard delete.
2. `Delete preset` là hard delete nếu không có active dependency.
3. Với `Update mode` khi chọn lại đúng mode hiện tại, API có thể trả success no-op; test nên chấp nhận unchanged success nếu implementation giữ đúng design.
4. `Camera unsupported adapter` có thể map thành `422` hoặc `501` tùy policy triển khai; unit test nên khóa theo design implementation đã chọn khi code được chốt.
5. Một số list API có pagination/filtering trong contract để sẵn sàng mở rộng; nếu implementation MVP chưa làm full DB pagination thì unit test service/controller vẫn nên cover shape response và tham số vào.
6. Readiness check là read-only; không test behavior tự sửa dữ liệu vì không nằm trong scope.
7. Tài liệu này là input foundation để sinh test scripts backend/frontend ở bước tiếp theo, không phải test code thực thi.
