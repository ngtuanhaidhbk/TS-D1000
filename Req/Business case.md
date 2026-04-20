# Business Case

## Problem Statement

Trong he thong hoi thao su dung TOA TS-D1000, viec camera PTZ khong dong bo voi trang thai phat bieu gay ra:

- Phai co nguoi van hanh camera thu cong
- De quay sai nguoi
- Giam trai nghiem chuyen nghiep cua phong hop

## Target Users

- Ky thuat vien AV
- IT noi bo
- Operator phong hop (semi-technical)

## Current Pain Points

- Camera khong tu dong theo nguoi noi
- Khong dong bo giua TS-D1000 va camera
- Phai co nguoi dieu khien rieng camera
- Kho van hanh trong cac buoi hop lon

## Proposed Solution

Xay dung phan mem desktop:

- Ket noi TS-D1000 qua API + SSE (`/api/event`)
- Ket noi camera PTZ qua:
  - ONVIF (chuan chung)
  - VISCA over IP (hang cu the)
- Map layout + highlight trang thai
- Auto camera tracking + manual override

## Expected Benefits

- Giam nhan su van hanh (1 nguoi thay vi 2-3)
- Tang do chinh xac camera tracking
- Chuan hoa van hanh cho nhieu khach hang
- Tang gia tri giai phap AV (co the ban kem)

## Success Metrics (KPIs)

- Thoi gian phan hoi camera < 500ms
- Ty le tracking dung nguoi > 95%
- Giam 50-70% thao tac thu cong
- 1 operator van hanh duoc toan bo he thong

## Risks & Constraints

- Khac biet giua cac hang camera
- Xu ly video stream (RTSP) phuc tap
- Logic switching camera de gay "giat"
- Phu thuoc API TS-D1000
