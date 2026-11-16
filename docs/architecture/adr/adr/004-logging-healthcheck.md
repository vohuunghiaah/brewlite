# ADR-004: Bổ sung Logging và Endpoint Health Check (`GET /health`)

- **Trạng thái:** Proposed (Chờ chuyển đổi mã nguồn chính thức lên `main` theo GAP-04)
- **Phạm vi:** Vận hành và giám sát Backend BrewLite (khớp SRS v1.4.0 §4.13, §5.1, §7.2, NFR-05, NFR-07; GAP-04)

## 1. Bối Cảnh (Context)

Hệ thống BrewLite cần cơ chế ghi nhận nhật ký vận hành (Logging) và kiểm tra tình trạng sẵn sàng của dịch vụ (Health Check) nhằm phục vụ phát hiện lỗi, hỗ trợ điều phối container (Docker Compose / Cloud PaaS) và tự động hóa kiểm thử trong CI/CD pipeline:
- Trên nhánh chính `main` (TypeORM baseline), hệ thống hiện chỉ có `AppController` với endpoint gốc `GET /` trả về chuỗi văn bản `'Hello World!'`, **chưa có endpoint kiểm tra kết nối cơ sở dữ liệu** ([GAP-04](../../../audits/task2-to-task3-gap-audit.md#24-gap-04-endpoint-kiểm-tra-sức-khỏe-health-check-api)).
- Trên nhánh tính năng (`feature/sprint2-full-flow`), hệ thống đã triển khai thử nghiệm `HealthModule` và `HealthController` để phục vụ giám sát container và kiểm thử tự động.

## 2. Quyết Định Kiến Trúc (Decision)

### 2.1. Hợp Đồng Health Check MVP: Đối Chiếu SRS v1.4.0 & Mã Nguồn Thực Tế

Nhằm đảm bảo tính trung thực học thuật và phân định rõ ràng giữa yêu cầu nghiệp vụ và hiện trạng mã nguồn:

1. **Hợp đồng nghiệp vụ mục tiêu (SRS v1.4.0 §4.13):**
   - Kịch bản nghiệm thu FR-13 trong SRS v1.4.0 quy định rõ ràng:
     Khi hệ thống Backend API và Database PostgreSQL hoạt động bình thường, gửi yêu cầu `GET /health` thì hệ thống phản hồi `HTTP 200 OK` với payload JSON:
     ```json
     {
       "status": "ok",
       "database": "up"
     }
     ```
2. **Hiện trạng mã nguồn thực tế trên nhánh tính năng (`feature/sprint2-full-flow`):**
   - Endpoint `GET /health` tại `apps/api/src/health/health.controller.ts` hiện đang trả về payload:
     - *Khi PostgreSQL kết nối thành công:*
       ```json
       {
         "status": "ok",
         "timestamp": "2026-11-16T15:00:00.000Z",
         "service": "brewlite-api",
         "version": "1.0.0",
         "commit": "dev",
         "database": "connected"
       }
       ```
     - *Khi PostgreSQL mất kết nối hoặc truy vấn lỗi:*
       ```json
       {
         "status": "degraded",
         "timestamp": "2026-11-16T15:00:00.000Z",
         "service": "brewlite-api",
         "version": "1.0.0",
         "commit": "dev",
         "database": "error"
       }
       ```
3. **Khoảng sai lệch kỹ thuật được công khai (Disclosed Implementation Gap):**
   - **Sai lệch giá trị trường dữ liệu:** SRS v1.4.0 §4.13 quy định giá trị mục tiêu là `database: "up"`, trong khi mã nguồn thực tế trên feature branch đang trả về `database: "connected"`.
   - **Sai lệch mã trạng thái HTTP khi lỗi:** Mã nguồn hiện tại trả về `HTTP 200 OK` kèm `status: "degraded"` và `database: "error"`, chưa cấu hình trả mã lỗi chuẩn RESTful `HTTP 503 Service Unavailable`.
   - **Kết luận nghiệm thu kiến trúc:** Yêu cầu chức năng **FR-13 chưa hoàn toàn đáp ứng hợp đồng phản hồi theo đặc tả SRS**. Tuyệt đối **không sửa SRS để hợp thức hóa mã nguồn chưa đạt chuẩn**, và không sửa mã nguồn ứng dụng trong PR tài liệu này.
   - **Kế hoạch khắc phục:** Việc chuẩn hóa mã nguồn `HealthController` để khớp chính xác giá trị `database: "up"` và bổ sung bộ kiểm thử tự động API contract test sẽ được thực hiện trong giai đoạn triển khai **Task 5 (Sprint 2 Delivery)**.
   - **Tuyên bố chất lượng:** Tuyệt đối không tuyên bố FR-13 đã hoàn thành triển khai hoặc đã PASS toàn bộ kiểm thử hợp đồng API (chỉ mới đạt smoke test kiểm tra tiến trình sống).

### 2.2. Định Hướng Mở Rộng Mục Tiêu Cho Môi Trường Cloud / Kubernetes (Proposed Target)
Khi hệ thống mở rộng quy mô triển khai lên các nền tảng điều phối chuyên dụng (Kubernetes, AWS ECS, Google Cloud Run) và tích hợp thư viện chuyên dụng `@nestjs/terminus`:
- Hệ thống đề xuất phân tách thành hai probes độc lập:
  - **`GET /health/live` (Liveness Probe):** Chỉ kiểm tra tiến trình NestJS sống; phản hồi HTTP 200 OK.
  - **`GET /health/ready` (Readiness Probe):** Kiểm tra khả năng tiếp nhận lưu lượng người dùng, xác nhận kết nối tới PostgreSQL; phản hồi HTTP 200 OK khi sẵn sàng hoặc HTTP 503 Service Unavailable khi mất kết nối cơ sở dữ liệu.
- Hai endpoint phân tách này thuộc phạm vi **Đề xuất Mở rộng Mục tiêu (`Proposed Target / Future Roadmap`)**, chưa có mã nguồn trong MVP hiện tại.

### 2.3. Quy Chuẩn Ghi Nhật Ký (Logging Policy)
Nhóm sử dụng `Logger` tích hợp sẵn của NestJS cho nhu cầu ghi nhật ký:
- Nhật ký ghi nhận thời điểm phát sinh sự kiện (timestamp UTC), mức độ log (INFO, WARN, ERROR), module phát sinh và thông tin lỗi.
- Các sự kiện bắt buộc theo dõi: khởi động ứng dụng, lắng nghe cổng mạng, tạo đơn hàng, xử lý thanh toán và lỗi kết nối cơ sở dữ liệu.
- **Quy tắc an toàn dữ liệu:** Tuyệt đối không ghi mật khẩu người dùng, JWT token, chuỗi bí mật (secret keys) hoặc thông tin tài chính nhạy cảm vào log.

## 3. Lý Do Lựa Chọn & Phù Hợp Nghiệp Vụ

1. **Đối chiếu và công khai khoảng sai lệch với SRS v1.4.0 §4.13:** SRS v1.4.0 quy định hợp đồng mục tiêu là `database: "up"`, trong khi mã nguồn thực tế hiện tại trên feature branch trả về `database: "connected"`. Việc ghi nhận công khai khoảng sai lệch này giúp định hướng chính xác các ca kiểm thử và việc chuẩn hóa mã nguồn trong Task 5 mà không làm sai lệch đặc tả yêu cầu gốc.
2. **Triển khai tinh gọn cho MVP:** Một endpoint `GET /health` duy nhất giảm độ phức tạp cho ứng dụng trong giai đoạn ban đầu, đủ để Docker compose và kịch bản synthetic monitoring kiểm tra định kỳ tính sẵn sàng (`NFR-05`, `NFR-07`).
3. **Minh bạch hóa hiện trạng kỹ thuật:** Phân định rõ ràng giữa endpoint thực tế đã có mã nguồn (`GET /health` HTTP 200) và các endpoint mục tiêu (`/health/live`, `/health/ready` HTTP 503), ngăn chặn việc suy diễn sai lệch trong nghiệm thu kiến trúc.

## 4. Hệ Quả & Trade-off (Consequences)

**Ưu điểm:**
- Thống nhất hợp đồng giao tiếp giữa SRS, tài liệu kiến trúc, sơ đồ triển khai và mã nguồn thực tế.
- Hỗ trợ phát hiện sớm sự cố kết nối cơ sở dữ liệu và phục hồi container kịp thời.

**Hạn chế & Trade-off:**
- Do mã nguồn MVP trả HTTP 200 với `status: "degraded"` khi cơ sở dữ liệu lỗi, các công cụ giám sát HTTP đơn thuần chỉ kiểm tra HTTP status code sẽ coi dịch vụ là khả dụng; công cụ giám sát cần phân tích nội dung trường `status` hoặc `database` trong JSON payload để phát hiện sự cố chính xác.
- Nhóm chấp nhận giải pháp này cho phạm vi MVP và sẽ nâng cấp lên HTTP 503 chuẩn RESTful cùng `@nestjs/terminus` trong giai đoạn Task 5 (Delivery).
