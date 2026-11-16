# Báo Cáo Kiểm Toán Kỹ Thuật: Task 2 Handover, Khoảng Hở GAP-01 đến GAP-05 & So Sánh Nền Tảng TypeORM - Prisma

**Dự án:** BrewLite — Hệ thống đặt đồ uống trực tuyến (Assignment 2)
**Tác giả:** Senior Software Architect & Technical Reviewer
**Thời điểm thực hiện:** 16/11/2026
**Baseline kiểm toán:**
- Nhánh chính `main`: Commit `ee09081464a2b03cc751fbf251b1416ca299a64e` (Sau khi nghiệm thu PR #21 - Task 2.3)
- Nhánh tính năng `feature/sprint2-full-flow`: Commit `588e33624d149faa6e9320d59a4488e78d6cfb08` (Prisma Baseline). *Lưu ý đối chiếu:* Commit `7f8cb4cb` trước đây được một số ghi chép nhắc tới thực chất là commit sáp nhập của nhánh `feature/sprint1-mvp-foundation` (PR #10 / PR #7), không phải HEAD commit của `feature/sprint2-full-flow`.
- Các tài liệu chuẩn: SRS v1.4.0 (`docs/requirements/srs.md`), UCD Overview v1.4.0, Đặc tả UC-04/UC-10 v1.4.0, 14 tệp sơ đồ UML chính thức trong `docs/diagram/`.

---

## MỤC LỤC
1. [Bối Cảnh & Mục Tiêu Báo Cáo](#1-bối-cảnh--mục-tiêu-báo-cáo)
2. [Kiểm Toán Toàn Diện GAP-01 Đến GAP-05](#2-kiểm-toán-toàn-diện-gap-01-đến-gap-05)
   - [2.1 GAP-01: Hoàn Tiền (Refund) & Xử Lý Thanh Toán Không Nhất Quán](#21-gap-01-hoàn-tiền-refund--xử-lý-thanh-toán-không-nhất-quán)
   - [2.2 GAP-02: Khóa Chống Trùng Lặp Phía Client (Client Idempotency Key)](#22-gap-02-khóa-chống-trùng-lặp-phía-client-client-idempotency-key)
   - [2.3 GAP-03: Công Thức Tích Điểm Loyalty (Loyalty Points Formula)](#23-gap-03-công-thức-tích-điểm-loyalty-loyalty-points-formula)
   - [2.4 GAP-04: Endpoint Kiểm Tra Sức Khỏe (Health Check API)](#24-gap-04-endpoint-kiểm-tra-sức-khỏe-health-check-api)
   - [2.5 GAP-05: Mất Phản Hồi Sau COMMIT Giao Dịch Tạo Đơn (Order Retry Idempotency)](#25-gap-05-mất-phản-hồi-sau-commit-giao-dịch-tạo-đơn-order-retry-idempotency)
3. [Bảng Tổng Hợp Kiểm Toán GAP-01 Đến GAP-05](#3-bảng-tổng-hợp-kiểm-toán-gap-01-đến-gap-05)
4. [Phân Tích So Sánh Kiến Trúc: TypeORM (`main`) vs Prisma (`feature/sprint2-full-flow`)](#4-phân-tích-so-sánh-kiến-trúc-typeorm-main-vs-prisma-featuresprint2-full-flow)
   - [4.1 Bảng So Sánh Kỹ Thuật 13 Tiêu Chí](#41-bảng-so-sánh-kỹ-thuật-13-tiêu-chí)
   - [4.2 Phân Tích Rủi Ro Di Chuyển Nền Tảng (Migration Risks)](#42-phân-tích-rủi-ro-di-chuyển-nền-tảng-migration-risks)
5. [Khuyến Nghị Kiến Trúc Phục Vụ Task 3 (Architecture & Deployment Design)](#5-khuyến-nghị-kiến-trúc-phục-vụ-task-3-architecture--deployment-design)

---

## 1. Bối Cảnh & Mục Tiêu Báo Cáo

Dự án BrewLite đã hoàn thành giai đoạn Phân tích và Thiết kế UML (Task 2) với việc nghiệm thu 3 phân hệ sơ đồ:
- **Task 2.1 (Activity Diagram):** Phân định 5 swimlanes (Khách hàng, Frontend, Backend, PostgreSQL, Thanh toán mô phỏng) và kiến trúc 2 giao dịch độc lập (TX1 tạo đơn PENDING, TX2 thanh toán & cập nhật trạng thái PAID qua OCC).
- **Task 2.2 (Sequence Diagram):** Chuẩn hóa tương tác tuần tự, cơ chế kích hoạt worker pha chế dựa trên sự kiện `due-work`, xử lý thất bại OCC và phục hồi trạng thái.
- **Task 2.3 (Class Diagram):** Chuẩn hóa mô hình lớp miền (Domain Class Diagram) dưới định dạng Mermaid (`ClassDiagram-Conceptual.mmd`).

Việc bàn giao từ Task 2 sang Task 3 (Thiết kế Kiến trúc Hệ thống & Deployment) và chuẩn bị cho Task 4 (Triển khai Sprint 1) cùng Task 5 (Triển khai Sprint 2 & Bàn giao - Delivery) đòi hỏi một cuộc kiểm toán khách quan về hiện trạng mã nguồn thực tế trên `main` so với tài liệu thiết kế và các nhánh tính năng (`feature/sprint1-mvp-foundation`, `feature/sprint2-full-flow`). Báo cáo này đóng vai trò:
1. Xác định hiện trạng kỹ thuật, nguyên nhân gốc rễ và giải pháp cho 5 khoảng hở nghiệp vụ/kỹ thuật đã được ghi nhận (**GAP-01 đến GAP-05**).
2. So sánh khách quan, có chứng cứ giữa nền tảng **TypeORM hiện có trên `main`** và nền tảng **Prisma trên nhánh tính năng `feature/sprint2-full-flow`**, ngăn ngừa rủi ro hồi quy hoặc hợp nhất thiếu kiểm soát.
3. Cung cấp căn cứ kiến trúc chuẩn xác cho Task 3.1 (Tài liệu kiến trúc, ADR) và Task 3.2 (Deployment Diagram).

---

## 2. Kiểm Toán Toàn Diện GAP-01 Đến GAP-05

### 2.1 GAP-01: Hoàn Tiền (Refund) & Xử Lý Thanh Toán Không Nhất Quán

- **Mã định danh:** `GAP-01`
- **Tên khoảng hở:** Cơ chế hoàn tiền (Refund) và xử lý giao dịch thanh toán không nhất quán giữa Cổng thanh toán và Cơ sở dữ liệu nội bộ.
- **Nguồn chứng cứ:**
  - SRS v1.4.0: `docs/requirements/srs.md` §2.3, §4.3 (Quy tắc `BR-REFUND-01`).
  - Use Cases: `docs/requirements/use-cases.md` (Mục tiêu thiết kế UC-10), `docs/requirements/use-case-place-order.md`.
  - Sơ đồ thiết kế: `docs/diagram/ActivityDiagram-UC10.puml` (Nhánh bù hoàn tiền tự động), `docs/diagram/SequenceDiagram-UC10.puml` (Luồng worker quét hoàn tiền `refundRetryAt`).
  - Mã nguồn backend: `apps/api/src/payments/payments.service.ts` (trên `feature/sprint2-full-flow` commit `588e3362`).
- **Hiện trạng trên `main` (TypeORM Baseline):**
  - **Hoàn toàn chưa có module Payments** (`apps/api/src/payments/` không tồn tại).
  - Không có bảng thanh toán, không có API hủy đơn hay hoàn tiền. Đơn hàng dừng lại ở trạng thái văn bản tĩnh `status = 'PENDING'` sau khi tạo.
- **Hiện trạng trên Feature Branch (Prisma Baseline):**
  - Đã có `PaymentsService` xử lý `processPayment` với 3 kịch bản mô phỏng (`SUCCESS`, `FAILED`, `PENDING`).
  - Trong kịch bản `SUCCESS`, việc trừ kho OCC và tạo bản ghi `Payment` được bọc chung trong một Prisma Transaction `this.prisma.$transaction(...)`.
  - **Khoảng hở thực tế:**
    1. Không có API endpoint `POST /payments/:id/refund` hoặc `POST /payments/refund`.
    2. Không có API endpoint `PATCH /orders/:id/cancel` cho phép hủy đơn và kích hoạt hoàn tiền.
    3. Nếu giả định cổng thanh toán là dịch vụ bên ngoài: khi tiền đã bị trừ ở cổng thanh toán nhưng giao dịch nội bộ thất bại do xung đột OCC (`ConflictException`), hệ thống **chưa có cơ chế gọi hoàn tiền tự động (Auto-refund)** hoặc ghi nhận trạng thái `REFUND_PENDING` kèm khóa `refundKey` và `refundRetryAt` như mô tả trong sơ đồ Task 2.
    4. Không có Background Worker quét và thử lại các giao dịch hoàn tiền bị lỗi mạng.
- **Mức độ ảnh hưởng:** **Cao (High)** đối với hệ thống thanh toán thực tế; **Trung bình (Medium)** trong phạm vi đồ án học tập có Mock Payment.
- **Rủi ro nghiệp vụ & Kỹ thuật:**
  - Khách hàng bị trừ tiền nhưng không nhận được đơn hàng (`PAID`), dẫn đến tranh chấp tài chính.
  - Nguy cơ quyết toán trùng nếu khách thanh toán lại mà lần thanh toán trước đó vẫn đang trong trạng thái mập mờ (Pending/In-flight).
- **Yêu cầu liên quan:** `FR-06` (Thanh toán mô phỏng), `FR-07` (Quản lý trạng thái đơn), `NFR-04` (Toàn vẹn dữ liệu).
- **Công việc cần làm để đóng GAP:**
  1. Bổ sung trường `refundKey: String?`, `refundStatus: PaymentStatus?`, `refundRetryAt: DateTime?` vào bảng `Payment`.
  2. Xây dựng endpoint `POST /payments/:id/refund` và tích hợp hàm gọi Mock Refund.
  3. Xây dựng NestJS Schedule Worker (`@Cron`) định kỳ quét các giao dịch ở trạng thái `REFUND_PENDING` để thử lại (Retry Loop) với chiến lược lũy thừa cơ số (Exponential Backoff, tối đa 3 lần).
  4. Nếu sau 3 lần vẫn thất bại, chuyển trạng thái sang `MANUAL_RECONCILIATION_REQUIRED` và cảnh báo quản trị viên.
- **Điều kiện kiểm thử nghiệm thu:**
  - Unit test: Mô phỏng thanh toán thành công nhưng OCC thất bại -> Bản ghi chuyển sang `REFUND_PENDING`.
  - Cron test: Worker kích hoạt gọi refund thành công -> Trạng thái chuyển sang `REFUNDED`.
- **Trạng thái:** `PROPOSED / IN DESIGN` (Đã được mô hình hóa trong Task 2; mã nguồn chưa triển khai).
- **Điểm chờ Product Owner phê duyệt:** Phê duyệt quy trình xử lý ngoại tuyến khi đối soát hoàn tiền tự động thất bại (`BR-REFUND-01`).

---

### 2.2 GAP-02: Khóa Chống Trùng Lặp Phía Client (Client Idempotency Key)

- **Mã định danh:** `GAP-02`
- **Tên khoảng hở:** Cơ chế lưu trữ, tái sử dụng và kiểm soát khóa chống trùng lặp (Idempotency Key) giữa Client và Backend.
- **Nguồn chứng cứ:**
  - SRS v1.4.0: `docs/requirements/srs.md` §2.3, §4.3 (Quy tắc `BR-IDEM-01`, `BR-IDEM-02`).
  - Sơ đồ thiết kế: `docs/diagram/ActivityDiagram-UC10.puml` (Luồng kiểm tra khóa và payload), `docs/diagram/SequenceDiagram-UC10.puml`.
  - Mã nguồn Frontend: `apps/web/src/app/checkout/page.tsx` (dòng 114-121 trên `feature/sprint2-full-flow` commit `588e3362`).
  - Mã nguồn Backend: `apps/api/src/payments/payments.service.ts` (dòng 34-52 trên `feature/sprint2-full-flow` commit `588e3362`).
- **Hiện trạng trên `main` (TypeORM Baseline):**
  - **Hoàn toàn chưa có cơ chế Idempotency.** `apps/api` không có middleware, interceptor hoặc bảng lưu khóa `idempotencyKey`.
- **Hiện trạng trên Feature Branch (Prisma Baseline):**
  - Backend đã có:
    - Ràng buộc duy nhất `@@unique([idempotencyKey])` trên bảng `Payment`.
    - Kiểm tra nếu `idempotencyKey` đã tồn tại thì trả về kết quả thanh toán cũ (Idempotent response).
  - **Khoảng hở thực tế:**
    1. **Phía Client Next.js (`CheckoutPage`):** Khóa `idempotencyKey` được sinh ngẫu nhiên qua `crypto.randomUUID()` bên trong hàm `handleCreateAndPay()`. Khóa này **không được lưu vào `sessionStorage` hay `localStorage`**. Nếu người dùng gặp lỗi mạng (timeout), tải lại trang (F5) hoặc ấn nút nhiều lần trong các lượt khác nhau, Client sẽ sinh ra một khóa UUID hoàn toàn mới. Điều này làm mất tác dụng bảo vệ chống trùng lặp của Backend trong kịch bản retry của người dùng.
    2. **Phía Backend:** Backend chỉ kiểm tra sự tồn tại của khóa (`findUnique({ where: { idempotencyKey } })`), **chưa kiểm tra tính nhất quán của payload**. Nếu cùng một khóa được gửi lại nhưng với `orderId` khác hoặc số tiền khác, Backend trả về kết quả của giao dịch cũ thay vì phát hiện xung đột (HTTP 409 Conflict) theo tiêu chuẩn IETF Idempotency Key.
- **Mức độ ảnh hưởng:** **Cao (High)**.
- **Rủi ro nghiệp vụ & Kỹ thuật:**
  - Khách hàng có thể bị trừ tiền 2 lần cho 1 đơn hàng khi mạng chập chờn và họ bấm thử lại.
  - Vi phạm nguyên tắc Idempotency của hệ thống thanh toán.
- **Yêu cầu liên quan:** `FR-08` (Thanh toán Idempotent), `NFR-04` (Toàn vẹn dữ liệu).
- **Công việc cần làm để đóng GAP:**
  1. **Frontend:** Lưu `currentPaymentIdempotencyKey` vào `sessionStorage` gắn với `orderId`. Khi thực hiện thanh toán lại cho cùng một đơn hàng, bắt buộc đọc lại khóa đã lưu. Chỉ sinh khóa mới khi tạo phiên thanh toán mới (new payment attempt).
  2. **Backend:** Bổ sung trường `requestHash` (SHA-256 của JSON payload `{ orderId, amount, method }`) vào bảng `Payment` hoặc bảng tạm `IdempotencyRecord`. Nếu trùng khóa nhưng khác `requestHash`, trả về HTTP 409 Conflict.
- **Điều kiện kiểm thử nghiệm thu:**
  - E2E Playwright test: Mô phỏng mạng chậm, người dùng bấm nút thanh toán liên tiếp -> Chỉ có đúng 1 giao dịch được tạo trong database.
  - Integration test: Gửi 2 request cùng `Idempotency-Key` với payload khác nhau -> Nhận về HTTP 409.
- **Trạng thái:** `PARTIAL` (Backend đã có unique constraint; Frontend chưa lưu và tái sử dụng khóa).
- **Điểm chờ Product Owner phê duyệt:** Không có (đây là yêu cầu kỹ thuật chuẩn).

---

### 2.3 GAP-03: Công Thức Tích Điểm Loyalty (Loyalty Points Formula)

- **Mã định danh:** `GAP-03`
- **Tên khoảng hở:** Mâu thuẫn tỷ lệ quy đổi tích lũy điểm khách hàng thân thiết giữa Tài liệu nghiệp vụ và Mã nguồn thử nghiệm.
- **Nguồn chứng cứ:**
  - SRS v1.4.0: `docs/requirements/srs.md` §2.3 (Quy tắc `BR-LOYALTY-01` ghi: 10.000 VNĐ = 1 điểm).
  - RTM v2.5.0: `docs/traceability-matrix.md` dòng 35, 65.
  - Sơ đồ Class: `docs/diagram/ClassDiagram-Conceptual.mmd`.
  - Mã nguồn Backend: `apps/api/src/payments/payments.service.ts` dòng 222 (trên `feature/sprint2-full-flow` commit `588e3362`):
    `const pointsEarned = Math.floor(dto.amount / 1000);` (tương đương 1.000 VNĐ = 1 điểm).
- **Hiện trạng trên `main` (TypeORM Baseline):**
  - **Chưa có module Loyalty** và chưa có bảng tích điểm.
- **Hiện trạng trên Feature Branch (Prisma Baseline):**
  - Đã có thực thể `LoyaltyTransaction` và trường `loyaltyPoints` trong bảng `User`.
  - Mã nguồn đang tính: `1.000 VNĐ = 1 điểm` (gấp 10 lần tỷ lệ trong tài liệu SRS).
- **Mức độ ảnh hưởng:** **Trung bình (Medium)** về mặt vận hành kinh doanh; không gây lỗi runtime hệ thống.
- **Rủi ro nghiệp vụ & Kỹ thuật:**
  - Nếu áp dụng tỷ lệ 1.000 VNĐ = 1 điểm mà giá trị quy đổi điểm thưởng khi thanh toán không được điều chỉnh tương ứng, doanh nghiệp sẽ bị lạm phát điểm thưởng và thất thoát doanh thu.
  - Gây sai lệch giữa tài liệu chuyển giao (SRS/User Guide) và kết quả hiển thị trên ứng dụng thực tế.
- **Yêu cầu liên quan:** `FR-10` (Mã khuyến mãi & Loyalty), `UC-11` (Tra cứu điểm Loyalty).
- **Công việc cần làm để đóng GAP:**
  1. Trình Product Owner (PO) phê duyệt chính thức lựa chọn một trong hai công thức:
     - Phương án A: Giữ đúng SRS: `10.000 VNĐ = 1 điểm` (Cần sửa mã nguồn `Math.floor(dto.amount / 10000)`).
     - Phương án B: Chấp nhận mã nguồn thử nghiệm: `1.000 VNĐ = 1 điểm` (Cần sửa SRS v1.4.0 và các tài liệu liên quan).
  2. Bổ sung cấu hình biến môi trường `LOYALTY_POINTS_RATE` thay vì hardcode giá trị số trong mã nguồn.
- **Điều kiện kiểm thử nghiệm thu:**
  - Unit test kiểm tra hàm tích điểm với số tiền biên (ví dụ: 45.000 VNĐ tích được 4 điểm theo tỷ lệ 10k, hoặc 45 điểm theo tỷ lệ 1k).
- **Trạng thái:** `PENDING APPROVAL` (Đang chờ Product Owner phê duyệt quyết định tỷ lệ).

---

### 2.4 GAP-04: Endpoint Kiểm Tra Sức Khỏe (Health Check API)

- **Mã định danh:** `GAP-04`
- **Tên khoảng hở:** Thiếu endpoint kiểm tra sức khỏe hệ thống (`GET /health`) trên nhánh chính `main`.
- **Nguồn chứng cứ:**
  - SRS v1.4.0: `docs/requirements/srs.md` §5.1 (`FR-13`, `UC-13`).
  - ADR-004: `docs/architecture/adr/adr/004-logging-healthcheck.md` (trạng thái: `Proposed`).
  - Cấu hình Docker: `docker-compose.yml` (dịch vụ `api` thiếu directive `healthcheck`).
  - Mã nguồn `main`: `apps/api/src/app.controller.ts` (chỉ có `@Get() getHello()`).
  - Mã nguồn Feature Branch: `apps/api/src/health/health.controller.ts` (có `GET /health` kiểm tra kết nối DB qua Prisma).
- **Hiện trạng trên `main` (TypeORM Baseline):**
  - `apps/api` **chưa có endpoint `GET /health`**.
  - `AppController` chỉ có `GET /` trả về chuỗi văn bản `'Hello World!'`. Endpoint này không kiểm tra kết nối tới cơ sở dữ liệu PostgreSQL.
  - File `docker-compose.yml` đã cấu hình `healthcheck` cho service `db` (`pg_isready`), nhưng service `api` không có `healthcheck`, chỉ có `depends_on: db: condition: service_healthy`.
- **Hiện trạng trên Feature Branch (Prisma Baseline):**
  - Đã có `HealthModule` và `HealthController` với endpoint `GET /health`.
  - Thực hiện kiểm tra cơ sở dữ liệu qua câu truy vấn `SELECT 1` bằng Prisma (`await this.prisma.$queryRaw\`SELECT 1\``).
  - Trả về payload JSON: `status: 'ok' | 'degraded'`, `database: 'connected' | 'error'`.
- **Mức độ ảnh hưởng:** **Trung bình (Medium)** đối với phát triển local; **Cao (High)** đối với triển khai Container và Cloud.
- **Rủi ro nghiệp vụ & Kỹ thuật:**
  - Bộ điều phối container không thể tự động phát hiện khi tiến trình Node.js còn sống nhưng đã mất kết nối cơ sở dữ liệu.
- **Yêu cầu liên quan:** `FR-13` (Kiểm tra sức khỏe hệ thống), `NFR-05` (Khả năng triển khai container), `NFR-07` (Độ khả dụng $\ge 99\%$).
- **Công việc cần làm để đóng GAP:**
  1. Tạo `HealthModule` và `HealthController` trong `apps/api/src/health/` trên `main`.
  2. Triển khai kiểm tra kết nối PostgreSQL qua TypeORM (`dataSource.query('SELECT 1')`).
  3. Cập nhật `docker-compose.yml` bổ sung directive `healthcheck` cho container `api` gọi `curl -f http://localhost:3001/health || exit 1`.
- **Điều kiện kiểm thử nghiệm thu:**
  - Chạy `curl -i http://localhost:3001/health` nhận HTTP 200 và JSON chứa `database: "connected"`.
  - Tắt container `db`, gọi lại `GET /health` nhận HTTP 503 hoặc status `degraded`.
- **Trạng thái:** `OPEN` trên `main` (Đã được triển khai trên feature branch Prisma).
- **Điểm chờ Product Owner phê duyệt:** Không có (Yêu cầu kỹ thuật chuẩn).

---

### 2.5 GAP-05: Mất Phản Hồi Sau COMMIT Giao Dịch Tạo Đơn (Order Retry Idempotency)

- **Mã định danh:** `GAP-05`
- **Tên khoảng hở:** Mất phản hồi HTTP sau khi giao dịch tạo đơn (TX1) đã COMMIT thành công trong cơ sở dữ liệu, dẫn đến nguy cơ tạo đơn trùng khi Client gửi lại request (`POST /orders`).
- **Nguồn chứng cứ gốc đã xác minh:**
  - SRS v1.4.0: `docs/requirements/srs.md` §2.3 ("GAP-05 — Retry tạo đơn khi mất phản hồi sau COMMIT: `POST /orders` chưa có đặc tả idempotency...").
  - Phạm vi & Bối cảnh: `docs/requirements/context-and-scope.md` §4.4 ("GAP-05 (Retry tạo đơn): Mất phản hồi sau COMMIT TX1 có thể gây tạo đơn trùng khi gửi lại...").
  - Đặc tả chi tiết UC-04: `docs/requirements/use-case-place-order.md` §4.1 ("GAP-05 — Mất phản hồi sau COMMIT TX1: Order/OrderItem đã được lưu ở PENDING nên không được coi timeout là bằng chứng TX1 rollback...").
  - Danh mục Use Cases: `docs/requirements/use-cases.md` §3.1, §4.1.
  - Sơ đồ Activity hợp nhất: `docs/diagram/ActivityDiagram-Unified.puml` (Ghi chú: "Không tự động tạo lại đơn (GAP-05)").
  - Báo cáo nghiệm thu Task 1: `docs/requirements/task1-final-audit.md`.
- **Hiện trạng trên `main` (TypeORM Baseline):**
  - Endpoint `POST /orders` trong `orders.service.ts` thực thi transaction lưu `Order` và `OrderItem`.
  - **Hoàn toàn không có cơ chế Idempotency cho `POST /orders`**. Không có header kiểm tra khóa, không kiểm tra đơn hàng tương tự vừa được tạo trong vài giây trước đó.
- **Hiện trạng trên Feature Branch (Prisma Baseline):**
  - Mặc dù nhánh feature có hỗ trợ `Idempotency-Key` cho `POST /payments` (thanh toán), nhưng **vẫn chưa có cơ chế Idempotency cho `POST /orders` (tạo đơn)**!
  - `createOrder` trong `apps/api/src/orders/orders.service.ts` vẫn nhận payload và tạo mới bản ghi `Order` với UUID mới mỗi khi được gọi.
- **Mức độ ảnh hưởng:** **Cao (High)** đối với trải nghiệm khách hàng và tính toàn vẹn dữ liệu đơn hàng.
- **Rủi ro nghiệp vụ & Kỹ thuật:**
  - Nếu kết nối mạng giữa Client và Server bị ngắt ngay sau khi PostgreSQL đã COMMIT đơn hàng ở trạng thái `PENDING`, Client nhận lỗi Network Timeout.
  - Nếu Client tự động gửi lại đơn hàng, một đơn hàng `PENDING` thứ hai với cùng danh sách món sẽ được tạo ra, khiến khách hàng có thể bị nhầm lẫn khi thanh toán.
- **Yêu cầu liên quan:** `FR-05` (Tạo đơn hàng), `UC-04` (Đặt đồ uống), `NFR-04` (Toàn vẹn dữ liệu).
- **Công việc cần làm để đóng GAP:**
  1. Thiết kế cơ chế Client Order Idempotency Key (ví dụ: Header `X-Order-Client-Key` hoặc sinh khóa gắn với phiên giỏ hàng `cartSessionId`).
  2. Bổ sung bảng lưu vết yêu cầu tạo đơn hoặc trường `clientKey` trong bảng `Order` với ràng buộc duy nhất `UNIQUE(userId, clientKey)`.
  3. Phía Client: Nếu gặp sự cố mất kết nối sau khi gửi `POST /orders`, Client tuyệt đối **không tự động gửi lại request tạo đơn mới**, mà chuyển hướng gọi `GET /orders/me` có xác thực JWT để tra cứu xem đơn hàng `PENDING` tương ứng đã được ghi nhận trong vòng 60 giây gần nhất hay chưa trước khi cho phép người dùng thao tác tiếp.
- **Điều kiện kiểm thử nghiệm thu:**
  - Kiểm thử mô phỏng ngắt kết nối (Network Drop Simulation) ngay sau bước Database Commit: Client tra cứu lại lịch sử đơn hàng và khôi phục màn hình thanh toán cho đơn hàng đã tạo thành công.
- **Trạng thái:** `OPEN` (Đã được xác định rõ ràng và đặc tả trong tài liệu Task 1/Task 2; chưa có mã nguồn triển khai ở cả `main` lẫn `feature branch`).
- **Điểm chờ Product Owner phê duyệt:** Phê duyệt quy định thời gian timeout cho phép khách hàng khôi phục đơn hàng `PENDING` chưa thanh toán (đề xuất: 15 phút theo SRS).

---

## 3. Bảng Tổng Hợp Kiểm Toán GAP-01 Đến GAP-05

| Mã GAP | Tên Khoảng Hở | Mức Độ | Hiện Trạng `main` | Hiện Trạng Feature Branch | Trạng Thái Cuối Cùng | Quyết Định Chờ PO |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **GAP-01** | Hoàn tiền (Refund) & Xử lý thanh toán không nhất quán | Cao | Chưa có module Payments | Có Mock Payment; thiếu API Refund & Worker quét hoàn tiền tự động | `PROPOSED / IN DESIGN` | Phê duyệt quy trình bù trừ tài chính ngoại tuyến khi Auto-refund thất bại |
| **GAP-02** | Khóa chống trùng lặp phía Client (Client Idempotency Key) | Cao | Chưa có cơ chế Idempotency | Backend có Unique Index; Frontend chưa lưu và tái sử dụng khóa trên `sessionStorage` | `PARTIAL` | Không có (Yêu cầu kỹ thuật chuẩn) |
| **GAP-03** | Công thức tích điểm khách hàng thân thiết (Loyalty Formula) | Trung bình | Chưa có module Loyalty | Mã nguồn đang tính 1.000đ = 1 điểm; SRS ghi 10.000đ = 1 điểm | `PENDING APPROVAL` | **Quyết định chốt công thức:** 10.000đ = 1 điểm (Phương án A) hay 1.000đ = 1 điểm (Phương án B) |
| **GAP-04** | Endpoint kiểm tra sức khỏe hệ thống (Health Check API) | Trung bình / Cao | Chưa có `GET /health` (chỉ có `GET /` trả về chuỗi) | Đã có `GET /health` kiểm tra kết nối DB qua Prisma | `OPEN` trên `main` | Không có (Yêu cầu kỹ thuật chuẩn) |
| **GAP-05** | Mất phản hồi sau COMMIT giao dịch tạo đơn (Order Retry Idempotency) | Cao | Chưa có Idempotency cho `POST /orders` | Chưa có Idempotency cho `POST /orders` | `OPEN` | Phê duyệt thời hạn hết hạn đơn PENDING chưa thanh toán (đề xuất: 15 phút) |

---

## 4. Phân Tích So Sánh Kiến Trúc: TypeORM (`main`) vs Prisma (`feature/sprint2-full-flow`)

### 4.1 Bảng So Sánh Kỹ Thuật 13 Tiêu Chí

| STT | Tiêu Chí Đánh Giá | Hiện Trạng `main` *(TypeORM Baseline)* | Hiện Trạng Feature *(Prisma Baseline commit `588e3362`)* | Bằng Chứng Mã Nguồn & Commit | Khác Biệt Kỹ Thuật & Đánh Giá Khách Quan | Khuyến Nghị Kiến Trúc |
|:---:|:---|:---|:---|:---|:---|:---|
| **1** | **Kiến trúc Module NestJS** | Tối thiểu: Chỉ gồm `ProductsModule`, `OrdersModule` và `AppModule`. | Toàn diện: `AuthModule`, `ProductsModule`, `OrdersModule`, `PaymentsModule`, `HealthModule`, `PrismaModule`, `CommonModule`. | - `main`: `apps/api/src/app.module.ts`<br>- Feature: `git show origin/feature/sprint2-full-flow:apps/api/src/app.module.ts` | Nhánh feature bóc tách module theo từng miền nghiệp vụ; `main` mới chỉ ở mức MVP cơ bản ban đầu. | Kế thừa cấu trúc module của nhánh feature cho thiết kế kiến trúc mục tiêu (Target Architecture). |
| **2** | **Thực thể & Quản lý Schema** | Dùng TypeORM Decorators (`@Entity()`, `@Column()`, `@ManyToOne()`) phân tán theo từng file. | Dùng schema DSL khai báo tập trung trong `prisma/schema.prisma`. | - `main`: `apps/api/src/orders/entities/`<br>- Feature: `apps/api/prisma/schema.prisma` | TypeORM hỗ trợ Active Record / Data Mapper linh hoạt; Prisma quản lý schema tập trung, tự động sinh TypeScript types giúp giảm thiểu sai sót kiểu dữ liệu. | Prisma mang lại trải nghiệm phát triển nhất quán hơn trong dự án này. |
| **3** | **Cơ sở dữ liệu & Định danh Khóa (PK)** | Sử dụng số nguyên tăng tự động (`id: number`, `SERIAL/INTEGER`). | Sử dụng chuỗi định danh duy nhất (`id: String @id @default(uuid())`). | - `main`: `product.entity.ts`, `order.entity.ts`<br>- Feature: `schema.prisma` (UUID) | UUID giúp định danh khó đoán hơn số nguyên tuần tự, nhưng **không thay thế được kiểm tra quyền sở hữu (Ownership check)** để chống IDOR. Chuyển đổi PK là Breaking Change đối với schema. | Cần kế hoạch di chuyển dữ liệu (Data Migration) nếu chuyển đổi sang UUID. |
| **4** | **Cơ chế Quản lý Migration** | Bật `synchronize: true` trực tiếp trong `TypeOrmModule`. Chưa có migration scripts. | Sử dụng **Prisma Migrate** với thư mục `apps/api/prisma/migrations/`. | - `main`: `apps/api/src/app.module.ts` dòng 42<br>- Feature: `apps/api/prisma/migrations/` | `synchronize: true` chỉ dùng cho dev cục bộ; không phù hợp trên Production vì nguy cơ mất dữ liệu khi sửa entity. Prisma Migrate quản lý migration SQL có phiên bản. | Cần chuyển sang quản lý migration có phiên bản trước khi triển khai production. |
| **5** | **Sản phẩm, Phân loại, Size & Topping** | `Product` chỉ có giá đơn, không có size/topping, chỉ có cờ `isAvailable: boolean`. | Hỗ trợ enum `ProductSize`, trường `toppings: Json`, tính lại đơn giá real-time. | - `main`: `product.entity.ts`<br>- Feature: `products.service.ts`, `schema.prisma` | `main` chưa hỗ trợ yêu cầu nghiệp vụ `FR-02` (Chọn size/topping); Feature branch đã hỗ trợ đầy đủ. | Đưa mô hình size/topping vào kiến trúc mục tiêu. |
| **6** | **Xác thực (Auth), JWT & Phân quyền (RBAC)** | **Chưa có module Auth**. Không có mã hóa mật khẩu, không có JWT Guard, không kiểm tra quyền. | Đầy đủ `AuthModule`: Bcrypt salt 10, JWT access token, `JwtAuthGuard`, phân quyền `Role` (`CUSTOMER`, `STAFF`, `ADMIN`). | - `main`: Không có thư mục `src/auth`<br>- Feature: `apps/api/src/auth/` | `main` hiện không bảo vệ private API; Feature branch kiểm tra quyền và xác thực danh tính người dùng. | Giữ quyết định kiến trúc xác thực bằng JWT theo ADR-001. |
| **7** | **Vòng đời Đơn hàng & State Machine** | Trạng thái đơn là trường text tĩnh `status: 'PENDING'`. Không có logic chuyển trạng thái. | Có file riêng `order-state-machine.ts` kiểm soát nghiêm ngặt ma trận chuyển đổi và ném lỗi nếu vi phạm. | - `main`: `orders.service.ts`<br>- Feature: `src/orders/state-machine/order-state-machine.ts` | `main` có thể bị cập nhật trạng thái tùy tiện; Feature branch kiểm soát chặt chẽ theo đặc tả Task 2. | Áp dụng State Machine của feature branch vào thiết kế kiến trúc chuẩn. |
| **8** | **Thanh toán, Idempotency & Hoàn tiền** | **Chưa có module Payments**. | Đã có `PaymentsModule` mô phỏng ví/thẻ, unique constraint cho `idempotencyKey`. Chưa có hoàn tiền tự động (GAP-01). | - `main`: Không có `src/payments`<br>- Feature: `src/payments/payments.service.ts` | Nhánh feature đã hiện thực hóa được luồng cơ bản của Task 2.1 và Task 2.2. | Giữ mô hình Mock Payment Service theo ADR-003. |
| **9** | **Kiểm soát Tồn kho Đồng thời (OCC)** | **Không có OCC**. Không có cột `version`, không có số lượng `stock`. Chỉ kiểm tra cờ `isAvailable`. | Có cột `stock: Int` và `version: Int`. Áp dụng câu lệnh cập nhật có điều kiện `updateMany({ where: { id, version, stock: { gte } } })`. | - `main`: `orders.service.ts` dòng 82<br>- Feature: `payments.service.ts` dòng 185-207 | `main` không thể ngăn chặn overselling khi có nhiều yêu cầu đồng thời; Feature branch xử lý race condition hiệu quả. | Đưa OCC vào kiến trúc chuẩn theo Task 2.1 / Task 2.2. |
| **10** | **Khuyến mãi & Khách hàng Thân thiết** | **Chưa có module Promotion & Loyalty**. | Có bảng `Promotion` (mã giảm giá `BREW20`) và `LoyaltyTransaction` (tích lũy điểm khi thanh toán thành công). | - `main`: Không có<br>- Feature: `schema.prisma`, `payments.service.ts` | Nhánh feature đã cài đặt logic tích điểm (tuy nhiên đang vướng GAP-03 về tỷ lệ điểm). | Chuẩn hóa sau khi PO phê duyệt GAP-03. |
| **11** | **Health Check, Logging & Cấu hình** | Không có `GET /health` (GAP-04). Logging cơ bản của TypeORM. Cấu hình qua `@nestjs/config`. | Có `GET /health` kiểm tra database ping. Cấu hình biến môi trường qua `ConfigService`. | - `main`: `app.module.ts`<br>- Feature: `health.controller.ts` | Nhánh feature sẵn sàng cho container monitoring hơn `main`. | Áp dụng Health Check cho toàn bộ kiến trúc deployment Task 3.2. |
| **12** | **Kiểm thử Tự động (Testing)** | Đã cấu hình Jest 30, Oxlint: 6/6 test `products.service.spec.ts` PASS, web test PASS. | Bộ test mở rộng: unit test cho Auth, Orders, Payments, State Machine, Concurrency race condition test, Playwright E2E. | - `main`: CI Run `43832699668` PASS<br>- Feature: PR #9 commit `75e4ccd9` PASS | `main` có kiểm thử cho phần khung tối thiểu; feature branch có kiểm thử bao phủ toàn diện luồng nghiệp vụ. | Kế thừa các ca kiểm thử của feature branch làm căn cứ cho Task 4 và Task 5. |
| **13** | **Đóng gói Container & Triển khai** | Có `docker-compose.yml`, Dockerfile cho API và Web. CI Quality Gate hoạt động tốt. | Cấu hình Docker multi-stage build tối ưu kích thước image. | - `main`: `docker-compose.yml`, `.github/workflows/quality.yml`<br>- Feature: Dockerfile multi-stage | Cả hai nhánh đều có cấu hình Docker hoạt động; nhánh feature tối ưu hơn về kích thước image. | Tích hợp vào Deployment Diagram của Task 3.2. |

---

### 4.2 Phân Tích Rủi Ro Di Chuyển Nền Tảng (Migration Risks)

Việc nhánh `feature/sprint2-full-flow` có mức độ hoàn thiện mã nguồn cao hơn không đồng nghĩa với việc có thể merge ngay vào `main` mà không có sự kiểm soát kiến trúc. Các rủi ro kỹ thuật bao gồm:
1. **Xung đột mô hình dữ liệu (Database Schema Incompatibility):**
   - `main` đang dùng khóa chính kiểu Số nguyên tự tăng (`Integer / Serial`).
   - `feature` đang dùng chuỗi định danh duy nhất (`UUID`).
   - Nếu merge trực tiếp vào cơ sở dữ liệu mà không có kịch bản di chuyển dữ liệu (Data Migration Script), hệ thống sẽ gặp lỗi không tương thích kiểu khóa ngoại.
2. **Thay đổi Hợp đồng Giao tiếp API (Breaking API Contract):**
   - Kiểu dữ liệu trong URL thay đổi: `GET /orders/1` chuyển thành `GET /orders/550e8400-e29b-41d4-a716-446655440000`.
   - Payload `POST /orders` trên feature branch yêu cầu trường `size`, trong khi frontend cũ trên `main` không gửi trường này.
3. **Làm rõ vai trò của UUID đối với bảo mật IDOR:**
   - Việc chuyển từ ID số nguyên tự tăng sang UUID giúp giảm thiểu khả năng dò quét định danh tuần tự (ID Enumeration).
   - **Tuy nhiên, UUID không phải là giải pháp thay thế cho việc kiểm tra quyền sở hữu (Ownership Check).** Bảo vệ chống IDOR thực sự phụ thuộc vào việc xác thực danh tính người dùng qua JWT và kiểm tra quyền truy cập (`order.userId === currentUser.id`) tại tầng Controller/Service.
4. **Quyết định Công nghệ (Architectural Governance):**
   - Việc chuyển đổi ORM từ TypeORM sang Prisma là một quyết định kiến trúc cấp dự án. Quyết định này cần được ghi nhận chính thức bằng một ADR (`ADR-006` ở trạng thái `Proposed`) được toàn đội ngũ và Product Owner đồng thuận, không được thực hiện ngầm qua một Pull Request tính năng.

---

## 5. Khuyến Nghị Kiến Trúc Phục Vụ Task 3 (Architecture & Deployment Design)

Dựa trên kết quả kiểm toán kỹ thuật, đội ngũ kiến trúc đưa ra khuyến nghị chiến lược như sau:

1. **Về phân định Kiến trúc trong Tài liệu Task 3.1:**
   - **Current Architecture (Kiến trúc Hiện hành trên `main`):** Trình bày trung thực mô hình NestJS Modular Monolith với TypeORM và các module hiện có (`Products`, `Orders`).
   - **Target / Reference Architecture (Kiến trúc Mục tiêu - Sprint 2):** Trình bày mô hình đầy đủ bao gồm phân hệ Auth (JWT), Payments (Mock Payment), State Machine, OCC Concurrency Control, Health Check và Khuyến mãi. Ghi nhận rõ Prisma ORM là phương án đề xuất cho Target Architecture.

2. **Về các Quyết định Kiến trúc (ADR):**
   - Chuẩn hóa bộ ADR hiện có:
     - `ADR-001`: Modular Monolith Architecture (`Accepted` / `Implemented` trên cả 2 baseline).
     - `ADR-002`: PostgreSQL & Migration Strategy (`Accepted` / Cần chuyển từ `synchronize` sang Migration có phiên bản).
     - `ADR-003`: Mock Payment Service Architecture (`Accepted` / Đã nghiệm thu thiết kế Task 2.1 & 2.2).
     - `ADR-004`: Logging & Health Check API (`Proposed` — chờ triển khai chính thức trên `main` theo GAP-04).
     - `ADR-005`: Configuration Management with Environment Variables (`Accepted` / `Implemented` trên `main`).
     - `ADR-006`: Đề xuất chuyển đổi công nghệ ORM sang Prisma và chuẩn hóa UUID (`Proposed` cho giai đoạn Sprint 2).

3. **Về Thiết kế Triển khai Task 3.2 (Deployment Diagram):**
   - Phải tách biệt rõ ràng ranh giới 3 môi trường:
     - **Môi trường Cục bộ (Local Development):** Chạy Docker Compose (`web`, `api`, `db`).
     - **Môi trường Tự động hóa CI/CD:** GitHub Actions runner thực thi Quality Gates (Install, Lint, Unit Test, Build). Hoạt động đóng gói Docker image và push lên GHCR được đánh dấu là `PROPOSED / PLANNED CD`.
     - **Môi trường Production Mục tiêu (Target Production):** Được gắn nhãn rõ ràng là **`PROPOSED / TARGET DEPLOYMENT (NOT LIVE DEPLOYED)`** (chưa triển khai thực tế trên đám mây thương mại, không bịa đặt số liệu uptime hay URL).
   - Đánh giá trạng thái Task 3.2 là **`DESIGN COMPLETE / FINAL ACCEPTANCE PENDING`** do chưa có hạ tầng production thực tế.
