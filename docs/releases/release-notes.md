# BrewLite Release Notes — Phiên Bản v1.0.0-rc (Sprint 2 Delivery)

**Dự án:** BrewLite Coffee & Tea Delivery System  
**Phiên bản phát hành:** `v1.0.0-rc` (Release Candidate — Production Ready)  
**Ngày phát hành:** 09/11/2026  
**Nhánh nguồn:** `feature/sprint2-full-flow` -> `main`  
**Trạng thái Git Tag:** Dự kiến gắn tag `v1.0.0` sau khi hoàn tất nghiệm thu và triển khai cloud thực tế bởi maintainer.

---

## 1. Điểm Nổi Bật Của Bản Phát Hành (Key Highlights)

Bản phát hành đánh dấu sự hoàn thiện toàn diện của hệ thống BrewLite theo đúng mục tiêu của **Task 5 — Sprint 2, CI/CD và Production Delivery**:
- Hoàn tất 100% luồng người dùng: **Menu → Tùy chỉnh (Size/Toppings) → Giỏ hàng → Đăng nhập/Đăng ký → Tạo đơn → Thanh toán mô phỏng → Xác nhận mã nhận món → Lịch sử đơn hàng**.
- Thiết lập cơ chế chống thanh toán trùng lặp chuẩn công nghiệp qua header `Idempotency-Key`.
- Bảo vệ toàn vẹn kho hàng bằng giải pháp Khóa lạc quan (Optimistic Concurrency Control — OCC) với cột `version`.
- Ngăn chặn triệt để lỗ hổng rò rỉ dữ liệu cá nhân (Insecure Direct Object Reference — IDOR) trên tất cả endpoint đơn hàng.
- Quy chuẩn hóa vòng đời đơn hàng qua Máy trạng thái hữu hạn (`order-state-machine.ts`).
- Bộ kiểm thử tự động đạt 70/70 ca kiểm thử thành công: 48 Unit tests + 20 Integration tests với PostgreSQL thực tế + 2 Playwright UI E2E tests (Desktop & Mobile).
- Đóng gói container hóa đa tầng (Multi-stage Dockerfiles), cấu hình tách biệt môi trường phát triển và sản xuất (`docker-compose.prod.yml`).
- Tự động hóa kiểm thử và triển khai với GitHub Actions CI/CD (loại bỏ hoàn toàn giả lập, xác minh HTTP thật).

---

## 2. Tính Năng Mới Triển Khai (New Features)

### 2.1. Phía Người Dùng Khách Hàng (Customer Experience)
- **Menu Đồ Uống Trực Quan (`/`):**
  - Danh mục Cà phê, Trà sữa, Trà trái cây, Đá xay & Bánh ngọt.
  - Lọc nhanh theo danh mục và tìm kiếm thời gian thực.
  - Đánh dấu trực quan các sản phẩm tạm hết hàng (`Hết hàng`).
- **Tùy Chỉnh Chi Tiết Đồ Uống (`/products/[id]`):**
  - Chọn kích cỡ ly: Small (S), Medium (M, +6.000đ), Large (L, +12.000đ).
  - Chọn nhiều loại Topping ăn kèm (Trân châu đen, Thạch trà xanh, Kem cheese...).
  - Bộ đếm số lượng thông minh chặn đặt vượt tồn kho thực tế.
  - Tự động tính toán lại giá hiển thị ngay lập tức theo tùy chọn.
- **Giỏ Hàng Thông Minh (`/cart`):**
  - Tự động gộp các sản phẩm có cùng ID, cùng Size và cùng danh sách Topping.
  - Cho phép tăng/giảm số lượng hoặc xóa từng dòng món.
  - Lưu trạng thái giỏ qua LocalStorage (Zustand persist) chống mất dữ liệu khi tải lại trang.
- **Xác Thực Khách Hàng (`/login`):**
  - Đăng ký tài khoản mới và đăng nhập tức thời.
  - Hỗ trợ lưu trữ JWT an toàn, tự động điều hướng người dùng quay lại giỏ hàng sau khi đăng nhập.
  - Tích hợp tài khoản mẫu sẵn sàng để thử nghiệm nhanh (`customer@brewlite.com` / `Password123!`).
- **Thanh Toán & Mã Nhận Món (`/checkout` & `/order/confirmation`):**
  - Nhập mã ưu đãi giảm giá (Ví dụ: `BREW20` giảm ngay 20%).
  - Tự động sinh `Idempotency-Key` duy nhất cho mỗi phiên thanh toán.
  - Tích hợp Mock Payment Service cho phép kiểm thử cả 3 kịch bản: `SUCCESS`, `FAILED`, `PENDING`.
  - Màn hình xác nhận hiển thị mã nhận món chuẩn Barista (`#BL-xxxx`), mã QR mô phỏng và số điểm thưởng được tích lũy.
- **Tra Cứu Lịch Sử Đơn Hàng (`/orders`):**
  - Danh sách đơn hàng cá nhân hiển thị trạng thái sinh động (Chờ thanh toán, Đã thanh toán, Đang pha chế, Sẵn sàng, Hoàn tất).
  - Tích hợp công cụ mô phỏng dành cho Barista/Nhân viên cập nhật trạng thái đơn trực tiếp.

### 2.2. Phía Kỹ Thuật Hệ Thống & Backend (Core Architecture)
- **Kiến Trúc Module Hóa NestJS:**
  - `ProductsModule`: Danh mục và quản lý thông tin đồ uống.
  - `AuthModule`: Xác thực JWT, chiến lược Passport JWT, băm mật khẩu Bcrypt.
  - `OrdersModule`: Khởi tạo đơn trong Transaction, kiểm tra tồn kho, áp dụng máy trạng thái.
  - `PaymentsModule`: Xử lý thanh toán mô phỏng, ghi nhận bản ghi giao dịch, tích lũy điểm thưởng.
  - `HealthModule`: Endpoint `/health` phục vụ giám sát container và hệ thống.
- **PostgreSQL 16 Database Schema:**
  - Các bảng thực thể: `User`, `Product`, `Promotion`, `Order`, `OrderItem`, `Payment`, `LoyaltyTransaction`.
  - Ràng buộc khóa ngoại, chỉ mục hiệu năng cao và `unique constraint` trên `Payment.idempotencyKey`.

---

## 3. Danh Mục Endpoint API Hệ Thống

| Phương thức | Endpoint | Yêu cầu xác thực | Vai trò | Mục đích |
|---|---|:---:|:---:|---|
| `GET` | `/health` | Không | Công khai | Kiểm tra trạng thái sống còn của API |
| `GET` | `/products` | Không | Công khai | Lấy danh sách sản phẩm (hỗ trợ filter/search) |
| `GET` | `/products/:id` | Không | Công khai | Lấy thông tin chi tiết một sản phẩm |
| `POST` | `/auth/register` | Không | Công khai | Đăng ký tài khoản người dùng mới |
| `POST` | `/auth/login` | Không | Công khai | Đăng nhập và nhận JWT access token |
| `GET` | `/auth/me` | Có (JWT) | Người dùng | Lấy thông tin hồ sơ tài khoản hiện tại |
| `POST` | `/orders` | Có (JWT) | Khách hàng | Khởi tạo đơn hàng mới (tính toán lại giá) |
| `GET` | `/orders/me` | Có (JWT) | Khách hàng | Xem danh sách đơn hàng của chính mình |
| `GET` | `/orders/:id` | Có (JWT) | Khách hàng / Staff | Xem chi tiết đơn (bảo vệ chống IDOR) |
| `PATCH` | `/orders/:id/status`| Có (JWT) | Staff / Admin | Cập nhật tiến độ đơn theo máy trạng thái |
| `POST` | `/payments` | Có (JWT) | Khách hàng | Thanh toán đơn hàng qua Mock Payment Service |

---

## 4. Biến Môi Trường Hệ Thống (Environment Variables)

| Biến | Ví dụ giá trị | Bắt buộc | Mô tả |
|---|---|:---:|---|
| `DATABASE_URL` | `postgresql://brewlite:brewlite@localhost:5432/brewlite?schema=public` | Có | Chuỗi kết nối cơ sở dữ liệu PostgreSQL |
| `JWT_SECRET` | `brewlite-super-secret-jwt-key-2026-minimum-32-chars-long` | Có | Khóa bí mật ký mã token JWT (tối thiểu 32 ký tự) |
| `JWT_EXPIRES_IN` | `7d` | Không | Thời hạn hiệu lực của token (mặc định: 7 ngày) |
| `PORT` | `4000` | Không | Cổng lắng nghe của NestJS API (mặc định: 4000) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Có | Địa chỉ API backend mà Next.js client sẽ gọi |
| `NODE_ENV` | `production` / `development` | Không | Môi trường thực thi ứng dụng |

---

## 5. Hướng Dẫn Nâng Cấp & Triển Khai (Deployment Guide)

### 5.1. Khởi chạy bằng Docker Compose (Khuyến nghị cho Production/Staging)
```bash
# Khởi động toàn bộ cụm: PostgreSQL 16 + NestJS API + Next.js Web
docker compose up -d --build

# Kiểm tra trạng thái cụm container và health checks
docker compose ps

# Xem nhật ký hệ thống
docker compose logs -f
```

### 5.2. Khởi chạy tại máy phát triển cục bộ (Local Development)
```bash
# 1. Cài đặt các gói phụ thuộc
npm install --legacy-peer-deps

# 2. Khởi tạo cơ sở dữ liệu và seed dữ liệu mẫu
npx prisma db push --schema=apps/api/prisma/schema.prisma
npm --workspace=@brewlite/api run prisma:seed

# 3. Chạy toàn bộ kiểm thử xác nhận chất lượng
npm test
npm --workspace=@brewlite/api run test:e2e

# 4. Khởi chạy đồng thời Backend và Frontend
npm run start:api
npm run start:web
```

---

## 6. Các Giới Hạn Đã Biết & Kế Hoạch Tương Lai (Known Limitations & Roadmap)

1. **Thanh toán thật:** Hệ thống hiện tại sử dụng `MockPaymentService` để mô phỏng an toàn luồng thanh toán theo đúng yêu cầu đồ án (ADR-005). Bản thương mại trong tương lai sẽ tích hợp cổng thanh toán thực tế (VNPay / MoMo API).
2. **Thông báo đẩy (Push Notification):** Hiện tại khách hàng theo dõi trạng thái đơn qua làm mới trang hoặc truy cập `/orders`. Kế hoạch giai đoạn tiếp theo sẽ bổ sung WebSocket / Server-Sent Events (SSE) để thông báo chuông khi Barista hoàn tất đồ uống.

