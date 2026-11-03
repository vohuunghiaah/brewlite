# ADR-001: Lựa chọn kiến trúc Modular Monolith cho Backend

- **Trạng thái:** Accepted
- **Phạm vi:** Backend BrewLite

## 1. Bối cảnh

BrewLite là ứng dụng đặt đồ uống trực tuyến, trong phạm vi MVP phục vụ một cửa hàng. Các nghiệp vụ chính gồm xác thực người dùng, quản lý sản phẩm, giỏ hàng, đặt đơn hàng, thanh toán mô phỏng và theo dõi trạng thái đơn hàng.

Nhóm cần lựa chọn kiến trúc Backend dễ phát triển, kiểm thử, bảo trì và triển khai, đồng thời đáp ứng yêu cầu sử dụng NestJS theo module/domain.

## 2. Quyết định

Nhóm lựa chọn **Modular Monolith** trên nền tảng NestJS. Backend được tổ chức thành các module nghiệp vụ như:

- `AuthModule`: đăng ký, đăng nhập và xác thực JWT.
- `UsersModule`: quản lý thông tin người dùng.
- `ProductsModule`: truy vấn sản phẩm, danh mục và tùy chọn đồ uống.
- `CartModule`: xử lý giỏ hàng nếu có nghiệp vụ phía Backend.
- `OrdersModule`: tạo đơn, lưu chi tiết đơn và quản lý trạng thái.
- `PaymentsModule`: xử lý thanh toán mô phỏng.
- `HealthModule`: cung cấp endpoint kiểm tra tình trạng hệ thống.

Các module nằm trong cùng một ứng dụng NestJS nhưng có trách nhiệm riêng. Bên trong module, nhóm tổ chức các thành phần theo trách nhiệm như Controller, Service, DTO, Domain/Entity và Repository hoặc lớp truy cập dữ liệu.

## 3. Các phương án thay thế

- **Microservices:** tách từng nhóm nghiệp vụ thành dịch vụ triển khai độc lập.
- **Monolith không phân module rõ ràng:** tổ chức toàn bộ chức năng trong một ứng dụng nhưng không kiểm soát ranh giới nghiệp vụ chặt chẽ.

## 4. Lý do lựa chọn

- Phù hợp quy mô MVP và phạm vi một cửa hàng.
- Giảm độ phức tạp trong phát triển và triển khai.
- Phù hợp với NestJS và yêu cầu tổ chức Backend theo module/domain.
- Thuận tiện kiểm thử luồng nghiệp vụ đầu-cuối.
- Không cần vận hành nhiều dịch vụ độc lập khi nhóm chưa có nhu cầu thực tế.

## 5. Hệ quả và Trade-off

**Ưu điểm**
- Cấu trúc mã nguồn rõ ràng theo nghiệp vụ.
- Dễ phát triển, kiểm thử và bảo trì.
- Triển khai Backend thống nhất, giảm công việc vận hành.
- Có thể mở rộng module về mặt mã nguồn khi nghiệp vụ tăng.

**Hạn chế**
- Không thể triển khai hoặc mở rộng từng module độc lập như Microservices.
- Các module cùng sử dụng tài nguyên của ứng dụng Backend.
- Cần kiểm soát phụ thuộc giữa các module để tránh liên kết chặt.

**Trade-off:** Nhóm chấp nhận hạn chế về khả năng mở rộng độc lập để đổi lấy kiến trúc đơn giản, phù hợp nguồn lực và tiến độ MVP.
