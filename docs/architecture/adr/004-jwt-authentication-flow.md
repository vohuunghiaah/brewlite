# ADR 004: XÁC THỰC VÀ PHÂN QUYỀN BẰNG JSON WEB TOKEN (JWT)

## Bối cảnh (Context)
Ứng dụng BrewLite vận hành theo mô hình tách biệt Frontend (Next.js) và Backend REST API (NestJS). Khách hàng có thể duyệt menu ẩn danh, nhưng cần định danh chính xác khi thực hiện đặt đơn, thanh toán và xem lịch sử đơn hàng cá nhân để bảo vệ quyền riêng tư và tránh lỗ hổng IDOR.

## Quyết định (Decision)
Triển khai cơ chế xác thực không lưu trạng thái (Stateless Authentication) dựa trên **JWT Bearer Token**:
1. Mật khẩu người dùng được băm an toàn một chiều bằng thuật toán `bcrypt` với cost factor là 10 trước khi lưu vào database.
2. Khi đăng nhập thành công (`POST /api/auth/login`), NestJS cấp phát JWT chứa `sub` (userId), `email` và `role`, ký bằng thuật toán HS256 và biến môi trường bí mật `JWT_SECRET`.
3. Thời hạn của token được đặt ở mức phù hợp (ví dụ: 7 ngày cho bản MVP).
4. Các endpoint nhạy cảm (`POST /api/orders`, `GET /api/orders/me`, `GET /api/orders/:id`, `POST /api/payments`) được bảo vệ bằng `JwtAuthGuard`.
5. Đối với `GET /api/orders/:id`, hệ thống kiểm tra chặt chẽ `order.userId === request.user.id` (hoặc role là STAFF/ADMIN) để ngăn chặn hoàn toàn lỗ hổng IDOR.

## Hệ quả (Consequences)
- **Tích cực:** Backend không cần lưu session trong RAM hay Redis, mở rộng linh hoạt theo chiều ngang; token có thể giải mã nhanh chóng ở các lớp Guard.
- **Tiêu cực:** Không thể thu hồi tức thì token trước thời hạn trừ khi bổ sung cơ chế blacklist hoặc token versioning.
