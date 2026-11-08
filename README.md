# BrewLite — Hệ Thống Đặt Đồ Uống Trực Tuyến Hiện Đại

[![CI Quality Gate](https://github.com/vohuunghiaah/brewlite/actions/workflows/ci.yml/badge.svg)](https://github.com/vohuunghiaah/brewlite/actions/workflows/ci.yml)
[![CD Production Delivery](https://github.com/vohuunghiaah/brewlite/actions/workflows/cd.yml/badge.svg)](https://github.com/vohuunghiaah/brewlite/actions/workflows/cd.yml)
[![Tests Status](https://img.shields.io/badge/Tests-68%2F68%20Passed-success)](docs/testing/test-report.md)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.6-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**BrewLite** là giải pháp nền tảng thương mại điện tử chuyên biệt phục vụ chuỗi cửa hàng đồ uống (Cà phê & Trà). Hệ thống được thiết kế theo kiến trúc **Modular Monorepo** với trải nghiệm người dùng di động là ưu tiên hàng đầu (**Mobile-first**), tích hợp công nghệ chống thanh toán trùng lặp chuẩn IETF (`Idempotency-Key`), kiểm soát xung đột tồn kho bằng Khóa lạc quan (**Optimistic Concurrency Control — OCC**), bảo mật chống lỗ hổng phân quyền chéo (**Anti-IDOR**) và quy chuẩn hóa vòng đời đơn hàng qua **Máy trạng thái hữu hạn (Finite State Machine)**.

---

## 1. Kiến Trúc Hệ Thống & Ngăn Xếp Công Nghệ (Tech Stack)

```
                     +---------------------------------------+
                     |         NGƯỜI DÙNG / TRÌNH DUYỆT      |
                     |       (Mobile-First Responsive PWA)   |
                     +-------------------+-------------------+
                                         |
                                HTTP / REST API
                                         |
                     +-------------------v-------------------+
                     |       FRONTEND: Next.js 14 App Router |
                     |      TailwindCSS, Zustand Persist     |
                     |         (Port 3000 / Docker)          |
                     +-------------------+-------------------+
                                         |
                            JWT Authorization Bearer
                            Idempotency-Key Header
                                         |
                     +-------------------v-------------------+
                     |        BACKEND: NestJS 10 API         |
                     |      Modular Monolith Architecture    |
                     |         (Port 4000 / Docker)          |
                     +-------------------+-------------------+
                                         |
                                Prisma ORM 5.22
                                ACID Transactions
                                         |
                     +-------------------v-------------------+
                     |       DATABASE: PostgreSQL 16         |
                     |        OCC Concurrency Control        |
                     |         (Port 5432 / Docker)          |
                     +---------------------------------------+
```

| Tầng hệ thống | Công nghệ sử dụng | Mục đích chính |
|---|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript | Giao diện khách hàng, Server Components kết hợp Client Components tối ưu SEO và tốc độ tải trang |
| **Giao diện & Trạng thái** | TailwindCSS, Lucide Icons, Zustand | Giao diện di động mượt mà, quản lý giỏ hàng và phiên xác thực tự động lưu trữ (persist) |
| **Backend** | NestJS 10, Express, Passport JWT, Bcrypt | Xây dựng RESTful API dạng module hóa cao, bảo đảm kiểm tra kiểu dữ liệu và mã hóa an toàn |
| **Cơ sở dữ liệu & ORM** | PostgreSQL 16, Prisma ORM | Quản lý schema có phiên bản, giao dịch ACID, tối ưu hóa chỉ mục tìm kiếm và khóa lạc quan |
| **Bảo mật & Tính toàn vẹn** | IETF Idempotency-Key, State Machine, RBAC | Chống thanh toán trùng lặp, chặn đứng bước nhảy trạng thái sai, chống lỗ hổng IDOR |
| **Container & CI/CD** | Docker Multi-stage, Docker Compose, GitHub Actions | Đóng gói image siêu nhẹ (<150MB), điều phối cụm cục bộ và tự động hóa chất lượng phần mềm |

---

## 2. Cấu Trúc Mã Nguồn Monorepo

```text
c:\dev\brewlite\
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CI Quality Gate (Lint, Unit, Integration DB, Build)
│       └── cd.yml                 # CD Production Delivery (Docker GHCR, Deploy, Smoke Test)
├── apps/
│   ├── api/                       # NestJS 10 Backend Application
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Định nghĩa Schema PostgreSQL thực thể
│   │   │   └── seed.ts            # Script gieo mầm dữ liệu mẫu thực tế
│   │   ├── src/
│   │   │   ├── auth/              # Module Xác thực JWT, Bcrypt, Passport
│   │   │   ├── products/          # Module Thực đơn, phân loại, tìm kiếm
│   │   │   ├── orders/            # Module Đơn hàng, Transaction, Máy trạng thái
│   │   │   │   └── state-machine/ # order-state-machine.ts (assertTransition)
│   │   │   ├── payments/          # Module Thanh toán mô phỏng, OCC & Idempotency
│   │   │   ├── health/            # Module Giám sát sức khỏe /health
│   │   │   └── prisma/            # PrismaService quản lý kết nối DB
│   │   ├── test/                  # 20 Supertest E2E Tests kết nối PostgreSQL thực
│   │   └── Dockerfile             # Multi-stage Dockerfile cho API
│   └── web/                       # Next.js 14 Frontend Application
│       ├── src/
│       │   ├── app/               # Next.js App Router (Menu, Details, Cart, Login, Checkout, Confirmation, Orders)
│       │   ├── components/        # UI Components (Header, ProductCard, MenuSkeleton)
│       │   └── lib/               # Zustand Store, REST API Client
│       └── Dockerfile             # Multi-stage Dockerfile cho Web (Standalone build)
├── docs/                          # Hồ sơ kỹ thuật và tài liệu bàn giao đầy đủ
│   ├── requirements/              # SRS, Use-cases, Bối cảnh & Phạm vi
│   ├── architecture/              # Thiết kế kiến trúc tổng thể & 5 quyết định ADR
│   ├── diagrams/                  # Activity, Class Domain, Sequence, Deployment Diagrams
│   ├── testing/                   # test-report.md (Báo cáo 68 tests đạt chuẩn)
│   ├── releases/                  # release-notes.md (Ghi chú phát hành v1.0.0)
│   ├── sprints/                   # Biên bản Review & Retrospective Sprint 1 & 2
│   ├── delivery/                  # demo-script.md (Kịch bản 11 bước), final-report.md
│   └── traceability-matrix.md     # Ma trận truy vết yêu cầu RTM (FR-01..13, NFR-01..06)
├── tests/
│   └── e2e/                       # Playwright E2E UI Automation Test
├── docker-compose.yml             # Điều phối cụm PostgreSQL + API + Web
├── package.json                   # Root npm workspaces config
└── README.md                      # Tài liệu hướng dẫn trung tâm
```

---

## 3. Khởi Chạy Nhanh (Quick Start)

### 3.1. Yêu cầu môi trường
- **Node.js:** phiên bản v20.x trở lên
- **npm:** phiên bản 10.x trở lên
- **Docker & Docker Compose** (nếu khởi chạy cụm container)
- **PostgreSQL 16+** (nếu khởi chạy thủ công trên máy cục bộ)

---

### 3.2. Lựa chọn 1: Khởi chạy bằng Docker Compose (Khuyến nghị)
Toàn bộ cơ sở dữ liệu PostgreSQL, NestJS API và Next.js Web sẽ được tự động biên dịch, di chuyển migration, gieo mầm dữ liệu và vận hành chỉ với một câu lệnh:

```bash
# Khởi động cụm container
docker compose up -d --build

# Kiểm tra trạng thái sức khỏe các service
docker compose ps
```
- **Giao diện Web:** `http://localhost:3000`
- **Backend API:** `http://localhost:4000`
- **Endpoint kiểm tra sống còn:** `http://localhost:4000/health`

---

### 3.3. Lựa chọn 2: Khởi chạy thủ công cho lập trình viên (Local Development)

```bash
# 1. Cài đặt toàn bộ dependencies trong monorepo
npm install --legacy-peer-deps

# 2. Cấu hình biến môi trường
cp .env.example .env

# 3. Đồng bộ cơ sở dữ liệu và gieo mầm dữ liệu mẫu
npx prisma db push --schema=apps/api/prisma/schema.prisma
npm --workspace=@brewlite/api run prisma:seed

# 4. Khởi chạy song song 2 dịch vụ
npm run start:api   # API lắng nghe tại port 4000
npm run start:web   # Web lắng nghe tại port 3000
```

---

## 4. Tài Khoản & Dữ Liệu Mẫu (Demo Credentials)

Hệ thống đã chuẩn bị sẵn các tài khoản thử nghiệm với quyền hạn tương ứng:

| Loại tài khoản | Email đăng nhập | Mật khẩu | Quyền hạn (Role) | Chức năng chính |
|---|---|---|:---:|---|
| **Khách hàng mẫu** | `customer@brewlite.com` | `Password123!` | `CUSTOMER` | Duyệt menu, đặt món, thanh toán, xem lịch sử đơn của mình |
| **Nhân viên quầy** | `staff@brewlite.com` | `Password123!` | `STAFF` | Quản lý tiến độ đơn, chuyển trạng thái pha chế |
| **Mã giảm giá demo** | `BREW20` | *(Áp dụng tại Checkout)* | Giảm 20% | Giảm ngay 20% tổng giá trị đơn hàng |

---

## 5. Kiểm Thử Hệ Thống (Testing & Quality Assurance)

Toàn bộ hệ thống sở hữu **68 ca kiểm thử tự động đạt tỷ lệ thành công 100%**:

```bash
# 1. Chạy 48 Unit Tests Monorepo (Web + API)
npm test

# 2. Chạy 20 Integration Tests kết nối Database thực tế
npm --workspace=@brewlite/api run test:e2e

# 3. Chạy Linting kiểm tra cú pháp & chuẩn format (0 errors, 0 warnings)
npm run lint

# 4. Kiểm tra biên dịch bản phát hành Production
npm run build
```

Xem chi tiết tại: [Báo Cáo Kiểm Thử Toàn Diện](docs/testing/test-report.md).

---

## 6. Danh Mục Tài Liệu Bàn Giao Chi Tiết

Mọi tài liệu kỹ thuật của dự án được lưu trữ tại thư mục `docs/`:

1. **Yêu cầu & Phạm vi:**
   - [Bối cảnh & Phạm vi Hệ thống](docs/requirements/context-and-scope.md)
   - [Đặc tả Yêu cầu Phần mềm (SRS)](docs/requirements/srs.md)
   - [Đặc tả Ca sử dụng (Use Cases)](docs/requirements/use-cases.md)
2. **Sơ đồ Mô hình hóa Hệ thống:**
   - [Sơ đồ Hoạt động đặt món (Activity Diagram)](docs/diagrams/activity-order-flow.puml)
   - [Sơ đồ Lớp miền nghiệp vụ (Class Domain Diagram)](docs/diagrams/class-domain.puml)
   - [Sơ đồ Tuần tự thanh toán (Sequence Diagram)](docs/diagrams/sequence-checkout.puml)
   - [Sơ đồ Triển khai hạ tầng (Deployment Diagram)](docs/diagrams/deployment-production.puml)
3. **Kiến trúc & Quyết định Kỹ thuật (ADR):**
   - [Tổng quan Kiến trúc Hệ thống](docs/architecture/overview.md)
   - [ADR-001: Cấu trúc Monorepo](docs/architecture/adr/001-monorepo-structure.md)
   - [ADR-002: Thiết kế Máy trạng thái Đơn hàng](docs/architecture/adr/002-state-machine-design.md)
   - [ADR-003: Khóa lạc quan (OCC) cho Tồn kho](docs/architecture/adr/003-concurrency-optimistic-locking.md)
   - [ADR-004: Xác thực JWT & Bảo vệ IDOR](docs/architecture/adr/004-jwt-authentication-flow.md)
   - [ADR-005: Mock Payment & Idempotency-Key](docs/architecture/adr/005-mock-payment-and-idempotency.md)
4. **Bàn giao & Nghiệm thu:**
   - [Ma Trận Truy Vết Yêu Cầu (RTM)](docs/traceability-matrix.md)
   - [Kịch Bản Trình Diễn 11 Bước](docs/delivery/demo-script.md)
   - [Ghi Chú Phát Hành (Release Notes v1.0.0)](docs/releases/release-notes.md)
   - [Biên bản Review Sprint 2](docs/sprints/sprint-2-review.md)
   - [Biên bản Retrospective Sprint 2](docs/sprints/sprint-2-retrospective.md)
   - [Báo Cáo Nghiệm Thu Cuối Cùng Task 5](docs/delivery/task-5-final-report.md)

---

## 7. Quy Trình Vận Hành & Hoàn Tác (Rollback Procedure)

Trong trường hợp phát hiện sự cố nghiêm trọng sau khi triển khai phiên bản mới trên môi trường production:
1. **Kiểm tra trạng thái lỗi:** Gọi `curl -f http://<production-host>/health`. Nếu trả về mã lỗi 5xx hoặc không phản hồi, kích hoạt quy trình hoàn tác.
2. **Rollback Container:** Chuyển hướng traffic hoặc khởi động lại image phiên bản trước đó (`ghcr.io/<repo>/api:<previous-commit-sha>`).
3. **Rollback Database:** Nếu có migration dữ liệu, sử dụng lệnh:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```
4. **Xác nhận phục hồi:** Thực thi lại kịch bản Smoke Test kiểm tra `/health` và `/products` bảo đảm hệ thống hoạt động ổn định trở lại.
