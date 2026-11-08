# ADR 003: KIỂM SOÁT TỒN KHO ĐỒNG THỜI BẰNG KHÓA LẠC QUAN (OPTIMISTIC CONCURRENCY CONTROL)

## Bối cảnh (Context)
Vào các khung giờ cao điểm (sáng 7:30 - 9:00, trưa 11:30 - 13:30), nhiều khách hàng có thể cùng lúc đặt món đối với những món có số lượng tồn kho giới hạn (ví dụ: món đặc biệt chỉ còn 2 ly). Nếu không có cơ chế kiểm soát đồng thời, hiện tượng Race Condition sẽ dẫn đến việc bán vượt tồn kho (Overselling / Stock âm).

## Quyết định (Decision)
Áp dụng **Optimistic Concurrency Control (OCC)** kết hợp với Database Transactions:
1. Mỗi bản ghi `Product` được bổ sung cột `version` kiểu số nguyên, khởi tạo bằng `1`.
2. Khi trừ tồn kho, câu lệnh SQL UPDATE được ràng buộc có điều kiện theo phiên bản đọc được:
   ```sql
   UPDATE "Product"
   SET stock = stock - :requestedQty, version = version + 1
   WHERE id = :productId AND stock >= :requestedQty AND version = :currentVersion;
   ```
3. Nếu số dòng bị ảnh hưởng (`count`) bằng `0`, hệ thống phát hiện xung đột dữ liệu hoặc hết hàng, lập tức rollback transaction và ném ngoại lệ `ConflictException` ("Sản phẩm vừa được mua bởi khách hàng khác, vui lòng thử lại").

## Hệ quả (Consequences)
- **Tích cực:** Không khóa cứng dòng dữ liệu (Pessimistic Lock), duy trì thông lượng cao và thời gian phản hồi thấp cho phần lớn trường hợp không có tranh chấp; ngăn chặn 100% tình trạng âm kho.
- **Tiêu cực:** Yêu cầu client hoặc người dùng thử lại nếu xảy ra xung đột đồng thời cao.
