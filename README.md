# BrewLite · Assignment 2

Ứng dụng đặt đồ uống dùng Next.js, NestJS và PostgreSQL 16. Khách xem menu, chọn size/topping và quản lý giỏ hàng. Tạo đơn và thanh toán yêu cầu đăng nhập. Nghiệm thu ASM2 hiện ở mức **PARTIAL**. [Báo cáo Task 1–5](docs/audits/ASM2-FINAL-ACCEPTANCE-REPORT.md) · [GAP và quyết định C1–C4](docs/audits/asm2-gap-register.md)

## Chạy LOCAL và Postman

Cài Git, Docker Desktop (Linux containers) và Node.js 24. Clone repository, mở PowerShell tại thư mục gốc rồi làm theo [hướng dẫn tạo .env, sinh JWT_SECRET và catalog key](docs/testing/postman-local-guide.md). Trong checkout đã cấu hình:

```powershell
docker compose up -d --build --wait
docker compose ps
curl.exe -fsS http://localhost:3001/health
```

Project `brewlite-local` chạy web tại [localhost:3000/menu](http://localhost:3000/menu), API tại [localhost:3001](http://localhost:3001/health) và PostgreSQL trên loopback 5432. Nest sử dụng đường dẫn gốc. Volume `brewlite-local_postgres_data` lưu database. Để dừng và giữ dữ liệu, dùng `docker compose stop`. API development chạy migrations và seed khi khởi động. Kiểm tra log bằng `docker compose logs --tail 60 api web db`.

Import [Collection](postman/BrewLite-ASM2-Local.postman_collection.json) và [Environment](postman/BrewLite-Local.postman_environment.json). Chọn **BrewLite LOCAL**, đặt `catalogKey` bằng giá trị local trong `.env`, chạy toàn bộ collection theo thứ tự. Runner kiểm tra cả trường hợp từ chối, retry và replay. Mỗi lượt thành công tiêu thụ một đơn vị tồn kho trong DB local.

## Phạm vi đã triển khai

- TX1 tạo order có ID số ở trạng thái PENDING. Thanh toán mô phỏng thành công mới ghi PAID, cấp mã nhận món và trừ kho bằng OCC. Thanh toán đang đối soát giữ khóa idempotency; UI hiển thị đúng kết quả hoàn tiền khi replay.
- Vé xác nhận mở trong trang menu. Lịch sử dùng `#orders` hoặc `#history` và API kiểm tra quyền sở hữu.
- Thao tác nhân viên pha chế, khuyến mãi và sổ điểm Loyalty thuộc phạm vi hoãn. Quy tắc Loyalty được PO duyệt ngày 23/11/2026 là 1 điểm cho mỗi 10.000 VNĐ thực thanh toán trên một đơn PAID, làm tròn xuống. Ví dụ, đơn 48.000 VNĐ được 4 điểm. [Quyết định GAP-03](docs/audits/asm2-gap-register.md)

## Kiểm thử và build

Từ thư mục gốc, chạy bộ kiểm tra trên database tạm cô lập:

```powershell
npm.cmd ci --prefix scripts
node scripts/node_modules/playwright/cli.js install chromium --only-shell
node scripts/test-compose.mjs --quality
```

Bộ này chạy lint, test, build hai ứng dụng và kiểm tra hành trình người dùng bằng Chromium/PostgreSQL. CI còn chạy kiểm tra đồng bộ catalog và rollback. Để build riêng, chạy `npm ci` rồi `npm run build` trong `apps/api` hoặc `apps/web`. [Hướng dẫn kiểm thử](docs/testing/task-5-2.md) · [Security scanning](docs/security/final-secrets-audit.md)

## Production và bàn giao

Lightsail dùng Caddy và `docker-compose.prod.yml`. Caddy chuyển `/api/*` đến NestJS; PostgreSQL dùng mạng nội bộ. [Menu production](https://brewlite-swe.duckdns.org/menu) · [Products](https://brewlite-swe.duckdns.org/api/products) · [Health](https://brewlite-swe.duckdns.org/api/health)

Quy trình phát hành dùng GitHub Actions, GHCR, bước duyệt production, backup, migration và smoke. Tra cứu thao tác deploy, backup và rollback trong [runbook release](docs/deployment/production-release-runbook.md) và [runbook rollback](docs/deployment/rollback-guide.md).

[Release notes dự kiến v1.0.0](docs/releases/v1.0.0.md) · [Biên bản bàn giao độc lập](docs/handover/clean-clone-acceptance.md) · [Sprint Review và Retrospective](docs/handover/sprint-review-retrospective.md) · [RTM](docs/traceability-matrix.md) · [Chỉ mục tài liệu](docs/README.md)
