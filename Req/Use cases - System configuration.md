# Use Cases - System Configuration

Dưới đây là bộ **Use Cases cho phần Cấu hình hệ thống (System Configuration)**, bám theo requirement bạn đã mô tả: cấu hình TS-D1000, camera PTZ, layout/map, mapping mic-camera, chế độ vận hành, và test kết nối. TS-D1000 có phần **browser settings** và TOA cũng mô tả việc cấu hình/điều khiển bằng trình duyệt hoặc PC/tablet, nên việc coi “Cấu hình hệ thống” là một module riêng là phù hợp với bản chất sản phẩm. ([toa-products.com][1])

# 1. List of Identified Modules

1. System Configuration
2. TS-D1000 Configuration
3. Camera Configuration
4. Layout & Map Configuration
5. Mic-Camera Mapping Configuration
6. Operation Mode Configuration
7. Connection Testing

# 2. List of Use Cases per Module

## 1. System Configuration

* UC-CONFIG-01: View System Configuration Overview

## 2. TS-D1000 Configuration

* UC-TSDCFG-01: Configure TS-D1000 Connection
* UC-TSDCFG-02: Update TS-D1000 Connection
* UC-TSDCFG-03: Load TS-D1000 Device List

## 3. Camera Configuration

* UC-CFGCAM-01: Add Camera
* UC-CFGCAM-02: Update Camera
* UC-CFGCAM-03: Deactivate Camera
* UC-CFGCAM-04: Configure Camera Preset

## 4. Layout & Map Configuration

* UC-LAYOUT-01: Upload Layout File
* UC-LAYOUT-02: Place Devices on Layout
* UC-LAYOUT-03: Add or Update Layout Annotation

## 5. Mic-Camera Mapping Configuration

* UC-MAPCFG-01: Create Mic-to-Camera Mapping
* UC-MAPCFG-02: Update Mic-to-Camera Mapping
* UC-MAPCFG-03: View Mic-to-Camera Mapping List

## 6. Operation Mode Configuration

* UC-MODE-01: Set System Operation Mode

## 7. Connection Testing

* UC-TEST-01: Test TS-D1000 Connection
* UC-TEST-02: Test Camera Connection
* UC-TEST-03: Test System Configuration Readiness

# 3. Full Detailed Use Cases

## Assumptions

1. Chỉ **Admin** được thay đổi cấu hình hệ thống.
2. **Operator** chỉ được xem cấu hình, không được sửa.
3. Một phòng họp MVP có:

   * 1 hệ TS-D1000-MU
   * 1 layout active
   * tối đa 4 camera active
4. Camera preset đã tồn tại hoặc có thể được lưu từ phần mềm trong lúc cấu hình.
5. “Xóa” camera/mapping trong MVP được hiểu là **deactivate** hoặc cập nhật inactive, không phải hard delete, vì requirement chưa nêu xóa vật lý dữ liệu.
6. Load device list từ TS-D1000 là thao tác đồng bộ dữ liệu cấu hình thiết bị từ hệ thực tế về phần mềm.
7. Mapping active là mapping được runtime engine dùng để điều khiển camera.

---

## Module: System Configuration

### Use Case Name

View System Configuration Overview

### Use Case ID

UC-CONFIG-01

### Objective

Cho phép người dùng có quyền truy cập xem tổng quan cấu hình hệ thống hiện tại của phòng họp.

### Actors

* Admin
* Operator
* System

### Preconditions

* Người dùng đã đăng nhập.
* Người dùng có quyền truy cập module cấu hình.
* Hệ thống đã có room active.

### Postconditions

* Màn hình cấu hình hiển thị trạng thái hiện tại của:

  * TS-D1000 connection
  * camera list
  * layout
  * mapping
  * operation mode

### Main Flow (Happy Path)

1. Người dùng mở module System Configuration.
2. Hệ thống kiểm tra quyền truy cập.
3. Hệ thống tải dữ liệu cấu hình hiện tại.
4. Hệ thống hiển thị:

   * thông tin kết nối TS-D1000
   * danh sách camera
   * trạng thái layout
   * danh sách mapping
   * mode vận hành

### Alternative Flows

1. Người dùng là Operator.
2. Hệ thống hiển thị dữ liệu ở chế độ view-only.

### Exception Flows

1. Người dùng không có quyền truy cập.

2. Hệ thống từ chối truy cập và hiển thị thông báo phù hợp.

3. Hệ thống không tải được dữ liệu cấu hình.

4. Hệ thống hiển thị lỗi tải dữ liệu.

### Business Rules

* Admin có quyền xem và chỉnh sửa cấu hình.
* Operator chỉ có quyền xem.
* Cấu hình hiển thị phải là cấu hình active mới nhất.

---

## Module: TS-D1000 Configuration

### Use Case Name

Configure TS-D1000 Connection

### Use Case ID

UC-TSDCFG-01

### Objective

Cho phép Admin tạo cấu hình kết nối tới hệ TS-D1000.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Chưa có cấu hình TS-D1000 cho room hiện tại, hoặc room đang cho phép tạo mới cấu hình.

### Postconditions

* Cấu hình kết nối TS-D1000 được lưu.
* Hệ thống có thể dùng cấu hình này để test kết nối và subscribe event runtime.

### Main Flow (Happy Path)

1. Admin mở phần cấu hình TS-D1000.
2. Hệ thống hiển thị form cấu hình.
3. Admin nhập:

   * base URL
   * username
   * password
   * SSE endpoint nếu có chỉnh sửa
4. Admin nhấn Save.
5. Hệ thống kiểm tra dữ liệu đầu vào.
6. Hệ thống lưu cấu hình.
7. Hệ thống thông báo lưu thành công.

### Alternative Flows

1. Admin giữ nguyên SSE endpoint mặc định.
2. Hệ thống tự dùng giá trị mặc định.

### Exception Flows

1. Base URL để trống hoặc không hợp lệ.

2. Hệ thống hiển thị lỗi validation.

3. Hệ thống không lưu được cấu hình.

4. Hệ thống hiển thị lỗi hệ thống.

### Business Rules

* Chỉ Admin được tạo cấu hình TS-D1000.
* Mỗi room chỉ có một cấu hình TS-D1000 active.
* SSE endpoint có thể dùng mặc định `/api/event` nếu requirement kỹ thuật cho phép.

---

### Use Case Name

Update TS-D1000 Connection

### Use Case ID

UC-TSDCFG-02

### Objective

Cho phép Admin cập nhật cấu hình kết nối TS-D1000 hiện có.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Đã tồn tại cấu hình TS-D1000.

### Postconditions

* Cấu hình TS-D1000 được cập nhật.

### Main Flow (Happy Path)

1. Admin mở cấu hình TS-D1000 hiện tại.
2. Hệ thống hiển thị dữ liệu đã lưu.
3. Admin chỉnh sửa thông tin cần thay đổi.
4. Admin nhấn Save.
5. Hệ thống kiểm tra dữ liệu.
6. Hệ thống cập nhật cấu hình.
7. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin chỉ thay đổi username/password.
2. Hệ thống cập nhật đúng các trường được thay đổi.

### Exception Flows

1. Cấu hình không còn tồn tại.

2. Hệ thống báo lỗi không tìm thấy dữ liệu.

3. Dữ liệu mới không hợp lệ.

4. Hệ thống báo lỗi validation.

### Business Rules

* Chỉ Admin được sửa cấu hình TS-D1000.
* Sau khi cập nhật cấu hình, hệ thống có thể yêu cầu test lại trước khi dùng runtime.

---

### Use Case Name

Load TS-D1000 Device List

### Use Case ID

UC-TSDCFG-03

### Objective

Cho phép Admin đồng bộ danh sách chairman/delegate unit từ TS-D1000 về hệ thống.

### Actors

* Admin
* System
* TS-D1000

### Preconditions

* Cấu hình kết nối TS-D1000 hợp lệ đã được lưu.
* TS-D1000 đang khả dụng.

### Postconditions

* Danh sách unit được tạo mới hoặc cập nhật trong hệ thống.

### Main Flow (Happy Path)

1. Admin chọn Load Devices.
2. Hệ thống gọi API TS-D1000 để lấy danh sách unit.
3. Hệ thống nhận dữ liệu unit.
4. Hệ thống đối chiếu với dữ liệu đang có.
5. Hệ thống tạo mới hoặc cập nhật từng unit.
6. Hệ thống hiển thị danh sách thiết bị đã đồng bộ.

### Alternative Flows

1. Một số unit đã tồn tại.
2. Hệ thống cập nhật thay vì tạo mới.

### Exception Flows

1. TS-D1000 không phản hồi.

2. Hệ thống báo lỗi đồng bộ thất bại.

3. Dữ liệu trả về không hợp lệ hoặc thiếu thông tin định danh.

4. Hệ thống bỏ qua bản ghi lỗi và ghi log phù hợp.

### Business Rules

* Unit phải được nhận diện bằng external unit ID duy nhất trong room.
* Device type phải phân biệt chairman và delegate nếu nguồn dữ liệu có trả về.
* Chỉ Admin được thực hiện sync unit list.

---

## Module: Camera Configuration

### Use Case Name

Add Camera

### Use Case ID

UC-CFGCAM-01

### Objective

Cho phép Admin thêm camera mới vào cấu hình hệ thống.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Số camera active hiện tại chưa vượt quá giới hạn MVP.

### Postconditions

* Camera mới được lưu trong hệ thống.

### Main Flow (Happy Path)

1. Admin mở Camera Configuration.
2. Admin chọn Add Camera.
3. Hệ thống hiển thị form camera.
4. Admin nhập:

   * name
   * protocol
   * IP address
   * port
   * username
   * password
   * RTSP URL nếu có
   * vendor/model nếu có
5. Admin nhấn Save.
6. Hệ thống kiểm tra dữ liệu.
7. Hệ thống lưu camera.
8. Hệ thống hiển thị camera mới trong danh sách.

### Alternative Flows

1. Admin thêm camera nhưng chưa test kết nối.
2. Hệ thống vẫn lưu camera, trạng thái test để trống hoặc chưa xác nhận.

### Exception Flows

1. Thiếu trường bắt buộc.

2. Hệ thống báo lỗi validation.

3. IP/port không hợp lệ.

4. Hệ thống báo lỗi validation.

5. Số camera active đã đạt giới hạn.

6. Hệ thống từ chối thêm mới.

### Business Rules

* Chỉ Admin được thêm camera.
* MVP hỗ trợ tối đa 4 camera active mỗi room.
* Camera protocol phải thuộc danh sách hỗ trợ.

---

### Use Case Name

Update Camera

### Use Case ID

UC-CFGCAM-02

### Objective

Cho phép Admin cập nhật cấu hình camera hiện có.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Camera đã tồn tại.

### Postconditions

* Thông tin camera được cập nhật.

### Main Flow (Happy Path)

1. Admin chọn một camera trong danh sách.
2. Hệ thống hiển thị thông tin camera.
3. Admin chỉnh sửa trường cần cập nhật.
4. Admin nhấn Save.
5. Hệ thống kiểm tra dữ liệu.
6. Hệ thống cập nhật camera.
7. Hệ thống hiển thị thông báo thành công.

### Alternative Flows

1. Admin chỉ cập nhật RTSP URL hoặc credentials.
2. Hệ thống chỉ lưu các trường thay đổi.

### Exception Flows

1. Camera không tồn tại.

2. Hệ thống báo lỗi không tìm thấy camera.

3. Dữ liệu cập nhật không hợp lệ.

4. Hệ thống báo lỗi validation.

### Business Rules

* Chỉ Admin được sửa camera.
* Cập nhật camera không tự động cập nhật mapping, trừ khi mapping bị invalid bởi thay đổi dữ liệu liên quan.

---

### Use Case Name

Deactivate Camera

### Use Case ID

UC-CFGCAM-03

### Objective

Cho phép Admin vô hiệu hóa một camera khỏi cấu hình active của hệ thống.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Camera tồn tại và đang active.

### Postconditions

* Camera được chuyển sang inactive.
* Camera không còn được dùng cho runtime nếu hệ thống chỉ dùng camera active.

### Main Flow (Happy Path)

1. Admin chọn camera.
2. Admin chọn Deactivate.
3. Hệ thống yêu cầu xác nhận.
4. Admin xác nhận.
5. Hệ thống cập nhật trạng thái camera thành inactive.
6. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin hủy xác nhận.
2. Hệ thống không thay đổi dữ liệu.

### Exception Flows

1. Camera không tồn tại hoặc đã inactive.
2. Hệ thống báo lỗi trạng thái không hợp lệ.

### Business Rules

* Chỉ Admin được deactivate camera.
* Camera inactive không được dùng cho mapping runtime active.
* Nếu camera đang được dùng trong mapping active, hệ thống phải cảnh báo trước khi deactivate.

---

### Use Case Name

Configure Camera Preset

### Use Case ID

UC-CFGCAM-04

### Objective

Cho phép Admin tạo hoặc cập nhật preset cho camera.

### Actors

* Admin
* System
* Camera PTZ

### Preconditions

* Camera đã tồn tại.
* Camera hỗ trợ preset hoặc cơ chế preset tương đương.

### Postconditions

* Preset được lưu và sẵn sàng dùng trong mapping.

### Main Flow (Happy Path)

1. Admin chọn camera.
2. Admin mở màn hình preset.
3. Admin điều khiển camera tới vị trí mong muốn hoặc chọn preset hiện có.
4. Admin nhập preset code và preset name.
5. Admin nhấn Save Preset.
6. Hệ thống lưu preset.
7. Hệ thống hiển thị preset trong danh sách.

### Alternative Flows

1. Admin cập nhật preset hiện có.
2. Hệ thống ghi đè hoặc cập nhật dữ liệu preset theo logic được hỗ trợ.

### Exception Flows

1. Camera không hỗ trợ preset.

2. Hệ thống báo lỗi không hỗ trợ.

3. Preset code trùng trong cùng camera.

4. Hệ thống báo lỗi unique constraint.

### Business Rules

* Preset phải thuộc một camera cụ thể.
* Preset code phải duy nhất trong phạm vi camera.
* Chỉ Admin được cấu hình preset.

---

## Module: Layout & Map Configuration

### Use Case Name

Upload Layout File

### Use Case ID

UC-LAYOUT-01

### Objective

Cho phép Admin upload file layout phòng họp làm nền cho map cấu hình và giám sát.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.

### Postconditions

* Layout file được lưu và gắn với room hiện tại.

### Main Flow (Happy Path)

1. Admin mở phần Layout Configuration.
2. Admin chọn Upload Layout.
3. Admin chọn file PDF hoặc JPG.
4. Hệ thống kiểm tra định dạng file.
5. Hệ thống upload và lưu file.
6. Hệ thống hiển thị layout vừa upload.

### Alternative Flows

1. Room đã có layout active.
2. Hệ thống yêu cầu xác nhận thay thế layout cũ.
3. Admin xác nhận.
4. Hệ thống cập nhật layout mới.

### Exception Flows

1. File không đúng định dạng.

2. Hệ thống từ chối upload.

3. Upload thất bại do lỗi hệ thống.

4. Hệ thống hiển thị lỗi phù hợp.

### Business Rules

* Chỉ Admin được upload layout.
* Layout chỉ chấp nhận PDF hoặc JPG/JPEG.
* Mỗi room chỉ có một layout active.

---

### Use Case Name

Place Devices on Layout

### Use Case ID

UC-LAYOUT-02

### Objective

Cho phép Admin kéo-thả thiết bị TS-D1000 và camera lên vị trí tương ứng trên layout.

### Actors

* Admin
* System

### Preconditions

* Layout đã tồn tại.
* Danh sách device và camera đã có.

### Postconditions

* Vị trí hiển thị của các thiết bị được lưu.

### Main Flow (Happy Path)

1. Admin mở layout editor.
2. Hệ thống hiển thị layout và danh sách thiết bị chưa đặt vị trí.
3. Admin kéo-thả từng mic/camera lên layout.
4. Admin điều chỉnh vị trí theo nhu cầu.
5. Admin nhấn Save.
6. Hệ thống lưu tọa độ các thiết bị.

### Alternative Flows

1. Admin sửa vị trí thiết bị đã đặt trước đó.
2. Hệ thống cập nhật tọa độ mới.

### Exception Flows

1. Layout chưa tồn tại.

2. Hệ thống không cho phép chỉnh sửa vị trí.

3. Thiết bị tham chiếu không tồn tại.

4. Hệ thống từ chối lưu vị trí.

### Business Rules

* Chỉ Admin được chỉnh sửa vị trí thiết bị.
* `posX`, `posY` phải thuộc phạm vi hợp lệ của layout.
* Mỗi refType + refId chỉ có một vị trí active trên layout.

---

### Use Case Name

Add or Update Layout Annotation

### Use Case ID

UC-LAYOUT-03

### Objective

Cho phép Admin thêm hoặc cập nhật chú thích trên layout.

### Actors

* Admin
* System

### Preconditions

* Layout đã tồn tại.

### Postconditions

* Annotation được lưu hoặc cập nhật.

### Main Flow (Happy Path)

1. Admin chọn Add Annotation.
2. Admin nhập nội dung chú thích.
3. Admin đặt vị trí chú thích trên layout.
4. Admin nhấn Save.
5. Hệ thống lưu annotation.

### Alternative Flows

1. Admin chọn annotation có sẵn để cập nhật.
2. Hệ thống hiển thị dữ liệu cũ.
3. Admin chỉnh sửa và lưu lại.

### Exception Flows

1. Nội dung chú thích rỗng.

2. Hệ thống báo lỗi validation.

3. Vị trí annotation không hợp lệ.

4. Hệ thống báo lỗi validation.

### Business Rules

* Chỉ Admin được quản lý annotation.
* Annotation phải gắn với vị trí cụ thể trên layout.

---

## Module: Mic-Camera Mapping Configuration

### Use Case Name

Create Mic-to-Camera Mapping

### Use Case ID

UC-MAPCFG-01

### Objective

Cho phép Admin tạo mapping giữa một mic TS-D1000 với một camera preset.

### Actors

* Admin
* System

### Preconditions

* Unit đã tồn tại.
* Camera đã tồn tại.
* Preset đã tồn tại.
* Dữ liệu cùng thuộc room hiện tại.

### Postconditions

* Mapping active được lưu.

### Main Flow (Happy Path)

1. Admin mở màn hình Mapping.
2. Admin chọn unit.
3. Admin chọn camera.
4. Admin chọn preset tương ứng.
5. Admin nhấn Save.
6. Hệ thống kiểm tra tính hợp lệ dữ liệu.
7. Hệ thống lưu mapping.
8. Hệ thống hiển thị mapping mới trong danh sách.

### Alternative Flows

1. Một camera được dùng cho nhiều unit với các preset khác nhau.
2. Hệ thống cho phép lưu nếu từng mapping đều hợp lệ.

### Exception Flows

1. Unit không tồn tại.

2. Hệ thống báo lỗi validation.

3. Camera không tồn tại.

4. Hệ thống báo lỗi validation.

5. Preset không thuộc camera đã chọn.

6. Hệ thống báo lỗi validation.

7. Unit đã có mapping active khác.

8. Hệ thống từ chối hoặc yêu cầu cập nhật mapping cũ theo rule triển khai.

### Business Rules

* Mỗi unit chỉ có một mapping active tại một thời điểm.
* Preset phải thuộc camera được chọn.
* Chỉ Admin được tạo mapping.

---

### Use Case Name

Update Mic-to-Camera Mapping

### Use Case ID

UC-MAPCFG-02

### Objective

Cho phép Admin cập nhật mapping mic-camera hiện có.

### Actors

* Admin
* System

### Preconditions

* Mapping đã tồn tại.

### Postconditions

* Mapping được cập nhật.

### Main Flow (Happy Path)

1. Admin chọn mapping hiện có.
2. Hệ thống hiển thị dữ liệu mapping.
3. Admin thay đổi camera hoặc preset.
4. Admin nhấn Save.
5. Hệ thống kiểm tra dữ liệu.
6. Hệ thống cập nhật mapping.
7. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin chỉ đổi preset.
2. Hệ thống chỉ cập nhật trường liên quan.

### Exception Flows

1. Mapping không tồn tại.

2. Hệ thống báo lỗi không tìm thấy.

3. Preset mới không thuộc camera mới.

4. Hệ thống báo lỗi validation.

### Business Rules

* Chỉ Admin được sửa mapping.
* Sau khi cập nhật mapping, runtime phải dùng mapping active mới nhất.

---

### Use Case Name

View Mic-to-Camera Mapping List

### Use Case ID

UC-MAPCFG-03

### Objective

Cho phép người dùng có quyền xem danh sách mapping hiện tại.

### Actors

* Admin
* Operator
* System

### Preconditions

* Người dùng đã đăng nhập.
* Hệ thống có dữ liệu mapping hoặc có thể trả danh sách rỗng.

### Postconditions

* Danh sách mapping được hiển thị.

### Main Flow (Happy Path)

1. Người dùng mở màn hình Mapping List.
2. Hệ thống kiểm tra quyền truy cập.
3. Hệ thống tải danh sách mapping.
4. Hệ thống hiển thị:

   * unit
   * camera
   * preset
   * trạng thái active

### Alternative Flows

1. Người dùng là Operator.
2. Hệ thống hiển thị ở chế độ read-only.

### Exception Flows

1. Hệ thống không tải được dữ liệu.
2. Hệ thống hiển thị lỗi tải dữ liệu.

### Business Rules

* Admin có thể xem và sửa.
* Operator chỉ được xem.

---

## Module: Operation Mode Configuration

### Use Case Name

Set System Operation Mode

### Use Case ID

UC-MODE-01

### Objective

Cho phép Admin chọn chế độ vận hành của hệ thống là Manual hoặc Automatic.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Room hiện tại tồn tại.

### Postconditions

* Operation mode được lưu và trở thành mode active của room.

### Main Flow (Happy Path)

1. Admin mở phần Operation Mode.
2. Hệ thống hiển thị mode hiện tại.
3. Admin chọn mode mới:

   * MANUAL
   * AUTOMATIC
4. Admin nhấn Save.
5. Hệ thống kiểm tra dữ liệu.
6. Hệ thống cập nhật operation mode.
7. Hệ thống thông báo thành công.

### Alternative Flows

1. Admin chọn lại chính mode hiện tại.
2. Hệ thống có thể lưu no-op hoặc chỉ thông báo không có thay đổi.

### Exception Flows

1. Mode gửi lên không hợp lệ.

2. Hệ thống báo lỗi validation.

3. Hệ thống không cập nhật được dữ liệu.

4. Hệ thống hiển thị lỗi hệ thống.

### Business Rules

* Chỉ một mode được active tại một thời điểm.
* Manual mode và Automatic mode chi phối runtime behavior của speaking request và camera trigger.
* Chỉ Admin được thay đổi mode.

---

## Module: Connection Testing

### Use Case Name

Test TS-D1000 Connection

### Use Case ID

UC-TEST-01

### Objective

Cho phép Admin kiểm tra khả năng kết nối tới TS-D1000 bằng cấu hình hiện tại.

### Actors

* Admin
* System
* TS-D1000

### Preconditions

* Cấu hình TS-D1000 đã được lưu.

### Postconditions

* Kết quả test được hiển thị và lưu nếu hệ thống hỗ trợ lưu history/status gần nhất.

### Main Flow (Happy Path)

1. Admin chọn Test Connection trong phần TS-D1000.
2. Hệ thống dùng cấu hình hiện tại để gọi endpoint kiểm tra.
3. Hệ thống nhận phản hồi thành công.
4. Hệ thống cập nhật kết quả test gần nhất.
5. Hệ thống hiển thị `Connection successful`.

### Alternative Flows

1. Kết nối thành công nhưng chưa subscribe runtime SSE ở bước này.
2. Hệ thống vẫn đánh dấu test kết nối thành công.

### Exception Flows

1. TS-D1000 không phản hồi.

2. Hệ thống hiển thị `Connection failed`.

3. Sai credential hoặc endpoint không hợp lệ.

4. Hệ thống hiển thị lỗi phù hợp.

### Business Rules

* Chỉ Admin được test kết nối TS-D1000.
* Test connection không tự thay đổi operation mode hay mapping.

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

* Camera đã được cấu hình.

### Postconditions

* Kết quả test được hiển thị.
* Capability camera có thể được cập nhật nếu hệ thống thiết kế theo hướng capability detection.

### Main Flow (Happy Path)

1. Admin chọn một camera.
2. Admin nhấn Test Connection.
3. Hệ thống dùng protocol và credential hiện tại để kiểm tra kết nối.
4. Hệ thống nhận phản hồi từ camera.
5. Hệ thống xác định các khả năng hỗ trợ nếu có:

   * PTZ
   * Preset
   * Stream
6. Hệ thống hiển thị kết quả thành công.

### Alternative Flows

1. Camera kết nối được nhưng chỉ hỗ trợ một phần tính năng.
2. Hệ thống hiển thị trạng thái partial success.

### Exception Flows

1. Camera không phản hồi.

2. Hệ thống hiển thị lỗi kết nối.

3. Credential không đúng.

4. Hệ thống hiển thị lỗi xác thực.

5. Protocol không tương thích với camera.

6. Hệ thống hiển thị lỗi hoặc unsupported.

### Business Rules

* Chỉ Admin được test camera.
* Test camera phải phân biệt kết nối thành công hoàn toàn và thành công một phần nếu capability không đầy đủ.

---

### Use Case Name

Test System Configuration Readiness

### Use Case ID

UC-TEST-03

### Objective

Cho phép Admin kiểm tra tổng thể mức độ sẵn sàng vận hành của cấu hình hệ thống.

### Actors

* Admin
* System

### Preconditions

* Admin đã đăng nhập.
* Room có dữ liệu cấu hình tối thiểu.

### Postconditions

* Hệ thống trả về kết quả readiness theo từng nhóm cấu hình.

### Main Flow (Happy Path)

1. Admin chọn Test System Readiness.
2. Hệ thống kiểm tra:

   * TS-D1000 connection config tồn tại
   * camera config tồn tại
   * layout tồn tại
   * unit list đã sync
   * mapping hợp lệ
   * operation mode đã được chọn
3. Hệ thống tổng hợp kết quả.
4. Hệ thống hiển thị các mục:

   * Passed
   * Warning
   * Failed
5. Admin xem kết quả và tiếp tục cấu hình nếu cần.

### Alternative Flows

1. Một số cấu hình chưa đủ nhưng không chặn toàn bộ hệ thống.
2. Hệ thống hiển thị warning thay vì failed cho các mục không bắt buộc theo runtime thực tế.

### Exception Flows

1. Hệ thống không đọc được một phần dữ liệu cấu hình.
2. Hệ thống hiển thị lỗi kiểm tra readiness.

### Business Rules

* Chỉ Admin được chạy readiness check.
* Readiness check không tự sửa dữ liệu.
* Readiness check chỉ phản ánh trạng thái cấu hình hiện tại.

---

[1]: https://www.toa-products.com/international/products/ts-d1000-series.html "TS-D1000 Series - Conference Systems - TOA Electronics"
