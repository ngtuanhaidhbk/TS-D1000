# Use Cases – Manual / Automatic Behavior

Tài liệu này được chuyển từ requirement, UI/UX logic, và runtime behavior đã mô tả trước đó.

---

# 1. Assumptions

1. Hệ thống có 2 role liên quan trực tiếp đến vận hành runtime:
   * Admin
   * Operator
2. Cả Admin và Operator đều có thể:
   * xem trạng thái runtime
   * xử lý approve/reject request trong Manual mode
3. Chỉ Admin được đổi mode giữa `MANUAL` và `AUTOMATIC`.
4. `MANUAL` và `AUTOMATIC` là room-level operation mode, chỉ có 1 mode active tại một thời điểm.
5. Trong `MANUAL` mode:
   * delegate/chairman bấm Talk sẽ tạo request chờ xử lý
   * operator phải approve hoặc reject
6. Trong `AUTOMATIC` mode:
   * không có speaking request queue
   * khi có event speaking hợp lệ, hệ thống xử lý ngay
7. Camera chỉ trigger theo trạng thái speaking thực tế, không trigger khi request chưa được approve.
8. Nếu đang có active speaker mà Admin đổi mode, hệ thống cho phép đổi mode nhưng phải cảnh báo về ảnh hưởng tới session hiện tại.
9. Pending request chỉ có ý nghĩa trong `MANUAL` mode.

---

# 2. List of Identified Modules

1. Operation Mode Management
2. Manual Speaking Control
3. Automatic Speaking Handling
4. Mode-Based UI / Runtime Behavior
5. Runtime Safeguards During Mode Switch

---

# 3. List of Use Cases per Module

## 1. Operation Mode Management

* UC-MODE-01: View Current Operation Mode
* UC-MODE-02: Change Operation Mode

## 2. Manual Speaking Control

* UC-MANUAL-01: Create Speaking Request in Manual Mode
* UC-MANUAL-02: View Pending Request Queue in Manual Mode
* UC-MANUAL-03: Approve Speaking Request in Manual Mode
* UC-MANUAL-04: Reject Speaking Request in Manual Mode

## 3. Automatic Speaking Handling

* UC-AUTO-01: Activate Speaker Automatically
* UC-AUTO-02: Handle Camera Auto-Tracking in Automatic Mode

## 4. Mode-Based UI / Runtime Behavior

* UC-BEHAVIOR-01: Show Mode-Specific Runtime UI
* UC-BEHAVIOR-02: Hide Invalid Actions by Mode

## 5. Runtime Safeguards During Mode Switch

* UC-SWITCH-01: Warn Before Switching Mode During Active Session
* UC-SWITCH-02: Apply Runtime State After Mode Change

---

# 4. Full Detailed Use Cases

## Module: Operation Mode Management

### UC-MODE-01: View Current Operation Mode

**Objective:** Hiển thị mode hiện tại để user hiểu đúng logic realtime.

**Actors:** Admin, Operator, System

**Preconditions:** user đã login; room tồn tại; runtime context đã load.

**Postconditions:** Mode được hiển thị rõ; UI thay đổi theo mode.

**Business Rules:**

* Mode phải hiển thị rõ cho user trong runtime.
* Admin và Operator đều được xem mode.
* UI runtime phải thay đổi theo mode đang active.

---

### UC-MODE-02: Change Operation Mode

**Objective:** Admin đổi mode giữa `MANUAL` và `AUTOMATIC`.

**Actors:** Admin, System

**Business Rules:**

* Chỉ Admin được đổi mode.
* 1 room chỉ có 1 mode active tại một thời điểm.
* Mode mới ảnh hưởng runtime behavior ngay sau khi lưu.

---

## Module: Manual Speaking Control

### UC-MANUAL-01: Create Speaking Request in Manual Mode

**Objective:** Tạo request `PENDING` khi delegate/chairman nhấn Talk trong `MANUAL`.

**Business Rules:**

* Request chỉ tồn tại trong `MANUAL`.
* 1 unit tối đa 1 request `PENDING`.
* Tạo request => unit state `REQUEST`.
* Request chưa approve thì chưa là `SPEAKING`.

---

### UC-MANUAL-02: View Pending Request Queue in Manual Mode

**Objective:** Admin/Operator xem queue request pending.

**Business Rules:**

* Queue chỉ hiển thị trong `MANUAL`.
* Admin/Operator đều xem được.

---

### UC-MANUAL-03: Approve Speaking Request in Manual Mode

**Objective:** Approve request `PENDING` trong `MANUAL`, gửi command TS-D, chờ event speaking.

**Business Rules:**

* Approve chỉ hợp lệ trong `MANUAL`.
* Chỉ `PENDING` mới approve.
* Camera chỉ trigger sau event speaking thực tế.

---

### UC-MANUAL-04: Reject Speaking Request in Manual Mode

**Objective:** Reject request `PENDING` trong `MANUAL`, unit về `IDLE`, không trigger camera.

**Business Rules:**

* Reject chỉ hợp lệ trong `MANUAL`.
* Reject không trigger camera.
* Chỉ `PENDING` mới reject.

---

## Module: Automatic Speaking Handling

### UC-AUTO-01: Activate Speaker Automatically

**Objective:** Trong `AUTOMATIC`, nhận event speaking hợp lệ => unit `SPEAKING`, không có queue.

**Business Rules:**

* `AUTOMATIC` không có request queue.
* Không cần approval.
* UI không hiển thị approve/reject.

---

### UC-AUTO-02: Handle Camera Auto-Tracking in Automatic Mode

**Objective:** Trigger camera theo active speaker trong `AUTOMATIC` nếu mapping hợp lệ.

**Business Rules:**

* Trigger theo speaking thực tế.
* Chỉ trigger khi mapping active hợp lệ.
* Anti-jitter áp dụng.

---

## Module: Mode-Based UI / Runtime Behavior

### UC-BEHAVIOR-01: Show Mode-Specific Runtime UI

* `MANUAL`: hiển thị queue + approve/reject + active speaker.
* `AUTOMATIC`: ẩn queue + approve/reject; chỉ monitoring.

### UC-BEHAVIOR-02: Hide Invalid Actions by Mode

* UI ẩn action sai mode.
* Backend vẫn validate mode nếu bị gọi trực tiếp.

---

## Module: Runtime Safeguards During Mode Switch

### UC-SWITCH-01: Warn Before Switching Mode During Active Session

**Objective:** Cảnh báo khi đổi mode trong lúc có active speaker hoặc pending request.

### UC-SWITCH-02: Apply Runtime State After Mode Change

**Objective:** Mode mới áp dụng cho event sau thời điểm đổi mode; UI/engine dùng mode mới làm source-of-truth.

