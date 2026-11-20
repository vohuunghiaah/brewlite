# BrewLite — Sổ Tay Vận Hành & Khắc Phục Sự Cố Phát Hành (Release Runbook)

**Tài liệu:** Production Release & Disaster Recovery Runbook (Task 5.4.1)  
**Mục đích:** Quy trình thao tác chuẩn (Standard Operating Procedures - SOP) cho đội ngũ Kỹ sư Vận hành (SRE / DevOps) và Kỹ sư Hệ thống trong các tình huống phát hành thông thường, xử lý sự cố khẩn cấp và phục hồi thảm họa dữ liệu trên AWS Lightsail.

---

## SOP-01: Quy Trình Phát Hành Bản Nâng Cấp Định Kỳ (Routine Production Release)

Quy trình phát hành bản nâng cấp mã nguồn định kỳ qua GitHub Actions Continuous Delivery.

### Bước 1: Chuẩn bị Nhánh Phát Hành
1. Đảm bảo nhánh `main` đã merge toàn bộ các Pull Request cần phát hành và vượt qua 100% Quality Gates.
2. Kiểm tra log của GitHub Container Registry để đảm bảo image của commit SHA mới nhất đã được build và publish:
   - `ghcr.io/vohuunghiaah/brewlite-api:<commit-sha>`
   - `ghcr.io/vohuunghiaah/brewlite-web:<commit-sha>`

### Bước 2: Kích hoạt Pipeline CD
1. Truy cập tab **Actions** trên repository GitHub: `https://github.com/vohuunghiaah/brewlite/actions/workflows/deploy.yml`
2. Bấm nút **Run workflow**:
   - Nhánh: `main`
   - Target Environment: `production`
   - Chuỗi xác nhận: `DEPLOY_PRODUCTION`
3. Reviewer được chỉ định truy cập mục phê duyệt môi trường `production`, kiểm tra commit SHA và bấm **Approve and deploy**.

### Bước 3: Giám sát và Xác nhận Hoàn tất
1. Theo dõi tiến trình thực thi trực tiếp trên runner. Thời gian thực thi trung bình: 3 - 5 phút.
2. Khi job `Deploy to Production (AWS Lightsail)` hiển thị dấu tích xanh thành công, chạy kiểm thử khói từ máy trạm:
   ```bash
   TARGET_ENV=production TARGET_URL="https://brewlite.54-255-241-1.sslip.io" node scripts/smoke-test.mjs
   ```
3. Nếu mọi bài kiểm tra trả về PASS, ghi nhận vào biên bản bàn giao phát hành.

---

## SOP-02: Khắc Phục Các Sự Cố Triển Khai Phổ Biến (Troubleshooting Common Incidents)

### Sự Cố 1: Lỗi Xác Thực Dấu Vân Tay Host SSH (`Host key verification failed`)
- **Triệu chứng:** Pipeline báo lỗi tại bước kết nối SSH: `Host key verification failed. Fatal: Could not read from remote repository.`
- **Nguyên nhân:** Khóa công khai của máy chủ Lightsail bị thay đổi hoặc secret `LIGHTSAIL_SSH_KNOWN_HOSTS` trên GitHub chưa được cập nhật chính xác.
- **Biện pháp xử lý chuẩn:**
  1. Tuyệt đối **KHÔNG** thêm cờ `-o StrictHostKeyChecking=no`.
  2. Kết nối an toàn vào máy chủ thông qua giao diện Lightsail Browser SSH Console.
  3. Lấy dấu vân tay thực tế của máy chủ:
     ```bash
     ssh-keygen -l -f /etc/ssh/ssh_host_ed25519_key.pub
     ssh-keyscan -H 54.255.241.1
     ```
  4. Cập nhật nội dung này vào secret `LIGHTSAIL_SSH_KNOWN_HOSTS` trong GitHub Environment `production`.
  5. Chạy lại workflow.

### Sự Cố 2: Lỗi Migration Cơ Sở Dữ Liệu (`Database Migration Failed`)
- **Triệu chứng:** Pipeline dừng tại bước `prepare-database.js migrate` với mã lỗi khác 0 và tự động kích hoạt rollback.
- **Nguyên nhân:** Xung đột khóa, trùng lặp tên bảng/cột, hoặc vi phạm dữ liệu hiện hữu trong bảng `public.migrations`.
- **Biện pháp xử lý chuẩn:**
  1. Kiểm tra log chi tiết từ container migration:
     ```bash
     docker compose -f docker-compose.prod.yml logs api
     ```
  2. Kết nối vào PostgreSQL qua container db ở chế độ chỉ đọc để tra cứu bảng migration:
     ```bash
     docker exec -it brewlite-prod-db psql -U brewlite -d brewlite -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 5;"
     ```
  3. Xác định migration gây lỗi. Tuyệt đối **KHÔNG** xóa bảng dữ liệu hay áp dụng các migration destructive (Down Migration).
  4. Nếu migration mới bị lỗi cú pháp, sửa mã nguồn trên một PR mới, tuân thủ nguyên tắc **Forward-Only Migration** và chạy lại quy trình CD.

### Sự Cố 3: Container Khởi Động Thất Bại / Quá Tải Bộ Nhớ (`CrashLoop / OOMKilled`)
- **Triệu chứng:** Container `brewlite-prod-api` hoặc `brewlite-prod-web` liên tục restart (`ExitCode: 137` - Out Of Memory).
- **Nguyên nhân:** Dung lượng bộ nhớ RAM của container vượt quá giới hạn cấu hình trong `docker-compose.prod.yml` (API giới hạn 512MB, Web giới hạn 512MB) hoặc rò rỉ bộ nhớ.
- **Biện pháp xử lý chuẩn:**
  1. Kiểm tra trạng thái OOM trên máy chủ:
     ```bash
     docker inspect brewlite-prod-api --format '{{.State.OOMKilled}}'
     ```
  2. Kích hoạt quay lui khẩn cấp về bản phát hành trước:
     ```bash
     cd /home/ubuntu/app && node scripts/rollback.mjs
     ```
  3. Kiểm tra dung lượng RAM toàn hệ thống: `free -m`. Đảm bảo Swap hoặc RAM còn tối thiểu 500MB khả dụng.

### Sự Cố 4: Lỗi Cấp Chứng Chỉ TLS Caddy (`ACME Let's Encrypt Rate Limit`)
- **Triệu chứng:** Truy cập website báo lỗi `SSL_ERROR_INTERNAL_ERROR_ALERT` hoặc chứng chỉ tự ký không an toàn.
- **Nguyên nhân:** Caddy gửi quá nhiều yêu cầu cấp chứng chỉ tới Let's Encrypt trong thời gian ngắn hoặc tên miền chưa trỏ đúng địa chỉ IP của máy chủ.
- **Biện pháp xử lý chuẩn:**
  1. Kiểm tra log của container Caddy:
     ```bash
     docker logs brewlite-prod-caddy --tail 100
     ```
  2. Xác minh DNS của tên miền có phân giải đúng về IP của máy chủ:
     ```bash
     dig +short brewlite.54-255-241-1.sslip.io
     ```
  3. Nếu bị dính Rate Limit của Let's Encrypt, tạm thời chuyển sang sử dụng ZeroSSL hoặc đợi hết thời gian timeout (thường là 1 giờ).

---

## SOP-03: Quy Trình Phục Hồi Cơ Sở Dữ Liệu Sau Thảm Họa (Disaster Recovery & Restore Runbook)

Quy trình này áp dụng khi cơ sở dữ liệu production bị lỗi nghiêm trọng, mất mát dữ liệu hoặc cần phục hồi về trạng thái của bản sao lưu trước đó.

### Bước 1: Đánh Giá Tình Huống & Tạm Dừng Lưu Lượng Ghi (Freeze Writes)
1. Xác định mức độ ảnh hưởng và tệp sao lưu gần nhất cần khôi phục trong thư mục `/home/ubuntu/app/backups/`.
2. Tạm dừng nhận đơn hàng mới bằng cách ngắt lưu lượng web hoặc đưa website vào chế độ bảo trì:
   ```bash
   cd /home/ubuntu/app
   docker compose -f docker-compose.prod.yml stop web api
   ```

### Bước 2: Kiểm Tra Tính Toàn Vẹn Của Bản Sao Lưu (Integrity Verification)
1. Liệt kê các bản sao lưu hiện có và kiểm tra kích thước tệp:
   ```bash
   ls -la /home/ubuntu/app/backups/
   ```
2. Xác minh header của tệp sao lưu bằng công cụ kiểm tra tự động:
   ```bash
   head -n 10 /home/ubuntu/app/backups/db-backup-2026-11-20T12-56-05-888Z.sql
   tail -n 5 /home/ubuntu/app/backups/db-backup-2026-11-20T12-56-05-888Z.sql
   ```
   *Yêu cầu bắt buộc:* Dòng đầu phải chứa `-- PostgreSQL database dump` và dòng cuối phải chứa `-- PostgreSQL database dump complete`.

### Bước 3: Thực Thi Khôi Phục An Toàn Với `restore-db.mjs`
Sử dụng script phục hồi chính thức được trang bị cơ chế bảo vệ Fail-Closed:
```bash
cd /home/ubuntu/app

# Thực thi khôi phục cơ sở dữ liệu với cờ xác nhận bắt buộc
node scripts/restore-db.mjs \
  --confirm-restore-database \
  --backup-file "/home/ubuntu/app/backups/db-backup-2026-11-20T12-56-05-888Z.sql" \
  --container "brewlite-prod-db" \
  --db "brewlite" \
  --user "brewlite"
```

*Lưu ý bảo mật:* Nếu thiếu cờ `--confirm-restore-database`, script sẽ lập tức dừng thực thi để ngăn chặn việc xóa nhầm dữ liệu đang hoạt động.

### Bước 4: Kiểm Tra Toàn Vẹn Dữ Liệu Sau Phục Hồi
Sau khi script hoàn thành, thực hiện truy vấn đối soát nhanh:
```bash
docker exec -it brewlite-prod-db psql -U brewlite -d brewlite -c "
  SELECT 'products' as table_name, count(*) FROM products
  UNION ALL
  SELECT 'orders', count(*) FROM orders
  UNION ALL
  SELECT 'migrations', count(*) FROM migrations;
"
```
Xác nhận bảng `products` có đủ 4 món cơ bản và bảng `migrations` có đủ 4 bản ghi.

### Bước 5: Khởi Động Lại Hệ Thống & Kiểm Thử Khói
1. Bật lại toàn bộ dịch vụ:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
2. Chạy smoke test:
   ```bash
   TARGET_ENV=production TARGET_URL="https://brewlite.54-255-241-1.sslip.io" node scripts/smoke-test.mjs
   ```
3. Xác nhận hệ thống phục hồi 100% chức năng.

---

## SOP-04: Quy Trình Gắn IP Tĩnh & Chuyển Đổi DNS (Static IP & DNS Transition Runbook)

Quy trình này hướng dẫn chi tiết các bước chuyển đổi từ IPv4 động sang IPv4 tĩnh trên AWS Lightsail để triệt tiêu vĩnh viễn rủi ro mất kết nối khi khởi động lại máy chủ.

### Chi Phí Tham Chiếu AWS Lightsail
- **Static IP gắn vào instance đang chạy:** **0.00 USD / tháng (HOÀN TOÀN MIỄN PHÍ).**
- Static IP tạo nhưng không gắn vào máy chủ nào (sau 1 giờ): 0.005 USD / giờ.

### Các Bước Thực Hiện Chuyển Đổi

#### Bước 1: Tạo và Gắn Static IP trên AWS Lightsail
1. Đăng nhập vào [AWS Lightsail Console](https://lightsail.aws.amazon.com/).
2. Điều hướng tới tab **Networking** -> Chọn **Create static IP**.
3. Chọn vùng (Region): `Singapore (ap-southeast-1)`.
4. Chọn máy chủ cần gắn: `brewlite-production`.
5. Đặt tên nhận diện: `brewlite-prod-static-ip`.
6. Bấm **Create and attach**.
7. Ghi nhận địa chỉ IP mới được cấp (giả định: `54.x.y.z`).

#### Bước 2: Cập Nhật Cấu Hình Tên Miền & Caddy
1. SSH vào máy chủ Lightsail (sử dụng IP mới hoặc thông qua Lightsail Browser Console).
2. Di chuyển vào thư mục ứng dụng:
   ```bash
   cd /home/ubuntu/app
   ```
3. Cập nhật biến `DOMAIN` trong tệp `.env`:
   ```bash
   # Cập nhật cả tên miền chính và tên miền phụ sang IP mới
   node -e '
     import("./scripts/safe-env.mjs").then(({ updateEnv }) => {
       updateEnv(".env", {
         DOMAIN: "brewlite.54-x-y-z.sslip.io, swe-brewlite.54-x-y-z.sslip.io",
         FRONTEND_URL: "https://brewlite.54-x-y-z.sslip.io"
       });
     });
   '
   ```
4. Khởi động lại container Caddy để cấp phát lại chứng chỉ TLS cho IP mới:
   ```bash
   docker compose -f docker-compose.prod.yml restart caddy
   ```

#### Bước 3: Cập Nhật Cấu Hình Trên GitHub Repository
1. Cập nhật GitHub Variables cho Environment `production`:
   ```bash
   gh variable set DOMAIN --env production --body "brewlite.54-x-y-z.sslip.io, swe-brewlite.54-x-y-z.sslip.io"
   ```
2. Cập nhật GitHub Secrets cho Environment `production`:
   ```bash
   gh secret set LIGHTSAIL_HOST --env production --body "54.x.y.z"
   ```
3. Lấy lại dấu vân tay host cho IP mới và cập nhật secret `LIGHTSAIL_SSH_KNOWN_HOSTS`:
   ```bash
   ssh-keyscan -H 54.x.y.z > /tmp/known_hosts.new
   gh secret set LIGHTSAIL_SSH_KNOWN_HOSTS --env production < /tmp/known_hosts.new
   ```

#### Bước 4: Kiểm Thử Nghiệm Thu Môi Trường Mới
Thực hiện smoke test tới địa chỉ IP tĩnh mới:
```bash
TARGET_ENV=production TARGET_URL="https://brewlite.54-x-y-z.sslip.io" node scripts/smoke-test.mjs
```
Xác nhận chứng chỉ TLS mới được cấp phát thành công và trang web hoạt động bình thường.

#### Kịch Bản Quay Lui (Rollback) Nếu Gặp Sự Cố Mạng:
Nếu IP tĩnh gặp sự cố định tuyến mạng:
1. Vào AWS Lightsail Console -> Tab **Networking** -> Chọn `brewlite-prod-static-ip` -> Bấm **Detach**.
2. Máy chủ sẽ tự động nhận lại một IPv4 công khai.
3. Cập nhật lại hostname theo IPv4 mới và restart Caddy.
