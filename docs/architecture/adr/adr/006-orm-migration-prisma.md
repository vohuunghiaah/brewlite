# ADR-006: Đề xuất chuyển đổi ORM sang Prisma và chuẩn hóa định danh UUID

- **Trạng thái:** Proposed (Đang chờ Product Owner và Hội đồng kỹ thuật phê duyệt)
- **Phạm vi:** Tầng truy xuất dữ liệu (Data Access Layer) và Mô hình dữ liệu toàn hệ thống
- **Ngày đề xuất:** 16/11/2026
- **Tác giả:** Đội ngũ Kiến trúc BrewLite (Assignment 2)

---

## 1. Bối Cảnh (Context)

Hệ thống BrewLite hiện tại trên nhánh chính `main` đang sử dụng **TypeORM 1.1.2** kết hợp `@nestjs/typeorm`. Cấu hình hiện tại đang bật cờ `synchronize: true` trong `app.module.ts` mà chưa có hệ thống migration chính thức. Mô hình khóa chính hiện tại sử dụng số nguyên tự tăng (`Integer / Serial`).

Trong quá trình phát triển các nhánh tính năng phục vụ nghiệp vụ nâng cao (`feature/sprint1-mvp-foundation`, `feature/sprint2-full-flow`), nhóm đã thử nghiệm thành công việc sử dụng **Prisma ORM** và định danh **UUID**. Kết quả cho thấy Prisma hỗ trợ kiểm soát đồng thời (OCC) rất mượt mà, định nghĩa schema tập trung dễ bảo trì, sinh TypeScript types an toàn 100% tại compile-time và tích hợp sẵn công cụ quản lý migration có phiên bản (`prisma migrate`).

Tuy nhiên, việc thay đổi công cụ ORM và chuyển đổi kiểu khóa chính từ `Integer` sang `UUID` là một quyết định kiến trúc lớn (Architectural Decision) với nhiều rủi ro về tính tương thích và di chuyển dữ liệu, cần được đánh giá và phê duyệt độc lập thay vì tự động hợp nhất qua các PR tính năng.

---

## 2. Vấn Đề (Problem Statement)

1. Cấu hình `synchronize: true` của TypeORM trên `main` không thể đưa lên môi trường Production vì nguy cơ mất dữ liệu khi sửa đổi entity.
2. TypeORM 1.x gặp nhiều khó khăn trong việc quản lý và tự động sinh migration nhất quán trên môi trường CI/CD không có kết nối cơ sở dữ liệu trực tiếp.
3. Việc sử dụng số nguyên tự tăng (`id: number`) dễ bị tấn công duyệt tuần tự (ID Enumeration / Insecure Direct Object References - IDOR) và gây khó khăn khi phân tán dữ liệu hoặc đồng bộ đơn hàng từ các kênh ngoại tuyến.
4. Nhóm cần một quyết định dứt khoát về công nghệ ORM mục tiêu cho giai đoạn triển khai Task 4 (Sprint 2) và Task 5.

---

## 3. Các Phương Án Lựa Chọn (Options Considered)

### Phương án A: Tiếp tục sử dụng TypeORM và xây dựng TypeORM Migrations thủ công
- **Mô tả:** Giữ nguyên TypeORM, tắt `synchronize: false`, viết TypeORM migration scripts cho PostgreSQL. Tiếp tục dùng khóa chính `Integer` hoặc chuyển sang `UUID` bằng Decorator `@PrimaryGeneratedColumn('uuid')`.
- **Ưu điểm:** Không cần thay đổi mã nguồn các module hiện có (`products`, `orders`) trên `main`.
- **Nhược điểm:** Cấu hình TypeORM CLI phức tạp với TypeScript hiện đại (NestJS 12 / Node.js 24 ES Modules), dễ phát sinh lỗi khi chạy migration trong CI pipeline; trải nghiệm phát triển và an toàn kiểu dữ liệu kém hơn Prisma.

### Phương án B: Chuyển đổi toàn diện sang Prisma ORM và chuẩn hóa UUID (Phương án Đề xuất)
- **Mô tả:** Thay thế `@nestjs/typeorm` bằng `PrismaService` (`@prisma/client`), quản lý toàn bộ mô hình dữ liệu tập trung trong `prisma/schema.prisma`. Chuẩn hóa toàn bộ khóa chính thành `UUID` (`@default(uuid())`). Quản lý lịch sử cơ sở dữ liệu bằng `prisma migrate`. Kế thừa toàn bộ mã nguồn đã hoàn thiện và kiểm thử đạt chuẩn trên nhánh `feature/sprint2-full-flow`.
- **Ưu điểm:**
  - An toàn kiểu dữ liệu tuyệt đối (Type-safety): Prisma Client tự động sinh TypeScript types khớp 100% với database schema.
  - Quản lý schema tập trung, dễ đọc, dễ bảo trì.
  - Hỗ trợ câu lệnh cập nhật kiểm soát đồng thời OCC trực tiếp qua `updateMany({ where: { id, version, stock: { gte: quantity } } })`.
  - Khóa chính UUID bảo vệ hệ thống khỏi tấn công IDOR (`NFR-02`).
  - Đã có sẵn mã nguồn đầy đủ và bộ ca kiểm thử đã PASS trên nhánh feature.
- **Nhược điểm & Rủi ro:**
  - Phá vỡ tính tương thích ngược (Breaking Change) đối với API cũ dùng ID dạng số nguyên (ví dụ: `GET /orders/1`).
  - Đòi hỏi viết Data Migration Script nếu cần chuyển dữ liệu sản phẩm đang có trên `main`.

---

## 4. Quyết Định Đề Xuất (Proposed Decision)

Đội ngũ kiến trúc **đề xuất lựa chọn Phương án B: Chuyển đổi sang Prisma ORM và chuẩn hóa UUID cho giai đoạn Sprint 2 (Task 4)**, với lộ trình thực hiện có kiểm soát như sau:
1. Giữ nguyên kiến trúc hiện tại trên `main` cho đến khi Task 3 (Kiến trúc & Deployment) được nghiệm thu hoàn tất.
2. Khi bắt đầu Task 4 (Triển khai Sprint 2), thực hiện sáp nhập có kiểm soát nhánh `feature/sprint2-full-flow` vào `main` thông qua một PR riêng biệt kèm theo kiểm thử hồi quy toàn diện.
3. Cập nhật hợp đồng API và tài liệu giao tiếp Frontend - Backend để thống nhất sử dụng định dạng UUID.

---

## 5. Hệ Quả & Trade-off (Consequences)

**Ưu điểm:**
- Nâng cao năng suất lập trình và độ tin cậy của mã nguồn.
- Loại bỏ hoàn toàn nguy cơ mất dữ liệu do `synchronize: true`.
- Hiện thực hóa thành công các yêu cầu phi chức năng về kiểm soát đồng thời (`NFR-04`) và bảo mật (`NFR-02`).

**Hạn chế:**
- Cần có bước chạy `npx prisma generate` trong quy trình build và CI/CD.
- Kích thước Docker image có thể tăng nhẹ do chứa bộ sinh mã của Prisma engine (tuy nhiên đã được giải quyết bằng Docker multi-stage build).

**Trade-off Chấp Nhận:** Nhóm chấp nhận chi phí chuyển đổi hợp đồng API sang UUID để đổi lấy độ an toàn dữ liệu, khả năng mở rộng và chất lượng kiểm thử vượt trội.

---

## 6. Trạng Thái Phê Duyệt
Quyết định này hiện ở trạng thái **`Proposed`**, chờ xác nhận và phê duyệt từ Product Owner trước khi tiến hành sáp nhập mã nguồn vào nhánh `main`.
