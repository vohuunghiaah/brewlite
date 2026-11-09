# BÁO CÁO KIỂM TOÁN THỰC TẾ TASK 5.1 – TASK 5.4
## ĐỐI CHIẾU GIỮA MÃ NGUỒN VÀ KẾT QUẢ KIỂM THỬ THỰC TẾ (REALITY CHECK)

- **Dự án:** BrewLite Monorepo
- **Ngày kiểm toán:** 09/11/2026
- **Nguyên tắc thực hiện:** Phân biệt rõ ràng giữa chức năng **đã được kiểm thử tự động xác minh (VERIFIED)**, chức năng **mới chỉ có mã nguồn (CODE-ONLY)**, và các phần phụ thuộc hạ tầng **bị chặn / chờ cấu hình (BLOCKED)**. Tuyệt đối không làm giả kết quả.

---

## 1. BẢNG TỔNG HỢP KIỂM TOÁN TỪNG HẠNG MỤC

| Hạng mục | Thành phần | Trạng thái | Minh chứng & Cơ chế kiểm chứng |
|---|---|:---:|---|
| **5.1.1.A** | Menu sản phẩm (Next.js) | **PASS (VERIFIED)** | Fetch API từ `/api/products`, xử lý loading/empty/error state, Mobile-first. Đã kiểm thử qua Unit Test `ProductCard.spec.tsx` và Playwright UI E2E. |
| **5.1.1.B** | Chi tiết sản phẩm & Size/Topping | **PASS (VERIFIED)** | Chọn Size S/M/L, chọn topping, số lượng, tự động tính lại giá theo thời gian thực. Đã kiểm thử qua Playwright E2E. |
| **5.1.1.C** | Giỏ hàng & Đồng bộ trạng thái | **PASS (VERIFIED)** | Zustand store, tính tổng tiền, ngăn dùng giá client làm nguồn tin cậy, lưu trữ phiên. Đã kiểm thử qua Unit Test `cart.spec.ts` & Playwright E2E. |
| **5.1.1.D** | Xác thực & Phân quyền Frontend | **PASS (VERIFIED)** | Đăng ký, đăng nhập JWT, tự động chuyển hướng khi chưa đăng nhập, token lưu bảo mật không qua URL. Đã kiểm thử qua Playwright E2E. |
| **5.1.1.E** | Giao diện Checkout | **PASS (VERIFIED)** | Tóm tắt đơn, mã giảm giá BREW20, validate chống submit lặp (`submitting` disabled). Đã kiểm thử qua Playwright E2E. |
| **5.1.1.F** | Thanh toán mô phỏng (Mock Payment) | **PASS (VERIFIED)** | Hỗ trợ Ví điện tử & Thẻ ngân hàng, 3 kịch bản kết quả (SUCCESS, FAILED, PENDING), giữ nguyên giỏ hàng khi thất bại. Đã kiểm thử qua Playwright E2E. |
| **5.1.1.G** | Xác nhận & Lịch sử đơn hàng | **PASS (VERIFIED)** | Hiển thị mã đơn `#BL-xxxx`, thời gian dự kiến 5-10 phút, điều hướng lịch sử `/orders`, chống truy cập chéo IDOR. Đã kiểm thử qua Playwright E2E. |
| **5.1.2** | Backend API Modules (NestJS) | **PASS (VERIFIED)** | 6 Modules: Products, Auth, Users, Orders, Payments, Health. 100% endpoint được kiểm thử tích hợp qua 20 Supertest E2E tests với PostgreSQL thực. |
| **5.2.1** | Unit Testing (Monorepo) | **PASS (VERIFIED)** | 48 tests đạt 100% (API: 36 tests; Web: 12 tests). `npm run test` vượt qua sạch sẽ. |
| **5.2.2** | Integration Testing | **PASS (VERIFIED)** | 20 Supertest tests kiểm thử: Auth, Concurrency OCC, Idempotency-Key, Order Status transitions. |
| **5.2.3** | UI E2E Testing (Playwright) | **PASS (VERIFIED)** | Bộ test E2E toàn trình đã chạy thành công trên 2 nền tảng: Desktop Chrome và Mobile Chrome (Pixel 5). Kết quả lưu tại `test-results/playwright-results.json`. |
| **5.3.1** | CI Pipeline (`ci.yml`) | **PASS (VERIFIED)** | Chạy thực tế trên GitHub Actions (Run `42484168846` PASS). Đã nâng cấp sử dụng `prisma migrate deploy` và tích hợp Playwright E2E. |
| **5.3.2** | CD Pipeline (`cd.yml`) | **PASS (HARDENED)** | Đã loại bỏ hoàn toàn các bước giả lập `echo SUCCESS`. Pipeline bắt buộc kiểm tra biến bí mật, gửi webhook thật, kiểm tra HTTP 200 tại `/api/health` thật và fail nếu lỗi. |
| **5.4.1** | Cơ chế Migration Database | **PASS (VERIFIED)** | Migration `20261108000000_init_schema` được quản lý phiên bản trong Git, `migration_lock.toml` chuẩn PostgreSQL, áp dụng lệnh `prisma migrate deploy`. |
| **5.4.2** | Cấu hình Docker Local vs Production | **PASS (HARDENED)** | Tách biệt `docker-compose.yml` (dev) và `docker-compose.prod.yml` (production: cô lập port 5432, mạng nội bộ, giới hạn CPU/RAM, xoay vòng log, không có secret mặc định). |
| **5.4.3** | Quy trình Rollback & Backup | **PASS (HARDENED)** | Loại bỏ lệnh `prisma migrate resolve --rolled-back` như cách hoàn tác mặc định; thay thế bằng quy trình 4 tầng: Container Tag, Expand-Contract, Snapshot Backup/Restore (`pg_dump`/`pg_restore`). |
| **5.4.4** | Triển khai Production Thực tế | **BLOCKED (PENDING)** | Tạm hoãn tạo tài nguyên cloud có phí để tuân thủ nguyên tắc không phát sinh chi phí khi chưa có sự phê duyệt của người dùng. Sẵn sàng kích hoạt khi có webhook/credentials. |
| **5.4.5** | Phát hành Bản Release `v1.0.0` | **PENDING** | Theo quy tắc nghiệm thu nghiêm ngặt, Tag / Release `v1.0.0` chỉ tạo khi production live HTTPS URL được xác minh trực tiếp. |

---

## 2. PHÂN TÍCH RỦI RO & KHUYẾN NGHỊ BÀN GIAO

1. **Về các Pull Request:**
   - PR #6, #7, #9 tạo thành một chuỗi kế thừa logic hoàn chỉnh.
   - PR #8 (từ tác giả bên ngoài `kenn4334-crypto`) bị lỗi nặng do commit nhầm toàn bộ `node_modules` (+2.8M dòng). Cần đóng PR #8 để tránh làm hỏng repository.
2. **Về Môi trường Production:**
   - Hệ thống mã nguồn và cấu hình container đóng gói đã đạt tiêu chuẩn 12-factor và sản xuất.
   - Để đưa hệ thống lên URL HTTPS thực tế, người dùng chỉ cần cung cấp dịch vụ hosting (như Render, Railway, hoặc VPS) và cấu hình secret `DEPLOY_WEBHOOK_URL` cùng `PRODUCTION_API_URL` trên GitHub.

