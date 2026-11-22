# Chạy BrewLite LOCAL bằng Postman trên Windows

1. Mở Docker Desktop ở chế độ Linux containers. Trong PowerShell tại thư mục repo, chạy `docker info`. Ở lần đầu, tạo file cấu hình riêng cho checkout mới:

   ```powershell
   if (Test-Path .env) { throw 'Đã có .env. Giữ cấu hình hiện tại.' }
   $jwt = node -p "require('crypto').randomBytes(48).toString('hex')"
   $catalog = node -p "require('crypto').randomBytes(32).toString('hex')"
   (Get-Content .env.example) -replace '^JWT_SECRET=$', "JWT_SECRET=$jwt" -replace '^CATALOG_ADMIN_KEY=$', "CATALOG_ADMIN_KEY=$catalog" | Set-Content .env
   docker compose up -d --build --wait
   docker compose ps
   ```

2. Trên checkout đã có `.env`, chỉ chạy hai lệnh Docker cuối. Cả ba service phải healthy. Mở http://localhost:3000/menu. Gọi GET http://localhost:3001/health và GET http://localhost:3001/products. Health cần trả `{"status":"ok","database":"up"}`. Nest dùng đường dẫn gốc. Prefix `/api` do Caddy xử lý trên Lightsail.
3. Trong Postman Desktop chọn **Import**, chọn cả [collection](../../postman/BrewLite-ASM2-Local.postman_collection.json) và [environment](../../postman/BrewLite-Local.postman_environment.json). Chọn **BrewLite LOCAL** ở góc phải. Điền giá trị local của `catalogKey` từ `CATALOG_ADMIN_KEY` trong `.env`. Giữ giá trị này riêng trên máy.
4. Trong Collection Runner chọn toàn bộ thư mục theo thứ tự mặc định, một iteration. Để thực hiện thủ công, cũng gửi request theo thứ tự. Health và Products chọn sản phẩm có hàng và hết hàng. Register tạo email riêng, Login lưu JWT. Orders kiểm tra giỏ rỗng rồi tạo PENDING. Payments thử từ chối, dùng khóa UUID v4 mới để thử lại, sau đó gửi lại cùng khóa và payload. Runner kiểm tra PAID, mã nhận món, số attempt và tồn kho. History kiểm tra chủ sở hữu thứ hai nhận 403. Cuối cùng runner tạo, cập nhật và xóa đúng sản phẩm thử riêng.
5. Xem tab **Test Results** cho từng request. 400/401/403/404/409 là kết quả mong đợi ở các request tương ứng. Mỗi lượt thành công tạo hai tài khoản, một đơn và tiêu thụ một đơn vị hàng. Các đơn thử vẫn tồn tại sau restart. Không chạy song song hai runner khi đo tồn kho. Kiểm thử tranh chấp độc lập dùng `node scripts/test-compose.mjs --quality` sau `npm ci --prefix scripts` và cài Chromium theo README.
6. Dùng `docker compose logs --tail 60 api web db` và `docker compose restart` để chẩn đoán. `docker compose stop` dừng an toàn. `docker compose up -d --wait` chạy lại. Migrations và seed chạy lúc API khởi động ở development. Có thể chạy lại bằng `docker compose exec api npm run db:migrate` và `docker compose exec api npm run db:seed`. Seed bổ sung sản phẩm thiếu và giữ số lượng hiện có.

| Triệu chứng | Kiểm tra |
|---|---|
| Docker daemon unavailable | Mở Docker Desktop, đợi Engine ready, kiểm tra docker context và docker info. |
| Connection refused | Kiểm tra trạng thái service và URL localhost:3001. Port 3000 phục vụ web. |
| Port đã dùng | Xác định ứng dụng giữ port. Có thể đổi POSTGRES_PORT trong .env. Collection chạy trên API 3001. |
| JWT 401 | Chọn đúng environment và chạy lại Register/Login. JWT cũ mất hiệu lực khi đổi secret. |
| 404 ở /api/health | Dùng /health ở local. |
| Health 503, bảng hoặc catalog thiếu | Kiểm tra db healthy, credentials local và log migration. Chạy migration rồi seed. |
| Chỉ trình duyệt báo CORS | So sánh FRONTEND_URL với origin thực của web. Postman Desktop không thực thi chính sách CORS của trình duyệt. |
| Bước catalog trả 401/403 | Đặt cùng một khóa local trong .env và Postman, rồi chạy docker compose up -d để API nhận cấu hình. |

Production dùng GitHub Actions, GHCR, `docker-compose.prod.yml` và Caddy. Các đường dẫn backup, smoke và rollback nằm trong [runbook](../deployment/production-release-runbook.md) và [hướng dẫn rollback](../deployment/rollback-guide.md).
