# Kịch Bản Trình Diễn Hệ Thống Toàn Diện (Interactive Demo Script)

**Dự án:** BrewLite Coffee & Tea Delivery System  
**Dành cho:** Giảng viên, Hội đồng đánh giá, Khách hàng & Người kiểm thử  
**Phiên bản:** v1.0.0 (Sprint 2 Delivery)  
**Thời lượng dự kiến:** 10 – 15 phút  
**Yêu cầu môi trường:** Đã khởi chạy hệ thống (qua Docker Compose hoặc `npm run dev`)

---

## 0. Chuẩn Bị Môi Trường Khởi Chạy (Prerequisites)

Chọn 1 trong 2 cách sau:

### Cách A: Khởi chạy bằng Docker Compose (Khuyến nghị)
```bash
docker compose up -d --build
```
- Frontend Web: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

### Cách B: Khởi chạy thủ công bằng Node.js
```bash
# Terminal 1: Backend API
npm run start:api

# Terminal 2: Frontend Web
npm run start:web
```

---

## 1. Kịch Bản 11 Bước Trình Diễn Nghiệp Vụ (11-Step Interactive Demo)

### Bước 1: Kiểm Tra Sức Khỏe Hệ Thống (Health Check Probe)
- **Hành động:** Mở trình duyệt hoặc terminal gọi:
  ```bash
  curl http://localhost:4000/health
  ```
- **Kết quả mong đợi:** Trả về mã HTTP `200 OK` với JSON:
  ```json
  { "status": "ok", "service": "brewlite-api", "timestamp": "..." }
  ```

---

### Bước 2: Duyệt Thực Đơn Đồ Uống (Menu Browsing)
- **Hành động:** Truy cập `http://localhost:3000/`.
- **Quan sát:**
  - Giao diện thiết kế chuẩn Mobile-first, hiện đại và thân thiện.
  - Các danh mục phân loại: *Tất cả, Cà phê, Trà sữa, Trà trái cây, Đá xay & Bánh ngọt*.
  - Thanh tìm kiếm đồ uống tức thời.
  - Các thẻ sản phẩm hiển thị ảnh, tên, giá tiền định dạng Việt Nam (`45.000 ₫`) và nhãn tồn kho.
  - Thử bấm vào danh mục "Trà trái cây" hoặc gõ "Muối" vào ô tìm kiếm để thấy kết quả lọc ngay lập tức.

---

### Bước 3: Xem Chi Tiết & Tùy Biến Đồ Uống (Product Customization)
- **Hành động:** Bấm vào sản phẩm **"Trà Đào Cam Sả"** (hoặc bất kỳ món nào còn hàng).
- **Quan sát & Thao tác:**
  - Trang chi tiết hiển thị mô tả, thành phần dinh dưỡng và ảnh lớn.
  - Bấm chọn kích cỡ ly:
    - Chọn **Medium (M)**: Giá tăng thêm `+6.000 ₫`.
    - Chọn **Large (L)**: Giá tăng thêm `+12.000 ₫`.
  - Tích chọn Topping ăn kèm:
    - Tích chọn **"Thạch trà xanh"** (`+7.000 ₫`).
    - Tích chọn **"Kem Cheese"** (`+10.000 ₫`).
  - **Quan sát giá tự động cập nhật:** Tổng giá hiển thị tại thanh nút bấm dưới chân trang tự động tăng tương ứng theo thời gian thực.
  - Tăng số lượng lên **2 ly**.
  - Bấm nút **"Thêm vào giỏ hàng"**.

---

### Bước 4: Kiểm Tra Huy Hiệu Giỏ Hàng (Cart Badge)
- **Quan sát:**
  - Huy hiệu (badge) màu đỏ trên biểu tượng giỏ hàng ở thanh tiêu đề (Header) hiển thị số lượng `2`.
  - Dữ liệu được lưu trữ tự động trong `LocalStorage` (Zustand persist). Hãy thử tải lại trang (F5) để kiểm chứng số lượng giỏ hàng không hề bị mất.

---

### Bước 5: Quản Lý & Tinh Chỉnh Giỏ Hàng (Cart Management)
- **Hành động:** Bấm vào biểu tượng giỏ hàng hoặc truy cập `http://localhost:3000/cart`.
- **Quan sát & Thao tác:**
  - Danh sách hiển thị đúng món đồ uống vừa chọn, ghi rõ kích cỡ và danh sách topping đính kèm.
  - Bấm nút `+` để tăng số lượng lên 3 -> Tạm tính tăng tự động.
  - Bấm nút `-` để giảm về 2.
  - Thử quay lại Menu thêm đúng sản phẩm này với cùng kích cỡ và topping -> Giỏ hàng tự động gộp (merge) số lượng vào cùng một dòng món, không tạo dòng phân mảnh.
  - Bấm nút **"Tiến hành đặt món"**.

---

### Bước 6: Xác Thực Khách Hàng (Authentication Gateway)
- **Hiện tượng:** Vì chưa đăng nhập, hệ thống tự động nhận diện và chuyển hướng an toàn sang màn hình `/login?redirect=/checkout`.
- **Hành động:**
  - Nhập tài khoản mẫu đã được gieo mầm trong cơ sở dữ liệu:
    - **Email:** `customer@brewlite.com`
    - **Mật khẩu:** `Password123!`
  - Bấm nút **"Đăng nhập ngay"**.
- **Kết quả:** Hệ thống nhận diện thành công, lưu mã JWT token an toàn và tự động đưa người dùng đến thẳng trang Thanh toán `/checkout`.

---

### Bước 7: Màn Hình Thanh Toán & Áp Dụng Khuyến Mãi (Checkout & Voucher)
- **Hành động:**
  - Xem tóm tắt đơn hàng và địa điểm nhận món.
  - Nhập ghi chú nhận hàng: `Giao tại bàn số 5`.
  - Tại ô **Mã giảm giá**, nhập: `BREW20` rồi bấm **Áp dụng**.
- **Quan sát:**
  - Hệ thống áp dụng thành công mã ưu đãi giảm 20% tổng giá trị đơn hàng.
  - Số tiền giảm giá và tổng tiền thanh toán cuối cùng được tính toán chính xác.

---

### Bước 8: Mô Phỏng Thanh Toán & Chống Gửi Lặp (Mock Payment & Idempotency)
- **Thao tác:**
  - Chọn phương thức: **Ví điện tử (MoMo / ZaloPay)**.
  - Tại bảng *Mô phỏng kết quả thanh toán*, chọn **"Thành công (SUCCESS)"**.
  - Bấm nút **"Thanh toán & Đặt hàng"**.
- **Kỹ thuật nền tảng được kích hoạt:**
  - Hệ thống tự động sinh một mã `Idempotency-Key` duy nhất (UUIDv4) gửi kèm qua header HTTP.
  - Backend NestJS mở một cơ chế Transaction, áp dụng Khóa lạc quan (OCC) để kiểm tra và trừ kho an toàn, sau đó ghi nhận trạng thái thanh toán thành công `PAID`.

---

### Bước 9: Màn Hình Xác Nhận Đơn Hàng (Order Confirmation)
- **Quan sát màn hình `/order/confirmation`:**
  - Thông báo chúc mừng: *Đặt hàng thành công!*
  - Hiển thị **Mã đơn hàng chuẩn Barista:** ví dụ `#BL-4912`.
  - Huy hiệu trạng thái: **ĐÃ THANH TOÁN (PAID)**.
  - Mã QR mô phỏng để Barista quét nhận món tại quầy.
  - Lời khuyên nhận đồ: *Vui lòng có mặt tại quầy nhận món sau 10-15 phút*.
  - Thông báo tích lũy điểm thưởng: *+XX điểm thưởng vào tài khoản*.
  - Bấm nút **"Xem lịch sử đơn của bạn"**.

---

### Bước 10: Xem Lịch Sử Đơn Hàng & Chống Rò Rỉ Dữ Liệu (Order History & Anti-IDOR)
- **Hành động:** Tại màn hình `http://localhost:3000/orders`.
- **Quan sát:**
  - Đơn hàng vừa tạo xuất hiện ngay đầu danh sách với đầy đủ chi tiết từng ly đồ uống, topping và mã giảm giá đã áp dụng.
  - **Kiểm chứng bảo mật Anti-IDOR:** Khách hàng chỉ xem được duy nhất các đơn hàng do chính tài khoản của mình tạo ra. Mọi nỗ lực truy cập vào mã đơn hàng của khách hàng khác qua API đều bị máy chủ từ chối thẳng thừng với mã lỗi `HTTP 403 Forbidden`.

---

### Bước 11: Mô Phỏng Barista Cập Nhật Trạng Thái & Máy Trạng Thái Đơn
- **Hành động:**
  - Ngay tại giao diện thẻ đơn hàng của màn hình `/orders`, nhóm kỹ thuật đã tích hợp bảng điều khiển mô phỏng quy trình pha chế của Barista:
    - Bấm nút **"Pha chế"**: Trạng thái chuyển từ `PAID` sang `PREPARING` (Đang pha chế).
    - Bấm nút **"Món đã xong"**: Trạng thái chuyển sang `READY` (Sẵn sàng nhận món).
    - Bấm nút **"Hoàn tất"**: Đơn hàng chuyển sang `COMPLETED`.
  - **Kiểm chứng Máy trạng thái (State Machine):** Các thao tác chuyển trạng thái lùi hoặc sai quy tắc (ví dụ: từ `COMPLETED` lùi về `PENDING`) sẽ bị chặn đứng với mã lỗi `400 Bad Request`.

---

## 2. Các Kịch Bản Thử Nghiệm Mở Rộng Dành Cho Đánh Giá Kỹ Thuật

1. **Thử nghiệm thanh toán thất bại:** Tại Bước 8, chọn kết quả mô phỏng `FAILED`. Đơn hàng chuyển sang trạng thái `PAYMENT_FAILED` và giỏ hàng không bị xóa, cho phép khách hàng chọn phương thức khác để thử lại.
2. **Thử nghiệm sản phẩm hết hàng:** Chọn sản phẩm có tồn kho bằng 0 (ví dụ: Cà phê Muối Huế). Nút bấm chuyển sang `Tạm hết hàng`, ngăn chặn đặt món ngay từ giao diện người dùng và từ chối ở tầng backend.
3. **Thử nghiệm chạy kiểm thử tự động:**
   ```bash
   # Chạy 48 unit tests
   npm test
   # Chạy 20 integration tests với PostgreSQL thực
   npm --workspace=@brewlite/api run test:e2e
   ```
