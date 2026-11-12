# TASK 1.3 — ĐẶC TẢ USE-CASE TRỌNG TÂM

**Dự án:** BrewLite — Assignment 2  
**MVP do nhóm lựa chọn:** Đặt đồ uống  
**Use-case trọng tâm:** UC-01 — Đặt đồ uống (Tạo đơn)  
**Biểu diễn:** Sơ đồ Use-case UML trắng đen.  

## 1. Phạm vi

**Trong phạm vi UC-01:** Xem danh sách đồ uống, chọn sản phẩm, chọn size/topping khi phù hợp, quản lý giỏ, kiểm tra dữ liệu và tình trạng bán, xác nhận tạo đơn, tạo và lưu đơn hàng, phản hồi mã đơn.

**Ngoài phạm vi UC-01:** Thanh toán trực tuyến/mô phỏng, nhân viên tiếp nhận và pha chế, cập nhật trạng thái pha chế, theo dõi lịch sử đơn, quản trị menu, báo cáo doanh thu. Các chức năng này có thể thuộc hệ thống BrewLite tổng thể nhưng không được đặt làm điều kiện hoàn thành của UC-01.

**Lưu ý về sơ đồ tổng quát đã cung cấp:** Bản gốc nối đặt đồ uống với thanh toán. Để mô hình hóa UC-01 độc lập theo lựa chọn của nhóm, không dùng thanh toán làm một bước bắt buộc trong UC-01. Nếu SRS của Task 1.2 quy định khác, nhóm phải cập nhật lại ranh giới UC-01 và sơ đồ tổng quát cho nhất quán.

## 2. Tác nhân, kích hoạt, tiền điều kiện và hậu điều kiện

| Thuộc tính | Mô tả |
|---|---|
| Mã | UC-01 |
| Tên | Đặt đồ uống (Tạo đơn) |
| Actor chính | Khách hàng |
| Actor phụ | Không có actor ngoài hệ thống bắt buộc để tạo đơn |
| Trigger | Khách hàng lựa chọn Đặt hàng/Xác nhận đơn từ giỏ hàng |
| Tiền điều kiện | Menu có dữ liệu; giỏ có ít nhất một đồ uống; hệ thống có thể ghi đơn; sản phẩm và tùy chọn sẽ được kiểm tra lại trước khi lưu. Nếu SRS yêu cầu tài khoản, khách hàng cần đăng nhập hợp lệ khi xác nhận. |
| Hậu điều kiện thành công | Tạo đúng một đơn có mã duy nhất, lưu các dòng hàng, tùy chọn, số lượng, đơn giá và tổng tiền; trả mã đơn và trạng thái ban đầu theo SRS (ví dụ: chờ xử lý/chờ thanh toán). |
| Hậu điều kiện thất bại | Không thông báo đặt thành công nếu đơn chưa được lưu; không tạo đơn trùng; cho phép khách sửa giỏ/thử lại khi phù hợp. |

## 3. Luồng chính

1. Khách hàng mở danh sách đồ uống; hệ thống hiển thị sản phẩm đang được phép bán.
2. Khách hàng chọn một đồ uống.
3. Khách hàng chọn size bắt buộc (nếu sản phẩm có nhiều size) và topping tùy chọn.
4. Khách hàng chọn số lượng và thêm sản phẩm vào giỏ.
5. Hệ thống cập nhật các dòng hàng và tổng tạm tính.
6. Khách hàng có thể tiếp tục chọn thêm sản phẩm, sau đó mở giỏ hàng.
7. Khách hàng kiểm tra giỏ và nhấn Đặt hàng/Xác nhận.
8. Hệ thống kiểm tra tính hợp lệ của giỏ, sản phẩm đang bán, tùy chọn, số lượng và giá ở thời điểm xác nhận.
9. Hệ thống kiểm tra điều kiện xác thực nếu Task 1.2 yêu cầu đăng nhập để tạo đơn.
10. Hệ thống tạo và lưu đơn cùng chi tiết đơn, gán mã duy nhất và trạng thái ban đầu.
11. Hệ thống hiển thị thông báo đặt đồ uống thành công, mã đơn và tổng tiền.

## 4. Luồng thay thế

| Mã | Điều kiện | Cách xử lý |
|---|---|---|
| ALT-01 | Không chọn topping tùy chọn | Cho phép đặt món không có topping. |
| ALT-02 | Chọn nhiều size/topping hoặc thay đổi số lượng | Hệ thống cập nhật cấu hình, kiểm tra hợp lệ và tính lại tổng. |
| ALT-03 | Thêm trùng sản phẩm có cùng size và topping | Hệ thống có thể gộp thành một dòng với số lượng mới theo quy tắc giỏ được định nghĩa trong SRS. |
| ALT-04 | Khách hàng xóa món khỏi giỏ | Cập nhật giỏ và tổng tiền, không tạo đơn khi giỏ trống. |
| ALT-05 | Người dùng chưa đăng nhập trong hệ thống yêu cầu JWT | Yêu cầu đăng nhập trước khi đặt; quay lại xác nhận khi xác thực thành công. |
| ALT-06 | Giá thay đổi trước khi tạo đơn | Hiển thị giá mới và yêu cầu người dùng xác nhận lại trước khi lưu. |

## 5. Luồng ngoại lệ

| Mã | Điều kiện | Kết quả cần bảo đảm |
|---|---|---|
| EX-01 | Giỏ hàng trống | Không tạo đơn, thông báo rõ ràng. |
| EX-02 | Sản phẩm bị ngừng bán hoặc hết hàng | Không cho tạo đơn không hợp lệ; hiển thị sản phẩm cần sửa. |
| EX-03 | Size/topping/số lượng không hợp lệ | Không tạo đơn cho tới khi sửa dữ liệu. |
| EX-04 | Phiên đăng nhập hết hạn (nếu áp dụng) | Không tạo đơn khi không được phép; yêu cầu đăng nhập lại. |
| EX-05 | Kết nối hoặc cơ sở dữ liệu lỗi khi ghi đơn | Không báo thành công giả; dữ liệu không được ở trạng thái ghi dở. |
| EX-06 | Gửi lặp thao tác xác nhận do nhấp nhiều lần hoặc thử lại | Không tạo nhiều đơn cho cùng một yêu cầu có mã chống trùng. |

