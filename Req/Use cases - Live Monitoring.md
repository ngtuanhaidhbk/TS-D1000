# Use Cases (UC) – Live Monitoring

## Assumptions

1. Admin và Operator đều được xem Live Monitoring.
2. Live Monitoring nhận dữ liệu từ Runtime Event Handling.
3. UI được cập nhật realtime từ runtime snapshot/event stream nội bộ.
4. Live Monitoring chỉ giám sát và hiển thị; không thay thế module cấu hình.
5. Admin có thể thực hiện recovery/reconnect runtime nếu backend hỗ trợ.
6. Operator chỉ được acknowledge alert, không được recovery hệ thống.
7. Camera lỗi không làm dừng việc giám sát speaker.
8. Missing mapping được hiển thị dưới dạng warning.

---

## 1. List of Identified Modules

1. Live Dashboard Monitoring
2. Realtime Map Monitoring
3. Speaker Monitoring
4. Camera Monitoring
5. Event Feed Monitoring
6. Alert & Warning Monitoring
7. Runtime Connection Monitoring
8. Admin Recovery Monitoring

---

## 2. List of Use Cases per Module

### 1. Live Dashboard Monitoring

* UC-LIVE-01: View Live Monitoring Dashboard
* UC-LIVE-02: Refresh Live Runtime Snapshot

### 2. Realtime Map Monitoring

* UC-LIVE-03: View Realtime Map State
* UC-LIVE-04: Highlight Unit Runtime State on Map

### 3. Speaker Monitoring

* UC-LIVE-05: View Active Speaker List
* UC-LIVE-06: View Pending Request Queue Summary
* UC-LIVE-07: View Unit Runtime Detail

### 4. Camera Monitoring

* UC-LIVE-08: View Camera Runtime Status
* UC-LIVE-09: View Current Camera Target
* UC-LIVE-10: View Camera Trigger Result

### 5. Event Feed Monitoring

* UC-LIVE-11: View Live Event Feed
* UC-LIVE-12: Filter Live Event Feed

### 6. Alert & Warning Monitoring

* UC-LIVE-13: View Runtime Alerts
* UC-LIVE-14: Acknowledge Runtime Alert

### 7. Runtime Connection Monitoring

* UC-LIVE-15: View SSE / Runtime Connection Status
* UC-LIVE-16: Handle Runtime Disconnected State

### 8. Admin Recovery Monitoring

* UC-LIVE-17: Run Runtime Recovery Action

---

## 3. Full Detailed Use Cases

### Module: Live Dashboard Monitoring

#### Use Case Name

View Live Monitoring Dashboard

#### Use Case ID

UC-LIVE-01

#### Objective

Cho phép Admin/Operator xem tổng quan trạng thái realtime của hệ thống phòng họp.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Người dùng đã đăng nhập.
* Runtime service đang có snapshot hoặc có thể trả trạng thái hiện tại.
* Room active tồn tại.

#### Postconditions

* Dashboard hiển thị trạng thái realtime mới nhất.

#### Main Flow (Happy Path)

1. Người dùng mở Live Monitoring Dashboard.
2. Hệ thống kiểm tra quyền truy cập.
3. Hệ thống tải runtime snapshot hiện tại.
4. Hệ thống hiển thị:

   * operation mode
   * SSE/runtime status
   * active speaker
   * pending request count
   * current camera target
   * camera status
   * runtime alerts
5. UI tiếp tục nhận update realtime.

#### Alternative Flows

1. Runtime snapshot chưa có dữ liệu.
2. Hệ thống hiển thị trạng thái “No runtime data yet”.

#### Exception Flows

1. Người dùng không có quyền truy cập.
2. Hệ thống từ chối truy cập.
3. Runtime API lỗi.
4. Hệ thống hiển thị thông báo lỗi tải dashboard.

#### Business Rules

* Admin và Operator đều được xem dashboard.
* Dashboard phải phản ánh runtime state mới nhất.
* Live dashboard không được thay đổi cấu hình hệ thống.

---

#### Use Case Name

Refresh Live Runtime Snapshot

#### Use Case ID

UC-LIVE-02

#### Objective

Cho phép hệ thống cập nhật lại dữ liệu giám sát khi runtime state thay đổi.

#### Actors

* System
* UI Client

#### Preconditions

* UI đang mở Live Monitoring.
* Runtime snapshot thay đổi.

#### Postconditions

* UI hiển thị dữ liệu realtime mới nhất.

#### Main Flow (Happy Path)

1. Runtime engine xử lý event mới.
2. Hệ thống cập nhật runtime snapshot.
3. Hệ thống phát update tới UI.
4. UI cập nhật dashboard, map, speaker, camera và alert state.

#### Alternative Flows

1. UI không nhận được realtime push.
2. UI có thể reload snapshot bằng API nếu có cơ chế fallback.

#### Exception Flows

1. Snapshot update lỗi.
2. Hệ thống ghi log lỗi và giữ trạng thái cũ trên UI.

#### Business Rules

* Runtime snapshot là nguồn dữ liệu chính cho Live Monitoring.
* UI không được tự suy diễn trạng thái nếu backend không cung cấp.

---

### Module: Realtime Map Monitoring

#### Use Case Name

View Realtime Map State

#### Use Case ID

UC-LIVE-03

#### Objective

Cho phép người dùng xem trạng thái realtime của các unit/camera trên layout phòng.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Layout đã được cấu hình.
* Thiết bị đã được đặt vị trí trên layout.
* Runtime state có dữ liệu unit/camera.

#### Postconditions

* Map hiển thị trạng thái realtime của thiết bị.

#### Main Flow (Happy Path)

1. Người dùng mở Realtime Map View.
2. Hệ thống tải layout active.
3. Hệ thống tải vị trí unit/camera.
4. Hệ thống tải runtime state.
5. UI render layout và icon thiết bị.
6. UI cập nhật trạng thái thiết bị theo realtime event.

#### Alternative Flows

1. Layout chưa được cấu hình.
2. Hệ thống hiển thị empty state và gợi ý cấu hình layout.

#### Exception Flows

1. Không tải được layout.
2. Hệ thống hiển thị lỗi map unavailable.

#### Business Rules

* Map chỉ hiển thị đúng thiết bị đã có vị trí cấu hình.
* Nếu thiếu layout, Live Monitoring vẫn có thể hiển thị dashboard/list nhưng map không khả dụng.

---

#### Use Case Name

Highlight Unit Runtime State on Map

#### Use Case ID

UC-LIVE-04

#### Objective

Highlight trạng thái unit trên map theo runtime state.

#### Actors

* System
* UI Client

#### Preconditions

* Unit có vị trí trên layout.
* Unit có runtime state.

#### Postconditions

* Icon unit trên map được highlight đúng trạng thái.

#### Main Flow (Happy Path)

1. Hệ thống nhận runtime state của unit.
2. UI xác định vị trí unit trên map.
3. UI áp dụng style theo trạng thái:

   * `IDLE`: icon trung tính
   * `REQUEST`: highlight cam/nhấp nháy
   * `SPEAKING`: highlight xanh
   * `OFFLINE`: icon xám/đỏ
4. UI cập nhật khi state thay đổi.

#### Alternative Flows

1. Unit không có vị trí map.
2. Hệ thống vẫn hiển thị unit trong list monitoring nhưng không highlight trên map.

#### Exception Flows

1. Runtime state không hợp lệ.
2. Hệ thống bỏ qua highlight và ghi log.

#### Business Rules

* `REQUEST` chỉ hiển thị trong Manual mode.
* `SPEAKING` luôn được ưu tiên hiển thị nổi bật.
* Missing map position không được làm lỗi toàn bộ map.

---

### Module: Speaker Monitoring

#### Use Case Name

View Active Speaker List

#### Use Case ID

UC-LIVE-05

#### Objective

Cho phép người dùng xem danh sách unit đang phát biểu.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Runtime service đang hoạt động.
* Có hoặc không có active speaker.

#### Postconditions

* Danh sách active speaker được hiển thị.

#### Main Flow (Happy Path)

1. Người dùng mở Live Dashboard hoặc Speaker Monitoring.
2. Hệ thống tải active speaker list.
3. Hệ thống hiển thị:

   * unit id/name
   * device type
   * speaking since
   * mapped camera
   * mapped preset
4. UI cập nhật khi speaker thay đổi.

#### Alternative Flows

1. Không có active speaker.
2. Hệ thống hiển thị “No active speaker”.

#### Exception Flows

1. Không tải được active speaker list.
2. Hệ thống hiển thị lỗi.

#### Business Rules

* Active speaker là speaker được xác nhận bởi runtime event.
* Request pending không được hiển thị như active speaker.

---

#### Use Case Name

View Pending Request Queue Summary

#### Use Case ID

UC-LIVE-06

#### Objective

Cho phép người dùng xem số lượng và danh sách request đang chờ trong Manual mode.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Runtime mode là `MANUAL`.
* Có thể có pending request hoặc không.

#### Postconditions

* Pending request summary được hiển thị.

#### Main Flow (Happy Path)

1. Người dùng mở Live Dashboard.
2. Hệ thống kiểm tra operation mode.
3. Nếu mode là `MANUAL`, hệ thống tải pending requests.
4. UI hiển thị số lượng và danh sách tóm tắt request.

#### Alternative Flows

1. Mode là `AUTOMATIC`.
2. Hệ thống ẩn hoặc hiển thị “Request queue not used in Automatic mode”.

#### Exception Flows

1. Không tải được queue.
2. Hệ thống hiển thị warning.

#### Business Rules

* Pending request chỉ tồn tại trong `MANUAL`.
* Automatic mode không hiển thị queue như một chức năng điều khiển.

---

#### Use Case Name

View Unit Runtime Detail

#### Use Case ID

UC-LIVE-07

#### Objective

Cho phép người dùng xem chi tiết runtime của một unit.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Unit tồn tại.
* Unit có runtime state hoặc metadata.

#### Postconditions

* Chi tiết runtime unit được hiển thị.

#### Main Flow (Happy Path)

1. Người dùng chọn unit trên map hoặc speaker list.
2. Hệ thống tải unit detail.
3. Hệ thống hiển thị:

   * unit id/name
   * device type
   * current state
   * last event time
   * mapped camera
   * mapped preset
4. UI cập nhật nếu unit state thay đổi.

#### Alternative Flows

1. Unit chưa có mapping.
2. Hệ thống hiển thị warning “No active mapping”.

#### Exception Flows

1. Unit không tồn tại.
2. Hệ thống hiển thị lỗi not found.

#### Business Rules

* Unit detail chỉ dùng để giám sát.
* Missing mapping không chặn hiển thị unit detail.

---

### Module: Camera Monitoring

#### Use Case Name

View Camera Runtime Status

#### Use Case ID

UC-LIVE-08

#### Objective

Cho phép người dùng xem trạng thái runtime của camera.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Camera tồn tại.

#### Postconditions

* Trạng thái runtime camera được hiển thị.

#### Main Flow (Happy Path)

1. Người dùng mở Camera Monitoring.
2. Hệ thống tải danh sách camera và runtime status.
3. UI hiển thị:

   * camera name
   * status
   * current target
   * current preset
   * last switch time
   * last trigger result

#### Alternative Flows

1. Camera chưa từng được trigger.
2. Hệ thống hiển thị “No runtime target yet”.

#### Exception Flows

1. Không tải được camera runtime status.
2. Hệ thống hiển thị lỗi.

#### Business Rules

* Admin và Operator đều được xem camera runtime status.
* Camera inactive/offline phải hiển thị rõ.

---

#### Use Case Name

View Current Camera Target

#### Use Case ID

UC-LIVE-09

#### Objective

Cho phép người dùng biết camera hiện đang quay tới unit/preset nào.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Runtime camera state có current target hoặc chưa có target.

#### Postconditions

* Current camera target được hiển thị.

#### Main Flow (Happy Path)

1. Hệ thống tải runtime camera state.
2. Nếu có current target, UI hiển thị:

   * camera
   * target unit
   * preset
   * switched at
3. Nếu target thay đổi, UI cập nhật realtime.

#### Alternative Flows

1. Chưa có target.
2. UI hiển thị “No current target”.

#### Exception Flows

1. Target tham chiếu tới unit/preset không tồn tại.
2. UI hiển thị warning và ghi log nếu cần.

#### Business Rules

* Current camera target là trạng thái monitoring, không đồng nghĩa camera vật lý chắc chắn đã quay đúng nếu trigger failed.
* Last trigger result phải hiển thị cùng target khi có.

---

#### Use Case Name

View Camera Trigger Result

#### Use Case ID

UC-LIVE-10

#### Objective

Cho phép người dùng xem kết quả trigger camera gần nhất.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Có hoặc chưa có runtime camera log.

#### Postconditions

* Trigger result được hiển thị.

#### Main Flow (Happy Path)

1. Người dùng mở Camera Monitoring hoặc Event Feed.
2. Hệ thống tải trigger result gần nhất.
3. UI hiển thị:

   * result: `SUCCESS`, `FAILED`, `SKIPPED`
   * reason nếu có
   * thời điểm trigger
4. Nếu có trigger mới, UI cập nhật realtime.

#### Alternative Flows

1. Chưa có trigger log.
2. UI hiển thị empty state.

#### Exception Flows

1. Không tải được trigger log.
2. UI hiển thị lỗi.

#### Business Rules

* Trigger failed không được làm mất active speaker state.
* Trigger skipped phải hiển thị reason nếu có, ví dụ anti-jitter hoặc invalid mapping.

---

### Module: Event Feed Monitoring

#### Use Case Name

View Live Event Feed

#### Use Case ID

UC-LIVE-11

#### Objective

Cho phép người dùng xem log realtime các event runtime gần nhất.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Runtime event log có thể truy vấn hoặc stream.

#### Postconditions

* Event feed được hiển thị.

#### Main Flow (Happy Path)

1. Người dùng mở Event Feed.
2. Hệ thống tải danh sách event gần nhất.
3. UI hiển thị:

   * time
   * event type
   * unit
   * result
   * message
4. Event mới được append realtime vào feed.

#### Alternative Flows

1. Chưa có event.
2. UI hiển thị “No recent events”.

#### Exception Flows

1. Không tải được event feed.
2. Hệ thống hiển thị lỗi.

#### Business Rules

* Event feed là monitoring/debug data.
* Event malformed hoặc skipped vẫn nên hiển thị nếu đã được log.

---

#### Use Case Name

Filter Live Event Feed

#### Use Case ID

UC-LIVE-12

#### Objective

Cho phép người dùng lọc event feed để tìm nhanh event quan trọng.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Event feed đã được load.

#### Postconditions

* Event feed hiển thị theo điều kiện lọc.

#### Main Flow (Happy Path)

1. Người dùng chọn filter:

   * event type
   * unit
   * result
   * time range nếu có
2. Hệ thống áp dụng filter.
3. UI hiển thị danh sách event phù hợp.

#### Alternative Flows

1. Filter không trả dữ liệu.
2. UI hiển thị empty state.

#### Exception Flows

1. Filter query lỗi.
2. Hệ thống hiển thị lỗi.

#### Business Rules

* Filter không thay đổi dữ liệu runtime.
* Filter chỉ ảnh hưởng phần hiển thị.

---

### Module: Alert & Warning Monitoring

#### Use Case Name

View Runtime Alerts

#### Use Case ID

UC-LIVE-13

#### Objective

Cho phép người dùng xem các cảnh báo runtime đang tồn tại.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Có hoặc không có alert active.

#### Postconditions

* Alert list được hiển thị.

#### Main Flow (Happy Path)

1. Người dùng mở Live Monitoring.
2. Hệ thống tải active alerts.
3. UI hiển thị alert theo mức độ:

   * warning
   * error
   * critical nếu có
4. Mỗi alert hiển thị:

   * type
   * message
   * source
   * time
   * status

#### Alternative Flows

1. Không có alert.
2. UI hiển thị trạng thái “No active alerts”.

#### Exception Flows

1. Không tải được alert list.
2. UI hiển thị lỗi.

#### Business Rules

* Camera failure, missing mapping, SSE disconnected phải được phản ánh dưới dạng alert/warning.
* Alert không nhất thiết chặn các phần monitoring khác.

---

#### Use Case Name

Acknowledge Runtime Alert

#### Use Case ID

UC-LIVE-14

#### Objective

Cho phép người dùng xác nhận đã biết một alert runtime.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Alert tồn tại.
* Alert chưa được acknowledge.

#### Postconditions

* Alert được đánh dấu acknowledged.

#### Main Flow (Happy Path)

1. Người dùng chọn alert.
2. Người dùng nhấn Acknowledge.
3. Hệ thống kiểm tra quyền.
4. Hệ thống cập nhật alert thành acknowledged.
5. UI cập nhật alert status.

#### Alternative Flows

1. Alert đã được acknowledge trước đó.
2. Hệ thống refresh và hiển thị trạng thái hiện tại.

#### Exception Flows

1. Alert không tồn tại.
2. Hệ thống báo lỗi not found.

#### Business Rules

* Admin và Operator đều được acknowledge alert.
* Acknowledge không tự sửa lỗi gốc.
* Alert critical có thể vẫn còn visible dù đã acknowledge nếu lỗi chưa hết.

---

### Module: Runtime Connection Monitoring

#### Use Case Name

View SSE / Runtime Connection Status

#### Use Case ID

UC-LIVE-15

#### Objective

Cho phép người dùng theo dõi trạng thái kết nối runtime/SSE.

#### Actors

* Admin
* Operator
* System

#### Preconditions

* Runtime service đã được khởi tạo hoặc có trạng thái kết nối.

#### Postconditions

* Trạng thái kết nối được hiển thị.

#### Main Flow (Happy Path)

1. Người dùng mở Live Monitoring.
2. Hệ thống tải SSE/runtime connection status.
3. UI hiển thị:

   * `CONNECTED`
   * `RECONNECTING`
   * `DISCONNECTED`
4. UI cập nhật khi status thay đổi.

#### Alternative Flows

1. Runtime chưa start.
2. UI hiển thị trạng thái “Not running” hoặc “Unavailable” nếu backend có trả.

#### Exception Flows

1. Không đọc được connection status.
2. UI hiển thị warning.

#### Business Rules

* Connection status phải luôn dễ thấy trong Live Monitoring.
* Disconnected state phải hiển thị rõ ràng, không được ẩn.

---

#### Use Case Name

Handle Runtime Disconnected State

#### Use Case ID

UC-LIVE-16

#### Objective

Đảm bảo UI phản ánh đúng khi runtime/SSE mất kết nối.

#### Actors

* System
* UI Client

#### Preconditions

* Runtime/SSE status chuyển sang `DISCONNECTED` hoặc `RECONNECTING`.

#### Postconditions

* UI hiển thị trạng thái degraded.

#### Main Flow (Happy Path)

1. Runtime status thay đổi sang `RECONNECTING` hoặc `DISCONNECTED`.
2. UI nhận update.
3. UI hiển thị badge cảnh báo.
4. UI hiển thị banner:

   * reconnecting
   * disconnected
5. Live data vẫn hiển thị nhưng được đánh dấu có thể không còn mới.

#### Alternative Flows

1. Runtime reconnect thành công.
2. UI ẩn warning và refresh snapshot.

#### Exception Flows

1. UI không nhận được update.
2. UI có thể phát hiện stale data qua timestamp nếu được backend cung cấp.

#### Business Rules

* Disconnected không làm mất dữ liệu đang hiển thị ngay lập tức.
* Người dùng phải biết dữ liệu có thể không còn realtime.

---

### Module: Admin Recovery Monitoring

#### Use Case Name

Run Runtime Recovery Action

#### Use Case ID

UC-LIVE-17

#### Objective

Cho phép Admin chạy thao tác recovery/reconnect runtime khi hệ thống bị mất kết nối hoặc state lệch.

#### Actors

* Admin
* System
* TS-D1000

#### Preconditions

* Admin đã đăng nhập.
* Runtime đang ở trạng thái lỗi, disconnected, hoặc cần recovery.
* TS-D1000 config tồn tại.

#### Postconditions

* Recovery action được thực hiện.
* Runtime state được cập nhật hoặc lỗi được hiển thị.

#### Main Flow (Happy Path)

1. Admin mở Runtime Monitor.
2. Admin chọn Recovery/Reconnect.
3. Hệ thống kiểm tra quyền Admin.
4. Hệ thống thực hiện recovery:

   * reconnect SSE
   * reload runtime snapshot
   * sync current active/request state nếu backend hỗ trợ
5. Hệ thống cập nhật trạng thái kết nối.
6. UI hiển thị kết quả recovery.

#### Alternative Flows

1. Runtime đã connected.
2. Hệ thống có thể thực hiện refresh snapshot thay vì reconnect đầy đủ.

#### Exception Flows

1. TS-D1000 không phản hồi.
2. Hệ thống báo recovery failed.
3. Người dùng không phải Admin.
4. Hệ thống từ chối thao tác.

#### Business Rules

* Chỉ Admin được chạy recovery/reconnect action.
* Recovery không được thay đổi cấu hình hệ thống.
* Recovery phải ghi log để phục vụ troubleshooting.

---

## 5. Kết luận

Bộ **Use Cases – Live Monitoring** đã cover:

* live dashboard
* realtime map
* speaker monitoring
* pending request summary
* camera status/target/result
* event feed
* alert/warning
* SSE/runtime status
* admin recovery

Module này là lớp **giám sát trực quan** kết nối trực tiếp với:

* Runtime Event Handling
* Manual/Automatic Behavior
* Camera Integration
* System Configuration
* Logging/Audit
