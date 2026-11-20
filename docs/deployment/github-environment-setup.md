# Hướng dẫn cấu hình GitHub Secrets và Environments

Tài liệu này hướng dẫn thiết lập môi trường bảo mật, phân quyền GitHub Actions và cấu hình Environment Approval Gate cho BrewLite Task 5.3.

---

## 1. Thiết lập GitHub Environment "production"

Để đảm bảo quy tắc **Approval Gate** (người dùng phải phê duyệt thủ công trước khi kích hoạt triển khai production):

1. Truy cập Repository GitHub: `https://github.com/vohuunghiaah/brewlite/settings/environments`.
2. Bấm **New environment**, nhập tên: `production`.
3. Trong mục **Environment protection rules**:
   - Tích chọn **Required reviewers**.
   - Thêm tài khoản GitHub của Team Lead / Release Manager / PO (ví dụ: `vohuunghiaah`).
   - Tích chọn **Prevent self-review** nếu áp dụng quy trình kiểm soát 4 mắt (four-eyes principle).
   - (Tùy chọn) Đặt **Wait timer**: 0 phút.
4. Trong mục **Deployment branches**:
   - Chọn **Selected branches**.
   - Thêm quy tắc nhánh: `main` và thẻ phiên bản `v*`.

---

## 2. Danh sách GitHub Actions Secrets cần cấu hình

Truy cập `Settings -> Secrets and variables -> Actions`:

> [!CAUTION]
> Tuyệt đối KHÔNG commit mật khẩu, khóa riêng tư hoặc token thật vào mã nguồn Git, tài liệu hoặc pull request. Tất cả các giá trị dưới đây phải được lưu trữ trực tiếp trong GitHub Secrets.

| Tên Secret | Bắt buộc | Mô tả & Định dạng |
|---|---|---|
| `LIGHTSAIL_HOST` | Có (Production) | Địa chỉ IPv4 hoặc DNS công khai của máy chủ AWS Lightsail |
| `LIGHTSAIL_USER` | Có (Production) | Tên người dùng SSH trên máy chủ (mặc định: `ubuntu`) |
| `LIGHTSAIL_SSH_KEY` | Có (Production) | Khóa SSH Private Key tương ứng để đăng nhập vào máy chủ Lightsail (OpenSSH PEM/Ed25519) |
| `LIGHTSAIL_SSH_KNOWN_HOSTS` | Có (Production - Bắt buộc) | Host key fingerprint được ghim trước (chống tấn công Man-In-The-Middle MITM; cấm keyscan tự động) |
| `POSTGRES_USER` | Có | Tên tài khoản quản trị PostgreSQL (ví dụ: `brewlite_admin`) |
| `POSTGRES_PASSWORD` | Có | Mật khẩu cơ sở dữ liệu độ phức tạp cao (tối thiểu 32 ký tự ngẫu nhiên) |
| `POSTGRES_DB` | Có | Tên cơ sở dữ liệu production (mặc định: `brewlite`) |
| `JWT_SECRET` | Có | Khóa bí mật ký JWT Token (chuỗi ngẫu nhiên tối thiểu 64 ký tự hex) |

### Cơ chế xử lý khi thiếu Secrets
Trong trường hợp hạ tầng AWS Lightsail hoặc Secrets chưa được người dùng cung cấp:
- Workflow CI/CD [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) sẽ tự động nhận diện và chuyển bước triển khai sang chế độ **BLOCKED / DRY-RUN SIMULATION**.
- Toàn bộ các bước đóng gói image lên GHCR, kiểm thử chất lượng, xác thực cú pháp và kiểm thử rollback vẫn được kiểm chứng hoàn toàn độc lập mà không gây lỗi pipeline.

---

## 3. Danh sách GitHub Actions Variables (Không bảo mật)

Truy cập `Settings -> Secrets and variables -> Actions -> Variables`:

| Tên Variable | Giá trị mẫu | Mục đích |
|---|---|---|
| `DOMAIN` | `brewlite.vn` hoặc `localhost` | Tên miền phục vụ reverse proxy Caddy và cấp phát HTTPS tự động |
| `ACME_EMAIL` | `admin@brewlite.vn` | Địa chỉ email đăng ký chứng chỉ SSL/TLS Let's Encrypt |
| `FRONTEND_URL` | `https://brewlite.vn` | Domain cấu hình CORS backend cho phép kết nối |
| `PRODUCTION_APPROVAL_CONFIGURED` | `true` | Cờ xác nhận GitHub Environment 'production' đã được cấu hình Required Reviewers (FIX-14) |

---

## 4. Cơ chế Kích hoạt và Truyền Secrets an toàn (FIX-13, FIX-14, FIX-15)

1. **Kích hoạt có chủ đích (FIX-14):**
   - Push vào nhánh `main` hoặc merge PR chỉ chạy Quality Gates và Build/Publish image lên GHCR.
   - Job `deploy-production` tuyệt đối KHÔNG tự động chạy khi push `main`.
   - Triển khai production chỉ được kích hoạt thủ công qua `workflow_dispatch` với:
     - `target_env: production`
     - `confirm_production: DEPLOY_PRODUCTION`
   - Bắt buộc kiểm tra `vars.PRODUCTION_APPROVAL_CONFIGURED == 'true'`. Nếu thiếu cấu hình bảo vệ phê duyệt, deployment tự động chuyển trạng thái **BLOCKED** mà không thực hiện bất kỳ lệnh SSH nào.

2. **Truyền Secrets an toàn qua SSH stdin (FIX-15):**
   - Không chèn trực tiếp `${{ secrets.* }}` vào nội dung mã shell script (toàn bộ mapping qua `env:`).
   - Nội dung cấu hình `.env` được mã hóa Base64 phía runner và truyền qua luồng `stdin` của SSH tới `base64 -d`.
   - Không xuất hiện mật khẩu hay khóa JWT trong danh sách tiến trình (`ps`) hoặc log CI.
   - Tệp `.env` được ghi vào file tạm, gán quyền `0600` và thay thế nguyên tử (`mv -f .env.tmp.$$ .env`).
   - Xử lý hoàn hảo mọi ký tự đặc biệt: dấu nháy kép `"`, dấu nháy đơn `'`, `$`, `#`, `\`, newlines.

3. **Phân tách biến Runner và Remote Host (FIX-13):**
   - Remote script trên máy chủ tự động nạp cấu hình bằng `set -a; . ./.env; set +a`.
   - Kiểm tra database readiness bằng Docker healthcheck và `pg_isready` với biến đã load.
   - Production smoke test sử dụng trực tiếp biến `https://$DOMAIN` đã được cấu hình, không fallback ngầm.

---

## 5. Phân quyền GitHub Container Registry (GHCR)

Workflow `deploy.yml` sử dụng biến mặc định `${{ secrets.GITHUB_TOKEN }}` được cấp quyền tối thiểu:

```yaml
permissions:
  contents: read      # Đọc mã nguồn checkout
  packages: write     # Đẩy Docker image lên ghcr.io
  id-token: write     # Hỗ trợ OIDC an toàn
```

Để người dùng bên ngoài hoặc máy chủ có thể kéo image:
1. Truy cập `https://github.com/vohuunghiaah?tab=packages`.
2. Chọn package `brewlite-api` và `brewlite-web`.
3. Trong mục **Package settings**, đảm bảo quyền đọc (Read access) được gán phù hợp cho repository `brewlite`.
