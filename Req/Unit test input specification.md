# Unit Test Input Specification

System: Desktop Meeting Control Application for TS-D1000 + PTZ Cameras  
Scope: Unit test input foundation based on Requirement, Use Cases, Detail Design, UI/UX Design, and API sections in the design documents.

This document does not contain executable test code.  
It defines what must be tested, which inputs should be used, what must be mocked, and what result is expected.

---

## 1. Test Scope Summary

### 1.1 Source Documents Analyzed

- Business and product requirements in `Req/Business case.md`
- Context and workflows in `Req/Project context.md`
- System overview in `Req/System overview normalized.md`
- Use cases in `Req/Use cases.md`
- System detail design in `Req/Detail design document.md`
- Authentication detail design in `Req/Detail design - Authentication.md`
- Authentication UI/UX in `Req/UI UX design - Authentication.md`
- Live Monitoring detail design in `Req/Detail design - Live Monitoring.md`
- Live Monitoring UI/UX in `Req/UI UX design - Live Monitoring.md`
- Live Monitoring API contract in `Req/API contract - Live Monitoring.md`
- API contracts embedded in the detail design documents

### 1.2 Roles In Scope

- `ADMIN`
- `OPERATOR`
- `SYSTEM` for internal runtime processing

### 1.3 Core Test Areas

- Authentication
- User management
- Layout and map management
- TS-D1000 configuration and integration
- Camera configuration and integration
- Mic-camera mapping
- Operation mode management
- Runtime event processing
- Manual speaking control
- Camera manual operation
- Live video monitoring
- Logging and audit
- Shared validation, error handling, permission checks, and state transitions

### 1.4 Test Objectives

- Validate business rules from use cases and detailed design
- Validate request DTOs and API behavior
- Validate permission enforcement for `ADMIN` and `OPERATOR`
- Validate runtime state transitions and anti-invalid-state behavior
- Validate UI behavior for authentication and app shell access
- Validate side effects such as audit logs and system logs

---

## 2. Modules / Features To Test

| Module | Feature | Related Requirement / Design | Related UC | Related API | Related UI |
| --- | --- | --- | --- | --- | --- |
| Authentication | Login | Auth detail design sections 1, 4, 5 | UC-AUTH-01 | `POST /auth/login` | Login page |
| Authentication | Logout | Auth detail design sections 1, 4, 5 | UC-AUTH-02 | `POST /auth/logout` | Top-right logout action |
| Authentication | Current auth context | Auth detail design section 4.4 | Supporting | `GET /auth/me` | App bootstrap / route guard |
| User Management | Create user | System detail design section 5.2 | UC-USER-01 | `POST /users` | Admin config users page |
| User Management | Update user | System detail design section 5.2 | UC-USER-02 | `PUT /users/{id}` | Admin config users page |
| User Management | View users | System detail design section 4.3 | UC-USER-03 | `GET /users` | Admin config users page |
| User Management | Activate/deactivate | System detail design section 5.2 | UC-USER-04 | `PATCH /users/{id}/status` | Admin config users page |
| Layout & Map | Upload layout | System detail design section 5.3 | UC-LAYOUT-01 | `POST /rooms/{roomId}/layout` | Layout management page |
| Layout & Map | Save device positions | System detail design section 5.3 | UC-LAYOUT-02 | `PUT /rooms/{roomId}/layout/devices` | Layout canvas |
| Layout & Map | Save annotation | System detail design section 5.3 | UC-LAYOUT-03 | `POST /rooms/{roomId}/annotations`, `PUT /annotations/{id}` | Layout canvas |
| TS-D1000 | Save connection config | System detail design section 5.4 | UC-TSD-01 | `PUT /rooms/{roomId}/tsd/connection` | TS-D config page |
| TS-D1000 | Test connection | System detail design section 5.4 | UC-TSD-01 | `POST /rooms/{roomId}/tsd/test-connection` | TS-D config page |
| TS-D1000 | Sync units | System detail design section 5.4 | UC-TSD-02 | `POST /rooms/{roomId}/tsd/sync-units` | TS-D config page |
| Operation Mode | Change mode | System detail design sections 4.5, 5.4 | UC-TSD-03, UC-MODE-01 | `PUT /rooms/{roomId}/operation-mode` | Mode config page |
| Camera | Add camera | System detail design section 5.5 | UC-CAM-01 | `POST /rooms/{roomId}/cameras` | Camera config page |
| Camera | Update camera | System detail design section 5.5 | UC-CAM-02 | `PUT /cameras/{id}` | Camera config page |
| Camera | Test camera | System detail design section 5.5 | UC-CAM-03 | `POST /cameras/{id}/test-connection` | Camera config page |
| Camera | Save preset | System detail design section 5.5 | UC-CAM-04 | `POST /cameras/{id}/presets` | Camera preset UI |
| Camera | Recall preset | System detail design section 5.5 | UC-PTZ-01 | `POST /cameras/{id}/recall-preset` | Camera control page |
| Camera | Manual PTZ | System detail design section 5.5 | UC-PTZ-02 | `POST /cameras/{id}/ptz` | Camera control page |
| Mapping | Create mapping | System detail design section 5.6 | UC-MAP-01 | `POST /rooms/{roomId}/mappings` | Mapping page |
| Mapping | Update mapping | System detail design section 5.6 | UC-MAP-02 | `PUT /mappings/{id}` | Mapping page |
| Mapping | View mapping list | System detail design section 4.7 | UC-MAP-03 | `GET /rooms/{roomId}/mappings` | Mapping page |
| Runtime | Receive SSE event | System detail design section 5.7 | UC-RT-01 | Internal SSE consumer | Runtime background process |
| Runtime | Update map highlight | System detail design sections 5.7, 6 | UC-RT-02 | Internal event-driven | Dashboard / map view |
| Runtime | Trigger camera by speaker | System detail design sections 5.7, 5.9 | UC-RT-03 | Internal rule engine | Dashboard / map view |
| Manual Speaking | View queue | System detail design section 5.8 | UC-MANUAL-01 | `GET /rooms/{roomId}/speaking-requests` | Manual queue panel |
| Manual Speaking | Approve request | System detail design section 5.8 | UC-MANUAL-02 | `POST /speaking-requests/{id}/approve` | Manual queue panel |
| Manual Speaking | Reject request | System detail design section 5.8 | UC-MANUAL-03 | `POST /speaking-requests/{id}/reject` | Manual queue panel |
| Live Video | Get live view config | System detail design section 5.10 | UC-VIDEO-01 | `GET /rooms/{roomId}/live-view/config` | Live view page |
| Live Video | Change layout | System detail design section 5.10 | UC-VIDEO-02 | `PUT /rooms/{roomId}/live-view/layout` | Live view page |
| Logs | Audit logging | System detail design section 5.11 | UC-LOG-01 | Internal | N/A |
| Logs | View logs | System detail design section 4.11 | UC-LOG-02 | `GET /audit-logs`, `GET /system-logs` | Logs page |

---

## 3. Requirement-to-Test Mapping

| Requirement Area | Test Focus |
| --- | --- |
| Role-based access | Verify `ADMIN` vs `OPERATOR` API access and UI visibility |
| Manual vs automatic mode | Verify behavior differences for speaking request queue and camera trigger timing |
| Runtime state changes | Verify `IDLE -> REQUEST -> SPEAKING -> IDLE` and invalid transitions rejection |
| Camera switching rules | Verify chairman priority, recent speaker priority among delegates, anti-jitter delay |
| Validation | Verify required fields, enums, ranges, cross-field relations, duplicates |
| Side effects | Verify audit log write, system log write, session revoke, state updates |
| Resilience | Verify SSE reconnect handling, integration failure mapping, graceful runtime degradation |

---

## 4. Backend Unit Test Input Matrix

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock / Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BE-AUTH-001 | Auth login | UC-AUTH-01 | Validate successful login for active admin | User exists, status ACTIVE | `username=admin`, `password=Admin123!` | Mock user repo returns admin; password compare true; session repo insert success; token signer success | Call `AuthService.login` | Token returned, role resolved, session created, audit login success | None | Happy path |
| BE-AUTH-002 | Auth login | UC-AUTH-01 | Reject unknown username | No matching user | `username=missing`, `password=Admin123!` | Mock user repo returns null | Call login | No session created, audit login failed | `401 INVALID_CREDENTIALS` | Generic credential error |
| BE-AUTH-003 | Auth login | UC-AUTH-01 | Reject wrong password | User exists ACTIVE | `username=admin`, `password=Wrong123!` | Mock user repo returns user; password compare false | Call login | No session created, audit fail | `401 INVALID_CREDENTIALS` | Must not disclose whether username exists |
| BE-AUTH-004 | Auth login | UC-AUTH-01 | Reject inactive user | User exists INACTIVE | `username=operator1`, `password=StrongPass123` | Mock user repo returns inactive user | Call login | No session created, audit fail | `403 USER_INACTIVE` | Business rule |
| BE-AUTH-005 | Auth login | Auth design | Validate payload requirement enforcement | None | `username=''`, `password=''` | DTO validation pipe active | Call controller/login DTO validation | Request rejected before service | `400 VALIDATION_ERROR` | Field-level validation |
| BE-AUTH-006 | Auth logout | UC-AUTH-02 | Revoke active session successfully | Valid token, active session | `sessionId=current` | Mock session repo returns ACTIVE session | Call logout | Session set to REVOKED, audit logout success | None | Happy path |
| BE-AUTH-007 | Auth logout | Auth design | Reject logout for revoked session | Session already REVOKED | `sessionId=current` | Mock session repo returns REVOKED | Call logout | No new revoke | `401 SESSION_REVOKED` or `401 UNAUTHORIZED` | UX still clears client state |
| BE-AUTH-008 | Auth me / guard | Auth design | Resolve active current user from token/session | Valid token, active session, active user | JWT payload valid | Mock JWT verify success; session ACTIVE; user ACTIVE | Call guard validate or strategy validate | Request auth context attached | None | Guard path |
| BE-AUTH-009 | Auth me / guard | Auth design | Reject expired token/session | Expired session | JWT with expired exp or session expired_at past | Mock token or session expiry | Call guard | Request blocked | `401 SESSION_EXPIRED` | Runtime validation, not only cleanup job |
| BE-AUTH-010 | Roles guard | Auth design | Enforce role restriction | Authenticated operator | Required role `ADMIN` | Mock request user role OPERATOR | Call `RolesGuard.canActivate` | Access denied | `403 FORBIDDEN` | Permission test |
| BE-USER-001 | Create user | UC-USER-01 | Create valid operator user | Admin authenticated | username unique, role OPERATOR, ACTIVE | Mock permission pass; username not found; hash success; repo insert success | Call create | User persisted, audit success | None | Happy path |
| BE-USER-002 | Create user | UC-USER-01 | Reject duplicate username | Existing username case-insensitive | `username='Admin'` | Mock repo finds existing `admin` | Call create | No insert | `409 USERNAME_ALREADY_EXISTS` | Case-insensitive uniqueness |
| BE-USER-003 | Create user DTO | UC-USER-01 | Reject missing password | Admin authenticated | password omitted | DTO validation active | Validate request | Rejected | `400 VALIDATION_ERROR` | Required field |
| BE-USER-004 | Update user | UC-USER-02 | Update role and status successfully | Admin authenticated, target exists | `role=OPERATOR`, `status=ACTIVE` | Mock repo finds target; update success | Call update | User updated, audit success | None | Happy path |
| BE-USER-005 | Change user status | UC-USER-04 | Prevent deactivating last active admin | Only one active admin remains | target admin set INACTIVE | Mock repo returns one active admin only | Call change status | No update | `422` or business-rule error | Must be explicitly covered |
| BE-USER-006 | User list permission | UC-USER-03 | Block operator from viewing user admin list | Operator authenticated | N/A | Roles guard with ADMIN-only route | Request GET users | Access denied | `403 FORBIDDEN` | Permission path |
| BE-LAYOUT-001 | Upload layout | UC-LAYOUT-01 | Accept valid PDF upload | Admin authenticated | file type PDF | Mock storage success, room exists | Call upload | Layout upserted, audit success | None | Happy path |
| BE-LAYOUT-002 | Upload layout | UC-LAYOUT-01 | Reject unsupported file type | Admin authenticated | file type PNG | Validation active | Upload request | Rejected | `400 VALIDATION_ERROR` | Only PDF/JPG/JPEG |
| BE-LAYOUT-003 | Save device positions | UC-LAYOUT-02 | Save valid mic/camera coordinates | Layout exists, refs exist | `posX=0.35`, `posY=0.52`, valid refs | Mock layout exists, referenced entities exist | Call save positions | Upsert layout_devices success | None | Happy path |
| BE-LAYOUT-004 | Save device positions | UC-LAYOUT-02 | Reject coordinate out of range | Layout exists | `posX=1.2`, `posY=-0.1` | Validation active | Save positions | Rejected | `400 VALIDATION_ERROR` | Boundary validation |
| BE-LAYOUT-005 | Save annotation | UC-LAYOUT-03 | Reject empty annotation text | Layout exists | `text=''` | DTO/service validation active | Save annotation | Rejected | `400 VALIDATION_ERROR` | Non-empty text |
| BE-TSD-001 | Save TS-D config | UC-TSD-01 | Save valid TS-D connection | Admin authenticated | baseUrl valid, sseEndpoint `/api/event` | Mock encryption success, repo upsert success | Call save config | Config persisted, audit success | None | Happy path |
| BE-TSD-002 | Test TS-D connection | UC-TSD-01 | Return SUCCESS on healthy device | Config exists | N/A | Mock TS-D adapter health success | Call test connection | last_test_result updated SUCCESS, system log written | None | Integration success |
| BE-TSD-003 | Test TS-D connection | UC-TSD-01 | Return FAILED on device timeout | Config exists | N/A | Mock TS-D adapter timeout | Call test connection | result FAILED, system log error | `502/503` or mapped integration error | Integration failure |
| BE-TSD-004 | Sync units | UC-TSD-02 | Upsert units from API payload | Valid TS-D connection | API returns chairman + delegate list | Mock adapter returns unit list | Call sync units | Existing units updated, new units inserted, audit and system logs written | None | Happy path |
| BE-TSD-005 | Change mode | UC-MODE-01 | Persist MANUAL or AUTOMATIC only | Room exists | `mode='MANUAL'` | Mock room repo update success | Call mode change | Room mode updated, audit success | None | Enum-only |
| BE-CAM-001 | Add camera | UC-CAM-01 | Add valid ONVIF camera | Admin authenticated, room has < 4 cameras | valid IP/port/protocol | Mock count=1, repo insert success | Call add camera | Camera created, runtime state initialized, audit success | None | Happy path |
| BE-CAM-002 | Add camera | UC-CAM-01 | Reject 5th camera in MVP | Room already has 4 cameras | valid camera payload | Mock camera count=4 | Call add camera | No insert | `409` or business-rule error | MVP constraint |
| BE-CAM-003 | Test camera connection | UC-CAM-03 | Record PARTIAL capability response | Camera exists | N/A | Mock adapter returns ptz=true preset=true stream=false | Call test connection | capability fields updated, result PARTIAL, logs written | None | Capability split |
| BE-CAM-004 | Save preset | UC-CAM-04 | Reject preset save if camera lacks preset capability | Camera exists, capability_preset=false | `presetCode='P01'` | Mock camera capability false | Call save preset | No preset saved | `422` or business-rule error | Business validation |
| BE-CAM-005 | Recall preset | UC-PTZ-01 | Reject preset not belonging to camera | Camera A selected, preset belongs to camera B | mismatched cameraId/presetId | Mock preset relation mismatch | Call recall preset | No adapter call | `422` | Cross-field validation |
| BE-CAM-006 | Manual PTZ | UC-PTZ-02 | Reject unsupported PTZ action for capability false | Camera exists, capability_ptz=false | `action='PAN_LEFT'` | Mock camera capability false | Call PTZ | No adapter call | `422` | Business rule |
| BE-MAP-001 | Create mapping | UC-MAP-01 | Create valid mapping | Unit, camera, preset exist and related | valid ids | Mock relation valid, no active mapping conflict | Call create mapping | Mapping active, audit success | None | Happy path |
| BE-MAP-002 | Create mapping | UC-MAP-01 | Reject preset that does not belong to selected camera | Unit exists | cameraId A, presetId from B | Mock mismatch | Call create mapping | No insert | `422` or validation error | Cross-field rule |
| BE-MAP-003 | Update mapping | UC-MAP-02 | Enforce one active mapping per unit | Existing active mapping | update new mapping active=true | Mock another active mapping exists | Call update mapping | Previous mapping deactivated or operation rejected according to chosen implementation | None or conflict | Mark implementation-dependent |
| BE-RT-001 | Handle talk request | UC-RT-01, UC-MANUAL-01 | Create pending request in MANUAL mode | Room MANUAL, unit exists | SSE talk request event | Mock mode=MANUAL, no pending request | Process event | unit state REQUEST, speaking_request PENDING created, event marked processed | None | Core runtime path |
| BE-RT-002 | Handle talk request | UC-RT-01 | Do not create pending request in AUTOMATIC mode | Room AUTOMATIC | same event | Mock mode=AUTOMATIC | Process event | unit state REQUEST, no speaking_request created | None | Mode-specific behavior |
| BE-RT-003 | Handle speaker start | UC-RT-03 | Move unit to SPEAKING and trigger camera engine | Unit exists, mapping exists | speaker-start event | Mock mapping exists, camera engine success | Process event | unit SPEAKING, pending request APPROVED if applicable, camera trigger called | None | Happy path |
| BE-RT-004 | Handle speaker stop | UC-RT-02 | Move unit to IDLE | Unit currently SPEAKING | stop event | Mock unit exists | Process event | unit IDLE, UI broadcast update emitted | None | State transition |
| BE-RT-005 | Runtime invalid payload | UC-RT-01 | Skip malformed payload and log error | SSE connected | bad payload | Mock parse failure | Process event | event FAILED or ignored, system log error | Error recorded | Negative case |
| BE-RULE-001 | Camera rule engine | UC-RT-03 | Prioritize chairman over delegate | Chairman and delegate both SPEAKING | multiple active units | Mock states + mappings + no recent switch | Run rule engine | Chairman selected | None | Priority rule |
| BE-RULE-002 | Camera rule engine | UC-RT-03 | Among delegates choose most recently active | Multiple delegates SPEAKING | delegate last_event_at differs | Mock no chairman active | Run rule engine | Latest delegate selected | None | Recency rule |
| BE-RULE-003 | Camera rule engine | UC-RT-03 | Suppress switch inside anti-jitter window | Current focus set recently | new speaker event within `CAMERA_SWITCH_MIN_INTERVAL_MS` | Mock lastSwitchAt recent | Run rule engine | No adapter recall call | None | Anti-jitter |
| BE-MANUAL-001 | View queue | UC-MANUAL-01 | Return pending requests only in MANUAL mode | Room MANUAL | query `status=PENDING` | Mock pending requests list | Call list | Sorted pending queue returned | None | Happy path |
| BE-MANUAL-002 | Approve request | UC-MANUAL-02 | Approve valid pending request in MANUAL mode | Request PENDING, room MANUAL | requestId valid | Mock TS-D approve success; await SSE semantics if required | Call approve | Request remains pending until SSE or becomes approved per implementation note; audit success | None | Note implementation branch |
| BE-MANUAL-003 | Approve request | UC-MANUAL-02 | Reject approve when room AUTOMATIC | Request PENDING, room AUTOMATIC | requestId valid | Mock room mode AUTOMATIC | Call approve | No TS-D command | `422` | Business rule |
| BE-MANUAL-004 | Reject request | UC-MANUAL-03 | Reject valid pending request with no camera action | Request PENDING, room MANUAL | requestId valid | Mock TS-D reject success | Call reject | Request REJECTED, unit idle/request cleared, no camera trigger, audit success | None | Happy path |
| BE-VIDEO-001 | Live view config | UC-VIDEO-01 | Return cameras with stream capability | Cameras exist | N/A | Mock only stream-capable cameras | Call get config | maxViews=4, selected layout returned, cameras listed | None | Happy path |
| BE-VIDEO-002 | Live view layout | UC-VIDEO-02 | Reject more selected cameras than layout count | Layout 2, selected 3 cameras | `layout=2`, `cameraIds=[a,b,c]` | Mock cameras valid | Call set layout | Rejected | `400/422` | Cross-field validation |
| BE-LOG-001 | Audit logging | UC-LOG-01 | Ensure critical action creates audit log | Example approve request | action context present | Mock log repo write | Call service | audit log inserted with actor/action/result/target | None | Side effect |
| BE-LOG-002 | View logs permission | UC-LOG-02 | Block operator from admin logs | Operator authenticated | N/A | Roles guard active | Request logs endpoint | Access denied | `403 FORBIDDEN` | Permission test |
| BE-JOB-001 | Session expiry cleanup | Auth detail design | Mark active expired sessions as EXPIRED | Sessions exist past expires_at | expired sessions list | Mock session repo query/update | Run cleanup job | expired sessions updated, system log summary written | None | Scheduled job |
| BE-JOB-002 | SSE reconnect worker | Detail design section 9 | Retry on disconnect with backoff | SSE disconnected | reconnect attempt count | Mock disconnect and retry scheduler | Run worker | retries scheduled within configured bounds, warning log written | None | Worker logic |

---

## 5. Frontend Unit Test Input Matrix

| Test Case ID | Feature / Module | Related Requirement / UC | Test Objective | Preconditions | Input Data | Mock / Dependency Setup | Action | Expected Result | Expected Error | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FE-AUTH-001 | Login page render | UC-AUTH-01, Auth UI | Render login page in logged-out state | No auth token | N/A | Mock auth context unauthenticated | Render page | Username, password, login button visible; no sidebar | None | Base rendering |
| FE-AUTH-002 | Login form validation | Auth UI | Show required error for empty username | Login page open | username empty, password valid | Mock submit handler not called | Blur or submit | Field error "Username is required" shown | None | Inline validation |
| FE-AUTH-003 | Login form validation | Auth UI | Show required error for empty password | Login page open | username valid, password empty | Mock submit handler not called | Submit | Field error "Password is required" shown | None | Inline validation |
| FE-AUTH-004 | Login submit success | UC-AUTH-01 | Redirect after successful login | Valid API response | username/password valid | Mock login API success, token store success | Submit form | Button loading during call, token stored, redirect to dashboard | None | Happy path |
| FE-AUTH-005 | Login submit invalid credentials | Auth UI | Show global auth error on 401 | Login page open | wrong credentials | Mock API 401 INVALID_CREDENTIALS | Submit form | Global alert shows "Invalid username or password" | None | Error mapping |
| FE-AUTH-006 | Login submit inactive user | Auth UI | Show inactive account message | Login page open | inactive account credentials | Mock API 403 USER_INACTIVE | Submit form | Global alert shows "User account is inactive" | None | Error mapping |
| FE-AUTH-007 | Login submit network error | Auth UI | Show retry/network message | Login page open | valid credentials | Mock network failure | Submit form | Error shown "Unable to connect. Please check network." | None | Negative case |
| FE-AUTH-008 | Login loading state | Auth UI | Disable button and show spinner while submitting | Login form ready | valid credentials | Mock pending promise | Submit form | Button disabled, spinner visible, duplicate submit blocked | None | UI state |
| FE-AUTH-009 | Auth bootstrap | Auth UI | Restore persisted token and request `/auth/me` | Local auth data exists | token in storage | Mock `/auth/me` success | App bootstrap | Authenticated shell rendered, user info loaded | None | Bootstrap behavior |
| FE-AUTH-010 | Token expired handling | Auth UI | Redirect to login on invalid `/auth/me` | Stale token in storage | token invalid | Mock `/auth/me` 401 SESSION_EXPIRED | App bootstrap | Local auth cleared, login page shown, session-expired message shown | None | Edge UX |
| FE-AUTH-011 | Logout confirm flow | UC-AUTH-02 | Confirm then clear auth and redirect | Logged in | N/A | Mock logout API success | Click logout and confirm | Logout API called, token cleared, redirect to login | None | Happy path |
| FE-AUTH-012 | Logout API fail UX | Auth UI | Clear client state even if logout API fails | Logged in | N/A | Mock logout API 401/500 | Click logout and confirm | Local auth cleared anyway, redirected to login | None | UX rule |
| FE-AUTH-013 | Role-based sidebar admin | Auth UI + auth context | Show admin-only nav items for admin | Logged in as admin | role ADMIN | Mock auth context admin | Render app shell | Config and Logs menu visible | None | Role rendering |
| FE-AUTH-014 | Role-based sidebar operator | Auth UI + auth context | Hide admin-only nav items for operator | Logged in as operator | role OPERATOR | Mock auth context operator | Render app shell | Config and Logs hidden | None | Role rendering |
| FE-AUTH-015 | Protected route | Auth UI | Block direct route access without auth | No auth token | N/A | Mock auth context unauthenticated | Navigate to protected route | Redirect to login | None | Route guard |
| FE-MAP-001 | Map highlight render | UC-RT-02 | Render request and speaking states differently | Layout configured | runtime state request vs speaking | Mock runtime state store | Render map icons | Request color and speaking color differ | None | UI rule from design |
| FE-MANUAL-001 | Request queue render | UC-MANUAL-01 | Show pending requests list in manual mode | Room mode MANUAL | pending queue items | Mock query success | Render queue | Pending requests visible in expected order | None | Manual panel |
| FE-MANUAL-002 | Approve button state | UC-MANUAL-02 | Disable action buttons during submit | Pending request shown | request selected | Mock pending approve promise | Click approve | Approve button loading/disabled; prevent double click | None | UI interaction |
| FE-MANUAL-003 | Reject action no camera UI side effect | UC-MANUAL-03 | Ensure reject only updates queue state | Pending request selected | reject action | Mock reject success, no camera change event | Click reject | Request removed/updated, no active speaker/camera highlight change until runtime event | None | UI consistency |
| FE-VIDEO-001 | Live layout change | UC-VIDEO-02 | Render chosen layout 1-4 views | Live view open | layout values 1,2,3,4 | Mock available streams | Change layout | Corresponding view slots rendered | None | UI behavior |
| FE-STATE-001 | Empty state rendering | Multiple | Show empty state when no data available | No queue / no users / no logs | empty arrays | Mock zero-result responses | Render page | Empty state component visible | None | Generic UI pattern |
| FE-STATE-002 | Loading state rendering | Multiple | Show loading while API in progress | Route loaded | N/A | Mock pending API promise | Render page | Loading indicator shown, actions disabled if applicable | None | Generic UI pattern |
| FE-STATE-003 | Error state rendering | Multiple | Show error fallback on failed request | Route loaded | N/A | Mock API failure | Render page | Error banner/state shown | None | Generic UI pattern |

---

## 6. Validation Test Inputs

| Category | Field / Rule | Valid Input | Invalid Input | Expected Behavior |
| --- | --- | --- | --- | --- |
| Auth | username required | `admin` | `''`, `'   '`, `null`, `undefined` | Reject invalid input with validation error |
| Auth | password required | `Admin123!` | `''`, `'   '`, `null`, `undefined` | Reject invalid input |
| Users | username unique case-insensitive | `operator2` | `Admin` when `admin` exists | Conflict / duplicate rejection |
| Users | password min length | `StrongPass123` | `123`, `abc` | Reject input |
| Users | role enum | `ADMIN`, `OPERATOR` | `SUPERADMIN`, `viewer` | Reject input |
| Layout | file type | PDF/JPG/JPEG | PNG/DOCX | Reject upload |
| Layout | coordinates | `0`, `0.5`, `1` | `-0.1`, `1.01` | Reject invalid coordinate |
| TS-D | baseUrl required | `http://192.168.1.10` | `''`, `null` | Reject invalid config |
| Camera | protocol enum | `ONVIF`, `VISCA` | `RTSP`, `HTTP` | Reject input |
| Camera | port range | `80`, `554`, `65535` | `0`, `65536`, `-1` | Reject input |
| Camera preset | preset unique per camera | `P01` for camera A | duplicate `P01` for same camera | Reject duplicate |
| Mapping | preset belongs to camera | preset from selected camera | preset from another camera | Reject |
| Manual control | request must be PENDING | pending request | approved/rejected request | Reject action |
| Live view | selected cameras <= layout | 2 cameras with layout 2 | 3 cameras with layout 2 | Reject |

---

## 7. Permission Test Inputs

| Test Area | Actor | Operation | Expected Result |
| --- | --- | --- | --- |
| Auth | Public | Login | Allowed |
| Auth | Admin / Operator | Logout | Allowed |
| Users | Admin | Create/update/view/deactivate users | Allowed |
| Users | Operator | Any user management API | Forbidden |
| Layout | Admin | Upload / edit layout | Allowed |
| Layout | Operator | Upload / edit layout | Forbidden |
| TS-D config | Admin | Save config / sync / change mode | Allowed |
| TS-D config | Operator | Save config / sync / change mode | Forbidden |
| Cameras list | Admin / Operator | View cameras | Allowed |
| Camera add/update/test | Admin | Allowed | Allowed |
| Camera add/update/test | Operator | Restricted | Forbidden |
| Camera recall/PTZ | Admin / Operator | Allowed if camera capability supports | Allowed or business-rule rejection |
| Mapping CRUD | Admin | Allowed | Allowed |
| Mapping CRUD | Operator | Forbidden | Forbidden |
| Manual request queue | Admin / Operator | View and act | Allowed |
| Logs view | Admin | Allowed | Allowed |
| Logs view | Operator | Restricted | Forbidden |

---

## 8. State Transition Test Inputs

### 8.1 Unit Runtime State

| Test Case ID | Current State | Trigger | Expected Next State | Notes |
| --- | --- | --- | --- | --- |
| ST-UNIT-001 | `IDLE` | talk request event | `REQUEST` | Manual and automatic both update runtime request state |
| ST-UNIT-002 | `REQUEST` | approve + speaker-start event | `SPEAKING` | Final speaking state should be event-confirmed |
| ST-UNIT-003 | `REQUEST` | reject / cancel / clear event | `IDLE` | No camera action |
| ST-UNIT-004 | `SPEAKING` | stop/end event | `IDLE` | Normal close |
| ST-UNIT-005 | `SPEAKING` | request event | invalid | Must be ignored or logged as invalid semantics |

### 8.2 Speaking Request Status

| Test Case ID | Current Status | Trigger | Expected Next Status | Notes |
| --- | --- | --- | --- | --- |
| ST-REQ-001 | none | manual talk request | `PENDING` | One unresolved pending request per unit |
| ST-REQ-002 | `PENDING` | approve confirmed by TS-D / SSE | `APPROVED` | Design note: exact timing depends on API semantics |
| ST-REQ-003 | `PENDING` | reject success | `REJECTED` | No camera trigger |
| ST-REQ-004 | `PENDING` | request cancelled / cleared | `CANCELLED` | Only if semantics are confirmed |
| ST-REQ-005 | `PENDING` | expiry job, if later added | `EXPIRED` | Out of MVP unless explicitly implemented |

### 8.3 Session Status

| Test Case ID | Current Status | Trigger | Expected Next Status |
| --- | --- | --- | --- |
| ST-SESSION-001 | `ACTIVE` | logout | `REVOKED` |
| ST-SESSION-002 | `ACTIVE` | past `expires_at` | `EXPIRED` |
| ST-SESSION-003 | `REVOKED` | protected API access | rejected, no transition |

---

## 9. Error / Negative Test Inputs

| Test Area | Negative Input / Condition | Expected Result |
| --- | --- | --- |
| Login | Wrong password | `401 INVALID_CREDENTIALS` |
| Login | Inactive user | `403 USER_INACTIVE` |
| Logout | Missing token | `401 UNAUTHORIZED` |
| Auth guard | Session revoked | `401 SESSION_REVOKED` |
| Create user | Duplicate username | `409 USERNAME_ALREADY_EXISTS` |
| Deactivate admin | Last active admin | Business-rule rejection |
| Upload layout | Wrong file type | `400 VALIDATION_ERROR` |
| Save device positions | Unknown `refId` | Reject save |
| TS-D test connection | Device timeout | Integration error and system log |
| Add camera | Max 4 exceeded | Conflict / rule error |
| Save preset | Camera not preset-capable | Rule error |
| Recall preset | Preset-camera mismatch | Validation / business-rule error |
| Mapping | Unit missing or preset mismatch | Validation / rule error |
| Approve request | Request not pending | Rule error |
| Approve request | Room in AUTOMATIC mode | Rule error |
| Reject request | Request already resolved | Rule error |
| Runtime event parse | Malformed payload | Event skipped or failed, system log written |
| Live view layout | More cameras than selected layout | Validation / rule error |
| Logs view | Operator access | `403 FORBIDDEN` |

---

## 10. Edge Case Test Inputs

| Area | Edge Case | Input Example | Expected Behavior |
| --- | --- | --- | --- |
| Auth | Username with leading/trailing spaces | `'  admin  '` | Trimmed before lookup |
| Auth | Empty string vs null vs undefined | `''`, `null`, `undefined` | Same validation failure category |
| Users | Username case-insensitive duplicate | `Admin` vs existing `admin` | Conflict |
| Layout | Coordinate boundaries | `0`, `1` | Accepted |
| Layout | No layout exists before placing devices | room without layout | Operation blocked |
| Camera | Port omitted | `null` | Accepted if optional |
| Camera | Partial capability test response | only PTZ and preset true | Success with PARTIAL result |
| Mapping | Multiple mic mappings to one camera different presets | units A/B to same camera | Allowed |
| Manual queue | Multiple pending requests same time | 3 requests | Sorted in defined order |
| Runtime | No mapping for active speaker | unit SPEAKING without mapping | No camera action, warning log |
| Rule engine | Same current target speaker | current target equals selected target | No duplicate recall command |
| Live view | No stream-capable cameras | empty camera list | Empty state, no crash |
| Logs | No logs returned | empty array | Empty state |

---

## 11. Mock Data Suggestions

### 11.1 Authentication

| Mock Type | Suggested Data |
| --- | --- |
| Valid active admin | `username=admin`, `role=ADMIN`, `status=ACTIVE`, valid password hash |
| Valid active operator | `username=operator1`, `role=OPERATOR`, `status=ACTIVE`, valid password hash |
| Inactive user | same as above but `status=INACTIVE` |
| Revoked session | session record with `status=REVOKED` |
| Expired session | session with `expires_at < now()` |
| Invalid token payload | missing `sid` or bad signature |

### 11.2 Users

| Mock Type | Suggested Data |
| --- | --- |
| Valid create payload | `operator2 / StrongPass123 / OPERATOR / ACTIVE` |
| Duplicate payload | `Admin / StrongPass123 / ADMIN / ACTIVE` when `admin` exists |
| Invalid role | `role=SUPERADMIN` |
| Last active admin set | one admin ACTIVE, others INACTIVE |

### 11.3 Layout

| Mock Type | Suggested Data |
| --- | --- |
| Valid layout file | `meeting-layout.pdf` |
| Invalid layout file | `meeting-layout.png` |
| Valid position | `posX=0.35`, `posY=0.52` |
| Invalid position | `posX=1.2`, `posY=-0.5` |
| Valid annotation | `text='Main table'`, coordinates valid |
| Invalid annotation | empty text |

### 11.4 TS-D1000

| Mock Type | Suggested Data |
| --- | --- |
| Valid connection config | `baseUrl=http://192.168.1.10`, `sseEndpoint=/api/event` |
| Failed health check | timeout / refused connection |
| Unit sync payload | one chairman + two delegates |
| Malformed SSE event | missing event type or invalid JSON payload |

### 11.5 Camera

| Mock Type | Suggested Data |
| --- | --- |
| Valid ONVIF camera | `Camera 1`, `192.168.1.20`, `protocol=ONVIF`, capability all true |
| Partial capability camera | PTZ/preset true, stream false |
| Non-PTZ camera | capability_ptz false |
| Preset-camera mismatch | preset belongs to camera B while command uses camera A |
| 5th camera candidate | room already contains 4 cameras |

### 11.6 Mapping

| Mock Type | Suggested Data |
| --- | --- |
| Valid mapping | unit A -> camera A -> preset P01 |
| Duplicate active mapping | unit A already mapped active to another preset |
| Null relation | missing unit, missing camera, missing preset |

### 11.7 Runtime / Manual Control

| Mock Type | Suggested Data |
| --- | --- |
| Talk request event | `eventType=request-talk`, `unitId=DG-001` |
| Speaker start event | `eventType=unit-start`, `unitId=DG-001` |
| Speaker stop event | `eventType=unit-stop`, `unitId=DG-001` |
| Chairman event | active chairman and active delegate simultaneously |
| Pending request | status PENDING, room mode MANUAL |
| Already resolved request | status APPROVED or REJECTED |

### 11.8 Frontend Auth

| Mock Type | Suggested Data |
| --- | --- |
| Login success response | token + user `{ role: ADMIN }` |
| Invalid credentials response | `401 INVALID_CREDENTIALS` |
| Inactive user response | `403 USER_INACTIVE` |
| Session expired response | `401 SESSION_EXPIRED` from `/auth/me` |
| Network failure | fetch reject / timeout |

---

## 12. Assumptions / Open Points

| Topic | Assumption / Open Point | Impact On Test Input |
| --- | --- | --- |
| API contract source | No separate API contract file was provided; API behavior is taken from API sections in detail design docs | Test inputs map to documented endpoints in design |
| Approve timing | In manual mode, request may stay `PENDING` until SSE speaker-start confirms speaking, depending on TS-D semantics | Two test branches may be required in implementation |
| Reject timing | Unit may return to `IDLE` immediately or only after TS-D clear confirmation | Mark as implementation-dependent validation |
| Mapping update rule | Existing active mapping may be auto-deactivated or operation may be rejected, depending on implementation choice | Tests should confirm chosen behavior once coded |
| Runtime UI components | Only Authentication UI/UX is explicitly documented; non-auth UI tests are inferred from use cases and system behavior, not pixel details | Frontend test inputs outside auth focus on behavior, not visual design specifics |
| Pending request expiry | Expiry is not in MVP unless explicitly implemented later | Do not generate mandatory expiry-script tests unless feature is added |
| Multi-room | MVP is single-room only | No multi-room concurrency test scope included |
| Live stream decoding | Video decode engine specifics are not documented | Unit tests should focus on config/layout logic, not media decoding internals |

---

## 13. Suggested Next Step

This specification is ready to drive:

1. Backend Jest unit test generation
2. Frontend React Testing Library / Vitest unit test generation
3. DTO validation test generation
4. Guard / permission test generation
5. Service-level business rule test generation

It should be used as the source for naming, mocks, expected assertions, and coverage planning before writing actual test code.
