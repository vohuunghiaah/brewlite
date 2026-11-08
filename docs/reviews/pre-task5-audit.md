# BÁO CÁO ĐÁNH GIÁ ĐIỀU KIỆN TIÊN QUYẾT TRƯỚC SPRINT 2 (TASK 5)
## DỰ ÁN: BREWLITE — HỆ THỐNG ĐẶT CÀ PHÊ KHÔNG DÙNG TIỀN MẶT
- **Mã tài liệu:** `REV-PRE-TASK5-01`
- **Thời điểm đánh giá:** 08/11/2026
- **Trạng thái:** CHÍNH THỨC (Baseline Review)

---

## 1. MỤC ĐÍCH ĐÁNH GIÁ
Báo cáo này rà soát toàn diện tình trạng hiện tại của repository `https://github.com/vohuunghiaah/brewlite.git`, đối chiếu với các yêu cầu từ Task 1 đến Task 4 trong tài liệu *Assignment 2 – BrewLite (Requirements to Deployment, Ver 1.0)* trước khi triển khai Task 5 (Sprint 2, CI/CD và Production Delivery).

---

## 2. BẢNG TỔNG HỢP TRẠNG THÁI CÁC ĐIỀU KIỆN TIÊN QUYẾT (GATES 0 - 4)

| STT | Hạng mục kiểm tra | Tạo phẩm yêu cầu | Trạng thái ban đầu | Trạng thái sau rà soát | Ghi chú & Đánh giá |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | **Task 1.1** — Bối cảnh, stakeholder, phạm vi | `docs/requirements/context-and-scope.md` | MISSING (trên repo) | **PASS** | Đã nhập từ bộ tài liệu chuẩn: xác định 6 stakeholder, ma trận in/out scope, rủi ro, giả định. |
| **2** | **Task 1.2** — SRS rút gọn | `docs/requirements/srs.md` | MISSING (trên repo) | **PASS** | 13 FRs (MoSCoW), 6 NFRs, tiêu chí Gherkin, sơ đồ use-case tổng quát. |
| **3** | **Task 1.3** — Đặc tả use-case trọng tâm | `docs/requirements/use-cases.md` | MISSING (trên repo) | **PASS** | Đặc tả chi tiết `UC-CORE-01` (Đặt & thanh toán đơn hàng) với luồng chính, luồng phụ, ngoại lệ. |
| **4** | **Task 2.1** — Activity diagram | `docs/diagrams/activity-order-flow.puml/.svg` | MISSING (trên repo) | **PASS** | 5 swimlanes (Customer, Web, API, DB, Payment), rẽ nhánh hết hàng, chưa đăng nhập, fail. |
| **5** | **Task 2.2** — Sequence diagram | `docs/diagrams/sequence-checkout.puml/.svg` | MISSING (trên repo) | **PASS** | 5 lifelines, JWT, DB transaction, idempotency key, alt blocks. |
| **6** | **Task 2.3** — Class diagram | `docs/diagrams/class-domain.puml/.svg` | MISSING (trên repo) | **PASS** | 7 entities (User, Product, Order, OrderItem, Payment, Promotion, LoyaltyTransaction), 7 enums. |
| **7** | **Task 3.1** — Kiến trúc & ADR | `docs/architecture/overview.md`, ADRs | MISSING (trên repo) | **PARTIAL** | Cần hoàn thiện 5 ADRs và mô tả kiến trúc phân lớp / C4. |
| **8** | **Task 3.2** — Deployment diagram | `docs/diagrams/deployment-production.puml/.svg` | MISSING (trên repo) | **PARTIAL** | Cần hoàn thiện sơ đồ UML deployment cho cloud/production. |
| **9** | **Task 4.1** — Thiết lập repository | Cấu trúc repo, `.gitignore`, `.env.example`, Backlog | **PARTIAL** | **PASS** | PR #6 đã thiết lập cấu trúc nền tảng, GitHub Board (#2), 5 issues; bảo vệ nhánh main. |
| **10**| **Task 4.2** — Quản lý tài liệu | Lưu trữ docs dưới Git kiểm soát phiên bản | **PARTIAL** | **PASS** | Đã tổ chức tài liệu chuẩn hóa vào `docs/requirements`, `docs/diagrams`, `docs/architecture`. |
| **11**| **Task 4.3** — MVP Sprint 1 | API `GET /products`, UI Menu Next.js, Seed, Unit test | MISSING | **BLOCKED** | `apps/web` và `apps/api` ban đầu chỉ có `.gitkeep`, chưa có mã nguồn thực tế. |
| **12**| **Task 4.4** — Continuous Integration | CI workflow `Install -> Lint -> Test -> Build` | MISSING | **BLOCKED** | Chưa có `.github/workflows/ci.yml`. |

---

## 3. ĐÁNH GIÁ TÍNH NHẤT QUÁN TÀI LIỆU

### 3.1 Ranh giới giữa Tạo đơn hàng (Order Creation) và Thanh toán (Payment)
- **Đánh giá:** SRS (FR-05, FR-06) và use-case `UC-CORE-01` quy định tách biệt rõ ràng:
  - Khi khách hàng gửi yêu cầu tạo đơn (`POST /api/orders`), hệ thống kiểm tra tồn kho, tạo đơn hàng ở trạng thái `PENDING`.
  - Khách hàng sau đó thực hiện thanh toán (`POST /api/payments` kèm `Idempotency-Key`).
  - Thanh toán thành công (`SUCCESS`) mới kích hoạt chuyển trạng thái đơn hàng sang `PAID`, trừ kho với khóa lạc quan (`version`), và tích lũy điểm thưởng.
- **Kết luận:** **PASS** — Nhất quán hoàn toàn giữa SRS, Use Case, Sequence Diagram và Class Diagram.

### 3.2 Vòng đời trạng thái đơn hàng (Order State Machine)
- `PENDING` $\rightarrow$ `PAID` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`
- Trường hợp thất bại: `PENDING` $\rightarrow$ `PAYMENT_FAILED` (cho phép thử lại thanh toán sang `PAID` hoặc hủy `CANCELLED`).
- Tất cả chuyển tiếp được chặn qua phương thức miền `assertTransition()`.
- **Kết luận:** **PASS** — Nhất quán giữa mô hình lớp và use case.

### 3.3 Đường dẫn tài liệu và sơ đồ
- Thư mục sơ đồ chuẩn hóa tại `docs/diagrams/`, đảm bảo có cả file nguồn `.puml` và file kết xuất `.svg`.
- Thư mục quyết định kiến trúc đặt tại `docs/architecture/adr/`.
- **Kết luận:** **PASS** — Cấu trúc tệp đã được chuẩn hóa theo quy định mục 9 Assignment 2.

---

## 4. KẾ HOẠCH HÀNH ĐỘNG KHẮC PHỤC TRƯỚC SPRINT 2

Để hoàn tất Task 4 (Sprint 1) trước khi tiến hành Task 5:
1. **Hoàn thiện Task 3:**
   - Biên soạn `docs/architecture/overview.md`.
   - Biên soạn 5 ADRs: `001-monorepo-structure.md`, `002-state-machine-design.md`, `003-concurrency-optimistic-locking.md`, `004-jwt-authentication-flow.md`, `005-mock-payment-and-idempotency.md`.
   - Biên soạn `docs/diagrams/deployment-production.puml` và xuất ra `.svg`.
2. **Triển khai Task 4.3 (Sprint 1 MVP):**
   - Thiết lập root monorepo `package.json` với npm workspaces (`apps/web`, `apps/api`).
   - Thiết lập backend NestJS tại `apps/api` với Prisma ORM, kết nối PostgreSQL, ProductsModule (`GET /products`, `GET /products/:id`), HealthModule (`GET /health`), Prisma schema, database seeder, và unit tests.
   - Thiết lập frontend Next.js tại `apps/web` với App Router, TailwindCSS, Menu UI mobile-first, loading skeleton, error handling, empty state, và unit tests.
3. **Triển khai Task 4.4 (CI Pipeline):**
   - Tạo `.github/workflows/ci.yml` chạy `Install -> Lint -> Unit Test -> Build`.
4. **Kiểm tra cục bộ & Tạo Pull Request:**
   - Chạy lint, unit test, build cục bộ.
   - Commit theo Conventional Commits và đẩy lên nhánh `feature/sprint1-mvp-foundation`.
   - Tạo Pull Request cho Task 4 hoàn thiện để đảm bảo có bằng chứng nghiệm thu theo đúng yêu cầu bài tập.
