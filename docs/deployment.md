# TÀI LIỆU HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG BREWLITE
## DỰ ÁN: BREWLITE — HỆ THỐNG ĐẶT CÀ PHÊ KHÔNG DÙNG TIỀN MẶT
- **Mã tài liệu:** `OPS-DEP-01`
- **Phiên bản:** 1.0.0
- **Trạng thái:** Approved

---

## 1. MÔI TRƯỜNG VẬN HÀNH

Hệ thống BrewLite hỗ trợ 3 môi trường:
1. **Local Development:** Khởi chạy bằng Node.js trực tiếp hoặc Docker Compose.
2. **Continuous Integration (CI):** GitHub Actions runner thực thi kiểm tra chất lượng (Quality Gate) trên mỗi Pull Request.
3. **Production Cloud:** Nền tảng Container Cloud (Render / Railway / Cloud VPS) với HTTPS tự động, container đóng gói độc lập, và cơ sở dữ liệu PostgreSQL có persistent volume.

---

## 2. BIẾN MÔI TRƯỜNG BẮT BUỘC

| Tên biến | Môi trường | Ý nghĩa & Giá trị mẫu |
| :--- | :---: | :--- |
| `NODE_ENV` | Tất cả | `development` / `production` / `test` |
| `PORT` | API | Cổng chạy NestJS (mặc định: `4000`) |
| `DATABASE_URL` | API | `postgresql://brewlite:brewlite@localhost:5432/brewlite?schema=public` |
| `JWT_SECRET` | API | Khóa bí mật ký JWT (tối thiểu 32 ký tự ngẫu nhiên trên production) |
| `JWT_EXPIRES_IN` | API | Thời hạn JWT (ví dụ: `7d`) |
| `NEXT_PUBLIC_API_URL` | Web | URL gốc của backend API (ví dụ: `http://localhost:4000/api` hoặc `https://api.brewlite.example.com/api`) |

---

## 3. QUY TRÌNH TRIỂN KHAI PRODUCTION

```text
Commit SHA Tag
      ↓
Quality Gate (Lint, Test, Build)
      ↓
Build Docker Images (web & api)
      ↓
Push GHCR Registry (ghcr.io/vohuunghiaah/brewlite-*)
      ↓
Trigger Deploy / Deploy Hook
      ↓
Run Database Migration (npx prisma migrate deploy)
      ↓
Smoke Test Health Check (GET /api/health)
      ↓
Live Serving via HTTPS
```

### Chiến lược Rollback & Phục Hồi Dữ Liệu Khi Có Sự Cố
- **Nguyên tắc an toàn:**
  1. Tuyệt đối không dùng `prisma migrate resolve --rolled-back` như một lệnh khôi phục dữ liệu mặc định. Lệnh này chỉ cập nhật metadata trong bảng `_prisma_migrations`, không hoàn nguyên schema hay dữ liệu thực tế.
  2. Áp dụng quy tắc thiết kế cơ sở dữ liệu **Expand-Contract**: Các migration schema phải tương thích ngược (non-breaking, nullable hoặc có default value), cho phép phiên bản ứng dụng cũ tiếp tục chạy an toàn khi rollback container.
  3. Trước mỗi đợt deploy production, kích hoạt tác vụ sao lưu tự động tạo snapshot cơ sở dữ liệu:
     ```bash
     pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -F c -b -v -f /backups/brewlite_pre_deploy_$(date +%Y%m%d_%H%M%S).dump
     ```
- **Quy trình thực hiện hoàn tác khi Smoke Test thất bại hoặc sự cố nghiêm trọng:**
  1. *Tầng Container:* Điều hướng lưu lượng tại Reverse Proxy / Ingress quay trở lại container image ổn định liền trước (dựa trên commit SHA tag).
  2. *Tầng Database Schema:* Nếu cần rollback schema vật lý, nạp script hạ cấp có kiểm soát (`down.sql`) hoặc phục hồi hoàn toàn từ bản snapshot pre-deploy:
     ```bash
     pg_restore -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists -v /backups/brewlite_pre_deploy_<timestamp>.dump
     ```
  3. *Tầng Metadata Tracking:* Sau khi schema vật lý đã được hoàn nguyên, cập nhật lại trạng thái trong Prisma:
     ```bash
     npx prisma migrate resolve --rolled-back <migration_name>
     ```
  4. *Kiểm chứng sau hoàn tác:* Thực hiện smoke test `GET /api/health` và các giao dịch mẫu để bảo đảm hệ thống khôi phục hoàn toàn.

