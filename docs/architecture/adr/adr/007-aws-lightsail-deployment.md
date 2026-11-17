# ADR-007: AWS Lightsail một VM cho triển khai BrewLite

- Ngày: 17/11/2026
- Trạng thái quyết định: **Proposed — chờ phê duyệt theo quy trình nhóm**
- Hạ tầng: **PROVISIONED** theo xác nhận của nhóm trong yêu cầu Task 3.2.
- Ứng dụng: **PLANNED / NOT DEPLOYED**; runtime **PENDING VERIFICATION**.
- Baseline: `main` tại `607c6d402a79fc5763511fb1e0409f20a02299c5`.

## Bối cảnh

Nhóm đã tạo Lightsail instance `brewlite-production`, Ubuntu Linux, Singapore `ap-southeast-1`, AZ `ap-southeast-1a`, 2 vCPU, RAM 2 GB, SSD 60 GB, dual-stack, gói được nhóm xác nhận 12 USD/tháng. Chưa có bằng chứng SSH/Docker/HTTPS hay triển khai ứng dụng trên VM. Không coi thông tin gói đã chọn là tổng chi phí vận hành hoặc báo giá hiện tại.

Baseline chỉ có Docker Compose development, Node.js 22-alpine, Next.js dev, NestJS start:dev, TypeORM và PostgreSQL 16. CI quality gates đã chạy thành công; chưa có publish image/CD trên `main`. Feature Prisma chưa được nhập vào baseline.

## Phương án đề xuất

Đặt Caddy, Next.js, NestJS và PostgreSQL 16 trong Docker Engine trên cùng Ubuntu VM. Caddy là điểm vào public TCP 80/443, chuyển HTTP sang HTTPS, proxy UI tới `web:3000` và `/api/*` bỏ prefix tới `api:3001`. DB chỉ ở `db:5432` trong network nội bộ. Dữ liệu dùng Docker named volume `postgres_data`.

Dùng Compose production riêng trong tương lai, image được build ngoài VM và phân phối qua GHCR theo release digest. Secrets cấp qua environment file riêng ngoài Git, quyền đọc hạn chế. SSH TCP 22 chỉ cho nguồn quản trị. Kiểm tra firewall cả IPv4/IPv6. Các cấu hình này chưa được tạo trong ADR/PR tài liệu.

## Phương án thay thế

| Phương án | Lợi ích | Trade-off trong phạm vi nhóm |
|---|---|---|
| Lightsail một VM (đề xuất) | Hợp với VM đã tạo, ít dịch vụ phải thiết lập, mô hình Compose quen thuộc | Tự vận hành DB, backup, OS, TLS; single point of failure |
| ECS + RDS | Tách compute/DB và mở đường vận hành managed | Cần thiết kế IAM/network/deploy khác, thêm dịch vụ và ngân sách; chưa được nhóm triển khai |
| EC2 tự quản | Linh hoạt cấu hình hạ tầng | Nhiều bước quản trị hạ tầng hơn nhu cầu bài tập; vẫn phải tự vận hành dữ liệu |
| PaaS tách frontend/API/DB | Giảm một phần quản trị máy chủ | Đổi nền tảng nhóm đã tạo, cần kiểm tra chi phí/giới hạn và tích hợp nhiều nơi |

Các phương án thay thế chỉ phục vụ quyết định, không nằm trong topology production được chọn.

## Hệ quả và giới hạn

- RAM 2 GB chia sẻ giữa OS, Docker, Next.js, NestJS và PostgreSQL. Build trên VM có thể hết RAM; build ở CI, kiểm thử tải/memory, giới hạn pool và tài nguyên, nâng gói khi có số đo. Chưa khẳng định đạt NFR hiệu năng.
- Một VM/SSD là single point of failure; restart, lỗi host hoặc đầy đĩa có thể dừng toàn bộ stack. Không có HA.
- Gói 12 USD/tháng không bao gồm mặc định mọi chi phí bổ sung như domain, backup hoặc sử dụng vượt hạn mức. Cần theo dõi hóa đơn thực tế.
- Volume giúp dữ liệu sống qua vòng đời container nhưng không phải backup. Cần backup nhất quán ngoài VM, retention, RPO/RTO được thống nhất và thử restore.
- Cần lưu trạng thái/chứng chỉ Caddy, log rotation/retention và che dữ liệu nhạy cảm; chưa có logging tập trung được xác minh.
- Không đưa `synchronize: true`, lệnh dev/watch hoặc port mapping local lên production. Cần PR ứng dụng riêng cho migration, Auth và health contract.

## Điều kiện phê duyệt và nghiệm thu

ADR giữ **Proposed** đến khi nhóm/PO phê duyệt theo quy trình. Việc đã tạo VM không tự chứng minh phê duyệt nội dung ADR. Không thay đổi các ADR Accepted trước đó.

Cần bằng chứng console/SSH đã che thông tin nhạy cảm, Docker version/ps/inspect và volume, firewall, DNS/TLS, image digest, smoke test frontend/API/DB, health contract `database: "up"`, rollback và restore. Đo availability theo NFR-07 (mỗi phút, 7 ngày, ≥99%) bằng probe ngoài VM. CI lint/test/build không thay thế các bằng chứng này.

Tham chiếu: [kiến trúc và traceability](../../README.md), [PlantUML](../../DeploymentDiagram.puml), [SVG](../../DeploymentDiagram.svg), [SRS](../../../requirements/srs.md), [ADR-004](004-logging-healthcheck.md), [ADR-005](005-configuration-management.md), [ADR-006](006-orm-migration-prisma.md).
