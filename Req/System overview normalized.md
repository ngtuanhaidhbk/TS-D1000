# System Overview (Normalized)

## What the System Does

He thong la mot Desktop Control Application giup:

- Nhan trang thai real-time tu TOA TS-D1000 qua SSE API
- Dieu khien camera PTZ (ONVIF / VISCA)
- Tu dong hoac thu cong dieu phoi:
  - quyen phat bieu
  - goc quay camera
- Hien thi trang thai tren map layout (PDF/JPG)

Core value:

- Dong bo micro -> quyen noi -> camera -> UI

## Who Uses It

### Admin

- Cau hinh he thong
- Setup thiet bi va camera

### Operator (User)

- Giam sat
- Approve/Reject phat bieu
- Van hanh camera

## Core Workflows

### Workflow 1 - System Initialization

User actions:

1. Admin login
2. Upload layout (PDF/JPG)
3. Drag-drop:
   - TS-D1000 units (mic)
   - Camera positions
4. Config:
   - mic -> camera preset mapping
   - mode (Manual / Auto)
5. Save config

System actions:

- Luu config (DB)
- Load layout + positions
- Init device connections

### Workflow 2 - Real-time Event Handling (Core Loop)

1. Delegate nhan "Talk"
2. TS-D1000 gui event (SSE `/api/event`)
3. System nhan event
4. Parse event type:
   - request-talk
   - unit-start
   - system state
5. System update:
   - trang thai mic
   - trang thai request
6. UI:
   - highlight icon tren map

### Workflow 3 - Automatic Mode

1. Mic active (event: `unit-start`)
2. System:
   - xac dinh mic ID
   - tim camera + preset mapping
3. Camera Engine:
   - apply priority rules
   - check delay / anti-jitter
4. Send command -> camera
5. Camera quay

UI:

- Highlight mic active
- Highlight camera active

### Workflow 4 - Manual Mode (Approval Flow)

1. Delegate nhan Talk
2. System:
   - nhan event request
   - highlight trang thai "pending"
3. Operator:
   - click Approve / Reject
4. If Approve:
   - gui command -> TS-D1000
   - nhan event `unit-start`
   - trigger camera
5. If Reject:
   - khong co camera action

### Workflow 5 - Multi-Mic Conflict Handling

1. Nhieu mic active/request
2. System:
   - check priority:
     - Chu tich > dai bieu
     - dai bieu -> theo thu tu gan nhat
3. Apply delay switching
4. Chon camera target

### Workflow 6 - Camera Control (Manual)

1. Operator chon camera
2. Chon:
   - preset
   - hoac PTZ control
3. System gui command:
   - ONVIF / VISCA

### Workflow 7 - Live Video Monitoring

1. System mo stream camera
2. Decode RTSP
3. Hien thi:
   - 1-4 camera
4. User chon layout hien thi

## Key Entities

### User

- id
- username
- role (Admin / Operator)

### Device (TS-D1000 Unit)

- id
- type (Chairman / Delegate)
- position (x, y tren map)
- status:
  - idle
  - request
  - speaking

### Camera

- id
- type (ONVIF / VISCA)
- IP / connection info
- status
- supported capabilities

### CameraPreset

- id
- camera_id
- preset_number
- mapped_unit_id(s)

### Layout

- id
- file (PDF/JPG)
- device positions
- annotations

### Event (Runtime)

- type:
  - request-talk
  - unit-start
  - system
- source (unit_id)
- timestamp

### Session State (Runtime)

- active speakers
- pending requests
- current camera focus

### Log

- user action log
- system event log

## System Behaviors

### 4.1 Real-time Event Processing

- Subscribe SSE `/api/event`
- Parse event stream lien tuc
- Update state < 300-500ms

### 4.2 State Machine - Mic

- Idle -> Request -> Speaking -> Idle

Transition:

- Talk pressed -> Request
- Approved -> Speaking
- End talk -> Idle

### 4.3 Camera Switching Logic

Inputs:

- active mic(s)
- priority rules
- last active
- timing

Behavior:

- chon target camera
- delay switching (anti-jitter)
- tranh switching lien tuc

### 4.4 Priority Rules

- Chu tich luon uu tien cao nhat
- Delegate:
  - uu tien nguoi moi noi gan nhat
- Neu conflict:
  - giu camera hien tai trong thoi gian delay

### 4.5 Manual Mode Control

- System khong tu cho phep noi
- Operator quyet dinh:
  - Approve -> gui command TS-D1000
  - Reject -> bo qua

### 4.6 Map Rendering Behavior

- Load layout image
- Render devices (mic, camera)
- Highlight states:
  - request -> mau A
  - speaking -> mau B

### 4.7 Camera Control Behavior

Abstract qua adapter:

- ONVIF
- VISCA

Support:

- preset recall
- PTZ control

### 4.8 Video Streaming Behavior

- Pull RTSP stream
- Convert -> render
- Cho phep:
  - multi-view (1-4)
  - switching view

### 4.9 Logging Behavior

- Log tat ca:
  - user actions
  - system events
- Phuc vu debug va audit

## Ready-for-Break Summary

### Product Core

Mot he thong:

- ingest event tu TS-D1000
- xu ly logic real-time
- dieu khien camera
- hien thi truc quan

### Core Functional Blocks

- Device Integration
  - TS-D1000 SSE + REST
  - Camera adapter
- Event Processing Engine
  - parsing
  - state update
- Camera Rule Engine
  - priority
  - switching logic
- Map UI Engine
  - layout
  - device rendering
  - highlight
- Operation Control
  - manual approval
  - auto mode
- Video Module
  - stream handling
  - multi-view
- User & Auth
  - roles
  - permissions
- Logging System
  - audit
  - system logs
