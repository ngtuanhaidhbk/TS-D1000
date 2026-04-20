# Project Context

## System Overview

He thong la mot Desktop Control System cho phong hop:

- Nhan event tu TS-D1000 (real-time)
- Dieu khien camera PTZ
- Hien thi trang thai tren map
- Cho phep operator can thiep

## Users & Roles

### Admin

- Cau hinh he thong
- Map thiet bi
- Setup camera & preset
- Chon che do (Manual/Auto)

### Operator (User)

- Xem trang thai
- Approve/Reject phat bieu
- Dieu khien camera (neu duoc phep)

## Core Modules

### 1. Device Integration Module

- TS-D1000 Connector (SSE + REST)
- Camera Adapter Layer:
  - ONVIF Adapter
  - VISCA Adapter

### 2. Camera Control Engine

- Mapping mic -> camera preset
- Priority engine:
  - Chu tich > dai bieu
- Switching logic:
  - delay
  - anti-jitter

### 3. Map & Visualization

- Upload PDF/JPG
- Drag-drop thiet bi
- Highlight trang thai:
  - talk request
  - active speaking

### 4. Operation Control

- Manual mode:
  - approve / reject
- Auto mode:
  - auto tracking

### 5. Video Streaming

- Hien thi 1-4 camera
- Select camera view

### 6. User Management

- Role-based access
- Login system
- Audit log

### 7. Logging & Monitoring

- Log hanh dong user
- Log su kien he thong
- Debug connection

## Key Workflows

### Workflow 1 - Auto Mode

1. Delegate nhan Talk
2. TS-D1000 gui event (SSE)
3. System nhan event
4. Engine chon camera + preset
5. Camera quay
6. Map highlight

### Workflow 2 - Manual Mode

1. Delegate nhan Talk
2. Map highlight "request"
3. Operator:
   - Approve -> TS-D1000 cho noi -> camera quay
   - Reject -> khong co hanh dong camera

### Workflow 3 - Camera Switching

1. Nhieu mic active
2. Engine:
   - uu tien chu tich
   - neu nhieu delegate -> chon nguoi gan nhat
3. Delay switching (anti-jitter)

## Constraints

### Technical

- LAN only (low latency)
- Multi-protocol camera
- Real-time SSE handling

### Business

- MVP 1 phong
- Sau nay scale multi-site

### Operational

- UI phai don gian
- Phai chay on dinh lau dai
