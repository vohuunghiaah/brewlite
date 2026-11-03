**1. YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)**

Các yêu cầu chức năng của hệ thống được phân rã theo mã định danh FR-xx và áp dụng mức độ ưu tiên MoSCoW:

**1.1. Nhóm Quản lý Sản phẩm \& Menu**

**FR-01:** Hiển thị danh sách sản phẩm (Menu)

Mức ưu tiên: Must have

Mô tả: Hệ thống hiển thị danh sách đồ uống trên màn hình chính (menu) dưới dạng lưới (grid) bao gồm: hình ảnh, tên sản phẩm, giá cơ bản và trạng thái còn hàng.

Tiêu chí chấp nhận:

Gọi API GET /products thành công và nhận về JSON chứa danh sách sản phẩm hợp lệ.

Giao diện hiển thị đúng các thông tin, có trạng thái loading khi đang tải và trạng thái empty nếu không có sản phẩm.

**FR-02:** Xem chi tiết sản phẩm và tùy chọn (Size, Topping)

Mức ưu tiên: Must have

Mô tả: Cho phép khách hàng xem thông tin chi tiết của một sản phẩm, chọn kích cỡ (S, M, L) và chọn các loại topping kèm theo. Giá sản phẩm tự động cập nhật theo tùy chọn.

Tiêu chí chấp nhận:

Gọi API GET /products/:id trả về thông tin chi tiết sản phẩm.

Khi chọn Size (S/M/L) hoặc Topping, tổng giá tiền của sản phẩm trên giao diện được tính toán lại chính xác theo công thức cấu hình.

**1.2. Nhóm Giỏ hàng (Cart)**

**FR-03:** Quản lý giỏ hàng và tính tổng tiền

Mức ưu tiên: Must have

Mô tả: Cho phép khách hàng thêm sản phẩm (đã chọn size/topping) vào giỏ hàng, thay đổi số lượng, xóa sản phẩm khỏi giỏ và xem tổng tiền tạm tính.

Tiêu chí chấp nhận:

Trạng thái giỏ hàng được lưu trữ phía client (Zustand/Context).

Badge hiển thị đúng số lượng tổng sản phẩm trên icon giỏ hàng.

Tự động tính lại tổng tiền (lineTotal và total) khi tăng/giảm số lượng hoặc xóa món.

**1.3. Nhóm Xác thực người dùng (Authentication)**

**FR-04:** Đăng ký và Đăng nhập tài khoản (JWT)

Mức ưu tiên: Must have

Mô tả: Người dùng thực hiện đăng ký tài khoản mới và đăng nhập vào hệ thống để có quyền thực hiện đặt đơn.

Tiêu chí chấp nhận:

Endpoint POST /auth/register lưu thông tin người dùng với mật khẩu đã được băm an toàn bằng bcrypt.

Endpoint POST /auth/login xác thực thông tin và trả về JWT token.

Các route đặt đơn được bảo vệ bởi Guard yêu cầu JWT hợp lệ.

**1.4. Nhóm Đặt đơn hàng \& Thanh toán**

**FR-05:** Tạo đơn hàng (Order Creation)

Mức ưu tiên: Must have

Mô tả: Hệ thống tiếp nhận thông tin từ giỏ hàng để khởi tạo một đơn hàng mới ở trạng thái chờ (PENDING).

Tiêu chí chấp nhận:

Endpoint POST /orders nhận dữ liệu giỏ hàng, validate dữ liệu đầu vào bằng class-validator, lưu vào cơ sở dữ liệu với trạng thái PENDING và trả về mã đơn hàng (order code/id).

**FR-06:** Thanh toán không tiền mặt (Mock Payment)

Mức ưu tiên: Must have

Mô tả: Khách hàng chọn phương thức thanh toán không tiền mặt (Ví điện tử hoặc Thẻ ngân hàng) qua cổng thanh toán giả lập để thanh toán đơn hàng.

Tiêu chí chấp nhận:

Khi giỏ hàng có ít nhất 1 sản phẩm, nút "Thanh toán" hiển thị tổng tiền chính xác.

Endpoint POST /payments tích hợp cơ chế thanh toán giả lập: nếu thành công, đơn hàng chuyển sang trạng thái PAID; nếu lỗi, đơn hàng chuyển sang PAYMENT\_FAILED và giữ nguyên giỏ hàng để thử lại.

**FR-07:** Xác nhận đơn hàng và Xem lịch sử đơn

Mức ưu tiên: Must have

Mô tả: Hiển thị màn hình xác nhận đặt hàng thành công kèm mã đơn và trạng thái; đồng thời cho phép tra cứu lịch sử các đơn hàng đã đặt của người dùng.

Tiêu chí chấp nhận:

Sau khi thanh toán thành công, UI chuyển hướng đến màn hình xác nhận hiển thị mã đơn (ví dụ: #1042), trạng thái PAID và lời nhắn mời tới quầy lấy nước.

Endpoint GET /orders/me trả về danh sách lịch sử đơn hàng chính xác của user đang đăng nhập.

**2. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)**

Các yêu cầu phi chức năng quy định chất lượng hệ thống được ký hiệu bằng NFR-xx:

**NFR-01:** Hiệu năng (Performance)

Mô tả: Thời gian phản hồi của các REST API phải nhanh chóng để đảm bảo trải nghiệm người dùng mượt mà.

Tiêu chí chấp nhận: Thời gian phản hồi API  với tập dữ liệu mẫu chuẩn.

**NFR-02:** Bảo mật (Security)

Mô tả: Bảo vệ thông tin cá nhân và dữ liệu xác thực của người dùng khỏi các nguy cơ lộ lọt.

Tiêu chí chấp nhận: Mật khẩu bắt buộc phải được băm (hash) trước khi lưu trữ vào cơ sở dữ liệu; xác thực toàn bộ các request nhạy cảm qua JWT; dữ liệu đầu vào ở cả Frontend và Backend phải được kiểm tra (validate) chặt chẽ.

**NFR-03:** Khả năng tương thích (Usability \& Compatibility)

Mô tả: Giao diện thiết kế theo hướng mobile-first/PWA, phù hợp cho các thiết bị di động và hiển thị tốt trên các trình duyệt web hiện đại.

Tiêu chí chấp nhận: Giao diện tương thích hoàn toàn và hiển thị chính xác trên các trình duyệt phổ biến (Chrome, Safari, Firefox, Edge).

**NFR-04:** Khả năng triển khai (Deployability)

Mô tả: Hệ thống dễ dàng đóng gói và vận hành qua công cụ Docker.

Tiêu chí chấp nhận: Cung cấp file docker-compose.yml để khởi chạy đồng thời toàn bộ hệ thống gồm Frontend (Next.js), Backend (NestJS) và Database (PostgreSQL) chỉ với một lệnh duy nhất



