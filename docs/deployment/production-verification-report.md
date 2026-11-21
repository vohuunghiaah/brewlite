# BrewLite — Nghiệm thu production trên AWS Lightsail

**Cập nhật 21/11/2026.** Run #44879328653 đã triển khai bản `7d808408`. Đã kiểm tra lại digest từ container, hai hostname, PostgreSQL và phục hồi dump của run. [Biên bản và bốn mốc runtime](final-production-acceptance-2026-11-21.md)

### Bản ghi ngày 20/11/2026

**PRODUCTION RUNNING — CD DEPLOYMENT PATH NOT YET VERIFIED**

Ngày 20/11/2026, khoảng 20:16–20:19 giờ Việt Nam (13:16–13:19 UTC). Phiên nghiệm thu dùng trình duyệt và HTTPS từ ngoài AWS, bảng điều khiển Lightsail, SSH vào đúng instance, PostgreSQL ở chế độ chỉ đọc, API của GitHub và registry GHCR. Trang thực đơn hoạt động, database đã áp dụng đủ migration và hai image đang chạy khớp bản phát hành. GitHub chưa có lần chạy job deploy production. Máy chủ cũng chưa có cặp image của bản trước để quay lui.

## A. Production Deployment Evidence

Lightsail hiển thị `brewlite-production` ở Singapore, `ap-southeast-1a`, trạng thái `Running`. Cả system status check và instance status check đều `Passed`. SSH qua Lightsail xác nhận Ubuntu 24.04.5 LTS. Lúc 13:16:37 UTC, `git rev-parse HEAD` tại `/home/ubuntu/app` trả về `49c582bc3c126621020b83363e2a51c5c0c3a6a5`, trùng HEAD của `main` tại thời điểm kiểm tra. File tracked có khác biệt trên máy chủ là `Caddyfile`. [Máy chủ trên Lightsail](https://ap-southeast-1.console.aws.amazon.com/lightsail/webapp/ap-southeast-1/instances/brewlite-production/networking) · [Commit phát hành](https://github.com/vohuunghiaah/brewlite/commit/49c582bc3c126621020b83363e2a51c5c0c3a6a5)

| Container | Trạng thái thực tế | RestartCount | Cổng và image |
|---|---|---:|---|
| `brewlite-prod-web` | running, healthy | 0 | 3000 nội bộ, GHCR Web tại SHA phát hành |
| `brewlite-prod-api` | running, healthy | 0 | 3001 nội bộ, GHCR API tại SHA phát hành |
| `brewlite-prod-db` | running, healthy | 0 | 5432 nội bộ, `postgres:16-alpine` |
| `brewlite-prod-caddy` | running, không khai báo Docker healthcheck | 0 | Publish TCP 80/443, `caddy:2-alpine`. Đã xác minh phục vụ HTTP và HTTPS ở mục C |

`docker compose -f docker-compose.prod.yml ps -a`, `docker ps -a` và `docker inspect` trên máy chủ cho thấy cả bốn container đang chạy. Số container unhealthy, restarting hoặc exited tại thời điểm lấy mẫu là 0. Mục D đối chiếu nội dung image bằng digest.

## B. Migration Evidence

**MIGRATION PASS.** Truy vấn trực tiếp `public.migrations` và danh sách migration biên dịch trong container API cho cùng bốn bản ghi, theo cùng thứ tự. TypeORM `showMigrations()` trả về `false` cho câu hỏi có migration chờ hay không. Cả phiên SQL kiểm tra và kết nối TypeORM dùng `default_transaction_read_only=on`; `SHOW transaction_read_only` trả về `on`.

| ID trong PostgreSQL | Timestamp của migration | Tên đã áp dụng |
|---:|---:|---|
| 1 | 1731888000000 | `CreateOrderCatalog1731888000000` |
| 2 | 1731974400000 | `AddCustomizationAndNoteToOrderItems1731974400000` |
| 3 | 1732060800000 | `AddAccountAuthentication1732060800000` |
| 4 | 1732147200000 | `AddPaymentsAndStockOcc1732147200000` |

PostgreSQL 16.16 trả về tám bảng trong schema `public`. Đối chiếu metadata entity của chính image API với catalog PostgreSQL cho kết quả **48 cột, 0 khác biệt** trên năm bảng `users`, `orders`, `products`, `order_items`, `payments`. Các thuộc tính so sánh gồm tên, kiểu, khả năng nhận NULL, khóa chính và các kích thước, precision, scale được entity khai báo. Ba bảng còn lại là `migrations`, `mock_gateway_transactions` và `mock_gateway_refunds`. Kết quả này xác minh schema trong phạm vi đã nêu. [Danh mục migration của backend](https://github.com/vohuunghiaah/brewlite/blob/49c582bc3c126621020b83363e2a51c5c0c3a6a5/apps/api/src/database.ts)

Volume đang gắn là `app_postgres_data` tại `/var/lib/postgresql/data`. Trên máy chủ, `stat` xác nhận tệp `/home/ubuntu/app/backups/db-backup-2026-11-20T12-56-05-888Z.sql` có **16.876 byte**, chủ sở hữu `root`, mode `0600`. Đếm được đúng một dòng kết thúc `-- PostgreSQL database dump complete`. Đây là bản sao lúc 12:56 UTC, trước lần cập nhật tồn kho quan sát được lúc 13:11 UTC. Khả năng phục hồi từ tệp này cần một lần restore riêng trong môi trường cô lập.

## C. Smoke Test Evidence

Đích nghiệm thu là [BrewLite production](https://brewlite.54-255-241-1.sslip.io). Từ máy ngoài Lightsail, chạy `scripts/smoke-test.mjs` với `TARGET_ENV=production` và `TARGET_URL` là URL này. Tiến trình kết thúc với mã 0. Không tạo đơn hoặc thanh toán trong phép thử.

| Phép thử | Kỳ vọng | Thực tế | Kết quả |
|---|---|---|---|
| GET HTTPS `/menu` | HTTP 200, thực đơn có dữ liệu | 200, 229 ms. Chrome hiển thị “Thực đơn hôm nay (4)” và đúng bốn tên, giá bên dưới | PASS |
| GET HTTPS `/api/health` | 200, API và DB sẵn sàng | 200, 39 ms, `{"status":"ok","database":"up"}`. `pg_isready` trên DB trả về `accepting connections` | PASS |
| GET HTTPS `/api/products` | 200, JSON có bốn món | 200, 101 ms, bốn ID và giá khớp kết quả SQL | PASS |
| TLS công khai | Chuỗi tin cậy và tên miền khớp | TLS 1.3, `authorized=true`, SAN đúng hostname. Let's Encrypt YE1, hiệu lực 20/11/2026 11:57:00 đến 18/02/2027 11:56:59 UTC | PASS |
| HTTP `/menu` | Chuyển sang HTTPS | HEAD trả 308 và `Location` giữ nguyên hostname, đường dẫn `/menu` | PASS |
| Phản hồi và reverse proxy | Không có lỗi 5xx hoặc dấu hiệu lộ secret ở mẫu kiểm tra | Bộ kiểm tra response/header đạt. Trong 10 phút kết thúc 13:18:28 UTC, 305 dòng access log của Caddy, 0 dòng khớp status 5xx và 0 dòng log API khớp mẫu ERROR/ExceptionHandler | PASS |

| ID | Món hiển thị trong Chrome | Giá trên giao diện | Giá API = SQL | Tồn kho API = SQL |
|---:|---|---:|---:|---:|
| 1 | Cà phê Latte | 45.000 đ | 45000.00 | 50 |
| 2 | Trà đào | 35.000 đ | 35000.00 | 39 |
| 3 | Cacao sữa | 40.000 đ | 40000.00 | 35 |
| 4 | Nước suối | 10.000 đ | 10000.00 | 100 |

Truy vấn đối chiếu là `SELECT id, name, price, stock, version FROM products ORDER BY id`. Các số đo phản ánh thời điểm lấy mẫu. [Thực đơn](https://brewlite.54-255-241-1.sslip.io/menu) · [Health](https://brewlite.54-255-241-1.sslip.io/api/health) · [Products](https://brewlite.54-255-241-1.sslip.io/api/products)

## D. CI/CD Evidence

GitHub ghi nhận một run của `deploy.yml` tại thời điểm nghiệm thu. Run `44736526961` chạy do `push` vào `main` từ 12:31:44 đến 12:38:33 UTC, tại đúng commit ở mục A. [Chi tiết run](https://github.com/vohuunghiaah/brewlite/actions/runs/44736526961)

| Job / bằng chứng | Kết quả GitHub |
|---|---|
| Quality Gates & Verification | `success` cho lint, unit/integration, build, deployment tooling, Compose và E2E. [Job quality](https://github.com/vohuunghiaah/brewlite/actions/runs/44736526961/job/136289199948) · [Workflow quality riêng](https://github.com/vohuunghiaah/brewlite/actions/runs/44736526723) |
| Build & Publish Docker Images to GHCR | `success` cho cả hai bước Build & Push. [Job publish](https://github.com/vohuunghiaah/brewlite/actions/runs/44736526961/job/136291481542) |
| Deploy to Production (AWS Lightsail) | `skipped`, danh sách bước thực thi rỗng. Staging và job dry-run riêng cũng `skipped`. [Job production](https://github.com/vohuunghiaah/brewlite/actions/runs/44736526961/job/136292377360) |

Tag của cả hai image là SHA đầy đủ ở mục A. Ba nguồn độc lập cho cùng digest theo từng dòng bên dưới: log publish của GitHub, header `Docker-Content-Digest` của GHCR cho tag phát hành và `RepoDigests` của image lấy từ container đang chạy.

| Image GHCR | Digest đã đối chiếu |
|---|---|
| `ghcr.io/vohuunghiaah/brewlite-api` | `sha256:072657ab705cab85b974d5a472796970d4c3011b30cffbe4e51a0a9ee894f3b9` |
| `ghcr.io/vohuunghiaah/brewlite-web` | `sha256:012e59df46716ab52125d49bb86e7ef50479f8e659f798c9a55d7b439b7d5288` |

**Phương thức triển khai ghi nhận là SSH thủ công qua Lightsail.** Bằng chứng độc lập hiện tại xác nhận trạng thái máy chủ và loại trừ job Actions trên cho lần phát hành này. GitHub Deployments API trả 0 bản ghi. Hai bước migration và smoke production có trong workflow nhưng job chứa chúng bị bỏ qua. Bằng chứng ở B và C đến từ production trực tiếp. [Workflow của bản phát hành](https://github.com/vohuunghiaah/brewlite/blob/49c582bc3c126621020b83363e2a51c5c0c3a6a5/.github/workflows/deploy.yml)

**Approval gate chưa được cấu hình.** Với quyền quản trị repository, API liệt kê environments trả `total_count=0`, truy vấn riêng `production` trả 404. Repository có 0 Actions secrets và 0 Actions variables ở cấp repo. Vì vậy chưa có Required Reviewers để bảo vệ job production. Workflow yêu cầu dispatch từ `main`, đích `production`, chuỗi xác nhận `DEPLOY_PRODUCTION`, cấu hình SSH/DB/JWT, domain và cờ `PRODUCTION_APPROVAL_CONFIGURED`. Cờ này là xác nhận quản trị; bằng chứng phê duyệt phải đến từ protection rule và lịch sử review của GitHub.

## E. Rollback Readiness

- **Mô phỏng cô lập — PASS.** Log của bước *Deployment Tooling Verification Suite* ghi `[SIMULATION] PASS: FIX-11: Real Docker Compose rollback simulation in isolated project preserves volume data` lúc 12:34:06 UTC. Test gọi script rollback, kiểm tra API quay về image trước ở trạng thái healthy và bản ghi kiểm thử còn trong PostgreSQL. [Log job](https://github.com/vohuunghiaah/brewlite/actions/runs/44736526961/job/136289199948) · [Mã kiểm thử](https://github.com/vohuunghiaah/brewlite/blob/49c582bc3c126621020b83363e2a51c5c0c3a6a5/scripts/test-deployment-scripts.mjs#L638)
- **Đích rollback production — FAIL.** Máy chủ có `scripts/rollback.mjs`. Tệp mặc định `.deployment-state.json` vắng mặt. Kiểm tra tên biến trong phiên SSH và cấu hình triển khai không thấy `STATE_FILE`, `ROLLBACK_API_IMAGE` hoặc `ROLLBACK_WEB_IMAGE`. Danh sách image BrewLite trên host chỉ có tag phát hành hiện tại cho API và Web. Chưa xác định được phiên bản trước đủ điều kiện quay lui. Hai digest ở D có thể làm mốc cho lần nâng cấp sau. [Script rollback](https://github.com/vohuunghiaah/brewlite/blob/49c582bc3c126621020b83363e2a51c5c0c3a6a5/scripts/rollback.mjs)
- **Thực thi rollback trên production — NOT TESTED.** Phép nghiệm thu chỉ đọc. Backup SQL phục vụ khôi phục dữ liệu; cặp image tương thích và trạng thái release phục vụ quay lui ứng dụng.

## F. Security & Operations

| Hạng mục | Quan sát trên production |
|---|---|
| Tài nguyên | Gói General Purpose dual-stack, 2 vCPU, 2 GB RAM, 60 GB SSD. `free -m` ghi nhận tổng 1.905 MiB, dùng 690 MiB, available 1.215 MiB, swap 0. Phân vùng gốc 58 GiB, dùng 4,5 GiB (8%), còn 53 GiB |
| Tường lửa | Lightsail mở TCP 80 và 22 cho mọi IPv4/IPv6, cho phép Lightsail browser SSH; TCP 443 cho mọi IPv4. PostgreSQL 5432, API 3001 và Web 3000 không có rule public và không có Docker host-port binding |
| Quyền đọc | Metadata của tệp cấu hình runtime cho thấy owner là tài khoản triển khai, mode `0600`. Backup là `root:0600`. Kiểm tra phản hồi HTTP chỉ bao phủ các mẫu do smoke test định nghĩa |
| Địa chỉ | Lightsail hiển thị IPv4 `54.255.241.1` và nút **Attach static IP**. Kết nối TLS bên ngoài đến đúng IP này. Instance hiện dùng **Dynamic Public IPv4** |

**Tác động của Static IP.** Khi stop/start, IPv4 động có thể thay đổi. Cả hostname `brewlite.54-255-241-1.sslip.io` và `swe-brewlite.54-255-241-1.sslip.io` đều chứa IP hiện tại. Sau khi được duyệt, tạo và gắn Static IPv4 trong `ap-southeast-1` sẽ thay thế IPv4 công khai. Cần chuẩn bị hostname `sslip.io` theo IP mới hoặc bản ghi A của tên miền sở hữu, cập nhật các host Caddy, `DOMAIN`, `FRONTEND_URL` và liên kết đã chia sẻ. Caddy cần cấp chứng chỉ đúng tên mới. Với GitHub, đặt `LIGHTSAIL_HOST` theo IP mới, đối chiếu fingerprint của host qua kênh tin cậy trước khi cập nhật `LIGHTSAIL_SSH_KNOWN_HOSTS`. Chạy lại kiểm tra HTTPS, menu và API từ Internet sau chuyển đổi. [AWS Networking FAQ](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-networking.html) · [Hướng dẫn gắn Static IP](https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-create-static-ip.html)

**Chi phí tham chiếu ngày 20/11/2026.** Giá niêm yết Linux/Unix General Purpose có public IPv4, 2 GB và 60 GB là **12 USD/tháng**. Static IPv4 gắn với instance không tính thêm phí. AWS công bố **0,005 USD/giờ** cho Static IPv4 để rời quá một giờ. Số liệu trên là giá công bố, chưa đối soát hóa đơn, thuế hoặc ưu đãi của tài khoản. [Bảng giá Lightsail](https://aws.amazon.com/lightsail/pricing/) · [AWS Billing FAQ](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html)

## G. Acceptance Matrix

| Trạng thái | Hạng mục nghiệm thu | Bằng chứng |
|---|---|---|
| PASS | Instance Lightsail, bốn dịch vụ đang chạy, GHCR đúng phiên bản | A, D |
| PASS | Migration 4/4, 0 pending, schema entity và catalog dữ liệu phù hợp | B, C |
| PASS | Backup tồn tại, dung lượng, marker kết thúc và quyền đọc phù hợp | B |
| PASS | HTTPS/TLS, redirect, menu hiển thị, health/DB, products khớp SQL và kiểm tra lỗi trong mẫu | C |
| PASS | Quality gates, build/push GHCR, mô phỏng rollback cô lập | D, E |
| PASS | Cổng backend/DB nội bộ, TLS và quyền tệp cấu hình đã kiểm tra | A, C, F |
| FAIL | Environment production và Required Reviewers | D — environment chưa tồn tại |
| FAIL | Có cặp image bản trước để rollback production | E — thiếu state và đích bản trước |
| FAIL | Điều kiện vận hành có Static IPv4 | F — đã xác minh IP hiện tại là động |
| BLOCKED | Bằng chứng end-to-end GitHub Actions deploy tới production, bao gồm migration và smoke trong chính pipeline | D — thiếu cấu hình, job thực tế bị skip; chưa có release được duyệt để kiểm chứng |
| NOT TESTED | Thực thi rollback production; phục hồi backup trong DB cô lập | B, E |

## H. Kết luận và bàn giao Task 5.4

**Task 5.3 chưa đủ điều kiện nghiệm thu production toàn phần.** Production đang phục vụ người dùng. Các bước còn thiếu để xác minh đường triển khai CD và khả năng phục hồi:

1. Cấu hình environment `production` với Required Reviewers, đối chiếu quyền deploy từ `main` và thiết lập secrets/variables qua kênh quản trị. Đối chiếu cấu hình Caddy trên host với descriptor mà workflow sẽ chép lên để giữ cả hai hostname. Bảo toàn thông tin kết nối của DB đang dùng khi cấp cấu hình cho pipeline.
2. Dùng hai digest đã xác minh làm mốc quay lui cho lần nâng cấp tiếp theo. Thử restore backup vào PostgreSQL cô lập, ghi nhận dữ liệu phục hồi được, thời điểm backup, thời gian phục hồi và chính sách lưu bản sao ngoài instance.
3. Trình kế hoạch Static IP và DNS để chủ hệ thống phê duyệt. Rà soát khả năng giới hạn nguồn SSH trong khi vẫn giữ đường quản trị được kiểm chứng.
4. Ở lần phát hành thực sự được phê duyệt, lưu ID run, review, backup, state trước nâng cấp, log migration, digest đang chạy và smoke test trên hostname công khai. Đối chiếu chúng trước khi nâng trạng thái nghiệm thu CD.

**READY FOR MANUAL REVIEW**
