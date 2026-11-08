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

### Chiến lược Rollback khi có sự cố
- Khi smoke test thất bại hoặc phiên bản mới gặp lỗi nghiêm trọng:
  1. Điều hướng lưu lượng tại Reverse Proxy / Ingress quay trở lại container image ổn định liền trước (dựa trên commit SHA tag).
  2. Các migration cơ sở dữ liệu tuân thủ nguyên tắc mở rộng tương thích ngược (Expand-Contract), không xóa bảng/cột ngay trong cùng phiên bản để bảo toàn dữ liệu khi rollback.

