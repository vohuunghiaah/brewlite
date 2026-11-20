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
```bash
ROLLBACK_API_IMAGE="ghcr.io/vohuunghiaah/brewlite-api:<previous_sha>" \
ROLLBACK_WEB_IMAGE="ghcr.io/vohuunghiaah/brewlite-web:<previous_sha>" \
node scripts/rollback.mjs
```

Script sẽ:
- Giữ nguyên container PostgreSQL và dữ liệu trên named volume `postgres_data`.
- Khởi động lại container `api` và `web` trỏ về image chỉ định.
- Chạy `docker compose ps` để xác nhận trạng thái healthy.

### Bước 4: Chạy lại Smoke Test xác nhận khôi phục thành công
```bash
TARGET_URL=http://localhost node scripts/smoke-test.mjs
```

---

## 4. Quy trình phục hồi dữ liệu từ bản sao lưu (Disaster Recovery)

Nếu cơ sở dữ liệu gặp sự cố nghiêm trọng về logic nghiệp vụ:
1. Bản sao lưu được lưu trữ tại thư mục `/home/ubuntu/app/backups/db-backup-<timestamp>.sql`.
2. Để khôi phục dữ liệu từ file backup mà không làm gián đoạn hạ tầng:
```bash
# Đưa container API về trạng thái tạm dừng
docker compose -f docker-compose.prod.yml stop api

# Khôi phục dữ liệu qua psql nội bộ
docker exec -i brewlite-prod-db psql -U brewlite -d brewlite < backups/db-backup-<timestamp>.sql

# Khởi động lại API
docker compose -f docker-compose.prod.yml start api

# Kiểm tra lại tính sẵn sàng của hệ thống
TARGET_URL=http://localhost node scripts/smoke-test.mjs
```
