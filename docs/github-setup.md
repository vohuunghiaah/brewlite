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

## Thao tác ban đầu (03/11/2026)

1. Review [PR #6](https://github.com/vohuunghiaah/brewlite/pull/6); chỉ merge sau khi đạt DoD.
2. Sau nghiệm thu, cập nhật BL-00/Issue #1 sang Done và cập nhật liên kết tài liệu trong Issues sang main hoặc permalink commit.
3. Xác nhận phạm vi nghiệp vụ và đề xuất BL-01–BL-04 trước khi đưa vào Todo.

## Cập nhật hiện trạng ngày 18/11/2026

1. **PR #6 & PR #25:** PR #6 (`chore: thiết lập repository`) đã merged tại commit `e744a143`. PR #25 (`docs(task4.1): finalize repository setup`) đã merged tại commit `5784317c`, hoàn tất phê duyệt kỹ thuật Task 4.1.
2. **Branch Protection:** Nhánh `main` được bảo vệ: `enforce_admins=true`, cấm force push, cấm xóa nhánh, yêu cầu giải quyết hội thoại.
3. **CI Quality Gates & Required Status Checks (Task 4.4):**
   - Đã cấu hình kích hoạt pipeline `.github/workflows/quality.yml` (Install -> Lint -> Unit Test -> Build cho cả `api` và `web`).
   - Đã kích hoạt **Required Status Checks** bắt buộc trên nhánh `main`: `strict=true`, yêu cầu cả hai jobs `api lint, test, build` và `web lint, test, build` (`app_id: 15368` - GitHub Actions) phải thành công mới cho phép merge.
   - Cơ chế chặn bypass: `enforce_admins=true`, cấm force push, cấm xóa nhánh, yêu cầu giải quyết hội thoại.
   - Đã kiểm chứng qua thử nghiệm âm có kiểm soát: PR bị chuyển trạng thái `mergeable_state: blocked` khi có bài test lỗi.
   - Báo cáo chi tiết tại [docs/task-4.4-ci-verification.md](task-4.4-ci-verification.md).
4. **Trạng thái Issue #1 ([BL-00]):** Toàn bộ tiêu chí kỹ thuật đã hoàn thành. Hiện đang ở trạng thái **BLOCKED — PENDING REVIEW** trên GitHub Project #2.
5. **Thao tác bàn giao cho chủ repository:**
   - Thực hiện review chính thức Issue #1 / Task 4.1 theo biên bản nghiệm thu.
   - Sau khi phê duyệt, chuyển trạng thái Issue #1 sang `Done` trên Project #2 và đóng Issue #1.
