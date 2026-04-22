# Use Cases (UC) – Runtime Event Handling

## Assumptions

1. Event realtime đến từ TS-D1000 qua **SSE** `/api/event`.
2. Runtime chỉ áp dụng cho **1 room**.
3. Unit được đồng bộ trước (đã có `tsd_units`).
4. Mapping mic -> camera preset đã được cấu hình.
5. Operator có quyền:
   * approve/reject request
   * xem trạng thái realtime
6. Camera control là async, không blocking UI.
7. Runtime state được giữ trong memory + optional persistence.
8. UI nhận update qua websocket hoặc polling nội bộ (không nằm trong scope UC).

---

## 1. List of Identified Modules

1. Runtime Event Ingestion
2. Runtime State Management
3. Speaking Request Handling (Manual Mode)
4. Automatic Speaking Handling
5. Camera Trigger Handling
6. Map & UI State Update
7. Runtime Monitoring & Recovery

---

## 2. List of Use Cases per Module

### Module 1: Runtime Event Ingestion

* UC-RUNTIME-01: Start SSE Event Listener
* UC-RUNTIME-02: Process Incoming Event
* UC-RUNTIME-03: Handle SSE Disconnection & Reconnection

### Module 2: Runtime State Management

* UC-RUNTIME-04: Update Unit Runtime State
* UC-RUNTIME-05: Maintain Room Runtime Snapshot

### Module 3: Speaking Request Handling (Manual Mode)

* UC-RUNTIME-06: Create Speaking Request
* UC-RUNTIME-07: Approve Speaking Request
* UC-RUNTIME-08: Reject Speaking Request
* UC-RUNTIME-09: Cancel Speaking Request

### Module 4: Automatic Speaking Handling

* UC-RUNTIME-10: Handle Auto Speaking Activation
* UC-RUNTIME-11: Resolve Multiple Active Speakers

### Module 5: Camera Trigger Handling

* UC-RUNTIME-12: Trigger Camera Preset
* UC-RUNTIME-13: Suppress Camera Switching (Anti-Jitter)

### Module 6: Map & UI State Update

* UC-RUNTIME-14: Update Map Highlight State
* UC-RUNTIME-15: Broadcast Runtime State to UI

### Module 7: Runtime Monitoring & Recovery

* UC-RUNTIME-16: Run Runtime State Recovery
* UC-RUNTIME-17: Log Runtime Events

---

# Full Detailed Use Cases

## MODULE: Runtime Event Ingestion

### UC-RUNTIME-01: Start SSE Event Listener

**Objective**

Khởi động kết nối SSE để nhận event realtime từ TS-D1000.

**Actors**

* System

**Preconditions**

* TS-D1000 configuration active tồn tại
* Server runtime service đã start

**Postconditions**

* Kết nối SSE được thiết lập thành công
* Runtime chuyển sang trạng thái CONNECTED

**Main Flow**

1. System load TS-D1000 config
2. System mở kết nối HTTP tới `/api/event`
3. TS-D1000 trả về stream `text/event-stream`
4. System bắt đầu lắng nghe event
5. System set trạng thái SSE = CONNECTED

**Alternative Flows**

* Nếu SSE endpoint custom -> dùng endpoint đã cấu hình

**Exception Flows**

1. TS-D1000 không phản hồi
2. System set trạng thái = DISCONNECTED

**Business Rules**

* Chỉ 1 SSE connection active cho mỗi room
* SSE phải reconnect khi mất kết nối

---

### UC-RUNTIME-02: Process Incoming Event

**Objective**

Xử lý từng event nhận từ TS-D1000.

**Actors**

* System
* TS-D1000

**Preconditions**

* SSE connection đang CONNECTED

**Postconditions**

* Event được parse và xử lý
* Runtime state được cập nhật

**Main Flow**

1. System nhận raw event
2. System parse event type
3. System extract payload
4. System xác định unit liên quan (nếu có)
5. System chuyển event sang internal format
6. System gọi module xử lý tương ứng

**Alternative Flows**

1. Event không chứa unitId -> chỉ update system-level state

**Exception Flows**

1. Event malformed -> bỏ qua event -> ghi log lỗi

**Business Rules**

* Event invalid không được làm crash runtime
* Event phải được xử lý idempotent

---

### UC-RUNTIME-03: Handle SSE Disconnection & Reconnection

**Objective**

Tự động reconnect khi mất kết nối SSE.

**Actors**

* System

**Preconditions**

* SSE đã từng kết nối

**Postconditions**

* SSE được reconnect
* Runtime state được phục hồi

**Main Flow**

1. System detect connection lost
2. System set trạng thái = RECONNECTING
3. System retry theo backoff
4. Khi reconnect thành công:
   * set trạng thái = CONNECTED
   * trigger recovery

**Alternative Flows**

* Retry nhiều lần đến khi thành công

**Exception Flows**

1. Retry thất bại lâu dài -> trạng thái = DISCONNECTED

**Business Rules**

* Không được dừng retry tự động
* UI phải phản ánh trạng thái mất kết nối

---

## MODULE: Runtime State Management

### UC-RUNTIME-04: Update Unit Runtime State

**Objective**

Cập nhật trạng thái runtime của unit.

**Actors**

* System

**Preconditions**

* Unit tồn tại trong hệ thống

**Postconditions**

* Unit state được cập nhật

**Main Flow**

1. Nhận event
2. Resolve unit theo external_unit_id
3. Xác định state mới: REQUEST / SPEAKING / IDLE
4. Update runtime state store

**Alternative Flows**

* Nếu unit chưa tồn tại -> bỏ qua hoặc log

**Exception Flows**

* Unit không tìm thấy -> log warning

**Business Rules**

* State transition phải hợp lệ
* Không được skip state logic

---

### UC-RUNTIME-05: Maintain Room Runtime Snapshot

**Objective**

Giữ snapshot trạng thái realtime của room.

**Actors**

* System

**Preconditions**

* Runtime đang hoạt động

**Postconditions**

* Snapshot luôn phản ánh trạng thái mới nhất

**Main Flow**

1. Sau mỗi event xử lý
2. System update: active speakers, pending requests, unit states
3. Store snapshot

**Business Rules**

* Snapshot phải consistent
* Snapshot dùng cho UI

---

## MODULE: Speaking Request Handling (Manual Mode)

### UC-RUNTIME-06: Create Speaking Request

**Objective**

Tạo request khi delegate/chairman bấm talkreq trong MANUAL mode.

**Actors**

* System
* Delegate / Chairman

**Preconditions**

* Mode = MANUAL
* Unit state = IDLE

**Postconditions**

* Request được tạo với trạng thái PENDING

**Main Flow**

1. Nhận event request-talkreq
2. System xác định unit
3. System set unit state = REQUEST
4. System tạo speaking request (PENDING)
5. Update UI/map

**Alternative Flows**

* Nếu request đã tồn tại -> bỏ qua

**Exception Flows**

* Unit không tồn tại -> log

**Business Rules**

* 1 unit chỉ có 1 request pending
* Request chỉ tồn tại trong MANUAL mode

---

### UC-RUNTIME-07: Approve Speaking Request

**Objective**

Cho phép operator cho phép delegate/chairman nói.

**Actors**

* Operator
* System

**Preconditions**

* Request tồn tại
* Request = PENDING

**Postconditions**

* Request = APPROVED
* Unit chuyển sang SPEAKING (khi TS-D phản hồi)

**Main Flow**

1. Operator chọn request
2. Click Approve
3. System validate request state
4. System gửi command tới TS-D1000
5. System chờ event SPEAKING
6. Update state

**Alternative Flows**

* TS-D delay phản hồi

**Exception Flows**

1. Request không ở trạng thái PENDING -> reject action

**Business Rules**

* Approve chỉ hợp lệ trong MANUAL mode
* Không auto chuyển state nếu chưa có event xác nhận từ TS-D

---

### UC-RUNTIME-08: Reject Speaking Request

**Objective**

Từ chối request nói.

**Actors**

* Operator
* System

**Preconditions**

* Request = PENDING

**Postconditions**

* Request = REJECTED
* Unit trở về IDLE

**Main Flow**

1. Operator click Reject
2. System validate request
3. System gửi command reject
4. Update request state
5. Update UI/map

**Exception Flows**

* Request không tồn tại

**Business Rules**

* Reject không trigger camera

---

### UC-RUNTIME-09: Cancel Speaking Request

**Objective**

Hủy request khi user tự cancel hoặc timeout.

**Actors**

* System
* Delegate

**Preconditions**

* Request tồn tại

**Postconditions**

* Request = CANCELLED

**Main Flow**

1. Nhận event cancel hoặc timeout
2. System update request state
3. Update UI

---

## MODULE: Automatic Speaking Handling

### UC-RUNTIME-10: Handle Auto Speaking Activation

**Objective**

Xử lý speaking trong AUTO mode.

**Actors**

* System

**Preconditions**

* Mode = AUTOMATIC

**Postconditions**

* Unit chuyển sang SPEAKING

**Main Flow**

1. Nhận event SPEAKING
2. System update unit state
3. Trigger camera
4. Update UI

**Business Rules**

* Không có request queue
* Không cần approval

---

### UC-RUNTIME-11: Resolve Multiple Active Speakers

**Objective**

Xử lý khi nhiều người cùng active.

**Actors**

* System

**Preconditions**

* Multiple SPEAKING units

**Postconditions**

* Chọn được unit ưu tiên

**Main Flow**

1. System lấy danh sách active
2. Nếu có chairman -> chọn chairman
3. Nếu không -> chọn delegate gần nhất (last event)
4. Set camera target

**Business Rules**

* Chairman > Delegate
* Latest event wins

---

## MODULE: Camera Trigger Handling

### UC-RUNTIME-12: Trigger Camera Preset

**Objective**

Điều khiển camera quay đúng vị trí speaker.

**Actors**

* System
* Camera PTZ

**Preconditions**

* Mapping tồn tại
* Camera active

**Postconditions**

* Camera quay tới preset

**Main Flow**

1. Resolve mapping theo unit
2. Lấy camera + preset
3. Validate camera active
4. Gửi lệnh PTZ preset
5. Update runtime camera target

**Exception Flows**

* Mapping không tồn tại
* Camera inactive

**Business Rules**

* Chỉ trigger khi state = SPEAKING

---

### UC-RUNTIME-13: Suppress Camera Switching (Anti-Jitter)

**Objective**

Ngăn camera nhảy liên tục.

**Actors**

* System

**Preconditions**

* Có event switching liên tiếp

**Postconditions**

* Một số switch bị suppress

**Main Flow**

1. Check last switch time
2. Nếu < threshold -> skip trigger
3. Nếu >= threshold -> allow trigger

**Business Rules**

* Threshold configurable

---

## MODULE: Map & UI State Update

### UC-RUNTIME-14: Update Map Highlight State

**Objective**

Highlight đúng vị trí trên map.

**Actors**

* System

**Preconditions**

* Layout đã cấu hình

**Postconditions**

* Map highlight đúng unit state

**Main Flow**

1. Nhận state change
2. Map unit -> layout position
3. Update highlight: REQUEST -> pending, SPEAKING -> active

---

### UC-RUNTIME-15: Broadcast Runtime State to UI

**Objective**

Cập nhật UI realtime.

**Actors**

* System
* UI Client

**Preconditions**

* Runtime snapshot updated

**Postconditions**

* UI nhận state mới

**Main Flow**

1. Snapshot update
2. Emit event
3. UI render lại

---

## MODULE: Runtime Monitoring & Recovery

### UC-RUNTIME-16: Run Runtime State Recovery

**Objective**

Phục hồi state sau reconnect.

**Actors**

* System

**Preconditions**

* SSE reconnect thành công

**Postconditions**

* Runtime state đồng bộ lại

**Main Flow**

1. Call TS-D REST API
2. Load current speaking units
3. Load request queue
4. Rebuild runtime snapshot

---

### UC-RUNTIME-17: Log Runtime Events

**Objective**

Ghi log toàn bộ runtime event.

**Actors**

* System

**Preconditions**

* Event được xử lý

**Postconditions**

* Log được lưu

**Main Flow**

1. Receive event
2. Process event
3. Write log: event type, unit, result, timestamp

