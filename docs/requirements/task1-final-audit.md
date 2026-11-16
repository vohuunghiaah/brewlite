# Task 1 — Final audit, 16/11/2026

## A. Trạng thái Task 1

| Hạng mục | Kết quả | Căn cứ |
|---|---|---|
| Task 1.1 | PASS | Đủ vấn đề, 6 stakeholder/mục tiêu, MVP/mở rộng/ngoài phạm vi, giả định, Next.js/NestJS/PostgreSQL, rủi ro. |
| Task 1.2 | PARTIAL | Đủ FR-01–13, NFR-01–06, MoSCoW, AC và 13 UC. Thiếu ngưỡng tính khả dụng; điều kiện tải/mạng NFR-01 chưa định lượng. GAP-03 chưa chốt tỷ lệ Loyalty nên AC mở rộng chưa có expected value cố định. |
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

- `git diff --check`: PASS.
- Kiểm tra Python: mã FR/NFR, 13 UC/4 actor, các mục AC FR-01–13, đường dẫn tệp Markdown: PASS. Không tuyên bố đã kiểm tra toàn bộ anchor hoặc liên kết web.
- PlantUML 1.2025.10 / Java 17: render cả hai PUML thành công, SVG khớp từng byte với bản nguồn đã duyệt. SVG đã được kiểm tra trực quan trong quá trình duyệt trước đó; audit không thay bố cục.
- `npm run lint` (apps/api): không báo lỗi, 2 warning no-misused-spread.
- `npm test -- --runInBand` (apps/api): FAIL, 2/3 test lỗi dependency injection (ProductsController thiếu ProductsService; ProductsService thiếu ProductRepository), 1/3 PASS.
- `npm run lint` (apps/web): FAIL, 1 lỗi react-hooks/set-state-in-effect tại menu/page.tsx:126, 1 warning no-img-element.
- `npm run build` (apps/api và apps/web): PASS.
- Các lệnh ứng dụng chạy trên workspace gốc; source/package giống origin/main (git diff rỗng). Đây là lỗi baseline, không phải hồi quy tài liệu. Build output được khôi phục về trạng thái sạch trước chạy; thay đổi .gitignore/Class có sẵn được giữ.
- Không chạy E2E/database/production hoặc kiểm chứng baseline feature Prisma.

## G. Git & Pull Request

Base `e0d7d257` (origin/main); source `bc9211a2` trên `docs/separate-order-payment-usecases`. PR #16 OPEN, chứa 10 tệp Task 2 và 10 tệp Task 1/công cụ. Nhánh audit riêng `docs/task1-final-audit-and-merge`, worktree riêng; không cherry-pick commit hỗn hợp, không force-push/reset/xóa branch.

Main protection: enforce_admins bật, không force-push/delete, yêu cầu resolve conversation; required approving reviews = 0; không có required status checks trong response protection. Main không có .github/workflows; PR #16 không có check run. Không coi thiếu CI là CI PASS.

## H. Post-Merge Verification

Chưa merge: Task 1.2 còn PARTIAL và lint/unit test thất bại. Không có merge SHA mới. Main vẫn ở baseline trước tách UC; việc xác minh Task 1 mới trên main chưa thể PASS.

## I. Task 2 Readiness

| Tạo phẩm | Đầu vào Task 1 | Cần kiểm chứng ở Task 2 |
|---|---|---|
| 2.1 Activity | UC-CORE-01 §3; UC-04 §4/6; UC-10 §2.3–2.4 | Đủ đầu-cuối, hết hàng, chưa đăng nhập, thanh toán thất bại; TX1 và TX2 độc lập. |
| 2.2 Sequence | UC-CORE-01 §3; UC-04/10 §2/4; FR-04–09 | Customer, Next.js, NestJS, DB, Payment Service; JWT, transaction, retry, đối soát và phản hồi cuối. |
| 2.3 Class | FR-02/04–10; state matrix §4; BR-REFUND-OCC | User/Product/Order/OrderItem/Payment/Promotion/LoyaltyTransaction, multiplicity, enum; trạng thái hoàn tiền theo thiết kế. |

PR #16 giữ ActivityDiagram, SequenceDiagram bản sửa và các bản UC10/Unified chưa merge. ClassDiagram có thay đổi local chưa commit trong workspace gốc. Không sửa hoặc nghiệm thu Task 2 trong audit này.

## J. Remaining Issues

Blocker merge: thiếu tiêu chí khả dụng và điều kiện đo NFR-01; lint web và unit test API thất bại; không có pipeline CI để cung cấp bằng chứng chạy checks. GAP-03 cần PO chốt expected value Loyalty; GAP-01/02/04/05 là khoảng hở triển khai/thiết kế đã ghi nhận, không được trình bày như chức năng hoàn tất. Chỉ tiếp tục merge khi quality gate và điều kiện nghiệm thu đã đạt; không bypass bảo vệ nhánh.
