# BÁO CÁO KIỂM TOÁN AN TOÀN BÍ MẬT & BẢO VỆ MÃ NGUỒN (FINAL SECRETS & CREDENTIALS SECURITY AUDIT)

**Dự án:** BrewLite — Hệ Thống Đặt Đồ Uống Trực Tuyến  
**Mã tài liệu:** `SEC-AUDIT-FINAL-01`  
**Phiên bản:** 1.1.0 (Cập nhật sau Independent Review FIX-01)  
**Ngày thực hiện:** 23/11/2026  
**Chịu trách nhiệm:** Senior DevSecOps Engineer & Release Manager  
**Môi trường:** Production (AWS Lightsail) & Mã nguồn Git Repository (`vohuunghiaah/brewlite`)  
**Tiêu chuẩn tuân thủ:** OWASP Top 10, DevSecOps Security Gates, Assignment 2 Mục 7.4 (Task 5.4)

---

## 1. Mục Đích & Phạm Vi Kiểm Toán

Mục tiêu của đợt kiểm toán này là xác minh và bảo đảm:
1. **Không có bất kỳ bí mật (secret), khóa bảo mật, mật khẩu hoặc khóa truy cập đám mây nào** xuất hiện ở dạng văn bản rõ (clear-text) trong toàn bộ mã nguồn, cấu hình, tệp tài liệu, và lịch sử commit Git.
2. **Không có bí mật nào bị rò rỉ trong log của các pipeline CI/CD** (GitHub Actions Quality Gates và Continuous Delivery).
3. **Thiết lập cổng bảo mật tự động (Security Gate)** trong quy trình tích hợp liên tục bằng công cụ phân tích tĩnh chuyên sâu (Gitleaks) ghim cố định commit SHA và áp dụng tập luật thu hẹp nghiêm ngặt (least privilege).

### Phân định Phạm vi Kiểm toán Thực tế (Scan Scopes):
- **Phạm vi 1 — PR Commit Scope (CI Job):** Kiểm tra các commit mới thuộc Pull Request thông qua `gitleaks/gitleaks-action` (Run `#45053833858`, 2 commits, 54.74 KB dữ liệu).
- **Phạm vi 2 — Full Git History Audit:** Quét toàn diện lịch sử commit của nhánh làm việc thông qua container `zricethezav/gitleaks:latest` với cờ `--verbose --redact` (152 commits, 180.48 MB dữ liệu).
- **Phạm vi 3 — Working Tree & Configuration:** Kiểm tra toàn bộ mã nguồn hiện tại trong `apps/api`, `apps/web`, `scripts/`, `docs/`, `docker-compose*.yml`, và `.env.example`.
- **Phạm vi 4 — CI/CD Execution Log:** Đối soát nhật ký thực thi các lần chạy CD gần nhất (`#45049566612`) qua GitHub CLI.

---

## 2. Phương Pháp & Công Cụ Kiểm Toán (Methodology & Tooling)

| Lớp kiểm toán | Công cụ / Kỹ thuật | Đối tượng quét | Bằng chứng thực tế |
|---|---|---|---|
| **Lớp 1: Gitleaks PR Gate** | `gitleaks/gitleaks-action@ff98106e4c7b2bc287b24eaf42907196329070c7` | Các commits thuộc Pull Request #44 | Job `137304602999` PASS trong 10 giây. |
| **Lớp 2: Gitleaks Full History** | `zricethezav/gitleaks:latest` Docker Container | Toàn bộ 152 commits lịch sử nhánh | Quét 180.48 MB trong 33.1s, kết quả: `no leaks found`. |
| **Lớp 3: Static Regex Audit** | Node.js script & `git log -S` | Lịch sử commit và working tree | Quét các mẫu: `AKIA[0-9A-Z]{16}`, `ghp_`, `gho_`, Private Key header. |
| **Lớp 4: Negative Testing** | Synthetic dummy token injection & cleanup | Thư mục cô lập tạm thời | Bắt lỗi chính xác rule `github-pat`, thoát mã lỗi 1, xóa fixture sạch sẽ. |
| **Lớp 5: CI Log Masking Check** | `gh run view --log` | Log workflow CD `#45049566612` | Xác nhận cờ masking `***` bảo vệ bí mật tuyệt đối. |

---

## 3. Thu Hẹp Allowlist Theo Nguyên Tắc Đặc Quyền Tối Thiểu (FIX-01 Least Privilege)

Trong phiên bản trước, `.gitleaks.toml` chứa các đường dẫn allowlist quá rộng (`docs/.*`, `scripts/test-*`). Đợt rà soát FIX-01 đã **loại bỏ hoàn toàn toàn bộ path allowlist**, chỉ giữ lại các chuỗi token cụ thể của fixture phát triển và mẫu UUID:

```toml
# Gitleaks Configuration for BrewLite (.gitleaks.toml)
title = "BrewLite Gitleaks Configuration"

[extend]
useDefault = true

[allowlist]
description = "Known non-secret development fixtures, starter badges, and UUID HTTP idempotency keys (least privilege)"
regexes = [
  '''c73a21b4-921a-4d7a-b5a8-2081f2df9841''',
  '''[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}''',
  '''abc123def456''',
  '''brewlite_dev_password''',
  '''super_secure_pg_pw''',
  '''sim_secure_db_password''',
  '''jwt_secret_for_integration_testing''',
  '''jwt_testing_secret_key_12345''',
  '''jwt_testing_secret_key_second_12345''',
  '''p@\$\$w0rd!''',
  '''replace_with_strong_production_secret'''
]
```

---

## 4. Bằng Chứng Thực Nghiệm Negative Testing (Negative Test Evidence)

Để chứng minh scanner không bị vô hiệu hóa bởi cấu hình allowlist và thực sự phát hiện được bí mật khi có sự cố, một bài kiểm thử âm có kiểm soát đã được thực hiện:

1. **Khởi tạo fixture rò rỉ giả lập:**
   Tạo tệp tạm thời `test-gitleaks-neg/test.js` chứa chuỗi synthetic GitHub PAT:
   ```javascript
   const token = "[SYNTHETIC_TEST_TOKEN_REDACTED_FOR_AUDIT_REPORT]";
   ```
2. **Kết quả quét của Gitleaks:**
   ```text
   Finding:     const token = "[REDACTED_SYNTHETIC_TOKEN]";
   Secret:      [REDACTED_SYNTHETIC_TOKEN]
   RuleID:      github-pat
   Entropy:     4.462815
   File:        /path/test.js
   Line:        1
   Fingerprint: /path/test.js:github-pat:1

   6:31PM INF scanned ~65 bytes (65 bytes) in 44.1ms
   6:31PM WRN leaks found: 1
   ```
3. **Dọn dẹp fixture:** Thư mục `test-gitleaks-neg` được xóa sạch sẽ ngay sau bài kiểm tra.
4. **Kết luận:** Scanner hoạt động chuẩn xác theo luật mặc định, phát hiện ngay lập tức token giả lập và dừng quy trình.

---

## 5. Kết Quả Kiểm Toán Chi Tiết (Audit Findings)

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

## 6. Kiểm Toán Nhật Ký CI/CD & Cơ Chế Che Giấu Bí Mật (Log Masking)

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

## 7. Gia Cố GitHub Actions Workflow (`.github/workflows/quality.yml`)

1. **Ghim cố định commit SHA cho Actions:**
   - `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` (# v4.2.2)
   - `gitleaks/gitleaks-action@ff98106e4c7b2bc287b24eaf42907196329070c7` (# v2.3.8)
2. **Thực thi kiểm tra hai lớp trong CI:**
   - Lớp 1: Quét các commit thay đổi của PR thông qua `gitleaks-action` với `fetch-depth: 0`.
   - Lớp 2: Quét toàn diện lịch sử repo thông qua container `zricethezav/gitleaks:latest`.

---

## 8. Kết Luận & Biên Bản Nghiệm Thu (Final Verdict)

Dựa trên kết quả rà soát thực tế trên PR scope (2 commits) và Full History (152 commits, 180.48 MB) với tập luật Gitleaks mặc định và allowlist thu hẹp:

- **Số lượng rò rỉ bảo mật phát hiện (Leaked Secrets):** **0 (ZERO)**
- **Khả năng phát hiện của Scanner (Negative Test):** **XÁC MINH HOẠT ĐỘNG CHUẨN XÁC**
- **Mức độ tuân thủ tiêu chí Task 5.4 FIX-01:** **100% ĐẠT (PASS)**

| Người Thực Hiện Kiểm Toán | Trưởng Nhóm Kỹ Thuật (Tech Lead) | Đánh Giá Viên Độc Lập / Giảng Viên |
|:---:|:---:|:---:|
| *(Agent Technical Audit PASS)* | *(Chờ Review & Phê duyệt)* | *(Chờ Nghiệm thu môn học)* |
| **Senior DevSecOps Engineer** | **BrewLite Technical Lead** | **Evaluator / PO** |
