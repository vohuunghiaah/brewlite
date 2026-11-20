# Danh sách điều kiện tiên quyết kích hoạt Production (Production Prerequisites)

Tài liệu này tổng hợp toàn bộ các điều kiện kỹ thuật và vận hành cần hoàn tất trước khi kích hoạt luồng triển khai thực tế trên hạ tầng AWS Lightsail.

---

## 1. Hạ tầng Điện toán đám mây (AWS Lightsail)

- [ ] **Instance Provisioning:** Đã khởi tạo AWS Lightsail instance cấu hình tối thiểu 2 vCPU, 2 GB RAM, 60 GB SSD, hệ điều hành Ubuntu 24.04 LTS tại Region Singapore (`ap-southeast-1`).
- [ ] **Static IP:** Đã gán Static IP cố định cho instance để tránh thay đổi IP khi khởi động lại.
- [ ] **Tường lửa mạng (Firewall Rules):**
  - Mở cổng `22` (SSH): Giới hạn dải IP nguồn quản trị nếu khả thi.
  - Mở cổng `80` (HTTP): Dành cho xác thực Let's Encrypt ACME challenge và chuyển hướng HTTPS.
  - Mở cổng `443` (HTTPS): Dành cho lưu lượng truy cập công khai của người dùng.
  - **ĐÓNG HOÀN TOÀN** cổng `5432` (PostgreSQL) và `3001` (NestJS API) khỏi internet công cộng.
- [ ] **Docker Engine:** Đã cài đặt Docker Engine và Docker Compose v2 trên Ubuntu host.

---

## 2. Tên miền & Bản ghi DNS (Domain & Networking)

- [ ] **Tên miền hợp lệ:** Đã sở hữu tên miền (ví dụ: `brewlite.vn` hoặc subdomain `app.brewlite.vn`).
- [ ] **Bản ghi DNS A/AAAA:** Đã trỏ bản ghi `A` về Static IP của máy chủ Lightsail.
- [ ] **DNS Propagation:** Xác nhận bản ghi DNS đã phân giải chính xác từ môi trường bên ngoài (`nslookup` hoặc `dig`).

---

## 3. Cấu hình Bảo mật & GitHub Environment

- [ ] **GitHub Environment `production`:** Đã tạo environment `production` với **Required Reviewers** (Approval Gate).
- [ ] **Cấu hình Secrets trên GitHub Repository:**
  - `LIGHTSAIL_HOST`: Địa chỉ IP thật của máy chủ.
  - `LIGHTSAIL_USER`: User SSH (`ubuntu`).
  - `LIGHTSAIL_SSH_KEY`: Private Key để kết nối SSH.
  - `LIGHTSAIL_SSH_KNOWN_HOSTS`: Fingerprint SSH host ghim trước để chống giả mạo MITM.
  - `POSTGRES_USER`: Tên user DB production (không dùng mật khẩu mặc định).
  - `POSTGRES_PASSWORD`: Mật khẩu DB ngẫu nhiên >= 32 ký tự.
  - `POSTGRES_DB`: Tên database production (`brewlite`).
  - `JWT_SECRET`: Chuỗi khóa ký bí mật JWT >= 64 ký tự hex.
- [ ] **Cấu hình Variables:**
  - `DOMAIN`: Tên miền chính thức.
  - `ACME_EMAIL`: Email quản trị chứng chỉ Let's Encrypt.
  - `FRONTEND_URL`: `https://${DOMAIN}`.
  - `PRODUCTION_APPROVAL_CONFIGURED`: Đặt thành `true` sau khi bật Required Reviewers trên GitHub Environment `production` (FIX-14).
- [ ] **Kích hoạt có chủ đích (FIX-14):** Kích hoạt qua `workflow_dispatch` với input `target_env: production` và `confirm_production: DEPLOY_PRODUCTION`. Push vào `main` sẽ không tự ý deploy.

---

## 4. Kiểm thử sẵn sàng vận hành (Operational Readiness)

- [ ] **Bản sao lưu ban đầu:** Thư mục `/home/ubuntu/app/backups/` có quyền ghi cho Docker.
- [ ] **Kiểm thử khôi phục sự cố:** Đội ngũ kỹ thuật đã đọc và nắm rõ [rollback-guide.md](rollback-guide.md).
- [ ] **Giám sát tính sẵn sàng (NFR-07):** Đã thiết lập probe giám sát uptime định kỳ mỗi phút tới endpoint `https://${DOMAIN}/health` đảm bảo SLA ≥ 99%.
