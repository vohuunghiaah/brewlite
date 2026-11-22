# Kiểm tra secrets cho PR #44

**Scanner:** Gitleaks 8.24.3, bộ rule mặc định. Workflow kiểm SHA-256 của archive Linux trước khi chạy. [Quality workflow](../../.github/workflows/quality.yml) · [Các check trên HEAD của PR](https://github.com/vohuunghiaah/brewlite/pull/44/checks)

## Phạm vi kiểm tra

1. Checkout có `fetch-depth: 0`; job xác nhận clone đầy đủ. Trên pull request, quét dải base..head. Tiếp đó quét `--all --full-history --diff-merges=first-parent` trên các ref đã fetch, gồm branch, tag hiện có và checkout của CI. Diff với first parent bao gồm nội dung do merge đưa vào. Số commit/ref thay đổi khi repository phát triển. Commit đã mất mọi ref, workspace cá nhân, secrets lưu trên host và file ngoài Git nằm ngoài phép đo.
2. Control tạo một chuỗi tổng hợp ngắn hạn trong thư mục tạm. Workflow yêu cầu đúng exit code phát hiện và rule `github-pat`, đồng thời che giá trị. Quét repository thất bại nếu scanner gặp lỗi hoặc còn finding chưa xử lý.
3. GitHub bảo vệ main bằng hai check bắt buộc API và web, strict và enforce-admins. Trong nghiệm thu #44, cả security và Compose/Chromium/PostgreSQL cũng phải xanh. Thay đổi branch protection thuộc quyền maintainer.

## Đối chiếu ngoại lệ

Cấu hình chỉ kế thừa rule mặc định. Đã bỏ allowlist toàn cục cho mọi UUID và các chuỗi fixture. Ngoại lệ trong [.gitleaksignore](../../.gitleaksignore) khóa theo commit, file, rule và dòng. Hai fingerprint từ PR #45 được giữ nguyên.

Trên clone các nhánh remote tại thời điểm kiểm tra, chạy bộ rule mặc định với hai fingerprint #45, gồm cả merge diff, còn 21 kết quả: 14 ví dụ HTTP idempotency trong đặc tả và sơ đồ, 6 dòng badge trong README mẫu Nest và 1 dòng trích manifest digest đã xác minh. Khi đưa main vào nhánh #44, merge diff sinh thêm một fingerprint cho cùng dòng digest. Mỗi vị trí đã được đối chiếu với nội dung commit; các file, thư mục hoặc định dạng UUID nói chung vẫn được quét. Scanner không thể chứng minh tuyệt đối mọi chuỗi bí mật đều được nhận diện.

## Bằng chứng

- [Deployment đã đối chiếu digest](https://github.com/vohuunghiaah/brewlite/actions/runs/45049566612) và [audit baseline của #45](../audits/ASM2-FINAL-ACCEPTANCE-REPORT.md).
- Biên bản trên [PR #44](https://github.com/vohuunghiaah/brewlite/pull/44) ghi SHA candidate, run URL, trạng thái từng job và phạm vi snapshot log CI. Log lịch sử được kiểm tra riêng với diff Git.
