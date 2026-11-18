# BrewLite — Hệ Thống Đặt Đồ Uống Trực Tuyến (Online Drink Ordering System)

[![Quality gates](https://github.com/vohuunghiaah/brewlite/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/vohuunghiaah/brewlite/actions/workflows/quality.yml)
[![Node.js Version](https://img.shields.io/badge/Node.js-24.x-brightgreen.svg)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2012-E0234E.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED.svg)](https://www.docker.com/)

---

## 1. Giới Thiệu Dự Án & Phạm Vi Assignment 2

**BrewLite** là hệ thống phần mềm hỗ trợ đặt đồ uống trực tuyến và quản lý quy trình pha chế cho chuỗi cửa hàng cà phê / đồ uống giải khát, được thực hiện trong khuôn khổ môn học **Công nghệ Phần mềm (Software Engineering)** — Học kỳ 1 Năm học 2026-2027.

### Phân Định Giữa Assignment 1 và Assignment 2:
- **Assignment 1 (Kỹ nghệ Yêu cầu - Requirements Engineering):** Tập trung vào khảo sát nghiệp vụ, phân tích stakeholder, xác định phạm vi hệ thống, xây dựng tài liệu Đặc tả Yêu cầu Phần mềm (SRS v1.4.0), Danh mục Use Case (`UC-01` -> `UC-13`), Ma trận truy vết yêu cầu (RTM) và giải quyết các mâu thuẫn ngữ nghĩa UML ban đầu.
- **Assignment 2 (Phân tích, Thiết kế Kiến trúc, Triển khai & Bàn giao):** Tuân thủ chặt chẽ theo cấu trúc đặc tả trong `Assignment2-BrewLite.pdf`:
  - **Task 1 (Yêu cầu Phần mềm):** Chuẩn hóa tài liệu yêu cầu SRS v1.4.0 và Use Case chi tiết.
  - **Task 2 (Phân tích & Thiết kế UML):** Xây dựng sơ đồ Hoạt động Activity Diagram (Task 2.1), sơ đồ Tuần tự Sequence Diagram (Task 2.2), sơ đồ Lớp miền Class Diagram (Task 2.3).
  - **Task 3 (Thiết kế Kiến trúc Hệ thống):** Lựa chọn phong cách kiến trúc, hệ thống các quyết định kiến trúc (ADR) (Task 3.1) và xây dựng sơ đồ Triển khai Deployment Diagram (Task 3.2).
  - **Task 4 (Triển khai Sprint 1):** Thiết lập nền tảng mã nguồn ban đầu (Next.js, NestJS, TypeORM, PostgreSQL), xây dựng các chức năng nền tảng và thiết lập pipeline CI Quality Gates qua GitHub Actions.
  - **Task 5 (Triển khai Sprint 2 & Bàn giao - Delivery):** Hoàn thiện đầy đủ tính năng MVP (luồng thanh toán, kiểm soát đồng thời OCC, xác thực JWT), kiểm thử tích hợp & E2E, tự động hóa CD, triển khai production và bàn giao toàn diện hệ thống.

---

## 2. Công Nghệ Có Bằng Chứng Trên Nhánh `main`

Toàn bộ công nghệ dưới đây đều đã được tích hợp mã nguồn, cấu hình và kiểm chứng thành công trong pipeline GitHub Actions:

- **Frontend Client (`apps/web`):**
  - Framework: [Next.js](https://nextjs.org/) v16.4.5 (App Router, React Server Components & Client Hooks).
  - Thư viện hiển thị: [React](https://react.dev/) v19.3.0, TypeScript 5.
  - Định dạng kiểu dáng: CSS Modules chuẩn và CSS toàn cục (`src/app/globals.css`, `src/app/page.module.css`).
  - *Lưu ý công nghệ:* Các thư viện giao diện như TailwindCSS, Lucide React và tính năng PWA (Progressive Web App) hiện thuộc phạm vi thiết kế mục tiêu (`TARGET / PLANNED`) hoặc có trên nhánh tính năng thử nghiệm, **chưa được cài đặt trong `apps/web/package.json` trên nhánh `main`**.
- **Backend API (`apps/api`):**
  - Framework: [NestJS](https://nestjs.com/) v12.0.1 (Kiến trúc Modular Monolith trên nền Express Platform).
  - Cơ sở dữ liệu & ORM: [PostgreSQL](https://www.postgresql.org/) 16 với driver `pg` v8.23.1, [TypeORM](https://typeorm.io/) v1.1.2 kết hợp `@nestjs/typeorm` v12.0.3.
  - Quản lý cấu hình & DTO: `@nestjs/config` v12.1.1, `class-validator` v0.15.1, `class-transformer` v0.5.1.
- **Công Cụ Kiểm Thử & Đảm Bảo Chất Lượng:**
  - Linter: [Oxlint](https://oxc.rs/) v1.58.0 (Kiểm tra kiểu dữ liệu và cú pháp TypeScript siêu tốc cho API) và ESLint v9 (cho Web).
  - Test Runner: [Jest](https://jestjs.io/) v30.0.0 (API unit tests) và Node.js native test runner (`node --test` cho Web).
- **Đóng Gói & DevOps:**
  - Containerization: [Docker](https://www.docker.com/) và Docker Compose (`docker-compose.yml` cho môi trường cục bộ).
  - Tự động hóa CI: GitHub Actions Quality Gates (`.github/workflows/quality.yml`) chạy tự động Install → Lint → Unit Test → Build trên môi trường Node.js 24 (Ubuntu Latest).

---

## 3. Cấu Trúc Thư Mục Repository

```text
brewlite/
├── .github/
│   ├── workflows/
│   │   └── quality.yml         # GitHub Actions CI workflow (lint, test, build)
│   ├── ISSUE_TEMPLATE/         # Biểu mẫu quản lý Task và Bug Report
│   └── pull_request_template.md # Template Pull Request chuẩn hóa
├── apps/
│   ├── api/                    # Backend NestJS Application
│   │   ├── src/
│   │   │   ├── orders/         # OrdersModule (Controller, Service, TypeORM Entities, DTOs)
│   │   │   ├── products/       # ProductsModule (Controller, Service, Seed data, Unit tests)
│   │   │   ├── app.controller.ts
│   │   │   ├── app.module.ts   # AppModule nạp ConfigModule & TypeOrmModule
│   │   │   └── main.ts         # Điểm khởi chạy NestJS, cấu hình CORS & ValidationPipe
│   │   ├── package.json
│   │   └── Dockerfile
│   └── web/                    # Frontend Next.js Application
│       ├── src/
│       │   └── app/
│       │       ├── menu/       # Trang danh mục đồ uống & giỏ hàng client
│       │       ├── globals.css # CSS toàn cục ứng dụng
│       │       ├── layout.tsx  # Layout gốc ứng dụng
│       │       └── page.tsx    # Trang chủ chuyển hướng
│       ├── tests/              # Ca kiểm thử đơn vị cho logic tính toán sản phẩm
│       ├── package.json
│       └── Dockerfile
├── docs/
│   ├── architecture/           # Tài liệu Kiến trúc Hệ thống (Task 3)
│   │   ├── adr/                # Architecture Decision Records (ADR-001 -> ADR-006)
│   │   ├── DeploymentDiagram.svg # Sơ đồ Triển khai UML (Task 3.2)
│   │   └── README.md           # Đặc tả kiến trúc tổng thể
│   ├── audits/                 # Báo cáo kiểm toán kỹ thuật
│   │   └── task2-to-task3-gap-audit.md # Kiểm toán GAP-01 -> GAP-05 & TypeORM vs Prisma
│   ├── diagram/                # 14 tệp sơ đồ UML chính thức (Task 2 đã nghiệm thu PASS)
│   │   ├── ActivityDiagram*.{puml,svg} # Sơ đồ Hoạt động (Task 2.1)
│   │   ├── SequenceDiagram*.{puml,svg} # Sơ đồ Tuần tự (Task 2.2)
│   │   └── ClassDiagram-Conceptual.{mmd,svg} # Sơ đồ Lớp miền Mermaid (Task 2.3)
│   ├── requirements/           # Tài liệu Yêu cầu Phần mềm (Task 1)
│   │   ├── srs.md              # Software Requirements Specification (v1.4.0)
│   │   ├── use-cases.md        # Danh mục và đặc tả tóm tắt Use Cases
│   │   ├── use-case-place-order.md # Đặc tả chi tiết Use Case trọng tâm (UC-04)
│   │   └── context-and-scope.md# Bối cảnh và phạm vi hệ thống
│   └── traceability-matrix.md  # Ma trận truy vết yêu cầu (RTM v2.5.0)
├── scripts/                    # Scripts tiện ích và công cụ tự động hóa
│   └── render-use-case-overview.py # Script kết xuất SVG từ PlantUML
├── docker-compose.yml          # Cấu hình Docker Compose môi trường Development
├── .env.example                # Khung biến môi trường mẫu chuẩn
├── .gitignore
└── README.md                   # Tài liệu hướng dẫn chính của dự án
```

---

## 4. Hướng Dẫn Cài Đặt & Khởi Chạy Ứng Dụng

### Yêu Cầu Môi Trường (Prerequisites):
- **Node.js:** Phiên bản `24.x` (LTS khuyến nghị).
- **Package Manager:** `npm` v10+ đi kèm Node.js.
- **Docker & Docker Compose:** Docker Desktop (Windows/macOS) hoặc Docker Engine 24+ (Linux).
- **PostgreSQL:** Phiên bản 16 (tự động khởi chạy qua Docker).

### Bước 1: Sao chép mã nguồn và thiết lập biến môi trường
Trên Windows PowerShell hoặc Linux/macOS terminal:
```powershell
git clone https://github.com/vohuunghiaah/brewlite.git
cd brewlite
Copy-Item .env.example .env
```
*(Nếu trên Linux/macOS, dùng lệnh: `cp .env.example .env`)*.

> [!IMPORTANT]
> **Lưu ý quan trọng về cấu hình `DATABASE_HOST` giữa hai phương thức khởi chạy:**
> Tệp `.env.example` cung cấp giá trị mặc định `DATABASE_HOST=db` phục vụ cho mạng container nội bộ Docker Compose.
> - **Khi chạy qua Docker Compose (Cách 1):** Container API kết nối tới container cơ sở dữ liệu qua mạng bridge nội bộ (`brewlite-network`) bằng hostname `DATABASE_HOST=db` (được Docker Compose định tuyến và cấu hình sẵn). Lập trình viên có thể sử dụng cấu hình mặc định này khi chạy container.
> - **Khi chạy NestJS trực tiếp trên máy trạm Windows (Cách 2):** Máy trạm không tự động phân giải được hostname `db`. Sau khi khởi chạy container PostgreSQL (cổng `5432:5432` đã ánh xạ ra máy chủ), lập trình viên **bắt buộc phải cấu hình `DATABASE_HOST=localhost`** trong tệp `.env` ở thư mục gốc (không giữ nguyên giá trị `db` của `.env.example`, nếu không NestJS sẽ báo lỗi không thể kết nối cơ sở dữ liệu `ENOTFOUND db`).
> - **Bảo mật:** Không chỉnh sửa hoặc commit các mật khẩu thật hay secret keys vào git; giữ nguyên các giá trị mẫu cho môi trường dev cục bộ.

Khung cấu hình `.env` tham chiếu:
```env
# Cấu hình PostgreSQL Database
POSTGRES_DB=brewlite
POSTGRES_USER=brewlite
POSTGRES_PASSWORD=brewlite_dev_password
POSTGRES_PORT=5432

# Cấu hình kết nối Backend NestJS:
# - Với Docker Compose: DATABASE_HOST=db (mặc định do Compose cung cấp)
# - Với chạy trực tiếp trên máy trạm Windows: ĐỔI THÀNH DATABASE_HOST=localhost
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=brewlite
DATABASE_USER=brewlite
DATABASE_PASSWORD=brewlite_dev_password

# Cổng dịch vụ & URL Frontend
API_PORT=3001
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001
API_INTERNAL_URL=http://api:3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
```

### Bước 2: Khởi chạy ứng dụng

#### Cách 1: Khởi chạy trọn gói bằng Docker Compose (Khuyến nghị)
Chỉ với một câu lệnh, toàn bộ 3 dịch vụ cơ sở dữ liệu (`db`), backend (`api`) và frontend (`web`) sẽ được tự động đóng gói và khởi chạy trong mạng bridge `brewlite-network` với `DATABASE_HOST=db`:
```powershell
docker compose up -d --build
```
Kiểm tra trạng thái các container đang chạy:
```powershell
docker compose ps
```
- **Frontend Next.js:** Truy cập tại [http://localhost:3000](http://localhost:3000)
- **Backend NestJS API:** Truy cập tại [http://localhost:3001](http://localhost:3001)
- **PostgreSQL Database:** Lắng nghe tại cổng `localhost:5432`

Dừng hệ thống:
```powershell
docker compose down
```

#### Cách 2: Khởi chạy thủ công cho môi trường phát triển (Local Development trên máy trạm)
1. **Khởi động Database PostgreSQL bằng Docker (ánh xạ cổng 5432 ra localhost):**
   ```powershell
   docker compose up -d db
   ```
2. **Cấu hình biến môi trường cục bộ:**
   Đảm bảo tệp `.env` ở thư mục gốc đã được thiết lập `DATABASE_HOST=localhost` (thay vì `DATABASE_HOST=db`).
3. **Cài đặt và chạy Backend API:**
   ```powershell
   cd apps/api
   npm install
   npm run start:dev
   ```
   *(Backend sẽ tự động kết nối PostgreSQL tại `localhost:5432` và khởi tạo schema bảng dữ liệu qua TypeORM)*.
4. **Cài đặt và chạy Frontend Web (mở terminal mới):**
   ```powershell
   cd apps/web
   npm install
   npm run dev
   ```
   *(Frontend lắng nghe tại [http://localhost:3000](http://localhost:3000), kết nối tới API tại [http://localhost:3001](http://localhost:3001))*.

---

## 5. Kiểm Thử, Linting & Build Mã Nguồn

Dự án áp dụng quy chuẩn kiểm soát chất lượng mã nguồn nghiêm ngặt được thực thi tự động qua CI pipeline:

### 1. Kiểm tra Backend API (`apps/api`):
```powershell
cd apps/api

# Kiểm tra cú pháp và kiểu dữ liệu bằng Oxlint
npm run lint

# Chạy toàn bộ Unit Tests bằng Jest
npm test

# Build ứng dụng sang mã JavaScript phân phối
npm run build
```

### 2. Kiểm tra Frontend Web (`apps/web`):
```powershell
cd apps/web

# Kiểm tra cú pháp bằng Next.js ESLint
npm run lint

# Chạy Unit Tests logic giỏ hàng & sản phẩm
npm test

# Build ứng dụng Next.js
npm run build
```

---

## 6. Trạng Thái Các Phân Hệ Công Việc (Assignment 2 Progress)

| Hạng mục công việc | Mô tả & Tài liệu liên quan | Trạng thái Nghiệm thu | Bằng chứng kỹ thuật |
|---|---|:---:|---|
| **Task 1: Requirements Engineering** | SRS v1.4.0, Phạm vi nghiệp vụ, Đặc tả Use Case chi tiết (`UC-04`). | **PASS** | [SRS v1.4.0](docs/requirements/srs.md), PR #14, PR #17 |
| **Task 2.1: Activity Diagram** | Phân định 5 swimlanes, 2 giao dịch độc lập TX1 (`PENDING`) & TX2 (`PAID`), bù trừ hoàn tiền. | **PASS** | [Activity Diagrams](docs/diagram/ActivityDiagram.puml), PR #19 |
| **Task 2.2: Sequence Diagram** | Tương tác tuần tự các tầng, worker activation theo sự kiện `due-work`, xử lý thất bại OCC. | **PASS** | [Sequence Diagrams](docs/diagram/SequenceDiagram.puml), PR #20 |
| **Task 2.3: Class Diagram** | Mô hình lớp miền (Domain Class Diagram) chuẩn hóa bằng cú pháp Mermaid. | **PASS** | [ClassDiagram-Conceptual.mmd](docs/diagram/ClassDiagram-Conceptual.mmd), PR #21 |
| **Task 3.1: Architecture Decisions** | Kiến trúc Modular Monolith, tài liệu kiến trúc, hệ thống ADR-001 -> ADR-006. | **PASS** | [Tài liệu Kiến trúc](docs/architecture/README.md), PR #23 đã MERGED (commit `607c6d40`) |
| **Task 3.2: Deployment Diagram** | Sơ đồ Triển khai UML, phân định môi trường Local, CI/CD và Target Production AWS Lightsail (ADR-007). | **PASS** | [Deployment Diagram](docs/architecture/DeploymentDiagram.svg), PR #24 đã MERGED (commit `4dd639ea`) |
| **Task 4.1: Repository Setup & Backlog** | Cấu trúc Monorepo (`apps/web`, `apps/api`, `docs`), Git flow, DoD, Backlog Sprint 1 & 2, CI Quality Gates. | **PASS** | [Bằng chứng Task 4.1](docs/task-4.1-verification.md), PR #6 & PR #25 đã MERGED (commit `5784317c`) |
| **Task 4.2: Documentation Management** | Đưa toàn bộ tạo phẩm Task 1–3 vào `docs/`, lập chỉ mục tập trung, ma trận kiểm kê và quy trình kiểm soát thay đổi. | **PASS** | [Chỉ mục docs/](docs/README.md), [Quy trình Quản lý Tài liệu](docs/document-control.md), PR #26 đã MERGED (commit `c8d7a012`) |
| **Task 4.3: MVP Sprint 1 (Menu & Product Detail)** | Hoàn thiện MVP Sprint 1: `GET /products` và `GET /products/:id`, giao diện Menu Next.js mobile-first, modal xem chi tiết sản phẩm, loading/empty/error states và 100% unit tests. | **PASS / READY FOR ACCEPTANCE** | [Kế hoạch Sprint 1](docs/backlog/sprint-1.md), PR #27 |
| **Task 5: Sprint 2 & Delivery** | Triển khai Sprint 2 hoàn thiện tính năng MVP, thanh toán, kiểm thử E2E, CD và bàn giao. | **PENDING SPRINT 2** | Mã nguồn thử nghiệm trên `feature/sprint2-full-flow` |

---

## 7. Liên Kết Tài Liệu Quan Trọng (Documentation Quick Links)

- **Yêu cầu & Nghiệp vụ (Task 1):**
  - [Đặc tả Yêu cầu Phần mềm (SRS v1.4.0)](docs/requirements/srs.md)
  - [Bối cảnh và Phạm vi Hệ thống](docs/requirements/context-and-scope.md)
  - [Danh mục & Đặc tả Use Cases](docs/requirements/use-cases.md)
  - [Đặc tả chi tiết Use Case trọng tâm UC-04 (Đặt đồ uống)](docs/requirements/use-case-place-order.md)
  - [Sơ đồ Use Case Tổng quan (PlantUML)](docs/requirements/use-case-overview.puml)
- **Phân tích & Thiết kế UML (Task 2):**
  - [Sơ đồ Hoạt động Tạo đơn UC-04 (PlantUML)](docs/diagram/ActivityDiagram.puml)
  - [Sơ đồ Hoạt động Thanh toán UC-10 (PlantUML)](docs/diagram/ActivityDiagram-UC10.puml)
  - [Sơ đồ Hoạt động Hợp nhất (PlantUML)](docs/diagram/ActivityDiagram-Unified.puml)
  - [Sơ đồ Tuần tự Tạo đơn UC-04 (PlantUML)](docs/diagram/SequenceDiagram.puml)
  - [Sơ đồ Tuần tự Thanh toán & OCC UC-10 (PlantUML)](docs/diagram/SequenceDiagram-UC10.puml)
  - [Sơ đồ Tuần tự Hợp nhất (PlantUML)](docs/diagram/SequenceDiagram-Unified.puml)
  - [Sơ đồ Lớp miền Khái niệm (Mermaid MMD)](docs/diagram/ClassDiagram-Conceptual.mmd)
- **Kiến trúc & Kiểm toán (Task 3 & Quality):**
  - [Ma trận Truy vết Yêu cầu (RTM v2.5.0)](docs/traceability-matrix.md)
  - [Báo cáo Kiểm toán Khoảng hở GAP-01 -> GAP-05 & So sánh ORM](docs/audits/task2-to-task3-gap-audit.md)
  - [Tổng quan Kiến trúc Hệ thống](docs/architecture/README.md)
  - [Thư mục Quyết định Kiến trúc (ADRs)](docs/architecture/adr/README.md)
- **Thiết lập Repository & Quản trị Quy trình (Task 4.1):**
  - [Bằng chứng Kiểm toán & Nghiệm thu Task 4.1](docs/task-4.1-verification.md)
  - [Cấu hình GitHub, Branch Protection & CI Quality Gates](docs/github-setup.md)
  - [Product Backlog Sprint 1 & Sprint 2](docs/backlog/product-backlog.md)
  - [Kế hoạch Sprint 1](docs/backlog/sprint-1.md)
  - [Kế hoạch Sprint 2](docs/backlog/sprint-2.md)
  - [Chiến lược Phân nhánh Git](docs/branching-strategy.md)
  - [Quy ước Commit (Conventional Commits)](docs/commit-convention.md)
  - [Định nghĩa Hoàn thành (Definition of Done - DoD)](docs/definition-of-done.md)
- **Quản lý Tài liệu & Kiểm soát Thay đổi (Task 4.2):**
  - [Chỉ mục Tài liệu Tập trung & Ma trận Kiểm kê (docs/README.md)](docs/README.md)
  - [Quy trình Quản lý Thay đổi Tài liệu (Document Change Control)](docs/document-control.md)



---

## 8. Hiện Trạng Triển Khai Thực Tế Trên `main` & Giới Hạn Đã Biết

Nhằm đảm bảo tính minh bạch và trung thực học thuật, đội ngũ phát triển công bố hiện trạng thực tế của nhánh chính `main` tại commit `ee090814`:

### Hiện Trạng Mã Nguồn Trên `main`:
1. **Đã hoạt động (Task 4.3 MVP Sprint 1):**
   - Hiển thị danh mục sản phẩm từ cơ sở dữ liệu (`GET /products`) sắp xếp theo ID tăng dần.
   - Xem chi tiết từng món đồ uống (`GET /products/:id`) qua Product Detail Modal trên Next.js UI với đầy đủ ảnh, mã món, giá, mô tả và tình trạng còn hàng.
   - Trạng thái giao diện thực đơn hoàn chỉnh: Loading state, Empty state (thực đơn rỗng / không tìm thấy kết quả tìm kiếm), Error state kèm nút retry.
   - Giao diện giỏ hàng Next.js phía client, tính toán tổng tiền tạm thời real-time.
   - Tạo đơn hàng cơ bản (`POST /orders`) lưu vào PostgreSQL qua TypeORM transaction, thiết lập trạng thái khởi tạo `PENDING`.
   - Pipeline CI tự động kiểm tra cú pháp, 10 unit tests API và 2 unit tests Web, cùng build thành công.
2. **Chưa có mã nguồn trên `main` (Mới có trên nhánh tính năng hoặc tài liệu thiết kế):**
   - Chọn size, topping hoặc ghi chú từng món (`FR-02` - dự kiến Sprint 2).
   - Module Xác thực (`AuthModule`), đăng nhập, đăng ký và bảo vệ endpoint bằng JWT (`FR-04`).
   - Module Thanh toán (`PaymentsModule`), xử lý ví điện tử / thẻ ngân hàng mô phỏng (`FR-06`).
   - State Machine quản lý chuyển trạng thái đơn hàng (`FR-07`).
   - Kiểm soát tồn kho đồng thời bằng Optimistic Concurrency Control (`FR-09`).
   - Module Khuyến mãi và tích lũy điểm Loyalty (`FR-10`).
   - Endpoint kiểm tra sức khỏe hệ thống `GET /health` (`FR-13`).

### Tóm Tắt Các Khoảng Hở Nghiệp Vụ & Kỹ Thuật (GAP Summary):
- **GAP-01 (Hoàn tiền tự động):** Chưa có API `POST /payments/:id/refund` và background worker xử lý hoàn tiền khi giao dịch xảy ra lỗi bất thường; việc xử lý ngoại tuyến đang chờ Product Owner phê duyệt quy trình.
- **GAP-02 (Lưu trữ Idempotency Key):** Backend có ràng buộc chống trùng lặp nhưng Client Next.js chưa lưu khóa vào `sessionStorage` để tái sử dụng khi người dùng refresh hoặc thanh toán lại.
- **GAP-03 (Công thức tích điểm Loyalty):** Mâu thuẫn giữa quy tắc nghiệp vụ SRS (10.000 VNĐ = 1 điểm) và mã nguồn thử nghiệm (1.000 VNĐ = 1 điểm), đang chờ phê duyệt chính thức từ PO.
- **GAP-04 (Endpoint Health Check trên `main`):** `main` chưa có `GET /health` kiểm tra kết nối PostgreSQL.
- **GAP-05 (Mất phản hồi sau COMMIT tạo đơn):** `POST /orders` chưa có cơ chế Idempotency chống tạo đơn trùng khi gặp sự cố mạng sau khi database đã lưu đơn `PENDING`.

*(Chi tiết phân tích kỹ thuật và kế hoạch khắc phục được trình bày tại [Báo cáo kiểm toán GAP](docs/audits/task2-to-task3-gap-audit.md)).*
