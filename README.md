# BrewLite

BrewLite đang được thiết lập repository theo Task 4.1. Mục tiêu đã xác minh là tổ chức mã nguồn, tài liệu và quy trình cộng tác. Chưa có tài liệu nghiệp vụ sản phẩm.

## Công nghệ và hiện trạng

Kiểm tra ngày 03/11/2026: local chỉ có .git, remote không có ref. Không có package.json, lockfile, cấu hình framework hay mã nguồn. Chưa xác nhận frontend, backend, database hoặc công cụ triển khai. apps/web và apps/api hiện chỉ chứa .gitkeep, không phải ứng dụng.

## Cấu trúc

```text
.github/
  ISSUE_TEMPLATE/{task,bug_report}.md
  pull_request_template.md
apps/
  web/.gitkeep
  api/.gitkeep
docs/
  architecture/README.md
  backlog/{product-backlog,sprint-1,sprint-2}.md
  branching-strategy.md
  commit-convention.md
  definition-of-done.md
  github-setup.md
  task-4.1-verification.md
.env.example
.gitignore
README.md
```

## Điều kiện và cài đặt

Cần Git; cần tài khoản GitHub có quyền phù hợp để push/PR. Chưa có yêu cầu runtime ứng dụng.

```sh
git clone https://github.com/vohuunghiaah/brewlite.git
cd brewlite
git switch main
```

Nếu đã có checkout, làm việc ở thư mục hiện tại, không clone lồng nhau. Trong lúc PR thiết lập chưa merge, checkout nhánh chore/setup-repository để xem đầy đủ tài liệu. Chưa có dependency để cài hoặc lệnh frontend/backend/build/test để chạy.

## Biến môi trường

[.env.example](.env.example) chỉ có chú thích vì chưa có mã nguồn đọc biến môi trường. Hiện chưa cần tạo .env. Khi có ứng dụng, thêm tên biến theo mã nguồn và giá trị mẫu an toàn tại root hoặc từng ứng dụng; cập nhật hướng dẫn. Không chép bí mật từ .env thật.

## Git và Pull Request

Tạo nhánh từ main mới nhất, commit theo Conventional Commits, push và mở PR vào main. Review và hoàn tất DoD trước khi chủ repository/nhóm merge. Không tự merge PR thiết lập.

- [Chiến lược nhánh](docs/branching-strategy.md)
- [Quy ước commit](docs/commit-convention.md)
- [Definition of Done](docs/definition-of-done.md)
- [Product backlog](docs/backlog/product-backlog.md)
- [Sprint 1](docs/backlog/sprint-1.md) · [Sprint 2](docs/backlog/sprint-2.md)
- [Hiện trạng kiến trúc](docs/architecture/README.md)
- [Cấu hình GitHub](docs/github-setup.md)
- [Bằng chứng Task 4.1](docs/task-4.1-verification.md)

Kiểm tra hiện tại: git diff --check, cấu trúc, liên kết và quy tắc ignore. Kiểm thử ứng dụng không áp dụng. Theo yêu cầu chủ repository, không tạo hoặc commit AGENTS.md; tệp này được ignore để chỉ dùng local nếu cần.
