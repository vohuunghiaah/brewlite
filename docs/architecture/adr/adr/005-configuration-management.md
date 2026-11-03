# ADR-005: Quản lý cấu hình bằng Environment Variables

- **Trạng thái:** Accepted
- **Phạm vi:** Cấu hình ứng dụng BrewLite

## 1. Bối cảnh

BrewLite cần quản lý các thông tin cấu hình khác nhau giữa môi trường Development, Testing và Production. Các thông tin như cổng ứng dụng, kết nối PostgreSQL và khóa xác thực không nên được ghi cố định trong mã nguồn.

## 2. Quyết định

Nhóm quản lý cấu hình bằng **Environment Variables**. Trong NestJS, có thể sử dụng `@nestjs/config` và `ConfigModule` để đọc, kiểm tra và cung cấp cấu hình cho ứng dụng.

Các biến cấu hình chính gồm:

- `NODE_ENV`: môi trường hoạt động.
- `PORT`: cổng Backend.
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`: thông tin kết nối PostgreSQL.
- `JWT_SECRET`: khóa bí mật dùng cho JWT.
- `JWT_EXPIRES_IN`: thời hạn token.

Nhóm cung cấp `.env.example` để mô tả các biến cần thiết; file `.env` chứa giá trị thực tế không được đưa lên Git.

## 3. Các phương án thay thế

- Ghi cấu hình trực tiếp trong mã nguồn.
- Sử dụng một file cấu hình riêng cho từng môi trường.
- Sử dụng hệ thống quản lý secret chuyên dụng của nền tảng triển khai.

## 4. Lý do lựa chọn

- Tách cấu hình khỏi mã nguồn.
- Dễ thay đổi cấu hình giữa các môi trường mà không phải sửa logic ứng dụng.
- Hạn chế đưa thông tin nhạy cảm vào repository.
- Phù hợp với Docker và Docker Compose.

## 5. Hệ quả và Trade-off

**Ưu điểm**
- Cấu hình linh hoạt giữa các môi trường.
- Hạn chế lộ thông tin bí mật trong mã nguồn.
- Thuận tiện khi triển khai bằng container.
- Các thành viên có thể thống nhất tên biến thông qua `.env.example`.

**Hạn chế**
- Cần quản lý và cung cấp đầy đủ biến môi trường khi chạy ứng dụng.
- Cấu hình sai hoặc thiếu biến có thể khiến ứng dụng không khởi động.
- File `.env` vẫn cần được bảo vệ nếu sử dụng trong môi trường phát triển.

**Trade-off:** Nhóm chấp nhận thêm bước thiết lập biến môi trường để đổi lấy khả năng quản lý cấu hình linh hoạt và an toàn hơn.

## 6. Nguyên tắc thực hiện

- Không commit file `.env` có chứa secret lên Git.
- Duy trì `.env.example` không chứa giá trị bí mật thật.
- Kiểm tra các biến bắt buộc khi ứng dụng khởi động.
- Sử dụng secret/environment variables được nền tảng cung cấp trong production.
- Phân biệt dữ liệu demo với dữ liệu production.
