# Detail Design – Manual / Automatic Behavior (Runtime)

Tài liệu này là addendum cho Runtime Event Handling, bám theo:

* UC – Manual / Automatic Behavior
* Detail Design – Runtime Event Handling Module

Không thêm feature ngoài scope.

---

## 1. Scope

Bao gồm:

* mode-based behavior cho request queue và auto speaking
* rule approve/reject chỉ hợp lệ trong `MANUAL`
* rule UI hide/disable actions theo mode
* safeguard UI warning khi đổi mode trong lúc có active speaker hoặc pending request

Không bao gồm:

* camera protocol chi tiết
* UI realtime transport chi tiết
* multi-room

---

## 2. Entities & State (from Runtime DD)

### 2.1 Room Operation Mode (source-of-truth)

* Source-of-truth nằm ở `rooms.operation_mode` (System Configuration module).
* Runtime snapshot phải phản ánh mode hiện tại.

### 2.2 Speaking Request (Manual only)

* `speaking_requests.status`: `PENDING | APPROVED | REJECTED | CANCELLED`
* Constraint: unique `(unit_id, status=PENDING)` (1 pending per unit).

### 2.3 Unit Runtime State

* `IDLE | REQUEST | SPEAKING | OFFLINE`

---

## 3. Business Rules

### 3.1 Manual Mode

* Khi nhận event “talk request”:
  * nếu mode != `MANUAL` => ignore
  * nếu unit không tồn tại => ignore + log
  * nếu unit đã có request `PENDING` => ignore (idempotent)
  * else: tạo `speaking_requests(PENDING)`, set unit state `REQUEST`

* Approve:
  * chỉ hợp lệ trong `MANUAL`
  * request phải tồn tại và `PENDING`
  * hệ thống gửi command tới TS-D
  * unit chỉ chuyển `SPEAKING` khi có event TS-D xác nhận
  * camera chỉ trigger sau event `SPEAKING`

* Reject:
  * chỉ hợp lệ trong `MANUAL`
  * request phải `PENDING`
  * request chuyển `REJECTED`
  * unit về `IDLE`
  * không trigger camera

### 3.2 Automatic Mode

* Không có queue.
* Không hiển thị approve/reject.
* Khi có event speaking hợp lệ:
  * set unit state `SPEAKING`
  * trigger camera theo mapping (anti-jitter)

### 3.3 Mode switch safeguard (UI-level)

* Chỉ `ADMIN` đổi mode.
* Khi đổi mode trong lúc:
  * có `activeSpeakers.length > 0` hoặc
  * có `pendingRequests.length > 0`
* UI phải hiển thị cảnh báo trước khi submit (không phải backend hard-block).

---

## 4. API Mapping

Không yêu cầu endpoint mới ngoài API đã có:

* `GET /api/v1/runtime/snapshot` để UI biết:
  * `operationMode`
  * `activeSpeakers`
  * `pendingRequests`
* `GET /api/v1/runtime/requests` (Manual queue)
* `POST /api/v1/runtime/requests/{id}/approve` (Manual only)
* `POST /api/v1/runtime/requests/{id}/reject` (Manual only)
* `PUT /api/v1/config/mode` (Admin only) đổi mode (System Configuration module)

---

## 5. Validation & Error Codes

### Approve/Reject

* 404 `REQUEST_NOT_FOUND`
* 422 `REQUEST_NOT_PENDING`
* 422 `MANUAL_MODE_REQUIRED`

---

## 6. UI/UX Notes (Implementation-ready)

* `MANUAL`:
  * hiển thị queue + action approve/reject
* `AUTOMATIC`:
  * ẩn queue/action; chỉ monitoring
* Khi đổi mode:
  * gọi snapshot trước, nếu có active speaker/pending request => confirm dialog.

