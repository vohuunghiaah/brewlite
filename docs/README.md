# CHỈ MỤC TÀI LIỆU DỰ ÁN BREWLITE (DOCUMENTATION CATALOG & REPOSITORY INDEX)

## Hồ sơ nghiệm thu và bàn giao ngày 21/11/2026

| Hồ sơ | Phạm vi | Trạng thái |
|---|---|---|
| [Nghiệm thu AWS](deployment/final-production-acceptance-2026-11-21.md) | Release `7d808408`, run #44879328653, digest runtime, backup/restore và HTTPS | RELEASE ACCEPTED |
| [Bàn giao ASM2](final-handover-report.md) | Từng Task, FR, NFR, sơ đồ, hướng dẫn demo và các việc cần ký nhận | READY FOR REVIEW |

Các bảng kiểm kê bên dưới ghi mốc lịch sử của từng Task.
## DỰ ÁN: BREWLITE — HỆ THỐNG ĐẶT CÀ PHÊ KHÔNG DÙNG TIỀN MẶT
### PHÂN HỆ: TASK 4.2 — DOCUMENTATION MANAGEMENT & TRACEABILITY

- **Dự án:** BrewLite (Cashless Coffee Ordering Platform) — Assignment 2
- **Mã tài liệu:** `DOC-INDEX-01`
- **Phiên bản:** 2.0.0
- **Ngày cập nhật:** 18/11/2026
- **Trạng thái:** Active / Baseline Central Index
- **Căn cứ yêu cầu Task 4.2:** *"Đưa toàn bộ tạo phẩm của Task 1–3 vào thư mục docs. Mọi thay đổi yêu cầu, sơ đồ hoặc kiến trúc phải đi qua commit/pull request và ghi rõ lý do."*

---

## 1. Tổng Quan Cấu Trúc Thư Mục `docs/`

Toàn bộ tạo phẩm thiết kế, đặc tả yêu cầu, kiến trúc hệ thống và quy trình quản trị dự án được cấu trúc hóa phân tầng trong thư mục `docs/`:

```text
docs/
├── architecture/                  # Task 3: Kiến trúc Modular Monolith, Deployment Diagram & ADRs
│   ├── adr/                       # Hệ thống các Quyết định Kiến trúc (ADR-001 -> ADR-007)
│   │   ├── adr/                   # Từng tệp quyết định kiến trúc độc lập
│   │   └── README.md              # Danh mục và ma trận trạng thái các quyết định ADR
│   ├── DeploymentDiagram.puml     # Nguồn PlantUML Sơ đồ Triển khai (AWS Lightsail)
│   ├── DeploymentDiagram.svg      # Sơ đồ Triển khai kết xuất SVG
│   └── README.md                  # Đặc tả Kiến trúc Hệ thống chi tiết (Version 2.2.0)
├── audits/                        # Báo cáo kiểm toán kỹ thuật
│   └── task2-to-task3-gap-audit.md# Kiểm toán khoảng hở GAP-01 -> GAP-05 & phân tích TypeORM/Prisma
├── backlog/                       # Quản trị Product Backlog & Sprints
│   ├── product-backlog.md         # Danh mục Product Backlog (BL-00 -> BL-04)
│   ├── sprint-1.md                # Kế hoạch Sprint 1 (Nền tảng kỹ thuật)
│   └── sprint-2.md                # Kế hoạch Sprint 2 (Ứng dụng & Tích hợp)
├── diagram/                       # Task 2: 14 tệp sơ đồ UML chính thức đã nghiệm thu (7 cặp nguồn + SVG)
│   ├── ActivityDiagram*.puml/.svg # Sơ đồ Hoạt động (UC-04, UC-10, Hợp nhất)
│   ├── ClassDiagram*.mmd/.svg     # Sơ đồ Lớp miền Khái niệm (Mermaid MMD + SVG)
│   └── SequenceDiagram*.puml/.svg # Sơ đồ Tuần tự (UC-04, UC-10, Hợp nhất)
├── requirements/                  # Task 1: Đặc tả Yêu cầu Phần mềm & Use Cases
│   ├── context-and-scope.md       # Bối cảnh và Phạm vi Hệ thống
│   ├── srs.md                     # Đặc tả Yêu cầu Phần mềm (SRS v1.4.0)
│   ├── task1-final-audit.md       # Báo cáo Kiểm toán và Nghiệm thu Task 1
│   ├── use-case-overview.puml/.svg# Sơ đồ Use Case Tổng quan
│   ├── use-case-place-order.md    # Đặc tả chi tiết Use Case trọng tâm UC-04
│   ├── use-case-place-order.puml/.svg # Sơ đồ phân rã UC-04 & UC-10
│   └── use-cases.md               # Danh mục chi tiết 13 Use Cases hệ thống
├── ui/                            # Task 5.1: Đặc tả Thiết kế Giao diện Figma Make & Ảnh tham chiếu
│   ├── assets/                    # 8 ảnh chụp màn hình tương tác từ prototype Figma Make
│   └── figma-design-spec.md       # Đặc tả Design System, Tokens, 8 Màn hình & Gap Analysis
├── branching-strategy.md          # Chiến lược phân nhánh Git & quy trình PR
├── commit-convention.md           # Quy ước Conventional Commits
├── definition-of-done.md          # Tiêu chí hoàn thành (DoD 10 điểm)
├── document-control.md            # Quy trình 10 bước Quản lý Thay đổi Tài liệu (Task 4.2)
├── github-setup.md                # Cấu hình GitHub, Branch Protection & Project Board
├── task-4.1-verification.md       # Bằng chứng kiểm toán và nghiệm thu Task 4.1
├── task-4.4-ci-verification.md    # Báo cáo kiểm toán và nghiệm thu Task 4.4 CI/CD
├── traceability-matrix.md         # Ma trận Truy vết Yêu cầu đa chiều (RTM v2.5.0)
└── README.md                      # Chỉ mục tài liệu tập trung (tệp này)
```

---

## 2. Ma Trận Kiểm Kê & Kiểm Soát Tạo Phẩm (Document Inventory Matrix)

### Nguyên tắc và Quy tắc Đếm Tạo Phẩm (Counting Rules):
1. **Theo Mã Định Danh Tạo Phẩm (Document ID — 38 tạo phẩm):**
   - Mỗi dòng trong bảng dưới đây tương ứng với đúng một mã định danh tạo phẩm duy nhất (`Document ID`).
   - Mỗi sơ đồ bao gồm một cặp tệp (1 tệp mã nguồn `.puml` hoặc `.mmd` và 1 tệp kết xuất `.svg` đồng bộ 100%) được quản lý thống nhất dưới một mã `Document ID` duy nhất (ví dụ: `UML-ACT-01` đại diện cho cặp `ActivityDiagram.puml` và `ActivityDiagram.svg`).
   - Bảng kiểm kê gồm **38 tạo phẩm có mã quản trị** (Task 1: 7 tạo phẩm; Task 2: 7 tạo phẩm sơ đồ; Task 3: 10 tạo phẩm kiến trúc; Kiểm toán & RTM: 2 tạo phẩm; Task 4: 11 tạo phẩm quy trình, CI và backlog; Task 5.1: 1 tạo phẩm đặc tả UI `UI-SPEC-01`).
2. **Theo Tệp Vật Lý Được Quản Lý Trong Git (Physical Files — 48 tệp):**
   - **28 tệp Markdown (`.md`):** Đặc tả yêu cầu, use cases, kiến trúc, ADRs, báo cáo kiểm toán, RTM, quy trình, CI verification, backlog và đặc tả giao diện UI.
   - **9 tệp PlantUML (`.puml`):** Mã nguồn sơ đồ Use Case (2), Sơ đồ Hoạt động & Tuần tự (6), Sơ đồ Triển khai (1).
   - **1 tệp Mermaid (`.mmd`):** Mã nguồn Sơ đồ Lớp miền Khái niệm (1).
   - **10 tệp SVG (`.svg`):** Bản kết xuất trực quan đồng bộ 1:1 của 10 tệp nguồn sơ đồ trên (không có sơ đồ nào thiếu SVG hoặc ngược lại).
   - Tổng cộng: **28 + 9 + 1 + 10 = 48 tệp vật lý** trong thư mục `docs/` (kèm 8 ảnh tham chiếu tại `docs/ui/assets/`).

| Document ID | Tên tạo phẩm | Phân hệ | Tệp nguồn (Source Path) | Tệp xuất (Export Path) | Phiên bản / Trạng thái | Bằng chứng Commit / PR | Yêu cầu / Use Case / ADR liên quan |
|:---:|---|:---:|---|---|:---:|---|---|
| **REQ-CTX-01** | Bối cảnh và Phạm vi Hệ thống | Task 1.1 | [requirements/context-and-scope.md](requirements/context-and-scope.md) | N/A | v1.4.0 / Accepted | PR [#14](https://github.com/vohuunghiaah/brewlite/pull/14), PR [#17](https://github.com/vohuunghiaah/brewlite/pull/17) (`bc499a86`) | 6 nhóm Stakeholders, Phạm vi MVP |
| **REQ-SRS-01** | Đặc tả Yêu cầu Phần mềm (SRS) | Task 1.2 | [requirements/srs.md](requirements/srs.md) | N/A | v1.4.0 / Accepted | PR [#14](https://github.com/vohuunghiaah/brewlite/pull/14), PR [#17](https://github.com/vohuunghiaah/brewlite/pull/17) (`bc499a86`) | `FR-01` -> `FR-13`, `NFR-01` -> `NFR-07` |
| **REQ-UC-01_13**| Danh mục & Đặc tả 13 Use Cases | Task 1.2 | [requirements/use-cases.md](requirements/use-cases.md) | N/A | v1.4.0 / Accepted | PR [#14](https://github.com/vohuunghiaah/brewlite/pull/14), PR [#17](https://github.com/vohuunghiaah/brewlite/pull/17) (`bc499a86`) | `UC-01` -> `UC-13`, State Transitions |
| **REQ-UC-04** | Đặc tả Chi tiết UC-04 (Đặt hàng) | Task 1.3 | [requirements/use-case-place-order.md](requirements/use-case-place-order.md) | N/A | v1.4.0 / Accepted | PR [#14](https://github.com/vohuunghiaah/brewlite/pull/14), PR [#17](https://github.com/vohuunghiaah/brewlite/pull/17) (`bc499a86`) | `FR-05`, `UC-04` (TX1 PENDING), `UC-10` |
| **REQ-UCD-01** | Sơ đồ Use Case Tổng quan | Task 1.2 | [requirements/use-case-overview.puml](requirements/use-case-overview.puml) | [requirements/use-case-overview.svg](requirements/use-case-overview.svg) | Accepted | PR [#14](https://github.com/vohuunghiaah/brewlite/pull/14), PR [#17](https://github.com/vohuunghiaah/brewlite/pull/17) (`bc499a86`) | 13 Use Cases, 4 Actors |
| **REQ-UCD-02** | Sơ đồ Phân rã UC-04 & UC-10 | Task 1.3 | [requirements/use-case-place-order.puml](requirements/use-case-place-order.puml) | [requirements/use-case-place-order.svg](requirements/use-case-place-order.svg) | Accepted | PR [#14](https://github.com/vohuunghiaah/brewlite/pull/14), PR [#17](https://github.com/vohuunghiaah/brewlite/pull/17) (`bc499a86`) | Ranh giới độc lập UC-04 và UC-10 |
| **REQ-AUD-01** | Báo cáo Kiểm toán Nghiệm thu Task 1 | Task 1 | [requirements/task1-final-audit.md](requirements/task1-final-audit.md) | N/A | Final / PASS | PR [#17](https://github.com/vohuunghiaah/brewlite/pull/17) (`bc499a86`) | Kiểm toán toàn diện Task 1.1 -> 1.3 |
| **UML-ACT-01** | Activity Diagram Tạo đơn UC-04 | Task 2.1 | [diagram/ActivityDiagram.puml](diagram/ActivityDiagram.puml) | [diagram/ActivityDiagram.svg](diagram/ActivityDiagram.svg) | Design Verified | PR [#15](https://github.com/vohuunghiaah/brewlite/pull/15), PR [#19](https://github.com/vohuunghiaah/brewlite/pull/19) (`acb9a5ea`) | `FR-05`, `UC-04`, Giao dịch TX1 (`PENDING`) |
| **UML-ACT-02** | Activity Diagram Thanh toán UC-10 | Task 2.1 | [diagram/ActivityDiagram-UC10.puml](diagram/ActivityDiagram-UC10.puml) | [diagram/ActivityDiagram-UC10.svg](diagram/ActivityDiagram-UC10.svg) | Design Verified | PR [#19](https://github.com/vohuunghiaah/brewlite/pull/19) (`acb9a5ea`) | `FR-06`, `FR-08`, `FR-09`, `UC-10`, TX2 (`PAID`) |
| **UML-ACT-03** | Activity Diagram Hợp nhất | Task 2.1 | [diagram/ActivityDiagram-Unified.puml](diagram/ActivityDiagram-Unified.puml) | [diagram/ActivityDiagram-Unified.svg](diagram/ActivityDiagram-Unified.svg) | Design Verified | PR [#19](https://github.com/vohuunghiaah/brewlite/pull/19) (`acb9a5ea`) | Toàn trình luồng đặt và thanh toán |
| **UML-SEQ-01** | Sequence Diagram Tạo đơn UC-04 | Task 2.2 | [diagram/SequenceDiagram.puml](diagram/SequenceDiagram.puml) | [diagram/SequenceDiagram.svg](diagram/SequenceDiagram.svg) | Design Verified | PR [#20](https://github.com/vohuunghiaah/brewlite/pull/20) (`eeb51b13`) | `FR-05`, `UC-04`, JWT Auth, NestJS, TypeORM |
| **UML-SEQ-02** | Sequence Diagram Thanh toán UC-10 | Task 2.2 | [diagram/SequenceDiagram-UC10.puml](diagram/SequenceDiagram-UC10.puml) | [diagram/SequenceDiagram-UC10.svg](diagram/SequenceDiagram-UC10.svg) | Design Verified | PR [#20](https://github.com/vohuunghiaah/brewlite/pull/20) (`eeb51b13`) | `FR-06`, `FR-08`, `FR-09`, `UC-10`, OCC Retry |
| **UML-SEQ-03** | Sequence Diagram Hợp nhất | Task 2.2 | [diagram/SequenceDiagram-Unified.puml](diagram/SequenceDiagram-Unified.puml) | [diagram/SequenceDiagram-Unified.svg](diagram/SequenceDiagram-Unified.svg) | Design Verified | PR [#20](https://github.com/vohuunghiaah/brewlite/pull/20) (`eeb51b13`) | Đồng bộ worker activation `due-work` |
| **UML-CLS-01** | Domain Class Diagram (Mermaid) | Task 2.3 | [diagram/ClassDiagram-Conceptual.mmd](diagram/ClassDiagram-Conceptual.mmd) | [diagram/ClassDiagram-Conceptual.svg](diagram/ClassDiagram-Conceptual.svg) | Design Verified | PR [#21](https://github.com/vohuunghiaah/brewlite/pull/21) (`ee090814`) | Toàn bộ thực thể miền: `User`, `Order`, `Product` |
| **ARCH-SPEC-01**| Đặc tả Kiến trúc Hệ thống | Task 3.1 | [architecture/README.md](architecture/README.md) | N/A | v2.2.0 / Accepted | PR [#23](https://github.com/vohuunghiaah/brewlite/pull/23) (`607c6d40`), PR [#24](https://github.com/vohuunghiaah/brewlite/pull/24) | 12 thành phần kiến trúc, Modular Monolith |
| **ARCH-DEP-01** | Sơ đồ Triển khai (Deployment Diagram)| Task 3.2 | [architecture/DeploymentDiagram.puml](architecture/DeploymentDiagram.puml) | [architecture/DeploymentDiagram.svg](architecture/DeploymentDiagram.svg) | Accepted | PR [#23](https://github.com/vohuunghiaah/brewlite/pull/23), PR [#24](https://github.com/vohuunghiaah/brewlite/pull/24) (`4dd639ea`) | Phân định Local, CI/CD, AWS Lightsail |
| **ARCH-ADR-IDX**| Danh mục Quyết định Kiến trúc | Task 3.1 | [architecture/adr/README.md](architecture/adr/README.md) | N/A | Accepted | PR [#23](https://github.com/vohuunghiaah/brewlite/pull/23), PR [#24](https://github.com/vohuunghiaah/brewlite/pull/24) | Tổng hợp và quản lý trạng thái ADR-001 -> 007 |
| **ARCH-ADR-001**| ADR-001: Kiến trúc Modular Monolith | Task 3.1 | [architecture/adr/adr/001-modular-monolith.md](architecture/adr/adr/001-modular-monolith.md) | N/A | Accepted / Implemented | PR [#23](https://github.com/vohuunghiaah/brewlite/pull/23) (`607c6d40`) | `NFR-02`, `NFR-03`, Cấu trúc NestJS backend |
| **ARCH-ADR-002**| ADR-002: PostgreSQL & Migration | Task 3.1 | [architecture/adr/adr/002-postgresql-migration.md](architecture/adr/adr/002-postgresql-migration.md) | N/A | Accepted / Partial | PR [#23](https://github.com/vohuunghiaah/brewlite/pull/23) (`607c6d40`) | Quản lý schema CSDL quan hệ |
| **ARCH-ADR-003**| ADR-003: Mock Payment Service | Task 3.1 | [architecture/adr/adr/003-mock-payment.md](architecture/adr/adr/003-mock-payment.md) | N/A | Accepted / Design Verified | PR [#23](https://github.com/vohuunghiaah/brewlite/pull/23) (`607c6d40`) | `FR-06`, `UC-10`, Cổng thanh toán giả lập |
| **ARCH-ADR-004**| ADR-004: Logging & Health Check | Task 3.1 | [architecture/adr/adr/004-logging-healthcheck.md](architecture/adr/adr/004-logging-healthcheck.md) | N/A | Proposed / Partial | PR [#23](https://github.com/vohuunghiaah/brewlite/pull/23) (`607c6d40`) | `FR-13`, `NFR-07`, Hợp đồng `GET /health` |
| **ARCH-ADR-005**| ADR-005: Quản lý Cấu hình Môi trường| Task 3.1 | [architecture/adr/adr/005-configuration-management.md](architecture/adr/adr/005-configuration-management.md) | N/A | Accepted / Implemented | PR [#23](https://github.com/vohuunghiaah/brewlite/pull/23) (`607c6d40`) | `.env`, `.env.example`, `@nestjs/config` |
| **ARCH-ADR-006**| ADR-006: Đề xuất chuyển sang Prisma | Task 3.1 | [architecture/adr/adr/006-orm-migration-prisma.md](architecture/adr/adr/006-orm-migration-prisma.md) | N/A | Proposed | PR [#23](https://github.com/vohuunghiaah/brewlite/pull/23) (`607c6d40`) | Kế hoạch nâng cấp ORM cho Sprint 2 |
| **ARCH-ADR-007**| ADR-007: Triển khai AWS Lightsail | Task 3.2 | [architecture/adr/adr/007-aws-lightsail-deployment.md](architecture/adr/adr/007-aws-lightsail-deployment.md) | N/A | Proposed / Provisioned | PR [#24](https://github.com/vohuunghiaah/brewlite/pull/24) (`4dd639ea`) | `NFR-04`, Kiến trúc một VM cho Production |
| **AUDIT-GAP-01**| Báo cáo Kiểm toán GAP-01 -> GAP-05 | Handover | [audits/task2-to-task3-gap-audit.md](audits/task2-to-task3-gap-audit.md) | N/A | Accepted | PR [#22](https://github.com/vohuunghiaah/brewlite/pull/22) (`1f11d9a3`) | Phân tích 5 khoảng hở nghiệp vụ & kỹ thuật |
| **TRACE-RTM-01**| Ma trận Truy vết Yêu cầu (RTM) | Quality | [traceability-matrix.md](traceability-matrix.md) | N/A | v2.5.0 / Accepted | PR [#22](https://github.com/vohuunghiaah/brewlite/pull/22), PR [#23](https://github.com/vohuunghiaah/brewlite/pull/23), PR [#24](https://github.com/vohuunghiaah/brewlite/pull/24) | Truy vết `FR-01`->`13`, `NFR-01`->`07` đa chiều |
| **GOV-GIT-01** | Chiến lược Phân nhánh Git | Task 4.1 | [branching-strategy.md](branching-strategy.md) | N/A | Active | PR [#6](https://github.com/vohuunghiaah/brewlite/pull/6), PR [#25](https://github.com/vohuunghiaah/brewlite/pull/25) (`5784317c`) | Quy định phân nhánh, quy trình 7 bước |
| **GOV-CMT-01** | Quy ước Commit (Conventional) | Task 4.1 | [commit-convention.md](commit-convention.md) | N/A | Active | PR [#6](https://github.com/vohuunghiaah/brewlite/pull/6), PR [#25](https://github.com/vohuunghiaah/brewlite/pull/25) (`5784317c`) | Quy tắc đặt tên commit chuẩn hóa |
| **GOV-DOD-01** | Tiêu chí hoàn thành (DoD) | Task 4.1 | [definition-of-done.md](definition-of-done.md) | N/A | Active | PR [#6](https://github.com/vohuunghiaah/brewlite/pull/6), PR [#25](https://github.com/vohuunghiaah/brewlite/pull/25) (`5784317c`) | 10 tiêu chí kiểm soát chất lượng |
| **GOV-GH-01** | Cấu hình GitHub & Bảo vệ Branch | Task 4.1 | [github-setup.md](github-setup.md) | N/A | Active | PR [#6](https://github.com/vohuunghiaah/brewlite/pull/6), PR [#25](https://github.com/vohuunghiaah/brewlite/pull/25) (`5784317c`) | Branch protection, CI Quality Gates |
| **GOV-T41-01** | Bằng chứng Kiểm toán Task 4.1 | Task 4.1 | [task-4.1-verification.md](task-4.1-verification.md) | N/A | Final / PASS | PR [#6](https://github.com/vohuunghiaah/brewlite/pull/6), PR [#25](https://github.com/vohuunghiaah/brewlite/pull/25) (`5784317c`) | Bằng chứng kiểm toán kỹ thuật Task 4.1 |
| **GOV-DOC-01** | Quy trình Quản lý Thay đổi Tài liệu| Task 4.2 | [document-control.md](document-control.md) | N/A | Active / Mandatory | PR [#26](https://github.com/vohuunghiaah/brewlite/pull/26) | Quy trình 10 bước quản lý thay đổi qua Git |
| **BKLG-PRD-01**| Product Backlog Tổng thể | Task 4.1 | [backlog/product-backlog.md](backlog/product-backlog.md) | N/A | Active | PR [#6](https://github.com/vohuunghiaah/brewlite/pull/6), PR [#25](https://github.com/vohuunghiaah/brewlite/pull/25) (`5784317c`) | Quản trị backlog `BL-00` -> `BL-04` |
| **BKLG-SP1-01**| Kế hoạch Sprint 1 | Task 4.1 | [backlog/sprint-1.md](backlog/sprint-1.md) | N/A | Active | PR [#6](https://github.com/vohuunghiaah/brewlite/pull/6), PR [#25](https://github.com/vohuunghiaah/brewlite/pull/25) (`5784317c`) | Công việc `BL-00`, `BL-01`, `BL-02` |
| **BKLG-SP2-01**| Kế hoạch Sprint 2 | Task 4.1 | [backlog/sprint-2.md](backlog/sprint-2.md) | N/A | Active | PR [#6](https://github.com/vohuunghiaah/brewlite/pull/6), PR [#25](https://github.com/vohuunghiaah/brewlite/pull/25) (`5784317c`) | Công việc `BL-03`, `BL-04` |
| **DOC-INDEX-01**| Chỉ mục Tài liệu Tập trung | Task 4.2 | [README.md](README.md) | N/A | v2.0.0 / Active | PR [#26](https://github.com/vohuunghiaah/brewlite/pull/26) | Chỉ mục trung tâm, ma trận kiểm kê Task 1–4 |
| **DOC-CI-01**  | Báo cáo Nghiệm thu CI/CD | Task 4.4 | [task-4.4-ci-verification.md](task-4.4-ci-verification.md) | N/A | v1.0.0 / Final | PR [#28](https://github.com/vohuunghiaah/brewlite/pull/28) | Kiểm toán CI Quality Gates & Branch Protection |
| **UI-SPEC-01** | Đặc tả Thiết kế Giao diện Figma Make | Task 5.1 | [ui/figma-design-spec.md](ui/figma-design-spec.md) | N/A | v1.1.0 / Active | PR [#29](https://github.com/vohuunghiaah/brewlite/pull/29) | `FR-01` -> `FR-03`, `FR-05`, Giao diện 8 màn hình |

---

## 3. Lịch Sử Hợp Nhất & Truy Vết Pull Requests

Toàn bộ các mốc hoàn thiện tài liệu đều được thực hiện thông qua Pull Request vào nhánh chính `main` với đầy đủ bằng chứng kiểm thử:

| Số PR | Nhánh nguồn (Source Branch) | Nội dung tóm tắt | Commit Merge | Ngày Hợp Nhất | Trạng thái CI |
|:---:|---|---|:---:|:---:|:---:|
| **[#6](https://github.com/vohuunghiaah/brewlite/pull/6)** | `chore/setup-repository` | Thiết lập nền tảng cấu trúc Monorepo và governance ban đầu (Task 4.1) | `e744a143` | 12/11/2026 | N/A (chưa có stack) |
| **[#12](https://github.com/vohuunghiaah/brewlite/pull/12)** | `docs/task1-requirements-fix` | Chuẩn hóa toàn diện yêu cầu Task 1 theo Assignment 2 | `c93cd0f2` | 13/11/2026 | PASS |
| **[#13](https://github.com/vohuunghiaah/brewlite/pull/13)** | `fix/task1-post-merge-audit` | Sửa các điểm chưa nhất quán hậu merge Task 1 | `81bee7f5` | 13/11/2026 | PASS |
| **[#14](https://github.com/vohuunghiaah/brewlite/pull/14)** | `docs/task1-final-requirements-alignment` | Hoàn thiện đặc tả SRS v1.3.2 và Use Cases phân rã | `aaef34fe` | 14/11/2026 | PASS |
| **[#15](https://github.com/vohuunghiaah/brewlite/pull/15)** | `docs/task2-1-final-activity-diagram` | Đưa Activity Diagram phiên bản chốt vào repository | `e0d7d257` | 14/11/2026 | PASS |
| **[#17](https://github.com/vohuunghiaah/brewlite/pull/17)** | `docs/task1-final-audit-and-merge` | Nghiệm thu chính thức Task 1 (SRS v1.4.0, Use Case Overview & UC-04) | `bc499a86` | 16/11/2026 | PASS |
| **[#18](https://github.com/vohuunghiaah/brewlite/pull/18)** | `fix/baseline-quality-gates` | Sửa lỗi test baseline và thiết lập CI Quality Gates tự động | `eb98f505` | 16/11/2026 | PASS |
| **[#19](https://github.com/vohuunghiaah/brewlite/pull/19)** | `docs/task2-1-activity-correction` | Nghiệm thu Task 2.1 — Activity Diagram (3 sơ đồ, phân định TX1/TX2) | `acb9a5ea` | 16/11/2026 | PASS |
| **[#20](https://github.com/vohuunghiaah/brewlite/pull/20)** | `docs/task2-2-sequence-correction` | Nghiệm thu Task 2.2 — Sequence Diagram (3 sơ đồ, xử lý OCC & due-work) | `eeb51b13` | 16/11/2026 | PASS |
| **[#21](https://github.com/vohuunghiaah/brewlite/pull/21)** | `docs/task2-3-class-diagram` | Nghiệm thu Task 2.3 — Domain Class Diagram (Mermaid MMD + SVG) | `ee090814` | 16/11/2026 | PASS |
| **[#22](https://github.com/vohuunghiaah/brewlite/pull/22)** | `docs/task2-handover-gap-audit` | Bàn giao Task 2 sang Task 3, đồng bộ RTM v2.5.0 và kiểm toán GAP-01..05 | `1f11d9a3` | 16/11/2026 | PASS |
| **[#23](https://github.com/vohuunghiaah/brewlite/pull/23)** | `docs/task3-architecture-and-deployment` | Nghiệm thu Task 3.1 — Đặc tả Kiến trúc Modular Monolith & ADR-001..006 | `607c6d40` | 16/11/2026 | PASS |
| **[#24](https://github.com/vohuunghiaah/brewlite/pull/24)** | `docs/task3-2-aws-lightsail-deployment` | Nghiệm thu Task 3.2 — Sơ đồ Triển khai UML & ADR-007 (AWS Lightsail) | `4dd639ea` | 17/11/2026 | PASS |
| **[#25](https://github.com/vohuunghiaah/brewlite/pull/25)** | `docs/task4-1-final-acceptance` | Nghiệm thu Task 4.1 — Thiết lập Repository, Backlog Sprint 1/2, DoD | `5784317c` | 18/11/2026 | PASS |
| **[#26](https://github.com/vohuunghiaah/brewlite/pull/26)** | `docs/task4-2-document-management` | Nghiệm thu Task 4.2 — Quản lý Tài liệu, Chỉ mục tập trung & Change Control | `c8d7a012` | 18/11/2026 | PASS |
| **[#27](https://github.com/vohuunghiaah/brewlite/pull/27)** | `feat/task4-3-menu-mvp` | Hoàn thành Task 4.3 — MVP Sprint 1 (Menu & Product Detail View) | `75503086` | 18/11/2026 | PASS |
| **[#28](https://github.com/vohuunghiaah/brewlite/pull/28)** | `ci/task4-4-final-acceptance` | Hoàn thành Task 4.4 — Continuous Integration & Branch Protection Verification | `4517ea9b` | 18/11/2026 | PASS |
| **[#29](https://github.com/vohuunghiaah/brewlite/pull/29)** | `feat/task5-1-1-product-customization-cart` | Hoàn thành Task 5.1.1 — Tùy biến món, Slide-over Cart Drawer, Chống đơn lặp & TypeORM Migration | *(Đang mở)* | 19/11/2026 | PASS |

---

## 4. Tình Trạng Nghiệm Thu Tổng Thể Các Phân Hệ (Overall Acceptance Status)

- **Task 1 (Yêu cầu Phần mềm):** **PASS** (SRS v1.4.0, Use Case Overview, UC-04 chi tiết — PR #14, PR #17).
- **Task 2 (Phân tích & Thiết kế UML):** **DESIGN VERIFIED (PASS)** (Hệ thống 14 tệp sơ đồ chính thức trong `docs/diagram/` — PR #19, PR #20, PR #21).
- **Task 3.1 (Kiến trúc Hệ thống & ADRs):** **PASS** (Đặc tả Modular Monolith, ADR-001 -> ADR-006 — PR #23).
- **Task 3.2 (Sơ đồ Triển khai UML):** **PASS** (Deployment Diagram & ADR-007 AWS Lightsail — PR #24).
- **Task 4.1 (Thiết lập Repository & Backlog):** **PASS** (Monorepo `apps/web`, `apps/api`, `docs`, Git flow, Backlog Sprint 1 & 2, DoD — PR #6, PR #25).
- **Task 4.2 (Quản lý Tài liệu & Bàn giao):** **PASS** (Chỉ mục tập trung `docs/README.md`, Quy trình kiểm soát thay đổi `docs/document-control.md`, bảo toàn 100% tạo phẩm — PR #26 đã MERGED).
- **Task 4.3 (MVP Sprint 1 — Menu & Chi tiết sản phẩm):** **PASS** (Hiển thị thực đơn mobile-first, modal chi tiết sản phẩm, API integration, 26 unit/e2e/component tests, zero hydration error — PR #27 đã MERGED).
- **Task 4.4 (Continuous Integration & Quality Gates):** **FINAL PASS** (CI 4 bước tự động, Required Status Checks trên `main`, kiểm thử âm có kiểm soát chứng minh merge blocked khi có lỗi, biên bản nghiệm thu `DOC-CI-01` — PR #28 đã MERGED).
- **Task 5.1.1 (Tùy biến món & Giỏ hàng — Figma Alignment):** **FINAL ACCEPTANCE AUDIT / READY FOR MERGE** (Tùy chọn Size S/M/L, Toppings, Mức đường, Mức đá, Slide-over Cart Drawer, Chống tạo đơn lặp PENDING, TypeORM migration an toàn, 46+ tests tự động PASS 100% — PR #29).

---

## 5. Hướng Dẫn Truy Vết và Tra Cứu

Khi cần tra cứu mối liên hệ giữa một yêu cầu nghiệp vụ với thiết kế và mã nguồn:
1. Mở ma trận truy vết [RTM v2.5.0](traceability-matrix.md).
2. Tra cứu mã yêu cầu chức năng (ví dụ `FR-05` cho Tạo đơn hàng).
3. Đi theo các liên kết tương đối để đến trực tiếp:
   - Mục đặc tả trong [SRS](requirements/srs.md#2-hệ-thống-yêu-cầu-chức-năng-functional-requirements---fr).
   - Đặc tả ca sử dụng trong [Đặc tả UC-04](requirements/use-case-place-order.md).
   - Sơ đồ hoạt động [Activity Diagram](diagram/ActivityDiagram.puml).
   - Sơ đồ tuần tự [Sequence Diagram](diagram/SequenceDiagram.puml).
   - Quyết định kiến trúc [ADR-001](architecture/adr/adr/001-modular-monolith.md).
   - Mã nguồn triển khai trên nhánh `main` (`apps/api/src/orders/`).
