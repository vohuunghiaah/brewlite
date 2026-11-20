# Nghiệm thu tiến độ phục vụ đơn BrewLite

## Quy trình và phạm vi quyền

Thanh toán thành công chuyển đơn từ PENDING sang PAID trong transaction thanh toán. Nhân viên bấm **Bắt đầu pha chế**, **Đánh dấu sẵn sàng** và **Xác nhận đã giao món** tại `/staff/orders` khi việc tương ứng đã diễn ra. Hàng đợi hiển thị các đơn PAID, PREPARING và READY theo thời gian đặt. Đơn hoàn tất rời hàng đợi và nằm trong nhóm Hoàn tất của khách.

| API | Quyền | Hành vi |
|---|---|---|
| GET /orders/staff | STAFF, ADMIN | Trả thông tin cần cho pha chế và giao món |
| PATCH /orders/:id/status | STAFF, ADMIN | Nhận một trường status với giá trị PREPARING, READY hoặc COMPLETED |
| GET /orders/:id, GET /orders/me | Chủ đơn có JWT | Đọc tiến độ và lịch sử cá nhân |

Tiền tố public qua Caddy là `/api`. PATCH lấy khóa hàng PostgreSQL trong transaction, đọc trạng thái đã commit rồi áp dụng state machine. Gửi lại đúng trạng thái hiện tại trả 200 với id và status. Bước sai thứ tự trả 409. Giá trị ngoài luồng hoặc ID sai định dạng trả 400. Thiếu JWT trả 401, khách hàng trả 403 và đơn không tồn tại trả 404. PATCH chỉ ghi cột status của đơn.

Vé đọc ngay khi mở rồi đọc lại sau ba giây kể từ khi lần đọc trước hoàn thành. Mã nhận món giữ nguyên. Badge và timeline dùng trạng thái server. Khi mất mạng, vé hiển thị trạng thái đã biết cùng thông báo thử lại. Đóng vé hủy yêu cầu đang chạy. COMPLETED và CANCELLED kết thúc polling. Ở giao diện khách, Trang chủ, Menu và Lịch sử chia sẻ giỏ hàng và phiên trong cùng lần điều hướng.

## Migration và cấp quyền

Migration `AddUserRole1732233600000` bổ sung cột role có mặc định CUSTOMER, NOT NULL và CHECK giới hạn ba vai trò. Tài khoản cũ và tài khoản đăng ký mới đều là CUSTOMER. Migration giữ nguyên ID, liên kết đơn hàng và thông tin thanh toán. JWT chỉ xác nhận danh tính; API đọc role hiện hành từ PostgreSQL ở mỗi yêu cầu. Form đăng ký từ chối trường role.

Khi có lịch phát hành được phê duyệt, sao lưu và xác minh khả năng phục hồi, áp dụng migration trước khi chạy API mới. PostgreSQL cần khóa bảng users khi thực hiện ALTER TABLE, nên kiểm tra giao dịch dài trước khi triển khai. Nếu phải quay lại ứng dụng cũ, giữ nguyên cột bổ sung với giá trị mặc định.

Quản trị viên cơ sở dữ liệu cấp STAFF cho **tài khoản đã xác minh** trong phiên psql đặc quyền. Truyền ID và email đã đối chiếu bằng biến psql `staff_id` và `staff_email`. Câu lệnh sau chỉ nâng một CUSTOMER khớp cả hai giá trị; kiểm tra kết quả RETURNING trước khi xác nhận transaction.

```sql
BEGIN;
UPDATE users SET role = 'STAFF'
WHERE id = :'staff_id'::integer AND email = :'staff_email' AND role = 'CUSTOMER'
RETURNING id, email, role;
```

Chạy `COMMIT` khi đúng tài khoản, hoặc `ROLLBACK` để hủy. Ghi nhận người phê duyệt và ID được cấp quyền. Để thu hồi, dùng cùng điều kiện định danh và chuyển từ STAFF về CUSTOMER. Không có endpoint công khai cấp role. Người dùng có phiên cũ có thể vào trực tiếp `/staff/orders`; đăng nhập lại để làm mới liên kết quầy trên thanh điều hướng.

## Bằng chứng cần kiểm tra trên PR

- **FR-07 / FR-12.** E2E tạo đơn và thanh toán mô phỏng trên PostgreSQL cô lập, dùng hai tài khoản STAFF cập nhật đồng thời và ADMIN xác nhận hoàn tất. Từng bước được đối chiếu với SQL, GET của khách và vé. Bộ kiểm thử so sánh số tiền, payment, tồn kho và version trước/sau chuỗi cập nhật.
- **FR-11.** Chromium xác minh nhóm lịch sử Hoàn tất. Component test kiểm tra chỉ có một GET đang chạy, bỏ phản hồi đến sau khi đóng và dừng ở hai trạng thái cuối.
- **Điều hướng.** E2E kiểm tra vị trí trung tâm và tràn ngang tại 320, 375, 768, 1024 và 1440 px, chuyển qua Trang chủ rồi trở lại Menu khi đã có giỏ.
- **Migration.** Integration test PostgreSQL áp dụng migration lên bảng tạm có tài khoản và đơn đã liên kết. Kiểm tra role mặc định, dữ liệu cũ và ràng buộc từ chối role sai.

Các job trên PR là `api lint, test, build`, `web lint, test, build` và `Compose, Chromium and PostgreSQL`. Cấp quyền trên Lightsail và triển khai là các bước vận hành sau phê duyệt.
