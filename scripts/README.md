# BREWLITE — HƯỚNG DẪN BỘ KIỂM THỬ E2E & BẢO VỆ MÔI TRƯỜNG AN TOÀN
## (End-to-End Acceptance, Security Verification & Environment Safety Guide)

Tài liệu này hướng dẫn cách thiết lập, cài đặt dependencies và chạy các kịch bản kiểm thử tự động độc lập của BrewLite:
1. `scripts/test-env-safety.mjs`: Bộ kiểm thử đơn vị xác minh cơ chế an toàn môi trường, chặn production và phát hiện sai lệch cấu hình database / API (DEF-02).
2. `scripts/e2e-mvp-acceptance.mjs`: Kiểm thử nghiệm thu luồng MVP hoàn chỉnh 12 bước trên trình duyệt Chromium thật và cơ sở dữ liệu PostgreSQL thật.
3. `scripts/e2e-security-exceptions.mjs`: Kiểm thử 10 ca kiểm thử bảo mật, ngoại lệ, CORS preflight thực tế cho `Idempotency-Key`, race condition và tính bền vững giao dịch.

---

## 1. Yêu cầu hệ thống (Prerequisites)

- **Node.js**: Phiên bản 20 trở lên (khuyến nghị Node 22 hoặc 24).
- **Docker**: Dùng để chạy `brewlite-db`, `brewlite-api`, `brewlite-web` (hoặc cài đặt PostgreSQL 16 cục bộ).
- **Playwright Chromium**: Trình duyệt Chromium cho kiểm thử giao diện người dùng.

---

## 2. Cài đặt trên môi trường mới (Clean Clone Setup)

Sau khi clone repository về máy:

```bash
# 1. Cài đặt dependencies cho Backend API
npm --prefix apps/api install

# 2. Cài đặt dependencies cho Frontend Web
npm --prefix apps/web install

# 3. Cài đặt Playwright cho E2E Scripts
npm --prefix scripts install

# 4. Cài đặt trình duyệt Chromium cho Playwright
npx playwright install chromium
```

---

## 3. Khởi động môi trường kiểm thử (Local Services)

Khởi động các dịch vụ backend và frontend:

```bash
# Khởi động PostgreSQL 16
docker compose up -d brewlite-db

# Đảm bảo database đã áp dụng migrations
# (Nếu khởi động toàn bộ stack bằng Docker)
docker compose up -d
```

Xác minh các dịch vụ hoạt động tại:
- Web App: `http://localhost:3000`
- API Backend: `http://localhost:3001`
- PostgreSQL: `localhost:5432` (Container: `brewlite-db`, User: `brewlite`, DB: `brewlite`)

---

## 4. Cơ chế bảo vệ an toàn môi trường (DEF-02 Environment Safety Architecture)

Hệ thống kiểm thử sử dụng module bảo vệ độc lập [scripts/env-safety.mjs](file:///c:/dev/brewlite/scripts/env-safety.mjs) nhằm đảm bảo **tuyệt đối không bao giờ làm ảnh hưởng, thay đổi hoặc xóa dữ liệu môi trường Production**:

### 4.1 Xác định duy nhất Database đích thực tế
- **Chế độ Direct PSQL** (`DB_DIRECT_PSQL=true` hoặc `RUN_PG_TESTS=true` trên CI/local host): Tên database đích lấy từ `POSTGRES_DB` (fallback `DB_NAME`).
- **Chế độ Docker container** (mặc định): Tên database đích lấy từ `DB_NAME` (fallback `POSTGRES_DB` hoặc `brewlite`) trên container `DB_CONTAINER`.

### 4.2 Xác minh thực tế qua `SELECT current_database()`
- Trước mọi thao tác SQL hoặc request API làm thay đổi dữ liệu, hàm `verifyLiveDatabase()` thực hiện truy vấn `SELECT current_database()`.
- Nếu tên database kết nối thực tế không khớp với cấu hình đích, script sẽ **lập tức hủy bỏ**.

### 4.3 Tuyệt đối cấm Production (Zero Bypass)
- **Cấm NODE_ENV production**: Nếu `NODE_ENV=production` hoặc `prod` $\rightarrow$ Từ chối chạy.
- **Cấm Database production**: Nếu tên database chứa `prod`, `production`, `live`, `master` $\rightarrow$ Từ chối chạy.
- **Cấm API production**: Nếu `API_URL` trỏ đến các domain production (`brewlite.vn`, `brewlite.com`, hoặc host public không thuộc diện test/dev) $\rightarrow$ Từ chối chạy.
- **`ALLOW_TEST_SCRIPTS=true` KHÔNG THỂ BỎ QUA**: Cờ `ALLOW_TEST_SCRIPTS=true` chỉ dùng để cho phép các database test tuỳ biến (ví dụ `ci_db_123`) không thuộc danh mục mặc định (`brewlite`, `brewlite_test`, `*_test`, `*_dev`). Cờ này **tuyệt đối không thể bỏ qua** các điều kiện cấm Production.

### 4.4 An toàn bảo mật chuỗi lệnh (Secure `execFileSync`)
- Toàn bộ lệnh gọi `psql` và `docker exec` sử dụng `execFileSync` với mảng tham số riêng biệt, không nối chuỗi shell.
- Mật khẩu PostgreSQL được chuyển an toàn qua biến môi trường `PGPASSWORD` (Direct PSQL) hoặc cờ `-e PGPASSWORD=...` (Docker exec), hoàn toàn không xuất hiện trên chuỗi command line shell.

---

## 5. Hướng dẫn chạy kiểm thử trên Windows PowerShell

### 5.1 Chạy Bộ Kiểm Thử An Toàn Môi Trường (DEF-02 Safety Tests)
```powershell
node scripts/test-env-safety.mjs
```

### 5.2 Chạy Luồng MVP E2E 12 bước (`e2e-mvp-acceptance.mjs`)
```powershell
node scripts/e2e-mvp-acceptance.mjs
```

### 5.3 Chạy Bộ Kiểm Thử Bảo Mật & Ngoại Lệ (`e2e-security-exceptions.mjs`)
```powershell
node scripts/e2e-security-exceptions.mjs
```

---

## 6. Hướng dẫn chạy trên Linux, macOS & CI

### 6.1 Chạy Unit Tests An Toàn Môi Trường
```bash
node scripts/test-env-safety.mjs
```

### 6.2 Chạy Luồng MVP E2E 12 bước
```bash
node scripts/e2e-mvp-acceptance.mjs
```

### 6.3 Chạy Bộ Kiểm Thử Bảo Mật & Ngoại Lệ
```bash
node scripts/e2e-security-exceptions.mjs
```

### 6.4 Chạy trong môi trường CI không dùng Docker container
Trong môi trường CI (ví dụ GitHub Actions với PostgreSQL Service Container):
```bash
ALLOW_TEST_SCRIPTS=true \
DB_DIRECT_PSQL=true \
POSTGRES_HOST=localhost \
POSTGRES_PORT=5432 \
POSTGRES_USER=brewlite \
POSTGRES_PASSWORD=brewlite_dev_password \
POSTGRES_DB=brewlite_test \
node scripts/e2e-security-exceptions.mjs
```

---

## 7. Các biến môi trường hỗ trợ (Configuration Reference)

| Biến môi trường | Mặc định | Mô tả |
|---|---|---|
| `WEB_URL` | `http://localhost:3000` | Địa chỉ frontend Next.js |
| `API_URL` | `http://localhost:3001` | Địa chỉ backend NestJS API |
| `DB_CONTAINER` | `brewlite-db` | Tên Docker container chạy PostgreSQL |
| `DB_USER` | `brewlite` | Username kết nối PostgreSQL |
| `DB_NAME` | `brewlite` | Tên database kết nối PostgreSQL (Docker mode) |
| `POSTGRES_DB` | `brewlite` | Tên database kết nối PostgreSQL (Direct PSQL mode) |
| `POSTGRES_HOST`| `localhost` | Host kết nối PostgreSQL |
| `POSTGRES_PORT`| `5432` | Cổng kết nối PostgreSQL |
| `POSTGRES_USER`| `brewlite` | Username kết nối PostgreSQL (Direct mode) |
| `SCREENSHOT_DIR` | `docs/testing/screenshots` | Thư mục lưu ảnh chụp màn hình E2E |
| `ARTIFACTS_DIR` | `null` | Thư mục tùy chọn để sao lưu artifacts |
| `ALLOW_TEST_SCRIPTS` | `false` | Cờ bảo mật xác nhận môi trường kiểm thử an toàn cho database tên tùy biến |
| `DB_DIRECT_PSQL` | `false` | Đặt `true` nếu chạy `psql` trực tiếp (không qua `docker exec`) |

---

## 8. Danh mục bằng chứng ảnh chụp màn hình (Visual Evidence)

Khi chạy `e2e-mvp-acceptance.mjs`, các ảnh chụp màn hình tương ứng với từng bước trong thiết kế Figma (Screens 01-06) sẽ được lưu tại `docs/testing/screenshots/`:
1. `01-menu-discovery.png`: Màn hình Menu (Figma Screen 01).
2. `02-customizer-modal.png`: Modal tùy chỉnh Size, Topping, Đá, Đường, Ghi chú (Figma Screen 02).
3. `03-cart-drawer.png`: Slide-over Cart Drawer và điều chỉnh số lượng (Figma Screen 03).
4. `04-auth-modal.png`: Auth Modal đăng ký tài khoản mới khi checkout (Figma Screen 04).
5. `05-checkout-flow.png`: Cashless Checkout chọn nhận hàng tại bàn và thanh toán VietQR (Figma Screen 05).
6. `06-pickup-ticket.png`: Vé Chuông Điện Tử với mã `#BL-XXXX` và timeline 4 bước (Figma Screen 06).
