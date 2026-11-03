# ADR-003: Sử dụng Mock Payment Service

- **Trạng thái:** Accepted
- **Phạm vi:** Nghiệp vụ thanh toán đơn hàng

## 1. Bối cảnh

BrewLite cần hoàn thiện luồng đặt hàng có bước thanh toán. Tuy nhiên, dự án thuộc phạm vi MVP phục vụ học tập, kiểm thử và trình diễn, không yêu cầu phát sinh giao dịch tài chính thật.

## 2. Quyết định

Nhóm xây dựng **Mock Payment Service** trong Backend NestJS, được tổ chức thông qua `PaymentsModule`.

Dịch vụ mô phỏng kết quả thanh toán bằng ví điện tử hoặc thẻ ngân hàng giả lập và hỗ trợ ba trạng thái:

- `SUCCESS`: thanh toán thành công; đơn hàng được cập nhật `PAID`.
- `FAILED`: thanh toán thất bại; đơn hàng được cập nhật `PAYMENT_FAILED` theo quy tắc nghiệp vụ.
- `PENDING`: giao dịch đang chờ xử lý; chưa xác nhận đơn hàng đã thanh toán.

Kết quả giao dịch được lưu trong PostgreSQL và liên kết với đơn hàng tương ứng.

## 3. Các phương án thay thế

- Tích hợp Sandbox của nhà cung cấp thanh toán.
- Tích hợp trực tiếp cổng thanh toán thật.

## 4. Lý do lựa chọn

- Không phát sinh giao dịch tài chính thật.
- Không cần lưu thông tin thẻ hoặc tài khoản ngân hàng.
- Chủ động mô phỏng các nhánh thành công, thất bại và đang xử lý.
- Không phụ thuộc vào tài khoản hoặc dịch vụ của nhà cung cấp bên ngoài.
- Phù hợp với phạm vi MVP và mục tiêu trình diễn.

## 5. Hệ quả và Trade-off

**Ưu điểm**
- Dễ kiểm thử các tình huống thanh toán.
- Chủ động điều khiển kết quả mô phỏng.
- Giảm rủi ro liên quan đến giao dịch tài chính thật.
- Không cần tích hợp nhà cung cấp thanh toán trong MVP.

**Hạn chế**
- Không kiểm chứng được quy trình tích hợp thanh toán thực tế.
- Không mô phỏng đầy đủ các cơ chế xác thực và đối soát của nhà cung cấp.
- Cần quy định rõ cách xử lý trạng thái `PENDING`.

**Trade-off:** Nhóm chấp nhận tính thực tế của thanh toán bị giới hạn để đổi lấy khả năng kiểm thử chủ động, an toàn và phù hợp phạm vi đồ án.

## 6. Nguyên tắc xử lý

- Backend tự tính hoặc đối chiếu số tiền từ dữ liệu đơn hàng, không tin cậy tổng tiền do Frontend tự gửi.
- Kiểm tra quyền sở hữu đơn hàng trước khi thanh toán.
- Sử dụng khóa idempotency để hạn chế tạo giao dịch trùng khi client gửi lại yêu cầu.
- Không ghi nhận `PENDING` là thanh toán thành công.
- Không lưu dữ liệu thẻ hoặc thông tin tài chính nhạy cảm.
- Việc lưu kết quả thanh toán và cập nhật đơn hàng phải bảo đảm tính nhất quán dữ liệu.
