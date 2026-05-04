# Use Cases

Bo Use Cases (UC) duoc chuyen doi tu requirement hien co cua he thong dieu khien phong hop tich hop TS-D1000 + Camera PTZ.

## Assumptions

1. He thong co 2 vai tro chinh: Admin va Operator.
2. Operator co the dang nhap va van hanh cac chuc nang duoc cap quyen, nhung khong duoc thay doi cau hinh he thong.
3. He thong ho tro 1 phong hop trong MVP, gom:
   - 1 he TS-D1000-MU
   - 1-4 camera PTZ
4. TS-D1000 cung cap API chinh thuc, gom:
   - SSE `GET /api/event` cho event thoi gian thuc
   - REST API cho du lieu cau hinh/trang thai
5. Manual mode yeu cau phan mem co the gui lenh Approve/Reject ve phia TS-D1000 hoac co che dieu khien tuong duong.
6. Layout map cho phep upload PDF hoac JPG, sau do keo-tha vi tri thiet bi.
7. Moi mic TS-D1000 co the duoc map voi mot camera preset; mot camera co the cover nhieu mic.
8. He thong co luu audit log thao tac user va log su kien he thong.
9. License chua thuoc pham vi MVP.
10. Chua bao gom quan ly nhieu site/multi-room trong phase hien tai.

## 1. List of Identified Modules

1. Authentication
2. User Management
3. Layout & Map Management
4. TS-D1000 Configuration & Integration
5. Camera Configuration & Integration
6. Mic-Camera Mapping
7. Operation Mode Management
8. Real-time Monitoring & Event Processing
9. Manual Speaking Control
10. Camera Operation
11. Live Video Monitoring
12. Logging & Audit
13. Live Monitoring

## 2. List of Use Cases per Module

### 1. Authentication

- UC-AUTH-01: Login
- UC-AUTH-02: Logout

### 2. User Management

- UC-USER-01: Create User
- UC-USER-02: Update User
- UC-USER-03: View User List
- UC-USER-04: Activate or Deactivate User

### 3. Layout & Map Management

- UC-LAYOUT-01: Upload Layout File
- UC-LAYOUT-02: Place Devices on Layout
- UC-LAYOUT-03: Add or Update Layout Annotation

### 4. TS-D1000 Configuration & Integration

- UC-TSD-01: Configure TS-D1000 Connection
- UC-TSD-02: Load TS-D1000 Device List
- UC-TSD-03: Set TS-D1000 Speaking Mode

### 5. Camera Configuration & Integration

- UC-CAM-01: Add Camera
- UC-CAM-02: Update Camera
- UC-CAM-03: Test Camera Connection
- UC-CAM-04: Configure Camera Presets

### 6. Mic-Camera Mapping

- UC-MAP-01: Map Mic to Camera Preset
- UC-MAP-02: Update Mic-Camera Mapping
- UC-MAP-03: View Mic-Camera Mapping

### 7. Operation Mode Management

- UC-MODE-01: Switch System Operation Mode

### 8. Real-time Monitoring & Event Processing

- UC-RT-01: Receive Real-time TS-D1000 Events
- UC-RT-02: Update Map Highlight Based on Mic State
- UC-RT-03: Trigger Camera by Active Speaker

### 9. Manual Speaking Control

- UC-MANUAL-01: View Speaking Request Queue
- UC-MANUAL-02: Approve Speaking Request
- UC-MANUAL-03: Reject Speaking Request

### 10. Camera Operation

- UC-PTZ-01: Recall Camera Preset
- UC-PTZ-02: Control Camera PTZ Manually

### 11. Live Video Monitoring

- UC-VIDEO-01: View Live Camera Streams
- UC-VIDEO-02: Change Live View Layout

### 12. Logging & Audit

- UC-LOG-01: Record Audit Log
- UC-LOG-02: View System Logs

### 13. Live Monitoring

- UC-LIVE-01: View Live Monitoring Dashboard
- UC-LIVE-02: Refresh Live Runtime Snapshot
- UC-LIVE-03: View Realtime Map State
- UC-LIVE-04: Highlight Unit Runtime State on Map
- UC-LIVE-05: View Active Speaker List
- UC-LIVE-06: View Pending Request Queue Summary
- UC-LIVE-07: View Unit Runtime Detail
- UC-LIVE-08: View Camera Runtime Status
- UC-LIVE-09: View Current Camera Target
- UC-LIVE-10: View Camera Trigger Result
- UC-LIVE-11: View Live Event Feed
- UC-LIVE-12: Filter Live Event Feed
- UC-LIVE-13: View Runtime Alerts
- UC-LIVE-14: Acknowledge Runtime Alert
- UC-LIVE-15: View SSE / Runtime Connection Status
- UC-LIVE-16: Handle Runtime Disconnected State
- UC-LIVE-17: Run Runtime Recovery Action

## 3. Full Detailed Use Cases

## Module: Authentication

### Use Case Name

Login

### Use Case ID

UC-AUTH-01

### Objective

Cho phep nguoi dung truy cap he thong theo dung vai tro duoc cap.

### Actors

Admin, Operator

### Preconditions

- Nguoi dung da duoc tao tai khoan.
- Tai khoan dang o trang thai active.
- Ung dung dang chay.

### Postconditions

- Nguoi dung dang nhap thanh cong vao he thong.
- Quyen truy cap duoc nap theo role.

### Main Flow (Happy Path)

1. Nguoi dung mo ung dung.
2. He thong hien thi man hinh dang nhap.
3. Nguoi dung nhap username va password.
4. Nguoi dung nhan Login.
5. He thong xac thuc thong tin.
6. He thong xac dinh role cua nguoi dung.
7. He thong chuyen nguoi dung vao man hinh chinh phu hop voi quyen.

### Alternative Flows

1. Nguoi dung nhap sai password.
2. He thong thong bao dang nhap khong thanh cong.
3. Nguoi dung nhap lai thong tin.

### Exception Flows

1. He thong khong truy cap duoc du lieu nguoi dung.
2. He thong hien thi loi he thong va khong cho dang nhap.

### Business Rules

- Chi tai khoan active moi duoc phep dang nhap.
- Phan quyen giao dien theo role ngay sau khi login.

### Use Case Name

Logout

### Use Case ID

UC-AUTH-02

### Objective

Cho phep nguoi dung dang xuat khoi he thong an toan.

### Actors

Admin, Operator

### Preconditions

- Nguoi dung dang dang nhap.

### Postconditions

- Phien dang nhap ket thuc.
- He thong quay ve man hinh login.

### Main Flow (Happy Path)

1. Nguoi dung chon Logout.
2. He thong xoa session hien tai.
3. He thong quay ve man hinh dang nhap.

### Alternative Flows

Khong co.

### Exception Flows

1. Co loi khi ket thuc phien.
2. He thong van buoc quay ve man hinh dang nhap.

### Business Rules

- Sau khi logout, nguoi dung phai dang nhap lai de tiep tuc su dung.

## Module: User Management

### Use Case Name

Create User

### Use Case ID

UC-USER-01

### Objective

Cho phep Admin tao tai khoan nguoi dung moi.

### Actors

Admin

### Preconditions

- Admin da dang nhap.

### Postconditions

- Tai khoan nguoi dung moi duoc tao.

### Main Flow (Happy Path)

1. Admin mo man hinh User Management.
2. Admin chon Create User.
3. He thong hien thi form tao user.
4. Admin nhap thong tin user:
   - username
   - password
   - role
   - status
5. Admin nhan Save.
6. He thong kiem tra du lieu hop le.
7. He thong luu user moi.
8. He thong thong bao tao thanh cong.

### Alternative Flows

1. Admin huy thao tac.
2. He thong khong tao user va quay ve danh sach.

### Exception Flows

1. Username da ton tai.
2. He thong bao loi va khong luu.
3. Thieu truong bat buoc.
4. He thong bao loi validation.

### Business Rules

- Chi Admin duoc tao user.
- Username phai la duy nhat.
- Role chi gom Admin hoac Operator.

### Use Case Name

Update User

### Use Case ID

UC-USER-02

### Objective

Cho phep Admin cap nhat thong tin nguoi dung.

### Actors

Admin

### Preconditions

- Admin da dang nhap.
- User da ton tai.

### Postconditions

- Thong tin user duoc cap nhat.

### Main Flow (Happy Path)

1. Admin mo danh sach user.
2. Admin chon mot user.
3. He thong hien thi thong tin chi tiet.
4. Admin chinh sua thong tin duoc phep.
5. Admin nhan Save.
6. He thong kiem tra du lieu.
7. He thong cap nhat thong tin.
8. He thong thong bao thanh cong.

### Alternative Flows

1. Admin khong thay doi gi.
2. He thong cho phep dong man hinh ma khong luu.

### Exception Flows

1. User khong con ton tai.
2. He thong bao loi khong the cap nhat.
3. Du lieu khong hop le.
4. He thong bao loi validation.

### Business Rules

- Chi Admin duoc sua user.
- Khong cho phep nhap role ngoai danh sach duoc ho tro.

### Use Case Name

View User List

### Use Case ID

UC-USER-03

### Objective

Cho phep Admin xem danh sach tai khoan nguoi dung.

### Actors

Admin

### Preconditions

- Admin da dang nhap.

### Postconditions

- Danh sach user duoc hien thi.

### Main Flow (Happy Path)

1. Admin vao User Management.
2. He thong tai danh sach user.
3. He thong hien thi username, role, status.

### Alternative Flows

Khong co.

### Exception Flows

1. He thong khong tai duoc danh sach.
2. He thong hien thi loi.

### Business Rules

- Chi Admin duoc xem danh sach user quan tri.

### Use Case Name

Activate or Deactivate User

### Use Case ID

UC-USER-04

### Objective

Cho phep Admin thay doi trang thai hoat dong cua user.

### Actors

Admin

### Preconditions

- Admin da dang nhap.
- User da ton tai.

### Postconditions

- Trang thai user duoc cap nhat.

### Main Flow (Happy Path)

1. Admin chon user trong danh sach.
2. Admin chon Activate hoac Deactivate.
3. He thong yeu cau xac nhan.
4. Admin xac nhan.
5. He thong cap nhat trang thai.
6. He thong thong bao thanh cong.

### Alternative Flows

1. Admin huy xac nhan.
2. He thong khong cap nhat trang thai.

### Exception Flows

1. Khong cap nhat duoc du lieu.
2. He thong hien thi loi.

### Business Rules

- User bi deactivate khong duoc dang nhap.

## Module: Layout & Map Management

### Use Case Name

Upload Layout File

### Use Case ID

UC-LAYOUT-01

### Objective

Cho phep Admin upload layout phong hop de dung lam nen ban do van hanh.

### Actors

Admin

### Preconditions

- Admin da dang nhap.

### Postconditions

- Layout file duoc luu va san sang cau hinh.

### Main Flow (Happy Path)

1. Admin mo man hinh Layout Management.
2. Admin chon Upload Layout.
3. Admin chon file PDF hoac JPG.
4. He thong kiem tra dinh dang file.
5. He thong tai file len.
6. He thong hien thi layout tren man hinh.

### Alternative Flows

1. Admin thay file layout hien tai.
2. He thong ghi de layout sau khi xac nhan.

### Exception Flows

1. File khong dung dinh dang.
2. He thong tu choi upload.
3. File upload loi.
4. He thong hien thi thong bao loi.

### Business Rules

- Chi chap nhan PDF hoac JPG.
- Moi phong chi co mot layout active tai mot thoi diem.

### Use Case Name

Place Devices on Layout

### Use Case ID

UC-LAYOUT-02

### Objective

Cho phep Admin keo-tha vi tri mic va camera tren layout.

### Actors

Admin

### Preconditions

- Layout da duoc upload.
- Danh sach device va camera da co.

### Postconditions

- Vi tri cac thiet bi duoc luu tren layout.

### Main Flow (Happy Path)

1. Admin mo layout.
2. He thong hien thi danh sach thiet bi chua dat vi tri.
3. Admin keo-tha tung mic/camera len layout.
4. Admin dieu chinh vi tri.
5. Admin nhan Save.
6. He thong luu toa do vi tri.

### Alternative Flows

1. Admin di chuyen lai vi tri thiet bi da dat.
2. He thong cap nhat toa do moi.

### Exception Flows

1. Admin chua upload layout.
2. He thong khong cho thao tac.
3. Luu vi tri that bai.
4. He thong bao loi.

### Business Rules

- Chi Admin duoc thay doi vi tri thiet bi.
- Toa do phai duoc luu theo layout hien tai.

### Use Case Name

Add or Update Layout Annotation

### Use Case ID

UC-LAYOUT-03

### Objective

Cho phep Admin them hoac chinh sua chu thich tren layout.

### Actors

Admin

### Preconditions

- Layout da ton tai.

### Postconditions

- Annotation duoc luu tren layout.

### Main Flow (Happy Path)

1. Admin chon chuc nang Add Annotation.
2. Admin nhap noi dung chu thich.
3. Admin dat vi tri chu thich tren layout.
4. Admin nhan Save.
5. He thong luu annotation.

### Alternative Flows

1. Admin chon annotation da co de sua.
2. He thong cap nhat noi dung hoac vi tri.

### Exception Flows

1. Noi dung annotation rong.
2. He thong bao loi validation.

### Business Rules

- Annotation phai gan voi mot vi tri cu the tren layout.

## Module: TS-D1000 Configuration & Integration

### Use Case Name

Configure TS-D1000 Connection

### Use Case ID

UC-TSD-01

### Objective

Cho phep Admin cau hinh ket noi den he TS-D1000.

### Actors

Admin

### Preconditions

- Admin da dang nhap.

### Postconditions

- Thong tin ket noi TS-D1000 duoc luu.

### Main Flow (Happy Path)

1. Admin mo man hinh TS-D1000 Configuration.
2. Admin nhap thong tin ket noi.
3. Admin nhan Save.
4. He thong luu cau hinh ket noi.
5. He thong thu ket noi toi TS-D1000.
6. He thong thong bao ket qua.

### Alternative Flows

1. Admin luu cau hinh ma chua test ket noi.
2. He thong chi luu du lieu.

### Exception Flows

1. Thiet bi khong phan hoi.
2. He thong bao ket noi that bai.

### Business Rules

- Chi Admin duoc cau hinh ket noi thiet bi.

### Use Case Name

Load TS-D1000 Device List

### Use Case ID

UC-TSD-02

### Objective

Cho phep he thong doc danh sach mic/chairman unit tu TS-D1000.

### Actors

Admin, System

### Preconditions

- Ket noi TS-D1000 hop le.

### Postconditions

- Danh sach thiet bi duoc nap vao he thong.

### Main Flow (Happy Path)

1. Admin chon Load Devices.
2. He thong goi API TS-D1000.
3. He thong nhan danh sach device.
4. He thong luu hoac cap nhat device list.
5. He thong hien thi danh sach thiet bi.

### Alternative Flows

1. He thong phat hien thiet bi da ton tai.
2. He thong cap nhat thong tin thay vi tao moi.

### Exception Flows

1. API TS-D1000 khong phan hoi.
2. He thong bao loi tai danh sach.

### Business Rules

- Device duoc nhan dien theo ID duy nhat tu TS-D1000.
- Device type phai phan biet chairman va delegate neu API tra ve.

### Use Case Name

Set TS-D1000 Speaking Mode

### Use Case ID

UC-TSD-03

### Objective

Cho phep Admin thiet lap che do van hanh speaking mode cua he thong.

### Actors

Admin

### Preconditions

- TS-D1000 da ket noi.

### Postconditions

- Che do speaking mode duoc luu va ap dung.

### Main Flow (Happy Path)

1. Admin mo man hinh cau hinh mode.
2. Admin chon Manual hoac Automatic.
3. Admin nhan Save.
4. He thong luu mode.
5. He thong ap dung mode cho logic van hanh.

### Alternative Flows

1. Admin thay doi mode dang dung.
2. He thong ghi nhan mode moi.

### Exception Flows

1. He thong khong luu duoc mode.
2. He thong hien thi loi.

### Business Rules

- Chi mot mode duoc active tai mot thoi diem.
- Manual mode va Automatic mode co logic xu ly khac nhau.

## Module: Camera Configuration & Integration

### Use Case Name

Add Camera

### Use Case ID

UC-CAM-01

### Objective

Cho phep Admin them camera vao he thong.

### Actors

Admin

### Preconditions

- Admin da dang nhap.

### Postconditions

- Camera moi duoc them vao cau hinh he thong.

### Main Flow (Happy Path)

1. Admin mo Camera Management.
2. Admin chon Add Camera.
3. Admin nhap thong tin camera:
   - ten
   - IP
   - protocol/type
   - thong tin xac thuc neu co
4. Admin nhan Save.
5. He thong kiem tra du lieu.
6. He thong luu camera.

### Alternative Flows

1. Admin them nhieu camera lan luot.
2. He thong luu tung camera.

### Exception Flows

1. IP khong hop le.
2. Thieu truong bat buoc.
3. He thong bao loi va khong luu.

### Business Rules

- So luong camera trong MVP toi da la 4.
- Camera type phai thuoc danh sach duoc ho tro.

### Use Case Name

Update Camera

### Use Case ID

UC-CAM-02

### Objective

Cho phep Admin cap nhat cau hinh camera.

### Actors

Admin

### Preconditions

- Camera da ton tai.

### Postconditions

- Cau hinh camera duoc cap nhat.

### Main Flow (Happy Path)

1. Admin chon camera trong danh sach.
2. He thong hien thi thong tin camera.
3. Admin chinh sua du lieu.
4. Admin nhan Save.
5. He thong cap nhat cau hinh.

### Alternative Flows

1. Admin huy thao tac.
2. He thong khong cap nhat.

### Exception Flows

1. Camera khong con ton tai.
2. Du lieu khong hop le.
3. He thong bao loi.

### Business Rules

- Chi Admin duoc cap nhat camera.

### Use Case Name

Test Camera Connection

### Use Case ID

UC-CAM-03

### Objective

Cho phep Admin kiem tra kha nang ket noi camera.

### Actors

Admin, System

### Preconditions

- Camera da duoc cau hinh.

### Postconditions

- Ket qua test ket noi duoc hien thi.

### Main Flow (Happy Path)

1. Admin chon camera.
2. Admin nhan Test Connection.
3. He thong gui lenh kiem tra ket noi.
4. Camera phan hoi.
5. He thong hien thi ket noi thanh cong.

### Alternative Flows

1. Camera ket noi duoc nhung khong ho tro mot so capability.
2. He thong hien thi trang thai thanh cong mot phan.

### Exception Flows

1. Camera khong phan hoi.
2. Sai thong tin xac thuc.
3. He thong hien thi ket noi that bai.

### Business Rules

- Viec test ket noi phai phan biet ket noi thanh cong va capability khong ho tro.

### Use Case Name

Configure Camera Presets

### Use Case ID

UC-CAM-04

### Objective

Cho phep Admin cau hinh preset cho camera.

### Actors

Admin

### Preconditions

- Camera da duoc them va ket noi duoc.

### Postconditions

- Preset camera duoc luu.

### Main Flow (Happy Path)

1. Admin chon camera.
2. Admin dieu khien camera den vi tri mong muon hoac nhap preset co san.
3. Admin chon Save Preset.
4. Admin nhap ten hoac ma preset.
5. He thong luu preset.

### Alternative Flows

1. Admin cap nhat preset da co.
2. He thong ghi de preset sau xac nhan.

### Exception Flows

1. Camera khong phan hoi lenh PTZ.
2. He thong bao loi luu preset.

### Business Rules

- Preset phai thuoc mot camera cu the.
- Preset la nen tang chinh cho auto camera switching.

## Module: Mic-Camera Mapping

### Use Case Name

Map Mic to Camera Preset

### Use Case ID

UC-MAP-01

### Objective

Cho phep Admin gan mot mic voi camera preset tuong ung.

### Actors

Admin

### Preconditions

- Danh sach mic da co.
- Danh sach camera/preset da co.

### Postconditions

- Mapping mic-camera preset duoc luu.

### Main Flow (Happy Path)

1. Admin mo man hinh Mapping.
2. Admin chon mot mic.
3. Admin chon camera.
4. Admin chon preset tuong ung.
5. Admin nhan Save.
6. He thong luu mapping.

### Alternative Flows

1. Nhieu mic duoc map toi cung mot camera nhung khac preset.
2. He thong luu tung mapping rieng.

### Exception Flows

1. Preset khong thuoc camera duoc chon.
2. He thong bao loi validation.
3. Mic khong ton tai.
4. He thong khong cho luu.

### Business Rules

- Mot mapping phai gom mic + camera + preset.
- Mot camera co the cover nhieu mic.
- Mot mic tai mot thoi diem chi co mot mapping active.

### Use Case Name

Update Mic-Camera Mapping

### Use Case ID

UC-MAP-02

### Objective

Cho phep Admin chinh sua mapping da co.

### Actors

Admin

### Preconditions

- Mapping da ton tai.

### Postconditions

- Mapping duoc cap nhat.

### Main Flow (Happy Path)

1. Admin chon mot mapping hien co.
2. Admin thay camera hoac preset.
3. Admin nhan Save.
4. He thong cap nhat mapping.

### Alternative Flows

1. Admin chi doi preset, khong doi camera.
2. He thong cap nhat du lieu tuong ung.

### Exception Flows

1. Mapping khong ton tai.
2. Du lieu moi khong hop le.
3. He thong bao loi.

### Business Rules

- Khong cho phep mapping toi preset khong hop le.

### Use Case Name

View Mic-Camera Mapping

### Use Case ID

UC-MAP-03

### Objective

Cho phep Admin xem danh sach mapping hien tai.

### Actors

Admin

### Preconditions

- He thong co du lieu mapping.

### Postconditions

- Danh sach mapping duoc hien thi.

### Main Flow (Happy Path)

1. Admin mo man hinh Mapping List.
2. He thong hien thi danh sach mic, camera, preset tuong ung.

### Alternative Flows

Khong co.

### Exception Flows

1. He thong khong tai duoc du lieu.
2. He thong hien thi loi.

### Business Rules

- Chi Admin duoc chinh sua mapping.

## Module: Operation Mode Management

### Use Case Name

Switch System Operation Mode

### Use Case ID

UC-MODE-01

### Objective

Cho phep Admin chuyen doi giua Manual mode va Automatic mode.

### Actors

Admin

### Preconditions

- He thong da duoc cau hinh co ban.

### Postconditions

- Mode moi duoc kich hoat.

### Main Flow (Happy Path)

1. Admin vao man hinh Operation Mode.
2. Admin chon mode moi.
3. Admin xac nhan thay doi.
4. He thong luu mode.
5. He thong ap dung logic runtime theo mode moi.

### Alternative Flows

1. Admin huy xac nhan.
2. Mode khong thay doi.

### Exception Flows

1. Khong the ap dung mode.
2. He thong hien thi loi.

### Business Rules

- Manual mode: speaking request can approve/reject.
- Automatic mode: event speaking tu xu ly theo logic he thong.

## Module: Real-time Monitoring & Event Processing

### Use Case Name

Receive Real-time TS-D1000 Events

### Use Case ID

UC-RT-01

### Objective

Cho phep he thong nhan lien tuc cac event thoi gian thuc tu TS-D1000.

### Actors

System

### Preconditions

- He thong dang ket noi TS-D1000.
- SSE endpoint hoat dong.

### Postconditions

- Event duoc nhan va chuyen sang runtime processing.

### Main Flow (Happy Path)

1. He thong mo ket noi SSE toi `/api/event`.
2. TS-D1000 gui event.
3. He thong nhan event.
4. He thong parse event type va payload.
5. He thong dua event vao xu ly runtime.

### Alternative Flows

1. He thong nhan event loai khac nhau.
2. He thong route event toi dung handler.

### Exception Flows

1. Ket noi SSE bi mat.
2. He thong ghi log loi va thu reconnect.
3. Event payload khong hop le.
4. He thong bo qua event loi va ghi log.

### Business Rules

- Event runtime la nguon du lieu chinh cho trang thai live.
- He thong phai duy tri kha nang reconnect khi mat SSE.

### Use Case Name

Update Map Highlight Based on Mic State

### Use Case ID

UC-RT-02

### Objective

Cho phep he thong highlight icon tren map theo trang thai request hoac speaking cua mic.

### Actors

System

### Preconditions

- Layout va vi tri thiet bi da duoc cau hinh.
- Event mic da duoc nhan.

### Postconditions

- UI map hien thi dung trang thai moi.

### Main Flow (Happy Path)

1. He thong xac dinh mic lien quan tu event.
2. He thong lay vi tri mic tren layout.
3. He thong xac dinh trang thai moi:
   - request
   - speaking
   - idle
4. He thong cap nhat highlight icon tren map.

### Alternative Flows

1. Mic co event nhung chua duoc dat vi tri tren layout.
2. He thong chi cap nhat trang thai runtime, khong highlight duoc tren map.

### Exception Flows

1. Khong tim thay device tuong ung.
2. He thong ghi log loi.

### Business Rules

- Highlight phai phan anh trang thai runtime moi nhat.
- Request va speaking phai co trang thai hien thi khac nhau.

### Use Case Name

Trigger Camera by Active Speaker

### Use Case ID

UC-RT-03

### Objective

Cho phep he thong tu dong dieu khien camera theo nguoi dang phat bieu.

### Actors

System

### Preconditions

- Mic-camera mapping da co.
- Camera ket noi duoc.
- Co active speaker hop le.

### Postconditions

- Camera duoc dieu khien toi goc quay tuong ung.

### Main Flow (Happy Path)

1. He thong nhan event active speaker.
2. He thong xac dinh speaker hien tai.
3. He thong ap dung rule uu tien.
4. He thong xac dinh camera target va preset.
5. He thong kiem tra delay switching.
6. He thong gui lenh recall preset toi camera.
7. He thong cap nhat trang thai camera active tren UI.

### Alternative Flows

1. Speaker la chairman.
2. He thong uu tien chairman hon delegate.
3. Co nhieu delegate active.
4. He thong chon nguoi noi gan nhat theo rule.

### Exception Flows

1. Khong co mapping cho mic.
2. He thong khong dieu khien camera va ghi log canh bao.
3. Camera khong phan hoi.
4. He thong ghi log loi.

### Business Rules

- Chairman co uu tien cao hon delegate.
- Delay switching phai duoc ap dung de tranh camera giat.
- Camera switching chi thuc hien khi co target hop le.

## Module: Manual Speaking Control

### Use Case Name

View Speaking Request Queue

### Use Case ID

UC-MANUAL-01

### Objective

Cho phep Operator xem cac yeu cau phat bieu dang cho xu ly trong Manual mode.

### Actors

Operator, Admin

### Preconditions

- He thong dang o Manual mode.
- Co speaking request tu TS-D1000.

### Postconditions

- Danh sach request pending duoc hien thi.

### Main Flow (Happy Path)

1. Delegate hoac chairman nhan Talk.
2. He thong nhan event request.
3. He thong them request vao danh sach pending.
4. He thong highlight mic o trang thai request.
5. Operator xem request queue tren man hinh.

### Alternative Flows

1. Co nhieu request dong thoi.
2. He thong hien thi danh sach theo thu tu nhan hoac rule hien hanh.

### Exception Flows

1. Khong nhan duoc event request.
2. He thong khong tao request queue entry.

### Business Rules

- UC nay chi ap dung o Manual mode.
- Request pending chua duoc noi cho den khi duoc approve.

### Use Case Name

Approve Speaking Request

### Use Case ID

UC-MANUAL-02

### Objective

Cho phep Operator phe duyet yeu cau phat bieu trong Manual mode.

### Actors

Operator, Admin

### Preconditions

- He thong o Manual mode.
- Co request dang pending.

### Postconditions

- Request duoc approve.
- TS-D1000 chuyen mic sang speaking.
- Camera duoc trigger theo speaker thuc te.

### Main Flow (Happy Path)

1. Operator chon mot request trong queue.
2. Operator nhan Approve.
3. He thong gui lenh approve toi TS-D1000.
4. TS-D1000 phan hoi bang trang thai speaking hoac event tuong ung.
5. He thong cap nhat request thanh approved/active.
6. He thong highlight mic o trang thai speaking.
7. He thong trigger camera theo speaker.

### Alternative Flows

1. Operator approve request cua chairman.
2. He thong van xu ly nhu tren nhung theo rule uu tien chairman.

### Exception Flows

1. Request khong con hop le khi approve.
2. Lenh gui TS-D1000 that bai.
3. TS-D1000 khong phan hoi chuyen trang thai.
4. He thong hien thi loi va giu request o trang thai phu hop.

### Business Rules

- Chi nguoi co quyen van hanh moi duoc approve.
- Camera chi trigger khi speaker thuc su active theo trang thai he thong.

### Use Case Name

Reject Speaking Request

### Use Case ID

UC-MANUAL-03

### Objective

Cho phep Operator tu choi yeu cau phat bieu trong Manual mode.

### Actors

Operator, Admin

### Preconditions

- He thong o Manual mode.
- Co request pending.

### Postconditions

- Request bi tu choi.
- Mic khong chuyen sang speaking.
- Khong co camera action.

### Main Flow (Happy Path)

1. Operator chon request.
2. Operator nhan Reject.
3. He thong gui lenh reject toi TS-D1000 hoac cap nhat logic tu choi tuong duong.
4. He thong cap nhat request thanh rejected.
5. He thong bo highlight trang thai request hoac chuyen ve idle.

### Alternative Flows

1. Operator tu choi mot trong nhieu request.
2. Cac request con lai van giu nguyen.

### Exception Flows

1. Khong gui duoc lenh reject.
2. He thong bao loi.
3. Request da khong con pending.
4. He thong tu choi thao tac.

### Business Rules

- Reject khong duoc tao camera action.
- Chi request pending moi duoc reject.

## Module: Camera Operation

### Use Case Name

Recall Camera Preset

### Use Case ID

UC-PTZ-01

### Objective

Cho phep nguoi dung co quyen dieu khien camera quay toi preset da luu.

### Actors

Admin, Operator

### Preconditions

- Camera dang ket noi.
- Preset da ton tai.
- User co quyen dieu khien camera.

### Postconditions

- Camera quay toi preset duoc chon.

### Main Flow (Happy Path)

1. User chon camera.
2. User chon preset.
3. User nhan Recall.
4. He thong gui lenh recall preset.
5. Camera di chuyen toi vi tri preset.

### Alternative Flows

1. User dung preset qua man hinh config.
2. He thong xu ly tuong tu.

### Exception Flows

1. Preset khong ton tai.
2. Camera khong phan hoi.
3. He thong hien thi loi.

### Business Rules

- Chi user co quyen moi duoc dieu khien camera.
- Preset phai thuoc camera dang chon.

### Use Case Name

Control Camera PTZ Manually

### Use Case ID

UC-PTZ-02

### Objective

Cho phep nguoi dung co quyen dieu khien pan/tilt/zoom camera truc tiep.

### Actors

Admin, Operator

### Preconditions

- Camera dang online.
- User co quyen dieu khien PTZ.

### Postconditions

- Camera thay doi goc quay hoac muc zoom theo lenh.

### Main Flow (Happy Path)

1. User chon camera.
2. User chon dieu khien PTZ:
   - pan
   - tilt
   - zoom
3. He thong gui lenh PTZ tuong ung.
4. Camera thuc hien lenh.
5. UI cap nhat trang thai dieu khien.

### Alternative Flows

1. User dung PTZ.
2. He thong gui lenh stop.

### Exception Flows

1. Camera khong ho tro PTZ command tuong ung.
2. He thong bao loi.
3. Camera mat ket noi trong luc dieu khien.
4. He thong dung thao tac va bao loi.

### Business Rules

- PTZ realtime la chuc nang bo sung ngoai preset recall.
- Chi camera co capability tuong ung moi thuc hien duoc lenh.

## Module: Live Video Monitoring

### Use Case Name

View Live Camera Streams

### Use Case ID

UC-VIDEO-01

### Objective

Cho phep nguoi dung xem video live tu camera trong ung dung.

### Actors

Admin, Operator

### Preconditions

- Camera stream co san.
- User da dang nhap.

### Postconditions

- Video stream duoc hien thi tren UI.

### Main Flow (Happy Path)

1. User mo man hinh Live View.
2. He thong tai danh sach camera.
3. User chon hien thi mot hoac nhieu camera.
4. He thong mo stream.
5. He thong hien thi video len UI.

### Alternative Flows

1. User chon tu 1 den 4 camera.
2. He thong hien thi multi-view tuong ung.

### Exception Flows

1. Stream khong mo duoc.
2. He thong hien thi loi cho camera do.
3. Mot so camera loi, so khac van chay.
4. He thong chi hien thi stream kha dung.

### Business Rules

- MVP ho tro toi da 4 luong dong thoi.
- Cho phep chon so luong hien thi tu 1 den 4.

### Use Case Name

Change Live View Layout

### Use Case ID

UC-VIDEO-02

### Objective

Cho phep nguoi dung thay doi bo cuc hien thi live view.

### Actors

Admin, Operator

### Preconditions

- Nguoi dung dang o man hinh Live View.

### Postconditions

- Layout hien thi stream duoc thay doi.

### Main Flow (Happy Path)

1. User chon kieu layout:
   - 1 view
   - 2 view
   - 3 view
   - 4 view
2. He thong sap xep lai vung hien thi.
3. He thong render stream theo layout moi.

### Alternative Flows

1. User doi nhanh qua lai giua cac layout.
2. He thong cap nhat giao dien tuong ung.

### Exception Flows

1. Khong du stream de hien thi theo layout chon.
2. He thong chi hien thi so stream kha dung.

### Business Rules

- He thong khong duoc vuot qua so stream camera hien co.

## Module: Logging & Audit

### Use Case Name

Record Audit Log

### Use Case ID

UC-LOG-01

### Objective

Cho phep he thong ghi lai thao tac nguoi dung va su kien quan trong.

### Actors

System

### Preconditions

- He thong dang hoat dong.

### Postconditions

- Log duoc luu.

### Main Flow (Happy Path)

1. User thuc hien thao tac quan trong hoac he thong nhan su kien quan trong.
2. He thong tao ban ghi log.
3. He thong luu cac thong tin:
   - thoi gian
   - actor
   - action
   - target
   - ket qua
4. He thong hoan tat ghi log.

### Alternative Flows

1. He thong ghi log cho event runtime.
2. He thong ghi log cho user action.

### Exception Flows

1. Khong ghi duoc log.
2. He thong tiep tuc xu ly chinh nhung danh dau loi log.

### Business Rules

- Cac thao tac cau hinh va approve/reject phai duoc audit log.
- Log su kien he thong phuc vu debug va trace.

### Use Case Name

View System Logs

### Use Case ID

UC-LOG-02

### Objective

Cho phep nguoi dung co quyen xem log he thong va log audit.

### Actors

Admin

### Preconditions

- Co du lieu log.

### Postconditions

- Log duoc hien thi.

### Main Flow (Happy Path)

1. Admin mo man hinh Logs.
2. He thong tai danh sach log.
3. Admin xem thong tin log.

### Alternative Flows

1. Admin loc theo loai log hoac thoi gian, neu UI ho tro.
2. He thong hien thi ket qua tuong ung.

### Exception Flows

1. Khong tai duoc log.
2. He thong hien thi loi.

### Business Rules

- Chi Admin duoc xem log he thong day du.

## Ready Notes for Next Step

Bo UC tren da bao phu cac nhom chinh:

- Authentication
- Role-based access
- Cau hinh he thong
- CRUD cau hinh thiet bi
- Runtime event handling
- Manual/Automatic behavior
- Camera integration
- Live monitoring
- Logging

Diem chua di sau vi requirement chua mo ta du:

- chi tiet command API cho approve/reject TS-D1000
- thuat toan anti-jitter va delay switching cu the
- chinh sach password
- cau truc log filter/export
- bulk operations thuc su chua co trong requirement hien tai

Buoc tiep theo hop ly nhat la chuyen bo UC nay thanh:

- Use Case Diagram
- hoac Requirement Specification chi tiet theo tung man hinh/chuc nang
- hoac Detail Design cho dev gom API, DB schema, state model
