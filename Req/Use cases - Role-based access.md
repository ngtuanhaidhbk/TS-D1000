# Assumptions

Các điểm sau chưa được mô tả đầy đủ trong requirement gốc, nên được ghi rõ là giả định để hoàn thiện UC:

1. Hệ thống có 2 role:

   * **Admin**
   * **Operator**
2. Authentication dùng **username + password**.
3. Chỉ user có trạng thái **ACTIVE** mới được đăng nhập.
4. Sau khi login thành công, hệ thống xác định role và cấp quyền truy cập giao diện/chức năng tương ứng.
5. Logout áp dụng cho **phiên hiện tại** của user.
6. Chưa bao gồm các chức năng:

   * forgot password
   * reset password
   * change password
   * MFA
   * SSO
7. Hệ thống có kiểm tra **role-based access** sau đăng nhập khi user truy cập các màn hình/chức năng/API được bảo vệ.

---

# 1. List of Identified Modules

1. Authentication
2. Authorization / Role-Based Access

---

# 2. List of Use Cases per Module

## Authentication

* UC-AUTH-01: Login
* UC-AUTH-02: Logout
* UC-AUTH-03: Get Current Authenticated User

## Authorization / Role-Based Access

* UC-AUTHZ-01: Authorize Access to Protected Resource
* UC-AUTHZ-02: Restrict Access by Role
* UC-AUTHZ-03: Handle Session Expired or Invalid Session

---

# 3. Full Detailed Use Cases

---

## Module: Authentication

### Use Case Name

Login

### Use Case ID

UC-AUTH-01

### Objective

Cho phép người dùng đăng nhập vào hệ thống bằng tài khoản hợp lệ và nạp đúng role để sử dụng hệ thống theo quyền được cấp.

### Actors

* Admin
* Operator
* System

### Preconditions

* Người dùng đã có tài khoản trong hệ thống.
* Tài khoản có username và password hợp lệ.
* Tài khoản đang ở trạng thái `ACTIVE`.
* Ứng dụng đang hoạt động.

### Postconditions

* Người dùng đăng nhập thành công.
* Hệ thống tạo phiên đăng nhập hợp lệ.
* Hệ thống xác định role của người dùng.
* Người dùng được chuyển vào giao diện chính với quyền phù hợp.

### Main Flow (Happy Path)

1. Người dùng mở ứng dụng.
2. Hệ thống hiển thị màn hình đăng nhập.
3. Người dùng nhập username.
4. Người dùng nhập password.
5. Người dùng nhấn Login.
6. Hệ thống kiểm tra tính hợp lệ của dữ liệu đầu vào.
7. Hệ thống tìm tài khoản theo username.
8. Hệ thống kiểm tra password.
9. Hệ thống kiểm tra trạng thái user là `ACTIVE`.
10. Hệ thống tạo phiên đăng nhập.
11. Hệ thống xác định role của user.
12. Hệ thống trả về thông tin đăng nhập thành công.
13. Hệ thống chuyển người dùng vào màn hình chính.
14. Hệ thống chỉ hiển thị các menu/chức năng phù hợp với role của người dùng.

### Alternative Flows

1. Người dùng nhập username có khoảng trắng đầu/cuối.

2. Hệ thống tự động trim dữ liệu trước khi kiểm tra.

3. Người dùng nhấn Enter thay vì click Login.

4. Hệ thống xử lý như thao tác nhấn Login.

### Exception Flows

1. Username để trống.

2. Hệ thống hiển thị lỗi validation: `Username is required`.

3. Password để trống.

4. Hệ thống hiển thị lỗi validation: `Password is required`.

5. Username không tồn tại.

6. Hệ thống từ chối đăng nhập và hiển thị lỗi: `Invalid username or password`.

7. Password không đúng.

8. Hệ thống từ chối đăng nhập và hiển thị lỗi: `Invalid username or password`.

9. Tài khoản ở trạng thái `INACTIVE`.

10. Hệ thống từ chối đăng nhập và hiển thị lỗi: `User account is inactive`.

11. Hệ thống không thể tạo phiên đăng nhập.

12. Hệ thống hiển thị lỗi hệ thống và không cho đăng nhập.

### Business Rules

* Chỉ user có trạng thái `ACTIVE` mới được đăng nhập.
* Hệ thống không phân biệt rõ username sai hay password sai trong thông báo lỗi đăng nhập.
* Sau khi login thành công, hệ thống phải nạp role của user.
* Role quyết định quyền truy cập chức năng và giao diện sau đăng nhập.
* Login thành công phải được ghi audit log.
* Login thất bại phải được ghi audit log theo chính sách logging của hệ thống.

---

### Use Case Name

Logout

### Use Case ID

UC-AUTH-02

### Objective

Cho phép người dùng kết thúc phiên đăng nhập hiện tại một cách an toàn.

### Actors

* Admin
* Operator
* System

### Preconditions

* Người dùng đang đăng nhập.
* Phiên đăng nhập hiện tại còn hiệu lực.

### Postconditions

* Phiên đăng nhập hiện tại bị vô hiệu hóa.
* Người dùng không thể tiếp tục truy cập tài nguyên được bảo vệ bằng phiên cũ.
* Hệ thống chuyển người dùng về màn hình đăng nhập.

### Main Flow (Happy Path)

1. Người dùng đang ở trong hệ thống.
2. Người dùng chọn Logout.
3. Hệ thống yêu cầu xác nhận logout nếu UI có dialog xác nhận.
4. Người dùng xác nhận logout.
5. Hệ thống vô hiệu hóa phiên hiện tại.
6. Hệ thống xóa trạng thái xác thực phía client.
7. Hệ thống chuyển người dùng về màn hình đăng nhập.

### Alternative Flows

1. Người dùng chọn Logout nhưng hủy xác nhận.
2. Hệ thống giữ nguyên phiên hiện tại.
3. Người dùng tiếp tục sử dụng hệ thống.

### Exception Flows

1. Phiên hiện tại đã hết hạn hoặc đã bị vô hiệu hóa trước đó.

2. Hệ thống trả lỗi unauthorized.

3. Phía client vẫn phải xóa local auth state và quay về màn hình đăng nhập.

4. Hệ thống gặp lỗi khi xử lý logout.

5. Hệ thống hiển thị lỗi hệ thống.

6. Phía client phải xử lý an toàn bằng cách xóa token/session local.

### Business Rules

* Logout chỉ áp dụng cho phiên hiện tại.
* Sau logout, người dùng phải đăng nhập lại để tiếp tục sử dụng hệ thống.
* Logout thành công phải được ghi audit log.

---

### Use Case Name

Get Current Authenticated User

### Use Case ID

UC-AUTH-03

### Objective

Cho phép hệ thống hoặc frontend lấy thông tin user hiện tại và role của họ từ phiên đăng nhập hợp lệ.

### Actors

* Admin
* Operator
* System

### Preconditions

* Người dùng đã đăng nhập.
* Phiên hiện tại hợp lệ.

### Postconditions

* Hệ thống trả về thông tin user hiện tại.
* Frontend biết được role để render giao diện phù hợp.

### Main Flow (Happy Path)

1. Ứng dụng gửi request lấy thông tin user hiện tại.
2. Hệ thống kiểm tra token/session.
3. Hệ thống xác định user tương ứng.
4. Hệ thống kiểm tra user còn `ACTIVE`.
5. Hệ thống trả về:

   * user id
   * username
   * role
   * status
   * session expiry (nếu có)

### Alternative Flows

1. Frontend gọi API này ngay sau login để bootstrap app.
2. Hệ thống xử lý như bình thường.

### Exception Flows

1. Token không hợp lệ.

2. Hệ thống trả `401 Unauthorized`.

3. Session đã hết hạn.

4. Hệ thống trả `401 Session expired`.

5. User đã bị chuyển sang `INACTIVE` sau khi login.

6. Hệ thống trả `403 User inactive`.

### Business Rules

* Chỉ phiên đăng nhập hợp lệ mới được lấy current user.
* Thông tin role phải luôn được trả về để UI áp dụng role-based access.
* Nếu user không còn active, hệ thống phải chặn truy cập tiếp theo.

---

## Module: Authorization / Role-Based Access

### Use Case Name

Authorize Access to Protected Resource

### Use Case ID

UC-AUTHZ-01

### Objective

Cho phép hệ thống xác thực và cấp quyền truy cập vào tài nguyên được bảo vệ cho người dùng đã đăng nhập hợp lệ.

### Actors

* System

### Preconditions

* Request được gửi tới một tài nguyên hoặc chức năng được bảo vệ.
* Request có thông tin xác thực đi kèm.

### Postconditions

* Nếu hợp lệ, request được phép đi tiếp.
* Nếu không hợp lệ, request bị từ chối.

### Main Flow (Happy Path)

1. Người dùng gửi request tới tài nguyên được bảo vệ.
2. Hệ thống kiểm tra sự tồn tại của token/session.
3. Hệ thống kiểm tra tính hợp lệ của token/session.
4. Hệ thống xác định user từ session.
5. Hệ thống kiểm tra user còn `ACTIVE`.
6. Hệ thống gắn auth context vào request:

   * user id
   * role
   * session id
7. Hệ thống cho phép request đi tiếp tới business logic.

### Alternative Flows

1. Tài nguyên không yêu cầu xác thực.
2. Hệ thống bỏ qua bước authorize và cho phép truy cập.

### Exception Flows

1. Không có token/session.

2. Hệ thống trả `401 Unauthorized`.

3. Token sai định dạng hoặc không hợp lệ.

4. Hệ thống trả `401 Unauthorized`.

5. Session đã bị revoke hoặc expired.

6. Hệ thống trả `401 Unauthorized`.

7. User không còn tồn tại hoặc bị inactive.

8. Hệ thống trả `403 Forbidden` hoặc `401` theo chính sách bảo mật.

### Business Rules

* Mọi tài nguyên protected phải đi qua authorization check.
* Chỉ session hợp lệ và user active mới được truy cập tài nguyên protected.
* Authorization check phải được thực hiện trước business logic của endpoint.

---

### Use Case Name

Restrict Access by Role

### Use Case ID

UC-AUTHZ-02

### Objective

Cho phép hệ thống giới hạn quyền truy cập chức năng và tài nguyên theo role của người dùng.

### Actors

* Admin
* Operator
* System

### Preconditions

* Người dùng đã đăng nhập thành công.
* Hệ thống đã xác định role của user.
* Người dùng đang truy cập một chức năng có yêu cầu role cụ thể.

### Postconditions

* Người dùng được phép hoặc bị từ chối truy cập theo role.
* UI và backend cùng áp dụng cùng một logic phân quyền.

### Main Flow (Happy Path)

1. Người dùng truy cập một chức năng hoặc API được bảo vệ theo role.
2. Hệ thống xác định role của người dùng hiện tại.
3. Hệ thống so sánh role với permission yêu cầu của chức năng/API.
4. Nếu role phù hợp:

   * hệ thống cho phép truy cập
   * frontend hiển thị chức năng tương ứng
5. Người dùng thực hiện chức năng thành công.

### Alternative Flows

1. User là Admin truy cập chức năng dành cho Admin.

2. Hệ thống cho phép truy cập.

3. User là Operator truy cập chức năng dành cho cả Admin và Operator.

4. Hệ thống cho phép truy cập.

### Exception Flows

1. Operator truy cập chức năng chỉ dành cho Admin.

2. Hệ thống từ chối truy cập.

3. Hệ thống trả `403 Forbidden`.

4. Frontend hiển thị thông báo `You do not have permission to access this resource`.

5. Frontend hiển thị nhầm chức năng do state cũ, nhưng backend vẫn phải chặn nếu role không hợp lệ.

6. Request bị từ chối ở backend.

### Business Rules

* Admin có full access theo phạm vi hệ thống hiện tại.
* Operator chỉ được truy cập các chức năng được cấp phép.
* Role-based access phải được kiểm tra ở backend, không chỉ ở UI.
* UI phải ẩn hoặc disable chức năng không phù hợp với role để giảm thao tác sai, nhưng backend vẫn là nguồn kiểm tra cuối cùng.

---

### Use Case Name

Handle Session Expired or Invalid Session

### Use Case ID

UC-AUTHZ-03

### Objective

Cho phép hệ thống xử lý đúng khi session hết hạn, bị revoke, hoặc token không còn hợp lệ.

### Actors

* Admin
* Operator
* System

### Preconditions

* Người dùng từng đăng nhập trước đó.
* Người dùng gửi request với session/token không còn hợp lệ.

### Postconditions

* Hệ thống từ chối request không hợp lệ.
* Người dùng bị chuyển về trạng thái chưa đăng nhập.
* Frontend yêu cầu người dùng đăng nhập lại.

### Main Flow (Happy Path)

1. Người dùng gửi request tới API protected.
2. Hệ thống phát hiện session/token không còn hợp lệ.
3. Hệ thống trả lỗi unauthorized.
4. Frontend nhận lỗi auth.
5. Frontend xóa auth state local.
6. Frontend chuyển người dùng về màn hình login.
7. Frontend hiển thị thông báo phù hợp, ví dụ:

   * `Session expired. Please login again.`

### Alternative Flows

1. Session bị revoke do logout trước đó.
2. Frontend xử lý giống expired session.

### Exception Flows

1. Frontend không xử lý lỗi auth đúng cách.
2. Người dùng có thể thấy lỗi gọi API lặp lại cho đến khi reload hoặc redirect.
3. Đây là lỗi implementation frontend cần tránh.

### Business Rules

* Session/token không hợp lệ không được phép truy cập protected resource.
* Khi session hết hạn hoặc không hợp lệ, hệ thống phải yêu cầu đăng nhập lại.
* Frontend phải xóa local auth state khi gặp lỗi auth không thể phục hồi.

---

# Summary of Role-Based Access Coverage

## Roles

* **Admin**
* **Operator**

## Authentication Coverage

* Login
* Logout
* Current user bootstrap
* Protected resource authorization
* Role-based restriction
* Expired/invalid session handling

## Role-Based Behavior

* **Admin**

  * được truy cập tất cả chức năng trong phạm vi hệ thống hiện tại
* **Operator**

  * chỉ được truy cập các chức năng được cấp quyền
* Backend là lớp kiểm tra quyền cuối cùng
* Frontend render theo role để giảm thao tác sai

---

Nếu bạn muốn, mình có thể làm tiếp ngay bản **Use Cases cho User Management với Role-Based Access** theo cùng format này.
