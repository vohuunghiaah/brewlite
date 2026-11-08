# ADR 005: DỊCH VỤ THANH TOÁN MÔ PHỎNG VÀ XỬ LÝ IDEMPOTENCY

## Bối cảnh (Context)
BrewLite là hệ thống đặt cà phê không dùng tiền mặt (Cashless). Trong phạm vi bài tập, nhóm không kết nối trực tiếp tới cổng thanh toán thực tế nhằm tránh phát sinh chi phí hoặc rủi ro tài chính. Tuy nhiên, luồng nghiệp vụ thanh toán phải mô phỏng đầy đủ các tình huống: thành công (`SUCCESS`), thất bại (`FAILED`), và đang xử lý (`PENDING`), đồng thời phải chống lại nguy cơ trừ tiền lặp khi người dùng bấm nút nhiều lần hoặc kết nối mạng bị gián đoạn (Network Retry).

## Quyết định (Decision)
1. **Mock Payment Service:**
   - Hỗ trợ hai phương thức thanh toán: Ví điện tử (`E_WALLET`) và Thẻ ngân hàng (`BANK_CARD`).
   - Cung cấp cơ chế mô phỏng kết quả thông qua cờ kiểm thử hoặc mã đơn hàng (mặc định xử lý thành công; nếu `mockOutcome === 'FAIL'` thì trả về thất bại).
2. **Xử lý Idempotency:**
   - Endpoint `POST /api/payments` bắt buộc truyền HTTP Header `Idempotency-Key` (chuỗi định danh UUID-v4 do client khởi tạo trước khi thanh toán).
   - Bảng `Payment` trong database đặt ràng buộc `UNIQUE` trên cột `idempotencyKey`.
   - Khi nhận yêu cầu:
     - Nếu `idempotencyKey` đã tồn tại trong cơ sở dữ liệu: hệ thống lập tức trả về kết quả giao dịch thanh toán đã lưu trước đó mà không thực hiện trừ tiền hoặc cập nhật đơn hàng lần 2.
     - Nếu `idempotencyKey` mới: hệ thống tạo bản ghi thanh toán, gọi Mock Payment, cập nhật trạng thái đơn hàng sang `PAID` và lưu kết quả giao dịch trong một transaction duy nhất.

## Hệ quả (Consequences)
- **Tích cực:** Ngăn ngừa hoàn toàn lỗi thanh toán trùng lặp (Double Spending / Duplicate Charges); đáp ứng hoàn hảo tiêu chí kiểm thử tự động của bài tập mà không tốn chi phí.
- **Tiêu cực:** Client chịu trách nhiệm sinh và quản lý UUID `Idempotency-Key` trước mỗi lượt thanh toán.
