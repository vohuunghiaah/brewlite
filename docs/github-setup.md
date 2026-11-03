# Cấu hình GitHub

Repository: https://github.com/vohuunghiaah/brewlite

## Đã thực hiện ngày 03/11/2026

- Tạo main bằng commit nền tảng, sau đó làm việc trên chore/setup-repository.
- Tạo nhãn Sprint 1 và Sprint 2; Issues #1–#5 liên kết backlog.
- Bảo vệ main qua REST API và đọc lại: yêu cầu PR, áp dụng admin, chặn force push và xóa nhánh, yêu cầu giải quyết hội thoại.
- Approval bắt buộc: 0 vì chưa xác định người review khác; review vẫn là điều kiện DoD. Nhóm nên đặt 1 khi có reviewer phù hợp.
- Chưa yêu cầu status check vì chưa có ứng dụng/CI để tạo check thực tế.

## Project — PASS

[BrewLite — Product Backlog](https://github.com/users/vohuunghiaah/projects/2), Project #2, đã liên kết repository vohuunghiaah/brewlite.

- Dùng GitHub CLI tại C:/Program Files/GitHub CLI/gh.exe; tài khoản vohuunghiaah có scope project. PATH của phiên Codex chưa chứa CLI nên gọi đường dẫn tuyệt đối.
- Trước khi tạo đã đọc toàn bộ Projects (hasNextPage=false): chỉ có một Project trống chưa đặt tên, không liên kết BrewLite. Giữ nguyên bảng đó và tạo đúng một bảng BrewLite; không tạo Issues mới.
- GraphQL đọc lại view Product Backlog có layout BOARD_LAYOUT.
- Status có đúng năm giá trị: Backlog, Todo, In Progress, In Review, Done.
- Có đúng 5 items, mỗi Issue #1–#5 xuất hiện một lần. #1 ở In Review, #2–#5 ở Backlog; Sprint 1 là #1–#3, Sprint 2 là #4–#5 theo labels.
- Lỗi quyền Projects trước đây đã được giải quyết bằng credential GitHub CLI có scope project. Không ghi token vào repository.

## Thao tác chủ repository cần làm

1. Review [PR #6](https://github.com/vohuunghiaah/brewlite/pull/6); chỉ merge sau khi đạt DoD.
2. Sau nghiệm thu, cập nhật BL-00/Issue #1 sang Done và cập nhật liên kết tài liệu trong Issues sang main hoặc permalink commit.
3. Xác nhận phạm vi nghiệp vụ và đề xuất BL-01–BL-04 trước khi đưa vào Todo.

Không tự merge PR hoặc đánh dấu review hoàn tất thay cho nhóm.
