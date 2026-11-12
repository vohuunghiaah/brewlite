# TỔNG QUAN KIẾN TRÚC HỆ THỐNG BREWLITE
## DỰ ÁN: BREWLITE — HỆ THỐNG ĐẶT CÀ PHÊ KHÔNG DÙNG TIỀN MẶT
- **Mã tài liệu:** `ARCH-OV-01`
- **Phiên bản:** 1.0.0
- **Trạng thái:** Approved Baseline

---

## 1. PHONG CÁCH KIẾN TRÚC TỔNG THỂ

BrewLite áp dụng kiến trúc **Modular Monolith (Đơn khối theo mô-đun)** phân tầng rõ ràng, kết hợp mô hình Client-Server hiện đại:
- **Client Tier (`apps/web`):** Next.js 14/15 App Router, TypeScript, React Server Components (RSC) kết hợp Client Components, TailwindCSS, quản lý state client-side bằng Zustand.
- **API Tier (`apps/api`):** NestJS framework, TypeScript, tổ chức theo Domain Modules (`AuthModule`, `ProductsModule`, `OrdersModule`, `PaymentsModule`, `HealthModule`).
- **Data Tier:** Cơ sở dữ liệu quan hệ PostgreSQL 16, truy cập thông qua Prisma ORM với typed client, interactive transactions và cơ chế khóa lạc quan (Optimistic Concurrency Control).

```
+-----------------------------------------------------------------------+
|                            USER BROWSERS                              |
|          (Mobile Viewport 360-430px / PWA / Tablet / Desktop)          |
+-----------------------------------+-----------------------------------+
                                    |
                                    | HTTPS / JSON
                                    v
+-----------------------------------------------------------------------+
|                    FRONTEND CLIENT (Next.js - apps/web)               |
|  - App Router: / (Menu), /products/:id, /cart, /login, /orders        |
|  - State: Zustand Store (Cart, Auth Token)                            |
|  - UI: TailwindCSS, Mobile-First, Loading Skeleton, Error Boundary    |
+-----------------------------------+-----------------------------------+
                                    |
                                    | REST API (Bearer JWT / Idempotency-Key)
                                    v
+-----------------------------------------------------------------------+
|                    BACKEND API (NestJS - apps/api)                    |
|  +-----------------------------------------------------------------+  |
|  | Modules: Products | Auth & Users | Orders | Payments | Health   |  |
|  +-----------------------------------------------------------------+  |
|  | Guards: JwtAuthGuard | Filters: HttpExceptionFilter             |  |
|  | Domain Logic: OrderStateMachine (assertTransition)              |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------+-----------------------------------+
                                    |
                                    | Prisma ORM / SQL Transactions
                                    v
+-----------------------------------------------------------------------+
|                    DATABASE (PostgreSQL 16)                           |
|  - Tables: User, Product, Order, OrderItem, Payment, Promotion        |
|  - Optimistic Lock: `version` column on Product                       |
|  - Relational Constraints, Foreign Keys, UUID Primary Keys            |
+-----------------------------------------------------------------------+
```

---

## 2. PHÂN TÍCH ƯU ĐIỂM, HẠN CHẾ VÀ TRADE-OFFS

### 2.1 Tại sao chọn Modular Monolith thay vì Microservices?
- **Ưu điểm:**
  - Tối ưu chi phí hạ tầng và vận hành cho quy mô vừa và nhỏ của chuỗi cà phê BrewLite.
  - Loại bỏ độ trễ mạng và rủi ro phân tán khi thực hiện giao dịch ACID giữa đơn hàng, tồn kho và thanh toán.
  - Quy trình CI/CD và triển khai đơn giản, giảm thiểu nguy cơ cấu hình sai giữa các dịch vụ.
  - Đảm bảo tính nhất quán loại (Type Safety) xuyên suốt từ schema database đến DTO backend và client.
- **Hạn chế:** Toàn bộ ứng dụng backend scale chung một khối.
- **Giải pháp:** Thiết kế các module độc lập cao (loose coupling, high cohesion) với giao diện rõ ràng để có thể tách thành microservice khi lưu lượng tăng đột biến trong tương lai.

### 2.2 Quản lý cấu hình và Bí mật (Configuration & Secret Management)
- Tách biệt hoàn toàn biến môi trường cục bộ và production.
- Không commit file `.env` chứa bí mật vào git; sử dụng `.env.example` với các giá trị mẫu an toàn.
- Khóa bảo mật JWT (`JWT_SECRET`) và chuỗi kết nối database (`DATABASE_URL`) được tiêm qua Docker environment hoặc CI/CD Secrets.

### 2.3 Health Check & Giám sát (Observability)
- Cung cấp endpoint `GET /health` trả về trạng thái liveness của HTTP server và readiness của kết nối PostgreSQL.
- Structured JSON logging ghi nhận mã lỗi HTTP, stack trace trong môi trường phát triển và bảo vệ thông tin cá nhân (PII) người dùng.

