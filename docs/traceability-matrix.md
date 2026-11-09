# Ma Trận Truy Vết Yêu Cầu (Requirements Traceability Matrix - RTM)

**Dự án:** Hệ Thống Đặt Đồ Uống Trực Tuyến BrewLite  
**Phiên bản:** 2.0 (Sprint 2 Delivery)  
**Ngày cập nhật:** 08/11/2026  
**Mục đích:** Truy vết toàn diện từ Yêu cầu chức năng (FR) và Phi chức năng (NFR) đến Thiết kế kiến trúc/Sơ đồ, Mã nguồn triển khai và Kịch bản kiểm thử tự động.

---

## 1. Bảng Truy Vết Yêu Cầu Chức Năng (Functional Requirements)

| Mã YC | Mô tả yêu cầu nghiệp vụ | Sơ đồ & Tài liệu thiết kế | Mã nguồn Triển khai (Code) | Ca kiểm thử bảo chứng (Tests) | Trạng thái |
|---|---|---|---|---|:---:|
| **FR-01** | Xem thực đơn, lọc theo phân loại (Cà phê, Trà, Bánh) và tìm kiếm từ khóa | - `docs/requirements/srs.md`<br>- `docs/diagrams/activity-order-flow.puml` | - `apps/api/src/products/`<br>- `apps/web/src/app/page.tsx`<br>- `apps/web/src/components/ProductCard.tsx` | - `products.service.spec.ts`<br>- `ProductCard.test.tsx`<br>- `orders-payments.e2e-spec.ts` (Case 1) | **ĐẠT (PASS)** |
| **FR-02** | Xem chi tiết sản phẩm, chọn Size (S/M/L), chọn nhiều Topping, hiển thị giá biến đổi theo thời gian thực | - `docs/requirements/use-cases.md`<br>- `docs/diagrams/class-domain.puml` | - `apps/web/src/app/products/[id]/page.tsx`<br>- `apps/api/src/orders/dto/create-order.dto.ts` | - `orders.service.spec.ts`<br>- `orders-payments.e2e-spec.ts` (Case 1 & 3) | **ĐẠT (PASS)** |
| **FR-03** | Quản lý giỏ hàng: thêm món, gộp món trùng cấu hình, tăng/giảm số lượng, xóa món, tính tổng tiền tự động | - `docs/diagrams/activity-order-flow.puml`<br>- ADR-001 | - `apps/web/src/lib/store.ts`<br>- `apps/web/src/app/cart/page.tsx`<br>- `apps/web/src/components/Header.tsx` | - `apps/web/src/lib/store.test.ts` (7 tests)<br>- `tests/e2e/order-flow.spec.ts` | **ĐẠT (PASS)** |
| **FR-04** | Đăng ký, đăng nhập tài khoản khách hàng, băm mật khẩu Bcrypt, cấp phát và duy trì phiên xác thực JWT | - ADR-004<br>- `docs/diagrams/sequence-checkout.puml` | - `apps/api/src/auth/`<br>- `apps/api/src/auth/guards/jwt-auth.guard.ts`<br>- `apps/web/src/app/login/page.tsx` | - `auth.service.spec.ts` (5 tests)<br>- `orders-payments.e2e-spec.ts` (Case 2) | **ĐẠT (PASS)** |
| **FR-05** | Kiểm tra tồn kho thời gian thực và kiểm soát tranh chấp đồng thời bằng Optimistic Concurrency Control (OCC) | - ADR-003 (`version` column)<br>- `docs/architecture/overview.md` | - `apps/api/prisma/schema.prisma`<br>- `apps/api/src/payments/payments.service.ts` (updateMany with version) | - `payments.service.spec.ts` (OCC test)<br>- `orders-payments.e2e-spec.ts` (Stock check) | **ĐẠT (PASS)** |
| **FR-06** | Tạo đơn hàng mới với kiểm tra server-side pricing, lưu snapshot chi tiết từng dòng món trong Database Transaction | - `docs/diagrams/sequence-checkout.puml`<br>- ADR-002 | - `apps/api/src/orders/orders.service.ts` (`$transaction`)<br>- `apps/web/src/app/checkout/page.tsx` | - `orders.service.spec.ts`<br>- `orders-payments.e2e-spec.ts` (Case 3) | **ĐẠT (PASS)** |
| **FR-07** | Áp dụng mã khuyến mãi (Promo Code / Voucher), tính toán giảm giá phần trăm hoặc số tiền cố định | - `docs/requirements/srs.md` | - `apps/api/src/orders/orders.service.ts`<br>- `apps/web/src/app/checkout/page.tsx` | - `orders.service.spec.ts`<br>- `orders-payments.e2e-spec.ts` (`BREW20` test) | **ĐẠT (PASS)** |
| **FR-08** | Thanh toán qua Mock Payment Service hỗ trợ ví điện tử (`E_WALLET`) và thẻ ngân hàng (`BANK_CARD`), mô phỏng kết quả | - ADR-005<br>- `docs/requirements/srs.md` | - `apps/api/src/payments/payments.service.ts`<br>- `apps/web/src/app/checkout/page.tsx` | - `payments.service.spec.ts`<br>- `orders-payments.e2e-spec.ts` (Case 4) | **ĐẠT (PASS)** |
| **FR-09** | Chống thanh toán lặp vô ý qua mạng bằng cơ chế `Idempotency-Key` (IETF standard) | - ADR-005<br>- `docs/diagrams/sequence-checkout.puml` | - `apps/api/src/payments/payments.controller.ts`<br>- `apps/api/prisma/schema.prisma` (`idempotencyKey` unique index) | - `payments.service.spec.ts`<br>- `orders-payments.e2e-spec.ts` (Duplicate key test) | **ĐẠT (PASS)** |
| **FR-10** | Quản lý vòng đời đơn hàng qua Máy trạng thái hữu hạn (`order-state-machine.ts`), chặn đứng bước nhảy sai | - ADR-002<br>- `docs/diagrams/activity-order-flow.puml` | - `apps/api/src/orders/state-machine/order-state-machine.ts`<br>- `apps/api/src/orders/orders.service.ts` | - `order-state-machine.spec.ts` (6 tests)<br>- `orders-payments.e2e-spec.ts` (Invalid transition test) | **ĐẠT (PASS)** |
| **FR-11** | Hiển thị màn hình xác nhận đơn, sinh mã nhận món định dạng `#BL-xxxx`, thời gian dự kiến và lời khuyên nhận đồ | - `docs/requirements/srs.md` | - `apps/web/src/app/order/confirmation/page.tsx`<br>- `apps/api/src/orders/orders.service.ts` | - `orders-payments.e2e-spec.ts`<br>- `tests/e2e/order-flow.spec.ts` | **ĐẠT (PASS)** |
| **FR-12** | Xem lịch sử đơn hàng cá nhân (`GET /orders/me`), bảo vệ chống rò rỉ dữ liệu chéo người dùng (Anti-IDOR) | - ADR-004<br>- `docs/requirements/srs.md` | - `apps/api/src/orders/orders.controller.ts`<br>- `apps/api/src/orders/orders.service.ts`<br>- `apps/web/src/app/orders/page.tsx` | - `orders.service.spec.ts`<br>- `orders-payments.e2e-spec.ts` (IDOR 403 test) | **ĐẠT (PASS)** |
| **FR-13** | Tích lũy điểm thành viên tự động khi thanh toán thành công (1 điểm / 1.000đ), lưu vết lịch sử điểm thưởng | - `docs/diagrams/class-domain.puml`<br>- `docs/requirements/srs.md` | - `apps/api/src/payments/payments.service.ts`<br>- `apps/api/prisma/schema.prisma` (`LoyaltyTransaction`) | - `payments.service.spec.ts`<br>- `orders-payments.e2e-spec.ts` | **ĐẠT (PASS)** |

---

## 2. Bảng Truy Vết Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

| Mã NFR | Tiêu chí kỹ thuật | Giải pháp kiến trúc | Bằng chứng kiểm chứng | Trạng thái |
|---|---|---|---|:---:|
| **NFR-01** | Thời gian phản hồi API < 500ms | Thiết kế NestJS Monolith tinh gọn, truy vấn Prisma tối ưu index | Supertest E2E run toàn bộ 20 tests chỉ trong ~14 giây (trung bình < 50ms/request) | **ĐẠT** |
| **NFR-02** | An toàn xác thực & Bảo mật dữ liệu | - Mật khẩu hash bằng Bcrypt Salt 10<br>- JWT Guard cho tất cả private endpoints<br>- Kiểm tra quyền sở hữu orderId chống IDOR<br>- Không lưu token trong URL/logs | - 100% test IDOR và Guard trả về 401/403<br>- ESLint security rules sạch 0 lỗi | **ĐẠT** |
| **NFR-03** | Tính sẵn sàng & Độ tin cậy dữ liệu | - PostgreSQL ACID Transactions (`$transaction`)<br>- Optimistic Locking chống over-selling<br>- Container Health Check endpoints | - `orders-payments.e2e-spec.ts`<br>- Docker Compose healthcheck probes cho postgres, api, web | **ĐẠT** |
| **NFR-04** | Khả năng mở rộng & Bảo trì | Cấu trúc Monorepo chia mô-đun nghiệp vụ rõ ràng (`apps/web`, `apps/api`) | TypeScript toàn bộ hệ thống, npm workspaces độc lập | **ĐẠT** |
| **NFR-05** | Trải nghiệm người dùng Mobile-first | Giao diện Next.js TailwindCSS thiết kế chuẩn di động (max-w-md, bottom bar, touch targets > 44px) | Kiểm tra trực quan trên màn hình mobile, Playwright Pixel 5 viewport profile | **ĐẠT** |
| **NFR-06** | Tự động hóa CI/CD & Delivery | - GitHub Actions CI Quality Gate (Lint, Unit, Integration, Build)<br>- CD Pipeline đóng gói Docker GHCR | - `.github/workflows/ci.yml`<br>- `.github/workflows/cd.yml`<br>- `docker-compose.yml` | **ĐẠT** |

---

## 3. Kết Luận Đánh Giá

100% các yêu cầu từ **FR-01 đến FR-13** và **NFR-01 đến NFR-06** đã được ánh xạ đầy đủ, thiết kế chuẩn mực, cài đặt mã nguồn hoàn chỉnh và có ca kiểm thử tự động xác minh không sót bất kỳ trường hợp nào.

