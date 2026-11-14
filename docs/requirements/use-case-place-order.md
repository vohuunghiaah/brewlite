# TASK 1.3 — ĐẶC TẢ USE-CASE TRỌNG TÂM: UC-04 ĐẶT HÀNG (PLACE ORDER)
## DỰ ÁN: BREWLITE — HỆ THỐNG ĐẶT CÀ PHÊ KHÔNG DÙNG TIỀN MẶT

- **Tên dự án:** BrewLite (Cashless Coffee Ordering Platform)
- **Tài liệu tham chiếu:** Assignment 1 (Task 10) & Assignment 2 (Task 1.3, Task 2)
- **Mã tài liệu:** `REQ-UC-04`
- **Phiên bản:** 1.2.0 (Synchronized with SRS 1.3.1 & Official UC Catalog)
- **Trạng thái:** Đề xuất nghiệm thu Task 1 (Proposed Baseline for Task 1 Review)
- **MVP do nhóm lựa chọn:** Đặt đồ uống (Drink Ordering)
- **Use-case trọng tâm phân rã:** `UC-04 — Đặt hàng (Place Order / Tạo đơn)`
- **Biểu diễn:** Sơ đồ Use-case UML đơn sắc học thuật (Academic Monochrome UML)

---

## 1. Phạm vi

### 1.1 Trong phạm vi UC-04:
- Khách hàng kiểm tra các món trong giỏ hàng (kèm tùy biến size, topping, số lượng, ghi chú đơn hàng).
- Khách hàng xác nhận tạo đơn hàng (`POST /orders`).
- Hệ thống backend xác thực phiên đăng nhập hợp lệ qua `JwtAuthGuard` (FR-04).
- Hệ thống kiểm tra tính hợp lệ của DTO đầu vào (`CreateOrderDto`), kiểm tra tồn kho thành phẩm khả dụng (`stock >= quantity`) và tính toán lại giá phía server (FR-09, NFR-04).
- Hệ thống khởi tạo và lưu trữ bản ghi đơn hàng (`Order`) với trạng thái ban đầu là **`PENDING`**, mã hiển thị `orderCode` (ví dụ: `#BL-1042`), mã định danh duy nhất UUID (`id`).
- Hệ thống lưu các bản ghi chi tiết đơn hàng (`OrderItem`) tương ứng với snapshot đơn giá và thành tiền tại thời điểm tạo đơn.
- Hệ thống phản hồi mã phản hồi HTTP 201 Created kèm dữ liệu đơn hàng `PENDING` cho client.

### 1.2 Ngoài phạm vi UC-04:
- Thanh toán không tiền mặt trực tuyến/mô phỏng (`UC-10`, FR-06, FR-08).
- Chuyển trạng thái đơn sang đã thanh toán (`PAID`) hoặc thất bại (`PAYMENT_FAILED`).
- Nhân viên quầy (Barista) tiếp nhận và cập nhật tiến độ pha chế (`UC-12`, FR-12).
- Theo dõi trạng thái đơn hàng (`UC-05`, FR-11) và Xem lịch sử đơn hàng cá nhân (`UC-06`, FR-11).
- Quản trị danh mục món ăn đồ uống hoặc báo cáo doanh thu cửa hàng.

> [!IMPORTANT]
> **Ranh giới kiến trúc độc lập giữa Tạo đơn (`UC-04`) và Thanh toán (`UC-10`):**
> Trong quy trình nghiệp vụ của BrewLite, `UC-04: Đặt hàng (Place Order)` là một Use Case nguyên tử độc lập, **kết thúc hoàn chỉnh khi đơn hàng được lưu trữ thành công ở trạng thái `PENDING`**.
> Việc thực hiện thanh toán không tiền mặt (`UC-10`) là giao dịch kế tiếp độc lập, không phải là điều kiện cấu thành để `UC-04` hoàn tất. Kịch bản bao gồm trọn vẹn cả tạo đơn và thanh toán thành công được định danh là `UC-CORE-01` (đặc tả tại `docs/requirements/use-cases.md`).

---

## 2. Tác nhân, Kích hoạt, Tiền điều kiện và Hậu điều kiện

| Thuộc tính | Chi tiết đặc tả |
| :--- | :--- |
| **Mã Use Case** | `UC-04` |
| **Tên Use Case** | Đặt hàng (Place Order / Tạo đơn) |
| **Phân loại** | Core MVP Functional Use Case (Nghiệp vụ cốt lõi) |
| **Actor chính** | **Khách hàng (Customer):** Người dùng trực tiếp thao tác xác nhận đơn từ giỏ hàng. |
| **Actor phụ** | Không có actor ngoài hệ thống tham gia trực tiếp trong bước tạo đơn (Hệ thống CSDL PostgreSQL nội bộ). |
| **Trigger** | Khách hàng nhấn nút "Thanh toán" hoặc "Xác nhận tạo đơn" tại màn hình giỏ hàng / checkout. |
| **Tiền điều kiện** | 1. Khách hàng đã truy cập ứng dụng BrewLite và giỏ hàng có ít nhất một (01) đồ uống hợp lệ.<br>2. Sản phẩm trong giỏ có trạng thái kinh doanh (`isAvailable = true`) và đủ tồn kho thành phẩm (`stock >= quantity`).<br>3. Khách hàng đã đăng nhập tài khoản hợp lệ với JWT Bearer Token (FR-04).<br>4. Dịch vụ Backend API và CSDL PostgreSQL hoạt động bình thường. |
| **Hậu điều kiện thành công** | 1. Đúng một bản ghi đơn hàng mới (`Order`) được tạo trong CSDL với trạng thái ban đầu là **`PENDING`**.<br>2. Cấp phát mã định danh duy nhất `id` (UUID v4) và mã hiển thị nhận món `orderCode` (ví dụ: `#BL-1042`).<br>3. Toàn bộ các dòng hàng con (`OrderItem`) được lưu trữ đầy đủ (kèm size, topping, số lượng, đơn giá niêm yết và `lineTotal`).<br>4. Tổng tiền đơn hàng (`totalAmount`) được tính toán chính xác phía server.<br>5. API phản hồi HTTP 201 Created kèm dữ liệu đơn hàng để client chuyển tiếp sang bước thanh toán. |
| **Hậu điều kiện thất bại** | 1. Không có đơn hàng nào được tạo trong cơ sở dữ liệu (Database Transaction rollback 100%).<br>2. Tồn kho thành phẩm không bị trừ sai.<br>3. Giỏ hàng của khách hàng được giữ nguyên vẹn trên giao diện client.<br>4. Hệ thống phản hồi mã lỗi HTTP tương ứng (400 Bad Request, 401 Unauthorized, 409 Conflict) kèm thông điệp hướng dẫn rõ ràng. |

---

## 3. Luồng chính (Main Success Flow)

1. **Khách hàng** mở màn hình Giỏ hàng, kiểm tra danh sách đồ uống đã chọn (tên món, kích cỡ, danh sách topping, số lượng) cùng tổng tiền tạm tính.
2. **Khách hàng** nhập ghi chú đơn hàng nếu cần (ví dụ: `"50% đường, ít đá, mang đi"`) và nhấn nút **"Xác nhận đặt đơn"** / **"Thanh toán"**.
3. **Ứng dụng Next.js** kiểm tra phiên đăng nhập: xác nhận khách hàng có JWT Token hợp lệ, gửi yêu cầu tạo đơn:
   - `POST /orders`
   - Header: `Authorization: Bearer <accessToken>`
   - Body: payload chuẩn `CreateOrderDto` chứa danh sách `items` và `note`.
4. **Backend NestJS** tiếp nhận request qua `JwtAuthGuard`, DTO validator kiểm tra tính toàn vẹn dữ liệu.
5. **Backend** khởi tạo Database Transaction:
   - Truy vấn CSDL kiểm tra tính khả dụng và số lượng tồn kho thành phẩm (`isAvailable = true`, `stock >= quantity`).
   - Tính toán lại đơn giá từng món và tổng tiền đơn hàng độc lập phía server (`Server-side Price Calculation`).
6. **Backend** tạo bản ghi `Order` ở trạng thái **`PENDING`**, sinh mã định danh UUID v4 (`id`) và mã hiển thị `orderCode` (`#BL-xxxx`), tạo các bản ghi con `OrderItem`, sau đó commit transaction.
7. **Backend** phản hồi HTTP 201 Created chứa thông tin chi tiết đơn hàng `PENDING`.
8. **Ứng dụng Next.js** nhận phản hồi thành công và điều hướng khách hàng sang giao diện Thanh toán (kích hoạt `UC-10: Thanh toán không tiền mặt`).

---

## 4. Luồng thay thế (Alternative Flows)

| Mã | Điều kiện kích hoạt | Cách xử lý của hệ thống |
| :--- | :--- | :--- |
| **ALT-01** | Khách hàng đặt món tiêu chuẩn không có topping | Cho phép tạo đơn với mảng topping rỗng (`toppings: []`), đơn giá bằng đơn giá gốc theo size. |
| **ALT-02** | Khách hàng áp dụng mã khuyến mãi (`UC-09` - Should Have / FR-10) | Khách hàng nhập voucher (ví dụ: `BREW20`); hệ thống kiểm tra điều kiện áp dụng, chiết khấu phần trăm, ghi nhận `discountAmount` và cập nhật `totalAmount` trước khi tạo đơn. |
| **ALT-03** | Khách hàng thêm các tùy biến ghi chú pha chế | Ghi nhận chuỗi ghi chú của khách (độ ngọt, lượng đá, dặn dò) lưu trữ trực tiếp vào trường `note` của bảng `Order`. |
| **ALT-04** | Khách hàng chưa đăng nhập khi nhấn đặt hàng | Client tạm lưu giỏ hàng vào `localStorage`, chuyển hướng người dùng sang màn hình Đăng nhập (`UC-08`); sau khi đăng nhập thành công, tự động quay lại giỏ hàng và tiếp tục tạo đơn. |
| **ALT-05** | Giỏ hàng có nhiều món trùng cấu hình (size, topping) | Client tự động gộp các món trùng cấu hình thành một dòng hàng duy nhất với số lượng cộng dồn trước khi gửi `POST /orders`. |

---

## 5. Luồng ngoại lệ (Exception Flows)

| Mã | Điều kiện kích hoạt | Kết quả bảo đảm của hệ thống |
| :--- | :--- | :--- |
| **EX-01** | Giỏ hàng rỗng (`items: []`) | Frontend vô hiệu hóa nút đặt đơn; nếu cố tình gọi API, backend trả về HTTP 400 Bad Request: `"Giỏ hàng không được để trống khi tạo đơn."`. Không tạo đơn. |
| **EX-02** | Sản phẩm hết hàng hoặc không đủ tồn kho (`stock < quantity`) | Transaction tự động rollback; API trả về HTTP 400 Bad Request hoặc HTTP 409 Conflict: `"Sản phẩm hiện không đủ số lượng tồn kho."`. Giữ nguyên giỏ hàng để khách điều chỉnh. |
| **EX-03** | Dữ liệu món, size hoặc số lượng không hợp lệ (lỗi DTO) | `ValidationPipe` chặn request, trả về HTTP 400 Bad Request kèm chi tiết lỗi validation. Không ghi dữ liệu dở dang. |
| **EX-04** | Chưa đăng nhập hoặc Token JWT hết hạn | `JwtAuthGuard` chặn tại gateway, trả về HTTP 401 Unauthorized. Khách được điều hướng đăng nhập lại mà không bị mất giỏ hàng. |
| **EX-05** | Sai lệch giá niêm yết giữa client và server | Backend tính toán lại giá theo dữ liệu niêm yết trong CSDL; nếu phát hiện sai lệch nghiêm trọng, ném ngoại lệ HTTP 400 Bad Request. |
| **EX-06** | Lỗi kết nối CSDL hoặc lỗi hệ thống khi lưu đơn | Transaction rollback nguyên vẹn; API phản hồi HTTP 500 Internal Server Error; thông báo khách hàng thử lại sau, không tạo bản ghi rác. |
| **EX-07** | Nhấp nhiều lần tạo đơn liên tiếp | Frontend chặn double-click (nút đặt đơn bị disabled khi đang xử lý request `POST /orders`); backend bảo vệ tính toàn vẹn qua transaction. |

---

## 6. Ma trận truy vết Yêu cầu chức năng (FR Traceability)

| Thành phần của UC-04 | Mã FR Ánh Xạ | Tên Yêu Cầu Chức Năng (SRS 1.3.1) | Phân loại MoSCoW | Tiêu chí kiểm chứng |
| :--- | :---: | :--- | :---: | :--- |
| Nguồn dữ liệu thực đơn | **FR-01** | Xem menu đồ uống | Must Have | API `GET /products` cung cấp danh sách món còn bán. |
| Cấu hình size & topping | **FR-02** | Xem chi tiết, chọn size/topping | Must Have | Snapshot kích cỡ và topping được lưu vào `OrderItem`. |
| Tiếp nhận từ giỏ hàng | **FR-03** | Quản lý giỏ hàng | Must Have | Trạng thái giỏ hàng client được chuyển thành payload `CreateOrderDto`. |
| Xác thực an ninh người dùng | **FR-04** | Đăng ký, đăng nhập và JWT | Must Have | Endpoint `POST /orders` được bảo vệ bằng `JwtAuthGuard`. |
| Khởi tạo đơn hàng PENDING | **FR-05** | Tạo đơn hàng | Must Have | Tạo bản ghi `Order` ở trạng thái `PENDING`, mã UUID và `orderCode`. |
| Khởi tạo máy trạng thái | **FR-07** | Quản lý trạng thái đơn | Must Have | Gán trạng thái khởi đầu của máy trạng thái là `PENDING`. |
| Kiểm tra tính khả dụng kho | **FR-09** | Kiểm soát tồn kho đồng thời | Must Have | Kiểm tra tồn kho thành phẩm khả dụng trong Database Transaction. |
| Áp dụng mã giảm giá | **FR-10** | Mã khuyến mãi & Loyalty | Should Have | Tiếp nhận `promoCode` hợp lệ, giảm trừ tổng tiền nếu có. |

---

## 7. Tiêu chí chấp nhận nghiệm thu (Acceptance Criteria)

Tuân thủ kịch bản nghiệm thu chuẩn Gherkin được định nghĩa tại SRS §4.5:

```gherkin
Scenario: Tạo đơn hàng thành công từ giỏ hàng
  Given khách hàng đã đăng nhập và giỏ hàng có ít nhất 1 sản phẩm còn tồn kho thành phẩm
  When khách hàng nhấn nút xác nhận đặt đơn (POST /api/orders)
  Then hệ thống khởi tạo đơn hàng mới ở trạng thái PENDING
  And hệ thống cấp mã hiển thị duy nhất (orderCode) và lưu snapshot chi tiết từng món
  And API phản hồi HTTP 201 Created chứa orderId (UUID) và totalAmount

Scenario: Từ chối tạo đơn khi giỏ hàng trống hoặc sản phẩm hết hàng
  Given giỏ hàng của khách hàng đang rỗng hoặc sản phẩm có tồn kho bằng 0
  When khách hàng gửi yêu cầu tạo đơn
  Then hệ thống chặn lại với mã lỗi HTTP 400 Bad Request hoặc HTTP 409 Conflict
  And không có bản ghi đơn hàng nào được tạo trong cơ sở dữ liệu
```

---

## 8. Liên kết Thiết kế Kỹ thuật (Task 2 Alignment)

Đặc tả Use Case `UC-04` là đầu vào kỹ thuật trực tiếp cho các biểu đồ thiết kế trong **Task 2**:
1. **Lược đồ Lớp (Class Diagram):** Mô hình hóa thực thể `Order`, `OrderItem`, enum `OrderStatus` (với giá trị ban đầu `PENDING`), và quan hệ 1-N giữa `Order` và `OrderItem`.
2. **Sơ đồ Tuần tự (Sequence Diagram):** Mô tả tương tác tạo đơn: `Client -> OrdersController -> OrdersService -> Database Transaction -> Trả về Order PENDING`. (Lưu ý: Tách biệt rõ ràng với tương tác thanh toán `POST /payments` kế tiếp).
3. **Sơ đồ Máy trạng thái (State Machine Diagram):** Định nghĩa trạng thái xuất phát (`Initial State -> PENDING`).
