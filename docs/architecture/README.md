# Tài Liệu Đặc Tả Kiến Trúc Hệ Thống BrewLite (System Architecture Specification)

**Dự án:** Hệ Thống Đặt Đồ Uống Trực Tuyến BrewLite (Assignment 2)
**Phân hệ:** Task 3 — Thiết kế Kiến trúc (Task 3.1: Kiến trúc Hệ thống & Task 3.2: Deployment Diagram)
**Phiên bản:** 2.2.0 (Task 3.2 — AWS Lightsail deployment baseline)
**Ngày cập nhật:** 18/11/2026
**Tác giả:** Đội ngũ Kiến trúc sư Phần mềm BrewLite (Senior Software Architects)

---

> **Baseline Task 3.2:** `origin/main` tại `607c6d402a79fc5763511fb1e0409f20a02299c5`. [PR #22](https://github.com/vohuunghiaah/brewlite/pull/22) và [PR #23](https://github.com/vohuunghiaah/brewlite/pull/23) đã merge lần lượt ngày 16/11/2026. Kiểm toán này không đưa mã nguồn feature vào `main`.

---

## MỤC LỤC
1. [Giới Thiệu & Mục Tiêu Kiến Trúc](#1-giới-thiệu--mục-tiêu-kiến-trúc)
2. [Nguyên Tắc Thiết Kế & Phong Cách Kiến Trúc](#2-nguyên-tắc-thiết-kế--phong-cách-kiến-trúc)
3. [Phân Định Kiến Trúc: Hiện Hành (`main`) vs Mục Tiêu (`Target`)](#3-phân-định-kiến-trúc-hiện-hành-main-vs-mục-tiêu-target)
   - [3.1 Kiến Trúc Hiện Hành Trên Nhánh `main` (Current Architecture)](#31-kiến-trúc-hiện-hành-trên-nhánh-main-current-architecture)
   - [3.2 Kiến Trúc Mục Tiêu Hoàn Chỉnh (Target / Reference Architecture)](#32-kiến-trúc-mục-tiêu-hoàn-chỉnh-target--reference-architecture)
4. [Đặc Tả Chi Tiết 12 Thành Phần Kiến Trúc Cốt Lõi](#4-đặc-tả-chi-tiết-12-thành-phần-kiến-trúc-cốt-lõi)
   - [4.1 Frontend Next.js (Mobile-first & PWA Target)](#41-frontend-nextjs-mobile-first--pwa-target)
   - [4.2 Backend NestJS Modular Monolith](#42-backend-nestjs-modular-monolith)
   - [4.3 Cơ Sở Dữ Liệu Quan Hệ PostgreSQL 16](#43-cơ-sở-dữ-liệu-quan-hệ-postgresql-16)
   - [4.4 Cơ Chế Quản Lý Schema & Migration](#44-cơ-chế-quản-lý-schema--migration)
   - [4.5 Dịch Vụ Thanh Toán Mô Phỏng (Mock Payment Service)](#45-dịch-vụ-thanh-toán-mô-phỏng-mock-payment-service)
   - [4.6 Cơ Chế Ghi Nhật Ký (Logging & Traceability)](#46-cơ-chế-ghi-nhật-ký-logging--traceability)
   - [4.7 Endpoint Kiểm Tra Sức Khỏe (Health Check API)](#47-endpoint-kiểm-tra-sức-khỏe-health-check-api)
   - [4.8 Quản Lý Cấu Hình & Dữ Liệu Bí Mật (Environment Variables & Secrets)](#48-quản-lý-cấu-hình--dữ-liệu-bí-mật-environment-variables--secrets)
   - [4.9 Giao Dịch ACID, Khóa Idempotency & Kiểm Soát Đồng Thời OCC](#49-giao-dịch-acid-khóa-idempotency--kiểm-soát-đồng-thời-occ)
   - [4.10 Cơ Chế Xác Thực & Phân Quyền (Authentication & RBAC)](#410-cơ-chế-xác-thực--phân-quyền-authentication--rbac)
   - [4.11 Ranh Giới Giao Tiếp Giữa Các Module (Module Boundaries)](#411-ranh-giới-giao-tiếp-giữa-các-module-module-boundaries)
   - [4.12 Tự Động Hóa CI/CD & Liên Hệ Triển Khai (DevOps Pipeline)](#412-tự-động-hóa-cicd--liên-hệ-triển-khai-devops-pipeline)
5. [Sơ Đồ Triển Khai Hệ Thống (Task 3.2 — UML Deployment Diagram)](#5-sơ-đồ-triển-khai-hệ-thống-task-32--uml-deployment-diagram)
6. [Hệ Thống Quyết Định Kiến Trúc (Architecture Decision Records - ADR)](#6-hệ-thống-quyết-định-kiến-trúc-architecture-decision-records---adr)
7. [Ma Trận Truy Vết Kiến Trúc (Architecture Traceability Matrix)](#7-ma-trận-truy-vết-kiến-trúc-architecture-traceability-matrix)

---

## 1. Giới Thiệu & Mục Tiêu Kiến Trúc

Hệ thống **BrewLite** được thiết kế nhằm đáp ứng nhu cầu đặt đồ uống trực tuyến tại cửa hàng và mang đi (Takeaway/Dine-in) của khách hàng, đồng thời tối ưu hóa luồng công việc tiếp nhận và pha chế đơn hàng của Barista.

Tài liệu này là thành quả của **Task 3 (Thiết kế Kiến trúc Hệ thống)** trong khuôn khổ Assignment 2 môn Công nghệ Phần mềm, kế thừa trực tiếp các kết quả đã được nghiệm thu chính thức:
- **Task 1 (Yêu cầu Phần mềm):** SRS v1.4.0, Ma trận truy vết yêu cầu RTM v2.5.0.
- **Task 2 (Phân tích & Thiết kế UML - PASS):** Hệ thống 14 tệp sơ đồ chính thức trong `docs/diagram/` (Activity, Sequence, Domain Class Diagram).
- **Báo cáo kiểm toán kỹ thuật:** [GAP-01 đến GAP-05 & So sánh ORM](../audits/task2-to-task3-gap-audit.md).

Mục tiêu cốt lõi của kiến trúc là đảm bảo:
1. **Tính Toàn Vẹn Dữ Liệu & Chống Bán Quá Mức (Overselling Prevention):** Kiểm soát đồng thời bằng Optimistic Concurrency Control (OCC) và phân tách nghiêm ngặt giữa giao dịch tạo đơn (TX1) và giao dịch thanh toán trừ kho (TX2).
2. **Khả Năng Chống Giao Dịch Trùng Lặp (Idempotent Payments):** Bảo vệ an toàn tài chính của khách hàng trước các sự cố mạng và thao tác gửi lại request.
3. **Tính Dễ Triển Khai & Khả Năng Bảo Trì (Maintainability & Deployability):** Kiến trúc đóng gói hoàn toàn trong Docker container, kiểm soát chất lượng bằng CI Quality Gates tự động.

---

## 2. Nguyên Tắc Thiết Kế & Phong Cách Kiến Trúc

Dự án áp dụng phong cách kiến trúc **Modular Monolith** kết hợp mô hình **Layered Architecture (Kiến trúc phân tầng)**:

```mermaid
flowchart TD
    subgraph PresentationLayer ["1. Tầng Trình Diễn (Presentation Layer)"]
        UI["Next.js App Router (React 19 Server/Client Components)"]
        State["Client State Management (React State)"]
        HTTPClient["API Client (Fetch API + Idempotency Headers)"]
    end

    subgraph APIGatewayLayer ["2. Tầng Điều Hướng & Bảo Vệ (API Gateway / Ingress)"]
        CORS["CORS Whitelist & Security Headers"]
        AuthGuard["JWT Authentication Guard (Passport JWT)"]
        Validation["ValidationPipe (class-validator / class-transformer)"]
    end

    subgraph BusinessLogicLayer ["3. Tầng Nghiệp Vụ Module Hóa (Modular Monolith Core)"]
        AuthMod["AuthModule"]
        ProdMod["ProductsModule"]
        OrderMod["OrdersModule (Order State Machine)"]
        PayMod["PaymentsModule (Mock Payment Engine)"]
        HealthMod["HealthModule (GET /health)"]
    end

    subgraph DataAccessLayer ["4. Tầng Dữ Liệu & Lưu Trữ (Data Access & Persistence)"]
        ORM["ORM Layer (Prisma / TypeORM)"]
        DB[(PostgreSQL 16 Engine)]
        Storage[("Docker Volume / Persistent SSD")]
    end

    PresentationLayer -->|HTTPS / JSON REST| APIGatewayLayer
    APIGatewayLayer --> BusinessLogicLayer
    BusinessLogicLayer --> DataAccessLayer
    ORM --> DB
    DB --> Storage
```

### Các nguyên tắc thiết kế chủ đạo:
1. **Loose Coupling, High Cohesion (Liên kết lỏng, gắn kết cao):** Mỗi module nghiệp vụ trong NestJS (`Products`, `Orders`, `Payments`, `Auth`) quản lý ranh giới dữ liệu và logic riêng biệt, chỉ giao tiếp với nhau qua Service Interface đã định nghĩa.
2. **Hai Giao Dịch Nghiệp Vụ Độc Lập (Two Independent Transactions):**
   - **Giao dịch 1 (TX1):** Tạo đơn hàng ở trạng thái `PENDING` (không trừ kho sớm, không giữ lock cơ sở dữ liệu kéo dài).
   - **Giao dịch 2 (TX2):** Tiếp nhận thanh toán mô phỏng -> Kiểm tra khóa Idempotency -> Trừ tồn kho bằng kỹ thuật OCC (Optimistic Concurrency Control) -> Chuyển trạng thái đơn sang `PAID`.
   - *Lưu ý thuật ngữ:* Đây là hai giao dịch cơ sở dữ liệu độc lập, hoàn toàn không phải giao thức phân tán Two-Phase Commit (2PC). Quy trình được hỗ trợ bởi cơ chế bù trừ và thử lại theo thiết kế.
3. **Stateless Backend API:** Phiên làm việc của người dùng được xác thực thông qua JSON Web Token (JWT) trong header `Authorization: Bearer <token>`, hỗ trợ việc mở rộng linh hoạt.

---

## 3. Phân Định Kiến Trúc: Hiện Hành (`main`) vs Mục Tiêu (`Target`)

Nhằm đảm bảo tính trung thực học thuật và chuẩn xác kỹ thuật, tài liệu kiến trúc tách biệt rõ ràng giữa hai hiện trạng:

### 3.1 Kiến Trúc Hiện Hành Trên Nhánh `main` (Current Architecture)
- **Nền tảng mã nguồn:** NestJS 12.0.1 kết hợp TypeORM 1.1.2 và PostgreSQL 16.
- **Phạm vi module hiện có:**
  - `ProductsModule`: Cung cấp danh mục sản phẩm đồ uống đơn giản (`GET /products`), nạp dữ liệu mẫu tự động (`products.seed.ts`).
  - `OrdersModule`: Cung cấp chức năng xem đơn (`GET /orders`, `GET /orders/:id`) và tạo đơn hàng cơ bản (`POST /orders`) lưu vào database qua TypeORM transaction, trạng thái cố định `PENDING`.
- **Hạn chế kỹ thuật trên `main`:**
  - Chưa có module `Auth`, `Payments`, `Promotions`, `Loyalty` và `Health`.
  - TypeORM đang chạy với cờ `synchronize: true` (chưa có migration scripts).
  - Khóa chính dùng số nguyên tự tăng (`Integer ID`). Không có kiểm soát tồn kho đồng thời (OCC).
  - Chưa có endpoint `GET /health` kiểm tra kết nối database.

### 3.2 Kiến Trúc Mục Tiêu Hoàn Chỉnh (Target / Reference Architecture)
- **Nền tảng mã nguồn:** Được hiện thực hóa và kiểm chứng trên nhánh `feature/sprint2-full-flow` (commit `588e3362` - Prisma ORM, PostgreSQL 16, Next.js 16).
- **Phạm vi module toàn diện:**
  - `AuthModule`: Đăng ký, đăng nhập băm mật khẩu Bcrypt salt 10, cấp phát JWT, phân quyền Role-Based Access Control (`CUSTOMER`, `STAFF`, `ADMIN`).
  - `ProductsModule`: Danh mục đồ uống, tùy biến kích thước (`SMALL`, `MEDIUM`, `LARGE`), tùy chọn topping, quản lý số lượng tồn kho `stock` và phiên bản đồng thời `version`.
  - `OrdersModule`: Quản lý vòng đời đơn hàng nghiêm ngặt bằng State Machine (`PENDING -> PAID -> PREPARING -> READY -> COMPLETED`).
  - `PaymentsModule`: Cổng thanh toán mô phỏng (Mock Payment) hỗ trợ ví điện tử và thẻ ngân hàng, kiểm tra khóa `Idempotency-Key`, thực thi trừ kho OCC atomicity trong database transaction.
  - `HealthModule`: Endpoint giám sát `GET /api/health` trên feature (controller `health` + global prefix `api`) thực hiện kiểm tra ping kết nối PostgreSQL phục vụ Container Orchestration.
  - `Promotion & Loyalty`: Áp dụng mã giảm giá (`BREW20`) và tích lũy điểm thưởng thành viên sau khi thanh toán thành công.

---

## 4. Đặc Tả Chi Tiết 12 Thành Phần Kiến Trúc Cốt Lõi

### 4.1 Frontend Next.js (Mobile-first & PWA Target)
- **Framework:** Next.js 16.4.5 (App Router, React 19, TypeScript 5).
- **Đặc trưng thiết kế:** Thiết kế hướng di động (Mobile-first) với viewport chuẩn 360px - 430px, kích thước vùng chạm (touch target) $\ge 44\text{px}$. Tối ưu hóa tải trang qua Server-Side Rendering (SSR) kết hợp Client-Side caching.
- **Định hướng PWA (`TARGET / PLANNED`):** Việc tích hợp Service Worker, Web App Manifest để cài đặt ứng dụng lên màn hình chính là tính năng thuộc thiết kế mục tiêu, chưa triển khai mã nguồn trên nhánh `main`.

### 4.2 Backend NestJS Modular Monolith
- **Framework:** NestJS 12.0.1 trên nền Express.
- **Tổ chức Module:** Tổ chức theo Domain-Driven Design (DDD). Mỗi module bao gồm Controller (tiếp nhận HTTP request), Service (xử lý business logic), Entity/Model (mô tả dữ liệu), DTO (Data Transfer Object kiểm tra dữ liệu đầu vào).
- **Độ tin cậy:** Sử dụng Dependency Injection (DI) toàn diện, thuận tiện cho việc viết mock test độc lập.

### 4.3 Cơ Sở Dữ Liệu Quan Hệ PostgreSQL 16
- **Hệ quản trị:** PostgreSQL 16 (Alpine container).
- **Tính năng khai thác:** Hỗ trợ chuẩn ACID Transactions toàn diện, các ràng buộc toàn vẹn khóa ngoại (`FOREIGN KEY`), chỉ mục duy nhất (`UNIQUE INDEX`), và kiểu dữ liệu JSONB lưu trữ danh sách topping của từng món.
- **Lưu trữ bền vững:** Toàn bộ dữ liệu database được ánh xạ vào Docker Named Volume `postgres_data`, đảm bảo dữ liệu không bị mất khi container khởi động lại.

### 4.4 Cơ Chế Quản Lý Schema & Migration
- **Hiện trạng `main`:** TypeORM với `synchronize: true` (chỉ phù hợp phát triển cục bộ).
- **Kiến trúc mục tiêu:** Áp dụng **Prisma Migrate** theo [ADR-002](adr/adr/002-postgresql-migration.md) và [ADR-006](adr/adr/006-orm-migration-prisma.md). Toàn bộ thay đổi cấu trúc bảng được quản lý bằng các tệp migration SQL có phiên bản và dấu thời gian trong thư mục `prisma/migrations/`.

### 4.5 Dịch Vụ Thanh Toán Mô Phỏng (Mock Payment Service)
- **Thiết kế theo [ADR-003](adr/adr/003-mock-payment.md):** Do dự án thuộc phạm vi đồ án học tập, hệ thống xây dựng một Sandbox Mock Payment Service nội bộ thay vì phụ thuộc vào cổng thanh toán thật.
- **Hỗ trợ phương thức:** Ví điện tử (MoMo / ZaloPay mô phỏng) và Thẻ ngân hàng nội địa / quốc tế mô phỏng.
- **Kịch bản mô phỏng:** Hỗ trợ 3 kết quả thử nghiệm thông qua tham số `mockOutcome`:
  - `SUCCESS`: Thanh toán thành công -> Thực thi trừ kho OCC -> Chuyển đơn sang `PAID`.
  - `FAILED`: Thanh toán thất bại (số dư không đủ) -> Chuyển đơn sang `PAYMENT_FAILED` -> Giữ nguyên giỏ hàng cho khách thử lại.
  - `PENDING`: Giao dịch đang chờ xử lý -> Đơn hàng giữ nguyên `PENDING`.

### 4.6 Cơ Chế Ghi Nhật Ký (Logging & Traceability)
- **Thiết kế theo [ADR-004](adr/adr/004-logging-healthcheck.md):** Sử dụng hệ thống Logging tích hợp sẵn của NestJS (`LoggerService`).
- **Định dạng:** Nhật ký xuất ra dòng chuẩn (`stdout`) theo định dạng JSON có cấu trúc bao gồm `timestamp`, `level` (`INFO`, `WARN`, `ERROR`), `context` (tên module), `message`, và `trace` (stack trace khi có ngoại lệ).
- **Bảo mật:** Bộ lọc log tự động làm sạch (masking) các thông tin nhạy cảm như mật khẩu người dùng, mã băm, chuỗi JWT token hoặc số thẻ thanh toán.

### 4.7 Endpoint Kiểm Tra Sức Khỏe (Health Check API)
- **Thiết kế theo [ADR-004](adr/adr/004-logging-healthcheck.md):** Thống nhất hợp đồng kiểm tra sức khỏe hệ thống đáp ứng SRS v1.4.0 §4.13, phân định minh bạch giữa hiện trạng triển khai MVP và định hướng mục tiêu mở rộng.
- **Đối chiếu Hợp đồng Nghiệp vụ & Hiện trạng Mã nguồn:**
  - **Hợp đồng nghiệp vụ mục tiêu (SRS v1.4.0 §4.13):** Khi hệ thống bình thường, `GET /health` phản hồi `HTTP 200 OK` với payload: `{"status": "ok", "database": "up"}`.
  - **Hiện trạng mã nguồn thực tế (nhánh feature `apps/api/src/health/`; URL thực tế `/api/health` do global prefix, xem §5.3):**
    - Khi bình thường: Phản hồi `HTTP 200 OK` với `{"status": "ok", "database": "connected", "service": "brewlite-api", ...}`.
    - Khi mất kết nối cơ sở dữ liệu: Phản hồi `HTTP 200 OK` kèm `status: "degraded"` và `database: "error"`.
  - **Khoảng sai lệch kỹ thuật được công khai (Disclosed Gap):**
    - Trường dữ liệu trả về `database: "connected"` chưa khớp với hợp đồng `database: "up"` của SRS v1.4.0.
    - Mã nguồn chưa cấu hình phản hồi mã lỗi `HTTP 503 Service Unavailable` khi mất kết nối cơ sở dữ liệu.
    - Do đó, **FR-13 chưa hoàn toàn đáp ứng hợp đồng phản hồi theo đặc tả SRS**. Tuyệt đối không sửa đổi SRS để hợp thức hóa mã nguồn chưa đạt yêu cầu, và không sửa mã nguồn trong PR tài liệu này.
    - Việc chuẩn hóa mã nguồn `HealthController` để khớp chính xác giá trị `database: "up"` và bổ sung kiểm thử tự động API contract test sẽ được thực hiện trong giai đoạn triển khai **Task 5 (Sprint 2 Delivery)**.
    - Tuyệt đối không tuyên bố FR-13 đã hoàn thành triển khai hoặc đã PASS toàn bộ kiểm thử hợp đồng API (hiện chỉ mới đạt smoke test kiểm tra tiến trình sống).
- **Định Hướng Mở Rộng Mục Tiêu Cho Môi Trường Cloud / Kubernetes (Proposed Target):**
  - Khi triển khai trên các nền tảng điều phối chuyên dụng (Kubernetes, AWS ECS) và tích hợp thư viện chuyên dụng `@nestjs/terminus`:
    - `GET /health/live` (Liveness Probe): Kiểm tra tiến trình NestJS sống, phản hồi HTTP 200 OK.
    - `GET /health/ready` (Readiness Probe): Kiểm tra tính sẵn sàng phục vụ và kết nối PostgreSQL; phản hồi HTTP 200 OK khi sẵn sàng hoặc HTTP 503 Service Unavailable khi mất kết nối cơ sở dữ liệu.
  - Hai endpoint phân tách này thuộc phạm vi **Đề xuất Mở rộng Mục tiêu (`Proposed Target / Future Roadmap`)**, chưa có mã nguồn trong MVP hiện tại.
- **Tích hợp vận hành:** Đóng vai trò là probe cho Docker compose `healthcheck` và synthetic monitoring probe (`NFR-05`, `NFR-07`).

### 4.8 Quản Lý Cấu Hình & Dữ Liệu Bí Mật (Environment Variables & Secrets)
- **Thiết kế theo [ADR-005](adr/adr/005-configuration-management.md):** Tuân thủ quy tắc **The Twelve-Factor App**.
- **Cơ chế nạp:** Nạp biến môi trường toàn cục thông qua `@nestjs/config` và `ConfigService`.
- **Bảo mật:** Tuyệt đối không lưu mật khẩu thật hoặc khóa JWT trong Git repository. Mẫu cấu hình được công khai trong `.env.example`, trong khi giá trị thực tế được tiêm tại runtime qua file `.env` cục bộ. Mục tiêu Lightsail dùng tệp environment riêng trên VM với quyền truy cập hạn chế; chưa có Cloud Secrets Manager hay cơ chế secrets production được xác minh.

### 4.9 Giao Dịch ACID, Khóa Idempotency & Kiểm Soát Đồng Thời OCC
- **ACID Transactions:** Sử dụng transaction cấp cơ sở dữ liệu cho các luồng nghiệp vụ tạo đơn và thanh toán.
- **Client Idempotency Key:** Khách hàng gửi kèm header `Idempotency-Key` (UUIDv4) khi gọi `POST /payments`. Backend áp dụng ràng buộc duy nhất `UNIQUE(idempotencyKey)` trong cơ sở dữ liệu để ngăn ngừa thanh toán trùng lặp khi có sự cố mạng hoặc double-click.
- **Optimistic Concurrency Control (OCC):**
  - Thực thể sản phẩm có trường `version: Int` và `stock: Int`.
  - Khi thanh toán (TX2), backend cập nhật kho bằng câu lệnh điều kiện:
    ```sql
    UPDATE products
    SET stock = stock - :quantity, version = version + 1
    WHERE id = :id AND version = :expectedVersion AND stock >= :quantity;
    ```
  - Nếu `affectedRows == 0`, hệ thống phát hiện xung đột đồng thời (`ConflictException`) và kích hoạt luồng hoàn tiền / thông báo hết hàng mà không gây tình trạng bán quá tồn kho (overselling).

### 4.10 Cơ Chế Xác Thực & Phân Quyền (Authentication & RBAC)
- **Giao thức:** JSON Web Token (JWT) theo chuẩn RFC 7519.
- **Mã hóa:** Mật khẩu người dùng được băm một chiều bằng thuật toán `Bcrypt` với độ phức tạp `saltRounds = 10`.
- **Bảo vệ Endpoint & Phòng Chống IDOR:**
  - Sử dụng NestJS Guard (`JwtAuthGuard`) kết hợp Decorator `@UseGuards()`.
  - **Phân định rõ về IDOR:** Khóa chính định dạng UUID giúp giảm thiểu nguy cơ dò quét tuần tự (ID Enumeration). Tuy nhiên, biện pháp cốt lõi để ngăn ngừa IDOR là **kiểm tra quyền sở hữu tại tầng nghiệp vụ (`order.userId === currentUser.id`)** trước khi trả dữ liệu cho client.
- **Phân quyền Role-Based Access Control (RBAC):**
  - `CUSTOMER`: Quyền xem menu, tạo đơn hàng cá nhân, thanh toán, xem lịch sử đơn hàng của chính mình.
  - `STAFF` (Barista): Quyền tra cứu danh sách đơn chờ pha chế và cập nhật trạng thái đơn (`PREPARING -> READY -> COMPLETED`).
  - `ADMIN`: Quyền quản lý danh mục sản phẩm, cập nhật giá và tồn kho.

### 4.11 Ranh Giới Giao Tiếp Giữa Các Module (Module Boundaries)
- Các module nghiệp vụ (`Auth`, `Products`, `Orders`, `Payments`) là các hộp đen độc lập (Encapsulated Modules).
- **Quy tắc phụ thuộc:** Module cấp cao có thể inject Service của module cấp thấp, nhưng tuyệt đối không truy cập trực tiếp Repository hoặc chỉnh sửa bảng dữ liệu của module khác.
- Ví dụ: `PaymentsService` khi cần đổi trạng thái đơn hàng bắt buộc phải gọi thông qua phương thức hoặc State Machine của `OrdersModule`, đảm bảo tính toàn vẹn của logic chuyển trạng thái.

### 4.12 Tự Động Hóa CI/CD & Liên Hệ Triển Khai (DevOps Pipeline)
- **Continuous Integration (CI) — [IMPLEMENTED]:** Sử dụng GitHub Actions (`.github/workflows/quality.yml`). Mọi Pull Request và Commit đẩy lên `main` đều phải vượt qua 4 chặng kiểm soát chất lượng (Quality Gates):
  1. `Install`: Cài đặt dependencies sạch qua `npm ci`.
  2. `Lint`: Quét lỗi cú pháp và kiểm tra an toàn kiểu dữ liệu (`oxlint` cho API, `eslint` cho Web).
  3. `Test`: Thực thi toàn bộ Unit Tests tự động bằng Jest và Node Test Runner.
  4. `Build`: Biên dịch ứng dụng Next.js và NestJS sang mã phân phối (`dist/`, `.next/`).
- **Continuous Delivery (CD) — [PROPOSED / PLANNED]:** Việc tự động đóng gói Docker image và push lên GitHub Container Registry (`ghcr.io`) là kế hoạch mở rộng cho giai đoạn Task 5 (Delivery), hiện **chưa có workflow CD tự động trong repository**.

---

## 5. Sơ Đồ Triển Khai Hệ Thống (Task 3.2 — UML Deployment Diagram)

**AWS PLATFORM SELECTED / INSTANCE PROVISIONED / APPLICATION DEPLOYMENT PENDING**

Nguồn chỉnh sửa chính thức: [DeploymentDiagram.puml](DeploymentDiagram.puml). Bản vector: [DeploymentDiagram.svg](DeploymentDiagram.svg). Sơ đồ dùng UML `node`, môi trường lồng nhau, `artifact`, `database` và communication paths có giao thức/cổng. Các package chỉ nhóm ba môi trường, không thay thế node thực thi bằng flowchart.

### 5.1 Bằng chứng và trạng thái

| Trạng thái | Ý nghĩa trong Task 3.2 |
|---|---|
| `IMPLEMENTED / VERIFIED` | Có cấu hình trong repository hoặc kết quả CI được dẫn chứng; ghi rõ phạm vi, không suy diễn thành production |
| `PROVISIONED` | Máy Lightsail đã được tạo theo xác nhận của nhóm trong yêu cầu Task 3.2 |
| `PLANNED / NOT DEPLOYED` | Thiết kế mục tiêu; chưa có bằng chứng triển khai ứng dụng |
| `PENDING VERIFICATION` | Chưa đủ bằng chứng để kết luận cài đặt, cấu hình hay runtime |

Máy `brewlite-production`: **AWS Lightsail, Ubuntu Linux, Singapore `ap-southeast-1`, AZ `ap-southeast-1a`, 2 vCPU, 2 GB RAM, SSD 60 GB, dual-stack, gói đã chọn 12 USD/tháng**. Đây là thông tin instance do nhóm cung cấp, không phải báo giá mới hay kết quả truy vấn AWS của đợt kiểm toán. Chưa có ảnh console/đầu ra SSH được lưu trong repository; cần bổ sung bằng chứng đã che thông tin nhạy cảm khi nghiệm thu vận hành. Chưa xác minh Docker Engine, firewall, DNS, HTTPS, container, volume, registry hoặc CD trên VM.

CI trên baseline đã được kiểm chứng: [Quality gates run 43903472968](https://github.com/vohuunghiaah/brewlite/actions/runs/43903472968), commit `607c6d40`, cả API và Web đạt Install → Lint → Unit Test → Build. Kết quả này không chứng minh production hoạt động. `main` chỉ có `.github/workflows/quality.yml`; `ci.yml`/`cd.yml` trên `feature/sprint2-full-flow` (`588e33624d149faa6e9320d59a4488e78d6cfb08`) chỉ là tham chiếu, không phải bằng chứng GHCR/CD trên `main`.

### 5.2 Local Development và CI

Developer PC/Laptop Windows dùng Docker Desktop/Compose theo [README gốc](../../README.md). [docker-compose.yml](../../docker-compose.yml) cấu hình ba container `brewlite-web`, `brewlite-api`, `brewlite-db`, bridge network `brewlite-network`, volume `postgres_data` gắn `/var/lib/postgresql/data`. Tên network/volume là khóa Compose; tên Docker thực tế có thể được thêm project prefix.

Hai Dockerfile đều dùng `node:22-alpine`. API chạy `npm run start:dev`; Web chạy `npm run dev -- --hostname 0.0.0.0`. Đây là development với bind mount source và volume dependencies, không phải image production. Database là `postgres:16-alpine`, `pg_isready` mỗi 5 giây, timeout 5 giây, tối đa 10 lần; API phụ thuộc `service_healthy`, Web phụ thuộc API nhưng chưa có API readiness check.

Browser trên máy phát triển gọi `localhost:3001` qua `NEXT_PUBLIC_API_URL`; `API_INTERNAL_URL=http://api:3001` chỉ dành cho container cùng network. Biến internal đã có trong cấu hình nhưng chưa thấy code Web sử dụng trên baseline. Các cổng host mặc định là 3000/3001/5432 và Compose không giới hạn bind vào loopback: không sao chép cấu hình này lên Internet. `.env` được Compose dùng để nội suy; API nhận `env_file`, Web nhận các biến được khai báo. Đợt kiểm toán này xác minh cấu hình, không tái chạy Docker local.

Runner CI là `ubuntu-latest`, Node.js **24**, matrix `api`/`web`; không nhầm runtime CI với Node.js **22** trong Dockerfile. Workflow chạy trên pull request và push vào `main`; chưa có publish image hay deploy production trên baseline.

### 5.3 Kiến trúc Lightsail và đường giao tiếp

Chọn một VM Lightsail để vận hành stack nhỏ của nhóm, tái sử dụng cách đóng gói Compose và giới hạn số dịch vụ cần quản trị. So với ECS/RDS, phương án này đơn giản hơn trong phạm vi bài tập và phù hợp gói VM đã tạo; đổi lại nhóm tự quản DB, cập nhật hệ điều hành, backup và phục hồi. [ADR-007](adr/adr/007-aws-lightsail-deployment.md) ghi quyết định ở trạng thái **Proposed**, chờ quy trình phê duyệt; việc VM tồn tại không tự làm ADR thành Accepted.

Mục tiêu: **AWS Lightsail → Ubuntu VM → Docker Engine → Caddy + Next.js + NestJS + PostgreSQL 16**. User Device, Internet, Developer PC, GHCR tham chiếu và External Synthetic Monitoring nằm trong nhóm **External Systems — Outside AWS**, tách khỏi Local Development, GitHub CI và package **AWS Lightsail Production**. Node GHCR tham chiếu là cùng registry ở panel CI, không phải registry được host trên VM. Mọi node ứng dụng, network, storage và artifact nằm trong phạm vi production đều là thiết kế, chưa xác minh triển khai. Chọn **Caddy** nhất quán; chưa có `Caddyfile` hoặc Compose production trong baseline.

| Communication path | Giao thức / cổng | Ý nghĩa và trạng thái |
|---|---|---|
| Developer → GitHub → Runner | Git/HTTPS TCP 443; workflow event/checkout | Luồng CI đã có; runner thực thi workflow artifact |
| Local browser → Web / API | HTTP TCP 3000 / 3001 | Host `localhost`; mặc định từ Compose và `.env.example` |
| Local Web → API | HTTP TCP 3001 | `api:3001` là URL nội bộ đã cấu hình, chưa có caller trong code Web |
| Local API → DB → volume | PostgreSQL TCP 5432; file I/O | `db:5432`; dữ liệu trong `postgres_data` |
| External Monitor → Internet → Caddy | HTTPS TCP 443 | PLANNED: `/menu`, `/api/products`, `/api/health`; mỗi phút trong 7 ngày; health main còn thiếu |
| User browser → Internet → Caddy | HTTPS TCP 443 | TLS termination mục tiêu; PWA riêng là PLANNED |
| Browser HTTP → Caddy redirect | HTTP TCP 80 → HTTPS TCP 443 | Redirect mục tiêu, chưa có HTTPS/DNS được xác minh |
| Caddy → Web | HTTP TCP 3000 | Các request UI; không publish trực tiếp ra host |
| Caddy → API | HTTP TCP 3001 | `/api/*` bỏ tiền tố `/api` trước khi forward |
| API → PostgreSQL | PostgreSQL TCP 5432 | Network nội bộ, không public; không tuyên bố đã có TLS DB |
| PostgreSQL → `postgres_data` | File I/O đọc/ghi | Persistent volume mục tiêu; chưa xác minh trên VM |
| Developer → VM | SSH TCP 22 | Mục tiêu chỉ cho IP/CIDR quản trị; policy hiện tại PENDING VERIFICATION |
| Runner → GHCR | HTTPS TCP 443, build/push image | PLANNED / NOT IMPLEMENTED trên `main` |
| GHCR → Docker Engine | HTTPS TCP 443, image delivery | PLANNED; chính VM khởi tạo pull outbound, không mở cổng inbound cho registry |
| Environment artifact → Engine; API → logs | Nạp biến; stdout/stderr | Dependency/vận hành mục tiêu, không phải cổng public |

NestJS hiện có `/products`, `/products/:id`, `/orders`, `/orders/:id`, và `/`; `main.ts` không đặt global prefix `/api`. Vì vậy mục tiêu Caddy phải chuyển `/api/products` thành `/products`, `/api/orders` thành `/orders`, và tương lai `/api/health` thành `/health`. Frontend mục tiêu dùng `NEXT_PUBLIC_API_URL=/api` tại build; `API_INTERNAL_URL=http://api:3001` chỉ dùng nếu bổ sung server-side caller. Đây là hợp đồng proxy cần triển khai/kiểm thử, không phải cấu hình đã chạy.

#### Hợp đồng API được chọn và chuyển đổi Sprint 2

Sơ đồ chỉ chọn **hợp đồng của `main`** làm thiết kế triển khai mục tiêu; chưa có baseline nào được xác minh chạy trên Lightsail. Đối chiếu trực tiếp các refs sau khi fetch:

| Nội dung | `main` — `607c6d402a79fc5763511fb1e0409f20a02299c5` (được chọn) | `feature/sprint2-full-flow` — `588e33624d149faa6e9320d59a4488e78d6cfb08` (tham chiếu chuyển đổi) |
|---|---|---|
| `apps/api/src/main.ts` | Không có global prefix; `PORT ?? 3001` | `app.setGlobalPrefix('api')`; `PORT || 4000` |
| Route nội bộ | `/products`, `/orders`; chưa có `/health` | `/api/products`, `/api/orders` (POST), `/api/orders/me`, `/api/health` |
| Caddy mục tiêu | **Bỏ** `/api`, upstream `api:3001` | **Giữ** `/api`, upstream `api:4000` nếu giữ port feature |
| `apps/api/Dockerfile` | Development Node.js 22, không có API healthcheck | Node.js 20 multi-stage, `ENV PORT=4000`, `EXPOSE 4000`; healthcheck `http://localhost:4000/api/health` |
| Health | Chưa triển khai trên main | `database: "connected"`; lỗi DB trả HTTP 200 với `degraded/error`, chưa đạt SRS `up` |

Khi tích hợp Sprint 2 phải chuyển cấu hình routing theo một release nhất quán: bỏ rule strip-prefix (không dùng đồng thời với rule giữ prefix), đổi upstream/PORT/healthcheck sang hợp đồng đã chọn, cập nhật `API_INTERNAL_URL` thành `http://api:4000/api` nếu caller ghép resource path, giữ public base `/api`, cập nhật CORS (`CORS_ORIGIN` trên feature thay cho `FRONTEND_URL` của main), Auth/JWT và smoke probes. Nếu chủ động override port feature về 3001 thì phải sửa đồng bộ Dockerfile healthcheck vốn hard-code 4000, upstream và các URL; override PORT đơn lẻ là không đủ. Đồng thời review Node.js image, Prisma/migration và secrets của feature. Đây là việc của PR tích hợp ứng dụng sau này; PR #24 không sửa code, Dockerfile hoặc Compose, và không tuyên bố Caddy đã hoạt động.

#### Smoke test routing — kế hoạch, chưa thực thi production

Thực hiện trên môi trường nghiệm thu có dữ liệu thử sau khi proxy và stack được triển khai. So sánh public response với request trực tiếp trong Docker network để tách lỗi proxy khỏi lỗi ứng dụng; không mở cổng nội bộ ra Internet.

| Ca kiểm tra | Baseline main được chọn | Sau khi chuyển toàn bộ sang Sprint 2 |
|---|---|---|
| `GET /api/products` qua HTTPS | Forward `http://api:3001/products`; HTTP 200, JSON sản phẩm hợp lệ | Giữ path `http://api:4000/api/products`; HTTP 200, JSON hợp lệ |
| `GET /api/orders` | Forward `/orders` tại 3001; HTTP 200, JSON danh sách | Không dùng làm smoke thành công: feature không có GET collection này; dùng `GET /api/orders/me` với JWT hợp lệ, HTTP 200 |
| `POST /api/orders` | Forward `/orders` tại 3001; payload theo DTO main + sản phẩm thử; HTTP 201, đơn PENDING; chỉ tạo một lần, đối chiếu DB | Giữ `/api/orders` tại 4000; JWT và DTO feature hợp lệ; HTTP 201, đơn PENDING; thử thiếu JWT phải bị từ chối |
| `GET /api/health` | Hiện forward `/health` tại 3001 phải trả 404: ghi nhận GAP-04, **không PASS readiness/NFR-07**. Khi bổ sung endpoint theo SRS: HTTP 200, `status: "ok"`, `database: "up"` | Giữ `/api/health` tại 4000; đối chiếu probe Docker cùng URL. `connected` là sai lệch contract, **không PASS FR-13** cho đến khi chuẩn hóa `up` |
| Kiểm tra lỗi và redirect | HTTP 80 chuyển HTTPS 443; không redirect loop; upstream không có `/api/api`; thử tắt DB/API/Web và timeout để monitor ghi unavailable | Tương tự; đặc biệt thử DB lỗi vì HTTP 200 `degraded` không được tính healthy; curl `-f` một mình chưa đủ |

Lưu release SHA/digest, baseline, method/URL, HTTP status, payload đã che dữ liệu nhạy cảm và kết quả DB. Smoke test xác minh routing không thay thế phép đo availability 7 ngày. Không chạy các ca tạo đơn trên dữ liệu production thật trong đợt review tài liệu.

Ranh giới mạng mục tiêu: chỉ public TCP 80/443, SSH 22 giới hạn nguồn; kiểm tra đồng thời IPv4 và IPv6 trên Lightsail và host firewall. Không publish 3000, 3001, 5432 ra Internet. Caddy nằm cùng bridge network với Web/API/DB; bridge không tự cung cấp phân quyền giữa các container. Cần khóa quyền truy cập các API trước khi mở public vì baseline chưa có Auth. Không có ECS, EKS, RDS, Vercel, Railway hay Cloudflare trong topology được chọn.

### 5.4 Environment, health, logs và storage

- **Environment:** cấu hình DB hiện dùng `DATABASE_HOST/PORT/NAME/USER/PASSWORD`, DB container dùng `POSTGRES_*`; không giả định `DATABASE_URL` của Prisma đã dùng trên `main`. Mục tiêu đặt `NODE_ENV=production`, `FRONTEND_URL` bằng public HTTPS origin, internal API bằng Docker DNS; không đặt secret vào `NEXT_PUBLIC_*`. `JWT_SECRET` có trong mẫu nhưng `main` chưa có Auth; chỉ bắt buộc khi tích hợp Auth feature. Tệp environment production nằm ngoài Git, quyền đọc hạn chế; không ghi giá trị thật trong sơ đồ.
- **Health:** development chỉ có DB `pg_isready`. `GET /health` chưa tồn tại trên `main`. Feature Prisma trả `database: "connected"`, SRS yêu cầu `database: "up"`; feature còn trả HTTP 200 với trạng thái degraded khi lỗi DB. Cần chuẩn hóa contract và thử lỗi DB trước nghiệm thu. Artifact health mô tả endpoint trong sản phẩm API tương lai, không phải tệp endpoint độc lập đã triển khai.
- **Logging:** Docker logs và NestJS application stdout/stderr là cơ chế mục tiêu. Baseline có log startup và TypeORM `logging: true`; chưa có chính sách rotation, retention, che secrets được xác minh trên VM. Cần giới hạn dung lượng logs, tránh SQL/credentials nhạy cảm. Không tuyên bố đã có CloudWatch hoặc logging tập trung.
- **Storage:** `postgres_data` có trong Compose development; volume production chưa được chứng minh tồn tại. Dữ liệu cùng SSD với OS, image và log nên volume không phải backup. Caddy cũng cần lưu trạng thái/chứng chỉ bền vững trong cấu hình production tương lai; đây là yêu cầu bổ sung, chưa có volume tương ứng trong repository.

### 5.5 Triển khai và vận hành còn chờ

Compose production tương lai phải là cấu hình riêng được review: image release đã build ở CI, chạy lệnh production, không bind mount source, không dùng dev/watch, không publish DB/API/Web. Chuẩn bị Caddy, HTTPS/domain, biến build/runtime, healthcheck, restart/resource/log limits, volume và rollback theo image digest. Không tạo hoặc sửa Compose production trong PR tài liệu này. `synchronize: true` trên `main` phải được thay bằng cơ chế migration đã kiểm thử trước production, qua PR ứng dụng riêng.

Một VM **2 GB RAM** là single point of failure: OS, Docker, Next.js, NestJS, PostgreSQL cùng chia sẻ RAM/CPU/SSD. Build ngay trên VM có thể gây hết RAM; ưu tiên build ngoài VM, đo memory/load thực tế, giới hạn connection pool/container và nâng gói khi cần. Giá 12 USD/tháng là gói đã chọn, chưa phải tổng chi phí gồm backup, domain hoặc phần sử dụng bổ sung. Không có HA hay bằng chứng đạt tải/availability của SRS.

Cần monitoring bên ngoài theo [SRS NFR-07](../requirements/srs.md): mỗi phút trong 7 ngày (10.080 mẫu), timeout 5 giây, kiểm tra `/menu`, `/products` và health có DB; khi dùng public proxy, map thành `/api/products`, `/api/health`. PASS ≥99% khi cả ba probe đạt; thiếu mẫu/bảo trì/lỗi đều tính không khả dụng. Lưu timestamp UTC, URL, status, latency, kết quả DB và thử mất dịch vụ. Chưa có kết quả đo. Bổ sung backup DB nhất quán ra ngoài VM, lịch/retention/mã hóa và quyền truy cập; thống nhất RPO/RTO, thử restore và ghi bằng chứng. Snapshot/volume cùng máy không thay thế kiểm thử phục hồi.

### 5.6 Traceability Mapping — UML → Architecture → Code

| UML Node / Artifact | Thành phần kiến trúc | Mã nguồn / Cấu hình | Trạng thái |
|---|---|---|---|
| Developer / Docker Desktop | Local runtime | [README](../../README.md), [Compose](../../docker-compose.yml) | IMPLEMENTED / VERIFIED cấu hình; runtime PENDING VERIFICATION |
| Next.js Container / artifact | Frontend | [apps/web](../../apps/web/), [Dockerfile](../../apps/web/Dockerfile) | Local config IMPLEMENTED / VERIFIED; production PLANNED / NOT DEPLOYED |
| NestJS Container / artifact | Backend | [apps/api](../../apps/api/), [Dockerfile](../../apps/api/Dockerfile) | Local config IMPLEMENTED / VERIFIED; production PLANNED / NOT DEPLOYED |
| PostgreSQL Container | Data Persistence | [Compose](../../docker-compose.yml), service `db` | Local config IMPLEMENTED / VERIFIED; production PLANNED / NOT DEPLOYED |
| Caddy / Caddyfile target | Web Entry | Chưa có production configuration; thiết kế §5.3 | PLANNED / NOT DEPLOYED |
| Docker Network | Internal Communication | [Compose](../../docker-compose.yml), `brewlite-network` | Local config IMPLEMENTED / VERIFIED; production PLANNED / NOT DEPLOYED |
| Persistent Storage / data directory | PostgreSQL Storage | [Compose](../../docker-compose.yml), `postgres_data` | Local config IMPLEMENTED / VERIFIED; volume AWS PENDING VERIFICATION |
| Repository / workflow / Runner | CI | [quality.yml](../../.github/workflows/quality.yml), run 43903472968 | IMPLEMENTED / VERIFIED |
| GHCR / release image artifacts | Container Registry | Chưa có workflow publish trên `main` | PLANNED / NOT DEPLOYED; NOT IMPLEMENTED |
| Lightsail VM / Ubuntu | Production Infrastructure | Nhóm xác nhận instance trong yêu cầu Task 3.2; thông số §5.1 | PROVISIONED; bằng chứng console/SSH cần bổ sung |
| Docker Engine trên VM | Container runtime | Chưa có bằng chứng cài đặt trên AWS | PENDING VERIFICATION |
| Environment artifact | Runtime configuration | [.env.example](../../.env.example), [app.module.ts](../../apps/api/src/app.module.ts), [main.ts](../../apps/api/src/main.ts) | Local config IMPLEMENTED / VERIFIED; production PLANNED / NOT DEPLOYED |
| Health artifact | API/DB readiness | [AppController](../../apps/api/src/app.controller.ts), [SRS](../requirements/srs.md); feature health chỉ tham chiếu | DB local probe IMPLEMENTED / VERIFIED; API main NOT IMPLEMENTED; production PLANNED / NOT DEPLOYED |
| Logs artifact | Operations | [main.ts](../../apps/api/src/main.ts), [app.module.ts](../../apps/api/src/app.module.ts) | Log code có trên main; Docker/NestJS production logs PLANNED / NOT DEPLOYED |
| External Synthetic Monitoring | Availability NFR-07 | [SRS §3](../requirements/srs.md#3-yêu-cầu-phi-chức-năng-non-functional-requirements---nfr); chưa có cấu hình monitor | PLANNED / NOT DEPLOYED; phép đo 7 ngày chưa thực hiện |
| User browser / PWA | Client | [Web UI](../../apps/web/src/app/menu/page.tsx); chưa có service worker/manifest PWA | Browser là client context; PWA PLANNED / NOT DEPLOYED |

Các trạng thái chức năng trong [RTM](../traceability-matrix.md) vẫn tách `main` với feature. Cấu hình production, file Caddy và release image trong sơ đồ là artifact mục tiêu, không phải đường dẫn tồn tại.

### 5.7 Tái tạo và kiểm tra sơ đồ

Dùng Java + PlantUML **1.2025.10**, Graphviz **2.44.1**, UTF-8:

```powershell
java -jar <plantuml.jar> -charset UTF-8 -checkonly docs/architecture/DeploymentDiagram.puml
java -jar <plantuml.jar> -charset UTF-8 -tsvg docs/architecture/DeploymentDiagram.puml
git diff --check
```

Nếu xuất PNG kiểm tra trực quan, đặt `PLANTUML_LIMIT_SIZE=10000` để không cắt hình rộng ở giới hạn mặc định 4096 px. Kiểm tra XML SVG, mở bản render để đọc labels/communication paths và đối chiếu trạng thái với bảng trên. Khi đưa vào PDF, dùng trang landscape riêng đủ lớn hoặc chia vùng Local/CI/Production thành các hình phóng to có cùng legend; không ép sơ đồ toàn cảnh thành một hình nhỏ trong trang văn bản. Xác minh thay đổi chỉ thuộc tài liệu, không chạm `apps/`, 14 tệp `docs/diagram/` hoặc Docker Compose. CI của PR kiểm tra lint/test/build, không kiểm thử production.

---

## 6. Hệ Thống Quyết Định Kiến Trúc (Architecture Decision Records - ADR)

Toàn bộ các quyết định công nghệ và kiến trúc then chốt của BrewLite được ghi nhận và lưu trữ tại thư mục [docs/architecture/adr/](adr/README.md):

1. **[ADR-001: Lựa chọn kiến trúc Modular Monolith cho Backend](adr/adr/001-modular-monolith.md)** — *Trạng thái: `Accepted` / `Implemented`*
2. **[ADR-002: Lựa chọn PostgreSQL và quản lý schema bằng Migration](adr/adr/002-postgresql-migration.md)** — *Trạng thái: `Accepted` / `Partially Implemented`*
3. **[ADR-003: Xây dựng dịch vụ thanh toán mô phỏng (Mock Payment Service)](adr/adr/003-mock-payment.md)** — *Trạng thái: `Accepted` / `Design Verified`*
4. **[ADR-004: Bổ sung Logging và Endpoint Health Check (`GET /health`)](adr/adr/004-logging-healthcheck.md)** — *Trạng thái: `Proposed` (Chờ triển khai chính thức trên `main` theo GAP-04)*
5. **[ADR-005: Quản lý cấu hình bằng Biến Môi Trường (Environment Variables)](adr/adr/005-configuration-management.md)** — *Trạng thái: `Accepted` / `Implemented`*
6. **[ADR-006: Đề xuất chuyển đổi ORM sang Prisma và chuẩn hóa UUID](adr/adr/006-orm-migration-prisma.md)** — *Trạng thái: `Proposed` (Chờ PO phê duyệt cho Sprint 2 - Task 5)*

7. **[ADR-007: AWS Lightsail một VM](adr/adr/007-aws-lightsail-deployment.md)** — *Proposed; VM PROVISIONED, ứng dụng PLANNED / NOT DEPLOYED*

---

## 7. Ma Trận Truy Vết Kiến Trúc (Architecture Traceability Matrix)

| Thành Phần Kiến Trúc | Quyết Định ADR | Sơ Đồ Thiết Kế Liên Quan | Vị Trí Mã Nguồn / Cấu Hình | Trạng Thái Triển Khai | Bằng Chứng Kiểm Chứng |
|---|:---:|:---:|---|:---:|---|
| **Frontend Web App** | - | [DeploymentDiagram.svg](DeploymentDiagram.svg) | `apps/web/` | **Implemented** | Next.js 16 build pass, giao diện Menu UI hoạt động |
| **Backend Modular Monolith** | [ADR-001](adr/adr/001-modular-monolith.md) | [ClassDiagram-Conceptual.mmd](../diagram/ClassDiagram-Conceptual.mmd) | `apps/api/src/app.module.ts` | **Implemented** | NestJS 12 build pass, nạp các module độc lập |
| **Cơ Sở Dữ Liệu PostgreSQL** | [ADR-002](adr/adr/002-postgresql-migration.md) | [DeploymentDiagram.svg](DeploymentDiagram.svg) | `docker-compose.yml` (`db`) | **Implemented** | PostgreSQL 16 container khởi chạy thành công qua Docker |
| **Schema Migration Mechanism** | [ADR-002](adr/adr/002-postgresql-migration.md)<br>[ADR-006](adr/adr/006-orm-migration-prisma.md) | - | `apps/api/src/app.module.ts`<br>*(Feature: `prisma/migrations`)* | **Partially Implemented** | `main` dùng `synchronize: true`; feature dùng `prisma migrate` |
| **Xác Thực Người Dùng (JWT & Bcrypt)** | [ADR-001](adr/adr/001-modular-monolith.md) | [SequenceDiagram.puml](../diagram/SequenceDiagram.puml) | *(Feature: `apps/api/src/auth/`)* | **Design Verified** / Feature Implemented | Ca kiểm thử `auth.service.spec.ts` pass 100% trên feature |
| **Quản Lý Đơn Hàng (State Machine)** | [ADR-001](adr/adr/001-modular-monolith.md) | [ActivityDiagram.puml](../diagram/ActivityDiagram.puml) | `apps/api/src/orders/` | **Partially Implemented** | `main` tạo đơn PENDING; State Machine đầy đủ trên feature |
| **Dịch Vụ Thanh Toán Mô Phỏng** | [ADR-003](adr/adr/003-mock-payment.md) | [ActivityDiagram-UC10.puml](../diagram/ActivityDiagram-UC10.puml)<br>[SequenceDiagram-UC10.puml](../diagram/SequenceDiagram-UC10.puml) | *(Feature: `apps/api/src/payments/`)* | **Design Verified** / Feature Implemented | Luồng thanh toán ví/thẻ và OCC đã nghiệm thu Task 2 |
| **Kiểm Soát Tồn Kho Đồng Thời (OCC)** | [ADR-003](adr/adr/003-mock-payment.md) | [SequenceDiagram-UC10.puml](../diagram/SequenceDiagram-UC10.puml) | *(Feature: `payments.service.ts`)* | **Design Verified** / Feature Implemented | Concurrency race condition test pass trên PR #9 |
| **Endpoint Health Check (`GET /health`)** | [ADR-004](adr/adr/004-logging-healthcheck.md) | [DeploymentDiagram.svg](DeploymentDiagram.svg) | *(Feature: `apps/api/src/health/`)* | **Design Verified** / Feature Partially Implemented | Chưa có trên `main`; feature trả `connected` (lệch SRS `up`, cần chuẩn hóa ở Task 5); smoke test pass |
| **Quản Lý Cấu Hình (Env Vars)** | [ADR-005](adr/adr/005-configuration-management.md) | [DeploymentDiagram.svg](DeploymentDiagram.svg) | `.env.example`, `apps/api/src/app.module.ts` | **Implemented** | `@nestjs/config` nạp biến môi trường thành công |
| **Containerization (Docker Compose)** | [ADR-001](adr/adr/001-modular-monolith.md) | [DeploymentDiagram.svg](DeploymentDiagram.svg) | `docker-compose.yml`, `Dockerfile` | **Implemented** | `docker compose up` khởi chạy 3 container thành công |
| **Tự Động Hóa CI Quality Gates** | - | [DeploymentDiagram.svg](DeploymentDiagram.svg) | `.github/workflows/quality.yml` | **Implemented** | GitHub Actions Run [43832699668](https://github.com/vohuunghiaah/brewlite/actions/runs/43832699668) SUCCESS |
