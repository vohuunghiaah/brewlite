# Báo Cáo Kiểm Thử Toàn Diện Hệ Thống BrewLite (Test Report)

**Dự án:** BrewLite Coffee & Tea Delivery System  
**Phiên bản kiểm thử:** Sprint 2 MVP Delivery  
**Ngày thực hiện:** 08/11/2026  
**Môi trường:** Node.js v20+, TypeScript 5.6+, PostgreSQL 16+ (WSL2/Docker), Next.js 14, NestJS 10  
**Tình trạng:** **TẤT CẢ 77/77 TESTS ĐẠT CHUẨN (100% PASS)**

---

## 1. Tổng Quan Chiến Lược Kiểm Thử (Testing Pyramid)

Hệ thống BrewLite được xây dựng với chiến lược bảo đảm chất lượng nghiêm ngặt theo mô hình Testing Pyramid:

```
          / \
         / E2E \        -> 2 Playwright Tests (Menu -> Cart -> Auth -> Payment -> History)
        /-------\
       /  Integ  \      -> 20 Supertest E2E Tests (Real PostgreSQL, JWT, OCC, Idempotency, IDOR)
      /-----------\
     /    Unit     \    -> 55 Unit Tests (CORS Security, NestJS Services, State Machine, Zustand Store, UI Cards)
    /---------------\
```

---

## 2. Kết Quả Kiểm Thử Chi Tiết

### 2.1. Backend Unit Tests (`apps/api`)
- **Bộ kiểm thử (Test Suites):** 8 suites
- **Số ca kiểm thử (Tests):** 41 passed, 0 failed
- **Thời gian chạy:** ~34s

| Suite | File | Số test | Mục tiêu kiểm thử | Trạng thái |
|---|---|:---:|---|:---:|
| **CORS Security** | `cors.util.spec.ts` | 7 | Chặn wildcard (*), chặn origin không an toàn HTTP, bắt buộc HTTPS trong production | **PASS** |
| **Health Check** | `health.controller.spec.ts` | 3 | Kiểm tra endpoint giám sát sống còn `/health`, trả về DB status, commit SHA và phiên bản | **PASS** |
| **State Machine** | `order-state-machine.spec.ts` | 6 | Xác thực ma trận chuyển trạng thái hợp lệ và chặn đứng các bước nhảy trái phép | **PASS** |
| **Products Controller**| `products.controller.spec.ts`| 4 | Kiểm tra định tuyến lấy danh sách và chi tiết món | **PASS** |
| **Products Service** | `products.service.spec.ts` | 4 | Xử lý filter danh mục, tìm kiếm từ khóa, stock count | **PASS** |
| **Auth Service** | `auth.service.spec.ts` | 5 | Mã hóa bcrypt, JWT payload (sub, email, role), chống trùng email | **PASS** |
| **Orders Service** | `orders.service.spec.ts` | 6 | Tính toán lại giá server-side, áp mã giảm giá, kiểm tra tồn kho | **PASS** |
| **Payments Service** | `payments.service.spec.ts` | 6 | Xử lý Idempotency-Key chống thanh toán trùng, Optimistic Concurrency Control (OCC) trừ kho, tích điểm thưởng | **PASS** |

### 2.2. Frontend Unit & Component Tests (`apps/web`)
- **Bộ kiểm thử (Test Suites):** 3 suites
- **Số ca kiểm thử (Tests):** 14 passed, 0 failed
- **Thời gian chạy:** ~3s

| Suite | File | Số test | Mục tiêu kiểm thử | Trạng thái |
|---|---|:---:|---|:---:|
| **Product Card** | `ProductCard.test.tsx` | 3 | Render ảnh, nhãn hết hàng, định dạng tiền tệ Việt Nam `₫` | **PASS** |
| **API Client** | `api-client.test.ts` | 4 | Hàm gọi API, phân tích query param category & search | **PASS** |
| **Zustand Store** | `store.test.ts` | 7 | Thêm giỏ hàng, gộp món cùng size/topping, tách món khác tùy chọn, cập nhật số lượng, xóa món, xóa sạch giỏ, lưu phiên JWT | **PASS** |

### 2.3. Integration Tests với PostgreSQL Thực Tế (`apps/api/test`)
- **File:** `apps/api/test/orders-payments.e2e-spec.ts`
- **Số ca kiểm thử (Tests):** 20 passed, 0 failed
- **Database:** PostgreSQL 16+ kết nối thực qua Prisma ORM

| Phân nhóm | Chi tiết ca kiểm thử (Test Case) | HTTP Status | Kết quả |
|---|---|:---:|:---:|
| **1. Public & Health** | `GET /health` trả về `{ status: 'ok', service: 'brewlite-api' }` | 200 OK | **PASS** |
| | `GET /products` trả về thực đơn thực tế | 200 OK | **PASS** |
| | `GET /products/:id` trả về chi tiết món kèm giá hợp lệ | 200 OK | **PASS** |
| **2. Auth & RBAC** | `POST /auth/register` tạo tài khoản và trả về JWT token | 201 Created | **PASS** |
| | `POST /auth/register` từ chối email trùng lặp | 409 Conflict | **PASS** |
| | `POST /auth/login` đăng nhập bằng mật khẩu đúng | 200 OK | **PASS** |
| | Đăng ký người dùng thứ 2 để kiểm thử chống tấn công IDOR | 201 Created | **PASS** |
| | `POST /auth/login` cho tài khoản nhân viên `staff@brewlite.com` | 200 OK | **PASS** |
| **3. Orders Flow** | `POST /orders` không token bị từ chối | 401 Unauthorized | **PASS** |
| | `POST /orders` giỏ rỗng bị từ chối | 400 Bad Request | **PASS** |
| | `POST /orders` tạo đơn thành công, server tự tính giá lại theo Size + Topping + Promo Code `BREW20` | 201 Created | **PASS** |
| | `GET /orders/me` lấy danh sách đơn của người dùng đang đăng nhập | 200 OK | **PASS** |
| | `GET /orders/:id` xem chi tiết đơn của chính mình | 200 OK | **PASS** |
| | `GET /orders/:id` chặn người dùng khác xem đơn (Chống lỗ hổng IDOR) | 403 Forbidden | **PASS** |
| **4. Payments & OCC**| `POST /payments` chặn người khác thanh toán đơn không thuộc sở hữu | 403 Forbidden | **PASS** |
| | `POST /payments` thanh toán thành công, chuyển trạng thái đơn sang `PAID`, trừ kho OCC, tích điểm thưởng | 201 Created | **PASS** |
| | `POST /payments` gửi lặp lại cùng `Idempotency-Key` trả về kết quả cũ, không trừ tiền hai lần | 201 Created | **PASS** |
| | `PATCH /orders/:id/status` từ chối khách hàng tự nâng trạng thái đơn (Phân quyền RBAC) | 403 Forbidden | **PASS** |
| | `PATCH /orders/:id/status` cho phép nhân viên (STAFF) chuyển từ `PAID` sang `PREPARING` | 200 OK | **PASS** |
| | `PATCH /orders/:id/status` chặn đứng bước nhảy trạng thái trái phép từ `PREPARING` lùi về `PENDING` | 400 Bad Request | **PASS** |

### 2.4. End-to-End (E2E) UI Automation Test (`tests/e2e/order-flow.spec.ts`)
- **Công cụ:** Playwright Test v1.65.0
- **Số ca kiểm thử:** 2 passed (Desktop Chrome & Mobile Chrome Pixel 5)
- **Thời gian chạy:** 8.6s
- **Kịch bản:** Toàn bộ hành trình khách hàng từ A đến Z:
  1. Mở trang chủ Menu đồ uống (`/`).
  2. Chọn sản phẩm có sẵn -> trang chi tiết (`/products/:id`).
  3. Chọn kích cỡ Medium (M), thêm Trân châu trắng, chọn số lượng.
  4. Thêm vào giỏ hàng -> chuyển sang trang giỏ (`/cart`).
  5. Xác nhận tạm tính, bấm tiến hành đặt món -> điều hướng đăng nhập (`/login`).
  6. Điền thông tin đăng nhập `customer@brewlite.com`, xác thực JWT.
  7. Vào trang thanh toán (`/checkout`), chọn Mock Payment Service (SUCCESS).
  8. Xác nhận thanh toán thành công -> chuyển sang trang xác nhận (`/order/confirmation`).
  9. Kiểm tra hiển thị mã đơn `#BL-xxxx`, trạng thái `PAID` và điểm tích lũy.
  10. Bấm xem lịch sử đơn hàng (`/orders`) và xác nhận đơn xuất hiện trong danh sách.
- **Báo cáo chi tiết:** [Playwright Report](playwright-report.md)

---

## 3. Tổng Hợp Số Lượng Kiểm Thử Toàn Dự Án

```
========================================================================
 TỔNG HỢP KIỂM THỬ BREWLITE SPRINT 2 DELIVERY
========================================================================
 Phân loại                 Số Suite        Số Test        Kết quả
------------------------------------------------------------------------
 Backend Unit Tests            8              41           100% PASS
 Frontend Unit Tests           3              14           100% PASS
 API & DB Integration Tests    1              20           100% PASS
 Playwright E2E UI Tests       1               2           100% PASS
------------------------------------------------------------------------
 TỔNG CỘNG                    13              77           ALL PASSED
========================================================================
```

---

## 4. Hướng Dẫn Tái Hiện Kết Quả Kiểm Thử (Reproducibility)

Để chạy kiểm thử độc lập tại bất kỳ môi trường nào:

```bash
# 1. Chạy toàn bộ Unit Tests của Monorepo (Web + API)
npm test

# 2. Chạy E2E Integration Tests với Database thực tế
npm --workspace=@brewlite/api run test:e2e

# 3. Chạy Playwright E2E UI Automation Tests
npm run test:e2e:ui

# 4. Chạy Linting kiểm tra chuẩn mã nguồn
npm run lint

# 5. Chạy Build đóng gói Production
npm run build
```

