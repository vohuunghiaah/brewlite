# Chạy nghiệm thu Task 5.2 trên Windows

Dùng Node.js 24, npm và Docker Desktop chạy Linux containers với Docker Compose 2.24.4 trở lên (hỗ trợ `!reset`). Từ một clone sạch, mở PowerShell tại thư mục chứa `docker-compose.yml`. Bản kiểm thử tự tạo cấu hình tạm với khóa JWT và mật khẩu ngẫu nhiên. Các cổng mặc định cho *lượt kiểm thử* là Web 15300, API 15301 và PostgreSQL 15432. Có thể đổi bằng `TEST_WEB_PORT`, `TEST_API_PORT` và `TEST_DB_PORT`.

```powershell
npm.cmd ci --prefix scripts
node scripts/node_modules/playwright/cli.js install chromium --only-shell
node scripts/test-compose.mjs --quality 2>&1 | Tee-Object -FilePath task52.log
if ($LASTEXITCODE -ne 0) { throw 'Task 5.2 failed' }
```

Runner in tên Compose project ở đầu log. Nó tạo một volume mới, kiểm tra `current_database()` và xác nhận public schema có 0 bảng. Hai lượt `npm run db:migrate` và `npm run db:seed` chạy qua container API trước khi khởi động Nest. Runner điều chỉnh một lượng tồn của catalog thử giữa hai lượt rồi đối chiếu ID, giá, tồn và version.

`--quality` chạy lint, Jest API (bao gồm PostgreSQL trên DB riêng `brewlite_jest_test`), build API, ESLint, Node Test Runner, Jest component và build Web. Chạy `node scripts/test-compose.mjs` để chỉ chạy phần nghiệm thu tích hợp. Cả hai lệnh đều đợi ba dịch vụ healthy, chạy kiểm tra môi trường, E2E Chromium và HTTP/SQL, dừng riêng DB kiểm thử để xác minh 503, rồi bật DB và kiểm tra 200. Cuối lượt, runner dọn container và volume của project ngẫu nhiên vừa tạo.

Ảnh từng bước nằm trong `test-results/<project>/`. Tìm bước đầu tiên báo lỗi trong `task52.log`. Trong lúc runner hoạt động, xem trạng thái và log bằng tên project đã in ra.

```powershell
docker ps --filter "label=com.docker.compose.project=<project>"
docker logs <project>-api --tail 100
docker logs <project>-web --tail 100
Invoke-RestMethod http://localhost:15301/health
```

## Khởi động local để thao tác thủ công

Dùng một clone mới và Compose project mới khi muốn bắt đầu từ volume trống. Sao chép `.env.example` thành `.env`, điền `JWT_SECRET` ngẫu nhiên ít nhất 32 byte, mật khẩu PostgreSQL cục bộ và dùng cổng trống. Khi dùng cổng mặc định, Web ở 3000, API ở 3001 và PostgreSQL ở 5432.

```powershell
docker compose up -d --wait db
docker compose build api web
docker compose run --rm --no-deps api npm run db:migrate
docker compose run --rm --no-deps api npm run db:seed
docker compose up -d --wait
Invoke-RestMethod http://localhost:3001/health
Invoke-RestMethod http://localhost:3001/products
docker compose ps
docker compose down
```

API cũng chạy pending migrations khi khởi động. Seed mẫu chạy tự động trong development/test và giữ nguyên giá, tồn, phiên bản của sản phẩm đã có. Bốn sản phẩm dùng tên làm khóa dò. Việc phân loại món nằm ở frontend, không cần seed bảng danh mục. Để xem lịch sử migration trong DB local, chạy `docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "TABLE migrations"'`.

Trong GitHub Actions, hai job quality chạy lint/test/build. Job Compose chạy cùng runner nghiệm thu và lưu log cùng ảnh qua **Artifacts → task-5-2-acceptance**.
