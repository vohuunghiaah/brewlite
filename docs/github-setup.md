# Cấu hình GitHub

Repository: https://github.com/vohuunghiaah/brewlite

## Đã thực hiện ngày 03/11/2026

- Tạo main bằng commit nền tảng, sau đó làm việc trên chore/setup-repository.
- Tạo nhãn Sprint 1 và Sprint 2; Issues #1–#5 liên kết backlog.
- Bảo vệ main qua REST API và đọc lại: yêu cầu PR, áp dụng admin, chặn force push và xóa nhánh, yêu cầu giải quyết hội thoại.
- Approval bắt buộc: 0 vì chưa xác định người review khác; review vẫn là điều kiện DoD. Nhóm nên đặt 1 khi có reviewer phù hợp.
- Chưa yêu cầu status check vì chưa có ứng dụng/CI để tạo check thực tế.

## Project — BLOCKED

Connector GitHub không cung cấp công cụ Projects. GitHub CLI không có trong PATH. API GraphQL trả INSUFFICIENT_SCOPES: credential hiện có repo/gist/workflow nhưng thiếu read:project (đọc) và project (ghi). Chưa tạo Project, chưa cấu hình trạng thái hoặc liên kết Issues vào bảng. Không thay đổi quyền tài khoản tự động.

## Thao tác chủ repository cần làm

1. Mở GitHub Projects của tài khoản vohuunghiaah; kiểm tra bảng có sẵn để tránh trùng.
2. Tạo hoặc dùng Project tên BrewLite, chọn Board và liên kết repository brewlite.
3. Đặt trường Status gồm Backlog, Todo, In Progress, In Review, Done; nhóm Board theo Status.
4. Add item → chọn Issues #1–#5 của repository.
5. Đặt #1 In Progress khi Project/review còn thiếu; #2–#5 Backlog cho tới khi nhóm xác nhận. Chuyển #1 In Review khi sẵn sàng nghiệm thu.
6. Lưu URL Project vào tài liệu này; xác minh đủ năm Issues và năm trạng thái.
7. Review PR thiết lập; chỉ merge khi đạt DoD. Sau đó cập nhật BL-00/Issue #1 và chuyển Done khi mọi điều kiện hoàn tất.

Nếu muốn cấu hình qua API, cấp quyền Projects phù hợp trong công cụ quản lý credential của GitHub rồi chạy lại các thao tác đọc/tạo sau kiểm tra trùng. Không dán token vào chat hoặc repository.
