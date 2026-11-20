# BrewLite — Báo Cáo Sẵn Sàng Phát Hành Production (Task 5.4.1)

**PRODUCTION READINESS & HARDENING AUDIT REPORT (UPDATED FIX-5.4.1)**

- **Dự án:** Hệ Thống Đặt Đồ Uống Trực Tuyến BrewLite (Assignment 2)
- **Mã nhiệm vụ:** Task 5.4.1 — Production Readiness, Hardening & Security Audit
- **Thời điểm nghiệm thu cập nhật:** 20/11/2026, 22:10:00 UTC+7 (15:10:00 UTC)
- **Môi trường mục tiêu:** AWS Lightsail `brewlite-production` (Singapore, `ap-southeast-1a`)
- **Địa chỉ phục vụ:** [https://brewlite.54-255-241-1.sslip.io](https://brewlite.54-255-241-1.sslip.io) & [https://swe-brewlite.54-255-241-1.sslip.io](https://swe-brewlite.54-255-241-1.sslip.io)
- **Quyết định nghiệm thu:** **READINESS AUDIT & TOOLING: PASS | CD LIVE DEPLOYMENT: BLOCKED / PENDING APPROVAL GATE**

---

## A. Executive Summary (Tóm Tắt Quản Trị)

Bản báo cáo này đánh giá độc lập toàn diện trạng thái sẵn sàng phát hành của hệ thống BrewLite đang vận hành trên nền tảng AWS Lightsail. Hệ thống ứng dụng (Web Next.js, Backend NestJS API, Cơ sở dữ liệu PostgreSQL 16 và Reverse Proxy Caddy) đang chạy ổn định, phục vụ dữ liệu thực tế và đạt 100% các chỉ số kiểm thử khói (Smoke Test) qua HTTPS công khai.

Tuy nhiên, **quy trình triển khai tự động Continuous Delivery (CD) qua GitHub Actions hiện đang ở trạng thái BỊ CHẶN (BLOCKED)** do thiếu thiết lập môi trường bảo vệ (`production` environment), thiếu Required Reviewers và chưa có các secrets/variables cấp quyền truy cập máy chủ trên GitHub Repository.

### Tóm tắt các phát hiện và hành động khắc phục trong phiên FIX-5.4.1:
1. **An toàn Phục hồi Dữ liệu (`scripts/restore-db.mjs`):**
   - Loại bỏ hoàn toàn các giá trị ngầm định hướng về production (`brewlite-prod-db`, `brewlite`). Bắt buộc chỉ định rõ `--container` và `--db`.
   - Cơ chế bảo vệ sản xuất kép: Mặc định từ chối mọi thao tác hướng vào container/database production. Chỉ cho phép thực thi khi có đủ 4 cờ xác nhận thảm họa (`--disaster-recovery-production`, `--confirm-restore-database`, `--acknowledge-destructive-overwrite`, `--confirm-target-db <exact-db-name>`).
   - Tích hợp cờ `ON_ERROR_STOP=1` cho `psql`: dừng ngay lập tức khi gặp bất kỳ câu lệnh SQL lỗi nào.
   - Kiểm tra toàn vẹn hai đầu: Kiểm tra cả header (`PostgreSQL database dump`) và footer kết thúc (`-- PostgreSQL database dump complete`) để chống nạp tệp backup bị đứt đoạn.
   - Kiểm tra đọc lại dữ liệu thực tế: Xác minh đầy đủ 5 bảng schema, đếm bản ghi `products` $> 0$, `migrations` $\ge 1$ và đọc mẫu dữ liệu.
   - **Đã kiểm chứng bằng Integration Test thực tế trên Docker:** Khởi tạo container PostgreSQL 16 cô lập, nạp dump, xác minh dữ liệu đọc lại và dọn dẹp sạch sẽ (44/44 tests PASS).
2. **Chuẩn Hóa Đa Tên Miền Caddy & Phân Tách URL:**
   - Phân biệt rõ ràng giữa **Tên miền chính (`DOMAIN`)** (dùng cho Smoke Test, Environment URL, CORS `FRONTEND_URL`) và **Danh sách Hostname (`CADDY_HOSTS`)** (dùng cho Caddy reverse proxy).
   - Tuyệt đối không truyền chuỗi danh sách chứa dấu phẩy vào `TARGET_URL` hay `FRONTEND_URL`. Hàm `resolveSmokeTestTargetUrl` được bổ sung kiểm tra nghiêm ngặt chỉ chấp nhận 1 URL HTTPS hợp lệ.
   - Cấu hình `Caddyfile` được kiểm chứng cú pháp bằng lệnh thực tế `caddy adapt --validate` thông qua container `caddy:2-alpine`, đạt kết quả PASS 100% với 0 lỗi.
3. **Chuẩn Hóa Runbook Chuyển Đổi IP Tĩnh:**
   - Thay thế hàm giả định bằng công cụ có thật và đã được kiểm thử: `safe-env.mjs set` và `updateEnvFile`, đảm bảo sao lưu trước khi sửa, bảo toàn secrets và quyền `0600`.
   - Bổ sung bước bắt buộc tái tạo container Caddy: `docker compose -f docker-compose.prod.yml up -d --force-recreate caddy`.
   - Sửa quy trình SSH: Tuyệt đối không tin tưởng `ssh-keyscan` mù quáng. Bắt buộc đối chiếu vân tay máy chủ có thẩm quyền từ Lightsail Browser Terminal trước khi nạp `known_hosts`.
   - Loại bỏ cam kết downtime dưới 60 giây thiếu căn cứ, thay bằng đánh giá thực tế từ 2 đến 10 phút.

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
- **Trạng thái nhánh `main` hiện tại:** Commit `ad4c0186c4f11eaf3e23b5cbe87eecdfa83bf8f6` (PR #36 merge commit). Hai commit này hoàn toàn không có sự khác biệt về mã nguồn ứng dụng hay logic backend/frontend.
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

| Tên Secret | Mục đích & Ý nghĩa | Định dạng / Ràng buộc an toàn |
|---|---|---|
| `LIGHTSAIL_SSH_KEY` | Private key OpenSSH để kết nối vào máy chủ | Khóa RSA/ED25519 (bắt đầu bằng `-----BEGIN OPENSSH PRIVATE KEY-----`) |
| `LIGHTSAIL_HOST` | Địa chỉ IP hoặc FQDN của máy chủ Lightsail | `54.255.241.1` (hoặc Static IP sau khi gắn) |
| `LIGHTSAIL_SSH_KNOWN_HOSTS` | Dấu vân tay máy chủ đã đối chiếu có thẩm quyền | Bắt buộc đối chiếu với `ssh-keygen -l` từ Lightsail Browser SSH. Không dùng keyscan mù quáng |
| `POSTGRES_DB` | Tên cơ sở dữ liệu production | Khớp với database đang chạy: `brewlite` |
| `POSTGRES_USER` | Tài khoản quản trị cơ sở dữ liệu | Khớp với user đang chạy: `brewlite` |
| `POSTGRES_PASSWORD` | Mật khẩu truy cập cơ sở dữ liệu PostgreSQL | Chuỗi mật khẩu an toàn cao, không rò rỉ |
| `JWT_SECRET` | Khóa bí mật ký token đăng nhập người dùng | Chuỗi ngẫu nhiên có độ entropy $\ge 256\text{-bit}$ |

#### c. Danh mục GitHub Variables (Phạm vi Environment `production`)

| Tên Variable | Giá trị khuyến nghị | Mục đích |
|---|---|---|
| `DOMAIN` | `brewlite.54-255-241-1.sslip.io` | **Tên miền chính duy nhất** (không chứa dấu phẩy, dùng cho Smoke Test & FRONTEND_URL) |
| `CADDY_HOSTS` | `brewlite.54-255-241-1.sslip.io, swe-brewlite.54-255-241-1.sslip.io` | Danh sách đầy đủ các hostname phục vụ qua Caddy Reverse Proxy |
| `PRODUCTION_APPROVAL_CONFIGURED` | `true` | Cờ xác nhận quản trị viên đã kiểm tra ranh giới an toàn |

---

## D. Rollback Readiness (Mức Độ Sẵn Sàng Quay Lui)

### 1. Xác định Bản Phát Hành Mục Tiêu Quay Lui (Previous Known-Good Release)
- **Commit định danh:** `49c582bc3c126621020b83363e2a51c5c0c3a6a5`
- **Khả năng kéo Image từ GHCR:** Đã xác minh tải manifest công khai từ GitHub Container Registry thành công.
  - API Digest: `sha256:072657ab705cab85b974d5a472796970d4c3011b30cffbe4e51a0a9ee894f3b9`
  - Web Digest: `sha256:012e59df46716ab52125d49bb86e7ef50479f8e659f798c9a55d7b439b7d5288`

### 2. Khả năng Tương thích của Công cụ Quay Lui
- [`scripts/deployment-state.mjs`](../../scripts/deployment-state.mjs): Lưu lại tag và digest của container trước mỗi lần triển khai vào tệp `/home/ubuntu/app/.deployment-state.json`.
- [`scripts/rollback.mjs`](../../scripts/rollback.mjs): Tự động nạp trạng thái từ tệp `.deployment-state.json`, cập nhật tệp Compose và thực hiện kéo lại container phiên bản trước.
- **Bảo toàn Dữ liệu Volume:** Thao tác rollback tuyệt đối không sử dụng cờ `-v` hoặc `docker volume rm`. Volume dữ liệu `app_postgres_data` được giữ nguyên vẹn 100%.
- **Kiểm thử mô phỏng thực tế (FIX-11 Simulation):** Đã kiểm chứng trong bộ kiểm thử `scripts/test-deployment-scripts.mjs` (Test 28) với Docker Engine thực tế, khẳng định rollback thành công và giữ nguyên vẹn dữ liệu trong volume.

---

## E. Backup & Restore Readiness (Sẵn Sàng Sao Lưu & Phục Hồi Thảm Họa)

### 1. Ma Trận Đánh Giá 4 Cấp Độ Sao Lưu & Phục Hồi

| Cấp độ Đánh giá | Tiêu chí kỹ thuật | Bằng chứng thực tế | Đánh giá |
|---|---|---|:---:|
| **Level 1: File Exists** | Có tệp backup tồn tại trên ổ cứng, dung lượng $> 0$ byte | Tệp `/home/ubuntu/app/backups/db-backup-2026-11-20T12-56-05-888Z.sql` có dung lượng **16.876 byte** (16.5 KB), quyền sở hữu `root:0600` | **PASS** |
| **Level 2: Integrity Verified** | Header chứa chữ ký hợp lệ `PostgreSQL database dump`, footer chứa đánh dấu `-- PostgreSQL database dump complete`, cấu trúc bảng đầy đủ | Kiểm tra cả đầu tệp (1KB) và đuôi tệp (2KB) xác nhận cấu trúc chuẩn `pg_dump 16.6`, chứa đủ lệnh tạo 8 bảng và dòng kết thúc hoàn chỉnh | **PASS** |
| **Level 3a: Restore Safety Tests** | Script phục hồi từ chối chạy khi thiếu cờ xác nhận, thiếu container/db, hoặc nhắm vào production | 4 unit tests an toàn trong `scripts/test-deployment-scripts.mjs` (Tests 35, 36, 37, 38) PASS 100% | **SAFETY PASS** |
| **Level 3b: Isolated Restore Integration Test** | Khôi phục thành công vào container PostgreSQL cô lập, xác minh schema, số lượng bản ghi và đọc lại dữ liệu thực tế | Integration test (Test 39) khởi chạy container `postgres:16-alpine` độc lập, stream nạp dữ liệu thành công, khẳng định 5 bảng, count `products` $> 0$, count `migrations` $\ge 1$, đọc đúng tên sản phẩm mẫu, và xác minh `ON_ERROR_STOP=1` chặn lỗi SQL | **PASS (ISOLATED DOCKER VERIFIED)** |
| **Level 3c: Production Database Restore** | Khôi phục trực tiếp lên cơ sở dữ liệu AWS Lightsail đang hoạt động | **TUYỆT ĐỐI KHÔNG THỰC HIỆN** (Tuân thủ nguyên tắc bảo vệ dữ liệu sản xuất; tách thành Runbook SOP-03 với 4 cờ xác nhận) | **NOT TESTED / FORBIDDEN ON LIVE** |
| **Level 4: Disaster Recovery Ready** | Bản sao lưu được tự động hóa (cron) và đẩy định kỳ ra ngoài máy chủ (Off-Host Storage như AWS S3 / Cloudflare R2) | Toàn bộ backup hiện chỉ nằm trên ổ cứng cục bộ của một máy chủ duy nhất. Chưa có cron job định kỳ và chưa có cơ chế đồng bộ lên S3/R2 | **FAIL / BLOCKED** |

---

## F. Configuration Drift & Networking (Đồng Bộ Cấu Hình & Mạng)

### 1. Phân Tách Rõ Ràng Tên Miền Chính và Danh Sách Hostname Caddy
- **`DOMAIN` (Tên miền chính duy nhất):** `brewlite.54-255-241-1.sslip.io`
  - Sử dụng cho: GitHub Environment URL, Smoke Test target URL (`https://$DOMAIN`), backend CORS `FRONTEND_URL`.
  - Nghiêm cấm: Truyền chuỗi danh sách có dấu phẩy hoặc khoảng trắng vào `DOMAIN`.
- **`CADDY_HOSTS` (Danh sách Hostname Caddy):** `brewlite.54-255-241-1.sslip.io, swe-brewlite.54-255-241-1.sslip.io`
  - Sử dụng cho: Caddy Reverse Proxy, tự động cấp phát 2 chứng chỉ Let's Encrypt riêng biệt.
  - Cấu hình trong `Caddyfile`:
    ```caddyfile
    {$CADDY_HOSTS:localhost} {
        import brewlite_proxy
    }
    ```
  - Cấu hình trong `docker-compose.prod.yml`:
    ```yaml
    environment:
      DOMAIN: ${DOMAIN:-localhost}
      CADDY_HOSTS: ${CADDY_HOSTS:-${DOMAIN:-localhost}}
    ```
- **Kiểm chứng thực tế cú pháp Caddy (Real Caddy Validation):**
  Lệnh kiểm chứng bằng Docker container:
  ```bash
  docker run --rm \
    -e CADDY_HOSTS="brewlite.54-255-241-1.sslip.io, swe-brewlite.54-255-241-1.sslip.io" \
    -v "${PWD}/Caddyfile:/etc/caddy/Caddyfile:ro" \
    caddy:2-alpine caddy adapt --validate --config /etc/caddy/Caddyfile
  ```
  Kết quả: **Exit code 0 (PASS)**, phân tích thành công 2 routes cho 2 hostname với đầy đủ TLS policies và security headers.

### 2. Kế Hoạch Chuyển Đổi Địa Chỉ IP Tĩnh (Lightsail Static IP Transition)
- **Rủi ro hiện tại:** Máy chủ đang sử dụng Dynamic Public IPv4 (`54.255.241.1`). Khi stop/start máy chủ, IP sẽ thay đổi, làm tê liệt DNS và chứng chỉ TLS.
- **Chi phí tham chiếu AWS Lightsail:** Static IP gắn vào máy chủ đang chạy: **0.00 USD/tháng (HOÀN TOÀN MIỄN PHÍ)**.
- **Đánh giá downtime thực tế:** Downtime ước tính từ **2 đến 10 phút** do phụ thuộc vào thời gian cập nhật định tuyến mạng của AWS và bắt tay ACME của Let's Encrypt. Cần có kế hoạch cửa sổ bảo trì (Maintenance Window).
- **Quy trình chuyển đổi an toàn (Runbook SOP-04):**
  1. Sao lưu cấu hình: `cp .env .env.bak.$(date +%s) && chmod 600 .env.bak.*`.
  2. Cập nhật bằng công cụ an toàn: `node scripts/safe-env.mjs set .env DOMAIN ...` và `set .env CADDY_HOSTS ...`.
  3. Tái tạo Caddy: `docker compose -f docker-compose.prod.yml up -d --force-recreate caddy`.
  4. Đối chiếu dấu vân tay có thẩm quyền từ Lightsail Browser SSH trước khi cập nhật `known_hosts`.

---

## G. CI/CD Production Preflight Matrix (Ma Trận 11 Bước Preflight)

| STT | Giai đoạn Pipeline | Kỳ vọng Kỹ thuật | Hiện trạng Kiểm toán Thực tế | Trạng thái Chặn | Hành động Khắc phục / Mở khóa |
|:---:|---|---|---|:---:|---|
| **1** | **Dispatch Trigger & Branch Filter** | Kích hoạt thủ công `workflow_dispatch` trên nhánh `refs/heads/main`, input `target_env: production` và chuỗi `confirm_production: DEPLOY_PRODUCTION` | Logic workflow đã được định nghĩa chặt chẽ với điều kiện `if: github.ref == 'refs/heads/main' && inputs.confirm_production == 'DEPLOY_PRODUCTION'` | **READY (PASS)** | Sẵn sàng; chỉ kích hoạt khi có lệnh phát hành chính thức |
| **2** | **Quality Gates Execution** | 100% tests (Unit, Integration, Component, Lint, Build, Deployment Tooling Suite, Compose E2E) phải PASS | Bộ test cục bộ và CI đạt **44/44 tests PASS, 0 failure** | **READY (PASS)** | Duy trì tỷ lệ xanh 100% trước khi bấm phát hành |
| **3** | **Build & Publish Docker Images** | Đóng gói multi-stage Docker image, tag bằng Git SHA đầy đủ, push lên GHCR thành công | Image cho cả commit `49c582bc` và `ad4c0186` đã có sẵn trên GHCR, digest khớp tuyệt đối | **READY (PASS)** | Tự động sinh image mới theo từng commit merge vào `main` |
| **4** | **GitHub Environment Approval Gate** | Tồn tại environment `production` với Required Reviewers; dừng chờ quản trị viên phê duyệt qua UI | API trả về 0 environments. Chưa có phê duyệt nào được cấu hình | **BLOCKED** | **Hành động bắt buộc:** Tạo environment `production` và gán reviewers trong GitHub Settings |
| **5** | **Preflight Secrets & Variables Verification** | Runner kiểm tra đủ 7 secrets và các variables bắt buộc; xác thực DOMAIN là 1 hostname duy nhất | API trả về 0 secrets, 0 variables tại repository. Step sẽ dừng ở chế độ an toàn | **BLOCKED** | **Hành động bắt buộc:** Cấu hình đầy đủ SSH, DB, JWT secrets và biến `DOMAIN`, `CADDY_HOSTS` |
| **6** | **Strict Host Fingerprint Verification** | SSH sử dụng `known_hosts` tin cậy từ secret, cấm `StrictHostKeyChecking=no` và cấm fallback keyscan mù quáng | Logic đã hoàn thiện trong script workflow (FIX-07 & FIX-5.4.1) | **READY / WAITING SECRETS** | Sẽ PASS ngay khi secret `LIGHTSAIL_SSH_KNOWN_HOSTS` được cung cấp sau khi đối chiếu vân tay |
| **7** | **Atomic Descriptor & Env Transfer** | Mã hóa base64 qua `safe-env.mjs`, giải mã tại máy chủ với quyền `0600`, đồng bộ Compose và Caddyfile | Script `safe-env.mjs` (hỗ trợ `updateEnvFile`, CLI `set`) và Caddyfile đã kiểm thử thành công 100% | **READY (PASS)** | Đảm bảo chuyển giao cấu hình an toàn, không lộ secret trên console log |
| **8** | **Database Readiness & Fail-Closed Backup** | Kiểm tra container `brewlite-prod-db` healthy, thực hiện backup trước khi cập nhật; dừng nếu backup lỗi | Container DB đang healthy. Script `backup-db.mjs` kiểm tra cả header và completion footer | **READY (PASS)** | Đảm bảo luôn có bản sao lưu trước mọi thao tác cập nhật schema |
| **9** | **Container Image Pull from GHCR** | Kéo cặp image mới về máy chủ; nếu lỗi mạng/registry sẽ tự động rollback | Đã kiểm tra quyền pull GHCR của máy chủ Lightsail hoạt động tốt | **READY (PASS)** | Tự động kích hoạt rollback nếu pull image thất bại |
| **10** | **Database Schema Migration Execution** | Chạy `prepare-database.js migrate` với TypeORM; áp dụng các migration mới; rollback nếu lỗi | Hiện tại 4/4 migration đã áp dụng. Các migration kế tiếp phải tuân thủ Forward-Only | **READY (PASS)** | Tự động rollback nếu migration trả về exit code khác 0 |
| **11** | **Container Rolling Update & Smoke Test** | `docker compose up -d`, kiểm tra 4 container healthy và chạy `smoke-test.mjs` qua HTTPS công khai | Smoke test nhận đúng 1 URL HTTPS hợp lệ; cơ chế auto-rollback sẵn sàng kích hoạt nếu HTTP != 200 | **READY (PASS)** | Hoàn tất chu trình phát hành có kiểm soát |

---

## H. Risks & Required Approvals (Rủi Ro & Phê Duyệt Cần Thiết)

### 1. Bảng Đánh Giá Rủi Ro Vận Hành

| Rủi ro Kỹ thuật | Mức độ | Khả năng xảy ra | Biện pháp Phòng ngừa & Khắc phục |
|---|:---:|:---:|---|
| **R-01: Thiếu Cổng Phê Duyệt GitHub** | **HIGH** | Đang tồn tại | Nếu không có Required Reviewers, bất kỳ ai có quyền push vào `main` đều có thể kích hoạt workflow deploy mà không qua kiểm soát. **Khắc phục:** Bắt buộc tạo GitHub Environment `production` trước khi merge release. |
| **R-02: Thay đổi Địa chỉ IPv4 Động** | **HIGH** | Trung bình (khi reboot VM) | Mất kết nối toàn bộ hệ thống do DNS sslip.io trỏ về IP cũ. **Khắc phục:** Thực hiện chuyển đổi sang AWS Lightsail Static IP theo Runbook SOP-04 (dự kiến downtime 2-10 phút). |
| **R-03: Ghi đè Cấu hình Đa Tên Miền Caddy** | **HIGH** | Đã triệt tiêu | Phân tách `DOMAIN` (đơn lẻ) và `CADDY_HOSTS` (đa tên miền), kiểm chứng bằng `caddy adapt --validate`. |
| **R-04: Mất Dữ Liệu Do Ổ Cứng Hỏng (Single Disk)** | **MEDIUM** | Thấp | Toàn bộ bản sao lưu chỉ nằm trên ổ cứng duy nhất của máy chủ VM. **Khắc phục:** Thiết lập bản sao ngoài máy chủ (S3/R2 replication) theo khuyến nghị tại Mục E. |
| **R-05: Khôi phục Nhầm Đè Lên Database Production** | **HIGH** | Đã triệt tiêu | `restore-db.mjs` mặc định từ chối đích production; yêu cầu 4 cờ xác nhận thảm họa riêng biệt. |

### 2. Danh Sách Ký Duyệt Nghiệm Thu Bắt Buộc (Sign-Off Matrix)

- [ ] **Repository Administrator:** Xác nhận đã tạo GitHub Environment `production`, cấu hình Required Reviewers và nạp đủ 7 secrets/variables an toàn.
- [ ] **Cloud DevOps Engineer:** Xác nhận đã kiểm tra cấu hình mạng AWS Lightsail, phương án Static IP và quyền truy cập SSH qua khóa bảo mật.
- [ ] **Lead QA Acceptance Engineer:** Xác nhận toàn bộ kết quả kiểm thử khói, tính toàn vẹn dữ liệu và các kịch bản rollback đã được kiểm chứng độc lập.

---

## I. Acceptance Decision (Quyết Định Nghiệm Thu Kỹ Thuật)

Dựa trên các bằng chứng khách quan, đối chiếu độc lập và kết quả kiểm thử tự động thu thập được:

1. **Về Năng lực Phần mềm & Trạng thái Vận hành Thực tế:**
   - Phiên bản ứng dụng đang chạy trên AWS Lightsail hoạt động ổn định, phục vụ đúng dữ liệu nghiệp vụ, vượt qua 100% các tiêu chí kiểm thử khói và tính toàn vẹn cơ sở dữ liệu.
   - Các công cụ bảo vệ phát hành (Script khôi phục database [`scripts/restore-db.mjs`](../../scripts/restore-db.mjs) với fail-closed và `ON_ERROR_STOP=1`, Tiện ích cấu hình [`scripts/safe-env.mjs`](../../scripts/safe-env.mjs), Cấu hình đa tên miền [`Caddyfile`](../../Caddyfile) kiểm chứng bằng `caddy adapt`, Bộ kiểm thử mở rộng [`scripts/test-deployment-scripts.mjs`](../../scripts/test-deployment-scripts.mjs) với **44 tests PASS**) đã hoàn thành xuất sắc.
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
