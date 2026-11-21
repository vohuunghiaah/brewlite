# Nghiệm thu production BrewLite · 21/11/2026

## A. Executive summary

**RELEASE ACCEPTED** cho bản AWS Lightsail `7d808408`. Lúc 20:48 giờ Việt Nam, hai container ứng dụng đang phục vụ đúng digest của run đã duyệt. Đã phục hồi bản dump do chính run này tạo vào PostgreSQL 16 cô lập và đối chiếu với production. Nghiệm thu dự án còn các tiêu chí SRS và hồ sơ nộp bài đang mở. [Bảng bàn giao và yêu cầu còn thiếu](../final-handover-report.md)

## B. Định danh bản phát hành

Ngày 21/11/2026, GitHub trả về HEAD của `main` và SHA của run đều là `7d8084087678bdcae864e49d964315083c091107`. Workflow `deploy.yml` chạy bằng `workflow_dispatch`, nhánh `main`, Environment `production`. GitHub ghi nhận reviewer `vohuunghiaah` đã phê duyệt. Các mốc trong báo cáo dùng UTC trừ khi ghi rõ. [Commit](https://github.com/vohuunghiaah/brewlite/commit/7d8084087678bdcae864e49d964315083c091107) · [Run production](https://github.com/vohuunghiaah/brewlite/actions/runs/44879328653)

## C. Bằng chứng CI, build và triển khai

| Bước | Kết quả và bằng chứng |
|---|---|
| Push sau merge | [Quality Gates](https://github.com/vohuunghiaah/brewlite/actions/runs/44878650927) và [CD publish](https://github.com/vohuunghiaah/brewlite/actions/runs/44878650981) SUCCESS. |
| Production quality | API/Web lint, test và build, regression STDIN, PostgreSQL integration, rollback, Chromium MVP và ca ngoại lệ đạt. [Quality job](https://github.com/vohuunghiaah/brewlite/actions/runs/44879328653/job/136770940979) |
| Production build | Build & Publish SUCCESS. Hai image được publish lại ở cùng commit. Job triển khai dùng digest của **run production**. [Build job](https://github.com/vohuunghiaah/brewlite/actions/runs/44879328653/job/136772220351) |
| AWS | SUCCESS. Dòng kết quả lúc 07:32:59 lần lượt là `DEPLOY_UPDATED`, `DEPLOY_RUNNING api`, `DEPLOY_RUNNING web`, `DEPLOY_SMOKE`. Hai dòng RUNNING chứa digest ở mục D. [Log AWS](https://github.com/vohuunghiaah/brewlite/actions/runs/44879328653/job/136772861887) |

## D. Container và Docker digest

Kiểm tra qua SSH đã đối chiếu host key. Với mỗi ứng dụng, đọc image ID trên container, tra `RepoDigests` của chính ID đó và đối chiếu với job build. Cả bốn container có `RestartCount=0` lúc kiểm tra.

| Container | Trạng thái trực tiếp | Digest hoặc kiểm tra chức năng |
|---|---|---|
| API | running, healthy | `sha256:58123642d2498d27741624daf1b3901a9f9ea13b873c41d163c855930e1e27dc` |
| Web | running, healthy | `sha256:73b59f8c07f0af6339373c6dbb1bcd5acae97df96529d790cb9bc174cde60095` |
| DB | running, healthy | PostgreSQL 16.16, volume `app_postgres_data` tại `/var/lib/postgresql/data`, thực hiện được SELECT. |
| Caddy | running, không khai báo Docker healthcheck | `caddy validate` trả `Valid configuration`. HTTPS và reverse proxy hoạt động qua hai hostname. |

Kiểm tra log 60 phút đến khoảng 13:48 UTC, API/Web/DB lần lượt có 0/0/0 dòng, Caddy có 13 dòng. Không thấy dòng khớp ERROR, FATAL, PANIC, out of memory, OOMKilled hoặc uncaught exception trong mẫu này. Số restart phản ánh vòng đời container hiện tại.

## E. Migration, backup và rollback

Job ghi `Applied 0 migration(s). []` lúc 07:32:40. Truy vấn chỉ đọc thấy đúng bốn migration của release, theo thứ tự timestamp 1731888000000, 1731974400000, 1732060800000, 1732147200000. Chúng lần lượt tạo catalog, thêm customization, xác thực và payment/OCC. [Migrations](../../apps/api/src/migrations) · [Log backup và migration](https://github.com/vohuunghiaah/brewlite/actions/runs/44879328653/job/136772861887)

**Lần phục hồi mới, 13:48:03–13:48:18 UTC ngày 21/11.** Dump của đúng run là `/home/ubuntu/app/backups/db-backup-2026-11-21T07-32-28-692Z.sql`, owner `ubuntu`, mode `0600`, 17.675 byte. Phát hiện đủ header/footer pg_dump. SHA-256 khớp trước và sau truyền qua SSH: `719beeacb05bb0948962c033a0e0a4e9a45ff14315d3ef3551a6769f10fdc8ef`.

Dump được truyền qua stdin vào PostgreSQL 16 cục bộ với `--network none`, PGDATA trên tmpfs, `psql -X -v ON_ERROR_STOP=1`. Đối chiếu DDL từ `pg_dump --schema-only --no-owner --no-privileges`, bỏ hai loại dòng biến thiên là chú thích phiên bản và khóa phiên restrict/unrestrict. Hai schema có SHA-256 `81e6d8d712b069e561ec0f866fe9966cbbda411cb4338b33fc146437bd065a02`. Có 8 bảng public ở mỗi bên. Bảng dưới đây là số đếm tổng hợp, không chứa bản ghi khách hàng.

| Bảng | Production sau deploy | Restore từ dump trước migration |
|---|---:|---:|
| migrations | 4 | 4 |
| mock_gateway_refunds | 0 | 0 |
| mock_gateway_transactions | 1 | 1 |
| order_items | 2 | 2 |
| orders | 2 | 2 |
| payments | 1 | 1 |
| products | 4 | 4 |
| users | 2 | 2 |

Log trước cập nhật ghi API và Web đều chạy `49c582bc3c126621020b83363e2a51c5c0c3a6a5`. Trong lần kiểm toán này, GHCR trả được manifest theo digest, config và cả 8 tham chiếu layer cho mỗi image rollback. Chỉ container phục hồi tạm được thu hồi. Dữ liệu production và backup được giữ nguyên.

| Repository GHCR | Digest rollback |
|---|---|
| `ghcr.io/vohuunghiaah/brewlite-api` | `sha256:072657ab705cab85b974d5a472796970d4c3011b30cffbe4e51a0a9ee894f3b9` |
| `ghcr.io/vohuunghiaah/brewlite-web` | `sha256:012e59df46716ab52125d49bb86e7ef50479f8e659f798c9a55d7b439b7d5288` |

## F. HTTPS và kiểm tra bảo mật

Chạy smoke GET riêng trên [domain chính](https://brewlite.54-255-241-1.sslip.io/menu) và [domain demo](https://swe-brewlite.54-255-241-1.sslip.io/menu). Cả hai đạt 4/4. Menu trả HTML 200, products trả JSON 200 với 4 món, health trả 200 với `status=ok`, `database=up`, chứng chỉ TLS được client chấp nhận. GET /api/orders/me ẩn danh trả 401 ở cả hai. Header Menu có HSTS max-age=31536000, nosniff và X-Frame-Options DENY.

Docker chỉ publish TCP 80/443 của Caddy ra host. Web 3000, API 3001 và PostgreSQL 5432 là cổng nội bộ. Trong lần kiểm toán chỉ dùng GET, SELECT, inspect và đọc log trên production. Các ca tạo đơn/thanh toán, mất DB và IDOR thuộc môi trường CI cô lập.

## G. Sự cố SUCCESS giả

Ở run 44848336596, Compose kế thừa stdin của Bash nhận kịch bản qua SSH. Sau migration, Compose tiêu thụ phần lệnh cập nhật và smoke. Bash gặp EOF, trả 0 và runner ghi trạng thái thành công. Lần kiểm tra Lightsail trước phát hành xác nhận API/Web vẫn chạy 49c582bc. Regression test tái hiện bằng Compose thật ngay cả khi tiến trình migration không đọc stdin. [Run sự cố](https://github.com/vohuunghiaah/brewlite/actions/runs/44848336596/job/136676273647) · [Regression CI](https://github.com/vohuunghiaah/brewlite/actions/runs/44877932922/job/136766666928)

## H. Bằng chứng khắc phục

PR #39 tách lệnh rollout khỏi stdin SSH. Migration chạy với `--interactive=false -T` và `</dev/null`. Compose đợi health, script đọc digest từ từng container và chạy smoke HTTPS. Runner đối chiếu đủ bốn dòng đúng thứ tự trước khi ghi VERIFIED. CI kiểm tra mất mốc, sai image và smoke lỗi. Mục C–F xác minh luồng thành công của bản sửa trên AWS. [PR #39](https://github.com/vohuunghiaah/brewlite/pull/39) · [Mã kiểm tra đầu ra](../../scripts/verify-production-output.sh)

## I. Ma trận nghiệm thu phát hành

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| SHA, gate, build, reviewer, AWS và bốn mốc | PASS | B–C |
| Runtime, ingress, DB, TLS, smoke hai domain | PASS | D–F |
| Bảo toàn dữ liệu theo schema/số đếm, restore mới | PASS | E |
| Baseline rollback truy xuất được, rollback thử trong CI | PASS | C, E, G |
| NFR-07 trong 7 ngày | PENDING | Chưa có chuỗi 10.080 mẫu. |
| Bàn giao toàn bộ Assignment 2 | READY FOR REVIEW | [Ma trận Task, FR, NFR và khoảng trống](../final-handover-report.md) |

## J. Giới hạn

Chưa diễn tập rollback trên production trong lần này. Đối chiếu DB bao gồm schema và số đếm từng bảng, không so sánh giá trị từng hàng. Một VM và hai hostname cùng IP vẫn có chung điểm lỗi. Snapshot này không đo uptime dài hạn. FR-12 đã hoãn theo phạm vi được duyệt.

## K. Checklist bàn giao cho người vận hành

- [x] Đối chiếu SHA, người phê duyệt, mốc triển khai và digest đang chạy.
- [x] Phục hồi dump của run vào PostgreSQL riêng, đối chiếu schema và số đếm.
- [x] Kiểm tra HTTPS, health, log và image rollback bằng thao tác đọc.
- [ ] Người nhận thực hiện demo cô lập và ghi nhận review/retrospective.
- [ ] QA thu thập các bằng chứng NFR còn thiếu. [Checklist phát hành](production-release-checklist.md) · [Runbook](production-release-runbook.md)

## L. Kết luận

**RELEASE ACCEPTED** cho bản `7d808408` trên Lightsail. Hồ sơ bàn giao **READY FOR REVIEW**. Việc đóng toàn bộ dự án phụ thuộc các mục chưa đạt hoặc chưa đủ bằng chứng trong ma trận bàn giao.
