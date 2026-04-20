# Tech Stack

## Overall Philosophy

Simple - Stable - Industrial-grade

- Khong over-engineer
- Uu tien de trien khai onsite

## Backend

Framework de xuat: Node.js + NestJS

Ly do:

- Ho tro tot real-time (SSE, event-driven)
- De tich hop TCP/HTTP voi thiet bi
- Nhanh phat trien MVP

Modules:

- TS-D1000 Service (SSE listener)
- Camera Service (ONVIF/VISCA)
- Rule Engine (camera switching)

## Frontend

Framework de xuat: React + Vite

Ly do:

- UI dynamic (map drag-drop)
- Ecosystem manh
- De scale

## Desktop App

Framework de xuat: Electron

Ly do:

- Chay local (LAN)
- De dong goi deploy
- Phu hop licensing sau nay

## Database

SQLite cho MVP

Ly do:

- Chay local
- Khong can setup server
- Du cho 1 phong

Future:

- PostgreSQL neu multi-site

## Video Streaming

Strategy:

- RTSP -> convert -> display

Options:

- GStreamer / FFmpeg bridge
- Hoac WebRTC gateway (phase sau)

## Camera Integration

Layer design:

`CameraAdapter`

- `ONVIFAdapter`
- `VISCAAdapter`
- `VendorSpecificAdapter` (optional)

## Auth & Security

- JWT local auth
- Role-based access
- LAN-only security (MVP)

## Logging

- Winston (Node.js logging)
- File-based log

## Testing

- Unit test: Jest
- Integration test: basic

## Deployment

MVP:

- Electron app
- Embedded backend

Setup:

- Plug & play tai phong hop
