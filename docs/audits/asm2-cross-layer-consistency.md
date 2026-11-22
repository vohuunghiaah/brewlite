# Đối chiếu từ PDF đến dữ liệu và kiểm thử · 23/11/2026

Baseline và lịch sử PR xem [inventory](asm2-final-baseline.md). Các mã UC dưới đây theo SRS §5.2. A, S và C lần lượt chỉ [activity](../diagram/ActivityDiagram-Unified.svg), [sequence](../diagram/SequenceDiagram-Unified.svg) và [class](../diagram/ClassDiagram-Conceptual.svg). D chỉ [deployment](../architecture/DeploymentDiagram.svg). API dùng đường dẫn gốc trong LOCAL.

| PDF | SRS / UC | UML | UI → API → lưu trữ | Kiểm thử và kết quả |
|---|---|---|---|---|
| §3.2, §6.3 | FR-01 / 01 | A/S/C Product | MenuScreen, products.mjs → GET /products → ProductsService → products | products.e2e, menu-page, Newman catalog |
| §7.1 | FR-02 / 02 | A/S/C OrderItem | ProductModal → GET /products/:id. Size, topping chuyển qua DTO OrderItem khi checkout | products.test.mjs, review-fixes, OrdersService tests |
| §7.1 | FR-03 / 03 | A/S | CartDrawer + session-cart.ts → quantity, size, toppings. API tính lại tổng trong TX1 | menu-page, orders.service.spec, Chromium |
| §7.1 | FR-04 / 07–08 | S/C User | AuthModal → register/login → users, bcrypt, JWT guard | auth.e2e, jwt.config, Newman auth |
| §3.3, §4.2 | FR-05 / 04 | A/S/C Order + items | POST /orders mở TX1 trước đọc giá/kho. Commit ID số, PENDING, items, totalAmount. Chưa giữ kho. | orders.e2e, PostgreSQL, Newman Orders |
| §4.2, §7.1 | FR-06 / 10 | A/S/C Payment | CheckoutScreen → POST /payments. Ghi attempt, gọi mock ngoài transaction. TX2 commit PAID, mã nhận món và SUCCESS | payments.e2e, payments.postgres.integration, Newman decline/retry |
| §3.2 | FR-07 / 04,10 | A/S/C enum | assertOrderTransition bảo vệ chuyển trạng thái thanh toán. Trạng thái pha chế có enum, hành động nhân viên hoãn theo C2 | payments.service, integration; phạm vi Barista DEFERRED |
| §4.2 | FR-08 / 10 | S Payment | UUID v4 toàn cục, kiểm tra user và payload. Replay thành công trả cùng payment; khác payload 409. Tạo order chưa có khóa | payments.controller, payments.service, payments entity, Newman replay và stock |
| §4.2 | FR-09 / 04,10 | A/S/C Product | TX2 cập nhật có điều kiện theo version/stock. Xung đột rollback rồi TX3 và mock refund; worker đối soát sau restart | payments.postgres.integration, E2E exceptions |
| §4.3 | FR-10 / 09,11 | C Promotion, LoyaltyTransaction | Lớp domain DEFERRED. Không có ledger/discount backend hoặc migration tương ứng | Chưa có test nghiệp vụ thực thi, C3 |
| §7.1 | FR-11 / 05,06 | A/S/C | Vé trong /menu; #orders hoặc #history. GET /orders/me lọc userId, /orders/:id trả order/items. Payment status có endpoint riêng | order-history, review-fixes, Newman ownership và Chromium |
| §3.2, §4.3 | FR-12 / 12 | C Staff | Role khái niệm. API không có PATCH trạng thái pha chế; cột role không tồn tại | Isolated Compose kiểm tra schema; tính năng DEFERRED |
| §7.2 | FR-13 / 13 | D | GET /health → SELECT 1 → 200/up hoặc 503/down | health.controller.spec, stop/start PostgreSQL |
| §3.2 | NFR-01 | D, menu/order | GET products/detail, POST orders; FCP trên mobile | BLOCKED. Thiếu bộ đo p95 đúng cấu hình trong SRS §3 |
| §3.2 | NFR-02 | S/D | Auth, whitelist DTO, ownership, catalog guard, Caddy HTTPS | Auth/security/negative tests; Gitleaks quét 170 run đã hoàn tất tại snapshot. Xem D4 |
| §3.2, §6.3 | NFR-03 | A/D | Responsive Next.js; menu, modal, cart, checkout | Chromium không tràn ngang tại 360/390/430/768/1280 px. Lighthouse 12.8.2 trên /menu production đạt accessibility 94/100, còn cảnh báo color-contrast và heading-order. Thiếu bốn trình duyệt và kiểm tra toàn bộ touch target |
| §4.2 | NFR-04 | A/S/C | Product.version, transactions, unique payment key, refund, advisory lock | PostgreSQL conflict/recovery suite PASS |
| §7.2 | NFR-05 | D | Hai Compose, bốn migration, seed 15 sản phẩm, persistent volume | Clean test DB + seed lại + health PASS. Chưa chứng minh time-to-healthy ≤30s |
| §6.4, §7.3 | NFR-06 | D | Quality workflow, GHCR images, rollout script, smoke/rollback | Xem baseline CI và production. Không ngoại suy thành 100% lịch sử main |
| §3.2 | NFR-07 | D | /menu, /api/products, /api/health | Probe hiện tại thành công. Thiếu 10.080 mẫu liên tục |

## Những sai khác làm thay đổi cách đọc sơ đồ

1. TX1 bao gồm đọc giá/kho và ghi snapshot. Lỗi tồn kho tại bước tạo đơn trả 400. TX2 chỉ trừ kho sau gateway SUCCESS.
2. Order.id là số, orderCode được cấp lúc PAID. Payment UUID là khóa idempotency, không phải khóa chính của đơn.
3. POST /payments trả HTTP 201 cho kết quả bình thường kể cả FAILED/PENDING. Trạng thái nằm trong body. GET trả 200. Worker chạy độc lập sau bootstrap và theo chu kỳ mặc định 30 giây.
4. Database tra khóa toàn cục trước khi so khớp owner/payload. POST cùng khóa khác chủ nhận 403. Order detail chỉ đọc order/items; query payment có controller riêng.
5. Diagram domain phân biệt entity đã triển khai với role, view khái niệm và extension hoãn. Quan hệ domain giữa khách và đơn áp dụng cho đơn mới có xác thực. Cột userId thực tế cho phép null để giữ dữ liệu legacy.
6. Deployment cũ còn ghi Caddyfile, GHCR, health và runtime ở trạng thái dự kiến. Sơ đồ hiện hành ánh xạ web/api tới apps/web và apps/api, DB và network tới hai Compose, public proxy tới Caddyfile, phát hành tới deploy.yml và rollout-production.sh. ADR-001–005,007 mô tả các quyết định tương ứng; ADR-006/Prisma là đề xuất lịch sử.

Phạm vi kiểm tra UML bao gồm source và bản SVG. Các nhánh phục hồi lỗi commit trong sơ đồ chi tiết mô tả cả giao thức thiết kế; kiểm thử retry/restart/OCC không chứng minh mọi trường hợp mất kết nối tại ranh giới COMMIT. Xem [GAP register](asm2-gap-register.md).
