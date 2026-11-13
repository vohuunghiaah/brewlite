# ĐẶC TẢ USE CASE CHI TIẾT (USE CASE SPECIFICATION)
## DỰ ÁN: BREWLITE — HỆ THỐNG ĐẶT CÀ PHÊ KHÔNG DÙNG TIỀN MẶT

- **Tên dự án:** BrewLite (Cashless Coffee Ordering Platform)
- **Tài liệu tham chiếu:** Assignment 1 (Task 10) & Assignment 2 (Task 1.3, Task 2)
- **Mã tài liệu:** `REQ-UC-01`
- **Phiên bản:** 1.2.0 (Post-Merge Audit & Corrective Maintenance)
- **Trạng thái:** Đề xuất nghiệm thu Task 1 (Proposed Baseline for Task 1 Review)

---

## 1. TỔNG QUAN PHẠM VI USE CASE TRỌNG TÂM

Theo yêu cầu tại **Task 1.3 (Assignment 2)**, hệ thống BrewLite tập trung đặc tả chi tiết và sâu sắc nhất cho Use Case cốt lõi sống còn của nền tảng:
> **Đặt và Thanh toán Đồ uống (Place and Pay for Drink Order)** — Mã định danh: `UC-CORE-01`

Use Case này bao hàm toàn bộ chuỗi mắt xích nghiệp vụ mang lại giá trị trực tiếp cho khách hàng và doanh thu cho cửa hàng, tích hợp đầy đủ các cơ chế kỹ thuật phức tạp nhất:
1. **Quản lý phiên xác thực (JWT Auth Guard)**
2. **Kiểm soát tồn kho thành phẩm đồng thời (Concurrency Control qua Optimistic Locking)**
3. **Thanh toán không tiền mặt Idempotent (Idempotency-Key Header)**
4. **Máy trạng thái đơn hàng (Order State Machine với hàm chặn `assertTransition`)**

---

## 2. ĐẶC TẢ CHI TIẾT USE CASE CỐT LÕI: UC-CORE-01

### 2.1 Thuộc tính định danh Use Case
| Thuộc tính | Chi tiết đặc tả |
| :--- | :--- |
| **Mã Use Case** | `UC-CORE-01` |
| **Tên Use Case** | Đặt và thanh toán đồ uống (Place and Pay for Drink Order) |
| **Phân loại** | Core Business Flow (Nghiệp vụ cốt lõi) |
| **Tác nhân chính (Primary Actor)** | **Khách hàng (Customer):** Người dùng trực tiếp thao tác trên ứng dụng web/PWA để xem menu, tùy chọn món, quản lý giỏ hàng, đặt hàng và thanh toán. |
| **Tác nhân phụ (Secondary Actors)** | 1. **Cổng thanh toán mô phỏng (Mock Payment Service):** Tiếp nhận yêu cầu thanh toán, kiểm tra tính duy nhất qua Idempotency-Key và trả về kết quả giao dịch.<br>2. **Nhân viên quầy (Barista):** Tiếp nhận đơn hàng đã thanh toán thành công (`PAID`) để chuẩn bị pha chế đồ uống. |
| **Sự kiện kích hoạt (Trigger)** | Khách hàng nhấn nút **"Thanh toán"** tại trang Giỏ hàng hoặc nhấn nút **"Xác nhận thanh toán"** tại trang Checkout. |

### 2.2 Tiền điều kiện (Preconditions)
Để kích hoạt Use Case này, hệ thống và người dùng phải thỏa mãn các điều kiện tiên quyết:
1. Khách hàng đã truy cập vào ứng dụng BrewLite trên thiết bị hỗ trợ kết nối mạng Internet.
2. Giỏ hàng của khách hàng có ít nhất một (01) sản phẩm hợp lệ với số lượng lớn hơn 0.
3. Các sản phẩm trong giỏ hàng đang ở trạng thái kinh doanh (`isAvailable = true`) và có số lượng tồn kho thành phẩm khả dụng (`stock >= quantity`).
4. Khách hàng đã đăng nhập tài khoản hợp lệ (hoặc thực hiện đăng nhập/đăng ký tại bước checkout trước khi xác nhận đơn).
5. Dịch vụ cơ sở dữ liệu PostgreSQL và dịch vụ thanh toán mô phỏng đang hoạt động bình thường.

### 2.3 Hậu điều kiện (Postconditions)

#### Hậu điều kiện thành công (Success Postconditions):
1. Một bản ghi Đơn hàng mới (`Order`) được tạo lập và chuyển sang trạng thái **`PAID`**.
2. Mã định danh đơn hàng duy nhất (`id` - UUID) và mã hiển thị nhận nước (`orderCode`, ví dụ: `#BL-1042`) được cấp phát cho khách hàng.
3. Số lượng tồn kho thành phẩm (`stock`) của tất cả sản phẩm trong đơn được trừ chính xác thông qua Database Transaction và cơ chế Optimistic Locking (cột `version` tăng thêm 1).
4. Bản ghi giao dịch thanh toán (`Payment`) được lưu trữ thành công với trạng thái `SUCCESS` và liên kết với khóa duy nhất `idempotencyKey`.
5. Điểm thưởng khách hàng thân thiết (Loyalty Points) được tính toán tự động và cộng dồn vào tài khoản khách hàng, đồng thời ghi nhận lịch sử vào bảng `LoyaltyTransaction`.
6. Giỏ hàng trên thiết bị client được làm trống.
7. Màn hình điều hướng hiển thị Trang Xác nhận thành công kèm mã đơn, huy hiệu `PAID`, và thông điệp: *"Mời tới quầy lấy nước"*.

#### Hậu điều kiện thất bại / Hủy bỏ (Failure Postconditions):
1. Số lượng tồn kho thành phẩm của các sản phẩm được hoàn nguyên nguyên vẹn (Transaction Rollback), tuyệt đối không bị trừ sai.
2. Không có điểm thưởng loyalty nào được cộng dồn.
3. Nếu giao dịch thanh toán bị cổng từ chối hoặc lỗi mạng, trạng thái đơn hàng được giữ ở `PAYMENT_FAILED` hoặc `PENDING`, giỏ hàng được giữ nguyên để khách hàng có thể chọn thanh toán lại hoặc thay đổi phương thức thanh toán.
4. Khách hàng nhận được thông báo lỗi trực quan kèm hướng dẫn hành động tương ứng, không bị trừ tiền oan.

---

## 3. LUỒNG SỰ KIỆN CHI TIẾT (FLOW OF EVENTS)

```
[ Khách hàng ]             [ Next.js Client ]          [ NestJS Backend API ]       [ Database / Payment ]
      │                            │                              │                             │
      │── 1. Nhấn "Thanh toán" ───►│                              │                             │
      │                            │── 2. POST /orders ──────────►│                             │
      │                            │   (Bearer JWT, Items, DTO)   │── 3. DB Transaction ───────►│
      │                            │                              │   (Check stock, Create ORD) │
      │                            │◄─ 4. Trả về Order PENDING ───│◄────────────────────────────│
      │                            │                              │                             │
      │── 5. Chọn PT & Xác nhận ──►│                              │                             │
      │                            │── 6. POST /payments ────────►│                             │
      │                            │   (Idempotency-Key, DTO)     │── 7. Mock Payment Call ────►│
      │                            │                              │── 8. AssertTransition PAID ─►│
      │                            │                              │── 9. Optimistic Deduct Stock│
      │                            │                              │── 10. Award Loyalty Points ─►│
      │                            │◄─ 11. Trả về PAID Result ────│◄────────────────────────────│
      │                            │                              │                             │
      │◄─ 12. Màn hình xác nhận ───│ (Clear Cart)                 │                             │
          (Mã #BL-xxxx, PAID)
```

> [!NOTE]
> **Ghi chú về Hợp đồng Dữ liệu (API Contract Baseline):**
> Trong tài liệu này, cấu trúc JSON đặc tả theo chuẩn thiết kế module hóa chuẩn hóa (Prisma ORM trên nhánh Sprint 1: `id` định dạng UUID string, `size` là enum `SMALL | MEDIUM | LARGE`, `orderCode` định dạng `#BL-xxxx`, `note` thuộc cấp `Order`).
> Trên nhánh `main` hiện tại (TypeORM), `id` sử dụng số nguyên (`number`), các trường dữ liệu có sự ánh xạ tương ứng. Xem chi tiết đối chiếu tại Bảng ma trận truy vết.

### 3.1 Luồng Chính Thành Công (Main Success Scenario / Happy Path)
- **Bước 1:** Khách hàng duyệt Menu (`GET /products`), xem chi tiết món (`GET /products/:id`), chọn kích cỡ (Size: `MEDIUM`), chọn topping (`["Kem cheese"]`), và nhập mức đường/đá trong ghi chú đơn hàng (`"50% đường, ít đá, mang đi"`), sau đó nhấn "Thêm vào giỏ hàng".
- **Bước 2:** Khách hàng mở Giỏ hàng kiểm tra danh sách món, tổng số tiền tạm tính (ví dụ: 60.000đ), nhập mã giảm giá `BREW20` (giảm 12.000đ, còn 48.000đ) và nhấn nút **"Thanh toán"**.
- **Bước 3:** Ứng dụng Next.js kiểm tra trạng thái xác thực. Do khách hàng đã đăng nhập, client gửi yêu cầu tạo đơn hàng:
  - `POST /orders`
  - Header: `Authorization: Bearer <accessToken>`
  - Body (chuẩn `CreateOrderDto`):
    ```json
    {
      "items": [
        {
          "productId": "prod-cappuccino-uuid",
          "size": "MEDIUM",
          "toppings": [
            "Kem cheese"
          ],
          "quantity": 1
        }
      ],
      "note": "50% đường, ít đá, mang đi",
      "promoCode": "BREW20"
    }
    ```
- **Bước 4:** Backend NestJS tiếp nhận request qua `JwtAuthGuard`, DTO `CreateOrderDto` validate hợp lệ dữ liệu:
  - Khởi tạo Database Transaction.
  - Kiểm tra tính khả dụng và tồn kho thành phẩm (`isAvailable = true`, `stock >= quantity`).
  - Kiểm tra giá niêm yết phía server và áp dụng mã giảm giá `BREW20` (Server-side Pricing & Promo Calculation).
  - Tạo bản ghi `Order` với trạng thái ban đầu là **`PENDING`**, mã định danh `id` kiểu UUID và mã nhận món hiển thị `orderCode` (ví dụ: `#BL-1042`).
  - Tạo các bản ghi con `OrderItem` tương ứng.
  - Commit transaction và phản hồi HTTP 201 Created:
    ```json
    {
      "id": "ord-8f7b2c1a-5d4e-4f3a-9b1c-2e3d4f5a6b7c",
      "orderCode": "#BL-1042",
      "userId": "usr-9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
      "status": "PENDING",
      "subtotal": "60000.00",
      "discountAmount": "12000.00",
      "totalAmount": "48000.00",
      "note": "50% đường, ít đá, mang đi",
      "promoCode": "BREW20",
      "createdAt": "2026-11-14T00:00:00.000Z",
      "items": [
        {
          "id": "item-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
          "orderId": "ord-8f7b2c1a-5d4e-4f3a-9b1c-2e3d4f5a6b7c",
          "productId": "prod-cappuccino-uuid",
          "size": "MEDIUM",
          "toppings": [
            "Kem cheese"
          ],
          "quantity": 1,
          "unitPrice": "60000.00",
          "lineTotal": "60000.00"
        }
      ]
    }
    ```
- **Bước 5:** Ứng dụng Next.js chuyển sang màn hình Thanh toán. Khách hàng chọn hình thức **"Ví điện tử (E_WALLET)"** và nhấn nút **"Xác nhận thanh toán"**.
- **Bước 6:** Ứng dụng Next.js sinh mã duy nhất UUID-v4 làm `Idempotency-Key` (ví dụ: `c73a21b4-921a-4d7a-b5a8-2081f2df9841`):
  - Client gửi request thanh toán:
    - `POST /payments`
    - Headers:
      - `Authorization: Bearer <accessToken>`
      - `Idempotency-Key: c73a21b4-921a-4d7a-b5a8-2081f2df9841`
    - Body (chuẩn `ProcessPaymentDto`):
      ```json
      {
        "orderId": "ord-8f7b2c1a-5d4e-4f3a-9b1c-2e3d4f5a6b7c",
        "method": "E_WALLET",
        "amount": 48000,
        "mockOutcome": "SUCCESS"
      }
      ```
  - **Quy tắc bảo vệ giá phía Backend (Amount Verification):**
    - Backend truy vấn đơn hàng từ CSDL theo `orderId` và bắt buộc đối chiếu tính toàn vẹn: `payload.amount === order.totalAmount`. Nếu phát hiện sai lệch, lập tức từ chối với HTTP 400 Bad Request.
- **Bước 7:** Backend NestJS kiểm tra khóa Idempotency trong cơ sở dữ liệu:
  - Xác nhận khóa `c73a21b4-...` chưa từng được sử dụng.
- **Bước 8:** Backend gọi dịch vụ thanh toán mô phỏng (Mock Payment Service):
  - Dịch vụ xác thực tính hợp lệ của số tiền và phương thức. Phản hồi giao dịch thành công.
- **Bước 9:** Backend thực hiện chuỗi nghiệp vụ cập nhật cơ sở dữ liệu bên trong một Database Transaction:
  1. Kiểm tra chuyển đổi trạng thái bằng hàm máy trạng thái: `assertTransition(order.status, OrderStatus.PAID)` $\rightarrow$ Chuyển từ `PENDING` sang `PAID` thành công.
  2. Thực hiện trừ tồn kho thành phẩm theo cơ chế **Optimistic Concurrency Control (OCC)**:
     ```sql
     UPDATE "Product"
     SET stock = stock - 1, version = version + 1
     WHERE id = 'prod-cappuccino-uuid' AND stock >= 1 AND version = :currentVersion;
     ```
  3. Tạo bản ghi thanh toán `Payment` với `status = 'SUCCESS'`, `idempotencyKey = 'c73a21b4-...'`.
  4. Tính toán điểm thưởng khách hàng thân thiết (theo BR-LOYALTY-01: 48 điểm), ghi nhận bản ghi vào bảng `LoyaltyTransaction` và cập nhật điểm tích lũy của người dùng.
- **Bước 10:** Backend commit transaction thành công và trả về phản hồi HTTP 200 OK:
  ```json
  {
    "success": true,
    "status": "SUCCESS",
    "isDuplicate": false,
    "message": "Thanh toán thành công qua Mock Payment Service.",
    "payment": {
      "id": "pay-12345678-abcd-ef01-2345-6789abcdef01",
      "orderId": "ord-8f7b2c1a-5d4e-4f3a-9b1c-2e3d4f5a6b7c",
      "idempotencyKey": "c73a21b4-921a-4d7a-b5a8-2081f2df9841",
      "method": "E_WALLET",
      "amount": "48000.00",
      "status": "SUCCESS",
      "transactionRef": "TXN-839201",
      "createdAt": "2026-11-14T00:00:05.000Z"
    },
    "order": {
      "id": "ord-8f7b2c1a-5d4e-4f3a-9b1c-2e3d4f5a6b7c",
      "orderCode": "#BL-1042",
      "status": "PAID",
      "totalAmount": "48000.00"
    }
  }
  ```
- **Bước 11:** Ứng dụng Next.js làm trống giỏ hàng (Clear Zustand store / LocalStorage), sau đó chuyển hướng người dùng sang trang Xác nhận đơn hàng (`/order/confirmation`).
- **Bước 12:** Màn hình hiển thị biểu tượng thành công $\checkmark$, tiêu đề *"Đặt hàng thành công"*, mã nhận món `#BL-1042`, huy hiệu trạng thái `PAID`, và thông điệp: *"Mời tới quầy lấy nước"*.

---

### 3.2 Các Luồng Thay Thế (Alternative Flows)

#### Alt-1: Thanh toán bằng phương thức Thẻ ngân hàng (Bank Card)
- Tại **Bước 5**, thay vì chọn Ví điện tử, khách hàng chọn tùy chọn **"Thẻ ngân hàng"**.
- Tại **Bước 6**, request gửi `POST /payments` với trường `"method": "BANK_CARD"`.
- Hệ thống Mock Payment Service xử lý qua cổng thẻ giả lập, luồng tiếp tục thành công như Bước 8 trở đi.

#### Alt-2: Khách hàng áp dụng mã giảm giá (Promotion Voucher)
- Tại **Bước 2**, tại giao diện Giỏ hàng hoặc Checkout, khách hàng nhập mã khuyến mãi `BREW20` (áp dụng cho đơn từ 50.000đ trở lên, giảm 20%).
- Client gửi kiểm tra mã voucher. Hệ thống tính toán số tiền chiết khấu (ví dụ: giảm 12.000đ), cập nhật lại tổng tiền đơn hàng thành 48.000đ.
- Tại **Bước 3**, payload `POST /orders` bổ sung trường `"promoCode": "BREW20"`.
- Backend xác thực tính hợp lệ của voucher, ghi nhận `discountAmount = 12000` và `totalAmount = 48000`.
- Số tiền thanh toán tại Bước 6 sẽ là 48.000đ. Các bước tiếp theo diễn ra bình thường.

#### Alt-3: Khách hàng tùy biến nhiều món và nhiều loại topping
- Tại **Bước 1**, khách hàng chọn nhiều món khác nhau, mỗi món có các tùy chọn size riêng biệt (`SMALL`, `MEDIUM`, `LARGE`) và nhiều topping cùng lúc (Kem cheese, Trân châu trắng, Thạch đào).
- Giá của từng dòng sản phẩm (`lineTotal`) được tính chính xác bằng công thức:
  $$\text{lineTotal} = (\text{Base Price} + \text{Size Modifier} + \sum \text{Topping Prices}) \times \text{Quantity}$$
- Luồng tiếp tục sang Bước 2 với tổng tiền được cộng dồn chính xác.

#### Alt-4: Khách hàng chưa đăng nhập khi nhấn "Thanh toán"
- Tại **Bước 3**, ứng dụng Next.js kiểm tra trạng thái đăng nhập và phát hiện khách hàng chưa có JWT Token.
- Client lưu trạng thái giỏ hàng hiện tại vào bộ nhớ tạm thời (`localStorage`), sau đó điều hướng khách hàng sang trang Đăng nhập (`/login?redirect=/checkout`).
- Khách hàng đăng nhập (hoặc đăng ký mới tài khoản) thành công, nhận JWT Token.
- Sau khi xác thực thành công, client tự động điều hướng khách hàng quay trở lại trang Checkout và khôi phục giỏ hàng, tiếp tục thực hiện từ Bước 3 của luồng chính.

#### Alt-5: Gửi lại yêu cầu thanh toán với cùng Idempotency-Key (Client Idempotent Retry)
- **Quy tắc nghiệp vụ mong muốn (Desired Business Rule):** Khi request thanh toán đã được backend tiếp nhận hoặc xử lý nhưng gặp sự cố gián đoạn kết nối phản hồi, client cần gửi lại request thanh toán cho **chính đơn hàng đó (`orderId`)** kèm **chính xác `Idempotency-Key` cũ**.
- Backend kiểm tra bản ghi `Payment`: phát hiện key đã tồn tại và đã ở trạng thái `SUCCESS`, backend **ngay lập tức trả về kết quả thành công của giao dịch trước đó (`isDuplicate = true`)** mà không thực hiện trừ kho lần hai, không gọi lại Mock Payment, và không cộng trùng lặp điểm loyalty.
- > [!WARNING]
  > **Khoảng trống triển khai Client-side (GAP-02):** Mã nguồn frontend hiện tại trên `CheckoutPage` chưa lưu trữ `Idempotency-Key` vào `sessionStorage` gắn với `orderId`; mỗi lần nhấn nút thanh toán lại, client đang gọi `createOrder` tạo đơn mới và sinh UUID mới. Cần bổ sung logic giữ khóa và giữ đơn tại frontend ở Task 4/5 để hiện thực hóa trọn vẹn kịch bản này.

---

### 3.3 Các Luồng Ngoại Lệ (Exception Flows)

#### Exc-1: Giỏ hàng trống khi bấm thanh toán (Empty Cart)
- **Tình huống:** Người dùng xóa hết món trong giỏ hoặc truy cập trực tiếp vào route checkout khi giỏ hàng chưa có sản phẩm.
- **Hành động hệ thống:**
  1. Frontend kiểm tra số lượng món trong giỏ: nếu `items.length === 0`, nút "Thanh toán" bị vô hiệu hóa (disabled), hiển thị thông báo: *"Giỏ hàng của bạn đang trống"*.
  2. Nếu client cố tình gửi request `POST /orders` với mảng `items: []`, Backend `CreateOrderDto` chặn lại với mã lỗi HTTP 400 Bad Request: `{"statusCode": 400, "message": "Giỏ hàng không được để trống khi tạo đơn."}`.
  3. Không có đơn hàng nào được tạo trong cơ sở dữ liệu.

#### Exc-2: Sản phẩm hết hàng hoặc không đủ tồn kho (Out of Stock / Insufficient Stock)
- **Tình huống:** Tại thời điểm khách hàng gửi tạo đơn hoặc thanh toán, số lượng sản phẩm trong kho nhỏ hơn số lượng khách đặt mua (`stock < quantity`).
- **Hành động hệ thống:**
  1. Backend kiểm tra tồn kho thành phẩm trong database query hoặc transaction.
  2. Transaction bị rollback hoàn toàn.
  3. API phản hồi mã lỗi HTTP 400 Bad Request hoặc HTTP 409 Conflict: `{"statusCode": 400, "message": "Sản phẩm 'Cà phê Latte' hiện không đủ số lượng tồn kho (còn 0 ly)."}`.
  4. Giao diện hiển thị cảnh báo đỏ, giữ nguyên giỏ hàng để khách hàng điều chỉnh số lượng hoặc chọn món thay thế.

#### Exc-3: Khách hàng chưa đăng nhập hoặc Token không hợp lệ (Unauthorized / Invalid Token)
- **Tình huống:** Khách hàng gửi request mà không đính kèm Bearer token hoặc token bị giả mạo.
- **Hành động hệ thống:**
  1. `JwtAuthGuard` chặn request tại tầng Gateway, phản hồi HTTP 401 Unauthorized.
  2. Frontend chuyển hướng khách hàng sang trang Đăng nhập, bảo toàn giỏ hàng trong bộ nhớ.

#### Exc-4: Phiên đăng nhập JWT hết hạn giữa chừng (Expired JWT Token)
- **Tình huống:** Khách hàng để màn hình thanh toán quá lâu khiến JWT Token hết hạn thời gian hiệu lực (`TokenExpiredError`).
- **Hành động hệ thống:**
  1. Backend từ chối request với mã lỗi HTTP 401 Unauthorized: `{"statusCode": 401, "message": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."}`.
  2. Frontend hiển thị thông báo, xóa token hết hạn và chuyển hướng sang trang đăng nhập, sau đó tự động quay lại đơn hàng.

#### Exc-5: Giá sản phẩm hoặc trạng thái khả dụng thay đổi trên Server (Price Mismatch / Tampering)
- **Tình huống:** Giá niêm yết của sản phẩm thay đổi trong CSDL, hoặc client can thiệp sửa giá trong request (`amount` gửi lên sai lệch với tính toán server của `order.totalAmount`).
- **Hành động hệ thống:**
  1. Backend luôn thực hiện tính toán giá độc lập dựa trên dữ liệu sản phẩm trong CSDL (`Server-side Price Recalculation`).
  2. Nếu phát hiện `payload.amount !== order.totalAmount`, Backend ném lỗi HTTP 400 Bad Request: `{"statusCode": 400, "message": "Số tiền thanh toán không khớp với số tiền thực tế của đơn hàng."}`.
  3. Client tải lại danh sách sản phẩm mới nhất và cập nhật lại giỏ hàng cho khách hàng.

#### Exc-6: Cổng thanh toán mô phỏng báo lỗi / Giao dịch thất bại (Payment Gateway Failed)
- **Tình huống:** Khách hàng chọn thanh toán nhưng tài khoản thẻ bị từ chối hoặc ví điện tử không đủ số dư (giả lập qua `mockOutcome = 'FAILED'`).
- **Hành động hệ thống:**
  1. Mock Payment Service trả về kết quả `status = "FAILED"`.
  2. Hàm `assertTransition` chuyển trạng thái đơn hàng sang **`PAYMENT_FAILED`**.
  3. Hệ thống không trừ tồn kho và không cộng điểm loyalty.
  4. API trả về phản hồi thanh toán thất bại kèm thông điệp: *"Thanh toán thất bại: Số dư tài khoản không đủ."*.
  5. Màn hình thanh toán hiển thị thông báo lỗi, không xóa giỏ hàng của khách, cho phép khách hàng chọn phương thức khác hoặc bấm thử lại.

#### Exc-7: Thanh toán ở trạng thái Pending / Timeout cổng thanh toán (Payment Pending / Gateway Timeout)
- **Tình huống:** Cổng thanh toán phản hồi trạng thái chờ duyệt hoặc mạng có độ trễ cao (giả lập qua `mockOutcome = 'PENDING'`).
- **Hành động hệ thống:**
  1. Đơn hàng tiếp tục được duy trì ở trạng thái **`PENDING`**.
  2. Bản ghi `Payment` được lưu với `status: 'PENDING'` và mã tham chiếu tạm thời `transactionRef`.
  3. Giao diện hiển thị thông báo: *"Giao dịch đang được xử lý bởi cổng thanh toán. Vui lòng kiểm tra lại trạng thái đơn hàng trong giây lát."*.

#### Exc-8: Gửi lại request thanh toán trùng lặp (Network Idempotency)
- **Tình huống:** Khách hàng bấm nút thanh toán nhiều lần liên tiếp do sốt ruột hoặc do mạng chập chờn gửi lại request.
- **Hành động hệ thống:**
  1. Nhờ header `Idempotency-Key`, Backend kiểm tra bản ghi `Payment`.
  2. Nếu key đã được ghi nhận thành công, Backend trả về ngay kết quả giao dịch trước đó (`isDuplicate: true`).
  3. Tuyệt đối không trừ tiền lần hai, không trừ kho lặp lại và không tạo đơn trùng.

#### Exc-9: Mất kết nối mạng trong quá trình thanh toán (Network Dropped)
- **Tình huống:** Mạng Internet của khách hàng bị đứt đột ngột ngay sau khi gửi request `POST /payments`.
- **Hành động hệ thống:**
  1. Frontend bắt sự kiện mất kết nối, hiển thị banner thông báo mất mạng.
  2. Khách hàng kiểm tra lại kết nối và gửi lại request thanh toán khi có mạng.
  3. Hệ thống bảo đảm tính toàn vẹn thông qua giao dịch CSDL (nếu chưa hoàn tất, CSDL tự động rollback).

#### Exc-10: Chuyển đổi trạng thái đơn hàng sai quy tắc (Invalid State Transition Violation)
- **Tình huống:** Một request bất thường cố gắng chuyển đơn hàng từ trạng thái đã hủy (`CANCELLED`) sang `PAID`, hoặc từ `PENDING` sang thẳng `COMPLETED`.
- **Hành động hệ thống:**
  1. Hàm máy trạng thái `assertTransition(currentStatus, nextStatus)` kiểm tra danh sách chuyển tiếp hợp lệ và phát hiện vi phạm.
  2. Ném ngoại lệ `InvalidStateTransitionException` / `BadRequestException`.
  3. API trả về mã lỗi HTTP 400 Bad Request: `{"statusCode": 400, "message": "Không thể chuyển trạng thái đơn hàng từ [currentStatus] sang [nextStatus]"}`.
  4. Trạng thái trong cơ sở dữ liệu giữ nguyên vẹn.

#### Exc-11: Tranh chấp dữ liệu đồng thời khi trừ kho (Optimistic Concurrency Conflict)
- **Tình huống:** Hai giao dịch thanh toán diễn ra đồng thời cho cùng 1 sản phẩm có số lượng tồn kho giới hạn, dẫn đến lệch phiên bản `version` trong cơ sở dữ liệu.
- **Hành động hệ thống:**
  1. Câu lệnh `UPDATE "Product" SET stock = stock - qty, version = version + 1 WHERE id = :id AND version = :v` cập nhật được 0 dòng do `version` đã bị giao dịch trước thay đổi.
  2. Backend phát hiện xung đột và ném ngoại lệ `ConflictException` (HTTP 409 Conflict): `{"statusCode": 409, "message": "Xung đột tồn kho đồng thời đối với sản phẩm [Tên món]. Vui lòng thử lại."}`.
  3. Transaction tự động rollback toàn bộ, không có dữ liệu nào bị sai lệch.

---

## 4. MA TRẬN CHUYỂN ĐỔI TRẠNG THÁI ĐƠN HÀNG (STATE TRANSITION MATRIX)

Hàm kiểm soát máy trạng thái `assertTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void` là cơ chế bảo vệ tính toàn vẹn nghiệp vụ cốt lõi tại tầng Backend, loại bỏ hoàn toàn việc chuyển trạng thái sai hoặc nhảy cóc chu trình.

### 4.1 Bảng ma trận chuyển đổi trạng thái hợp lệ (`assertTransition`)

| Trạng thái hiện tại (`currentStatus`) | Các trạng thái kế tiếp hợp lệ (`nextStatus`) | Tác nhân kích hoạt (Actor) | API Endpoint / Sự kiện | Ràng buộc nghiệp vụ & Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **`PENDING`** | **`PAID`** | Cổng thanh toán mô phỏng | `POST /payments` | Thanh toán thành công; trừ tồn kho thành phẩm Optimistic Lock; cộng điểm Loyalty. |
| | **`PAYMENT_FAILED`** | Cổng thanh toán mô phỏng | `POST /payments` | Cổng từ chối/lỗi thẻ; không trừ kho; giữ nguyên giỏ hàng. |
| | **`CANCELLED`** | Khách hàng / Hệ thống | API hủy đơn | Khách chủ động hủy đơn trước khi thanh toán; không phát sinh bồi hoàn. *(Ghi chú: Endpoint hủy đơn chi tiết là GAP-01)*. |
| **`PAYMENT_FAILED`** | **`PAID`** | Cổng thanh toán mô phỏng | `POST /payments` | Khách bấm "Thử lại" và thanh toán thành công; trừ kho; cộng điểm Loyalty. |
| | **`CANCELLED`** | Khách hàng / Quản trị viên | API hủy đơn | Khách hủy đơn không thanh toán tiếp; đóng đơn hàng. |
| **`PAID`** | **`PREPARING`** | Nhân viên Barista | `PATCH /orders/:id/status` | Yêu cầu vai trò `STAFF`/`ADMIN`; Barista bắt đầu pha chế đồ uống. |
| | **`CANCELLED`** | Quản trị viên / Barista | API hủy đơn | Hủy sự cố (hỏng máy/thiếu nguyên liệu); *(Yêu cầu nghiệp vụ đề xuất: hoàn tiền BR-REFUND-01, hiện là GAP-01)*. |
| **`PREPARING`** | **`READY`** | Nhân viên Barista | `PATCH /orders/:id/status` | Yêu cầu vai trò `STAFF`/`ADMIN`; Đồ uống hoàn tất, sẵn sàng tại quầy nhận. |
| | **`CANCELLED`** | Quản trị viên / Barista | API hủy đơn | Hủy sự cố khẩn cấp; *(Yêu cầu nghiệp vụ đề xuất: hoàn tiền BR-REFUND-01, hiện là GAP-01)*. |
| **`READY`** | **`COMPLETED`** | Nhân viên Barista | `PATCH /orders/:id/status` | Khách đã nhận đồ uống tại quầy; kết thúc chu trình phục vụ. |
| **`COMPLETED`** | *(Không có chuyển tiếp)* | N/A | N/A | **Trạng thái kết thúc (Terminal State):** Đơn hàng hoàn tất viên mãn, cấm mọi chuyển tiếp tiếp theo. |
| **`CANCELLED`** | *(Không có chuyển tiếp)* | N/A | N/A | **Trạng thái kết thúc (Terminal State):** Đơn hàng đã đóng, cấm mọi chuyển tiếp hoặc phục hồi. |

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
