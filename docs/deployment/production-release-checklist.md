# BrewLite — Danh Sách Kiểm Tra Phát Hành Production (Release Checklist)

**Tài liệu:** Production Release Checklist (Task 5.4.1 - FIX-5.4.1)  
**Mục đích:** Bảng kiểm tra tuần tự bắt buộc cho Người phụ trách phát hành (Release Manager), DevOps Engineer và QA Lead trước, trong và sau mỗi lần triển khai mã nguồn lên môi trường Production trên AWS Lightsail.  
**Nguyên tắc vận hành:** *Thất bại an toàn (Fail-Closed) — Không bỏ qua bất kỳ bước kiểm tra nào — Tự động quay lui (Rollback) khi phát sinh lỗi.*

---

## 1. Giai Đoạn 1: Kiểm Tra Tiên Quyết Trước Phát Hành (Pre-Release Phase - Phase -1)

Tất cả các mục trong giai đoạn này phải đạt trạng thái **PASS** trước khi kích hoạt bất kỳ lệnh triển khai nào:

### A. Kiểm tra Nhánh & Mã nguồn (Source Code & Git Ref)
- [ ] **Nhánh triển khai:** Xác nhận mã nguồn chuẩn bị phát hành đã được merge hoàn chỉnh vào nhánh `main` qua Pull Request được phê duyệt. Tuyệt đối không phát hành từ nhánh tính năng hoặc nhánh cá nhân.
- [ ] **Git Commit SHA:** Ghi nhận đầy đủ 40 ký tự SHA của commit phát hành (ví dụ: `49c582bc3c126621020b83363e2a51c5c0c3a6a5`).
- [ ] **Chất lượng mã nguồn (Quality Gates):** Workflow `.github/workflows/quality.yml` trên commit đó phải có trạng thái **SUCCESS** (100% linter, unit test backend, component test frontend, build artifact đều xanh).

### B. Kiểm tra Đóng gói Docker & Container Registry (GHCR)
- [ ] **Image API trên GHCR:** Đã publish thành công image `ghcr.io/vohuunghiaah/brewlite-api:<commit-sha>` với digest hợp lệ.
- [ ] **Image Web trên GHCR:** Đã publish thành công image `ghcr.io/vohuunghiaah/brewlite-web:<commit-sha>` với digest hợp lệ.
- [ ] **Quyền truy cập Image:** Image được cấu hình công khai (Public) hoặc máy chủ Lightsail đã đăng nhập GHCR token để kéo image không gặp lỗi 403 Forbidden.

### C. Kiểm tra Môi Trường GitHub (GitHub Environment & Security Gate)
- [ ] **Tồn tại Environment `production`:** Kiểm tra qua `gh api repos/vohuunghiaah/brewlite/environments/production` trả về HTTP 200.
- [ ] **Required Reviewers:** Đã kích hoạt cơ chế bắt buộc phê duyệt và chỉ định tối thiểu 01 Quản trị viên repository / Tech Lead.
- [ ] **Giới hạn Nhánh (Deployment Branches):** Đã giới hạn chỉ duy nhất nhánh `main` được phép kích hoạt deployment vào môi trường `production`.
- [ ] **Đầy đủ 7 Secrets bắt buộc tại Environment:**
  - [ ] `LIGHTSAIL_SSH_KEY` (Private key OpenSSH)
  - [ ] `LIGHTSAIL_HOST` (IP hoặc hostname máy chủ Lightsail: `54.255.241.1`)
  - [ ] `LIGHTSAIL_SSH_KNOWN_HOSTS` (Host fingerprint đã được đối chiếu có thẩm quyền từ máy chủ, không dùng keyscan mù quáng)
  - [ ] `POSTGRES_DB` (Tên DB: `brewlite`)
  - [ ] `POSTGRES_USER` (Tên user DB: `brewlite`)
  - [ ] `POSTGRES_PASSWORD` (Mật khẩu cơ sở dữ liệu)
  - [ ] `JWT_SECRET` (Khóa ký xác thực JWT)
- [ ] **Đầy đủ Variables bắt buộc tại Environment:**
  - [ ] `DOMAIN` (Tên miền chính duy nhất, ví dụ: `brewlite.54-255-241-1.sslip.io` — không chứa dấu phẩy, khoảng trắng hay giao thức)
  - [ ] `CADDY_HOSTS` (Danh sách đầy đủ các hostname cho Caddy, ví dụ: `brewlite.54-255-241-1.sslip.io, swe-brewlite.54-255-241-1.sslip.io`)
  - [ ] `PRODUCTION_APPROVAL_CONFIGURED` (`true`)

### D. Kiểm tra Trạng thái Máy Chủ & Cơ sở dữ liệu (Host & Database Preflight)
- [ ] **Khả năng kết nối máy chủ:** Máy chủ Lightsail phản hồi ping và SSH hoạt động bình thường qua cổng 22.
- [ ] **Dung lượng tài nguyên máy chủ:**
  - Dung lượng RAM khả dụng $\ge 800\text{ MB}$ (`free -m`).
  - Dung lượng ổ cứng khả dụng $\ge 10\text{ GB}$ (`df -h /`).
- [ ] **Trạng thái Database:** Container `brewlite-prod-db` đang chạy ở trạng thái `healthy`, `pg_isready` trả về `accepting connections`.
- [ ] **Bản sao lưu trước đó (Previous Backup):** Có ít nhất 01 tệp sao lưu `.sql` hợp lệ trong thư mục `/home/ubuntu/app/backups/` có cả header và completion footer `-- PostgreSQL database dump complete`.
- [ ] **Baseline Rollback:** Xác nhận digest của container đang chạy để làm điểm tựa quay lui khẩn cấp.

---

## 2. Giai Đoạn 2: Thực Thi Phát Hành Có Kiểm Soát (Release Execution Phase - Phase 0)

Thực hiện các bước theo đúng trình tự kỹ thuật:

### A. Kích hoạt Workflow Dispatch
- [ ] Điều hướng tới giao diện **Actions** -> Chọn workflow **Continuous Delivery & Deployment**.
- [ ] Bấm **Run workflow**:
  - Chọn branch: `main`
  - Trường `Deployment target environment`: Chọn `production`
  - Trường `confirm_production`: Nhập chính xác chuỗi `DEPLOY_PRODUCTION`
- [ ] Xác nhận lệnh chạy.

### B. Ký Duyệt Cổng Phê Duyệt (Approval Gate Sign-off)
- [ ] Reviewer được chỉ định nhận thông báo yêu cầu phê duyệt triển khai môi trường `production`.
- [ ] Reviewer đối chiếu:
  - Commit SHA đang chạy có trùng khớp với release plan không.
  - Người kích hoạt workflow có phải là Release Manager được ủy quyền không.
- [ ] Bấm nút **Approve and deploy** trên giao diện GitHub Actions.

### C. Giám sát Luồng Triển Khai Tự Động (Runner Stream Monitoring)
Theo dõi log từng bước thực thi trong job `deploy-production`:
- [ ] **Step 1: Prerequisites Check:** Xác nhận thông báo `✔ All production prerequisites, secrets, and known_hosts fingerprints verified.` Đảm bảo `DOMAIN` là 1 hostname duy nhất.
- [ ] **Step 2: Compose Descriptors Validation:** `docker-compose.prod.yml` hợp lệ, không có lỗi phân tích cú pháp.
- [ ] **Step 3: SSH Connection:** Kết nối thành công tới máy chủ qua `LIGHTSAIL_SSH_KNOWN_HOSTS`.
- [ ] **Step 4: Environment Synchronization:** Bí mật môi trường được truyền an toàn qua base64 stdin và ghi vào `/home/ubuntu/app/.env` với quyền `0600`.
- [ ] **Step 5: Pre-Deployment Backup:** Script `scripts/backup-db.mjs` chạy thành công, tạo tệp backup mới có kích thước $> 0$ và chứa chữ ký kết thúc `-- PostgreSQL database dump complete`.
- [ ] **Step 6: Image Pull:** Kéo thành công hai image `brewlite-api` và `brewlite-web` mới từ GHCR.
- [ ] **Step 7: Database Migration:** Container migration thực thi `dist/prepare-database.js migrate`, áp dụng thành công các migration mới (hoặc báo 0 migration nếu schema đã cập nhật).
- [ ] **Step 8: Rolling Container Update:** `docker compose -f docker-compose.prod.yml up -d --remove-orphans` khởi chạy thành công các container mới.
- [ ] **Step 9: Production Smoke Test:** Script `scripts/smoke-test.mjs` nhận đúng một URL HTTPS duy nhất (`https://$DOMAIN`), thực hiện 4/4 phép thử qua HTTPS công khai và trả về exit code 0.

---

## 3. Giai Đoạn 3: Nghiệm Thu Sau Phát Hành (Post-Release Verification Phase - Phase +1)

Thực hiện kiểm tra từ mạng Internet bên ngoài máy chủ trong vòng 5 phút sau khi deploy hoàn tất:

### A. Kiểm tra Endpoint Nghiệp Vụ Công Khai
- [ ] **Trang Thực Đơn (`GET /menu`):** Truy cập `https://<DOMAIN>/menu`, giao diện hiển thị danh mục sản phẩm, hình ảnh, giá bán và nút tùy chọn size/topping không bị lỗi Hydration.
- [ ] **Endpoint Kiểm tra Sức khỏe (`GET /api/health`):** Phản hồi HTTP 200 trong vòng $< 100\text{ ms}$, trả về đúng định dạng JSON:
  ```json
  {"status":"ok","database":"up"}
  ```
- [ ] **Endpoint Danh mục Sản phẩm (`GET /api/products`):** Phản hồi HTTP 200, danh sách sản phẩm khớp với dữ liệu thực tế trong PostgreSQL.
- [ ] **Tên miền phụ (Domain Alias):** Truy cập `https://swe-brewlite.54-255-241-1.sslip.io/api/health` phản hồi HTTP 200 và chứng chỉ TLS hợp lệ.

### B. Kiểm tra Chứng chỉ Số & Bảo Mật (TLS & Security Inspection)
- [ ] **Chứng chỉ TLS:** Trình duyệt hiển thị ổ khóa an toàn, chứng chỉ do Let's Encrypt cấp, còn hiệu lực $\ge 60\text{ ngày}$, SAN chứa đầy đủ tên miền chính và tên miền phụ.
- [ ] **Chuyển hướng HTTP sang HTTPS:** Truy cập qua giao thức `http://<DOMAIN>` tự động chuyển hướng HTTP 308 sang `https://<DOMAIN>`.
- [ ] **Header an toàn:** Kiểm tra phản hồi có chứa các tiêu đề bảo mật:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`

### C. Kiểm tra Nhật Ký & Ứng Dụng (Application & Reverse Proxy Logs)
- [ ] **Nhật ký Caddy:** Không có dòng log nào ghi nhận HTTP status 502 (Bad Gateway), 503 (Service Unavailable) hoặc 504 (Gateway Timeout).
- [ ] **Nhật ký API Backend:** Không có ngoại lệ chưa được xử lý (`UnhandledPromiseRejection`, `Fatal Exception`, `Error: Connection refused`).
- [ ] **Số lần khởi động lại (RestartCount):** Tất cả container có `RestartCount = 0` sau 5 phút triển khai.

---

## 4. Điều Kiện Kích Hoạt Dừng Khẩn Cấp & Quay Lui (Abort & Rollback Triggers)

Nếu xảy ra bất kỳ điều kiện nào dưới đây, **LẬP TỨC DỪNG PHÁT HÀNH VÀ KÍCH HOẠT QUAY LUI (ROLLBACK)**:

| Mã Kích Hoạt | Sự Kiện Phát Sinh | Hành Động Xử Lý Tự Động / Thủ Công |
|:---:|---|---|
| **TR-01** | **Smoke Test thất bại (HTTP != 200)** sau khi khởi chạy container mới | Pipeline tự động kích hoạt `scripts/rollback.mjs`, hoàn trả container về image tag phiên bản trước đã lưu trong `.deployment-state.json`. |
| **TR-02** | **Migration thất bại (Exit code != 0)** trong quá trình nâng cấp schema | Pipeline dừng ngay lập tức trước khi cập nhật container; dữ liệu được giữ nguyên và rollback image nếu đã pull. |
| **TR-03** | **Sao lưu cơ sở dữ liệu thất bại** trước khi deploy | Pipeline dừng ngay lập tức (Fail-Closed); tuyệt đối không chạy migration khi chưa có bản backup an toàn có đủ header và completion footer. |
| **TR-04** | **Lỗi xác thực Host SSH (`known_hosts` mismatch)** | Pipeline hủy phiên SSH ngay lập tức; không tự động ghi đè fingerprint máy chủ để chống tấn công Man-In-The-Middle. |
| **TR-05** | **Container rơi vào vòng lặp khởi động lại (CrashLoopBackOff)** | Người phụ trách phát hành SSH vào máy chủ và thực thi thủ công: `node scripts/rollback.mjs`. |
| **TR-06** | **Chứng chỉ TLS Caddy không cấp được** (Quá giới hạn Rate Limit ACME) | Khôi phục cấu hình tên miền cũ và restart Caddy để phục hồi kết nối. |

---

## 5. Biên Bản Ký Tên Nghiệm Thu Phát Hành (Sign-off Signatures)

- **Người phụ trách phát hành (Release Manager):** ____________________ (Ngày: ____/____/2026)
- **Kỹ sư vận hành (DevOps Engineer):** ____________________ (Ngày: ____/____/2026)
- **Đại diện Đảm bảo chất lượng (QA Lead):** ____________________ (Ngày: ____/____/2026)
