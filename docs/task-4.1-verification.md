# Bằng chứng Task 4.1

Ngày kiểm tra: 03/11/2026 (Asia/Saigon).

## Ban đầu

- Root: C:/dev/brewlite; chỉ có .git, không có file untracked hoặc mã nguồn.
- git status: main, no commits yet, nothing to commit.
- origin fetch/push: https://github.com/vohuunghiaah/brewlite.git.
- git ls-remote origin: thành công, không có ref.
- GitHub API: public, size 0, default_branch main; tìm Issues không có kết quả.
- Không có AGENTS.md tại root hoặc các thư mục cha đã kiểm tra.
- Không xác định được stack do không có manifest/mã nguồn. Không có dữ liệu để di chuyển.

## Thực hiện

- Commit nền tảng: 45e39f8, chỉ README; push main thành công.
- Cấu trúc/tài liệu trên chore/setup-repository; không tự merge PR.
- Không tạo AGENTS.md theo chỉ thị bổ sung của chủ repository; ignore mọi AGENTS.md để dùng local.
- GitHub Issues #1–#5 tạo qua REST sau khi connector trả 403 Resource not accessible by integration.
- Labels Sprint 1/Sprint 2 và bảo vệ main đã tạo, đọc lại thành công.
- Ban đầu Project bị chặn bởi INSUFFICIENT_SCOPES; đã giải quyết sau khi chủ repository cấp scope project cho GitHub CLI. Xem [cấu hình GitHub](github-setup.md).

## Kiểm tra

- PASS: git ls-files có đủ 17 tệp; apps/web/.gitkeep và apps/api/.gitkeep được theo dõi; AGENTS.md không tồn tại.
- PASS: script PowerShell kiểm tra toàn bộ liên kết tương đối Markdown, không có liên kết hỏng.
- PASS: git diff --cached --check không phát hiện lỗi whitespace.
- PASS: git check-ignore --no-index xác nhận .env, .env.local lồng nhau, AGENTS.md ở root/lồng nhau, cache và IDE bị ignore.
- PASS: .env.example ở root/lồng nhau, README, docs và đường dẫn mã nguồn mẫu không bị ignore.
- PASS: quét tất cả tệp tracked theo mẫu private key, GitHub token, AWS access key, API key và phép gán secret; không có kết quả. Đã xem nội dung các tệp mới/thay đổi.

Kiểm thử frontend/backend, build, dependency, import, Docker: N/A vì không có ứng dụng. Không khẳng định đã chạy test ứng dụng. Quét bí mật bằng mẫu chỉ là kiểm tra hỗ trợ; không bảo đảm phát hiện mọi loại bí mật.

## Kiểm tra bổ sung Projects ngày 03/11/2026

- PASS: GitHub CLI đăng nhập vohuunghiaah, có scope project; GraphQL đọc/ghi thành công.
- PASS: kiểm tra toàn bộ danh sách trước khi tạo, không có Project BrewLite; không tạo Issues mới.
- PASS: [Project #2 — BrewLite — Product Backlog](https://github.com/users/vohuunghiaah/projects/2) liên kết vohuunghiaah/brewlite; view Product Backlog trả BOARD_LAYOUT.
- PASS: trường Status trả đúng Backlog, Todo, In Progress, In Review, Done.
- PASS: items.totalCount=5, Issue #1–#5 xuất hiện duy nhất; #1 In Review, #2–#5 Backlog. Labels Sprint 1/Sprint 2 được giữ nguyên.
- PASS: [PR #6](https://github.com/vohuunghiaah/brewlite/pull/6) vào main, OPEN, mergedAt=null; chứa đủ 17 tệp thiết lập. reviews=[] tại thời điểm kiểm tra.

## Chưa hoàn tất

Phần thiết lập kỹ thuật đã hoàn thành; review của nhóm còn chờ. Trạng thái nghiệm thu tổng thể: PARTIAL / In Review, không đánh dấu Done trước review. Không tự merge PR.
