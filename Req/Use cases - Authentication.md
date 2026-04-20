# Use Cases - Authentication

## Assumptions

1. He thong dung `local account`, khong co SSO/LDAP/OAuth trong MVP.
2. Co 2 vai tro: `ADMIN`, `OPERATOR`.
3. Chi user co `status = ACTIVE` moi dang nhap duoc.
4. Sau login thanh cong, backend cap access token va tao session.
5. Logout se vo hieu hoa session hien tai.
6. Co API ho tro lay auth context hien tai la `GET /auth/me`.
7. Chua bao gom:
   - forgot password
   - reset password
   - change password
   - MFA
   - concurrent session management nang cao

## List Of Identified Modules

1. Authentication

## List Of Use Cases Per Module

### Authentication

- `UC-AUTH-01`: Login
- `UC-AUTH-02`: Logout
- `UC-AUTH-03`: Get Current Auth Context
- `UC-AUTH-04`: Validate Protected Request Session

## Full Detailed Use Cases

## Module: Authentication

### Use Case Name

Login

### Use Case ID

`UC-AUTH-01`

### Objective

Cho phep nguoi dung dang nhap vao he thong bang `username + password`, dong thoi nap dung quyen theo vai tro.

### Actors

- Admin
- Operator

### Preconditions

- Ung dung dang chay.
- Nguoi dung da co tai khoan.
- Backend auth service hoat dong.
- Du lieu user truy cap duoc.

### Postconditions

- Nguoi dung dang nhap thanh cong.
- Access token duoc cap.
- Session moi duoc tao.
- Quyen truy cap duoc nap theo role.

### Main Flow (Happy Path)

1. Nguoi dung mo ung dung.
2. He thong hien thi man hinh dang nhap.
3. Nguoi dung nhap `username`.
4. Nguoi dung nhap `password`.
5. Nguoi dung nhan `Login`.
6. He thong kiem tra du lieu dau vao.
7. He thong tim user theo `username`.
8. He thong kiem tra trang thai tai khoan.
9. He thong xac thuc password.
10. He thong tao session moi.
11. He thong cap access token.
12. He thong tra ve thong tin user va token.
13. He thong chuyen nguoi dung toi man hinh chinh.

### Alternative Flows

1. Username co khoang trang dau/cuoi.
2. He thong tu trim truoc khi xac thuc.

1. Nguoi dung nhan Enter thay vi click Login.
2. He thong submit form tuong duong.

### Exception Flows

1. `username` trong.
2. He thong hien thi loi `Username is required`.

1. `password` trong.
2. He thong hien thi loi `Password is required`.

1. `username` khong ton tai.
2. He thong tu choi dang nhap.
3. He thong hien thi loi `Invalid username or password`.

1. Password sai.
2. He thong tu choi dang nhap.
3. He thong hien thi loi `Invalid username or password`.

1. User ton tai nhung `status = INACTIVE`.
2. He thong tu choi dang nhap.
3. He thong hien thi loi `User account is inactive`.

1. Khong truy cap duoc du lieu user hoac khong tao duoc session/token.
2. He thong hien thi loi he thong.
3. Khong cho dang nhap.

### Business Rules

- Chi user `ACTIVE` moi duoc phep login.
- Khong phan biet loi username sai va password sai o response.
- Moi lan login tao mot session moi.
- Sau login thanh cong, he thong phai nap role cua user.
- Access token phai gan voi session hien tai.

### Use Case Name

Logout

### Use Case ID

`UC-AUTH-02`

### Objective

Cho phep nguoi dung dang xuat khoi he thong an toan bang cach ket thuc session hien tai.

### Actors

- Admin
- Operator

### Preconditions

- Nguoi dung dang dang nhap.
- Session hien tai con hieu luc.

### Postconditions

- Session hien tai bi vo hieu hoa.
- Token phia client bi xoa.
- He thong quay ve man hinh login.

### Main Flow (Happy Path)

1. Nguoi dung mo menu tai khoan.
2. Nguoi dung chon `Logout`.
3. He thong hien thi hop thoai xac nhan.
4. Nguoi dung xac nhan logout.
5. He thong goi API logout.
6. Backend revoke session hien tai.
7. He thong xoa auth state phia client.
8. He thong chuyen ve man hinh login.

### Alternative Flows

1. Nguoi dung chon `Cancel` tai hop thoai xac nhan.
2. He thong dong dialog.
3. Nguoi dung van o man hinh hien tai.

### Exception Flows

1. Token thieu hoac khong hop le khi goi logout.
2. Backend tra loi auth.
3. Frontend van xoa local auth state.
4. He thong van quay ve man hinh login.

1. Session da het han hoac da bi revoke truoc do.
2. Backend tra loi auth tuong ung.
3. Frontend van coi logout la hoan tat ve mat UX.

1. Backend loi he thong khi logout.
2. Frontend van xoa local auth state de tranh giu session gia.

### Business Rules

- Logout chi ap dung cho session hien tai.
- Sau logout, user phai dang nhap lai de tiep tuc.
- O muc UX, logout phai an toan ke ca khi backend tra loi auth cho session khong con hop le.

### Use Case Name

Get Current Auth Context

### Use Case ID

`UC-AUTH-03`

### Objective

Cho phep frontend lay thong tin nguoi dung va session hien tai de bootstrap ung dung va bao ve route.

### Actors

- Admin
- Operator
- System

### Preconditions

- Client dang co token.
- Request duoc gui toi protected API.

### Postconditions

- Neu hop le, auth context hien tai duoc tra ve.
- Neu khong hop le, client phai coi session la khong con hieu luc.

### Main Flow (Happy Path)

1. Frontend khoi dong hoac refresh ung dung.
2. Frontend doc token da luu.
3. Frontend goi `GET /auth/me`.
4. Backend xac thuc token.
5. Backend kiem tra session hien tai.
6. Backend kiem tra trang thai user.
7. Backend tra ve user context va session context.
8. Frontend nap thong tin user.
9. Frontend render app shell theo role.

### Alternative Flows

1. Khong co token trong local storage.
2. Frontend khong goi API.
3. Frontend hien thi man hinh login.

### Exception Flows

1. Token khong hop le.
2. Backend tra `401 UNAUTHORIZED`.
3. Frontend xoa auth state.
4. Frontend chuyen ve login.

1. Session het han.
2. Backend tra `401 SESSION_EXPIRED`.
3. Frontend hien thi thong bao `Session expired. Please login again.`
4. Frontend chuyen ve login.

1. User bi chuyen sang `INACTIVE` sau khi da login.
2. Backend tra `403 USER_INACTIVE`.
3. Frontend xoa auth state va quay ve login.

### Business Rules

- Protected bootstrap chi thanh cong khi token hop le, session active, va user active.
- Ket qua `/auth/me` la nguon su that cho auth state phia frontend sau refresh.

### Use Case Name

Validate Protected Request Session

### Use Case ID

`UC-AUTH-04`

### Objective

Cho phep he thong kiem tra moi request protected truoc khi cho phep truy cap tai nguyen.

### Actors

- System

### Preconditions

- Co request toi protected endpoint.
- Endpoint khong phai public.

### Postconditions

- Request duoc phep di tiep neu auth hop le.
- Request bi chan neu token/session/user khong hop le.

### Main Flow (Happy Path)

1. Client gui request toi protected API.
2. He thong doc header `Authorization`.
3. He thong parse Bearer token.
4. He thong verify signature token.
5. He thong kiem tra han token.
6. He thong doc session theo `session_id`.
7. He thong kiem tra session dang `ACTIVE`.
8. He thong doc user theo `user_id`.
9. He thong kiem tra user dang `ACTIVE`.
10. He thong gan auth context vao request.
11. Request duoc xu ly tiep.

### Alternative Flows

1. Endpoint duoc danh dau public.
2. He thong bo qua auth guard.
3. Request di tiep ma khong can token.

### Exception Flows

1. Header `Authorization` thieu.
2. He thong chan request.
3. Tra `401 UNAUTHORIZED`.

1. Token malformed hoac signature sai.
2. He thong chan request.
3. Tra `401 UNAUTHORIZED`.

1. Token het han.
2. He thong chan request.
3. Tra `401 SESSION_EXPIRED`.

1. Session khong ton tai, da revoke, hoac da expired.
2. He thong chan request.
3. Tra loi auth tuong ung.

1. User khong ton tai hoac `INACTIVE`.
2. He thong chan request.
3. Tra `403 USER_INACTIVE` hoac loi auth phu hop.

### Business Rules

- Moi protected API phai di qua auth validation.
- Chi session `ACTIVE` moi hop le.
- Neu user bi `INACTIVE`, moi protected request tiep theo phai bi chan.
- Auth context phai bao gom toi thieu `userId`, `role`, `sessionId`.
