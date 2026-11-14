# TASK 1.3 — ĐẶC TẢ USE-CASE TRỌNG TÂM: UC-04 ĐẶT HÀNG (PLACE ORDER)
## DỰ ÁN: BREWLITE — HỆ THỐNG ĐẶT CÀ PHÊ KHÔNG DÙNG TIỀN MẶT

- **Tên dự án:** BrewLite (Cashless Coffee Ordering Platform)
- **Tài liệu tham chiếu:** Assignment 1 (Task 10) & Assignment 2 (Task 1.3, Task 2)
- **Mã tài liệu:** `REQ-UC-04`
- **Phiên bản:** 1.3.0 (UML Semantics Alignment — Required Payment Inclusion)
- **Trạng thái:** Đề xuất nghiệm thu Task 1 (Proposed Baseline for Task 1 Review)
- **MVP do nhóm lựa chọn:** Đặt đồ uống (Drink Ordering)
- **Use-case trọng tâm:** `UC-04 — Đặt hàng (Place Order)`
- **Quan hệ UML chuẩn hóa:** `UC-04 ..> UC-10 : <<include>>`

---

## 1. Định Nghĩa Nghiệp Vụ và Ranh Giới Phạm Vi

### 1.1 Định nghĩa cốt lõi của UC-04
**`UC-04: Đặt hàng (Place Order)` là quy trình đặt hàng không tiền mặt hoàn chỉnh của khách hàng trên nền tảng BrewLite. Quy trình này bao gồm bước khởi tạo đơn hàng và bắt buộc thực thi hành vi thanh toán không tiền mặt `UC-10` thông qua quan hệ `<<include>>`.**

Để đảm bảo tính chuẩn xác về mặt kỹ nghệ phần mềm và kiến trúc hệ thống, cần phân biệt rạch ròi giữa hai khái niệm:

1. **Khởi tạo đơn hàng (FR-05 — Technical Sub-step):**
   - Là bước kỹ thuật nền tảng diễn ra trong giai đoạn đầu của `UC-04`.
   - Bao gồm: Xác thực phiên làm việc của khách hàng (`JwtAuthGuard`), kiểm tra tính hợp lệ của giỏ hàng và DTO, kiểm tra tồn kho khả dụng sơ bộ, tính toán lại giá độc lập phía server, gọi API `POST /orders`, khởi tạo bản ghi `Order` cùng các dòng `OrderItem` tại trạng thái ban đầu **`PENDING`**, API phản hồi HTTP 201 Created.
   - **Ý nghĩa kỹ thuật:** Hoàn thành bước FR-05 tạo đơn `PENDING` **tuyệt đối không đồng nghĩa với việc UC-04 đã hoàn tất thành công**. Trạng thái `PENDING` chỉ là trạng thái trung gian (intermediate state) trong vòng đời thực thi của `UC-04`.

2. **Hoàn tất đặt hàng (UC-04 — Business Goal Fulfillment):**
   - Sau khi đơn hàng được tạo lập ở trạng thái `PENDING`, `UC-04` bắt buộc thực thi hành vi thanh toán không tiền mặt `UC-10`.
   - **Chỉ khi giao dịch thanh toán qua `UC-10` thực thi thành công và trạng thái của `Order` được máy trạng thái xác nhận chuyển sang `PAID`, Use Case `UC-04` mới đạt hậu điều kiện thành công.**

### 1.2 Trong phạm vi UC-04:
- Tiếp nhận và kiểm tra giỏ hàng của khách hàng (kèm size, topping, số lượng, ghi chú).
- Xác thực tài khoản khách hàng thông qua JWT Bearer Token (FR-04).
- Khởi tạo đơn hàng trung gian ở trạng thái `PENDING` qua `POST /orders` (FR-05).
- Lựa chọn phương thức thanh toán không tiền mặt (Ví điện tử hoặc Thẻ ngân hàng).
- **Bắt buộc kích hoạt và thực thi Use Case `UC-10: Thanh toán không tiền mặt` qua liên kết `<<include>>` (FR-06, FR-08, FR-09).**
- Kiểm soát chuyển đổi trạng thái đơn hàng sang `PAID` thông qua hàm máy trạng thái `assertTransition` (FR-07).
- Trừ tồn kho thành phẩm theo cơ chế Optimistic Concurrency Control (OCC - cột `version`) trong giao dịch thanh toán (FR-09).
- Làm trống giỏ hàng phía client và điều hướng khách hàng tới màn hình hiển thị xác nhận đặt hàng thành công kèm mã nhận nước tại quầy (FR-11).

### 1.3 Ngoài phạm vi UC-04:
- Nhân viên quầy / Barista tiếp nhận đơn đã thanh toán và cập nhật tiến độ pha chế (`UC-12`, FR-12).
- Tra cứu danh sách lịch sử các đơn hàng cũ của cá nhân (`UC-06`, FR-11).
- Quản trị danh mục menu sản phẩm hoặc báo cáo doanh thu tài chính cửa hàng.

---

## 2. Bản Chất Nghiệp Vụ Của Use Case Được Bao Gồm: UC-10

**`UC-10: Thanh toán không tiền mặt (Cashless Payment)` là hành vi cấu thành bắt buộc được bao gồm trong `UC-04` (`UC-04 ..> UC-10 : <<include>>`).**

Bản chất của `UC-10` là **thực hiện giao dịch thanh toán không tiền mặt thực tế**, không phải là thao tác chọn phương thức hay kiểm tra giỏ hàng đơn thuần. Trách nhiệm cụ thể của `UC-10`:
1. Tiếp nhận mã đơn hàng đã tồn tại ở trạng thái `PENDING` (hoặc trạng thái hợp lệ để thử lại như `PAYMENT_FAILED`).
2. Kiểm tra quyền sở hữu đơn hàng và tính toàn vẹn của số tiền thanh toán (`amount === order.totalAmount`).
3. Tiếp nhận phương thức thanh toán ví điện tử (`E_WALLET`) hoặc thẻ (`BANK_CARD`).
4. Gửi yêu cầu `POST /payments` kèm HTTP Header `Idempotency-Key` (chuẩn UUID v4).
5. Tương tác với Cổng thanh toán mô phỏng (Mock Payment Service) và nhận kết quả giao dịch.
6. Xử lý đồng thời và kiểm soát trừ tồn kho thành phẩm bằng khóa lạc quan OCC.
7. Khi thanh toán thành công (`SUCCESS`), cập nhật bản ghi `Payment` và kích hoạt máy trạng thái chuyển `Order` sang **`PAID`**.
8. Trả kết quả thành công cho `UC-04` để tiếp tục chu trình điều hướng xác nhận đơn.

> [!NOTE]
> `UC-10` được thiết kế như một Use Case có khả năng tái sử dụng (Reusable Use Case). Ngoài việc được bao gồm trực tiếp trong luồng chính của `UC-04`, `UC-10` còn có thể được kích hoạt độc lập khi khách hàng thực hiện thanh toán lại (retry payment) cho một đơn hàng trước đó bị gián đoạn mạng hoặc thanh toán thất bại.

---

## 3. Tác Nhân, Kích Hoạt, Tiền Điều Kiện và Hậu Điều Kiện

| Thuộc tính | Chi tiết đặc tả |
| :--- | :--- |
| **Mã Use Case** | `UC-04` |
| **Tên Use Case** | Đặt hàng (Place Order) |
| **Phân loại** | Core Business Flow (Nghiệp vụ cốt lõi MVP) |
| **Actor chính** | **Khách hàng (Customer):** Người dùng trực tiếp thao tác đặt và thanh toán trên ứng dụng web/PWA. |
| **Actor phụ** | **Cổng thanh toán mô phỏng (Mock Payment Service):** Tiếp nhận yêu cầu thanh toán không tiền mặt và phản hồi kết quả giao dịch (tương tác thông qua Use Case được bao gồm `UC-10`). |
| **Trigger** | Khách hàng nhấn nút **"Thanh toán"** tại trang Giỏ hàng hoặc **"Xác nhận thanh toán"** tại trang Checkout. |
| **Tiền điều kiện** | 1. Khách hàng đã truy cập ứng dụng BrewLite và giỏ hàng có ít nhất một (01) đồ uống hợp lệ.<br>2. Các sản phẩm trong giỏ có trạng thái kinh doanh (`isAvailable = true`) và đủ tồn kho thành phẩm (`stock >= quantity`).<br>3. Khách hàng đã đăng nhập tài khoản hợp lệ với JWT Bearer Token (FR-04).<br>4. Backend API, CSDL PostgreSQL và Mock Payment Service đang hoạt động bình thường. |
| **Hậu điều kiện thành công (Success Postconditions)** | **UC-04 hoàn tất thành công khi thỏa mãn toàn bộ các điều kiện:**<br>1. Bản ghi đơn hàng (`Order`) và các chi tiết món (`OrderItem`) được tạo lập chuẩn xác trong CSDL.<br>2. Cấp phát mã định danh duy nhất `id` (UUID v4) và mã hiển thị nhận nước `orderCode` (ví dụ: `#BL-1042`).<br>3. **Hành vi thanh toán `UC-10` đã thực thi thành công:** Bản ghi giao dịch `Payment` được lưu với trạng thái `SUCCESS` và gắn với `Idempotency-Key` duy nhất.<br>4. **Trạng thái của `Order` được máy trạng thái xác nhận chuyển sang `PAID`.**<br>5. Số lượng tồn kho thành phẩm (`stock`) được trừ chính xác qua Optimistic Concurrency Control (cột `version` tăng thêm 1), không bị bán âm kho và không trừ trùng.<br>6. Giỏ hàng trên thiết bị client được làm trống.<br>7. Khách hàng nhận được màn hình thông báo đặt hàng và thanh toán thành công kèm mã nhận nước và thông điệp: *"Mời tới quầy lấy nước"*. |
| **Hậu điều kiện thất bại / Chưa hoàn tất (Failure / Incomplete Postconditions)** | 1. **Lỗi ở bước tạo đơn (Trước khi có Order):** Không có bản ghi `Order` nào được tạo (transaction rollback 100%), giỏ hàng giữ nguyên, API phản hồi lỗi HTTP 400/401/409.<br>2. **Thanh toán thất bại trong UC-10:** Đơn hàng `PENDING` đã được lưu thành công trước đó **không bị xóa bỏ**; máy trạng thái chuyển `Order` sang **`PAYMENT_FAILED`**. Hệ thống **tuyệt đối không thông báo "Đặt hàng thành công" theo nghĩa đã thanh toán**, không tạo giao dịch thành công giả, tồn kho không bị trừ; giỏ hàng hoặc thông tin đơn được bảo toàn để khách hàng có thể thử lại thanh toán.<br>3. **Thanh toán timeout / chưa xác định:** `Order` tiếp tục giữ ở trạng thái `PENDING`. Kết quả UC-04 được thông báo là **chưa hoàn tất**, yêu cầu khách hàng kiểm tra kết quả giao dịch trước khi thử lại để chống trừ tiền trùng.<br>*Lưu ý kiến trúc:* Hai giao dịch kỹ thuật `POST /orders` và `POST /payments` là độc lập về database transaction. Lỗi thanh toán không yêu cầu rollback giao dịch tạo đơn đã commit trước đó. |

---

## 4. Luồng Sự Kiện Chi Tiết (Flow of Events)

### 4.1 Luồng chính thành công (Main Success Flow)

1. **Khách hàng** mở giao diện Giỏ hàng trên ứng dụng Next.js.
2. **Hệ thống** hiển thị danh sách các món đồ uống đã chọn (kèm tùy biến size, topping, số lượng) và tổng tiền tạm tính.
3. **Khách hàng** nhập ghi chú đơn hàng nếu cần (ví dụ: `"50% đường, ít đá, mang đi"`) và nhấn nút **"Xác nhận đặt đơn"** / **"Thanh toán"**.
4. **Hệ thống Next.js** kiểm tra trạng thái xác thực: xác nhận khách hàng có JWT Bearer Token hợp lệ (`JwtAuthGuard`), kiểm tra tính toàn vẹn của dữ liệu giỏ hàng.
5. **Hệ thống Next.js** gửi yêu cầu tạo đơn hàng: `POST /orders` kèm Bearer Token và payload `CreateOrderDto`.
6. **Backend NestJS** khởi tạo Database Transaction thứ nhất:
   - Kiểm tra tính khả dụng và số lượng tồn kho thành phẩm (`isAvailable = true`, `stock >= quantity`).
   - Tính toán lại đơn giá từng món và tổng tiền đơn hàng độc lập phía server (`Server-side Price Calculation`).
   - Khởi tạo bản ghi `Order` ở trạng thái trung gian ban đầu là **`PENDING`**, sinh mã UUID v4 (`id`) và mã hiển thị `orderCode` (ví dụ: `#BL-1042`), lưu các bản ghi con `OrderItem`.
7. **Backend NestJS** commit transaction thứ nhất và phản hồi HTTP 201 Created chứa `orderId`, `orderCode` và `totalAmount`.
8. **Khách hàng** chọn phương thức thanh toán không tiền mặt (Ví điện tử `E_WALLET` hoặc Thẻ ngân hàng `BANK_CARD`) và nhấn **"Xác nhận thanh toán"**.
9. **`UC-04` thực thi hành vi thanh toán bắt buộc `UC-10: Thanh toán không tiền mặt` thông qua quan hệ `<<include>>`.**
10. **`UC-10`** sinh khóa `Idempotency-Key` (chuẩn UUID v4), gửi request `POST /payments` đến Backend NestJS. Backend kiểm tra tính duy nhất của khóa, xác thực số tiền và gửi yêu cầu sang Mock Payment Service.
11. **Mock Payment Service** xử lý giao dịch và phản hồi kết quả **`SUCCESS`**.
12. **Backend NestJS** khởi tạo Database Transaction thứ hai:
    - Hàm máy trạng thái `assertTransition(order.status, OrderStatus.PAID)` kiểm tra hợp lệ và chuyển trạng thái đơn hàng từ `PENDING` sang **`PAID`**.
    - Thực hiện trừ tồn kho thành phẩm bằng cơ chế Optimistic Concurrency Control (OCC): tăng `version = version + 1`, giảm `stock`.
    - Tạo bản ghi `Payment` với trạng thái `SUCCESS` và liên kết với `idempotencyKey`.
    - *(Hành vi mở rộng Should Have):* Tự động ghi nhận điểm thưởng Loyalty theo `BR-LOYALTY-01` (khoảng hở `GAP-03`).
    - Commit transaction thứ hai và phản hồi HTTP 200 OK.
13. **Hệ thống Next.js** làm trống giỏ hàng (Clear Zustand / LocalStorage) và điều hướng khách hàng sang màn hình Xác nhận thành công (`/order/confirmation`). Giao diện hiển thị biểu tượng thành công $\checkmark$, mã nhận món `#BL-1042`, huy hiệu trạng thái `PAID`, và thông điệp: *"Mời tới quầy lấy nước"*.
14. **Use Case `UC-04: Đặt hàng` hoàn tất thành công viên mãn.**

---

## 5. Các Luồng Thay Thế (Alternative Flows)

| Mã | Điều kiện kích hoạt | Cách xử lý của hệ thống |
| :--- | :--- | :--- |
| **ALT-01** | Khách hàng chọn thanh toán bằng Thẻ ngân hàng (Bank Card) | Tại Bước 8, khách hàng chọn "Thẻ ngân hàng". `UC-10` gửi `POST /payments` với `"method": "BANK_CARD"`, Mock Payment Service xử lý qua cổng thẻ giả lập, luồng tiếp tục thành công sang Bước 11. |
| **ALT-02** | Khách hàng áp dụng mã khuyến mãi (`UC-09` - Should Have / FR-10) | Tại Bước 2 hoặc 3, khách hàng nhập mã `BREW20`. Hệ thống kiểm tra điều kiện model `Promotion` (đơn $\ge$ 50.000đ), chiết khấu 20%, cập nhật `discountAmount` và `totalAmount`. Bước 5 gửi kèm `promoCode`; bước thanh toán `UC-10` xử lý số tiền đã chiết khấu. |
| **ALT-03** | Khách hàng đặt món tiêu chuẩn không có topping | Cho phép tạo đơn với danh sách topping rỗng (`toppings: []`), đơn giá tính theo size niêm yết. |
| **ALT-04** | Khách hàng chưa đăng nhập khi nhấn đặt hàng | Tại Bước 4, hệ thống phát hiện chưa có JWT Token; client tạm lưu giỏ hàng vào `localStorage`, chuyển hướng sang Đăng nhập (`UC-08`); sau khi đăng nhập thành công, tự động điều hướng quay lại và tiếp tục từ Bước 5. |
| **ALT-05** | Khách hàng thực hiện thanh toán lại cho đơn hàng chưa hoàn tất | Khách hàng truy cập đơn hàng đang ở trạng thái `PENDING` hoặc `PAYMENT_FAILED` từ lịch sử đơn; hệ thống bỏ qua các Bước 1-7 và **kích hoạt trực tiếp `UC-10`** từ Bước 8 để thực hiện thanh toán chuyển đơn sang `PAID`. |
| **ALT-06** | Tích lũy điểm thưởng thành viên (`UC-11` - Should Have / FR-10) | Khi `UC-10` chuyển đơn sang `PAID`, hệ thống ghi nhận điểm tích lũy vào bảng `LoyaltyTransaction`. (Lưu ý: Tỷ lệ quy đổi đang chờ phê duyệt tại `GAP-03`; việc tách biệt transaction thanh toán và tích điểm là định hướng kỹ thuật mong muốn). |

---

## 6. Các Luồng Ngoại Lệ (Exception Flows)

Hệ thống phân định rạch ròi 3 tầng ngoại lệ tương ứng với các giai đoạn trong vòng đời `UC-04`:

### Tầng A — Ngoại lệ trước khi tạo đơn (Pre-Order Exceptions):
- **EX-01 (Giỏ hàng rỗng):** Nút đặt đơn bị vô hiệu hóa. Nếu client cố tình gọi `POST /orders` với `items: []`, backend trả về HTTP 400 Bad Request. Không tạo đơn.
- **EX-02 (Sản phẩm hết hàng / Không đủ tồn kho):** Backend kiểm tra `stock < quantity`, từ chối tạo đơn với HTTP 400 Bad Request hoặc HTTP 409 Conflict. Giỏ hàng được giữ nguyên để khách hàng điều chỉnh món.
- **EX-03 (Chưa xác thực hoặc JWT hết hạn):** `JwtAuthGuard` chặn request với HTTP 401 Unauthorized. Chuyển hướng khách hàng đăng nhập lại, bảo toàn giỏ hàng.
- **EX-04 (Sai lệch giá giữa client và server):** Backend tính lại giá theo dữ liệu CSDL. Nếu phát hiện client can thiệp sửa giá trái phép, trả về HTTP 400 Bad Request.

### Tầng B — Ngoại lệ trong khi lưu đơn hàng (Order Persistence Exceptions):
- **EX-05 (Lỗi CSDL khi lưu Order PENDING):** Database Transaction tạo đơn gặp sự cố kết nối hoặc lỗi ghi; hệ thống rollback 100%, trả về HTTP 500 Internal Server Error. Không tạo bản ghi rác, thông báo khách hàng thử lại.

### Tầng C — Ngoại lệ trong hành vi thanh toán bắt buộc UC-10 (Payment Exceptions):
- **EX-06 (Thanh toán bị cổng từ chối — mockOutcome = 'FAILED'):**
  - Cổng thanh toán phản hồi thất bại (thẻ lỗi hoặc ví không đủ số dư).
  - Bản ghi `Order` ở trạng thái `PENDING` đã tạo trước đó **không bị xóa bỏ**.
  - Hàm máy trạng thái chuyển trạng thái đơn hàng sang **`PAYMENT_FAILED`**.
  - Tồn kho thành phẩm không bị trừ; hệ thống **tuyệt đối không thông báo hoàn tất đặt hàng thành công**.
  - Màn hình thanh toán hiển thị lỗi chi tiết và cung cấp nút "Thanh toán lại" để khách hàng đổi phương thức hoặc thử lại (kích hoạt lại `UC-10`).
- **EX-07 (Thanh toán Timeout hoặc mạng chập chờn — mockOutcome = 'PENDING'):**
  - Đơn hàng tiếp tục duy trì ở trạng thái **`PENDING`**; bản ghi `Payment` lưu `status: 'PENDING'`.
  - Hệ thống thông báo giao dịch đang được xử lý, **không công bố UC-04 đã thành công**. Khách hàng được hướng dẫn kiểm tra lịch sử trước khi thử lại để tránh trừ tiền trùng.
- **EX-08 (Gửi lại request thanh toán trùng lặp — Idempotency Match):**
  - Backend phát hiện `Idempotency-Key` đã tồn tại trong CSDL và đã ở trạng thái `SUCCESS`.
  - Backend trả về ngay kết quả giao dịch trước đó (`isDuplicate = true`), không trừ tiền lần hai, không trừ kho lặp lại.
- **EX-09 (Xung đột tồn kho đồng thời khi thanh toán — OCC Conflict):**
  - Hai giao dịch thanh toán đồng thời cho ly nước cuối cùng; giao dịch thứ hai phát hiện lệch `version`.
  - Transaction thanh toán của giao dịch thứ hai bị rollback, trả về HTTP 409 Conflict. Đơn hàng giữ nguyên trạng thái hợp lệ để khách hàng xử lý, không bao giờ bị âm kho.

---

## 7. Ma Trận Truy Vết Yêu Cầu Chức Năng (FR Traceability)

| Thành phần của UC-04 | Mã FR Ánh Xạ | Tên Yêu Cầu Chức Năng (SRS 1.3.1) | Phân loại MoSCoW | Trách nhiệm thực thi |
| :--- | :---: | :--- | :---: | :--- |
| Nguồn dữ liệu thực đơn | **FR-01** | Xem menu đồ uống | Must Have | Cung cấp danh mục sản phẩm cho giỏ hàng. |
| Cấu hình size & topping | **FR-02** | Xem chi tiết, chọn size/topping | Must Have | Lưu snapshot kích cỡ và topping vào `OrderItem`. |
| Quản lý giỏ hàng client | **FR-03** | Quản lý giỏ hàng | Must Have | Đóng gói danh sách món thành payload `CreateOrderDto`. |
| Xác thực danh tính khách | **FR-04** | Đăng ký, đăng nhập và JWT | Must Have | Bảo vệ an ninh API `POST /orders` và `POST /payments`. |
| Khởi tạo đơn hàng PENDING | **FR-05** | Tạo đơn hàng | Must Have | Bước kỹ thuật tạo bản ghi `Order` ở trạng thái trung gian `PENDING`. |
| Thanh toán không tiền mặt | **FR-06** | Thanh toán mô phỏng | Must Have | Hành vi bắt buộc `UC-10` chuyển `Order` từ `PENDING` sang `PAID`. |
| Máy trạng thái đơn hàng | **FR-07** | Quản lý trạng thái đơn | Must Have | Kiểm soát chuyển tiếp hợp lệ `PENDING -> PAID` hoặc `PAYMENT_FAILED`. |
| Thanh toán Idempotent | **FR-08** | Idempotent Payment | Must Have | Header `Idempotency-Key` trong `UC-10` chống thanh toán trùng lặp. |
| Kiểm soát kho đồng thời | **FR-09** | Kiểm soát tồn kho đồng thời | Must Have | Kiểm tra kho ở FR-05 và trừ kho OCC (`version`) ở `UC-10`. |
| Khuyến mãi & Loyalty | **FR-10** | Mã khuyến mãi & Loyalty | Should Have | `UC-09` chiết khấu đơn hàng; `UC-11` tích điểm sau `PAID`. |
| Màn hình xác nhận thành công | **FR-11** | Xác nhận và lịch sử đơn | Must Have | Hiển thị mã nhận nước `#BL-xxxx` và huy hiệu `PAID` khi UC-04 thành công. |

---

## 8. Tiêu Chí Chấp Nhận Nghiệm Thu (Acceptance Criteria)

### 8.1 Nghiệm thu bước kỹ thuật Tạo đơn hàng (FR-05 Sub-step)
```gherkin
Scenario: Tạo đơn hàng trung gian PENDING thành công từ giỏ hàng
  Given khách hàng đã đăng nhập với JWT Token hợp lệ
  And giỏ hàng có ít nhất 1 sản phẩm còn tồn kho khả dụng
  When khách hàng gửi yêu cầu tạo đơn (POST /api/orders)
  Then hệ thống khởi tạo đơn hàng mới ở trạng thái PENDING
  And hệ thống cấp mã hiển thị duy nhất (orderCode) và lưu snapshot chi tiết từng món
  And API phản hồi HTTP 201 Created chứa orderId (UUID) và totalAmount
  And đơn hàng chưa được coi là đặt hàng thành công cho đến khi hoàn tất thanh toán
```

### 8.2 Nghiệm thu toàn trình Use Case UC-04 (Bao gồm UC-10)
```gherkin
Scenario: Khách hàng hoàn tất quy trình đặt hàng không tiền mặt thành công (Happy Path)
  Given đơn hàng đã được tạo ở trạng thái PENDING với tổng tiền 60.000đ
  When UC-04 thực thi hành vi thanh toán UC-10 qua cổng mô phỏng (POST /api/payments)
  Then Mock Payment Service phản hồi giao dịch được chấp thuận (SUCCESS)
  And hàm assertTransition chuyển trạng thái đơn hàng từ PENDING sang PAID
  And hệ thống trừ tồn kho thành phẩm tương ứng qua cơ chế khóa lạc quan OCC
  And giỏ hàng trên client được làm trống
  And giao diện hiển thị màn hình xác nhận đặt hàng thành công kèm mã nhận nước tại quầy
  And Use Case UC-04 chính thức hoàn tất thành công

Scenario: Xử lý khi thanh toán thất bại trong quy trình đặt hàng
  Given đơn hàng đang ở trạng thái PENDING
  When hành vi thanh toán UC-10 nhận kết quả thất bại (FAILED) từ cổng thanh toán
  Then trạng thái đơn hàng chuyển sang PAYMENT_FAILED
  And số lượng tồn kho thành phẩm không bị trừ
  And hệ thống không hiển thị thông báo đặt hàng thành công
  And thông tin đơn hàng được giữ lại để khách hàng có thể thực hiện thanh toán lại
```

---

## 9. Liên Kết Thiết Kế Kỹ Thuật (Task 2 Alignment)

Đặc tả Use Case `UC-04` theo định nghĩa mới là cơ sở trực tiếp cho các biểu đồ thiết kế trong **Task 2**:
1. **Lược đồ Lớp (Class Diagram):** Mô hình hóa cấu trúc quan hệ giữa thực thể `Order`, `OrderItem`, `Payment`, enum `OrderStatus` (`PENDING`, `PAID`, `PAYMENT_FAILED`) và cơ chế khóa lạc quan `version`.
2. **Sơ đồ Tuần tự (Sequence Diagram):** Biểu diễn chính xác chuỗi tương tác hai pha bên trong `UC-04`:
   - Pha 1: `Client -> OrdersController -> OrdersService -> DB Transaction 1 (Commit PENDING) -> HTTP 201 Created`.
   - Pha 2: `Client -> PaymentsController (UC-10) -> PaymentsService -> Mock Payment -> DB Transaction 2 (OCC Deduct Stock, Commit PAID) -> HTTP 200 OK -> Màn hình xác nhận`.
3. **Sơ đồ Máy trạng thái (State Machine Diagram):** Thể hiện rõ vòng đời chuyển đổi trạng thái của đơn hàng từ `Initial -> PENDING -> PAID` (hoặc `PAYMENT_FAILED`), khẳng định `PENDING` là trạng thái chờ và chỉ `PAID` mới đưa đơn vào chu trình pha chế.
