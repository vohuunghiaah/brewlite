# Hướng dẫn triển khai BrewLite Production (ADR-007)

## 1. Tổng quan kiến trúc triển khai

Theo quyết định kiến trúc [ADR-007](../architecture/adr/adr/007-aws-lightsail-deployment.md), BrewLite áp dụng mô hình triển khai Single-VM trên AWS Lightsail:

- **Hạ tầng máy chủ:** AWS Lightsail Instance (Ubuntu 24.04 LTS, Singapore `ap-southeast-1`, 2 vCPU, 2 GB RAM, 60 GB SSD).
- **Reverse Proxy & TLS:** Caddy 2.x Alpine (tự động quản lý HTTPS qua Let's Encrypt / ZeroSSL, proxy TCP 80 & 443).
- **Container Registry:** GitHub Container Registry (GHCR):
  - `ghcr.io/vohuunghiaah/brewlite-api`
  - `ghcr.io/vohuunghiaah/brewlite-web`
- **Application Runtime:**
  - `web`: Next.js 16 (Standalone mode, non-root user `node`, cổng nội bộ 3000).
  - `api`: NestJS 12 (Multi-stage runner, non-root user `node`, TypeORM, cổng nội bộ 3001).
- **Database:** PostgreSQL 16 Alpine, dữ liệu lưu trên Docker Named Volume `postgres_data`.
- **Mạng nội bộ:** `brewlite-internal` bridge network. Cổng PostgreSQL 5432 và API 3001 **hoàn toàn đóng** với internet công cộng.

```
                          Internet (HTTPS / HTTP)
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │   Caddy Reverse Proxy (80/443)│
                     └───────────────┬───────────────┘
                                     │ (brewlite-internal)
             ┌───────────────────────┴───────────────────────┐
             ▼                                               ▼
┌─────────────────────────┐                     ┌─────────────────────────┐
│ Next.js Web (port 3000) │                     │  NestJS API (port 3001) │
│   (Standalone Mode)     │                     │ (Health, Auth, Orders)  │
└─────────────────────────┘                     └────────────┬────────────┘
                                                             │
                                                             ▼
                                                ┌─────────────────────────┐
                                                │  PostgreSQL 16 (5432)   │
                                                │  Volume: postgres_data  │
                                                └─────────────────────────┘
```

---

## 2. Quy trình CI/CD Delivery Pipeline

Pipeline được định nghĩa tại [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml):

```
[Push to main / Tag v* / workflow_dispatch]
                      │
                      ▼
 1. Quality Gate (Fail-Fast)
    ├── Lint (API & Web)
    ├── Unit & Integration Tests (PostgreSQL container)
    ├── Build Artifacts
    └── E2E Acceptance & Security Tests (Playwright + Compose)
                      │
                      ▼
 2. Build & Publish Images (GHCR)
    ├── Build Multi-stage API Image -> ghcr.io/.../brewlite-api:<sha>
    ├── Build Standalone Web Image  -> ghcr.io/.../brewlite-web:<sha>
    └── Publish & Record Digests
                      │
                      ▼
 3. Production Deployment (GitHub Environment: "production")
    ├── Manual Approval Gate (Required Reviewers)
    ├── Prerequisites & Secrets Verification
    ├── Pre-deployment Database Backup (pg_dump)
    ├── Safe Schema Migration (TypeORM migrate)
    ├── Rolling Container Restart (docker compose up -d)
    └── Smoke Test (scripts/smoke-test.mjs)
          ├── PASS: Release complete
          └── FAIL: Automatic Rollback (scripts/rollback.mjs)
```

---

## 3. Phân bổ tài nguyên máy chủ (2 GB RAM Budget)

Để đảm bảo không bị Linux OOM-Killer tắt tiến trình trên VM 2 GB RAM, các container được giới hạn cứng (`limits`):

| Container | CPU Limit | Memory Limit | Mục đích |
|---|---|---|---|
| `caddy` | 0.25 vCPU | 128 MB | TLS termination, reverse proxy |
| `web` | 0.50 vCPU | 512 MB | Next.js Standalone SSR/Client assets |
| `api` | 0.75 vCPU | 512 MB | NestJS runtime, TypeORM pool, mock gateway |
| `db` | 0.50 vCPU | 512 MB | PostgreSQL 16 database buffer |
| **Tổng cộng** | - | **1,664 MB (~1.62 GB)** | **Dành ~384 MB cho Host OS & Docker Engine** |

Tất cả container được cấu hình log rotation (`json-file`, `max-size: "10m"`, `max-file: "3"`) để tránh đầy ổ cứng SSD 60 GB.

---

## 4. Hướng dẫn chạy thử nghiệm tại máy cục bộ (Local Staging / Dry-Run)

### Bước 1: Build Docker images production
```bash
docker build -t ghcr.io/vohuunghiaah/brewlite-api:local apps/api
docker build -t ghcr.io/vohuunghiaah/brewlite-web:local apps/web
```

### Bước 2: Kiểm tra cú pháp Compose production
```bash
API_IMAGE=ghcr.io/vohuunghiaah/brewlite-api IMAGE_TAG=local WEB_IMAGE=ghcr.io/vohuunghiaah/brewlite-web docker compose -f docker-compose.prod.yml config
```

### Bước 3: Khởi chạy môi trường production
```bash
# Tạo file .env production với các secrets cần thiết
API_IMAGE=ghcr.io/vohuunghiaah/brewlite-api IMAGE_TAG=local WEB_IMAGE=ghcr.io/vohuunghiaah/brewlite-web docker compose -f docker-compose.prod.yml up -d
```

### Bước 4: Chạy migration an toàn
```bash
docker compose -f docker-compose.prod.yml run --rm --no-deps api node dist/prepare-database.js migrate
```

### Bước 5: Kiểm tra Smoke Test
```bash
TARGET_URL=http://localhost node scripts/smoke-test.mjs
```

---

## 5. Hướng dẫn triển khai lên máy chủ AWS Lightsail thật

Khi máy chủ AWS Lightsail đã sẵn sàng và secrets đã được cấu hình trong GitHub Repository (xem chi tiết tại [github-environment-setup.md](github-environment-setup.md)):

1. Nhánh `main` được merge (hoặc push tag `v*`).
2. GitHub Actions kích hoạt workflow `Continuous Delivery & Deployment`.
3. Quality gates chạy và PASS 100%.
4. Image được đóng gói và đẩy lên GHCR với tag commit SHA và digest an toàn.
5. GitHub Actions gửi yêu cầu phê duyệt tại Environment `production`.
6. Quản trị viên/Reviewer bấm **Approve and deploy**.
7. Runner kết nối SSH tới Lightsail, sao lưu DB, kéo image mới, chạy migration, cập nhật container và chạy smoke test.
8. Nếu smoke test phát hiện bất kỳ lỗi nào, script rollback sẽ tự động khôi phục image cũ mà không ảnh hưởng đến volume dữ liệu PostgreSQL.
