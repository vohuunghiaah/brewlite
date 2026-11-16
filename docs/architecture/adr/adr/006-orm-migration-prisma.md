# ADR-006: Đề xuất chuyển đổi ORM sang Prisma và chuẩn hóa định danh UUID

- **Trạng thái:** Proposed (Đang chờ Product Owner và Hội đồng kỹ thuật phê duyệt)
- **Phạm vi:** Tầng truy xuất dữ liệu (Data Access Layer) và Mô hình dữ liệu toàn hệ thống
- **Ngày đề xuất:** 16/11/2026
- **Tác giả:** Đội ngũ Kiến trúc BrewLite (Assignment 2)

---

## 1. Bối Cảnh (Context)

Hệ thống BrewLite hiện tại trên nhánh chính `main` đang sử dụng **TypeORM 1.1.2** kết hợp `@nestjs/typeorm`. Cấu hình hiện tại đang bật cờ `synchronize: true` trong `app.module.ts` mà chưa cấu hình quy trình migration chính thức. Mô hình khóa chính hiện tại sử dụng số nguyên tự tăng (`Integer / Serial`).

Trong quá trình phát triển nhánh tính năng phục vụ nghiệp vụ nâng cao (`feature/sprint2-full-flow`), nhóm đã triển khai thử nghiệm **Prisma ORM** và định danh **UUID**. Kết quả cho thấy Prisma hỗ trợ kiểm soát đồng thời (OCC) thuận tiện, định nghĩa schema tập trung dễ theo dõi, sinh TypeScript types tự động tại compile-time và tích hợp sẵn công cụ quản lý migration có phiên bản (`prisma migrate`).

Tuy nhiên, việc thay đổi công cụ ORM và chuyển đổi kiểu khóa chính từ `Integer` sang `UUID` là một quyết định kiến trúc lớn (Architectural Decision) với nhiều rủi ro về tính tương thích và di chuyển dữ liệu, cần được đánh giá và phê duyệt độc lập thay vì tự động hợp nhất qua các PR tính năng.

---

## 2. Vấn Đề (Problem Statement)

1. Cấu hình `synchronize: true` của TypeORM trên `main` chỉ phù hợp cho môi trường phát triển cục bộ ban đầu; không nên đưa lên môi trường Production vì nguy cơ mất hoặc sai lệch cấu trúc dữ liệu khi entity thay đổi.
2. Việc sử dụng số nguyên tự tăng (`id: number`) khiến định danh tài nguyên mang tính tuần tự, dễ bị đoán biết (ID Enumeration).
3. Nhóm cần xác định rõ ràng công nghệ ORM và chiến lược migration mục tiêu cho giai đoạn triển khai Sprint 2 (Task 5).

---

## 3. Phân Tích & Phân Định Trách Nhiệm Bảo Mật (IDOR Clarification)

Trong thiết kế bảo mật chống truy cập trái phép đối tượng trực tiếp (Insecure Direct Object References - IDOR):
- **Vai trò của UUID:** Khóa chính định dạng UUIDv4 làm giảm đáng kể khả năng đoán biết hoặc quét tuần tự định danh tài nguyên (ID Enumeration) so với số nguyên tăng dần (1, 2, 3...). Đây là một lớp phòng vệ theo chiều sâu (Defense-in-Depth).
- **Cơ chế phòng chống IDOR cốt lõi:** UUID **không thay thế được việc kiểm tra quyền sở hữu (Ownership Check)**. Để ngăn chặn hoàn toàn IDOR, hệ thống bắt buộc phải:
  1. Xác thực danh tính người dùng thông qua chữ ký số của JSON Web Token (JWT).
  2. Thực hiện kiểm tra quyền sở hữu tại tầng nghiệp vụ (`order.userId === currentUser.id`) hoặc Guard/Interceptor trước khi trả dữ liệu hoặc cho phép cập nhật đơn hàng.

---

## 4. Các Phương Án Lựa Chọn (Options Considered)

### Phương án A: Tiếp tục sử dụng TypeORM và xây dựng TypeORM Migrations
- **Mô tả:** Giữ nguyên TypeORM, tắt `synchronize: false`, thiết lập cấu hình TypeORM CLI để sinh và chạy các tệp migration cho PostgreSQL. Giữ khóa chính `Integer` hoặc chuyển sang `UUID` bằng Decorator `@PrimaryGeneratedColumn('uuid')`.
- **Ưu điểm:**
  - Không cần thay đổi mã nguồn các module hiện có (`products`, `orders`) trên `main`.
  - Hỗ trợ tốt các mẫu thiết kế hướng đối tượng phức tạp và Active Record / Data Mapper linh hoạt.
- **Nhược điểm:**
  - Cần cấu hình tooling riêng cho TypeORM CLI trên TypeScript/ESM.
  - Định nghĩa schema phân tán theo từng file entity, cần kiểm soát chặt chẽ việc đồng bộ metadata.

### Phương án B: Chuyển đổi sang Prisma ORM và chuẩn hóa UUID (Phương án Đề xuất)
- **Mô tả:** Thay thế `@nestjs/typeorm` bằng `PrismaService` (`@prisma/client`), quản lý mô hình dữ liệu tập trung trong `prisma/schema.prisma`. Chuẩn hóa khóa chính thành `UUID` (`@default(uuid())`). Quản lý lịch sử cơ sở dữ liệu bằng `prisma migrate`. Kế thừa mã nguồn đã được kiểm thử trên nhánh `feature/sprint2-full-flow`.
- **Ưu điểm:**
  - Định nghĩa schema tập trung (Single Source of Truth), cú pháp DSL trực quan.
  - Prisma Client tự động sinh TypeScript types tương ứng với schema, hỗ trợ kiểm tra kiểu dữ liệu tĩnh tốt khi biên dịch.
  - Hỗ trợ câu lệnh cập nhật kiểm soát đồng thời OCC trực tiếp qua `updateMany({ where: { id, version, stock: { gte: quantity } } })`.
  - Đã có sẵn mã nguồn nghiệp vụ đầy đủ và bộ ca kiểm thử trên nhánh feature.
- **Nhược điểm & Rủi ro:**
  - Phá vỡ tính tương thích ngược (Breaking Change) đối với API cũ dùng ID dạng số nguyên (ví dụ: `GET /orders/1`).
  - Đòi hỏi viết Data Migration Script nếu cần chuyển dữ liệu sản phẩm đang có trên `main`.
  - Prisma Client tạo thêm một lớp abstraction và engine binary riêng trong container.

---

## 5. Quyết Định Đề Xuất (Proposed Decision)

Đội ngũ kiến trúc **đề xuất lựa chọn Phương án B: Chuyển đổi sang Prisma ORM và chuẩn hóa UUID cho giai đoạn Sprint 2 (Task 5)**, với lộ trình thực hiện có kiểm soát như sau:
1. Giữ nguyên kiến trúc hiện tại trên `main` cho đến khi Task 3 (Kiến trúc & Deployment) được nghiệm thu hoàn tất.
2. Trong giai đoạn Task 5 (Triển khai Sprint 2 & Bàn giao), thực hiện sáp nhập có kiểm soát nhánh `feature/sprint2-full-flow` vào `main` thông qua một PR riêng biệt kèm theo kiểm thử hồi quy toàn diện.
3. Cập nhật hợp đồng API và tài liệu giao tiếp Frontend - Backend để thống nhất sử dụng định dạng UUID.

---

## 6. Hệ Quả & Trade-off (Consequences)

**Ưu điểm:**
- Nâng cao tính nhất quán của mô hình dữ liệu và quy trình migration có phiên bản.
- Hỗ trợ triển khai hiệu quả cơ chế kiểm soát đồng thời OCC (`NFR-04`) và giảm thiểu nguy cơ dò quét mã ID tuần tự.

**Hạn chế & Trade-off:**
- Nhóm chấp nhận chi phí chuyển đổi hợp đồng API sang UUID và công việc viết migration script để đổi lấy trải nghiệm phát triển nhất quán và khả năng quản lý schema tập trung.

---

## 7. Trạng Thái Phê Duyệt
Quyết định này hiện ở trạng thái **`Proposed`**, chờ xác nhận và phê duyệt từ Product Owner trước khi tiến hành chuyển đổi mã nguồn trên nhánh `main`.
