# ADR 001: CẤU TRÚC MONOREPO VỚI NPM WORKSPACES

## Bối cảnh (Context)
Dự án BrewLite bao gồm hai ứng dụng chính: Frontend (`apps/web` xây dựng bằng Next.js) và Backend API (`apps/api` xây dựng bằng NestJS), cùng hệ thống tài liệu kỹ thuật tập trung (`docs/`). Cần một giải pháp quản lý mã nguồn giúp đồng bộ phiên bản, chia sẻ cấu hình, đơn giản hóa quy trình CI/CD và nhất quán quy chuẩn Git.

## Quyết định (Decision)
Lựa chọn cấu trúc **Monorepo** với cơ chế tiêu chuẩn **npm workspaces**:
- Thư mục gốc quản lý các workspaces `apps/web` và `apps/api`.
- Các script cấp root điều phối việc cài đặt dependencies, chạy lint, unit test và build đồng thời cho toàn bộ hệ sinh thái.
- Lưu trữ toàn bộ tài liệu kỹ thuật, sơ đồ hệ thống và báo cáo kiểm thử tại thư mục `docs/`.

## Hệ quả (Consequences)
- **Tích cực:** Một lệnh cài đặt duy nhất (`npm install`) tại root; các pipeline CI/CD kiểm tra đồng bộ cả frontend và backend trên mỗi Pull Request; tránh việc phân mảnh nhiều repository riêng lẻ.
- **Tiêu cực:** Kích thước repository lớn hơn so với từng repo riêng biệt; cần cấu hình bộ lọc đường dẫn (path filter) cẩn thận khi xây dựng container image độc lập.
