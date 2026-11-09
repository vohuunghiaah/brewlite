# BÁO CÁO KẾT QUẢ KIỂM THỬ PLAYWRIGHT E2E UI AUTOMATION
## TOÀN TRÌNH TRẢI NGHIỆM ĐẶT HÀNG KHÔNG TIỀN MẶT (BREWLITE E2E FLOW)

- **Dự án:** BrewLite Monorepo
- **Công cụ kiểm thử:** `@playwright/test` v1.65.0
- **Thời gian thực thi:** 09/11/2026
- **Trạng thái:** **100% PASSED (2/2 test cases)**
- **Thời gian chạy:** 8.6 giây

---

## 1. THIẾT KẾ KỊCH BẢN KIỂM THỬ (TEST DESIGN)

Kịch bản kiểm thử bao gồm toàn bộ vòng đời của khách hàng từ khi mở ứng dụng đến khi nhận mã đơn và kiểm tra lịch sử:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Khách Hàng (Playwright Browser)
    participant Web as Next.js Web App (:3000)
    participant API as NestJS API (:4000/api)
    participant DB as PostgreSQL 16 (:5432)

    Customer->>Web: 1. Mở trang chủ Thực đơn (/)
    Web->>API: GET /products
    API->>DB: SELECT * FROM "Product" WHERE "isAvailable" = true
    DB-->>API: Danh sách sản phẩm còn hàng
    API-->>Web: Trả về JSON Menu
    Web-->>Customer: Hiển thị giao diện danh mục & đồ uống

    Customer->>Web: 2. Chọn sản phẩm đầu tiên (/products/:id)
    Customer->>Web: 3. Tùy chọn Size (M) & Topping (Trân châu trắng) -> Nhấn "Thêm vào giỏ hàng"
    Web->>Web: Cập nhật Zustand Store (Tính toán tạm tính client)

    Customer->>Web: 4. Điều hướng tới Giỏ hàng (/cart)
    Customer->>Web: 5. Nhấn "Tiến hành đặt hàng" -> Chuyển hướng /login do chưa đăng nhập

    Customer->>Web: 6. Đăng nhập (customer@brewlite.com / Password123!)
    Web->>API: POST /auth/login
    API->>DB: Tìm người dùng & đối chiếu passwordHash (bcrypt)
    DB-->>API: Xác thực thành công
    API-->>Web: Trả về JWT Access Token
    Web-->>Customer: Chuyển tiếp người dùng sang trang /checkout

    Customer->>Web: 7. Xác nhận tóm tắt đơn & chọn kết quả mô phỏng (SUCCESS)
    Customer->>Web: Nhấn "Thanh toán ngay"
    Web->>API: POST /orders (Kèm JWT & Idempotency-Key)
    API->>DB: Transaction: Trừ kho Optimistic Locking & Tạo Order (#BL-xxxx)
    Web->>API: POST /payments (Mô phỏng thanh toán không tiền mặt)
    API->>DB: Cập nhật Order status = PAID, tích lũy điểm thưởng
    API-->>Web: Trả về xác nhận giao dịch thành công

    Web-->>Customer: 8. Hiển thị trang Xác nhận đơn (/order/confirmation?id=...)
    Customer->>Web: 9. Nhấn "Xem lịch sử đơn của bạn"
    Web->>API: GET /orders/me
    API-->>Web: Trả về danh sách đơn hàng đã đặt
    Web-->>Customer: 10. Hiển thị trang Lịch sử đơn hàng (/orders) với trạng thái ĐÃ THANH TOÁN
```

---

## 2. KẾT QUẢ THỰC THI CHI TIẾT (EXECUTION MATRIX)

| STT | Thiết bị mô phỏng | Môi trường trình duyệt | Kích thước màn hình | Thời gian chạy | Kết quả |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | **Desktop Chrome** | Chromium 158.0.8127.18 (Headless Shell) | 1280 x 720 | 1.4s | **PASS** |
| 2 | **Mobile Chrome** | Pixel 5 Emulation (Chromium) | 393 x 851 (dpr 2.75) | 1.3s | **PASS** |

### Trích xuất Log thực tế:
```text
Running 2 tests using 1 worker

  ok 1 [Desktop Chrome] › tests\e2e\order-flow.spec.ts:4:3 › BrewLite E2E Flow: Menu -> Customization -> Cart -> Login -> Checkout -> Payment -> Order History › Complete Customer Ordering Lifecycle (1.4s)
  ok 2 [Mobile Chrome] › tests\e2e\order-flow.spec.ts:4:3 › BrewLite E2E Flow: Menu -> Customization -> Cart -> Login -> Checkout -> Payment -> Order History › Complete Customer Ordering Lifecycle (1.3s)

  2 passed (8.6s)
```

---

## 3. CÁC ĐIỂM XÁC THỰC THÀNH CÔNG (VERIFIED ASSERTIONS)

1. **Title & Header Brand:** Xác minh tiêu đề trang chứa `BrewLite` và thanh điều hướng header hiển thị đúng nhận diện thương hiệu.
2. **Product Catalog Rendering:** Xác minh danh sách sản phẩm hiển thị đầy đủ hình ảnh, tên món, giá niêm yết từ cơ sở dữ liệu thực.
3. **Interactive Customization:** Xác minh tương tác chọn kích cỡ Size M và thêm Topping được cập nhật tức thì.
4. **Cart Management:** Xác minh sản phẩm được đưa vào giỏ hàng với đầy đủ cấu hình tùy chọn và tổng tiền hiển thị chính xác.
5. **Auth Guard & Redirect:** Xác minh người dùng vãng lai được điều hướng an toàn sang trang `/login` và tự động quay lại `/checkout` sau khi đăng nhập thành công.
6. **Order Creation & Payment Processing:** Xác minh backend NestJS tạo mã đơn hàng duy nhất (ví dụ: `#BL-4311`), trừ kho với Optimistic Locking và ghi nhận thanh toán `PAID`.
7. **Order History Isolation:** Xác minh người dùng xem được đơn hàng của chính mình trong `/orders`, bảo đảm phân quyền dữ liệu và ngăn chặn IDOR.
