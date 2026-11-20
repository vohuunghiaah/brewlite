# Task 5.2 — Tích hợp và kiểm thử

## Phạm vi và kiểm toán trước triển khai

Cơ sở đối chiếu là Assignment 2 §7.2, trang in 6 (trang PDF 7), với sáu tiêu chí nghiệm thu, SRS v1.4.0, UC-04/10, RTM và main sau PR #33 (`36c8a739`). Phạm vi gồm Web Next.js, API NestJS và PostgreSQL 16.

| Requirement | Existing Implementation | Evidence tại base | Gap | Proposed Fix | Acceptance Criteria |
|---|---|---|---|---|---|
| Unit | Jest API, Jest/Node Web | orders.service.spec.ts, tests/order-history.test.tsx | PARTIAL. UC-04 chưa kiểm tổng lượng của các biến thể theo tồn kho | Kiểm tra sơ bộ TX1 và bổ sung ca hồi quy | Toàn bộ suite xanh, gồm Task 5.1 |
| Integration | Jest PG và script HTTP ngoại lệ | payments.postgres.integration.spec.ts, e2e-security-exceptions.mjs | PARTIAL. Suite tự synchronize, thiếu đối chiếu giá đổi và lịch sử qua API thật | Dùng migration và kiểm tra HTTP cùng bản ghi DB | TX1, TX2, replay, rollback, refund và ownership đúng |
| E2E | Chromium với DB và vé chuông | e2e-mvp-acceptance.mjs | PARTIAL. Size có thể bị bỏ qua, thiếu assert tổng và lịch sử | Bắt buộc tùy chỉnh, xác minh UI/API/DB | Một hành trình hoàn chỉnh, log và ảnh |
| Migration/seed | Ba migration tăng dần, seed bốn sản phẩm theo tên | src/migrations, products.seed.ts | PARTIAL. Migration đầu cần bảng nền đã tồn tại | Thêm migration nền và kiểm chứng hai lượt | DB trống chạy được, lần hai bảo toàn dữ liệu |
| Compose | Ba service, volume và pg_isready | docker-compose.yml, hai Dockerfile | PARTIAL. Node 22 khác CI 24, Web không chờ API sẵn sàng | Đồng bộ runtime, readiness và stack kiểm thử riêng | Cả ba dịch vụ healthy, browser giao dịch thật |
| Health | Controller chỉ có GET / | app.controller.ts, SRS §4.13 | MISSING. Chưa có probe DB | SELECT 1 qua DataSource và test mất DB | HTTP 200/up, 503/down, phục hồi sau khi DB trở lại |

CI ở base có lint, test, build cho API và Web. Chưa có job chạy Chromium với Compose hoặc tải bằng chứng.

## Kết quả kiểm thử và bằng chứng

| Yêu cầu | Kết quả local | Mã nguồn / phép thử | Bằng chứng |
|---|---|---|---|
| Unit nghiệp vụ | PASS | `orders.service.spec.ts`, `payments.service.spec.ts`, `tests/menu-modal-flow.test.mjs` | Giá biến thể, canonical key, gộp món, kiểm tra tổng lượng yêu cầu theo từng sản phẩm ở TX1 |
| Integration API/PG | PASS | `orders.service.ts`, `payments.service.ts`, `payments.postgres.integration.spec.ts`, `e2e-security-exceptions.mjs` | JWT, quyền sở hữu, giá mới, order/items, từ chối, replay, tranh chấp, rollback, đối soát và hoàn tiền |
| E2E | PASS | `scripts/e2e-mvp-acceptance.mjs` | Chromium headless tạo đơn PENDING 120.000 đ, thanh toán VietQR, hiển thị vé và lịch sử; tồn 51 → 49, version 1 → 2 |
| Migration và seed | PASS | `src/database.ts`, `src/prepare-database.ts`, `src/migrations`, `products.seed.ts` | 0 bảng → 4 migration → 4 sản phẩm. Lượt sau áp dụng 0 migration, giữ cả giá trị tồn đã chỉnh |
| Compose | PASS | `docker-compose.yml`, `compose.test.yml`, hai Dockerfile, `test-compose.mjs` | Web, API và PostgreSQL 16 healthy trên volume mới; giao dịch qua CORS thật |
| Health | PASS | `health.controller.ts`, `health.controller.spec.ts`, `test-compose.mjs` | Cùng API trả 200/up → 503/down khi dừng DB → 200/up khi DB trở lại. Giới hạn lấy kết nối PG là 2 giây |

[Log nghiệm thu có chọn lọc](testing/task-5-2-evidence/acceptance.txt) · [Bảy ảnh gốc của cùng lượt chạy](testing/task-5-2-evidence/) · [Lệnh tái hiện và chẩn đoán](testing/task-5-2.md).

| Lớp kiểm thử | PASS | FAIL | SKIP | Phạm vi |
|---|---:|---:|---:|---|
| API Jest unit | 54 | 0 | 0 | Service/controller, migration, JWT config, health |
| API Jest HTTP với repository giả lập | 36 | 0 | 0 | Auth, đơn, thanh toán, sản phẩm; có 7 ca phân quyền đơn |
| API Jest PostgreSQL thật | 29 | 0 | 0 | Thanh toán, OCC, rollback, recovery, legacy migration |
| Web Node Test Runner | 14 | 0 | 0 | Giỏ, giá, tải catalog và lỗi mạng |
| Web Jest component | 30 | 0 | 0 | Menu, lịch sử và đặt lại đơn |
| Node kiểm tra môi trường | 9 | 0 | 0 | DEF-02 |
| HTTP/SQL ngoại lệ và nghiệp vụ | 11 | 0 | 0 | Gồm kiểm tra phân quyền lịch sử và TX1 tính lại giá |
| Chromium E2E | 1 | 0 | 0 | 13 bước, 7 ảnh |

## Thay đổi mã nguồn

- API dùng chung danh sách migration cho Nest, CLI và Jest/PG. Migration nền có timestamp trước ba migration hiện hữu. Bảng nền liên kết order items với đơn (CASCADE) và sản phẩm (RESTRICT). Các migration kế tiếp bổ sung customization, users/email unique, FK chủ đơn, stock/version, payment, index và unique idempotency key. Cả ba migration cũ giữ nguyên.
- Bootstrap chỉ seed catalog mẫu ở development/test. Seed tuần tự hóa hai lượt chạy đồng thời trong transaction và chỉ thêm tên còn thiếu. Script hoàn tiền làm giảm tồn của fixture sau khi TX1 thành công để tái hiện đúng xung đột tại TX2.
- Docker dùng Node 24 và npm ci. Compose giữ ba cổng local mặc định, chờ readiness theo thứ tự DB → API → Web. File override dành cho nghiệm thu dùng mã nguồn trong image để tránh phụ thuộc cache, node_modules hay .env trên máy trạm.
- Playwright bắt buộc chọn size Vừa, topping Kem cheese và hai ly, đối chiếu phép tính độc lập với UI và DB, rồi so vé với lịch sử. Script môi trường chuyển mật khẩu của docker exec qua biến môi trường tiến trình. Các điều kiện từ chối môi trường của DEF-02 được giữ nguyên.
- CI giữ các quality gate cũ và thêm job Compose/Chromium cùng artifact log, ảnh. Các thay đổi README và RTM dẫn tới bằng chứng theo mã FR/UC đã duyệt.

## Hạn chế và phạm vi kết luận

Hai cảnh báo lint API `no-misused-spread` nằm trong ProductsService từ baseline. Chúng không làm lint thất bại. Bài nghiệm thu dùng Mock Gateway đã định nghĩa cho UC-10. Phép thử readiness bao phủ một chu kỳ ngắt/kết nối lại cục bộ; chỉ tiêu uptime 7 ngày của NFR-07 cần một cửa sổ đo riêng.

## GitHub Actions và kết luận nghiệm thu

Lượt CI đầu của PR #34 đạt cả hai job lint/test/build, 13 bước Chromium và 11 ca HTTP/SQL. Probe sau khi dừng DB gặp lỗi socket trước khi nhận được HTTP status. Runner đã chuyển sang kết nối HTTP độc lập cho mỗi probe và tiếp tục đòi hỏi đúng status cùng JSON trong 5 giây. [Log CI đầu tiên](https://github.com/vohuunghiaah/brewlite/actions/runs/44683961548).

Cả sáu yêu cầu đạt nghiệm thu local. Kết quả CI tại commit hiện hành, artifact Ubuntu và kết luận sẵn sàng merge được ghi trong [biên bản PR #34](https://github.com/vohuunghiaah/brewlite/pull/34) và [Checks tại HEAD](https://github.com/vohuunghiaah/brewlite/pull/34/checks).
