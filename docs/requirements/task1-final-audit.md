# Task 1 — Final audit, 16/11/2026

## A. Trạng thái Task 1

| Hạng mục | Kết quả | Căn cứ |
|---|---|---|
| Task 1.1 | PASS | Đủ vấn đề, 6 stakeholder/mục tiêu, MVP/mở rộng/ngoài phạm vi, giả định, Next.js/NestJS/PostgreSQL, rủi ro. |
| Task 1.2 | PASS (phạm vi Must Have) | Đủ FR-01–13, NFR-01–07, MoSCoW, AC và 13 UC. Người dùng phê duyệt cấu hình NFR-01/NFR-07 ngày 16/11/2026. GAP-03 là Should Have chờ PO, không chặn phạm vi bắt buộc. |
| Task 1.3 | PASS | UC-04 tạo PENDING; UC-10 độc lập thanh toán đơn có sẵn; UC-CORE-01 giữ hành trình đầu-cuối, không phải UC thứ 14. Các khoảng hở triển khai được công khai. |

Nguồn: Assignment2-BrewLite.pdf do người dùng cung cấp, VER 1.0, 8 trang; §3.1–3.3 (trang PDF 3–4), §4.1–4.3 (trang 4–5), §6.4 (trang 6), §8.1 (trang 7). SHA256: `3E9F50F3E98EBE966E31DDAC1173FDD8EB324FACEBD7B0782754EFB988B7C0EC`. Đã đọc toàn văn và xem trang PDF 4. Không dùng Assignment 1 thay nguồn nghiệm thu Assignment 2.

## B. Dependency Audit

- Chuyển liên kết Task 2 chưa merge sang đường dẫn dự kiến “Sẽ hoàn thiện ở Task 2”. Không đưa Activity/Sequence/Class vào PR này.
- Đồng bộ ngoại lệ mất mạng/OCC của kịch bản tích hợp với UC-10: rollback TX2 không rollback TX1 hoặc hoàn tiền ở cổng; áp dụng đối soát và BR-REFUND-OCC.
- Sửa phiên bản cũ trong kết luận context; bổ sung GAP-05 vào danh mục.
- PDF không quy định tỷ lệ Loyalty: sửa dẫn nguồn sai thành đề xuất ban đầu, giữ GAP-03 chờ PO.
- Các ADR lifecycle/OCC/JWT/idempotency của nhánh Prisma có số trùng nhưng nội dung khác bộ ADR trên main; ghi rõ baseline tham chiếu.

## C. Use Case Verification

Overview giữ nguyên bố cục đã duyệt: 13 UC, 4 actor, Customer nối UC-04/UC-10, gateway nối UC-10, UC-09 extend UC-04. Không có include/extend giữa UC-04 và UC-10. Đặc tả UC-04 gồm JWT, validate giỏ/giá, TX1/COMMIT, Order/OrderItem, trả id/code/totalAmount. UC-10 gồm quyền sở hữu, khóa/payload, SUCCESS/FAILED/PENDING, TX2/OCC, đối soát/hoàn tiền. Các quy tắc này là thiết kế mục tiêu, không xác nhận đã triển khai.

## D. Traceability Audit

FR-05 → UC-04 → POST /orders; FR-06 → UC-10 → POST /payments; FR-07 → UC-04/10/12 → state machine; FR-08 → UC-10 → idempotency; FR-09 → UC-04 kiểm tra sơ bộ / UC-10 OCC; FR-10 → UC-09/11; FR-11 → UC-05/06. FR-01–13 và NFR-01–06 có trong ma trận; các test ID trong đặc tả là dự kiến. PASS/đo hiệu năng ở cột feature là ghi nhận lịch sử, chưa tái kiểm chứng ở audit này.

## E. File Changes

Chỉ `docs/requirements/`, `docs/traceability-matrix.md`, `scripts/render-use-case-overview.py`. Kế thừa bản tách UC mới nhất từ `bc9211a2`; sửa tối thiểu các mâu thuẫn/liên kết kể trên. Hai cặp PUML/SVG giữ nguyên nội dung và bố cục đã duyệt. Không đổi ứng dụng, Task 2 hoặc Task 3.

## F. Test & Validation

- `git diff --check`, mã FR/NFR/UC, đường dẫn tệp Markdown: PASS. NFR-01–07 duy nhất; các mục AC FR-01–13 hiện diện.
- PlantUML 1.2025.10/Java 17: render hai PUML thành công; SVG khớp byte bản đã duyệt, không đổi bố cục.
- PR kỹ thuật #18: API lint exit 0 (2 warning có trước), 6/6 unit test PASS, API build PASS; web lint exit 0 (1 img warning), unit test fetch menu PASS (success/empty/HTTP error/network error/retry), web build PASS.
- Hosted CI [43799027479](https://github.com/vohuunghiaah/brewlite/actions/runs/43799027479) trên head `ae01c396` SUCCESS cho cả API/web: npm ci → lint → test → build. Không skip hoặc continue-on-error.
- Các lỗi baseline trước sửa: 2/3 test API thiếu provider, web set-state-in-effect; đã sửa ở PR #18, không sửa trong PR Task 1.
- Chưa thực hiện benchmark NFR-01, monitoring 7 ngày NFR-07, E2E/database/production hoặc tái kiểm chứng feature Prisma; đây là nghiệm thu đặc tả Task 1, không nghiệm thu tính năng triển khai.

## G. Git & Pull Request

PR kỹ thuật [#18](https://github.com/vohuunghiaah/brewlite/pull/18) đã MERGED bằng merge commit `eb98f505fbf054bbcb64bbd9b00cc91d19184987` sau hosted CI SUCCESS. Không có thay đổi Task 2/3. Branch protection được giữ; không dùng admin bypass, force-push hoặc xóa branch.

PR Task 1 [#17](https://github.com/vohuunghiaah/brewlite/pull/17), nhánh `docs/task1-final-audit-and-merge`, cập nhật main bằng merge an toàn; chỉ merge sau CI mới SUCCESS. PR #16 vẫn OPEN, head `bc9211a2`, chứa các thay đổi Task 2 chưa merge được bảo toàn. Worktree gốc giữ .gitignore/ClassDiagram chưa commit.

## H. Post-Merge Verification

Tại thời điểm commit báo cáo, PR #17 đang chờ CI cuối trên main mới; không tự nhận đã merge. Merge SHA và xác minh cây tài liệu main được báo cáo trong kết quả bàn giao sau khi merge thành công. PR #18 đã được xác minh MERGED trên GitHub.

## I. Task 2 Readiness

| Tạo phẩm | Đầu vào Task 1 | Cần kiểm chứng ở Task 2 |
|---|---|---|
| 2.1 Activity | UC-CORE-01 §3; UC-04 §4/6; UC-10 §2.3–2.4 | Đủ đầu-cuối, hết hàng, chưa đăng nhập, thanh toán thất bại; TX1 và TX2 độc lập. |
| 2.2 Sequence | UC-CORE-01 §3; UC-04/10 §2/4; FR-04–09 | Customer, Next.js, NestJS, DB, Payment Service; JWT, transaction, retry, đối soát và phản hồi cuối. |
| 2.3 Class | FR-02/04–10; state matrix §4; BR-REFUND-OCC | User/Product/Order/OrderItem/Payment/Promotion/LoyaltyTransaction, multiplicity, enum; trạng thái hoàn tiền theo thiết kế. |

PR #16 giữ ActivityDiagram, SequenceDiagram bản sửa và các bản UC10/Unified chưa merge. ClassDiagram có thay đổi local chưa commit trong workspace gốc. Không sửa hoặc nghiệm thu Task 2 trong audit này.

## J. Remaining Issues

Blocker tài liệu Task 1 Must Have đã giải quyết: NFR-01/NFR-07 được người dùng phê duyệt 16/11/2026 (xem SRS §3); GAP-03 là FR-10 Should Have chờ quyết định, không chặn phạm vi bắt buộc. Các gate kỹ thuật đã đạt trên PR #18; PR #17 phải chạy lại trước merge. GAP-01/02/04/05 còn là giới hạn triển khai được ghi rõ, không phải tuyên bố chức năng đã hoàn thành.

Không thực hiện Task 2. Các phép đo hiệu năng/khả dụng và kiểm thử tích hợp sẽ là công việc triển khai/nghiệm thu sản phẩm sau Task 1.
