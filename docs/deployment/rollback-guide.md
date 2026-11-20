# Hướng dẫn chiến lược Rollback ứng dụng BrewLite

Tài liệu này quy định chi tiết quy trình khôi phục hệ thống (Rollback Strategy) khi triển khai phiên bản mới gặp sự cố, đảm bảo tuân thủ nghiêm ngặt tính toàn vẹn dữ liệu và NFR-07 (Độ tin cậy & Sẵn sàng).

---

## 1. Nguyên tắc cốt lõi về Rollback

> [!IMPORTANT]
> **QUY TẮC BẤT DI BẤT DỊCH VỀ DỮ LIỆU:**
> 1. **KHÔNG BAO GIỜ XÓA VOLUME DỮ LIỆU:** Lệnh `docker compose down -v` hoặc `--volumes` bị nghiêm cấm trên môi trường production.
> 2. **KHÔNG ROLLBACK DATABASE BẰNG DROP TABLE / COLUMN:** TypeORM migration rollback bằng cách drop bảng hoặc drop cột sẽ gây mất mát dữ liệu khách hàng vĩnh viễn. Mọi thay đổi schema phải là thay đổi tương thích ngược (Additive / Backward Compatible).
> 3. **ROLLBACK PHẦN MỀM BẰNG IMAGE DIGEST:** Khôi phục tầng ứng dụng (Web và API) về phiên bản Docker Image ổn định trước đó (Previous Known-Good Tag/Digest).

---

## 2. Quy trình Rollback tự động trong CI/CD

Khi quy trình triển khai tại `.github/workflows/deploy.yml` thực thi:
1. Trước khi deploy, hệ thống tự động chạy `scripts/backup-db.mjs` tạo bản sao lưu dữ liệu `backups/db-backup-<timestamp>.sql`.
2. Sau khi cập nhật container, hệ thống chạy `scripts/smoke-test.mjs`.
3. Nếu bất kỳ bài kiểm tra nào trong Smoke Test thất bại (Web lỗi, API mất kết nối DB, rò rỉ secret, v.v.):
   - Pipeline phát hiện exit code `1`.
   - Ngay lập tức kích hoạt lệnh `node scripts/rollback.mjs`.
   - Ứng dụng được khôi phục về Image Tag trước đó.
   - Trạng thái triển khai được ghi nhận là `FAILED` và thông báo quản trị viên.

---

## 3. Quy trình Rollback thủ công trên máy chủ AWS Lightsail

Trong trường hợp cần rollback thủ công từ bảng điều khiển hoặc SSH:

### Bước 1: Đăng nhập vào máy chủ
```bash
ssh -i <your-key.pem> ubuntu@<LIGHTSAIL_IP>
cd /home/ubuntu/app
```

### Bước 2: Xác định Image Tag ổn định trước đó
Kiểm tra lịch sử các tag đã tải về trên máy chủ:
```bash
docker images ghcr.io/vohuunghiaah/brewlite-api
docker images ghcr.io/vohuunghiaah/brewlite-web
```

### Bước 3: Kích hoạt khôi phục bằng script chuyên dụng
Cung cấp trực tiếp commit SHA tag hoặc digest cụ thể (nghiêm cấm fallback về `latest` hoặc `stable`):
```bash
ROLLBACK_API_IMAGE="ghcr.io/vohuunghiaah/brewlite-api:<previous_sha>" \
ROLLBACK_WEB_IMAGE="ghcr.io/vohuunghiaah/brewlite-web:<previous_sha>" \
node scripts/rollback.mjs
```
Hoặc nếu có tệp trạng thái `.deployment-state.json` được ghi nhận tự động trước đó:
```bash
node scripts/rollback.mjs
```

Script sẽ:
- Phân biệt trường hợp **Bootstrap lần đầu** (`isBootstrap: true`): nếu triển khai lần đầu thất bại, script chủ động dừng các container bị lỗi (`api`, `web`), bảo toàn dữ liệu và thoát với mã lỗi 1 để đánh dấu release FAILED.
- Đối với trường hợp nâng cấp (**Upgrade**): xác minh cả API và Web image targets đều hợp lệ, từ chối thẻ cấm (`latest`, `stable`, chuỗi rỗng).
- Giữ nguyên container PostgreSQL và dữ liệu trên named volume `postgres_data`.
- Khởi động lại container `api` và `web` trỏ về image chỉ định qua `API_IMAGE_REF` và `WEB_IMAGE_REF`.
- Kiểm tra lặp lại probe trạng thái Docker Healthcheck cho cả 2 container cho đến khi báo healthy (hoặc timeout xuất log chẩn đoán và báo lỗi).

### Bước 4: Chạy lại Smoke Test xác nhận khôi phục thành công
```bash
# Đối với môi trường kiểm thử nội bộ
TARGET_ENV=development TARGET_URL=http://localhost node scripts/smoke-test.mjs

# Đối với môi trường production (bắt buộc HTTPS)
TARGET_ENV=production TARGET_URL="https://${DOMAIN}" node scripts/smoke-test.mjs
```

---

## 4. Quy trình phục hồi dữ liệu từ bản sao lưu (Disaster Recovery)

Nếu cơ sở dữ liệu gặp sự cố nghiêm trọng về logic nghiệp vụ:
1. Bản sao lưu được lưu trữ tại thư mục `/home/ubuntu/app/backups/db-backup-<timestamp>.sql` (phân quyền 0600).
2. Để khôi phục dữ liệu từ file backup mà không làm gián đoạn hạ tầng:
```bash
# Đưa container API về trạng thái tạm dừng
docker compose -f docker-compose.prod.yml stop api

# Khôi phục dữ liệu qua psql nội bộ
docker exec -i brewlite-prod-db psql -U brewlite -d brewlite < backups/db-backup-<timestamp>.sql

# Khởi động lại API
docker compose -f docker-compose.prod.yml start api

# Kiểm tra lại tính sẵn sàng của hệ thống
TARGET_ENV=production TARGET_URL="https://${DOMAIN}" node scripts/smoke-test.mjs
```
