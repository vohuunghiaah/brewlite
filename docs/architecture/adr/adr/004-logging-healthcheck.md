# ADR-004: Bổ sung Logging và Health Check

- **Trạng thái:** Proposed
- **Phạm vi:** Vận hành và giám sát Backend BrewLite

## 1. Bối cảnh

BrewLite cần có khả năng theo dõi hoạt động Backend, hỗ trợ phát hiện lỗi và kiểm tra tình trạng sẵn sàng của ứng dụng trong quá trình phát triển, kiểm thử và triển khai.

## 2. Quyết định

Nhóm sử dụng Logger tích hợp sẵn của NestJS cho nhu cầu ghi nhật ký cơ bản. Khi có nhu cầu nâng cao, có thể xem xét thư viện logging chuyên dụng.

Nhóm bổ sung `HealthModule` để cung cấp các endpoint kiểm tra tình trạng ứng dụng:

- `GET /health/live`: kiểm tra tiến trình Backend còn hoạt động.
- `GET /health/ready`: kiểm tra ứng dụng đã sẵn sàng phục vụ, bao gồm khả năng kết nối PostgreSQL.

## 3. Nội dung Logging

Nhật ký có thể ghi nhận:

- Thời điểm phát sinh sự kiện.
- Mức độ log như INFO, WARN và ERROR.
- Module phát sinh sự kiện.
- Request ID để hỗ trợ truy vết.
- Nội dung sự kiện và thông tin lỗi phù hợp.

Các sự kiện cần theo dõi gồm đăng nhập, tạo đơn, xử lý thanh toán và lỗi kết nối cơ sở dữ liệu.

Không ghi mật khẩu, JWT, secret key hoặc dữ liệu tài chính nhạy cảm vào log.

## 4. Lý do lựa chọn

- Logger tích hợp sẵn giúp triển khai nhanh cho quy mô MVP.
- Health Check giúp kiểm tra trạng thái ứng dụng và phụ thuộc quan trọng.
- Có thể tích hợp với Docker hoặc nền tảng triển khai để theo dõi tình trạng dịch vụ.
- Không cần xây dựng hệ thống giám sát tập trung phức tạp ngay từ đầu.

## 5. Hệ quả và Trade-off

**Ưu điểm**
- Dễ phát hiện và truy vết lỗi.
- Hỗ trợ kiểm tra trạng thái Backend và PostgreSQL.
- Phù hợp với môi trường phát triển và trình diễn.

**Hạn chế**
- Logger cơ bản chưa cung cấp đầy đủ khả năng phân tích log tập trung.
- Health Check chỉ phản ánh các thành phần được cấu hình kiểm tra.
- Cần xác định chính sách lưu trữ và bảo vệ log khi triển khai.

**Trade-off:** Nhóm ưu tiên cơ chế logging và health check đơn giản, dễ triển khai; các công cụ giám sát nâng cao được cân nhắc khi hệ thống mở rộng.
