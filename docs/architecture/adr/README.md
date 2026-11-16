# Danh Mục Quyết Định Kiến Trúc (Architecture Decision Records - ADR)

**Dự án:** BrewLite — Hệ Thống Đặt Đồ Uống Trực Tuyến (Assignment 2)
**Phân hệ:** Task 3.1 — Phương pháp & Quyết định Kiến trúc
**Ngày cập nhật:** 16/11/2026

---

## 1. Mục Đích & Nguyên Tắc Quản Lý ADR

Architecture Decision Record (ADR) là tài liệu nắm bắt các quyết định kiến trúc quan trọng về mặt công nghệ, giải pháp thiết kế, trade-off và hệ quả vận hành của hệ thống BrewLite.

### Quy Chuẩn Trạng Thái Quyết Định (ADR Statuses):
- **`Proposed`:** Quyết định kiến trúc đang trong giai đoạn đề xuất, thảo luận kỹ thuật, chưa được toàn đội ngũ hoặc Product Owner phê duyệt chính thức.
- **`Accepted`:** Quyết định đã được thống nhất, phê duyệt trong tài liệu thiết kế và định hướng kiến trúc của hệ thống.
- **`Implemented`:** Quyết định đã được hiện thực hóa bằng mã nguồn hoạt động, có cấu hình hoặc ca kiểm thử kiểm chứng cụ thể trong repository.
- **`Superseded`:** Quyết định đã bị một ADR mới hơn thay thế (kèm liên kết tham chiếu đến ADR thay thế).

---

## 2. Bảng Tổng Hợp Các Quyết Định Kiến Trúc

| Mã ADR | Tiêu Đề Quyết Định | Trạng Thái Quyết Định | Trạng Thái Triển Khai | Baseline Ghi Nhận | Tệp Đặc Tả Chi Tiết |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **ADR-001** | Lựa chọn kiến trúc Modular Monolith cho Backend | **Accepted** | **Implemented** | `main` (TypeORM) & Feature (Prisma) | [adr/001-modular-monolith.md](adr/001-modular-monolith.md) |
| **ADR-002** | Lựa chọn PostgreSQL và quản lý schema bằng Migration | **Accepted** | **Partially Implemented** | `main` (`synchronize: true`) / Feature (`Prisma Migrate`) | [adr/002-postgresql-migration.md](adr/002-postgresql-migration.md) |
| **ADR-003** | Xây dựng dịch vụ thanh toán mô phỏng (Mock Payment Service) | **Accepted** | **Design Verified** / Implemented trên Feature | Đã nghiệm thu Task 2.1 & Task 2.2; code trên `feature/sprint2-full-flow` | [adr/003-mock-payment.md](adr/003-mock-payment.md) |
| **ADR-004** | Bổ sung Logging và Endpoint Health Check (`GET /health`) | **Proposed** | **Partially Implemented** | Logging trên `main`; Health Check trên Feature (trả `connected` lệch SRS `up`, cần chuẩn hóa ở Task 5 - [GAP-04](../../audits/task2-to-task3-gap-audit.md#24-gap-04-endpoint-kiểm-tra-sức-khỏe-health-check-api)) | [adr/004-logging-healthcheck.md](adr/004-logging-healthcheck.md) |
| **ADR-005** | Quản lý cấu hình bằng Biến Môi Trường (Environment Variables) | **Accepted** | **Implemented** | `main` & Feature (`.env`, `@nestjs/config`) | [adr/005-configuration-management.md](adr/005-configuration-management.md) |
| **ADR-006** | Đề xuất chuyển đổi ORM sang Prisma và chuẩn hóa UUID | **Proposed** | **Implemented trên Feature** (Chưa merge) | Đang chờ PO phê duyệt chính thức cho giai đoạn Sprint 2 (Task 5) | [adr/006-orm-migration-prisma.md](adr/006-orm-migration-prisma.md) |

---

## 3. Lưu Ý Về Tính Nhất Quán & Truy Vết Lịch Sử

1. **Khớp nối trạng thái phê duyệt:**
   - Trạng thái trong bảng trên phản ánh chính xác trạng thái trong từng tệp ADR tương ứng (`ADR-001`, `002`, `003`, `005` là `Accepted`; `ADR-004` và `ADR-006` là `Proposed`).
2. **Nguyên tắc không suy diễn tính năng:** Sự tồn tại của một ADR ở trạng thái `Accepted` hoặc `Proposed` là cơ sở thiết kế, không tự động chứng minh rằng tính năng đó đã có sẵn mã nguồn trên nhánh `main`. Mọi đối chiếu triển khai phải dựa trên chứng cứ mã nguồn thực tế và ma trận [RTM](../../traceability-matrix.md).
