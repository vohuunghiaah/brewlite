# Chiến lược nhánh

| Nhánh | Mục đích |
| --- | --- |
| main | Ổn định |
| feature/<ten-tinh-nang> | Tính năng |
| fix/<ten-loi> | Sửa lỗi |
| docs/<ten-tai-lieu> | Tài liệu |
| chore/<ten-cong-viec> | Cấu hình, bảo trì |

Tên chữ thường, ngắn gọn, nối bằng dấu gạch ngang.

## Quy trình bắt buộc

1. Kiểm tra git status, bảo toàn công việc hiện có.
2. Tạo nhánh từ main mới nhất:
   ```sh
   git switch main
   git pull --ff-only origin main
   git switch -c feature/ten-tinh-nang
   ```
3. Thực hiện công việc, kiểm tra, commit theo [quy ước](commit-convention.md).
4. Push: `git push -u origin feature/ten-tinh-nang`.
5. Mở PR vào main, liên kết Issue, điền template và bằng chứng kiểm tra.
6. Review diff, yêu cầu, bí mật và [DoD](definition-of-done.md).
7. Chủ repository/nhóm chỉ merge sau khi đủ điều kiện. Xử lý xung đột trên nhánh công việc rồi kiểm tra lại.

Không force push, reset hard hoặc tạo PR không có khác biệt.

## Khởi tạo Task 4.1

main chưa có commit nên tạo commit nền tảng chỉ chứa README mô tả trạng thái trống. Sau đó tạo chore/setup-repository cho toàn bộ phần thiết lập qua PR. Không tự merge.

Xem [cấu hình GitHub](github-setup.md) cho bảo vệ main và bảng công việc.
