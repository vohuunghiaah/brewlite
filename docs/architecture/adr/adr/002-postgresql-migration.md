# ADR-002: Lựa chọn PostgreSQL và quản lý schema bằng Migration

- **Trạng thái:** Accepted
- **Phạm vi:** Lưu trữ dữ liệu BrewLite

## 1. Bối cảnh

BrewLite cần lưu trữ dữ liệu có quan hệ gồm người dùng, sản phẩm, danh mục, tùy chọn đồ uống, đơn hàng, chi tiết đơn hàng và giao dịch thanh toán mô phỏng. Dữ liệu cần có ràng buộc và được cập nhật nhất quán.

## 2. Quyết định

Nhóm lựa chọn **PostgreSQL** làm hệ quản trị cơ sở dữ liệu quan hệ. Các thay đổi cấu trúc database được quản lý bằng **Migration**, sử dụng công cụ ORM tương thích với NestJS theo cấu hình dự án.

Các nhóm dữ liệu chính gồm:

- Người dùng và thông tin tài khoản.
- Sản phẩm, danh mục và tùy chọn đồ uống.
- Đơn hàng và chi tiết đơn hàng.
- Giao dịch thanh toán mô phỏng.
- Trạng thái xử lý đơn hàng.

## 3. Các phương án thay thế

- MySQL hoặc một hệ quản trị cơ sở dữ liệu quan hệ khác.
- MongoDB hoặc cơ sở dữ liệu NoSQL.
- Thay đổi schema thủ công trực tiếp trên từng môi trường.

## 4. Lý do lựa chọn

- Dữ liệu BrewLite có quan hệ rõ ràng giữa người dùng, đơn hàng, chi tiết đơn và thanh toán.
- PostgreSQL hỗ trợ khóa, ràng buộc và transaction để bảo đảm tính toàn vẹn.
- Migration giúp ghi nhận lịch sử thay đổi schema và đồng bộ cấu trúc giữa các môi trường.
- Phù hợp với yêu cầu công nghệ của dự án.

## 5. Hệ quả và Trade-off

**Ưu điểm**
- Quản lý dữ liệu quan hệ và ràng buộc toàn vẹn.
- Hỗ trợ transaction cho các thao tác cần tính nhất quán.
- Migration giúp kiểm soát thay đổi database có phiên bản.
- Thuận tiện tạo lại schema ở môi trường phát triển và kiểm thử.

**Hạn chế**
- Cần thiết kế bảng, quan hệ và chỉ mục phù hợp.
- Nhóm phải quản lý thứ tự migration và xử lý thay đổi schema cẩn thận.
- Cần có kế hoạch backup và lưu trữ dữ liệu khi triển khai.

**Trade-off:** Nhóm chấp nhận công việc thiết kế schema và quản lý migration để đổi lấy dữ liệu có cấu trúc, nhất quán và dễ kiểm soát.
