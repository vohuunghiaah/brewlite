# BrewLite Assignment 2 · Nghiệm thu ngày 23/11/2026

**PARTIAL.** Luồng đặt và thanh toán, migration, seed, kiểm thử Chromium/PostgreSQL, LOCAL cho Postman và HTTPS production đã có bằng chứng thực thi. Chưa thể ký nghiệm thu toàn bộ PDF v1.0 do thiếu hồ sơ release, review/retro, xác nhận người ngoài nhóm và bằng chứng NFR. Đã đọc toàn bộ bản gốc “Requirements to Deployment”, Đại học Sài Gòn. PDF §2 yêu cầu thứ tự tạo phẩm; lịch sử PR #12–43 thể hiện các lần hiệu chỉnh và bàn giao tuần tự, dù các nhánh prototype cũ đã có code trước đó.

## Task matrix

| Task | Kết quả | Bằng chứng và giới hạn |
|---|---|---|
| 1.1 | PASS | context-and-scope §§1–5 có vấn đề quầy, sáu nhóm stakeholder và kỳ vọng, scope MVP/mở rộng, assumptions/constraints/risks. Phân hệ khách hàng chạy qua Chromium. |
| 1.2 | PASS đặc tả | SRS có FR-01–13, NFR-01–07, MoSCoW, AC, overview source/SVG; C1–C4 đã duyệt. Kết quả thực thi NFR tách ở RTM. |
| 1.3 | PASS đặc tả | use-case-place-order.md và sơ đồ use-case, actor, trigger, điều kiện, main/alternative/exception, UC-04 tạo PENDING và UC-10 thanh toán. |
| 2.1 | PARTIAL | Activity source/SVG có swimlane, thiếu JWT, thiếu hàng, thanh toán lỗi/retry. Đã chỉnh TX1 và response; một số nhánh phục hồi chi tiết chưa đủ evidence. |
| 2.2 | PARTIAL | Sequence có đủ 5 lifeline, validate, transaction, key và OCC. Đã chỉnh ID, HTTP và lookup. D6 theo dõi nhánh commit không xác định. |
| 2.3 | PASS domain | Năm entity chính và hai lớp mở rộng theo PDF; source Mermaid và SVG có enum, multiplicity và phân biệt role/domain. |
| 3.1 | PASS | Nest module + TypeORM, 4 migration, mock gateway, health, config, stdout; 7 ADR có lịch sử lựa chọn/trade-off. |
| 3.2 | PASS sơ đồ | Deployment source/SVG cho LOCAL, CI và Lightsail. Caddy, GHCR, web/api/db, volume, network, port, env và log đều truy được tới cấu hình. |
| 4.1 | PASS | Monorepo, PR, bảo vệ main, README/.env.example, backlog hai sprint, DoD, convention. Issues #1–5 đóng. |
| 4.2 | PASS tài liệu | Docs có source/export và lịch sử review; sửa chín liên kết ở báo cáo Task 5.3, cập nhật RTM và giữ baseline lịch sử. |
| 4.3 | PASS | API list/detail, seed 15 sản phẩm, menu responsive, loading/empty/error và component tests. |
| 4.4 | PASS | PR triggers Install/Lint/Test/Build. GitHub yêu cầu cả hai check API/web, strict=true, enforce_admins=true. [Run lỗi](https://github.com/vohuunghiaah/brewlite/actions/runs/45056240033) và [run xanh](https://github.com/vohuunghiaah/brewlite/actions/runs/45056571129) của PR #44. |
| 5.1 | PASS phạm vi MVP đã duyệt | Menu → size/topping → cart → auth → PENDING → payment → ticket → history. Thanh toán bảo toàn key khi chờ đối soát; Barista/Loyalty/Promotion hoãn. |
| 5.2 | PASS | DB rỗng, bốn migration, seed lặp lại giữ inventory, Jest/PostgreSQL/OCC, Chromium E2E, health khi dừng/khởi động lại DB. |
| 5.3 | PASS cho release đã triển khai | GHCR digest, approved deploy, backup, migration, HTTPS smoke thành công; regression rollout trong CI. Khôi phục production thực tế cần quyền vận hành. |
| 5.4 | PARTIAL | Public frontend/API/health hoạt động. Thiếu release/tag, review/retro, ký nhận độc lập. Video/demo: **EXCLUDED BY USER — REQUIRED BY ORIGINAL ASSIGNMENT**. |

## UML, traceability và quyết định

[Ma trận 13 FR và 7 NFR](asm2-cross-layer-consistency.md) nối PDF, UC, sơ đồ, API/DB, frontend và tests. Sáu nhóm sai khác kỹ thuật/biểu diễn được mô tả ở cuối ma trận. [GAP register](asm2-gap-register.md) ghi bốn quyết định C1–C4 đã được Project Leader duyệt, lỗi UI khi gateway chờ, và các tiêu chí bằng chứng còn mở. Tránh cộng số assertion Postman, số bước E2E và số Jest test thành một số ca độc lập.

## Repository và GitHub

[Baseline, danh sách tài liệu và branch](asm2-final-baseline.md). Inventory trước dọn gồm 27.932 file tracked: 27.646 file apps/api/node_modules, 16 file apps/api-temp và 270 file còn lại. Dockerfile và CI cài từ lockfile, không có entry point/import sang starter. Đã bỏ dependency tree khỏi Git và xóa starter trên branch. Danh sách đầy đủ truy được bằng `git show --name-status d136c435`. Giữ toàn bộ source đang chạy, migrations, tests, UML, screenshot/evidence, backup/rollback, lockfile và tài liệu lịch sử. PR #44 sở hữu hồ sơ security/release; README ở nhánh audit chỉ thêm liên kết LOCAL ở phần riêng.

Theo phê duyệt, kiểm tra lại tip + PR rồi xóa nguyên tử 34 remote branch ở các dòng Candidate. Sau dọn còn main, docs/task5-4-release-security-handover (#44), feature/sprint1-mvp-foundation (#7), docs/separate-order-payment-usecases, feature/menu-ui, feature/sprint2-full-flow; thêm nhánh audit khi publish. Các remote-tracking ref chỉ có trong cache local không thuộc danh sách đã xóa.

## LOCAL, Postman và kiểm thử

Project **brewlite-local**, container brewlite-local-web/api/db, port loopback 3000/3001/5432, volume brewlite-local_postgres_data. Đã khởi động với JWT riêng, đổi catalog key local, kiểm tra dữ liệu đơn sau restart DB. Theo phê duyệt đã dừng/gỡ sáu container bộ rehearsal và pr38, giữ image và volume cũ. Network rehearsal/pr38 còn lưu. Volume cũ gồm brewlite_postgres_data, brewlite-rehearsal_postgres_data, brewlite-pr38_postgres_data và volume test cũ; volume vô danh chưa quy chủ được giữ nguyên. CI dùng project/volume UUID riêng, tự xóa sau test. [Hướng dẫn Postman](../testing/postman-local-guide.md).

| Kiểm tra đã chạy | Kết quả |
|---|---|
| API Jest, có PostgreSQL | 16 suite, 130/130 PASS |
| Web Node / Jest component | 14/14 và 80/80 PASS. Đã chạy lại component trong NODE_ENV=test sau sửa PENDING |
| Lint và build | API/web pass trong test-compose --quality |
| Env safety | 9/9 PASS |
| Chromium + PostgreSQL | 14/14 bước; gồm menu, giỏ, xác thực, thanh toán, confirmation và history |
| Exceptions / quyền / đồng thời | 11/11 PASS trong test project |
| Compose local và production | config -q; local có ba container healthy. Test DB health 200 → 503 → 200 |
| Newman 6 | Hai lượt, mỗi lượt 33 request và 63/63 assertion PASS, gồm JWT, 400/401/403/404/409, replay, stock và catalog CRUD fixture |
| Secrets | Gitleaks v8.24.3 git origin/main, 130 commit, 178,39 MB, zero findings với cấu hình checkout #44. Chưa xác minh toàn bộ lịch sử CI logs |

Lượt API thử trước dọn thiếu PostgreSQL nên có 30 test fail trong suite DB. Lượt component chạy trực tiếp trong container development có một lỗi do test simulator ẩn ở mode đó. Kết quả bảng trên dùng database riêng và đúng NODE_ENV=test. [Run CI độc lập trên checkout sạch](https://github.com/vohuunghiaah/brewlite/actions/runs/45058713827) và [các check của PR #45 theo HEAD mới nhất](https://github.com/vohuunghiaah/brewlite/pull/45/checks).

## Production và release

Ngày 23/11/2026 (Asia/Saigon), GET /menu = 200 HTML, /api/products = 200 (15 sản phẩm), /api/health = 200, database=up. [Frontend](https://brewlite-swe.duckdns.org/menu) · [API](https://brewlite-swe.duckdns.org/api/products) · [Health](https://brewlite-swe.duckdns.org/api/health).

[Deployment 45049566612](https://github.com/vohuunghiaah/brewlite/actions/runs/45049566612) ghi main 4e47d14c35177b94d287f1f3814c9299b896ea5b, pre-deployment backup 17,26 KB, mode 0600, migration và smoke HTTPS. DEPLOY_RUNNING tại rollout ghi API sha256:8b5480f86e1d3eec54edff636f428bdddacd21de3f4fe5db699fdac3fec8b316 và web sha256:c0db6dc0d5ca54da5f96fe4aaf25aad30684ee20bf7a3da092174f61cf4de178. Compose production chỉ publish cổng Caddy; firewall hiện hành và running digest sau rollout chưa được kiểm tra qua host. SSH strict host verification dừng trước xác thực vì known_hosts local thiếu khóa đã ghim cho IPv4 của VM. Main chưa có Git tag/GitHub Release. Không kích hoạt deploy từ đợt audit.

## Kết luận theo phạm vi

| Phạm vi | Trạng thái | Điều kiện còn lại |
|---|---|---|
| Technical readiness | PASS phạm vi MVP đã duyệt | Giới hạn retry tạo đơn sau mất ACK còn OPEN |
| Assignment compliance | PARTIAL | D1–D6, đặc biệt hồ sơ §7.4 và xác nhận giảng viên về video |
| Production readiness | PARTIAL | Production đang phục vụ; NFR thời gian dài, firewall và kiểm chứng host thời điểm audit còn thiếu |
| Documentation readiness | PARTIAL | Hồ sơ sự kiện sprint và bàn giao cần người tham gia thực tế xác nhận |
| Postman readiness | PASS | Chọn LOCAL và điền catalogKey riêng từ .env |
