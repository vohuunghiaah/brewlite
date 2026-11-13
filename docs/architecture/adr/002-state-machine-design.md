# ADR 002: THIẾT KẾ MÁY TRẠNG THÁI ĐƠN HÀNG (ORDER STATE MACHINE)

## Bối cảnh (Context)
Đơn hàng trong hệ thống bán cà phê trải qua nhiều giai đoạn nghiệp vụ: từ khởi tạo, thanh toán, pha chế, sẵn sàng giao đến hoàn tất, hoặc thất bại/hủy bỏ. Nếu trạng thái bị nhảy cóc (ví dụ: đơn chưa thanh toán đã nhảy sang pha chế, hoặc đơn đã hoàn thành bị hủy), dữ liệu doanh thu và tồn kho sẽ bị sai lệch nghiêm trọng.

## Quyết định (Decision)
Triển khai một **Finite State Machine (FSM)** tường minh với hàm kiểm soát chuyển trạng thái `assertTransition(currentStatus, targetStatus)`:
1. `PENDING` $\rightarrow$ `PAID` | `PAYMENT_FAILED` | `CANCELLED`
2. `PAYMENT_FAILED` $\rightarrow$ `PAID` (khi khách thử lại thanh toán thành công) | `CANCELLED`
3. `PAID` $\rightarrow$ `PREPARING` | `CANCELLED` (hoàn tiền)
4. `PREPARING` $\rightarrow$ `READY` | `CANCELLED` (hoàn tiền)
5. `READY` $\rightarrow$ `COMPLETED`
6. `COMPLETED` và `CANCELLED` là các trạng thái kết thúc (Terminal states), không cho phép chuyển tiếp sang bất kỳ trạng thái nào khác.

Mọi hành động vi phạm quy tắc chuyển trạng thái đều lập tức ném ngoại lệ `BadRequestException` với thông báo chi tiết.

## Hệ quả (Consequences)
- **Tích cực:** Loại bỏ hoàn toàn các lỗi nghiệp vụ nhảy cóc trạng thái; đảm bảo tính toàn vẹn của dữ liệu đơn hàng; dễ dàng viết unit test kiểm thử ma trận trạng thái.
- **Tiêu cực:** Yêu cầu mọi luồng cập nhật trạng thái đơn phải đi qua hàm kiểm tra tập trung, không được cập nhật trực tiếp trường `status` trong database.

