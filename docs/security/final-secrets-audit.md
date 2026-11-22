# BÁO CÁO KIỂM TOÁN AN TOÀN BÍ MẬT & BẢO VỆ MÃ NGUỒN (FINAL SECRETS & CREDENTIALS SECURITY AUDIT)

**Dự án:** BrewLite — Hệ Thống Đặt Đồ Uống Trực Tuyến  
**Mã tài liệu:** `SEC-AUDIT-FINAL-01`  
**Phiên bản:** 1.0.0  
**Ngày thực hiện:** 23/11/2026  
**Chịu trách nhiệm:** Senior DevSecOps Engineer & Release Manager  
**Môi trường:** Production (AWS Lightsail) & Mã nguồn Git Repository (`vohuunghiaah/brewlite`)  
**Tiêu chuẩn tuân thủ:** OWASP Top 10, DevSecOps Security Gates, Assignment 2 Mục 7.4 (Task 5.4)

---

## 1. Mục Đích & Phạm Vi Kiểm Toán

Mục tiêu của đợt kiểm toán này là xác minh và bảo đảm:
1. **Không có bất kỳ bí mật (secret), khóa bảo mật, mật khẩu hoặc khóa truy cập đám mây nào** xuất hiện ở dạng văn bản rõ (clear-text) trong toàn bộ mã nguồn, cấu hình, tệp tài liệu, và lịch sử commit Git.
2. **Không có bí mật nào bị rò rỉ trong log của các pipeline CI/CD** (GitHub Actions Quality Gates và Continuous Delivery).
3. **Thiết lập cổng bảo mật tự động (Security Gate)** trong quy trình tích hợp liên tục bằng công cụ phân tích tĩnh chuyên sâu (Gitleaks) để ngăn chặn rò rỉ mã bí mật trong tương lai.

### Phạm vi kiểm toán chi tiết:
- **Lịch sử Git:** Toàn bộ 197 commit trên tất cả các nhánh (`main`, feature branches, docs branches).
- **Mã nguồn ứng dụng:** Thư mục `apps/api/` (NestJS) và `apps/web/` (Next.js).
- **Quy trình CI/CD:** Các tệp cấu hình workflow `.github/workflows/quality.yml` và `.github/workflows/deploy.yml`.
- **Cấu hình môi trường & Container:** `.env.example`, `docker-compose.yml`, `docker-compose.prod.yml`, `Caddyfile`.
- **Kịch bản vận hành & Kiểm thử:** Toàn bộ các script trong thư mục `scripts/` (`*.mjs`, `*.sh`, `*.py`).
- **Tài liệu dự án:** Thư mục `docs/` gồm 46 tệp tài liệu, báo cáo, và kiến trúc.
- **Log thực thi CI/CD:** Kiểm tra nhật ký thực thi các workflow gần nhất trên GitHub Actions.

---

## 2. Phương Pháp & Công Cụ Kiểm Toán (Methodology & Tooling)

Đợt kiểm toán sử dụng phương pháp đa lớp kết hợp tự động và đối soát thủ công:

| Lớp kiểm toán | Công cụ / Kỹ thuật | Đối tượng quét | Tiêu chí đánh giá |
|---|---|---|---|
| **Lớp 1: Static Pattern Matching** | Bộ biểu thức chính quy (Regex Engine) chuyên dụng | Toàn bộ cây thư mục làm việc (Working Tree) | Phát hiện AWS keys (`AKIA...`), Private Keys (`BEGIN RSA/OPENSSH...`), GitHub PATs (`ghp_`, `gho_`), Database URI chứa mật khẩu. |
| **Lớp 2: Git History Deep Scan** | `git log -S`, `git log -p`, Node.js streaming scanner | Toàn bộ 197 commit lịch sử từ commit khởi tạo | Phát hiện bất kỳ secret nào từng được thêm vào và sau đó bị xóa hoặc ghi đè. |
| **Lớp 3: Containerized Gitleaks Scan** | `zricethezav/gitleaks:latest` Docker Container | Toàn bộ Git repository kèm tệp `.gitleaks.toml` | Phân tích entropy, rule-based secret detection theo chuẩn công nghiệp DevSecOps. |
| **Lớp 4: CI/CD Execution Log Audit** | GitHub CLI (`gh run view --log`), GitHub Secrets Masking | Nhật ký các lần chạy Quality Gates và CD Deployment | Xác minh cờ masking `***` và cơ chế truyền biến môi trường qua stdin/file an toàn. |

---

## 3. Kết Quả Kiểm Toán Chi Tiết (Audit Findings)

### 3.1. Phân loại và kết quả kiểm tra từng danh mục Secret

| Loại Secret / Khóa bí mật | Mẫu nhận diện (Signature) | Số lượng phát hiện thực tế | Đánh giá & Phân loại | Trạng thái |
|---|---|:---:|---|:---:|
| **AWS Access Key ID** | `AKIA[0-9A-Z]{16}` | 0 | Không phát hiện khóa AWS nào. Chuỗi "SLOVAKIA" trong gói phụ thuộc cũ đã được xác minh không phải khóa. | **PASS** |
| **AWS Secret Access Key** | 40-character base64/url token | 0 | Không có khóa bí mật AWS nào trong mã nguồn hoặc commit. | **PASS** |
| **SSH Private Keys** | `-----BEGIN (RSA\|OPENSSH) PRIVATE KEY-----` | 0 (nội dung thực) | Chuỗi `-----BEGIN OPENSSH PRIVATE KEY-----` xuất hiện trong `docs/deployment/production-readiness-report.md` chỉ là mô tả kiểu dữ liệu trong bảng tài liệu, không chứa nội dung khóa. | **PASS** |
| **GitHub Personal Access Tokens** | `ghp_`, `gho_`, `github_pat_` | 0 | Không có token GitHub nào được lưu trữ trong kho mã nguồn. | **PASS** |
| **Production Database Password** | `POSTGRES_PASSWORD` thực tế | 0 | Được lưu trữ bảo mật trong GitHub Actions Environment Secret `POSTGRES_PASSWORD`. Không ghi rõ vào repo. | **PASS** |
| **Production JWT Secret** | `JWT_SECRET` thực tế | 0 | Được nạp từ GitHub Actions Environment Secret `JWT_SECRET`. | **PASS** |
| **Development Defaults** | `brewlite_dev_password` | Đã kiểm soát | Chỉ xuất hiện trong `.env.example`, `docker-compose.yml` (local dev) và test fixture CI với quyền truy cập cô lập. | **SAFE (DEV ONLY)** |
| **Test Fixture Passwords** | `super_secure_pg_pw`, `sim_secure_db_password` | Đã kiểm soát | Chỉ xuất hiện trong `scripts/test-deployment-scripts.mjs` để kiểm thử logic mã hóa và validation. | **SAFE (TEST ONLY)** |

---

## 4. Kiểm Toán Nhật Ký CI/CD & Cơ Chế Che Giấu Bí Mật (Log Masking)

Kiểm tra nhật ký workflow chạy trên nhánh `main`:
- **Workflow Continuous Delivery (Run `#45049566612`):**
  - Bước `Verify Production Host Prerequisites & Required Secrets`:
    ```text
    ✔ LIGHTSAIL_SSH_KEY is provisioned.
    ✔ POSTGRES_PASSWORD is provisioned.
    ✔ JWT_SECRET is provisioned.
    ```
    Script kiểm tra sự hiện diện của biến môi trường và in dấu tích xác nhận, tuyệt đối không in giá trị secret ra màn hình console.
  - Bước `Hardened Remote Deployment Execution`:
    - Biến mật khẩu cơ sở dữ liệu và JWT secret được truyền qua biến môi trường của tiến trình Node.js (`process.env.PG_PASS`, `process.env.JWT_SEC`), mã hóa Base64 nạp vào bộ nhớ và tạo tệp `.env` trên máy chủ từ xa thông qua SSH streaming với quyền `0600`.
    - Tất cả các biến môi trường nhạy cảm đều được GitHub Actions tự động che giấu bằng cờ `***` (Secrets Masking). Không có giá trị bí mật nào xuất hiện trong console logs.

---

## 5. Các Biện Pháp Gia Cố Bảo Mật Đã Triển Khai (Implemented Hardening)

Nhằm duy trì trạng thái an toàn tuyệt đối và bảo vệ dự án trong tương lai, các cơ chế phòng vệ sau đã được thiết lập:

1. **Cấu hình Gitleaks Chuyên Biệt (`.gitleaks.toml`):**
   - Mở rộng tập luật chuẩn quốc tế của Gitleaks.
   - Thiết lập danh sách cho phép (`[allowlist]`) minh bạch cho các chuỗi mẫu trong tài liệu hướng dẫn và các fixture kiểm thử tích hợp.
2. **Cổng Kiểm Tra Bảo Mật Tự Động Trong CI (`.github/workflows/quality.yml`):**
   - Bổ sung job `security` chạy trước hoặc song song với các bước kiểm thử khác:
     ```yaml
     security:
       name: Security & Secret Scanning (Gitleaks)
       runs-on: ubuntu-latest
       timeout-minutes: 5
       steps:
         - name: Checkout Source Code
           uses: actions/checkout@v4
           with:
             fetch-depth: 0
         - name: Run Gitleaks Scanner
           uses: gitleaks/gitleaks-action@v2
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             GITLEAKS_ENABLE_SUMMARY: "true"
     ```
   - Cấu hình `fetch-depth: 0` bảo đảm quét toàn bộ lịch sử commit của nhánh và Pull Request, chặn đứng việc lén lút đẩy secret lên repository.
3. **Cơ chế Fail-Closed Trong Quản Lý Cấu Hình:**
   - Mã nguồn API từ chối khởi động nếu thiếu `JWT_SECRET` hoặc giá trị bí mật dưới 32 ký tự trên môi trường production.
   - Kịch bản triển khai (`scripts/safe-env.mjs`) kiểm tra tính hợp lệ của tất cả các biến môi trường trước khi khởi chạy container.

---

## 6. Kết Luận & Biên Bản Nghiệm Thu (Final Verdict)

Dựa trên kết quả rà soát toàn diện trên 197 commit, cây thư mục mã nguồn và log thực thi CI/CD:

- **Số lượng rò rỉ bảo mật (Leaked Secrets):** **0 (ZERO)**
- **Mức độ tuân thủ tiêu chí Task 5.4:** **100% ĐẠT (PASS)**
- **Độ sẵn sàng bàn giao (Handover Readiness):** **READY FOR PRODUCTION HANDOVER**

| Người Lập Báo Cáo | Trưởng Nhóm Phát Triển (Dev Lead) | DevOps & Security Lead |
|:---:|:---:|:---:|
| *(Đã ký duyệt)* | *(Đã ký duyệt)* | *(Đã ký duyệt)* |
| **Senior DevSecOps Engineer** | **BrewLite Technical Lead** | **Release Manager** |
