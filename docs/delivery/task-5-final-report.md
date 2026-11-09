# Báo Cáo Tổng Kết & Nghiệm Thu Kỹ Thuật Task 5 (Task 5 Technical Audit & Delivery Report)
## Sprint 2 Delivery, CI/CD Hardening, Versioned Migrations & Production Readiness

- **Dự án:** BrewLite Coffee & Tea Delivery System  
- **Repository:** `https://github.com/vohuunghiaah/brewlite.git`  
- **Thư mục làm việc:** `C:\dev\brewlite`  
- **Ngày kiểm toán & nghiệm thu:** 09/11/2026  
- **Nhóm thực hiện:** Nhóm Kỹ sư Phần mềm Cấp cao (Architect, Frontend, Backend, Database, QA, DevOps, Reviewer)  
- **Trạng thái tổng thể:** **PARTIAL / HARDENED & PRODUCTION-READY**
  - *Mã nguồn & Nghiệp vụ (Task 5.1):* **PASS**
  - *Kiểm thử tự động đa tầng (Task 5.2):* **PASS** (55 Unit Tests + 20 Integration Tests + 2 Playwright UI E2E Tests = 77 Tests)
  - *CI/CD Quality Gate (Task 5.3):* **PASS** (Loại bỏ hoàn toàn giả lập, kiểm tra HTTP thật, fail-safe)
  - *Cơ sở dữ liệu & Docker Hardening (Task 5.4):* **PASS** (Prisma Versioned Migration, `docker-compose.prod.yml`, quy trình sao lưu/rollback chuẩn)
  - *Triển khai Live Production Cloud:* **BLOCKED (CHỜ PHÊ DUYỆT TÀI NGUYÊN ĐÁM MÂY)** — Tuân thủ nguyên tắc không tự ý phát sinh chi phí hoặc khởi tạo hạ tầng cloud trả phí khi người dùng chưa cung cấp credentials / target URL.
  - *Tag / Release v1.0.0:* **DEFERRED (TẠM HOÃN)** — Chỉ gắn tag release chính thức sau khi môi trường cloud production live được xác minh bằng URL HTTPS thực tế.

---

## 1. Bảng Đối Chiếu Hiện Trạng Triển Khai Task 5

| Hạng mục / Giai đoạn | Yêu cầu kỹ thuật & Nghiệp vụ | Kết quả thực tế & Minh chứng | Trạng thái nghiệm thu |
|---|---|---|:---:|
| **Giai đoạn 0: Tiền đề** | Kiểm toán GitHub PR, đối chiếu Task 1–4, ranh giới SRS & use-case | Hoàn thành báo cáo `docs/reviews/pre-task5-audit.md` và `docs/reviews/pr-relationship-audit.md`. Bổ sung đầy đủ SRS, use-cases, 4 sơ đồ PlantUML, 5 ADRs. PR #7 chuẩn bị nền tảng Sprint 1 MVP. | **PASS** |
| **Task 5.1: Hoàn thiện MVP** | Triển khai luồng khép kín: Menu → Chi tiết (Size/Topping) → Giỏ hàng → Đăng nhập → Tạo đơn Transaction → Thanh toán mô phỏng OCC & Idempotency → Xác nhận mã `#BL-xxxx` → Lịch sử cá nhân (Anti-IDOR) | Xây dựng hoàn chỉnh Next.js 14 App Router (`apps/web`) và NestJS 10 Monolith (`apps/api`), Prisma ORM kết nối PostgreSQL 16; máy trạng thái `order-state-machine.ts`; kiểm soát tồn kho bằng Khóa lạc quan (OCC). | **PASS** |
| **Task 5.2: Tích hợp & Kiểm thử** | Kiểm thử Unit đa tầng, kiểm thử Integration với PostgreSQL thực, kiểm thử Playwright UI E2E, ma trận truy vết RTM | Tổng cộng **77/77 ca kiểm thử thành công**: 55 Unit tests (41 API + 14 Web) + 20 Integration tests kết nối PostgreSQL thực qua Supertest + 2 Playwright UI E2E tests (Desktop & Mobile Chrome). | **PASS** |
| **Task 5.3: Tự động hóa CI/CD** | Pipeline CI Quality Gate (Install, Migrate Deploy, Seed, Lint, Unit Test, Integration Test, Build, Playwright UI Test); Pipeline CD (Build Docker, Push GHCR, Real Webhook Trigger, Real HTTP Health Smoke Test, Failure Rollback) | `.github/workflows/ci.yml` và `.github/workflows/cd.yml` đã được làm sạch: loại bỏ toàn bộ các bước giả lập `echo SUCCESS`. Pipeline bắt buộc kiểm tra biến bí mật, gửi webhook thật, kiểm tra HTTP 200 tại `/api/health` thật và fail nếu lỗi. | **PASS** |
| **Task 5.4.1: Database Migrations** | Quản lý phiên bản migration với `prisma migrate deploy`, loại bỏ `db push` | Khởi tạo thư mục `apps/api/prisma/migrations/20261108000000_init_schema` kèm `migration_lock.toml`. Xác minh bằng `npx prisma migrate status`. | **PASS** |
| **Task 5.4.2: Docker Hardening** | Tách cấu hình Local vs Production, bảo vệ port 5432, loại bỏ secret mặc định | Tạo `docker-compose.prod.yml` cô lập CSDL trên mạng nội bộ `brewlite-internal`, loại bỏ port mapping 5432 ra host, bắt buộc biến môi trường không có fallback không an toàn. Cung cấp `.env.production.example`. | **PASS** |
| **Task 5.4.3: Rollback Strategy** | Không dùng `prisma migrate resolve --rolled-back` như lệnh hoàn tác mặc định; xây dựng phương án thực tế | Cập nhật quy trình hoàn tác 4 tầng: Container rollback tag, Expand-Contract, Pre-deploy snapshot backup/restore bằng `pg_dump`/`pg_restore`, chỉ dùng resolve metadata sau khi DB vật lý đã hoàn nguyên. | **PASS** |
| **Task 5.4.4: Live Production Cloud** | Triển khai live trên nền tảng cloud với chứng chỉ HTTPS thực tế | Tạm dừng để không phát sinh chi phí đám mây không mong muốn. Đã chuẩn bị sẵn sàng script, workflow và cấu hình để chạy ngay khi có target host & webhook. | **BLOCKED (PENDING CLOUD TARGET)** |
| **Task 5.4.5: Release Tag v1.0.0** | Phát hành tag và release chính thức trên GitHub | Tạm hoãn tạo tag release `v1.0.0` trên GitHub cho tới khi URL Production HTTPS thực tế được bàn giao và smoke test thành công. | **DEFERRED** |

---

## 2. Bằng Chứng Kỹ Thuật Thực Tế (Verifiable Execution Logs)

### 2.1. Kết Quả Kiểm Tra Chuẩn Mã Nguồn (Linting)
```text
> npm run lint
> npm run lint --workspaces

> @brewlite/api@1.0.0 lint
> eslint "{src,apps,libs,test}/**/*.ts" --max-warnings 0

> @brewlite/web@1.0.0 lint
> next lint
✔ No ESLint warnings or errors
```
*Kết quả:* **0 lỗi, 0 cảnh báo** trên toàn bộ monorepo.

---

### 2.2. Kết Quả Unit Tests Toàn Bộ Monorepo (`apps/api` + `apps/web`)
```text
> npm test
> npm run test --workspaces

PASS src/orders/state-machine/order-state-machine.spec.ts
PASS src/health/health.controller.spec.ts
PASS src/products/products.controller.spec.ts
PASS src/products/products.service.spec.ts
PASS src/payments/payments.service.spec.ts
PASS src/orders/orders.service.spec.ts
PASS src/auth/auth.service.spec.ts

Test Suites: 8 passed, 8 total
Tests:       41 passed, 41 total

> @brewlite/web@1.0.0 test
> jest

PASS src/lib/api-client.test.ts
PASS src/lib/store.test.ts
PASS src/components/ProductCard.test.tsx

Test Suites: 3 passed, 3 total
Tests:       14 passed, 14 total
```
*Kết quả:* **11/11 test suites passed, 55/55 unit tests passed.**

---

### 2.3. Kết Quả Integration Tests với PostgreSQL Thực Tế
Chạy trực tiếp với cơ sở dữ liệu PostgreSQL 16 thông qua Prisma ORM:
```text
> @brewlite/api@1.0.0 test:e2e
> jest --config ./test/jest-e2e.json

PASS test/orders-payments.e2e-spec.ts (14.235 s)
  BrewLite E2E Integration Test Suite (Full Flow)
    1. Health Check & Public Endpoints
      √ GET /health returns status ok (118 ms)
      √ GET /products returns list of available menu products (27 ms)
      √ GET /products/:id returns single product with details (19 ms)
    2. Authentication & Authorization Flow
      √ POST /auth/register creates a new user and returns JWT token (308 ms)
      √ POST /auth/register rejects duplicate email with 409 Conflict (34 ms)
      √ POST /auth/login returns token for registered credentials (HTTP 200) (146 ms)
      √ creates another user to test IDOR protections (180 ms)
      √ POST /auth/login returns token for seeded staff member (144 ms)
    3. Order Creation & Calculation
      √ POST /orders without auth fails with 401 Unauthorized (24 ms)
      √ POST /orders with empty items fails with 400 Bad Request (32 ms)
      √ POST /orders successfully creates order with server-recomputed prices (43 ms)
      √ GET /orders/me returns customer order history (18 ms)
      √ GET /orders/:id returns order details for owner (22 ms)
      √ GET /orders/:id prevents IDOR (other user cannot view this order) (22 ms)
    4. Mock Payment Service & Idempotency Key
      √ POST /payments prevents payment by unauthorized/other user (31 ms)
      √ POST /payments succeeds and transitions order to PAID (53 ms)
      √ POST /payments with same Idempotency-Key returns duplicate result without recharging (14 ms)
      √ PATCH /orders/:id/status rejects status change by regular customer (RBAC 403) (11 ms)
      √ PATCH /orders/:id/status allows staff to advance state from PAID to PREPARING (29 ms)
      √ PATCH /orders/:id/status rejects invalid transition (e.g. PREPARING to PENDING) (13 ms)

Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
```
*Kết quả:* **1/1 test suite passed, 20/20 integration tests passed.**

---

### 2.4. Kết Quả Playwright E2E UI Tests (Desktop & Mobile)
```text
> npx playwright test

Running 2 tests using 1 worker

  ok 1 [Desktop Chrome] › tests\e2e\order-flow.spec.ts:4:3 › Complete Customer Ordering Lifecycle (1.4s)
  ok 2 [Mobile Chrome] › tests\e2e\order-flow.spec.ts:4:3 › Complete Customer Ordering Lifecycle (1.3s)

  2 passed (8.6s)
```
*Kết quả:* **2/2 tests passed** trên cả Desktop và Mobile Viewport. Chi tiết tại `docs/testing/playwright-report.md`.

---

### 2.5. Trạng Thái Prisma Versioned Migrations
```text
> npx prisma migrate status --schema=apps/api/prisma/schema.prisma

Environment variables loaded from .env
Prisma schema loaded from apps\api\prisma\schema.prisma
Datasource "db": PostgreSQL database "brewlite", schema "public" at "127.0.0.1:5432"

1 migration found in prisma/migrations

Database schema is up to date!
```
*Kết quả:* Schema đồng bộ 100% với migration `20261108000000_init_schema`.

---

## 3. Danh Mục Các Hiện Vật Kỹ Thuật Đã Bàn Giao

| Phân nhóm | Đường dẫn tệp tin | Nội dung chi tiết |
|---|---|---|
| **Mã nguồn Backend** | `apps/api/src/` | 6 modules: `AuthModule`, `ProductsModule`, `OrdersModule`, `PaymentsModule`, `UsersModule`, `HealthModule` |
| **Máy trạng thái** | `apps/api/src/orders/state-machine/` | `order-state-machine.ts` cài đặt hàm `assertTransition` bảo vệ toàn vẹn trạng thái |
| **Mã nguồn Frontend** | `apps/web/src/` | 7 màn hình Next.js App Router: Menu (`/`), Chi tiết (`/products/[id]`), Giỏ (`/cart`), Đăng nhập (`/login`), Thanh toán (`/checkout`), Xác nhận (`/order/confirmation`), Lịch sử (`/orders`) |
| **Quản lý Giỏ & Auth**| `apps/web/src/lib/store.ts` | Zustand Store với persist LocalStorage, tự động gộp món trùng |
| **Migration CSDL** | `apps/api/prisma/migrations/` | Migration `20261108000000_init_schema` và `migration_lock.toml` |
| **Dữ liệu mẫu** | `apps/api/prisma/seed.ts` | Gieo mầm người dùng mẫu (`customer@brewlite.com`, `staff@brewlite.com`), 10 món đồ uống thực tế, mã giảm giá `BREW20` |
| **Container Hardened** | `docker-compose.prod.yml`, `.env.production.example` | Cấu hình Docker bảo vệ CSDL trên mạng nội bộ, giới hạn tài nguyên CPU/RAM, xoay vòng log |
| **CI/CD Workflows** | `.github/workflows/{ci.yml, cd.yml}` | CI tự động hóa Quality Gate; CD kiểm tra HTTP response thật, không giả lập |
| **Hồ sơ Kiểm thử** | `docs/testing/{test-report.md, playwright-report.md}` | Báo cáo chi tiết 77 ca kiểm thử tự động (Unit, Integration, E2E UI) đạt 100% thành công |
| **Báo cáo Kiểm toán** | `docs/reviews/{pr-relationship-audit.md, task5-implementation-audit.md}` | Kiểm toán quan hệ PR #6-#9 và đối chiếu thực tế từng tính năng |
| **Ma trận RTM** | `docs/traceability-matrix.md` | Truy vết toàn diện FR-01..13 và NFR-01..06 đến Sơ đồ, Code và Test |
| **Kịch bản Demo** | `docs/delivery/demo-script.md` | Hướng dẫn 11 bước trình diễn tương tác trực tiếp cho hội đồng nghiệm thu |
| **Tài liệu trung tâm** | `README.md`, `docs/deployment.md` | Hướng dẫn đầy đủ cấu trúc, cài đặt nhanh, API, biến môi trường và quy trình rollback 4 tầng |
