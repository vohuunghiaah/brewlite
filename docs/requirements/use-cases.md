# ĐẶC TẢ USE CASE CHI TIẾT (USE CASE SPECIFICATION)
## DỰ ÁN: BREWLITE — HỆ THỐNG ĐẶT CÀ PHÊ KHÔNG DÙNG TIỀN MẶT

- **Tên dự án:** BrewLite (Cashless Coffee Ordering Platform)
- **Tài liệu tham chiếu:** Assignment 1 (Task 10) & Assignment 2 (Task 1.3, Task 2)
- **Mã tài liệu:** `REQ-UC-01`
- **Phiên bản:** 1.0.0
- **Trạng thái:** Chính thức (Approved Baseline)

---

## 1. TỔNG QUAN PHẠM VI USE CASE TRỌNG TÂM

Theo yêu cầu tại **Task 1.3 (Assignment 2)**, hệ thống BrewLite tập trung đặc tả chi tiết và sâu sắc nhất cho Use Case cốt lõi sống còn của nền tảng:
> **Đặt và Thanh toán Đơn hàng (Place and Pay for Order)** — Mã định danh: `UC-CORE-01`

Use Case này bao hàm toàn bộ chuỗi mắt xích nghiệp vụ mang lại giá trị trực tiếp cho khách hàng và doanh thu cho cửa hàng, tích hợp đầy đủ 4 cơ chế kỹ thuật phức tạp nhất:
1. **Quản lý phiên xác thực (JWT Auth Guard)**
2. **Kiểm soát tồn kho đồng thời (Concurrency Control qua Optimistic Locking)**
3. **Thanh toán không tiền mặt Idempotent (Idempotency-Key Header)**
4. **Máy trạng thái đơn hàng (Order State Machine với hàm chặn `assertTransition`)**

---

## 2. ĐẶC TẢ CHI TIẾT USE CASE CỐT LÕI: UC-CORE-01

### 2.1 Thuộc tính định danh Use Case
| Thuộc tính | Chi tiết đặc tả |
| :--- | :--- |
| **Mã Use Case** | `UC-CORE-01` |
| **Tên Use Case** | Đặt và thanh toán đơn hàng (Place and Pay for Order) |
| **Phân loại** | Core Business Flow (Nghiệp vụ cốt lõi) |
| **Tác nhân chính (Primary Actor)** | **Khách hàng (Customer):** Người dùng trực tiếp thao tác trên ứng dụng web/PWA để chọn món, đặt hàng và thanh toán. |
| **Tác nhân phụ (Secondary Actors)** | 1. **Cổng thanh toán mô phỏng (Mock Payment Service):** Tiếp nhận yêu cầu thanh toán, kiểm tra idempotency và trả về kết quả giao dịch.<br>2. **Nhân viên quầy (Barista):** Tiếp nhận đơn hàng đã thanh toán thành công để chuẩn bị pha chế đồ uống. |
| **Sự kiện kích hoạt (Trigger)** | Khách hàng nhấn nút **"Thanh toán"** tại trang Giỏ hàng hoặc nhấn nút **"Xác nhận trả"** tại trang Thanh toán. |

### 2.2 Tiền điều kiện (Preconditions)
Để kích hoạt Use Case này, hệ thống và người dùng phải thỏa mãn các điều kiện tiên quyết:
1. Khách hàng đã truy cập vào ứng dụng BrewLite trên thiết bị hỗ trợ kết nối mạng Internet.
2. Giỏ hàng của khách hàng có ít nhất một (01) sản phẩm hợp lệ với số lượng lớn hơn 0.
3. Khách hàng có thể duyệt menu và thêm vào giỏ hàng ẩn danh; hệ thống yêu cầu đăng nhập/đăng ký tại bước checkout (hoặc đã đăng nhập sẵn).
4. Danh mục sản phẩm và đơn giá niêm yết đang hoạt động bình thường trên hệ thống cơ sở dữ liệu.

### 2.3 Hậu điều kiện (Postconditions)

#### Hậu điều kiện thành công (Success Postconditions):
1. Một bản ghi Đơn hàng mới (`Order`) được tạo lập và chuyển sang trạng thái **`PAID`**.
2. Mã số đơn hàng duy nhất (`orderCode`, ví dụ: `#1042`) được cấp phát cho khách hàng.
3. Số lượng tồn kho (`stock`) của tất cả sản phẩm trong đơn được trừ chính xác thông qua Database Transaction và cơ chế Optimistic Locking (cột `version` tăng thêm 1).
4. Bản ghi giao dịch thanh toán (`Payment`) được lưu trữ thành công với trạng thái `SUCCESS` và liên kết với khóa duy nhất `idempotencyKey`.
5. Điểm thưởng khách hàng thân thiết (Loyalty Points) được tính toán tự động và cộng dồn vào tài khoản khách hàng, đồng thời ghi nhận lịch sử vào bảng `LoyaltyTransaction`.
6. Giỏ hàng trên thiết bị client được làm trống (Clear Zustand Store).
7. Màn hình điều hướng hiển thị Trang Xác nhận thành công kèm mã đơn, huy hiệu `PAID`, và thông điệp: *"Mời tới quầy lấy nước"*.

#### Hậu điều kiện thất bại / Hủy bỏ (Failure Postconditions):
1. Số lượng tồn kho của các sản phẩm được hoàn nguyên nguyên vẹn (Transaction Rollback), tuyệt đối không bị trừ sai.
2. Không có điểm thưởng loyalty nào được cộng dồn.
3. Nếu giao dịch thanh toán bị cổng từ chối hoặc lỗi mạng, trạng thái đơn hàng được giữ ở `PAYMENT_FAILED` hoặc `PENDING`, giỏ hàng được giữ nguyên để khách hàng có thể chọn thanh toán lại hoặc thay đổi phương thức thanh toán.
4. Khách hàng nhận được thông báo lỗi trực quan kèm hướng dẫn hành động tương ứng.

---

## 3. LUỒNG SỰ KIỆN CHI TIẾT (FLOW OF EVENTS)

```
[ Khách hàng ]             [ Next.js Client ]          [ NestJS Backend API ]       [ Database / Payment ]
      │                            │                              │                             │
      │── 1. Nhấn "Thanh toán" ───►│                              │                             │
      │                            │── 2. POST /api/orders ──────►│                             │
      │                            │   (Bearer JWT, Items)        │── 3. DB Transaction ───────►│
      │                            │                              │   (Check stock, Create ORD) │
      │                            │◄─ 4. Trả về Order PENDING ───│◄────────────────────────────│
      │                            │                              │                             │
      │── 5. Chọn PT & Xác nhận ──►│                              │                             │
      │                            │── 6. POST /api/payments ────►│                             │
      │                            │   (Idempotency-Key)          │── 7. Mock Payment Call ────►│
      │                            │                              │── 8. AssertTransition PAID ─►│
      │                            │                              │── 9. Optimistic Deduct Stock│
      │                            │                              │── 10. Award Loyalty Points ─►│
      │                            │◄─ 11. Trả về PAID Result ────│◄────────────────────────────│
      │                            │                              │                             │
      │◄─ 12. Màn hình xác nhận ───│ (Clear Cart)                 │                             │
          (Mã #xxxx, PAID, Lấy nước)
```

### 3.1 Luồng Chính Thành Công (Main Success Scenario / Happy Path)
- **Bước 1:** Khách hàng duyệt Menu (`GET /api/products`), xem chi tiết món (`GET /api/products/:id`), chọn kích cỡ (Size M) và topping (Kem cheese), sau đó nhấn "Thêm vào giỏ hàng".
- **Bước 2:** Khách hàng mở Giỏ hàng kiểm tra danh sách món, tổng số tiền (ví dụ: 60.000đ), và nhấn nút **"Thanh toán"**.
- **Bước 3:** Ứng dụng Next.js kiểm tra trạng thái xác thực. Do khách hàng đã đăng nhập, client gửi yêu cầu tạo đơn hàng:
  - `POST /api/orders`
  - Header: `Authorization: Bearer <accessToken>`
  - Body:
    ```json
    {
      "items": [
        {
          "productId": "prod-cappuccino-uuid",
          "size": "M",
          "toppings": ["Kem cheese"],
          "quantity": 1
        }
      ],
      "note": "Ít ngọt"
    }
    ```
- **Bước 4:** Backend NestJS tiếp nhận request qua `JwtAuthGuard`, DTO `CreateOrderDto` validate hợp lệ dữ liệu:
  - Khởi tạo Prisma Interactive Transaction.
  - Kiểm tra số lượng tồn kho khả dụng (`stock >= quantity`).
  - Tạo bản ghi `Order` với trạng thái ban đầu là **`PENDING`**, mã đơn duy nhất (ví dụ: `ORD-1042`).
  - Tạo các bản ghi con `OrderItem` tương ứng.
  - Commit transaction và phản hồi HTTP 201 Created chứa `orderId`, `orderCode`, `totalAmount`.
- **Bước 5:** Ứng dụng Next.js chuyển sang màn hình Chọn phương thức thanh toán. Khách hàng chọn hình thức **"Ví điện tử (E-Wallet)"** và nhấn nút **"Xác nhận trả"**.
- **Bước 6:** Ứng dụng Next.js sinh mã duy nhất UUID-v4 (ví dụ: `c73a21b4-921a-4d7a-b5a8-2081f2df9841`) để làm `Idempotency-Key`:
  - **Cơ chế lưu trữ bền bỉ tại Client (Idempotency Key Persistence):** Mã `Idempotency-Key` được gắn kết chặt chẽ với `orderId` và lưu trữ trực tiếp trong `sessionStorage` của trình duyệt (`sessionStorage.setItem('idemp_' + orderId, idempotencyKey)`). Khi người dùng nhấn F5/reload trang hoặc bị rớt mạng giữa chừng, client khôi phục lại chính xác key này từ `sessionStorage` thay vì sinh key mới, ngăn chặn nguy cơ mồ côi đơn hàng hoặc xung đột trạng thái.
  - Client gửi request thanh toán:
    - `POST /api/payments`
    - Headers:
      - `Authorization: Bearer <accessToken>`
      - `Idempotency-Key: c73a21b4-921a-4d7a-b5a8-2081f2df9841`
    - Body:
      ```json
      {
        "orderId": "order-uuid-1042",
        "method": "E_WALLET",
        "amount": 60000
      }
      ```
  - **Quy tắc an ninh bắt buộc của Backend (Backend Security Rule - Amount Verification):**
    - Backend truy vấn đơn hàng từ CSDL theo `orderId` và bắt buộc đối chiếu tính toàn vẹn:
      $$\text{payload.amount} === \text{order.totalAmount}$$
    - Nếu số tiền gửi lên sai lệch dù chỉ 1 đồng so với tổng tiền trong CSDL (dấu hiệu gian lận Client Tampering), Backend lập tức từ chối giao dịch với mã lỗi **HTTP 400 Bad Request** (`{"statusCode": 400, "message": "Payment amount mismatch with order total"}`), ngăn chặn triệt để mọi hành vi can thiệp giá từ phía client.
- **Bước 7:** Backend NestJS kiểm tra khóa Idempotency trong cơ sở dữ liệu:
  - Xác nhận khóa `c73a21b4-...` chưa từng được sử dụng.
  - Khởi tạo khóa tạm thời để tránh xung đột race condition nếu có request gửi đồng thời.
- **Bước 8:** Backend gọi dịch vụ thanh toán mô phỏng (Mock Payment Service):
  - Dịch vụ xác thực tính hợp lệ của số tiền và phương thức.
  - Phản hồi giao dịch được chấp thuận (Giao dịch thành công).
- **Bước 9:** Backend thực hiện chuỗi nghiệp vụ cập nhật cơ sở dữ liệu bên trong một Database Transaction:
  1. Kiểm tra chuyển đổi trạng thái bằng hàm máy trạng thái: `assertTransition(order.status, OrderStatus.PAID)` $\rightarrow$ Chuyển từ `PENDING` sang `PAID` thành công.
  2. Thực hiện trừ tồn kho theo cơ chế **Optimistic Locking**:
     ```sql
     UPDATE "Product"
     SET stock = stock - 1, version = version + 1
     WHERE id = 'prod-cappuccino-uuid' AND stock >= 1 AND version = :currentVersion;
     ```
  3. Tạo bản ghi thanh toán `Payment` với `status = 'SUCCESS'`, `idempotencyKey = 'c73a21b4-...'`.
  4. Tính toán điểm thưởng khách hàng thân thiết (60.000đ $\rightarrow$ 6 điểm loyalty), ghi nhận bản ghi vào bảng `LoyaltyTransaction` và cập nhật điểm tích lũy của người dùng.
- **Bước 10:** Backend commit transaction thành công và trả về phản hồi HTTP 200 OK:
  ```json
  {
    "paymentId": "pay-uuid-5566",
    "orderId": "order-uuid-1042",
    "orderCode": "#1042",
    "status": "SUCCESS",
    "orderStatus": "PAID",
    "earnedLoyaltyPoints": 6
  }
  ```
- **Bước 11:** Ứng dụng Next.js làm trống giỏ hàng (Clear Zustand store), sau đó chuyển hướng người dùng sang trang Xác nhận đơn hàng (`/order/confirmation`).
- **Bước 12:** Màn hình hiển thị biểu tượng chữ V xanh $\checkmark$, tiêu đề *"Đặt hàng thành công"*, mã đơn `#1042`, huy hiệu trạng thái `PAID`, và thông điệp: *"Mời tới quầy lấy nước"*. Khách hàng có thể nhấn nút "Về trang chủ" hoặc vào "Lịch sử đơn hàng" để theo dõi.

---

### 3.2 Các Luồng Thay Thế (Alternative Flows)

#### Alt-1: Thanh toán bằng phương thức Thẻ ngân hàng (Bank Card)
- Tại **Bước 5**, thay vì chọn Ví điện tử, khách hàng chọn tùy chọn **"Thẻ ngân hàng"**.
- Tại **Bước 6**, request gửi `POST /api/payments` với trường `"method": "BANK_CARD"`.
- Hệ thống Mock Payment Service xử lý qua cổng thẻ giả lập, luồng tiếp tục thành công như Bước 8 trở đi.

#### Alt-2: Khách hàng áp dụng mã giảm giá (Promotion Voucher)
- Tại **Bước 2**, tại giao diện Giỏ hàng hoặc Checkout, khách hàng nhập mã khuyến mãi (ví dụ: `BREW20` - giảm 20%).
- Client gửi kiểm tra mã voucher. Hệ thống tính toán số tiền chiết khấu (ví dụ: giảm 12.000đ), cập nhật lại tổng tiền đơn hàng thành 48.000đ.
- Tại **Bước 3**, payload `POST /api/orders` bổ sung trường `"promoCode": "BREW20"`.
- Backend xác thực tính hợp lệ của voucher (ngày hết hạn, đơn tối thiểu, giới hạn sử dụng), ghi nhận `discountAmount = 12000` và `totalAmount = 48000`.
- Số tiền thanh toán tại Bước 6 sẽ là 48.000đ. Các bước tiếp theo diễn ra bình thường.

#### Alt-3: Khách hàng tùy biến nhiều món và nhiều loại topping
- Tại **Bước 1**, khách hàng có thể chọn nhiều món khác nhau, mỗi món có các tùy chọn size riêng biệt (S, M, L) và nhiều topping cùng lúc (Trân châu, Kem cheese, Thạch dừa).
- Giá của từng dòng sản phẩm (`lineTotal`) được tính chính xác bằng công thức:
  $$\text{lineTotal} = (\text{Base Price} + \text{Size Surcharge} + \sum \text{Topping Prices}) \times \text{Quantity}$$
- Luồng tiếp tục sang Bước 2 với tổng tiền được cộng dồn chính xác.

#### Alt-4: Khách hàng chưa đăng nhập khi nhấn "Thanh toán"
- Tại **Bước 3**, ứng dụng Next.js kiểm tra trạng thái đăng nhập và phát hiện khách hàng chưa có JWT Token.
- Client lưu trạng thái giỏ hàng hiện tại vào `localStorage`, sau đó điều hướng khách hàng sang trang Đăng nhập (`/login`).
- Khách hàng đăng nhập (hoặc đăng ký mới tài khoản) thành công, nhận JWT Token.
- Sau khi xác thực thành công, client tự động điều hướng khách hàng quay trở lại trang Checkout và khôi phục giỏ hàng, tiếp tục thực hiện từ Bước 3 của luồng chính.

#### Alt-5: Gửi lại yêu cầu thanh toán với cùng Idempotency-Key (Client Retry)
- Tại **Bước 6**, giả sử request thanh toán đã được backend xử lý thành công ở Bước 10 nhưng trên đường truyền mạng phản hồi về bị ngắt kết nối (Network Dropped).
- Khách hàng bấm lại nút "Xác nhận trả" hoặc tải lại trang: Next.js Client tự động khôi phục lại `Idempotency-Key` ban đầu từ `sessionStorage` (theo `orderId`) thay vì sinh key mới, và gửi lại request `POST /api/payments` với chính xác key này.
- Tại **Bước 7**, Backend truy vấn bảng `Payment` và phát hiện khóa đã tồn tại và đã ở trạng thái `SUCCESS`.
- Backend **ngay lập tức trả về kết quả thành công của giao dịch trước đó** mà không thực hiện trừ kho lần hai, không gọi lại Mock Payment, và không cộng trùng lặp điểm loyalty.

---

### 3.3 Các Luồng Ngoại Lệ (Exception Flows)

#### Exc-1: Hết hàng hoặc xung đột tồn kho đồng thời (Out of Stock / Concurrency Conflict)
- **Tình huống:** Tại thời điểm khách hàng gửi `POST /api/orders` hoặc khi thực thi trừ kho trong transaction ở `POST /api/payments`, sản phẩm đã bị khách hàng khác mua hết (`stock < quantity` hoặc câu lệnh Optimistic Lock `version` bị lệch).
- **Hành động hệ thống & Quy trình bồi hoàn tự động (Automated Refund/Reversal):**
  1. Câu lệnh `UPDATE "Product" ... WHERE version = :version AND stock >= :qty` cập nhật được 0 bản ghi do hết hàng hoặc xung đột phiên bản.
  2. Transaction cơ sở dữ liệu bị tự động Rollback hoàn toàn.
  3. **Cơ chế bồi hoàn tự động (Compensating Transaction / Auto-Refund):** Nếu cổng Mock Payment Service đã chấp thuận giao dịch trừ tiền ở Bước 8 trước khi phát hiện xung đột trừ kho ở Bước 9:
     - Backend lập tức kích hoạt hàm hoàn tiền bồi hoàn: `mockPaymentService.refund(paymentReference, amount)`.
     - Cập nhật bản ghi thanh toán sang trạng thái `REFUNDED` và ghi nhật ký kiểm toán (Audit Log).
     - Trạng thái đơn hàng chuyển sang `CANCELLED` với lý do: *"Hết hàng trong lúc trừ kho - Đã tự động bồi hoàn 100% tiền vào tài khoản khách"*.
  4. Backend ném ngoại lệ `InsufficientStockException` kèm mã lỗi HTTP 409 Conflict:
     ```json
     {
       "statusCode": 409,
       "error": "Conflict",
       "message": "Sản phẩm đã hết hàng trong quá trình thanh toán. Số tiền đã thanh toán đã được tự động hoàn trả đầy đủ."
     }
     ```
  5. Frontend hiển thị thông báo lỗi nổi bật màu đỏ: *"Rất tiếc, sản phẩm vừa hết hàng. Tiền thanh toán của quý khách đã được hoàn trả nguyên vẹn ngay lập tức. Vui lòng chọn món khác!"*. Giỏ hàng giữ nguyên để người dùng điều chỉnh.

#### Exc-2: Phiên đăng nhập hết hạn hoặc Token không hợp lệ (Invalid / Expired JWT)
- **Tình huống:** Tại Bước 3 hoặc Bước 6, mã Bearer JWT gửi kèm đã hết hạn hoặc chữ ký bị giả mạo.
- **Hành động hệ thống:**
  1. `JwtAuthGuard` của NestJS phát hiện token không hợp lệ, lập tức chặn request trước khi vào Controller.
  2. API phản hồi mã lỗi HTTP 401 Unauthorized:
     ```json
     {
       "statusCode": 401,
       "error": "Unauthorized",
       "message": "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."
     }
     ```
  3. Frontend xóa token cũ khỏi bộ nhớ, hiển thị thông báo và chuyển hướng khách hàng sang trang Đăng nhập. Giỏ hàng vẫn được bảo toàn trong Zustand Store.

#### Exc-3: Cổng thanh toán mô phỏng báo lỗi / Giao dịch bị từ chối (Payment Gateway Failed)
- **Tình huống:** Tại Bước 8, Mock Payment Service mô phỏng trường hợp thẻ bị từ chối hoặc ví không đủ số dư.
- **Hành động hệ thống:**
  1. Mock Payment trả về kết quả `status = "FAILED"`.
  2. Hàm `assertTransition` chuyển trạng thái đơn hàng sang **`PAYMENT_FAILED`**.
  3. Không thực hiện trừ kho và không cộng điểm loyalty.
  4. API trả về HTTP 422 Unprocessable Entity kèm thông điệp: *"Giao dịch thanh toán không thành công. Vui lòng kiểm tra lại phương thức thanh toán."*
  5. Màn hình thanh toán hiển thị nút **"Thử lại"** hoặc cho phép chọn phương thức thanh toán khác, không xóa giỏ hàng của khách.

#### Exc-4: Mất kết nối mạng toàn phần (Network Failure / Client Timeout)
- **Tình huống:** Thiết bị người dùng mất kết nối Internet khi đang gửi request thanh toán.
- **Hành động hệ thống:**
  1. Thư viện API Client trên Next.js bắt lỗi `NetworkError` / `AxiosTimeout`.
  2. Giao diện hiển thị cảnh báo: *"Mất kết nối mạng. Hệ thống sẽ thử kết nối lại..."*.
  3. Nhờ cơ chế `Idempotency-Key` được lưu trữ tại client, khi mạng phục hồi và client gửi lại request, hệ thống đảm bảo an toàn tuyệt đối, không xảy ra rủi ro thanh toán trùng.

#### Exc-5: Chuyển đổi trạng thái đơn hàng sai quy tắc (Invalid State Transition Violation)
- **Tình huống:** Một request bất thường cố gắng chuyển đơn hàng từ trạng thái đã hủy (`CANCELLED`) sang `PAID`, hoặc từ `PENDING` sang `COMPLETED`.
- **Hành động hệ thống:**
  1. Hàm `assertTransition(currentStatus, nextStatus)` kiểm tra danh sách chuyển tiếp hợp lệ và phát hiện vi phạm.
  2. Ném ngoại lệ `InvalidStateTransitionException`.
  3. API trả về mã lỗi HTTP 400 Bad Request kèm chi tiết: *"Không thể chuyển trạng thái đơn hàng từ CANCELLED sang PAID"*.
  4. Trạng thái trong cơ sở dữ liệu giữ nguyên vẹn.

---

## 4. MA TRẬN CHUYỂN ĐỔI TRẠNG THÁI ĐƠN HÀNG (STATE TRANSITION MATRIX)

Hàm kiểm soát máy trạng thái `assertTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void` là cơ chế bảo vệ tính toàn vẹn nghiệp vụ cốt lõi tại tầng Backend, loại bỏ hoàn toàn việc chuyển trạng thái sai hoặc nhảy cóc chu trình.

### 4.1 Bảng ma trận chuyển đổi trạng thái hợp lệ (`assertTransition`)

| Trạng thái hiện tại (`currentStatus`) | Các trạng thái kế tiếp hợp lệ (`nextStatus`) | Tác nhân kích hoạt (Actor) | API Endpoint / Sự kiện | Ràng buộc nghiệp vụ & Bồi hoàn |
| :--- | :--- | :--- | :--- | :--- |
| **`PENDING`** | **`PAID`** | Cổng thanh toán mô phỏng | `POST /api/payments` | Thanh toán thành công; trừ kho Optimistic Lock; cộng điểm Loyalty. |
| | **`PAYMENT_FAILED`** | Cổng thanh toán mô phỏng | `POST /api/payments` | Cổng từ chối/lỗi thẻ; không trừ kho; giữ nguyên giỏ hàng. |
| | **`CANCELLED`** | Khách hàng / Hệ thống | `PATCH /api/orders/:id/cancel` | Khách chủ động hủy đơn trước khi thanh toán; không phát sinh bồi hoàn. |
| **`PAYMENT_FAILED`** | **`PAID`** | Cổng thanh toán mô phỏng | `POST /api/payments` | Khách bấm "Thử lại" và thanh toán thành công; trừ kho; cộng điểm Loyalty. |
| | **`CANCELLED`** | Khách hàng / Quản trị viên | `PATCH /api/orders/:id/cancel` | Khách hủy đơn không thanh toán tiếp; đóng đơn hàng. |
| **`PAID`** | **`PREPARING`** | Nhân viên Barista | `PATCH /api/orders/:id/status` | Yêu cầu vai trò `BARISTA`/`STAFF`; Barista bắt đầu pha chế đồ uống. |
| | **`CANCELLED`** | Quản trị viên / Barista | `PATCH /api/orders/:id/cancel` | Hủy sự cố (hỏng máy/thiếu nguyên liệu); **Bắt buộc hoàn tiền tự động (Refund)** và hoàn kho. |
| **`PREPARING`** | **`READY`** | Nhân viên Barista | `PATCH /api/orders/:id/status` | Yêu cầu vai trò `BARISTA`/`STAFF`; Đồ uống hoàn tất, sẵn sàng tại quầy nhận. |
| | **`CANCELLED`** | Quản trị viên / Barista | `PATCH /api/orders/:id/cancel` | Hủy sự cố khẩn cấp; **Bắt buộc hoàn tiền tự động (Refund)**. |
| **`READY`** | **`COMPLETED`** | Nhân viên Barista | `PATCH /api/orders/:id/status` | Khách đã nhận đồ uống tại quầy; kết thúc chu trình phục vụ. |
| **`COMPLETED`** | *(Không có chuyển tiếp)* | N/A | N/A | **Trạng thái kết thúc (Terminal State):** Đơn hàng hoàn tất viên mãn, cấm mọi chuyển tiếp tiếp theo. |
| **`CANCELLED`** | *(Không có chuyển tiếp)* | N/A | N/A | **Trạng thái kết thúc (Terminal State):** Đơn hàng đã đóng, cấm mọi chuyển tiếp hoặc phục hồi. |

### 4.2 Quy tắc thực thi và xử lý ngoại lệ
1. Nếu cặp `(currentStatus, nextStatus)` không nằm trong danh mục chuyển tiếp hợp lệ ở Bảng 4.1, hàm `assertTransition()` lập tức ném ngoại lệ `InvalidStateTransitionException`.
2. Lớp Exception Filter chuyển hóa thành phản hồi lỗi HTTP 400 Bad Request:
   ```json
   {
     "statusCode": 400,
     "error": "Bad Request",
     "message": "Không thể chuyển trạng thái đơn hàng từ [currentStatus] sang [nextStatus]"
   }
   ```
3. Mọi chuyển đổi từ `PAID` hoặc `PREPARING` sang `CANCELLED` bắt buộc phải kèm theo giao dịch bồi hoàn tự động (`mockPaymentService.refund()`) để bảo vệ quyền lợi tài chính của khách hàng.

---

## 5. MA TRẬN TRUY VẾT YÊU CẦU CHO USE CASE UC-CORE-01 (TRACEABILITY MAPPING)

| Thành phần của Use Case | Mã Yêu Cầu Chức Năng (FR) | Mã Yêu Cầu Phi Chức Năng (NFR) | Mã Kiểm Thử Dự Kiến (Test ID) |
| :--- | :--- | :--- | :--- |
| Duyệt danh mục & chọn món | `FR-01` | `NFR-01` (Latency < 500ms) | `API-PROD-01`, `UI-MENU-01` |
| Tùy biến Size & Topping | `FR-02` | `NFR-03` (Mobile-First UI) | `UNIT-CALC-01`, `UI-CUSTOM-01` |
| Quản lý giỏ hàng & tính giá | `FR-03` | `NFR-03` (Client State) | `UNIT-CART-01`, `UI-CART-01` |
| Xác thực tài khoản khách | `FR-04` | `NFR-02` (Bcrypt, JWT Guard) | `API-AUTH-01`, `SEC-JWT-01` |
| Tạo đơn hàng PENDING | `FR-05` | `NFR-04` (ACID Transaction) | `INT-ORD-01`, `API-ORD-01` |
| Thanh toán không tiền mặt | `FR-06` | `NFR-01` (Fast response) | `INT-PAY-01`, `API-PAY-01` |
| Máy trạng thái đơn hàng | `FR-07` | `NFR-04` (State Integrity) | `UNIT-SM-01`, `UNIT-SM-02` |
| Thanh toán Idempotent | `FR-08` | `NFR-04` (Anti-duplicate) | `INT-IDEMP-01`, `INT-IDEMP-02` |
| Kiểm soát tồn kho Optimistic | `FR-09` | `NFR-04` (No overselling) | `CONC-STOCK-01`, `CONC-STOCK-02` |
| Khuyến mãi & Loyalty | `FR-10` | `NFR-04` (Loyalty calculation) | `UNIT-LOYAL-01`, `UNIT-PROMO-01` |
| Màn hình xác nhận & Lịch sử | `FR-11` | `NFR-02` (Anti-IDOR `/me`) | `UI-CONFIRM-01`, `E2E-ORDER-01` |
| Cập nhật trạng thái pha chế | `FR-12` | `NFR-02` (Roles Guard, Staff) | `API-STAFF-01`, `UNIT-SM-03` |

---
*Tài liệu đặc tả Use Case này là căn cứ trực tiếp để xây dựng Sơ đồ Hoạt động (Activity Diagram), Sơ đồ Tuần tự (Sequence Diagram), Lược đồ Lớp (Class Diagram) trong Task 2 và cài đặt kiểm thử tự động trong Task 4 & 5.*
