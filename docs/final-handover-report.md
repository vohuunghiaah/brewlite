# Bàn giao BrewLite ASM2 · 21/11/2026

**Người nhận:** giảng viên nghiệm thu, người vận hành release và nhóm tiếp quản. **Bản sản phẩm:** `7d8084087678bdcae864e49d964315083c091107`. **Trạng thái:** RELEASE ACCEPTED trên AWS, hồ sơ READY FOR REVIEW. Các bảng dưới đối chiếu đề *BrewLite – Assignment 2, Requirements to Deployment*, v1.0, §§3–9, với [SRS](requirements/srs.md), [use cases](requirements/use-cases.md), [RTM lịch sử](traceability-matrix.md) và bằng chứng tại SHA phát hành. PASS ở một Task tài liệu chỉ xác nhận tạo phẩm của Task đó.

## Sản phẩm và kiến trúc

Khách xem **Menu → tùy chỉnh size/topping → giỏ hàng → tạo đơn → thanh toán mô phỏng → vé xác nhận/lịch sử**. UC-04 commit TX1 tạo PENDING. UC-10 độc lập xử lý payment, idempotency, OCC và chuyển PAID sau TX2. Người sở hữu mở lại vé Digital Buzzer. FR-12 (Staff/Barista) đã được hoãn. [Đặc tả UC-04 và UC-10](requirements/use-case-place-order.md) · [Thay đổi giao diện và phạm vi trong PR #38](https://github.com/vohuunghiaah/brewlite/pull/38)

Một VM Lightsail Singapore chạy Caddy, Next.js, NestJS và PostgreSQL 16 trên mạng Compose. Caddy nhận HTTPS, chuyển trang đến Web:3000 và /api đến API:3001. NestJS dùng TypeORM kết nối DB:5432 với volume bền vững. GitHub Actions build hai image lên GHCR, đợi reviewer cho Environment production, chạy backup, migration, cập nhật bằng digest và smoke. Hai hostname cùng dùng VM và IP. [Deployment diagram](architecture/DeploymentDiagram.svg) · [ADR Lightsail](architecture/adr/adr/007-aws-lightsail-deployment.md) · [Compose production](../docker-compose.prod.yml)

### Release notes

PR #39 sửa lỗi rollout có thể kết thúc sau migration. Lần phát hành này triển khai cả các thay đổi giao diện đã merge trước đó, dùng hai digest bất biến, ghi nhận 0 migration mới và cả bốn mốc deploy. Bản rollback là `49c582bc`. SHA và tag image dùng định danh release. Khi kiểm toán, GitHub trả về 0 Git tag và 0 GitHub Release. Bản ghi chi tiết gồm digest, URL và kết quả thử restore của chính release. [Biên bản production](deployment/final-production-acceptance-2026-11-21.md) · [Run AWS](https://github.com/vohuunghiaah/brewlite/actions/runs/44879328653)

## Đối chiếu Task và PR đã merge

| Requirement | Status | Evidence | Remaining Gap | Recommendation |
|---|---|---|---|---|
| 1.1 Bối cảnh và stakeholder | PASS | [Phạm vi](requirements/context-and-scope.md), [audit #17](https://github.com/vohuunghiaah/brewlite/pull/17) | — | Dùng cùng baseline khi chấm. |
| 1.2 FR, NFR, ưu tiên, use-case tổng quát | PASS | [SRS](requirements/srs.md), [sơ đồ UC](requirements/use-case-overview.svg), [Task 1](requirements/task1-final-audit.md) | Kết quả chạy từng yêu cầu ở bảng dưới. | Tách đặc tả khỏi kết quả đo. |
| 1.3 Use-case trọng tâm | PASS | [Đặc tả và ngoại lệ](requirements/use-case-place-order.md), [hình UC](requirements/use-case-place-order.svg), [#14](https://github.com/vohuunghiaah/brewlite/pull/14) | Có sai khác hợp đồng UC-04 khi triển khai. | Xử lý tại FR-05. |
| 2.1 Activity | PASS | [UC-04](diagram/ActivityDiagram.svg), [UC-10](diagram/ActivityDiagram-UC10.svg), [end-to-end](diagram/ActivityDiagram-Unified.svg), [#19](https://github.com/vohuunghiaah/brewlite/pull/19) | — | Dùng bản SVG kèm nguồn. |
| 2.2 Sequence | PASS | [UC-04](diagram/SequenceDiagram.svg), [UC-10](diagram/SequenceDiagram-UC10.svg), [end-to-end](diagram/SequenceDiagram-Unified.svg), [#20](https://github.com/vohuunghiaah/brewlite/pull/20) | — | Demo ranh giới commit TX1/TX2. |
| 2.3 Class | PASS | [Class diagram](diagram/ClassDiagram-Conceptual.svg), [#21](https://github.com/vohuunghiaah/brewlite/pull/21), [audit #22](https://github.com/vohuunghiaah/brewlite/pull/22) | Một số lớp thuộc thiết kế mở rộng. | Đối chiếu module trước khi demo. |
| 3.1 Quyết định kiến trúc | PASS | [Kiến trúc](architecture/README.md), [ADR](architecture/adr/README.md), [#23](https://github.com/vohuunghiaah/brewlite/pull/23) | Baseline triển khai dùng TypeORM. | Đọc các ADR theo trạng thái. |
| 3.2 Deployment UML | PASS | [Deployment UML](architecture/DeploymentDiagram.svg), [#24](https://github.com/vohuunghiaah/brewlite/pull/24), [runtime](deployment/final-production-acceptance-2026-11-21.md) | Một VM. | Kiểm tra lại diagram khi đổi topology. |
| 4.1 Repository, backlog, quy ước và DoD | PASS | [Kiểm kê](task-4.1-verification.md), [#25](https://github.com/vohuunghiaah/brewlite/pull/25) | — | Dùng backlog của hai sprint. |
| 4.2 Quản lý tài liệu | PASS | [Chỉ mục](README.md), [change control](document-control.md), [#26](https://github.com/vohuunghiaah/brewlite/pull/26) | — | Giữ mốc thời gian báo cáo cũ. |
| 4.3 Menu Sprint 1 | PASS | [#27](https://github.com/vohuunghiaah/brewlite/pull/27), [test Menu](../apps/web/tests/menu-page.test.tsx) | — | Demo GET danh sách và chi tiết. |
| 4.4 CI cho PR | PASS | [Báo cáo CI](task-4.4-ci-verification.md), [#28](https://github.com/vohuunghiaah/brewlite/pull/28), [run phát hiện lỗi](https://github.com/vohuunghiaah/brewlite/actions/runs/44877728708), [run sửa đạt](https://github.com/vohuunghiaah/brewlite/actions/runs/44877932922) | Branch protection yêu cầu hai check API/Web. | Giữ strict và enforce_admins. |
| 5.1 MVP Sprint 2 | PASS luồng MVP | [#29 giỏ hàng](https://github.com/vohuunghiaah/brewlite/pull/29), [#30 auth](https://github.com/vohuunghiaah/brewlite/pull/30), [#31 payment](https://github.com/vohuunghiaah/brewlite/pull/31), [#32 CORS](https://github.com/vohuunghiaah/brewlite/pull/32), [#33 lịch sử](https://github.com/vohuunghiaah/brewlite/pull/33) | Các khác biệt SRS chi tiết ở bảng FR. | Demo luồng đã chạy trong CI. |
| 5.2 Tích hợp và kiểm thử | PASS | [#34](https://github.com/vohuunghiaah/brewlite/pull/34), [hồ sơ Task 5.2](task-5-2-completion-report.md), [quality job của release](https://github.com/vohuunghiaah/brewlite/actions/runs/44879328653/job/136770940979) | Chromium là browser E2E. | Đo các NFR riêng. |
| 5.3 CD, migration, smoke, rollback | PASS | [#35](https://github.com/vohuunghiaah/brewlite/pull/35), [#39](https://github.com/vohuunghiaah/brewlite/pull/39), [log rollout thật](https://github.com/vohuunghiaah/brewlite/actions/runs/44879328653/job/136772861887) | Rollback đã mô phỏng trong CI. | Khi có sự cố dùng digest ở biên bản. |
| 5.4 Triển khai và bàn giao | PASS triển khai / PENDING bàn giao | [baseline #36](https://github.com/vohuunghiaah/brewlite/pull/36), [readiness #37](https://github.com/vohuunghiaah/brewlite/pull/37), [biên bản 5.4.2](deployment/final-production-acceptance-2026-11-21.md) | Chưa thấy video/biên bản demo trực tiếp, Sprint Review, Sprint Retrospective hoặc xác nhận người ngoài nhóm clone và chạy. | Người nhận demo, lưu biên bản hai sprint và ký nhận. |

## Ma trận chức năng

Các hàng dẫn tới mã hoặc test của release. [Phiên CI PostgreSQL/Chromium](https://github.com/vohuunghiaah/brewlite/actions/runs/44879328653/job/136770940979) kiểm tra luồng tích hợp, quyền sở hữu, giả lập lỗi và retry. FAIL bên dưới là sai khác tiêu chí cụ thể với SRS; các luồng MVP ghi PASS đã chạy độc lập.

| Requirement | Status | Evidence | Remaining Gap | Recommendation |
|---|---|---|---|---|
| FR-01 · UC-01 Menu | PASS chức năng | [Menu, tìm kiếm/lọc](../apps/web/src/app/menu/menu-controller.mjs), [test API](../apps/api/src/products/products.e2e.spec.ts), smoke 4 món | Mục tiêu độ trễ khi chịu tải ở NFR-01. | Demo filter, tìm kiếm và tải danh sách. |
| FR-02 · UC-02 Tùy chỉnh | PASS | [Tính giá/chuẩn hóa ghi chú](../apps/web/src/app/menu/menu-controller.mjs), [test modal](../apps/web/tests/menu-modal-flow.test.mjs) | — | Đổi size/topping và so sánh giá. |
| FR-03 · UC-03 Giỏ | PASS | [E2E giỏ, số lượng và tổng tiền](../scripts/e2e-mvp-acceptance.mjs) | — | Thử hai cấu hình khác nhau. |
| FR-04 · UC-07/08 Auth | PASS | [Test đăng ký/login/bcrypt](../apps/api/src/auth/auth.e2e.spec.ts), CI auth | — | Demo bằng tài khoản test cục bộ. |
| FR-05 · UC-04 Tạo đơn | FAIL tiêu chí hợp đồng | [Entity](../apps/api/src/orders/entities/order.entity.ts), [TX1](../apps/api/src/orders/orders.service.ts), [TX2](../apps/api/src/payments/payments.service.ts). TX1 tạo PENDING và lưu snapshot. | SRS §4.5 yêu cầu UUID và mã hiển thị lúc tạo; runtime dùng ID số, gán orderCode khi thanh toán thành công. | PO chốt hợp đồng ID và thời điểm gán mã; sau đó đồng bộ SRS hoặc triển khai và test bằng PR riêng. |
| FR-06 · UC-10 Payment | PASS luồng ví/thẻ mô phỏng | [Enum phương thức](../apps/api/src/payments/entities/payment.entity.ts), [gateway và xử lý kết quả](../apps/api/src/payments/payments.service.ts), CI failed/retry và PAID | Nhãn wire MOMO/VIETQR/CARD khác cách gọi E_WALLET/BANK_CARD trong SRS. | Công bố bảng ánh xạ cho người tích hợp. |
| FR-07 · UC-04/10/12 Trạng thái | PARTIAL | [Máy trạng thái](../apps/api/src/orders/state-machine/order-state-machine.ts), [payment](../apps/api/src/payments/payments.service.ts) | Có kiểm soát PENDING/FAILED/PAID. Kịch bản staff trong SRS §4.7 chưa nghiệm thu E2E; guard dùng BadRequestException. | Ghi ngoại lệ cho các AC liên quan FR-12. |
| FR-08 · UC-10 Idempotency | PASS nghiệp vụ payment | [Kiểm tra UUID v4, replay](../apps/api/src/payments/payments.service.ts), [test DB](../apps/api/src/payments/payments.postgres.integration.spec.ts) | Không bao gồm tạo đơn TX1 hoặc tích điểm chưa triển khai. | Giữ test retry/cùng khóa. |
| FR-09 · UC-04/10 Tồn kho | PASS | [Kiểm tra sơ bộ](../apps/api/src/orders/orders.service.ts), [tranh chấp PostgreSQL](../apps/api/src/payments/payments.postgres.integration.spec.ts), CI kiểm tra giảm kho | — | Giữ regression OCC trong PostgreSQL. |
| FR-10 · UC-09/11 BREW20 và Loyalty | BLOCKED nghiệm thu · Should Have | [SRS §4.10 và GAP-03](requirements/srs.md), đối chiếu [module API](../apps/api/src) và danh mục bảng DB trong biên bản | Không tìm thấy tính giảm BREW20 hoặc sổ điểm trên release. Tỷ lệ điểm còn chờ PO. | Quyết định scope/ngoại lệ và công thức. |
| FR-11 · UC-05/06 Vé và lịch sử | PASS hành vi / PARTIAL đường dẫn SRS | [UI Menu](../apps/web/src/app/menu/page.tsx), [test history](../apps/web/tests/order-history.test.tsx), [IDOR](../apps/api/src/orders/orders.security.spec.ts) | Vé và lịch sử hoạt động trong UI Menu; SRS nêu đường dẫn riêng /order/confirmation. | Chốt URL chính thức khi ký nghiệm thu. |
| FR-12 · UC-12 Pha chế | DEFERRED · Should Have | [Quyết định phạm vi release](traceability-matrix.md), [PR #38](https://github.com/vohuunghiaah/brewlite/pull/38) | Staff Portal và PATCH trạng thái chưa triển khai theo quyết định phạm vi. | Đưa vào backlog nếu có phê duyệt mới. |
| FR-13 · UC-13 Health | PASS | [Controller](../apps/api/src/health.controller.ts), [test](../apps/api/src/health.controller.spec.ts), hai host trả database=up | Chỉ là ảnh chụp tại thời điểm probe. | Dùng thêm trong bộ đo NFR-07. |

## Ma trận phi chức năng

| Requirement | Status | Evidence | Remaining Gap | Recommendation |
|---|---|---|---|---|
| NFR-01 Hiệu năng | PENDING | [Quy trình đo SRS §3](requirements/srs.md), hai smoke live | Thiếu báo cáo ba API, 20 người dùng đồng thời, p95 <500 ms và 30 lượt mobile cold-cache FCP p95 <1,5 s. | QA benchmark ở môi trường 4 vCPU/8 GB đúng profile SRS, dùng DB riêng cho POST. |
| NFR-02 Bảo mật | PARTIAL | [Auth](../apps/api/src/auth/auth.service.ts) bcrypt cost 10, HS256 có expiry, [DTO/whitelist](../apps/api/src/main.ts), [JWT/IDOR](../apps/api/src/orders/orders.security.spec.ts), live 401 và TLS | Các ca đã chạy đạt. Chưa có biên bản phân tích tĩnh bảo mật/SQL injection bao phủ kết luận 0 lỗi nghiêm trọng theo SRS. | Lưu kết quả rà soát mã và phạm vi test bảo mật. |
| NFR-03 Usability/PWA | PENDING | [E2E responsive Chromium](../scripts/e2e-mvp-acceptance.mjs), [đặc tả UI](ui/figma-design-spec.md) | Thiếu Lighthouse Accessibility ≥90, bảng target 44×44 và bằng chứng Safari/Firefox/Edge. | Chạy audit ở viewport 360–430 px và các trình duyệt yêu cầu. |
| NFR-04 ACID/OCC | PASS trong các trường hợp đã kiểm thử | [Tests PostgreSQL](../apps/api/src/payments/payments.postgres.integration.spec.ts), [âm tính và replay](../scripts/e2e-security-exceptions.mjs) | — | Giữ test hai request tranh chấp và rollback. |
| NFR-05 Container | PASS | [Compose](../docker-compose.yml), [CI tái tạo DB](../scripts/test-compose.mjs), [quality job](https://github.com/vohuunghiaah/brewlite/actions/runs/44879328653/job/136770940979) | CI ghi từng DB/API/Web healthy trong 30 giây từ lúc khởi động container tương ứng. | Tách thời gian build image khỏi thời gian health. |
| NFR-06 CI/CD | PASS trên phạm vi lịch sử kiểm tra | 23/23 run push main của quality.yml thành công tại thời điểm kiểm toán; API/Web là required checks strict, enforce_admins bật. [CI](task-4.4-ci-verification.md) · [CD](deployment/final-production-acceptance-2026-11-21.md) | Số liệu chỉ bao phủ các run GitHub trả về của workflow này. | Duy trì gate và lưu log phát hành. |
| NFR-07 Availability | **PENDING** | [Định nghĩa phép đo](requirements/srs.md), [smoke tại một thời điểm](deployment/final-production-acceptance-2026-11-21.md) | Repo có smoke và container health; không tìm thấy lịch synthetic từng phút, bộ dữ liệu 7 ngày hoặc báo cáo 10.080 mẫu. Không có timer khớp tên BrewLite/uptime/synthetic trên VM trong lần kiểm tra. | Mở nhiệm vụ monitoring riêng dưới đây. |

## Demo và kiểm thử API cho giảng viên

1. **Production, chỉ đọc.** Mở [Menu](https://swe-brewlite.54-255-241-1.sslip.io/menu). Chạy ba GET dưới đây. Health phải trả 200 với database=up, catalog là mảng JSON, lịch sử ẩn danh phải trả 401. Có thể lấy ID thật trong catalog rồi GET /api/products/{id}. [Domain dự phòng cùng VM](https://brewlite.54-255-241-1.sslip.io/menu)
2. **Demo đầy đủ ở local.** Clone repository tại SHA nêu trên. Dùng cấu hình dev theo [README gốc](../README.md) và [hướng dẫn test cô lập](testing/task-5-2.md). Dùng DB và tài khoản test riêng. Mở Menu trên localhost:3000, chọn size/topping, sửa số lượng, đăng ký/đăng nhập, đặt đơn PENDING, chọn ví/thẻ mock, kiểm tra PAID và mã nhận món, rồi mở lại vé trong lịch sử.
3. **Demo có thể lặp lại.** Trong checkout của release, dùng Node 24 và Docker, cài dependency theo README, chạy `node scripts/test-compose.mjs`. Bộ test tạo Compose project cô lập, thực hiện Chromium E2E, ghi kết quả và ảnh vào test-results. Đối chiếu trạng thái UI với GET /orders/me bằng JWT của tài khoản test, hoặc xem [log QA](https://github.com/vohuunghiaah/brewlite/actions/runs/44879328653/job/136770940979). Chỉ gửi POST /orders và POST /payments trên local. Chi tiết request/DTO và Idempotency-Key UUID v4 có trong [kịch bản API](../scripts/e2e-security-exceptions.mjs).

```sh
curl -i https://swe-brewlite.54-255-241-1.sslip.io/api/health
curl -i https://swe-brewlite.54-255-241-1.sslip.io/api/products
curl -i https://swe-brewlite.54-255-241-1.sslip.io/api/orders/me
```

## Bước tiếp theo và ký nhận

- **QA / NFR-07:** đề xuất đầu đo độc lập ngoài VM. Sau khi được duyệt, chạy mỗi phút đủ 7 ngày liên tục. Mỗi lượt GET /menu (200 + nội dung Menu), /api/products (200 + JSON đúng) và /api/health (200 + DB up), timeout 5 giây mỗi probe. Lưu UTC, URL, status, latency, DB và lỗi. Đếm timeout, bảo trì, lỗi nội dung hoặc thiếu lượt là không khả dụng. PASS khi ít nhất 9.980/10.080 lượt đạt đủ ba probe. Kiểm tra bộ đo khi rớt frontend/API/DB và timeout trong môi trường cô lập. Lưu log thô, thời gian đầu/cuối và cách tính. Chưa tạo dịch vụ giám sát hay tài nguyên tính phí.
- **PO và QA:** ra quyết định bằng văn bản cho FR-05, FR-07, FR-10 và URL xác nhận FR-11; chốt bảng phương thức FR-06. Hoàn tất benchmark, accessibility và bằng chứng bảo mật. Giữ FR-12 trong danh sách đã hoãn.
- **Nhóm và giảng viên:** ghi người nhận, ngày demo, SHA, kết quả clone/chạy độc lập và ý kiến. Bổ sung Sprint Review/Retrospective. Nếu yêu cầu Git tag/GitHub Release riêng, maintainer xuất bản sau phê duyệt. Khi vận hành, dùng [checklist](deployment/production-release-checklist.md), [runbook](deployment/production-release-runbook.md) và [hướng dẫn rollback](deployment/rollback-guide.md).
- **Quyết định:** bản production có bằng chứng nghiệm thu. Hồ sơ sẵn sàng review. Các mục PENDING/BLOCKED/FAIL cần kết quả hoặc ngoại lệ có người phê duyệt trước khi đóng toàn bộ dự án.
