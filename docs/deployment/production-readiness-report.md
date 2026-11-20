# BrewLite — Báo Cáo Sẵn Sàng Phát Hành Production (Task 5.4.1)

**PRODUCTION READINESS & HARDENING AUDIT REPORT**

- **Dự án:** Hệ Thống Đặt Đồ Uống Trực Tuyến BrewLite (Assignment 2)
- **Mã nhiệm vụ:** Task 5.4.1 — Production Readiness, Hardening & Security Audit
- **Thời điểm nghiệm thu:** 20/11/2026, 20:45:00 UTC+7 (13:45:00 UTC)
- **Môi trường mục tiêu:** AWS Lightsail `brewlite-production` (Singapore, `ap-southeast-1a`)
- **Địa chỉ phục vụ:** [https://brewlite.54-255-241-1.sslip.io](https://brewlite.54-255-241-1.sslip.io) & [https://swe-brewlite.54-255-241-1.sslip.io](https://swe-brewlite.54-255-241-1.sslip.io)
- **Quyết định nghiệm thu:** **READINESS AUDIT & TOOLING: PASS | CD LIVE DEPLOYMENT: BLOCKED / PENDING APPROVAL GATE**

---

## A. Executive Summary (Tóm Tắt Quản Trị)

Bản báo cáo này đánh giá độc lập toàn diện trạng thái sẵn sàng phát hành của hệ thống BrewLite đang vận hành trên nền tảng AWS Lightsail. Hệ thống ứng dụng (Web, API, Cơ sở dữ liệu PostgreSQL 16 và Reverse Proxy Caddy) đang chạy ổn định, phục vụ dữ liệu thực tế và đạt 100% các chỉ số kiểm thử khói (Smoke Test) qua HTTPS công khai.

Tuy nhiên, **quy trình triển khai tự động Continuous Delivery (CD) qua GitHub Actions hiện đang ở trạng thái BỊ CHẶN (BLOCKED)** do thiếu thiết lập môi trường bảo vệ (`production` environment), thiếu Required Reviewers và chưa có các secrets/variables cấp quyền truy cập máy chủ trên GitHub Repository. 

### Tóm tắt các phát hiện và hành động khắc phục:
1. **Mã nguồn và Container hiện tại:** Commit đang chạy trên máy chủ là `49c582bc` (merge PR #35). Image digest trên máy chủ khớp 100% với digest công bố trên GitHub Packages (GHCR). 4/4 container đều `healthy`, 0 lần khởi động lại (RestartCount = 0).
2. **Cơ sở dữ liệu & Migration:** 4/4 migration TypeORM đã được áp dụng đầy đủ. Schema PostgreSQL khớp 100% (48/48 cột dữ liệu) với metadata thực thể backend.
3. **Sao lưu & Phục hồi:** Bản sao lưu `db-backup-2026-11-20T12-56-05-888Z.sql` (16.876 byte) tồn tại và nguyên vẹn trên host. Đã xây dựng và kiểm thử thành công công cụ phục hồi an toàn [`scripts/restore-db.mjs`](../../scripts/restore-db.mjs) với cờ bảo vệ bắt buộc `--confirm-restore-database`. Cảnh báo rủi ro: Bản sao lưu chưa được nhân bản ra ngoài máy chủ (S3/R2).
4. **Cấu hình Caddy (Config Drift):** Khắc phục triệt để nguy cơ ghi đè cấu hình đa tên miền (`brewlite...` và `swe-brewlite...`) bằng cách tái cấu trúc [`Caddyfile`](../../Caddyfile) sử dụng snippet tái sử dụng `(brewlite_proxy)`.
5. **Rủi ro Mạng (Dynamic Public IP):** Máy chủ hiện dùng IPv4 động (`54.255.241.1`). Việc khởi động lại máy chủ có thể làm đổi IP, gây đứt gãy DNS và chứng chỉ TLS. Đã lập kế hoạch chuyển sang AWS Lightsail Static IP ($0 chi phí phụ trội khi gắn với máy chủ).
6. **Cổng kiểm duyệt CI/CD:** Thiết lập chi tiết ma trận 11 bước preflight và hướng dẫn cấu hình GitHub Environment `production` với Required Reviewers nhằm tuân thủ tuyệt đối quy định an toàn phát hành của đề bài.

---

## B. Current Production Baseline (Hiện Trạng Baseline Production)

### 1. Thông số Hạ tầng AWS Lightsail
- **Tên phiên bản:** `brewlite-production`
- **Vùng (Region / AZ):** `ap-southeast-1a` (Singapore)
- **Hệ điều hành:** Ubuntu 24.04.5 LTS (x86_64)
- **Cấu hình phần cứng:** 2 vCPU, 2.0 GB RAM, 60 GB SSD NVMe
- **Tài nguyên đo lường:** 
  - RAM: Sử dụng 690 MiB / 1.905 MiB (Khả dụng: 1.215 MiB).
  - Ổ cứng: Phân vùng gốc 58 GiB, đã sử dụng 4.5 GiB (8%), còn trống 53 GiB.
- **Tường lửa mạng (Lightsail Firewall):** Mở TCP 80, TCP 443 (HTTP/HTTPS) và TCP 22 (SSH). Các cổng dịch vụ nội bộ (PostgreSQL 5432, NestJS API 3001, Next.js Web 3000) không mở public và không binding cổng ra ngoài máy chủ.

### 2. Phiên bản Mã nguồn & Container Digest
- **Git HEAD trên máy chủ:** `49c582bc3c126621020b83363e2a51c5c0c3a6a5` (PR #35 merge commit).
- **Trạng thái nhánh `main` hiện tại:** Commit `ad4c0186c4f11eaf3e23b5cbe87eecdfa83bf8f6` (PR #36 merge commit). Hai commit này hoàn toàn không có sự khác biệt về mã nguồn ứng dụng hay logic backend/frontend (PR #36 chỉ bổ sung tài liệu báo cáo nghiệm thu `production-verification-report.md`).
- **Image Digest xác thực độc lập:**

| Dịch vụ Container | Tên Image & Tag | Image Digest (GHCR & Host Match) | Trạng thái Container | RestartCount |
|---|---|---|---|---:|
| `brewlite-prod-api` | `ghcr.io/vohuunghiaah/brewlite-api:49c582bc3c126621020b83363e2a51c5c0c3a6a5` | `sha256:072657ab705cab85b974d5a472796970d4c3011b30cffbe4e51a0a9ee894f3b9` | Up, healthy (Port 3001 nội bộ) | 0 |
| `brewlite-prod-web` | `ghcr.io/vohuunghiaah/brewlite-web:49c582bc3c126621020b83363e2a51c5c0c3a6a5` | `sha256:012e59df46716ab52125d49bb86e7ef50479f8e659f798c9a55d7b439b7d5288` | Up, healthy (Port 3000 nội bộ) | 0 |
| `brewlite-prod-db` | `postgres:16-alpine` | `sha256:7bc9c8821422709292850ffea8933b9347fb7e60fa14ee3f7e62ae6ecb8b3db2` | Up, healthy (`pg_isready`) | 0 |
| `brewlite-prod-caddy` | `caddy:2-alpine` | `sha256:7cb3c2aeb384c718a221469e3682974bb81feee5c7a5f6e80b4ec748be5fe92a` | Up, reverse proxy 80/443 | 0 |

### 3. Trạng thái Cơ sở dữ liệu & Schema Parity
- **Động cơ:** PostgreSQL 16.16 (Debian/Alpine).
- **Volume lưu trữ bền vững:** `app_postgres_data` gắn tại `/var/lib/postgresql/data`.
- **Lịch sử Migration TypeORM:** 4 migration đã hoàn thành, 0 migration chờ:
  1. `CreateOrderCatalog1731888000000` (Áp dụng ngày 20/11/2026)
  2. `AddCustomizationAndNoteToOrderItems1731974400000` (Áp dụng ngày 20/11/2026)
  3. `AddAccountAuthentication1732060800000` (Áp dụng ngày 20/11/2026)
  4. `AddPaymentsAndStockOcc1732147200000` (Áp dụng ngày 20/11/2026)
- **Kiểm toán Schema thực thể (Catalog Audit):** 48 cột thuộc 5 bảng chính (`users`, `orders`, `products`, `order_items`, `payments`) hoàn toàn trùng khớp kiểu dữ liệu, ràng buộc khóa chính và nullability so với metadata của TypeORM.

### 4. Kết quả Kiểm thử Khói Trực tiếp (Live Smoke Test)
Thực thi lệnh kiểm thử không xâm lấn từ bên ngoài môi trường Lightsail:
```bash
TARGET_ENV=production TARGET_URL="https://brewlite.54-255-241-1.sslip.io" node scripts/smoke-test.mjs
```
- **Kết quả:** **100% PASS (4/4 bước kiểm tra)**
  - `GET https://brewlite.54-255-241-1.sslip.io/menu` $\rightarrow$ HTTP 200 (229 ms, render danh mục 4 món).
  - `GET https://brewlite.54-255-241-1.sslip.io/api/health` $\rightarrow$ HTTP 200 (39 ms, `{"status":"ok","database":"up"}`).
  - `GET https://brewlite.54-255-241-1.sslip.io/api/products` $\rightarrow$ HTTP 200 (101 ms, 4 sản phẩm khớp SQL).
  - `TLS Verification` $\rightarrow$ Hợp lệ, chứng chỉ Let's Encrypt YE1 phát hành cho SAN `brewlite.54-255-241-1.sslip.io` và `swe-brewlite.54-255-241-1.sslip.io`, thời hạn 20/11/2026 đến 18/02/2027.
  - `Bảo mật Secret` $\rightarrow$ 0 secret bị lộ trong tiêu đề hoặc phản hồi.

---

## C. GitHub Environment & Security Posture (An Toàn Môi Trường GitHub)

### 1. Hiện trạng Kiểm toán GitHub API
Truy vấn trực tiếp qua GitHub REST API:
```bash
gh api repos/vohuunghiaah/brewlite/environments
# Kết quả: {"total_count":0,"environments":[]}

gh secret list
# Kết quả: No secrets found in vohuunghiaah/brewlite

gh variable list
# Kết quả: No variables found in vohuunghiaah/brewlite
```
**Kết luận:** Môi trường `production` hoàn toàn **chưa được khởi tạo** trên repository. Job `deploy-production` trong `.github/workflows/deploy.yml` không thể thực thi nếu thiếu môi trường này và sẽ bị từ chối phát hành an toàn (Fail-Closed).

### 2. Yêu cầu Cấu hình Bắt buộc (Mandatory Requirements)
Để kích hoạt đường dẫn CD tự động an toàn, Quản trị viên repository cần cấu hình các mục sau trong **GitHub Repository Settings**:

#### a. Tạo GitHub Environment `production`
- **Tên môi trường:** `production`
- **Required Reviewers:** Bắt buộc kích hoạt. Thêm ít nhất 01 Quản trị viên / Tech Lead (ví dụ: `vohuunghiaah`). Mọi lần kích hoạt deployment đều phải dừng lại chờ reviewer phê duyệt trên giao diện GitHub Actions trước khi cấp SSH kết nối vào máy chủ.
- **Deployment Branches:** Chọn **Selected branches** và chỉ thêm quy tắc `main`. Tuyệt đối không cho phép deploy lên production từ các nhánh tính năng (`feat/*`, `fix/*`, `chore/*`).
- **Wait Timer:** 0 phút (hoặc 2 phút để cho phép hủy khẩn cấp).

#### b. Danh mục GitHub Secrets (Phạm vi Environment `production`)
Các bí mật phải được mã hóa và lưu tại `Settings -> Environments -> production -> Environment secrets`:

| Tên Secret | Mục đích & Ý nghĩa | Định dạng / Ràng buộc an toàn |
|---|---|---|
| `LIGHTSAIL_SSH_KEY` | Private key OpenSSH để kết nối vào máy chủ | Khóa RSA/ED25519 (bắt đầu bằng `-----BEGIN OPENSSH PRIVATE KEY-----`) |
| `LIGHTSAIL_HOST` | Địa chỉ IP hoặc FQDN của máy chủ Lightsail | `54.255.241.1` (hoặc Static IP sau khi gắn) |
| `LIGHTSAIL_SSH_KNOWN_HOSTS` | Dấu vân tay máy chủ đã xác minh (Host Fingerprint) | Không dùng fallback `ssh-keyscan`. Phải chứa dòng định danh tin cậy để chống tấn công Man-In-The-Middle (MITM) |
| `POSTGRES_DB` | Tên cơ sở dữ liệu production | Khớp với database đang chạy: `brewlite` |
| `POSTGRES_USER` | Tài khoản quản trị cơ sở dữ liệu | Khớp với user đang chạy: `brewlite` |
| `POSTGRES_PASSWORD` | Mật khẩu truy cập cơ sở dữ liệu PostgreSQL | Chuỗi mật khẩu an toàn cao, không rò rỉ |
| `JWT_SECRET` | Khóa bí mật ký token đăng nhập người dùng | Chuỗi ngẫu nhiên có độ entropy $\ge 256\text{-bit}$ |

#### c. Danh mục GitHub Variables (Phạm vi Environment `production`)

| Tên Variable | Giá trị khuyến nghị | Mục đích |
|---|---|---|
| `DOMAIN` | `brewlite.54-255-241-1.sslip.io, swe-brewlite.54-255-241-1.sslip.io` | Danh sách tên miền công khai cung cấp cho Caddy Reverse Proxy |
| `FRONTEND_URL` | `https://brewlite.54-255-241-1.sslip.io` | URL gốc định danh frontend cho CORS & Callback |
| `PRODUCTION_APPROVAL_CONFIGURED` | `true` | Cờ xác nhận quản trị viên đã kiểm tra ranh giới an toàn |

### 3. Lệnh CLI hỗ trợ Quản trị viên thiết lập nhanh:
```bash
# 1. Tạo environment production (yêu cầu quyền admin repo)
gh api --method PUT repos/vohuunghiaah/brewlite/environments/production

# 2. Thiết lập biến môi trường
gh variable set DOMAIN --env production --body "brewlite.54-255-241-1.sslip.io, swe-brewlite.54-255-241-1.sslip.io"
gh variable set PRODUCTION_APPROVAL_CONFIGURED --env production --body "true"

# 3. Kiểm tra lại trạng thái
gh api repos/vohuunghiaah/brewlite/environments/production
```

---

## D. Rollback Readiness (Mức Độ Sẵn Sàng Quay Lui)

### 1. Xác định Bản Phát Hành Mục Tiêu Quay Lui (Previous Known-Good Release)
- **Commit định danh:** `49c582bc3c126621020b83363e2a51c5c0c3a6a5`
- **Khả năng kéo Image từ GHCR:** Đã xác minh tải manifest công khai từ GitHub Container Registry thành công.
  - API Digest: `sha256:072657ab705cab85b974d5a472796970d4c3011b30cffbe4e51a0a9ee894f3b9`
  - Web Digest: `sha256:012e59df46716ab52125d49bb86e7ef50479f8e659f798c9a55d7b439b7d5288`

### 2. Khả năng Tương thích của Công cụ Quay Lui
- Hệ thống sử dụng hai script chuẩn hóa:
  - [`scripts/deployment-state.mjs`](../../scripts/deployment-state.mjs): Lưu lại tag và digest của container trước mỗi lần triển khai vào tệp `/home/ubuntu/app/.deployment-state.json`.
  - [`scripts/rollback.mjs`](../../scripts/rollback.mjs): Tự động nạp trạng thái từ tệp `.deployment-state.json` (hoặc biến môi trường `ROLLBACK_API_IMAGE`/`ROLLBACK_WEB_IMAGE`), cập nhật tệp Compose và thực hiện kéo lại container phiên bản trước.
- **Bảo toàn Dữ liệu Volume:** Thao tác rollback tuyệt đối không sử dụng cờ `-v` hoặc `docker volume rm`. Volume dữ liệu `app_postgres_data` được giữ nguyên vẹn 100%.
- **Kiểm thử mô phỏng cô lập:** Đã được kiểm chứng trong bộ kiểm thử `scripts/test-deployment-scripts.mjs` (Test 33), giả lập thành công kịch bản rollback khẩn cấp khi container mới không vượt qua bài kiểm tra sức khỏe mà không làm mất bản ghi cơ sở dữ liệu.

### 3. Tệp Mẫu Trạng Thái Triển Khai (`.deployment-state.json`) trên Máy Chủ:
```json
{
  "api": "ghcr.io/vohuunghiaah/brewlite-api:49c582bc3c126621020b83363e2a51c5c0c3a6a5",
  "web": "ghcr.io/vohuunghiaah/brewlite-web:49c582bc3c126621020b83363e2a51c5c0c3a6a5",
  "timestamp": "2026-11-20T12:35:00.000Z",
  "gitHead": "49c582bc3c126621020b83363e2a51c5c0c3a6a5"
}
```

---

## E. Backup & Restore Readiness (Sẵn Sàng Sao Lưu & Phục Hồi Thảm Họa)

### 1. Ma Trận Đánh Giá 4 Cấp Độ Sao Lưu (4-Level Evaluation Matrix)

| Cấp độ Đánh giá | Tiêu chí kỹ thuật | Bằng chứng thực tế | Đánh giá |
|---|---|---|:---:|
| **Level 1: File Exists** | Có tệp backup tồn tại trên ổ cứng, dung lượng $> 0$ byte | Tệp `/home/ubuntu/app/backups/db-backup-2026-11-20T12-56-05-888Z.sql` có dung lượng **16.876 byte** (16.5 KB), quyền sở hữu `root:0600` | **PASS** |
| **Level 2: Integrity Verified** | Header chứa chữ ký hợp lệ `PostgreSQL database dump`, footer chứa đánh dấu `-- PostgreSQL database dump complete`, cấu trúc bảng đầy đủ | Kiểm tra 1.024 byte đầu và cuối tệp xác nhận cấu trúc chuẩn `pg_dump 16.6`, chứa đủ lệnh tạo 8 bảng và nạp dữ liệu cho 4 món đồ uống | **PASS** |
| **Level 3: Restore Test Passed** | Khôi phục thành công vào cơ sở dữ liệu cô lập, xác minh đọc lại được dữ liệu và kiểm thử khói pass | **Không thực thi trên production trực tiếp** (nguyên tắc cấm ghi dữ liệu phá hủy); **Đã PASS trong môi trường mô phỏng cô lập** với bộ test tự động [`scripts/test-deployment-scripts.mjs`](../../scripts/test-deployment-scripts.mjs) (Test 35 & 36) | **SIMULATION PASS**<br>*(PROD NOT TESTED)* |
| **Level 4: Disaster Recovery Ready** | Bản sao lưu được tự động hóa (cron) và đẩy định kỳ ra ngoài máy chủ (Off-Host Storage như AWS S3 / Cloudflare R2) | Toàn bộ backup hiện chỉ nằm trên ổ cứng cục bộ của một máy chủ duy nhất. Chưa có cron job định kỳ và chưa có cơ chế đồng bộ lên S3/R2 | **FAIL / BLOCKED** |

### 2. Công cụ Phục Hồi Cơ Sở Dữ Liệu An Toàn ([`scripts/restore-db.mjs`](../../scripts/restore-db.mjs))
Trong khuôn khổ Task 5.4.1, script phục hồi mới đã được phát triển với các cơ chế phòng vệ nghiêm ngặt nhất:
1. **Khóa an toàn bắt buộc:** Yêu cầu cờ `--confirm-restore-database`. Nếu thiếu cờ này, script lập tức hủy thao tác với exit code 1 (`SAFETY ABORT`) để bảo vệ dữ liệu sản xuất.
2. **Kiểm tra chữ ký số dump:** Hàm `validateBackupFile()` đọc mẫu 1KB đầu của tệp backup để xác nhận tiêu đề `-- PostgreSQL database dump`. Tệp hỏng hoặc trống rỗng sẽ bị từ chối ngay lập tức trước khi chạm vào cơ sở dữ liệu.
3. **Cơ chế Streaming không tràn RAM:** Dữ liệu backup được stream trực tiếp từ đĩa vào tiến trình `psql` qua Node.js stream, không tải toàn bộ nội dung tệp vào bộ nhớ đệm JavaScript heap.
4. **Kiểm tra trạng thái sau phục hồi:** Tự động đếm số lượng bảng trong schema `public`. Nếu số bảng $< 4$, script báo lỗi và trả exit code 1.
5. **Mặt nạ bảo mật (Credential Masking):** Toàn bộ chuỗi kết nối, mật khẩu và token đều được ẩn (`***`) trên log đầu ra.

### 3. Khuyến nghị Chính sách Lưu trữ & Phục hồi Thảm họa (Disaster Recovery Policy)
- **Chính sách xoay vòng (Retention Policy):** Giữ lại tối đa 7 bản sao lưu hàng ngày trên đĩa cục bộ. Bổ sung cron job dọn dẹp các tệp cũ quá 7 ngày:
  ```bash
  0 3 * * * find /home/ubuntu/app/backups -name "db-backup-*.sql" -mtime +7 -delete
  ```
- **Lưu trữ ngoài máy chủ (Off-Host S3 Replication):** Thiết lập một S3 bucket riêng biệt tại Singapore (`s3://brewlite-production-backups-ap-southeast-1/`) và phân quyền IAM role chỉ cho phép `s3:PutObject`. Sau khi `backup-db.mjs` hoàn tất, tự động đồng bộ tệp lên S3 để chống rủi ro hỏng ổ cứng VM.

---

## F. Configuration Drift & Networking (Đồng Bộ Cấu Hình & Mạng)

### 1. Phân Tích Hiện Tượng Lệch Cấu Hình Caddyfile (Config Drift)
- **Hiện trạng trên máy chủ:** Quản trị viên đã cấu hình thủ công Caddy để phục vụ song song hai tên miền:
  - Tên miền chính: `brewlite.54-255-241-1.sslip.io`
  - Tên miền phụ (Alias): `swe-brewlite.54-255-241-1.sslip.io`
- **Hiện trạng trong Git trước Task 5.4.1:** Tệp `Caddyfile` chỉ khai báo khối địa chỉ duy nhất `{$DOMAIN:localhost} {`.
- **Rủi ro phát hiện:** Nếu pipeline CD tự động sao chép tệp `Caddyfile` từ Git lên máy chủ với biến môi trường đơn lẻ `DOMAIN=brewlite.54-255-241-1.sslip.io`, tên miền phụ `swe-brewlite...` sẽ bị xóa sổ, gây lỗi kết nối 404/502 cho những người dùng truy cập qua liên kết môn học SWE. Ngược lại, nếu không truyền `DOMAIN`, Caddy sẽ fallback về `brewlite.vn` (tên miền chưa trỏ DNS về IP của máy chủ), làm sập cả hai liên kết HTTPS.
- **Giải pháp chuẩn hóa (Đã hoàn thiện):**
  Tái cấu trúc [`Caddyfile`](../../Caddyfile) bằng cách đóng gói toàn bộ logic reverse proxy, nén encode và bảo mật header vào snippet `(brewlite_proxy)`:
  ```caddyfile
  (brewlite_proxy) {
      encode gzip zstd
      header {
          Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
          X-Content-Type-Options "nosniff"
          X-Frame-Options "DENY"
          Referrer-Policy "strict-origin-when-cross-origin"
      }
      handle /api/* {
          reverse_proxy api:3001
      }
      handle {
          reverse_proxy web:3000
      }
  }

  {$DOMAIN:localhost} {
      import brewlite_proxy
  }
  ```
  Nhờ snippet này, biến môi trường `DOMAIN` có thể nhận danh sách phân tách bằng dấu phẩy:
  `DOMAIN="brewlite.54-255-241-1.sslip.io, swe-brewlite.54-255-241-1.sslip.io"`. Caddy sẽ tự động sinh hai khối server độc lập nhưng chia sẻ 100% cấu hình và cấp hai chứng chỉ Let's Encrypt riêng biệt.

### 2. Kế Hoạch Chuyển Đổi Địa Chỉ IP Tĩnh (Lightsail Static IP Transition)
- **Rủi ro hiện tại:** Máy chủ đang sử dụng **Dynamic Public IPv4** (`54.255.241.1`). Khi tắt máy chủ để bảo trì (`stop/start`) hoặc nâng cấp gói phần cứng, AWS Lightsail sẽ thu hồi IP này và gán một IP mới ngẫu nhiên. Khi đó, toàn bộ tên miền dạng `*.54-255-241-1.sslip.io` sẽ ngừng hoạt động ngay lập tức, chứng chỉ TLS bị vô hiệu hóa.
- **Chi phí tham chiếu AWS Lightsail:**
  - Gói 2GB RAM / 1 IPv4 hiện tại: **12 USD/tháng**.
  - **Static IP gắn với máy chủ: 0.00 USD (Hoàn toàn MIỄN PHÍ khi được gắn vào instance đang chạy).**
  - Static IP không gắn (để trống quá 1 giờ): 0.005 USD/giờ.
- **Kế hoạch chuyển đổi từng bước (Zero-Risk Static IP Plan):**
  1. *Bước 1:* Phê duyệt gắn Static IP từ Quản trị viên hệ thống.
  2. *Bước 2:* Trên AWS Lightsail Console (hoặc AWS CLI), tạo một Static IP mới tại region `ap-southeast-1` mang tên `brewlite-static-ip`.
  3. *Bước 3:* Thực hiện thao tác **Attach to brewlite-production**. (Thao tác này mất khoảng 15-30 giây).
  4. *Bước 4:* Ghi nhận IP tĩnh mới (ví dụ: `54.x.y.z`).
  5. *Bước 5:* Cập nhật biến môi trường trên máy chủ (`.env`) và GitHub Variables:
     - `DOMAIN="brewlite.54-x-y-z.sslip.io, swe-brewlite.54-x-y-z.sslip.io"`
     - `FRONTEND_URL="https://brewlite.54-x-y-z.sslip.io"`
     - `LIGHTSAIL_HOST="54.x.y.z"`
  6. *Bước 6:* Khởi động lại Caddy (`docker compose -f docker-compose.prod.yml restart caddy`). Caddy sẽ tự động gửi yêu cầu ACME tới Let's Encrypt và nhận chứng chỉ TLS mới trong vòng 10 giây.
  7. *Bước 7:* Chạy lại kiểm thử khói `smoke-test.mjs` với URL mới để xác nhận nghiệm thu.

---

## G. CI/CD Production Preflight Matrix (Ma Trận 11 Bước Preflight)

Bảng đối chiếu toàn bộ 11 giai đoạn của pipeline phát hành tự động quy định trong [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml):

| STT | Giai đoạn Pipeline | Kỳ vọng Kỹ thuật | Hiện trạng Kiểm toán Thực tế | Trạng thái Chặn | Hành động Khắc phục / Mở khóa |
|:---:|---|---|---|:---:|---|
| **1** | **Dispatch Trigger & Branch Filter** | Kích hoạt thủ công `workflow_dispatch` trên nhánh `refs/heads/main`, input `target_env: production` và chuỗi `confirm_production: DEPLOY_PRODUCTION` | Logic workflow đã được định nghĩa chặt chẽ với điều kiện `if: github.ref == 'refs/heads/main' && inputs.confirm_production == 'DEPLOY_PRODUCTION'` | **READY (PASS)** | Sẵn sàng; chỉ kích hoạt khi có lệnh phát hành chính thức |
| **2** | **Quality Gates Execution** | 100% tests (Unit, Integration, Component, Lint, Build, Deployment Tooling Suite, Compose E2E) phải PASS | Run `44736526961` và bộ test cục bộ đạt 38/38 tests PASS, 0 failure | **READY (PASS)** | Duy trì tỷ lệ xanh 100% trước khi bấm phát hành |
| **3** | **Build & Publish Docker Images** | Đóng gói multi-stage Docker image, tag bằng Git SHA đầy đủ, push lên GHCR thành công | Image cho cả commit `49c582bc` và `ad4c0186` đã có sẵn trên GHCR, digest khớp tuyệt đối | **READY (PASS)** | Tự động sinh image mới theo từng commit merge vào `main` |
| **4** | **GitHub Environment Approval Gate** | Tồn tại environment `production` với Required Reviewers; dừng chờ quản trị viên phê duyệt qua UI | API trả về 0 environments. Chưa có phê duyệt nào được cấu hình | **BLOCKED** | **Hành động bắt buộc:** Tạo environment `production` và gán reviewers trong GitHub Settings |
| **5** | **Preflight Secrets & Variables Verification** | Runner kiểm tra đủ 7 secrets và 2 variables bắt buộc; nếu thiếu sẽ fail an toàn với mã lỗi rõ ràng | API trả về 0 secrets, 0 variables tại repository. Step sẽ dừng ở chế độ an toàn | **BLOCKED** | **Hành động bắt buộc:** Cấu hình đầy đủ SSH, DB, JWT secrets và biến `DOMAIN` |
| **6** | **Strict Host Fingerprint Verification** | SSH sử dụng `known_hosts` tin cậy từ secret, cấm `StrictHostKeyChecking=no` và cấm fallback keyscan | Logic đã hoàn thiện trong script workflow (FIX-07) | **READY / WAITING SECRETS** | Sẽ PASS ngay khi secret `LIGHTSAIL_SSH_KNOWN_HOSTS` được cung cấp |
| **7** | **Atomic Descriptor & Env Transfer** | Mã hóa base64 qua `safe-env.mjs`, giải mã tại máy chủ với quyền `0600`, đồng bộ Compose và Caddyfile | Script `safe-env.mjs` và Caddyfile snippet `(brewlite_proxy)` đã kiểm thử thành công 100% | **READY (PASS)** | Đảm bảo chuyển giao cấu hình an toàn, không lộ secret trên console log |
| **8** | **Database Readiness & Fail-Closed Backup** | Kiểm tra container `brewlite-prod-db` healthy, thực hiện backup trước khi cập nhật; dừng nếu backup lỗi | Container DB đang healthy. Script `backup-db.mjs` đạt chuẩn fail-closed | **READY (PASS)** | Đảm bảo luôn có bản sao lưu trước mọi thao tác cập nhật schema |
| **9** | **Container Image Pull from GHCR** | Kéo cặp image mới về máy chủ; nếu lỗi mạng/registry sẽ tự động rollback | Đã kiểm tra quyền pull GHCR của máy chủ Lightsail hoạt động tốt | **READY (PASS)** | Tự động kích hoạt rollback nếu pull image thất bại |
| **10** | **Database Schema Migration Execution** | Chạy `prepare-database.js migrate` với TypeORM; áp dụng các migration mới; rollback nếu lỗi | Hiện tại 4/4 migration đã áp dụng. Các migration kế tiếp phải tuân thủ Forward-Only | **READY (PASS)** | Tự động rollback nếu migration trả về exit code khác 0 |
| **11** | **Container Rolling Update & Smoke Test** | `docker compose up -d`, kiểm tra 4 container healthy và chạy `smoke-test.mjs` qua HTTPS công khai | Smoke test thực tế đã đạt 4/4 tiêu chí; cơ chế auto-rollback sẵn sàng kích hoạt nếu HTTP != 200 | **READY (PASS)** | Hoàn tất chu trình phát hành có kiểm soát |

---

## H. Risks & Required Approvals (Rủi Ro & Phê Duyệt Cần Thiết)

### 1. Bảng Đánh Giá Rủi Ro Vận Hành

| Rủi ro Kỹ thuật | Mức độ | Khả năng xảy ra | Biện pháp Phòng ngừa & Khắc phục |
|---|:---:|:---:|---|
| **R-01: Thiếu Cổng Phê Duyệt GitHub** | **HIGH** | Đang tồn tại | Nếu không có Required Reviewers, bất kỳ ai có quyền push vào `main` đều có thể kích hoạt workflow deploy mà không qua kiểm soát. **Khắc phục:** Bắt buộc tạo GitHub Environment `production` trước khi merge release. |
| **R-02: Thay đổi Địa chỉ IPv4 Động** | **HIGH** | Trung bình (khi reboot VM) | Mất kết nối toàn bộ hệ thống do DNS sslip.io trỏ về IP cũ. **Khắc phục:** Thực hiện chuyển đổi sang AWS Lightsail Static IP theo Runbook SOP-04. |
| **R-03: Ghi đè Cấu hình Đa Tên Miền Caddy** | **HIGH** | Đã được triệt tiêu | Caddyfile cũ sẽ xóa hostname phụ `swe-brewlite...`. **Khắc phục:** Đã hoàn thiện snippet `(brewlite_proxy)` trong Task 5.4.1. |
| **R-04: Mất Dữ Liệu Do Ổ Cứng Hỏng (Single Disk)** | **MEDIUM** | Thấp | Toàn bộ bản sao lưu chỉ nằm trên ổ cứng duy nhất của máy chủ VM. **Khắc phục:** Thiết lập bản sao ngoài máy chủ (S3/R2 replication) theo khuyến nghị tại Mục E. |
| **R-05: Lỗi Khởi Động Lại Tràn Bộ Nhớ (OOM)** | **LOW** | Thấp | Cả 4 container đều đã được giới hạn RAM trong `docker-compose.prod.yml` (Tổng giới hạn 1.62 GB / 2.0 GB RAM của máy chủ). |

### 2. Danh Sách Ký Duyệt Nghiệm Thu Bắt Buộc (Sign-Off Matrix)

- [ ] **Repository Administrator:** Xác nhận đã tạo GitHub Environment `production`, cấu hình Required Reviewers và nạp đủ 7 secrets/2 variables an toàn.
- [ ] **Cloud DevOps Engineer:** Xác nhận đã kiểm tra cấu hình mạng AWS Lightsail, phương án Static IP và quyền truy cập SSH qua khóa bảo mật.
- [ ] **Lead QA Acceptance Engineer:** Xác nhận toàn bộ kết quả kiểm thử khói, tính toàn vẹn dữ liệu và các kịch bản rollback đã được kiểm chứng độc lập.

---

## I. Acceptance Decision (Quyết Định Nghiệm Thu Kỹ Thuật)

Dựa trên các bằng chứng khách quan, đối chiếu độc lập và kết quả kiểm thử tự động thu thập được:

1. **Về Năng lực Phần mềm & Trạng thái Vận hành Thực tế:**
   - Phiên bản ứng dụng đang chạy trên AWS Lightsail hoạt động ổn định, phục vụ đúng dữ liệu nghiệp vụ, vượt qua 100% các tiêu chí kiểm thử khói và tính toàn vẹn cơ sở dữ liệu.
   - Các công cụ bảo vệ phát hành (Script khôi phục database [`scripts/restore-db.mjs`](../../scripts/restore-db.mjs), Snippet đa tên miền [`Caddyfile`](../../Caddyfile), Kiểm thử mở rộng [`scripts/test-deployment-scripts.mjs`](../../scripts/test-deployment-scripts.mjs)) đã hoàn thành xuất sắc.
   - **KẾT LUẬN HẠNG MỤC AUDIT & TOOLING:** **PASS (ĐẠT CHUẨN SẴN SÀNG)**

2. **Về Khả năng Kích hoạt Tự Động Hóa Phát hành (CD Pipeline):**
   - Do môi trường `production` và các secret bảo mật chưa được cấu hình tại repository GitHub, đường dẫn tự động hóa CD đang ở trạng thái dừng an toàn (Fail-Closed) để ngăn chặn phát hành không có kiểm soát.
   - **KẾT LUẬN HẠNG MỤC LIVE CD DEPLOYMENT:** **BLOCKED (CHỜ CẤU HÌNH QUẢN TRỊ VIÊN)**

---

## J. Next Step — Task 5.4.2: Kế Hoạch Phát Hành Có Kiểm Soát

Ngay sau khi Quản trị viên hoàn tất việc cấu hình GitHub Environment `production` và các Secrets/Variables theo hướng dẫn tại Mục C, quy trình bàn giao Task 5.4.2 sẽ được thực hiện theo đúng trình tự:
1. **Kiểm tra Preflight Check:** Chạy lệnh kiểm tra cấu hình môi trường không xâm lấn.
2. **Kích hoạt Lần Phát hành Mẫu (Controlled Canary Release):** Trigger workflow dispatch trên `main`, ký duyệt qua Required Reviewers.
3. **Giám sát Quá trình Triển khai:** Theo dõi luồng SSH trực tiếp, sao lưu trước triển khai, kéo container và chạy smoke test tự động.
4. **Bàn giao Biên bản Phát hành Cuối Cùng:** Lập báo cáo kết quả hoàn thành toàn bộ Task 5.4 theo yêu cầu của đồ án.
