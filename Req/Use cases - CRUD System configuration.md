# Assumptions

Các điểm sau chưa được mô tả đầy đủ trong requirement gốc, nên được ghi rõ là giả định để hoàn thiện bộ UC:

1. Hệ thống có 2 vai trò liên quan đến cấu hình:

   * **Admin**: được tạo/sửa/test/deactivate cấu hình
   * **Operator**: chỉ được xem cấu hình
2. MVP chỉ có **1 room active**.
3. Mỗi room chỉ có:

   * 1 cấu hình TS-D1000 active
   * 1 layout active
   * tối đa 4 camera active
4. Với “Delete” trong CRUD:

   * **TS-D1000 config**: dùng **Deactivate/Replace**, không hard delete
   * **Camera**: ưu tiên **Deactivate**, không hard delete khi còn dependency
   * **Mapping**: có thể dùng **Deactivate** thay cho xóa vật lý
5. Camera preset được coi là thực thể con của camera.
6. Mapping active là mapping được runtime engine sử dụng.
7. Operator có quyền xem nhưng không có quyền tạo/sửa/xóa cấu hình.
8. Readiness check là thao tác kiểm tra, không tự sửa dữ liệu.

---

# 1. List of Identified Modules

1. System Configuration Overview
2. TS-D1000 Configuration
3. Camera Configuration
4. Camera Preset Configuration
5. Layout & Map Configuration
6. Mic-Camera Mapping Configuration
7. Operation Mode Configuration
8. Configuration Testing & Readiness

---

# 2. List of Use Cases per Module

## 1. System Configuration Overview

* UC-CONFIG-01: View System Configuration Overview

## 2. TS-D1000 Configuration

* UC-TSDCFG-01: Create TS-D1000 Configuration
* UC-TSDCFG-02: View TS-D1000 Configuration
* UC-TSDCFG-03: Update TS-D1000 Configuration
* UC-TSDCFG-04: Deactivate TS-D1000 Configuration
* UC-TSDCFG-05: Sync TS-D1000 Device List

## 3. Camera Configuration

* UC-CFGCAM-01: Create Camera
* UC-CFGCAM-02: View Camera List
* UC-CFGCAM-03: View Camera Detail
* UC-CFGCAM-04: Update Camera
* UC-CFGCAM-05: Deactivate Camera

## 4. Camera Preset Configuration

* UC-PRESET-01: Create Camera Preset
* UC-PRESET-02: View Camera Preset List
* UC-PRESET-03: Update Camera Preset
* UC-PRESET-04: Delete Camera Preset

## 5. Layout & Map Configuration

* UC-LAYOUT-01: Upload Layout File
* UC-LAYOUT-02: Replace Layout File
* UC-LAYOUT-03: Place Devices on Layout
* UC-LAYOUT-04: Add Layout Annotation
* UC-LAYOUT-05: Update Layout Annotation

## 6. Mic-Camera Mapping Configuration

* UC-MAPCFG-01: Create Mic-to-Camera Mapping
* UC-MAPCFG-02: View Mic-to-Camera Mapping List
* UC-MAPCFG-03: Update Mic-to-Camera Mapping
* UC-MAPCFG-04: Deactivate Mic-to-Camera Mapping

## 7. Operation Mode Configuration

* UC-MODE-01: View System Operation Mode
* UC-MODE-02: Update System Operation Mode

## 8. Configuration Testing & Readiness

* UC-TEST-01: Test TS-D1000 Connection
* UC-TEST-02: Test Camera Connection
* UC-TEST-03: Run System Configuration Readiness Check

---

# 3. Full Detailed Use Cases

## Module: System Configuration Overview

### Use Case Name

View System Configuration Overview

### Use Case ID

UC-CONFIG-01

### Objective

Cho phép người dùng xem tổng quan trạng thái cấu hình hệ thống hiện tại của room.

### Actors

* Admin
* Operator
* System

### Preconditions

* Người dùng đã đăng nhập.
* Room active tồn tại.

### Postconditions

* Hệ thống hiển thị trạng thái cấu hình của:

  * TS-D1000
  * Camera
  * Layout
  * Mapping
  * Operation Mode

### Main Flow (Happy Path)

1. Người dùng mở module System Configuration.
2. Hệ thống kiểm tra quyền truy cập.
3. Hệ thống tải dữ liệu cấu hình hiện tại.
4. Hệ thống hiển thị tổng quan cấu hình.

### Alternative Flows

1. Người dùng là Operator.
2. Hệ thống hiển thị dữ liệu ở chế độ chỉ xem.

### Exception Flows

1. Người dùng không có quyền truy cập.

2. Hệ thống từ chối truy cập.

3. Dữ liệu cấu hình không tải được.

4. Hệ thống hiển thị lỗi tải dữ liệu.

### Business Rules

* Admin được xem và chỉnh sửa.
* Operator chỉ được xem.
* Dữ liệu hiển thị phải phản ánh cấu hình active mới nhất.

---

## Module: TS-D1000 Configuration

### Use Case Name

Create TS-D1000 Configuration

### Use Case ID

UC-TSDCFG-01

### Objective

Cho phép Admin tạo cấu hình kết nối TS-D1000 cho room.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Room chưa có TS-D1000 configuration active.

### Postconditions

* Cấu hình TS-D1000 được tạo thành công.

### Main Flow (Happy Path)

1. Admin mở màn hình TS-D1000 Configuration.
2. Admin chọn Create Configuration.
3. Hệ thống hiển thị form.
4. Admin nhập:

   * Base URL
   * Username
   * Password
   * SSE Endpoint
5. Admin nhấn Save.
6. Hệ thống kiểm tra dữ liệu hợp lệ.
7. Hệ thống lưu cấu hình.
8. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin không nhập SSE Endpoint.
2. Hệ thống dùng giá trị mặc định theo thiết kế nếu được cấu hình sẵn.

### Exception Flows

1. Base URL để trống.

2. Hệ thống báo lỗi validation.

3. Room đã có cấu hình TS-D1000 active.

4. Hệ thống từ chối tạo mới.

5. Hệ thống không lưu được dữ liệu.

6. Hệ thống hiển thị lỗi hệ thống.

### Business Rules

* Chỉ Admin được tạo cấu hình TS-D1000.
* Mỗi room chỉ có 1 cấu hình TS-D1000 active.
* Cấu hình mới không tự động đồng bộ unit list nếu chưa có hành động sync riêng.

---

### Use Case Name

View TS-D1000 Configuration

### Use Case ID

UC-TSDCFG-02

### Objective

Cho phép người dùng xem cấu hình TS-D1000 hiện tại.

### Actors

* Admin
* Operator
* System

### Preconditions

* Người dùng đã đăng nhập.
* Room tồn tại.

### Postconditions

* Thông tin cấu hình TS-D1000 được hiển thị.

### Main Flow (Happy Path)

1. Người dùng mở phần TS-D1000 Configuration.
2. Hệ thống kiểm tra quyền.
3. Hệ thống tải cấu hình hiện tại.
4. Hệ thống hiển thị thông tin cấu hình và trạng thái test gần nhất.

### Alternative Flows

1. Chưa có cấu hình TS-D1000.
2. Hệ thống hiển thị trạng thái “Not configured”.

### Exception Flows

1. Hệ thống không tải được dữ liệu.
2. Hệ thống hiển thị lỗi.

### Business Rules

* Admin và Operator đều được xem.
* Password không được hiển thị ở dạng plain text.

---

### Use Case Name

Update TS-D1000 Configuration

### Use Case ID

UC-TSDCFG-03

### Objective

Cho phép Admin cập nhật cấu hình TS-D1000 hiện tại.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Cấu hình TS-D1000 đã tồn tại.

### Postconditions

* Cấu hình TS-D1000 được cập nhật.

### Main Flow (Happy Path)

1. Admin mở chi tiết cấu hình TS-D1000.
2. Admin chọn Edit.
3. Hệ thống hiển thị form với dữ liệu hiện tại.
4. Admin chỉnh sửa dữ liệu.
5. Admin nhấn Save.
6. Hệ thống kiểm tra tính hợp lệ.
7. Hệ thống cập nhật cấu hình.
8. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin chỉ cập nhật credential.
2. Hệ thống chỉ cập nhật các trường thay đổi.

### Exception Flows

1. Cấu hình không tồn tại.

2. Hệ thống báo lỗi không tìm thấy dữ liệu.

3. Base URL hoặc field bắt buộc không hợp lệ.

4. Hệ thống báo lỗi validation.

### Business Rules

* Chỉ Admin được sửa cấu hình TS-D1000.
* Sau khi cập nhật cấu hình, nên test lại kết nối trước khi vận hành runtime.
* Cập nhật cấu hình không tự thay đổi operation mode.

---

### Use Case Name

Deactivate TS-D1000 Configuration

### Use Case ID

UC-TSDCFG-04

### Objective

Cho phép Admin vô hiệu hóa cấu hình TS-D1000 hiện tại.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Có TS-D1000 configuration active.

### Postconditions

* Cấu hình TS-D1000 không còn active.

### Main Flow (Happy Path)

1. Admin mở cấu hình TS-D1000.
2. Admin chọn Deactivate.
3. Hệ thống yêu cầu xác nhận.
4. Admin xác nhận.
5. Hệ thống cập nhật trạng thái cấu hình thành inactive.
6. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin hủy xác nhận.
2. Hệ thống không thay đổi dữ liệu.

### Exception Flows

1. Không có cấu hình active để deactivate.
2. Hệ thống báo lỗi trạng thái không hợp lệ.

### Business Rules

* Chỉ Admin được deactivate cấu hình.
* Room không được có nhiều hơn một cấu hình TS-D1000 active.
* Deactivate không xóa vật lý dữ liệu cấu hình.

---

### Use Case Name

Sync TS-D1000 Device List

### Use Case ID

UC-TSDCFG-05

### Objective

Cho phép Admin đồng bộ danh sách unit từ TS-D1000 về hệ thống.

### Actors

* Admin
* System
* TS-D1000

### Preconditions

* TS-D1000 configuration active tồn tại.
* TS-D1000 có thể truy cập được.

### Postconditions

* Danh sách chairman/delegate unit được tạo mới hoặc cập nhật.

### Main Flow (Happy Path)

1. Admin chọn Sync Device List.
2. Hệ thống gọi API TS-D1000.
3. Hệ thống nhận danh sách unit.
4. Hệ thống đối chiếu với dữ liệu hiện có.
5. Hệ thống tạo mới hoặc cập nhật unit.
6. Hệ thống hiển thị kết quả sync.

### Alternative Flows

1. Một số unit đã tồn tại.
2. Hệ thống cập nhật thay vì tạo mới.

### Exception Flows

1. TS-D1000 không phản hồi.

2. Hệ thống báo lỗi sync thất bại.

3. Dữ liệu trả về không hợp lệ.

4. Hệ thống bỏ qua record lỗi và ghi log.

### Business Rules

* Chỉ Admin được đồng bộ unit.
* `external_unit_id` phải là định danh duy nhất trong room.
* Unit type phải được lưu đúng nếu nguồn dữ liệu có phân loại chairman/delegate.

---

## Module: Camera Configuration

### Use Case Name

Create Camera

### Use Case ID

UC-CFGCAM-01

### Objective

Cho phép Admin thêm camera mới vào room.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Số camera active hiện tại chưa vượt giới hạn MVP.

### Postconditions

* Camera mới được lưu vào hệ thống.

### Main Flow (Happy Path)

1. Admin mở Camera Configuration.
2. Admin chọn Add Camera.
3. Hệ thống hiển thị form.
4. Admin nhập thông tin camera.
5. Admin nhấn Save.
6. Hệ thống kiểm tra dữ liệu.
7. Hệ thống lưu camera.
8. Hệ thống hiển thị camera trong danh sách.

### Alternative Flows

1. Admin lưu camera mà chưa test kết nối.
2. Hệ thống lưu camera nhưng chưa có kết quả test.

### Exception Flows

1. Thiếu field bắt buộc.

2. Hệ thống báo lỗi validation.

3. Đã đạt giới hạn camera active.

4. Hệ thống từ chối thêm mới.

5. IP/port bị trùng trong room.

6. Hệ thống báo lỗi conflict.

### Business Rules

* Chỉ Admin được thêm camera.
* Tối đa 4 camera active trong MVP.
* Protocol phải thuộc danh sách được hỗ trợ.

---

### Use Case Name

View Camera List

### Use Case ID

UC-CFGCAM-02

### Objective

Cho phép người dùng xem danh sách camera đã cấu hình.

### Actors

* Admin
* Operator
* System

### Preconditions

* Người dùng đã đăng nhập.

### Postconditions

* Danh sách camera được hiển thị.

### Main Flow (Happy Path)

1. Người dùng mở Camera Configuration.
2. Hệ thống kiểm tra quyền.
3. Hệ thống tải danh sách camera.
4. Hệ thống hiển thị danh sách camera cùng trạng thái.

### Alternative Flows

1. Chưa có camera nào.
2. Hệ thống hiển thị danh sách rỗng.

### Exception Flows

1. Hệ thống không tải được danh sách camera.
2. Hệ thống hiển thị lỗi tải dữ liệu.

### Business Rules

* Admin và Operator đều được xem danh sách camera.
* Operator chỉ được xem, không sửa.

---

### Use Case Name

View Camera Detail

### Use Case ID

UC-CFGCAM-03

### Objective

Cho phép người dùng xem chi tiết một camera.

### Actors

* Admin
* Operator
* System

### Preconditions

* Camera tồn tại.

### Postconditions

* Thông tin chi tiết camera được hiển thị.

### Main Flow (Happy Path)

1. Người dùng chọn một camera từ danh sách.
2. Hệ thống tải thông tin chi tiết camera.
3. Hệ thống hiển thị:

   * thông tin kết nối
   * capability
   * test result
   * preset list

### Alternative Flows

1. Camera có capability chưa được detect.
2. Hệ thống hiển thị trạng thái chưa xác nhận.

### Exception Flows

1. Camera không tồn tại.
2. Hệ thống báo lỗi không tìm thấy.

### Business Rules

* Admin và Operator đều được xem chi tiết camera.
* Không hiển thị password ở dạng plain text.

---

### Use Case Name

Update Camera

### Use Case ID

UC-CFGCAM-04

### Objective

Cho phép Admin cập nhật thông tin camera.

### Actors

* Admin
* System

### Preconditions

* Camera đã tồn tại.

### Postconditions

* Camera được cập nhật.

### Main Flow (Happy Path)

1. Admin mở chi tiết camera.
2. Admin chọn Edit.
3. Hệ thống hiển thị form với dữ liệu hiện có.
4. Admin chỉnh sửa thông tin.
5. Admin nhấn Save.
6. Hệ thống kiểm tra dữ liệu.
7. Hệ thống cập nhật camera.
8. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin chỉ cập nhật credential hoặc RTSP URL.
2. Hệ thống chỉ cập nhật các field thay đổi.

### Exception Flows

1. Camera không tồn tại.

2. Hệ thống báo lỗi không tìm thấy.

3. Cập nhật tạo ra IP/port trùng trong room.

4. Hệ thống báo lỗi conflict.

### Business Rules

* Chỉ Admin được sửa camera.
* Cập nhật camera không tự động cập nhật mapping đang dùng camera đó.

---

### Use Case Name

Deactivate Camera

### Use Case ID

UC-CFGCAM-05

### Objective

Cho phép Admin vô hiệu hóa camera khỏi cấu hình active.

### Actors

* Admin
* System

### Preconditions

* Camera tồn tại và đang active.

### Postconditions

* Camera được chuyển sang inactive.

### Main Flow (Happy Path)

1. Admin chọn camera.
2. Admin chọn Deactivate.
3. Hệ thống kiểm tra dependency.
4. Nếu hợp lệ, hệ thống yêu cầu xác nhận.
5. Admin xác nhận.
6. Hệ thống chuyển camera sang inactive.
7. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin hủy xác nhận.
2. Hệ thống không thay đổi dữ liệu.

### Exception Flows

1. Camera đang được active mapping tham chiếu.

2. Hệ thống từ chối deactivate và yêu cầu xử lý mapping trước.

3. Camera đã inactive.

4. Hệ thống báo lỗi trạng thái không hợp lệ.

### Business Rules

* Chỉ Admin được deactivate camera.
* Camera inactive không được dùng cho active mapping.
* Không được deactivate camera nếu còn dependency active theo rule nghiệp vụ.

---

## Module: Camera Preset Configuration

### Use Case Name

Create Camera Preset

### Use Case ID

UC-PRESET-01

### Objective

Cho phép Admin tạo preset cho một camera.

### Actors

* Admin
* System
* Camera PTZ

### Preconditions

* Camera tồn tại.
* Camera hỗ trợ preset hoặc hệ thống cho phép lưu preset logic.

### Postconditions

* Preset được lưu trong hệ thống.

### Main Flow (Happy Path)

1. Admin mở phần preset của camera.
2. Admin chọn Add Preset.
3. Admin nhập preset code và preset name.
4. Admin nhấn Save.
5. Hệ thống kiểm tra dữ liệu.
6. Hệ thống lưu preset.
7. Hệ thống hiển thị preset trong danh sách.

### Alternative Flows

1. Admin tạo preset dựa trên vị trí camera hiện tại.
2. Hệ thống lưu preset theo logic adapter nếu được hỗ trợ.

### Exception Flows

1. Preset code trùng trong cùng camera.

2. Hệ thống báo lỗi conflict.

3. Camera không hỗ trợ preset.

4. Hệ thống báo lỗi business rule.

### Business Rules

* Chỉ Admin được tạo preset.
* `preset_code` phải duy nhất trong phạm vi camera.
* Preset phải thuộc đúng camera.

---

### Use Case Name

View Camera Preset List

### Use Case ID

UC-PRESET-02

### Objective

Cho phép người dùng xem danh sách preset của camera.

### Actors

* Admin
* Operator
* System

### Preconditions

* Camera tồn tại.

### Postconditions

* Danh sách preset được hiển thị.

### Main Flow (Happy Path)

1. Người dùng mở camera detail.
2. Hệ thống tải preset list.
3. Hệ thống hiển thị danh sách preset.

### Alternative Flows

1. Camera chưa có preset nào.
2. Hệ thống hiển thị danh sách rỗng.

### Exception Flows

1. Camera không tồn tại.
2. Hệ thống báo lỗi không tìm thấy.

### Business Rules

* Admin và Operator đều được xem preset list.

---

### Use Case Name

Update Camera Preset

### Use Case ID

UC-PRESET-03

### Objective

Cho phép Admin cập nhật preset hiện có.

### Actors

* Admin
* System

### Preconditions

* Preset tồn tại.

### Postconditions

* Preset được cập nhật.

### Main Flow (Happy Path)

1. Admin chọn preset.
2. Admin chọn Edit.
3. Hệ thống hiển thị dữ liệu preset.
4. Admin chỉnh sửa thông tin.
5. Admin nhấn Save.
6. Hệ thống kiểm tra dữ liệu.
7. Hệ thống cập nhật preset.
8. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin chỉ cập nhật preset name.
2. Hệ thống chỉ cập nhật field liên quan.

### Exception Flows

1. Preset không tồn tại.

2. Hệ thống báo lỗi không tìm thấy.

3. Preset code mới bị trùng.

4. Hệ thống báo lỗi conflict.

### Business Rules

* Chỉ Admin được sửa preset.
* `preset_code` phải duy nhất trong cùng camera.

---

### Use Case Name

Delete Camera Preset

### Use Case ID

UC-PRESET-04

### Objective

Cho phép Admin xóa preset khỏi camera nếu không còn dependency active.

### Actors

* Admin
* System

### Preconditions

* Preset tồn tại.

### Postconditions

* Preset bị xóa hoặc bị loại khỏi danh sách active.

### Main Flow (Happy Path)

1. Admin chọn preset.
2. Admin chọn Delete.
3. Hệ thống kiểm tra dependency.
4. Nếu không có dependency active, hệ thống yêu cầu xác nhận.
5. Admin xác nhận.
6. Hệ thống xóa preset.
7. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin hủy xác nhận.
2. Hệ thống không thay đổi dữ liệu.

### Exception Flows

1. Preset đang được mapping active sử dụng.

2. Hệ thống từ chối xóa preset.

3. Preset không tồn tại.

4. Hệ thống báo lỗi không tìm thấy.

### Business Rules

* Chỉ Admin được xóa preset.
* Không được xóa preset nếu preset đang được active mapping sử dụng.

---

## Module: Layout & Map Configuration

### Use Case Name

Upload Layout File

### Use Case ID

UC-LAYOUT-01

### Objective

Cho phép Admin upload layout mới cho room.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.

### Postconditions

* Layout được lưu và gắn với room.

### Main Flow (Happy Path)

1. Admin mở Layout Configuration.
2. Admin chọn Upload Layout.
3. Admin chọn file PDF/JPG/JPEG.
4. Hệ thống kiểm tra định dạng file.
5. Hệ thống upload và lưu file.
6. Hệ thống hiển thị layout mới.

### Alternative Flows

1. Room chưa có layout trước đó.
2. Hệ thống lưu layout như layout đầu tiên.

### Exception Flows

1. File không đúng định dạng.

2. Hệ thống báo lỗi validation.

3. Upload thất bại.

4. Hệ thống báo lỗi hệ thống.

### Business Rules

* Chỉ Admin được upload layout.
* Chỉ chấp nhận PDF/JPG/JPEG.

---

### Use Case Name

Replace Layout File

### Use Case ID

UC-LAYOUT-02

### Objective

Cho phép Admin thay layout hiện tại bằng layout mới.

### Actors

* Admin
* System

### Preconditions

* Room đã có layout active.

### Postconditions

* Layout mới trở thành layout active.

### Main Flow (Happy Path)

1. Admin chọn Replace Layout.
2. Hệ thống yêu cầu chọn file mới.
3. Admin chọn file.
4. Hệ thống kiểm tra định dạng.
5. Hệ thống yêu cầu xác nhận thay thế.
6. Admin xác nhận.
7. Hệ thống lưu layout mới.
8. Hệ thống cập nhật layout active.

### Alternative Flows

1. Admin hủy thao tác xác nhận.
2. Hệ thống giữ nguyên layout cũ.

### Exception Flows

1. File không hợp lệ.
2. Hệ thống báo lỗi validation.

### Business Rules

* Mỗi room chỉ có một layout active.
* Chỉ Admin được thay layout.

---

### Use Case Name

Place Devices on Layout

### Use Case ID

UC-LAYOUT-03

### Objective

Cho phép Admin đặt vị trí mic/camera trên layout.

### Actors

* Admin
* System

### Preconditions

* Layout tồn tại.
* Danh sách unit và camera đã có.

### Postconditions

* Vị trí thiết bị được lưu.

### Main Flow (Happy Path)

1. Admin mở layout editor.
2. Hệ thống hiển thị layout và danh sách thiết bị.
3. Admin kéo-thả thiết bị lên layout.
4. Admin điều chỉnh vị trí.
5. Admin nhấn Save Positions.
6. Hệ thống lưu tọa độ thiết bị.

### Alternative Flows

1. Admin cập nhật vị trí thiết bị đã có.
2. Hệ thống cập nhật tọa độ mới.

### Exception Flows

1. Layout chưa tồn tại.

2. Hệ thống không cho phép đặt vị trí.

3. Thiết bị tham chiếu không tồn tại.

4. Hệ thống báo lỗi validation.

### Business Rules

* Chỉ Admin được lưu vị trí thiết bị.
* `posX`, `posY` phải hợp lệ trong layout.
* Mỗi refType + refId chỉ có một vị trí active.

---

### Use Case Name

Add Layout Annotation

### Use Case ID

UC-LAYOUT-04

### Objective

Cho phép Admin thêm annotation mới trên layout.

### Actors

* Admin
* System

### Preconditions

* Layout tồn tại.

### Postconditions

* Annotation mới được lưu.

### Main Flow (Happy Path)

1. Admin chọn Add Annotation.
2. Admin nhập nội dung.
3. Admin chọn vị trí trên layout.
4. Admin nhấn Save.
5. Hệ thống lưu annotation.

### Alternative Flows

1. Admin thêm nhiều annotation liên tiếp.
2. Hệ thống lưu từng annotation.

### Exception Flows

1. Nội dung annotation rỗng.
2. Hệ thống báo lỗi validation.

### Business Rules

* Chỉ Admin được thêm annotation.
* Annotation phải có nội dung và vị trí hợp lệ.

---

### Use Case Name

Update Layout Annotation

### Use Case ID

UC-LAYOUT-05

### Objective

Cho phép Admin cập nhật annotation hiện có trên layout.

### Actors

* Admin
* System

### Preconditions

* Annotation tồn tại.

### Postconditions

* Annotation được cập nhật.

### Main Flow (Happy Path)

1. Admin chọn annotation hiện có.
2. Admin chỉnh sửa nội dung hoặc vị trí.
3. Admin nhấn Save.
4. Hệ thống kiểm tra dữ liệu.
5. Hệ thống cập nhật annotation.

### Alternative Flows

1. Admin chỉ đổi nội dung.
2. Hệ thống chỉ cập nhật nội dung.

### Exception Flows

1. Annotation không tồn tại.

2. Hệ thống báo lỗi không tìm thấy.

3. Vị trí hoặc nội dung không hợp lệ.

4. Hệ thống báo lỗi validation.

### Business Rules

* Chỉ Admin được sửa annotation.

---

## Module: Mic-Camera Mapping Configuration

### Use Case Name

Create Mic-to-Camera Mapping

### Use Case ID

UC-MAPCFG-01

### Objective

Cho phép Admin tạo mapping giữa một unit và một camera preset.

### Actors

* Admin
* System

### Preconditions

* Unit tồn tại.
* Camera tồn tại và active.
* Preset tồn tại và thuộc camera đó.

### Postconditions

* Mapping được tạo thành công.

### Main Flow (Happy Path)

1. Admin mở Mapping Configuration.
2. Admin chọn Create Mapping.
3. Admin chọn unit.
4. Admin chọn camera.
5. Admin chọn preset.
6. Admin nhấn Save.
7. Hệ thống kiểm tra dữ liệu.
8. Hệ thống lưu mapping.
9. Hệ thống hiển thị mapping mới.

### Alternative Flows

1. Một camera có thể được dùng cho nhiều unit với preset khác nhau.
2. Hệ thống vẫn cho phép nếu mỗi mapping hợp lệ.

### Exception Flows

1. Unit đã có active mapping.

2. Hệ thống từ chối tạo mapping mới.

3. Preset không thuộc camera đã chọn.

4. Hệ thống báo lỗi validation/business rule.

5. Camera đang inactive.

6. Hệ thống từ chối tạo mapping.

### Business Rules

* Chỉ Admin được tạo mapping.
* Mỗi unit chỉ có 1 active mapping.
* Preset phải thuộc đúng camera.
* Camera active mới được dùng cho active mapping.

---

### Use Case Name

View Mic-to-Camera Mapping List

### Use Case ID

UC-MAPCFG-02

### Objective

Cho phép người dùng xem danh sách mapping hiện tại.

### Actors

* Admin
* Operator
* System

### Preconditions

* Người dùng đã đăng nhập.

### Postconditions

* Danh sách mapping được hiển thị.

### Main Flow (Happy Path)

1. Người dùng mở Mapping List.
2. Hệ thống tải danh sách mapping.
3. Hệ thống hiển thị mapping cùng trạng thái active.

### Alternative Flows

1. Chưa có mapping nào.
2. Hệ thống hiển thị danh sách rỗng.

### Exception Flows

1. Không tải được dữ liệu mapping.
2. Hệ thống hiển thị lỗi.

### Business Rules

* Admin và Operator đều được xem mapping list.
* Operator chỉ xem read-only.

---

### Use Case Name

Update Mic-to-Camera Mapping

### Use Case ID

UC-MAPCFG-03

### Objective

Cho phép Admin cập nhật mapping hiện có.

### Actors

* Admin
* System

### Preconditions

* Mapping tồn tại.

### Postconditions

* Mapping được cập nhật.

### Main Flow (Happy Path)

1. Admin chọn mapping.
2. Admin chọn Edit.
3. Hệ thống hiển thị dữ liệu mapping.
4. Admin thay đổi camera hoặc preset.
5. Admin nhấn Save.
6. Hệ thống kiểm tra dữ liệu.
7. Hệ thống cập nhật mapping.
8. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin chỉ thay preset.
2. Hệ thống chỉ cập nhật field liên quan.

### Exception Flows

1. Mapping không tồn tại.

2. Hệ thống báo lỗi không tìm thấy.

3. Preset mới không thuộc camera mới.

4. Hệ thống báo lỗi validation.

### Business Rules

* Chỉ Admin được sửa mapping.
* Sau khi cập nhật, runtime phải dùng active mapping mới nhất.

---

### Use Case Name

Deactivate Mic-to-Camera Mapping

### Use Case ID

UC-MAPCFG-04

### Objective

Cho phép Admin vô hiệu hóa mapping hiện có.

### Actors

* Admin
* System

### Preconditions

* Mapping tồn tại và đang active.

### Postconditions

* Mapping được chuyển sang inactive.

### Main Flow (Happy Path)

1. Admin chọn mapping.
2. Admin chọn Deactivate.
3. Hệ thống yêu cầu xác nhận.
4. Admin xác nhận.
5. Hệ thống cập nhật mapping sang inactive.
6. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin hủy xác nhận.
2. Hệ thống không thay đổi mapping.

### Exception Flows

1. Mapping không tồn tại.

2. Hệ thống báo lỗi không tìm thấy.

3. Mapping đã inactive.

4. Hệ thống báo lỗi trạng thái không hợp lệ.

### Business Rules

* Chỉ Admin được deactivate mapping.
* Mỗi unit có thể không có mapping active sau khi deactivate, và readiness check phải phản ánh điều này.

---

## Module: Operation Mode Configuration

### Use Case Name

View System Operation Mode

### Use Case ID

UC-MODE-01

### Objective

Cho phép người dùng xem chế độ vận hành hiện tại của room.

### Actors

* Admin
* Operator
* System

### Preconditions

* Room tồn tại.

### Postconditions

* Operation mode hiện tại được hiển thị.

### Main Flow (Happy Path)

1. Người dùng mở phần Operation Mode.
2. Hệ thống tải mode hiện tại.
3. Hệ thống hiển thị mode active.

### Alternative Flows

1. Chưa có mode được cấu hình.
2. Hệ thống hiển thị trạng thái chưa cấu hình.

### Exception Flows

1. Không tải được dữ liệu.
2. Hệ thống hiển thị lỗi.

### Business Rules

* Admin và Operator đều được xem mode.

---

### Use Case Name

Update System Operation Mode

### Use Case ID

UC-MODE-02

### Objective

Cho phép Admin cập nhật operation mode của room.

### Actors

* Admin
* System

### Preconditions

* Room tồn tại.
* Admin đã đăng nhập.

### Postconditions

* Operation mode mới được lưu.

### Main Flow (Happy Path)

1. Admin mở phần Operation Mode.
2. Admin chọn mode mới.
3. Admin nhấn Save.
4. Hệ thống kiểm tra dữ liệu.
5. Hệ thống cập nhật operation mode.
6. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin chọn lại chính mode hiện tại.
2. Hệ thống có thể coi là không có thay đổi.

### Exception Flows

1. Mode không hợp lệ.
2. Hệ thống báo lỗi validation.

### Business Rules

* Chỉ Admin được cập nhật mode.
* Chỉ có 1 mode active tại một thời điểm.

---

## Module: Configuration Testing & Readiness

### Use Case Name

Test TS-D1000 Connection

### Use Case ID

UC-TEST-01

### Objective

Cho phép Admin kiểm tra kết nối tới TS-D1000.

### Actors

* Admin
* System
* TS-D1000

### Preconditions

* TS-D1000 configuration tồn tại.

### Postconditions

* Kết quả test được hiển thị và lưu lại.

### Main Flow (Happy Path)

1. Admin chọn Test TS-D1000 Connection.
2. Hệ thống dùng cấu hình hiện tại để kiểm tra kết nối.
3. TS-D1000 phản hồi thành công.
4. Hệ thống cập nhật kết quả test.
5. Hệ thống hiển thị thành công.

### Alternative Flows

1. Kết nối thành công nhưng chưa sync unit.
2. Hệ thống chỉ đánh dấu test thành công.

### Exception Flows

1. TS-D1000 không phản hồi.

2. Hệ thống hiển thị test failed.

3. Credential hoặc endpoint sai.

4. Hệ thống hiển thị lỗi phù hợp.

### Business Rules

* Chỉ Admin được test TS-D1000.
* Test connection không tự đồng bộ unit list.

---

### Use Case Name

Test Camera Connection

### Use Case ID

UC-TEST-02

### Objective

Cho phép Admin kiểm tra kết nối và capability của camera.

### Actors

* Admin
* System
* Camera PTZ

### Preconditions

* Camera tồn tại.

### Postconditions

* Kết quả test camera được hiển thị và lưu lại.

### Main Flow (Happy Path)

1. Admin chọn một camera.
2. Admin nhấn Test Connection.
3. Hệ thống kiểm tra kết nối tới camera.
4. Hệ thống xác định capability nếu có thể.
5. Hệ thống lưu và hiển thị kết quả.

### Alternative Flows

1. Camera kết nối được nhưng chỉ hỗ trợ một phần capability.
2. Hệ thống hiển thị partial success.

### Exception Flows

1. Camera không phản hồi.

2. Hệ thống báo test thất bại.

3. Protocol không tương thích.

4. Hệ thống báo lỗi unsupported hoặc failed.

### Business Rules

* Chỉ Admin được test camera.
* Kết quả test phải phân biệt `SUCCESS`, `PARTIAL`, `FAILED`.

---

### Use Case Name

Run System Configuration Readiness Check

### Use Case ID

UC-TEST-03

### Objective

Cho phép Admin kiểm tra tổng thể mức độ sẵn sàng của cấu hình hệ thống.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Room tồn tại.

### Postconditions

* Hệ thống trả về kết quả readiness theo từng nhóm cấu hình.

### Main Flow (Happy Path)

1. Admin chọn Run Readiness Check.
2. Hệ thống kiểm tra:

   * TS-D1000 config
   * Camera config
   * Layout
   * Unit sync
   * Mapping
   * Operation mode
3. Hệ thống tổng hợp kết quả.
4. Hệ thống hiển thị:

   * Passed
   * Warning
   * Failed
5. Admin xem và tiếp tục chỉnh cấu hình nếu cần.

### Alternative Flows

1. Một số cấu hình chưa đủ nhưng không phải lỗi chặn toàn bộ.
2. Hệ thống hiển thị Warning.

### Exception Flows

1. Hệ thống không đọc được dữ liệu cấu hình.
2. Hệ thống báo lỗi readiness check thất bại.

### Business Rules

* Chỉ Admin được chạy readiness check.
* Readiness check không tự sửa dữ liệu.
* Readiness check chỉ phản ánh trạng thái hiện tại của cấu hình.

---

# Ghi chú cuối

Bộ UC trên đã cover đúng phạm vi **CRUD Cấu hình hệ thống** gồm:

* CRUD cho TS-D1000 config
* CRUD cho Camera
* CRUD cho Preset
* CRUD cho Layout/Map
* CRUD cho Mapping
* View/Update cho Operation Mode
* Test + Readiness
