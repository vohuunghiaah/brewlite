# BREWLITE — HƯỚNG DẪN CHẠY BỘ KIỂM THỬ E2E & BẢO MẬT
## (End-to-End Acceptance & Security Verification Guide)

Tài liệu này hướng dẫn cách thiết lập, cài đặt dependencies và chạy hai kịch bản kiểm thử tự động độc lập:
1. `scripts/e2e-mvp-acceptance.mjs`: Kiểm thử nghiệm thu luồng MVP hoàn chỉnh 12 bước trên trình duyệt Chromium thật và cơ sở dữ liệu PostgreSQL thật.
2. `scripts/e2e-security-exceptions.mjs`: Kiểm thử 10 ca kiểm thử bảo mật, ngoại lệ, CORS preflight, race condition và tính bền vững giao dịch.

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

## 4. Cơ chế bảo vệ an toàn môi trường (Safe Environment Protection)

Cả hai script đều tích hợp cơ chế kiểm tra an toàn nghiêm ngặt để đảm bảo **tuyệt đối không bao giờ làm thay đổi hoặc xóa dữ liệu môi trường Production**:
- Script tự động từ chối chạy nếu `NODE_ENV=production`.
- Script tự động từ chối chạy nếu `DB_NAME` chứa `prod` hoặc `production`.
- Chỉ chấp nhận chạy trên các cơ sở dữ liệu phát triển/kiểm thử (`brewlite`, `brewlite_test`, hoặc tên có chứa `test`, `dev`), hoặc khi người dùng đặt cờ tường minh:
  ```bash
  ALLOW_TEST_SCRIPTS=true
  ```

---

## 5. Hướng dẫn chạy trên Windows PowerShell

### 5.1 Chạy Luồng MVP E2E 12 bước (`e2e-mvp-acceptance.mjs`)
```powershell
$env:ALLOW_TEST_SCRIPTS="true"
node scripts/e2e-mvp-acceptance.mjs
```

### 5.2 Chạy Bộ Kiểm Thử Bảo Mật & Ngoại Lệ (`e2e-security-exceptions.mjs`)
```powershell
$env:ALLOW_TEST_SCRIPTS="true"
node scripts/e2e-security-exceptions.mjs
```

---

## 6. Hướng dẫn chạy trên Linux, macOS & CI

### 6.1 Chạy Luồng MVP E2E 12 bước
```bash
ALLOW_TEST_SCRIPTS=true node scripts/e2e-mvp-acceptance.mjs
```

### 6.2 Chạy Bộ Kiểm Thử Bảo Mật & Ngoại Lệ
```bash
ALLOW_TEST_SCRIPTS=true node scripts/e2e-security-exceptions.mjs
```

### 6.3 Chạy trong môi trường CI không dùng Docker container
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
| `DB_NAME` | `brewlite` | Tên database kết nối PostgreSQL |
| `SCREENSHOT_DIR` | `docs/testing/screenshots` | Thư mục lưu ảnh chụp màn hình E2E |
| `ARTIFACTS_DIR` | `null` | Thư mục tùy chọn để sao lưu artifacts |
| `ALLOW_TEST_SCRIPTS` | `false` | Cờ bảo mật xác nhận môi trường kiểm thử an toàn |
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
