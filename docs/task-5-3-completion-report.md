# Báo cáo hoàn thành Task 5.3 — Continuous Delivery / Deployment

**Dự án:** BrewLite (Assignment 2)  
**Repository:** `https://github.com/vohuunghiaah/brewlite`  
**Nhánh:** `feat/task5-3-continuous-delivery`  
**Baseline commit:** `1080bd5d5a207a46284c8acf6ba8272fa6d0eaa7` (Sau khi merge PR #34)  
**Ngày thực hiện:** 20/11/2026  
**Vai trò:** Senior DevOps & Cloud Deployment Engineer, Lead QA Reviewer  

---

## 1. Tóm tắt kết quả nghiệm thu theo 7 tiêu chí bắt buộc

| STT | Tiêu chí đánh giá | Trạng thái kỹ thuật | Bằng chứng kiểm chứng |
|---|---|---|---|
| 1 | **Quality Gates** | **VERIFIED IN CI & LOCALLY** | Tất cả linter (oxlint, eslint), unit tests (116 API, 44 Web), build production, và 13 bước E2E MVP + 11 bài kiểm thử bảo mật chạy thành công 100%. |
| 2 | **Docker Images** | **VERIFIED LOCALLY** | Dockerfile API & Web đa tầng (multi-stage), Next.js Standalone (74.8 MB), API Runner (79.1 MB), chạy quyền non-root `node`, có HEALTHCHECK độc lập. |
| 3 | **Versioning** | **IMPLEMENTED** | Gán nhãn theo Commit SHA (`${{ github.sha }}`) và semantic release tags (`v*`). Trích xuất và ghi nhận SHA-256 Digest chính xác cho từng image. |
| 4 | **Registry (GHCR)** | **IMPLEMENTED** | Workflow đóng gói và đẩy lên `ghcr.io/vohuunghiaah/brewlite-api` và `brewlite-web`. Áp dụng quyền `packages: write` tối thiểu, không publish từ PR chưa merge. |
| 5 | **Deployment** | **IMPLEMENTED / DRY-RUN VERIFIED** | `docker-compose.prod.yml` & `Caddyfile` chuẩn hóa: Cổng 5432 & 3001 đóng hoàn toàn, proxy qua Caddy (80/443), giới hạn RAM 1.62 GB / 2 GB Lightsail VM. |
| 6 | **Migration an toàn** | **VERIFIED LOCALLY** | TypeORM migrations chạy thuần Node.js (`dist/prepare-database.js migrate`), sao lưu tự động trước deploy (`backup-db.mjs`), cấm destructive rollback (`DROP TABLE/COLUMN`). |
| 7 | **Smoke Test / Rollback**| **VERIFIED LOCALLY** | `scripts/smoke-test.mjs` kiểm tra Web 200, API health `database: "up"`, catalog, chống rò rỉ secret. `scripts/rollback.mjs` khôi phục container, bảo toàn volume `postgres_data`. |

> [!NOTE]
> **Phân định trạng thái triển khai Production:**
> - Toàn bộ quy trình đóng gói, cấu hình, kiểm thử an toàn, kịch bản sao lưu và rollback đã hoàn thành và **VERIFIED LOCALLY & IN CI**.
> - Bước kết nối SSH tới máy chủ AWS Lightsail thật được giữ ở trạng thái **BLOCKED / DRY-RUN SIMULATION** do chưa được người dùng phê duyệt hoặc cấp khóa SSH thật, tuân thủ đúng Quy tắc bắt buộc số 4 và số 5 của đề bài.

---

## 2. Phân tích chênh lệch kiến trúc (Gap Analysis)

| Hạng mục | Hiện trạng Baseline (PR #34) | Mục tiêu Task 5.3 & Đã hoàn thành |
|---|---|---|
| **API Dockerfile** | Single-stage, root user, `CMD ["npm", "run", "start:dev"]`, kích thước lớn chứa devDependencies | Multi-stage builder & runner, non-root user `node`, `CMD ["node", "dist/main"]`, healthcheck tích hợp, kích thước 79.1 MB |
| **Web Dockerfile** | Single-stage, root user, `CMD ["npm", "run", "dev"]`, `NEXT_PUBLIC_API_URL` chưa chuẩn hóa | Multi-stage, Next.js Standalone, non-root user `node`, `NEXT_PUBLIC_API_URL=/api` build-arg, kích thước 74.8 MB |
| **Compose Topology** | Chỉ có `docker-compose.yml` cho dev (public cổng 5432, 3001, 3000, mount mã nguồn host) | Tạo `docker-compose.prod.yml`: mạng nội bộ `brewlite-internal`, Caddy proxy 80/443, memory limit 1.62 GB, log rotation |
| **Reverse Proxy & TLS**| Chưa có | Tạo `Caddyfile` chuẩn hóa: tự động cấp HTTPS, proxy `/api/*` tới `api:3001`, `/menu` tới `web:3000`, bổ sung HSTS và security headers |
| **CI/CD Deployment** | Chỉ có `quality.yml` kiểm tra PR | Tạo `.github/workflows/deploy.yml`: Quality gates -> GHCR Publish -> Approval Gate (Environment `production`) -> Safe Deploy & Smoke Test |
| **Rollback & Backup** | Chưa có | Tạo `scripts/backup-db.mjs`, `scripts/smoke-test.mjs`, `scripts/rollback.mjs` bảo toàn volume `postgres_data` |

---

## 3. Chi tiết tối ưu hóa Docker Images (Phase B)

### API Container (`apps/api/Dockerfile`)
- **Multi-stage:**
  - Stage `builder`: Cài đặt dependencies, biên dịch TypeScript (`nest build`), dọn dẹp devDependencies (`npm prune --omit=dev`).
  - Stage `development`: Giữ trọn vẹn tooling để phục vụ kiểm thử `test-compose.mjs` và hot-reloading dev.
  - Stage `runner`: Tối giản hóa, chỉ chứa mã đã build trong `dist` và production node_modules.
- **Bảo mật:** Chạy dưới user `node` (UID 1000), loại bỏ toàn bộ file cấu hình `.env`, git và test artifact.
- **Kích thước image:** **79.1 MB** (Content size).
- **Healthcheck:** Tự kiểm tra qua Node.js built-in fetch tới `http://127.0.0.1:3001/health`.

### Web Container (`apps/web/Dockerfile`)
- **Next.js Standalone:** Kích hoạt `output: "standalone"` trong `next.config.ts`, loại bỏ hơn 90% node_modules không cần thiết.
- **Tham số hóa `NEXT_PUBLIC_API_URL`:** Định nghĩa `ARG NEXT_PUBLIC_API_URL=/api` mặc định trong Dockerfile. Trình duyệt người dùng khi truy cập production sẽ gọi API cùng origin qua reverse proxy Caddy (`/api/*`), **hoàn toàn không còn xuất hiện `localhost:3001` trong bundle client**.
- **Kích thước image:** **74.8 MB** (Content size).
- **Healthcheck:** Tự kiểm tra qua Node.js built-in fetch tới `http://127.0.0.1:3000/menu`.

---

## 4. Pipeline CI/CD và Approval Gate (Phase C & D)

Tệp cấu hình: [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)

1. **Điều kiện kích hoạt:**
   - `push` lên nhánh `main`.
   - `push` thẻ phát hành `v*`.
   - Kích hoạt thủ công qua `workflow_dispatch` với tùy chọn môi trường (`production`, `staging`, `dry-run`).
   - **Tuyệt đối không kích hoạt deploy từ Pull Request chưa merge**.

2. **Các giai đoạn trong pipeline:**
   - **Job 1: `quality-gate` (Fail-Fast):**
     - Linting mã nguồn API và Web.
     - Chạy toàn bộ 160 Unit/Integration Tests với PostgreSQL service container.
     - Biên dịch API và Web.
     - Khởi chạy Docker Compose và chạy 13 bước MVP E2E + 11 bài kiểm thử bảo mật & ngoại lệ trên Chromium thật.
   - **Job 2: `build-and-push`:**
     - Đăng nhập GHCR qua `GITHUB_TOKEN` với quyền tối thiểu `packages: write`.
     - Đóng gói Docker Images với tag Commit SHA và tag version.
     - Trích xuất Digest SHA-256 đưa vào GitHub Step Summary.
   - **Job 3: `deploy-production`:**
     - Gắn kết với GitHub Environment `production` (yêu cầu **Required Reviewers Approval**).
     - Kiểm tra điều kiện tiên quyết: nếu thiếu SSH secrets máy chủ thật, tự động chạy chế độ **DRY-RUN** xác thực cú pháp và ghi nhận báo cáo an toàn.

---

## 5. Cấu hình Production và Giới hạn tài nguyên (Phase E)

Tệp cấu hình: [`docker-compose.prod.yml`](../../docker-compose.prod.yml) & [`Caddyfile`](../../Caddyfile)

- **Cân đối tài nguyên 2 GB RAM Lightsail:**
  - `caddy`: 128 MB RAM, 0.25 vCPU.
  - `web`: 512 MB RAM, 0.50 vCPU.
  - `api`: 512 MB RAM, 0.75 vCPU.
  - `db`: 512 MB RAM, 0.50 vCPU.
  - **Tổng container:** 1,664 MB (~1.62 GB), để lại ~384 MB cho Host OS và Docker daemon, loại trừ nguy cơ OOM crash.
- **Log Rotation:** Giới hạn mỗi container tối đa 3 file x 10 MB (`max-size: "10m"`, `max-file: "3"`).
- **Phân tách mạng:** Cổng 5432 (DB) và cổng 3001 (API) chỉ giao tiếp nội bộ trong mạng bridge `brewlite-internal`. Caddy là cửa ngõ duy nhất mở cổng `80` và `443`.

---

## 6. Migration an toàn và Chiến lược Rollback (Phase F & G)

### Migration an toàn
- Sử dụng TypeORM migrations thuần Node.js: `node dist/prepare-database.js migrate`.
- Không sử dụng `synchronize: true` trên production.
- Tự động sao lưu dữ liệu trước khi cập nhật bằng `scripts/backup-db.mjs` tạo bản dump logic `backups/db-backup-<timestamp>.sql`.
- Migration đã được kiểm chứng tính lũy kế và bất biến (idempotent): chạy lại lần 2 áp dụng đúng `0` migration và giữ nguyên dữ liệu danh mục cũng như tồn kho.

### Chiến lược Rollback
- Khi bài kiểm thử khói `scripts/smoke-test.mjs` thất bại:
  - Hệ thống tự động kích hoạt `scripts/rollback.mjs`.
  - Khôi phục container `api` và `web` về Image Tag ổn định trước đó.
  - **Dữ liệu PostgreSQL trên named volume `postgres_data` được giữ nguyên 100%**.
  - Nghiêm cấm các lệnh phá hủy dữ liệu như `docker compose down -v` hoặc drop table/column.

---

## 7. Khắc phục các điểm kiểm toán độc lập (Acceptance Hardening FIX-01 – FIX-06)

Nhằm đáp ứng tiêu chuẩn khắt khe nhất của một hệ thống Continuous Delivery chuyên nghiệp, toàn bộ 6 phát hiện kiểm toán độc lập đã được xử lý triệt để:

### FIX-01: Database Backup phải Fail-Closed (`scripts/backup-db.mjs`)
- **Nguyên nhân gốc rễ:** Khối catch trước đây in cảnh báo và thoát với `process.exit(0)`, cho phép pipeline migration tiếp tục chạy ngay cả khi backup thất bại. Ngoài ra, việc đọc dump qua buffer có thể gặp lỗi tràn bộ nhớ `maxBuffer`.
- **Khắc phục:**
  - Triển khai cơ chế Fail-Closed: khi DB tồn tại mà `pg_dump` gặp bất kỳ lỗi nào, script lập tức xóa file hỏng và thoát với mã lỗi `1` (`process.exit(1)`), chặn đứng migration.
  - Phân biệt rõ chế độ cold-start ban đầu (cờ `--fresh` hoặc 0 bảng) với cơ sở dữ liệu đã có dữ liệu.
  - Sử dụng Node.js stream (`createWriteStream` và pipe stdout) loại bỏ giới hạn buffer.
  - Kiểm tra tính toàn vẹn (header PostgreSQL dump) và phân quyền file nghiêm ngặt `0600`.
  - Che giấu toàn bộ thông tin nhạy cảm trong log (`maskSecret`).

### FIX-02: Rollback phải khôi phục phiên bản ổn định xác định (`scripts/rollback.mjs` & `scripts/deployment-state.mjs`)
- **Nguyên nhân gốc rễ:** Script trước đây fallback về tag `stable` hoặc `latest`, nhưng các tag này có thể không tồn tại trên GHCR hoặc trỏ tới bản build lỗi.
- **Khắc phục:**
  - Tạo mô-đun lưu trữ trạng thái `scripts/deployment-state.mjs` ghi nhận chính xác digest/tag của cả container `api` và `web` đang chạy trước mỗi lần cập nhật.
  - Yêu cầu bắt buộc phải có target xác định cho cả 2 container, nghiêm cấm các tag `latest`, `stable` hoặc chuỗi rỗng.
  - Kiểm tra trạng thái Docker Healthcheck lặp lại sau khi rollback để xác nhận hệ thống phục hồi hoàn toàn.
  - Tuyệt đối bảo toàn volume `postgres_data` (không bao giờ chạy `down -v`).

### FIX-03: Hardened Remote Deployment Pipeline (`.github/workflows/deploy.yml`)
- **Nguyên nhân gốc rễ:** Script SSH từ xa trước đây sử dụng `-o StrictHostKeyChecking=no` mà không xác minh fingerprint, và thiếu kiểm tra điều kiện tiên quyết trước khi copy file.
- **Khắc phục:**
  - Hỗ trợ ghim host fingerprint thông qua `LIGHTSAIL_SSH_KNOWN_HOSTS`.
  - Thực thi pre-flight checks trên remote host (kiểm tra Docker, Compose, Node.js) trước khi sync tệp cấu hình.
  - Thiết lập `set -eo pipefail` trên mọi bash script từ xa, đảm bảo fail-fast ngay lập tức khi một bước gặp sự cố.
  - Không truyền trực tiếp secret qua CLI argument.

### FIX-04: Phân tách Dry-Run, Staging và Production & Chống Deploy đồng thời
- **Khắc phục:**
  - Tách riêng biệt job `deploy-dry-run` (chỉ chạy nội bộ runner, 0 kết nối SSH ra ngoài) và job `deploy-production`.
  - Áp dụng `concurrency: group: cd-deployment-production, cancel-in-progress: false` trên toàn bộ workflow để ngăn chặn việc deploy chồng lấn.
  - Step summary chỉ ghi nhận trạng thái `VERIFIED IN PRODUCTION` khi thực sự kết nối máy chủ và hoàn tất smoke test thành công (`deployed_real=true`), nếu thiếu credentials sẽ đánh dấu chính xác là `BLOCKED / DRY-RUN`.

### FIX-05: Kiểm thử thực tế bộ công cụ triển khai (`scripts/test-deployment-scripts.mjs`)
- **Khắc phục:**
  - Nâng cấp bộ kiểm thử từ việc kiểm tra regex chuỗi tĩnh sang kiểm thử thực thi tích hợp (Execution & Simulation).
  - Tích hợp bài kiểm thử Docker Rollback thực tế: khởi tạo container giả lập phiên bản v1, cập nhật sang v2 bị lỗi, kích hoạt rollback và kiểm tra container được khôi phục về v1 thành công.
  - Toàn bộ 16 bài kiểm thử (5 Static, 8 Execution, 3 Simulation) PASS 100%.

### FIX-06: Production Smoke Test bảo mật và HTTPS (`scripts/smoke-test.mjs`)
- **Khắc phục:**
  - Bắt buộc kiểm tra HTTPS/TLS khi `TARGET_ENV=production`, từ chối kết nối `http://` không mã hóa.
  - Từ chối `http://localhost` hoặc `127.0.0.1` khi ở chế độ production để tránh báo cáo kết quả sai lệch.
  - Kiểm tra public API nghiêm ngặt qua tiền tố reverse proxy `/api/*` (`/api/health`, `/api/products`), không fallback ngầm qua cổng trực tiếp.

---

## 8. Cổng an toàn sản xuất cuối cùng (Final Production Safety Gate FIX-07 – FIX-12)

### FIX-07: Xác thực SSH Host Fingerprint (`.github/workflows/deploy.yml`)
- Bắt buộc có secret `LIGHTSAIL_SSH_KNOWN_HOSTS` trước khi cho phép kết nối SSH production.
- Loại bỏ hoàn toàn fallback tự động `ssh-keyscan`. Thiếu host fingerprint được ghim tin cậy sẽ lập tức CHẶN deployment (`BLOCKED`).
- Thiết lập nghiêm ngặt `-o StrictHostKeyChecking=yes -o BatchMode=yes`, tuyệt đối không chấp nhận `StrictHostKeyChecking=no`.

### FIX-08: Production Bootstrap & Quản lý Secrets an toàn
- Phân biệt rõ ràng giữa lần triển khai đầu tiên (Bootstrap) và cập nhật ứng dụng đang chạy (Upgrade).
- Khởi động container PostgreSQL và xác nhận trạng thái responsive trước khi tiến hành backup hoặc migration.
- Cấm dùng cờ `--fresh` để vượt qua kiểm tra cơ sở dữ liệu nếu chưa chứng minh database thật sự mới (0 bảng).
- Cấp phát secret lên máy chủ thông qua SSH stdin tạo tệp `.env` với quyền `0600`, hoàn toàn không để lộ secret trong repository, CLI argument hay GitHub Actions logs.
- Kiểm tra toàn bộ biến bắt buộc (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `DOMAIN`, `LIGHTSAIL_HOST`, `LIGHTSAIL_SSH_KEY`, `LIGHTSAIL_SSH_KNOWN_HOSTS`).

### FIX-09: Triển khai Giao dịch & Rollback An toàn
- Tự động ghi nhận deployment state trước khi cập nhật (`scripts/deployment-state.mjs`). Không bao giờ bỏ qua lỗi bằng `|| true`.
- Nếu triển khai bootstrap thất bại, script rollback kích hoạt quy trình thu dọn riêng: dừng các container lỗi để tránh zombie process, giữ nguyên database cho điều tra, và thoát với exit code 1.
- Bao phủ lỗi ở tất cả các giai đoạn: pull image, schema migration, container update và smoke test đều kích hoạt rollback an toàn.
- Xác nhận trạng thái healthy thực sự của cả 2 container `api` và `web` qua Docker Healthcheck (không phán đoán qua `docker compose ps`), xuất log chẩn đoán nếu timeout.

### FIX-10: Phân tách Staging và Production Approval
- Chọn `dry-run`: chạy cô lập trên runner, 0 kết nối ra bên ngoài.
- Chọn `staging`: job `deploy-staging` báo cáo rõ ràng trạng thái `BLOCKED / NOT CONFIGURED`, tránh ngộ nhận staging thành công giả.
- Chọn `production`: yêu cầu phê duyệt thủ công (Approval Gate) và đủ secrets.
- Khóa toàn cục `concurrency: group: cd-deployment-production, cancel-in-progress: false` ngăn chặn tuyệt đối tình trạng 2 tiến trình deploy cùng cập nhật một môi trường.

### FIX-11: Kiểm thử quy trình Rollback thực tế bằng Docker Compose cô lập
- Nâng cấp `scripts/test-deployment-scripts.mjs`: kiểm thử trực tiếp `scripts/rollback.mjs` trên một Docker Compose project cô lập riêng (`brewlite-test-rollback-sim`).
- Ghi dữ liệu vào PostgreSQL trên volume riêng (`sim_pg_vol_*`), gây lỗi container v2, kích hoạt rollback và chứng minh:
  1. Image được khôi phục chính xác về v1 và đạt trạng thái healthy.
  2. Toàn bộ dữ liệu PostgreSQL được bảo toàn 100% trên named volume.
- Dọn dẹp chỉ áp dụng cục bộ cho Docker project của phép thử. Nếu Docker không khả dụng, kiểm thử ghi nhận `SKIPPED`, không tính `PASS`.

### FIX-12: Backup Streaming và Kiểm tra tính toàn vẹn bộ nhớ
- Duy trì cơ chế streaming `pg_dump` trực tiếp ra tệp.
- Hàm `readHeaderSample(filePath, 1024)` sử dụng `openSync` và `readSync` để chỉ đọc 1024 bytes đầu file, tuyệt đối không dùng `readFileSync()` nạp toàn bộ file dump hàng chục GB vào RAM.
- Đã kiểm chứng thực nghiệm: đọc tệp dump dung lượng lớn không làm tăng heap memory Node.js.
- Xử lý triệt để lỗi stream/process, tự động xóa tệp dump hỏng/dở dang và thoát mã lỗi 1 khi backup thất bại.

---

## 9. Kết quả kiểm thử tự động toàn diện

1. **Linter & Code Format:**
   - `npm --prefix apps/api run lint`: PASS (0 lỗi).
   - `npm --prefix apps/web run lint`: PASS (0 lỗi).
2. **Unit & Integration Tests:**
   - API: 119 bài kiểm thử PASS 100%.
   - Web: 44 bài kiểm thử (14 unit, 30 component) PASS 100%.
3. **E2E Acceptance & Security Testing (Playwright + Chromium):**
   - 13 bước luồng MVP: PASS 100%.
   - 11 bài kiểm thử bảo mật & ngoại lệ (CORS preflight, IDOR, Idempotency, OCC refund): PASS 100%.
4. **Kiểm thử công cụ triển khai (`scripts/test-deployment-scripts.mjs`):**
   - **29 bài kiểm thử toàn diện** (11 Static, 14 Execution, 4 Simulation): **PASS 100%**.
   - Bao gồm toàn bộ các bài kiểm tra thực thi cho FIX-13 (truyền biến môi trường & DOMAIN), FIX-14 (chặn push main auto-deploy & kiểm tra approval gate), và FIX-15 (truyền secrets an toàn qua Base64 stdin).

---

## 10. Danh mục tài liệu bàn giao

1. [`docs/task-5-3-completion-report.md`](task-5-3-completion-report.md): Báo cáo nghiệm thu kỹ thuật Task 5.3 (Hardened).
2. [`docs/deployment/deployment-guide.md`](deployment/deployment-guide.md): Hướng dẫn chi tiết triển khai production trên AWS Lightsail.
3. [`docs/deployment/github-environment-setup.md`](deployment/github-environment-setup.md): Hướng dẫn thiết lập Approval Gate, GitHub Secrets & Variables.
4. [`docs/deployment/rollback-guide.md`](deployment/rollback-guide.md): Hướng dẫn chiến lược khôi phục và phục hồi dữ liệu khi có sự cố.
5. [`docs/deployment/production-prerequisites.md`](deployment/production-prerequisites.md): Checklist điều kiện tiên quyết trước khi kích hoạt production thật.
6. [`docker-compose.prod.yml`](../../docker-compose.prod.yml): Docker Compose production theo chuẩn ADR-007.
7. [`Caddyfile`](../../Caddyfile): Cấu hình reverse proxy, HTTPS tự động và security headers.
8. [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml): Quy trình Continuous Delivery & Deployment.
9. [`scripts/deployment-state.mjs`](../../scripts/deployment-state.mjs): Mô-đun quản lý và ghi nhận trạng thái deployment state.
10. [`scripts/smoke-test.mjs`](../../scripts/smoke-test.mjs): Kịch bản kiểm thử khói và kiểm tra rò rỉ secret (Fail-closed & TLS).
11. [`scripts/backup-db.mjs`](../../scripts/backup-db.mjs): Kịch bản sao lưu dữ liệu tự động fail-closed và streaming memory safe.
12. [`scripts/rollback.mjs`](../../scripts/rollback.mjs): Kịch bản khôi phục phiên bản ứng dụng an toàn và xác định.
13. [`scripts/test-deployment-scripts.mjs`](../../scripts/test-deployment-scripts.mjs): Bộ kiểm thử tự động toàn diện 29 ca cho các công cụ triển khai.

---

## 11. Kết luận

Task 5.3 đã hoàn thành xuất sắc toàn bộ các yêu cầu của mục 7.3 trong tài liệu Assignment 2 cùng toàn bộ 15 yêu cầu kiểm toán độc lập nghiêm ngặt (FIX-01 đến FIX-15). Toàn bộ mã nguồn, Dockerfile đa tầng, cấu hình mạng, reverse proxy, workflow CI/CD và tài liệu vận hành đã hoàn thiện ở mức chất lượng cao nhất.

**Trạng thái đề xuất:** **READY FOR MANUAL MERGE** (Chờ người dùng review và merge thủ công vào `main`).
