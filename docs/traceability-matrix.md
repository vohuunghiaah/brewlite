# Ma Trận Truy Vết Yêu Cầu (Requirements Traceability Matrix - RTM)

**Dự án:** Hệ Thống Đặt Đồ Uống Trực Tuyến BrewLite (Assignment 2)
**Phiên bản:** 2.1 (Chuẩn hóa toàn diện định danh FR-01 đến FR-13 theo SRS v1.1.0)
**Ngày cập nhật:** 14/11/2026
**Mục đích:** Truy vết đa chiều từ Yêu cầu chức năng (FR) và Phi chức năng (NFR) đến Use Case, Sơ đồ thiết kế kiến trúc, Mã nguồn triển khai và Ca kiểm thử xác minh.

---

## 1. Bảng Truy Vết Yêu Cầu Chức Năng (Functional Requirements Traceability)

| Mã YC | Tên yêu cầu nghiệp vụ | Use Case ánh xạ | Sơ đồ & Thiết kế liên quan | Mã nguồn Triển khai (Code) | Ca kiểm thử bảo chứng (Tests) | Trạng thái kiểm chứng |
|:---:|---|:---:|---|---|---|:---:|
| **FR-01** | Xem menu đồ uống, lọc theo danh mục | `UC-01` | - `docs/requirements/srs.md`<br>- `docs/diagram/ActivityDiagram.puml` | - `apps/api/src/products/`<br>- `apps/web/src/app/page.tsx`<br>- `apps/web/src/app/menu/page.tsx` | - `products.service.spec.ts`<br>- HTTP GET `/products` verification | **VERIFIED (PASS)** |
| **FR-02** | Xem chi tiết, chọn size/topping | `UC-02` | - `docs/requirements/use-cases.md`<br>- `docs/diagram/ClassDiagram.puml` | - `apps/web/src/app/menu/page.tsx`<br>- `apps/api/src/products/` | - `products.controller.spec.ts`<br>- UI State recalculation test | **VERIFIED (PASS)** |
| **FR-03** | Quản lý giỏ hàng và tính tổng tiền | `UC-03` | - `docs/requirements/srs.md`<br>- `docs/requirements/use-cases.md` | - `apps/web/src/app/menu/page.tsx`<br>- Client-side Cart State | - Frontend Component testing<br>- Cart Total Price recalculation | **VERIFIED (PASS)** |
| **FR-04** | Đăng ký, đăng nhập và JWT | `UC-07`<br>`UC-08` | - ADR-004 (JWT Auth Flow)<br>- `docs/diagram/SequenceDiagram.puml` | - `apps/api/src/auth/`<br>- `apps/api/src/auth/guards/jwt-auth.guard.ts` | - `auth.service.spec.ts`<br>- JWT Guard unit tests | **PARTIAL**<br>*(Đã có specs/code trên nhánh Sprint 1/2)* |
| **FR-05** | Tạo đơn hàng (Order Creation) | `UC-04` | - `docs/diagram/SequenceDiagram.puml`<br>- ADR-002 (Order Lifecycle) | - `apps/api/src/orders/orders.service.ts`<br>- `apps/web/src/app/menu/page.tsx` | - `orders.controller.spec.ts`<br>- Integration test `POST /orders` | **VERIFIED (PASS)** |
| **FR-06** | Thanh toán không tiền mặt mô phỏng | `UC-10` | - ADR-003 / ADR-005 (Mock Payment)<br>- `docs/diagram/SequenceDiagram.puml` | - `apps/api/src/payments/payments.service.ts`<br>- `apps/web/src/app/menu/page.tsx` | - `payments.service.spec.ts`<br>- E2E payment scenario | **PARTIAL**<br>*(Đã tích hợp Mock Payment trên Sprint 2)* |
| **FR-07** | Quản lý trạng thái đơn (State Machine) | `UC-04`<br>`UC-10`<br>`UC-12` | - `docs/requirements/use-cases.md`<br>- `docs/diagram/ActivityDiagram.puml` | - `apps/api/src/orders/state-machine/`<br>- Hàm `assertTransition` | - `order-state-machine.spec.ts`<br>- Invalid transition test | **VERIFIED (PASS)** |
| **FR-08** | Idempotent Payment | `UC-10` | - ADR-005 (Mock Payment & Idempotency)<br>- `docs/diagram/SequenceDiagram.puml` | - `apps/api/src/payments/`<br>- Unique Index `idempotencyKey` | - `payments.service.spec.ts` (Duplicate key test) | **PARTIAL**<br>*(Đã có cơ chế bảo vệ trên Sprint 2)* |
| **FR-09** | Kiểm soát tồn kho đồng thời (OCC) | `UC-04`<br>`UC-10` | - ADR-003 (Optimistic Locking)<br>- `docs/diagram/ClassDiagram.puml` | - `apps/api/src/products/`<br>- Transaction với cột `version` | - `payments.service.spec.ts` (OCC test)<br>- Concurrency stock test | **PARTIAL**<br>*(Đã cài đặt logic OCC trên Sprint 2)* |
| **FR-10** | Voucher và Loyalty | `UC-09`<br>`UC-11` | - `docs/requirements/srs.md`<br>- `docs/diagram/ClassDiagram.puml` | - `apps/api/src/payments/`<br>- Bảng `LoyaltyTransaction` | - `payments.service.spec.ts` | **NOT VERIFIED**<br>*(Chờ xác nhận BR-LOYALTY-01)* |
| **FR-11** | Xác nhận và lịch sử đơn | `UC-05`<br>`UC-06` | - `docs/requirements/srs.md`<br>- `docs/requirements/use-cases.md` | - `apps/web/src/app/menu/page.tsx`<br>- `apps/api/src/orders/` | - Order confirmation UI verification<br>- `GET /orders/:id` Anti-IDOR test | **VERIFIED (PASS)** |
| **FR-12** | Cập nhật tiến độ pha chế | `UC-12` | - `docs/requirements/srs.md`<br>- `docs/diagram/ActivityDiagram.puml` | - `apps/api/src/orders/orders.controller.ts`<br>- Endpoint `PATCH /orders/:id/status` | - State machine transition test | **PARTIAL**<br>*(Đã có API nội bộ, chưa có Barista UI)* |
| **FR-13** | Kiểm tra sức khỏe hệ thống (Health Check) | `UC-13` | - `docs/requirements/srs.md`<br>- Deployment Production Architecture | - `apps/api/src/app.controller.ts`<br>- Endpoint `GET /health` | - HTTP GET `/health` test | **VERIFIED (PASS)** |

---

## 2. Bảng Truy Vết Yêu Cầu Phi Chức Năng (Non-Functional Requirements Traceability)

| Mã NFR | Tiêu chí kỹ thuật | Giải pháp kiến trúc | Bằng chứng kiểm chứng | Trạng thái thực tế |
|:---:|---|---|---|:---:|
| **NFR-01** | Thời gian phản hồi API < 500ms | Thiết kế NestJS Modular tinh gọn, truy vấn cơ sở dữ liệu tối ưu | Supertest & Superbench thực tế phản hồi trung bình < 100ms | **VERIFIED (PASS)** |
| **NFR-02** | An toàn xác thực & Bảo mật dữ liệu | - Mật khẩu băm Bcrypt Salt $\ge 10$<br>- JWT Guard cho private endpoints<br>- Kiểm tra quyền sở hữu đơn hàng chống IDOR | - Auth service unit tests<br>- ESLint 0 security warnings | **VERIFIED (PASS)** |
| **NFR-03** | Trải nghiệm người dùng Mobile-first | Giao diện Next.js tối ưu viewport di động (360px - 430px), touch targets $\ge 44\text{px}$ | Kiểm tra trực quan đa thiết bị, Playwright mobile emulation profile | **VERIFIED (PASS)** |
| **NFR-04** | Tính toàn vẹn dữ liệu & Đồng thời | - PostgreSQL ACID Transactions<br>- Optimistic Locking với cột `version` chống overselling | Concurrency unit tests và Database constraint check | **VERIFIED (PASS)** |
| **NFR-05** | Khả năng triển khai & Container hóa | Khởi chạy trọn gói hệ thống (Web, API, DB) qua lệnh `docker compose up` | `docker-compose.yml` khởi chạy thành công 3 container sạch | **VERIFIED (PASS)** |
| **NFR-06** | Tự động hóa CI/CD & Khả năng bảo trì | GitHub Actions CI Quality Gate (Install, Lint, Unit Test, Build) | Workflow CI xanh 100% trên commit pull request | **VERIFIED (PASS)** |

---

## 3. Ghi Chú Đánh Giá Nghiệm Thu

1. **Chuẩn hóa mã định danh:** Toàn bộ bảng ma trận đã được đối chiếu 1:1 với tài liệu `docs/requirements/srs.md` v1.1.0 và `docs/requirements/use-cases.md` v1.1.0, loại bỏ hoàn toàn hiện tượng tráo đổi mã FR.
2. **Trạng thái thực tế:** Thay vì tuyên bố "100% ĐẠT (PASS)" thiếu căn cứ, các yêu cầu được phân định chính xác giữa những phần đã kiểm chứng thực tế (**VERIFIED**), những phần đã có thiết kế/mã nguồn ở các nhánh tính năng (**PARTIAL**), và những phần cần Product Owner phê duyệt nghiệp vụ (**NOT VERIFIED**).
