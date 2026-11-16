# ADR-004: Bổ sung Logging và Endpoint Health Check (`GET /health`)

- **Trạng thái:** Proposed (Chờ chuyển đổi mã nguồn chính thức lên `main` theo GAP-04)
- **Phạm vi:** Vận hành và giám sát Backend BrewLite (khớp SRS v1.4.0 §4.13, §5.1, §7.2, NFR-05, NFR-07; GAP-04)

## 1. Bối Cảnh (Context)

Hệ thống BrewLite cần cơ chế ghi nhận nhật ký vận hành (Logging) và kiểm tra tình trạng sẵn sàng của dịch vụ (Health Check) nhằm phục vụ phát hiện lỗi, hỗ trợ điều phối container (Docker Compose / Cloud PaaS) và tự động hóa kiểm thử trong CI/CD pipeline:
- Trên nhánh chính `main` (TypeORM baseline), hệ thống hiện chỉ có `AppController` với endpoint gốc `GET /` trả về chuỗi văn bản `'Hello World!'`, **chưa có endpoint kiểm tra kết nối cơ sở dữ liệu** ([GAP-04](../../../audits/task2-to-task3-gap-audit.md#24-gap-04-endpoint-kiểm-tra-sức-khỏe-health-check-api)).
- Trên nhánh tính năng (`feature/sprint2-full-flow`), hệ thống đã triển khai thử nghiệm `HealthModule` và `HealthController` để phục vụ giám sát container và kiểm thử tự động.

## 2. Quyết Định Kiến Trúc (Decision)

### 2.1. Hợp Đồng Health Check MVP Cốt Lõi (Đã Triển Khai trên Feature Branch — Khớp SRS v1.4.0 §4.13)
Để đáp ứng yêu cầu kiểm tra sức khỏe của MVP tối giản và chuẩn hóa hợp đồng giao tiếp giữa API, Docker và Synthetic Monitoring:
- **Endpoint duy nhất:** **`GET /health`** (hợp nhất kiểm tra tiến trình ứng dụng và tình trạng kết nối tới PostgreSQL).
- **Giao thức:** HTTP GET công khai, không yêu cầu token xác thực JWT.
- **Cơ chế thực thi:** Gửi câu lệnh truy vấn kiểm tra `SELECT 1` tới cơ sở dữ liệu PostgreSQL thông qua ORM.
- **Mã trạng thái HTTP thực tế:** Luôn trả về **`HTTP 200 OK`** cho cả trường hợp bình thường và khi cơ sở dữ liệu gặp sự cố suy giảm dịch vụ (Degraded).
- **Cấu trúc dữ liệu JSON phản hồi:**
  - *Khi PostgreSQL kết nối thành công (`status: "ok"`):*
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
  - *Khi PostgreSQL mất kết nối hoặc truy vấn thất bại (`status: "degraded"`):*
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
  > [!NOTE]
  > **Lưu ý kỹ thuật về mã phản hồi HTTP:** Mã nguồn MVP thực tế trên feature branch hiện không trả mã lỗi HTTP 503 mà trả về HTTP 200 kèm thuộc tính `status: "degraded"` và `database: "error"`.

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

1. **Khớp nối hoàn hảo với SRS v1.4.0 §4.13:** SRS yêu cầu kịch bản kiểm tra sức khỏe hệ thống thông qua `GET /health` trả về trạng thái hoạt động của Backend và kết nối PostgreSQL.
2. **Triển khai tinh gọn cho MVP:** Một endpoint `GET /health` duy nhất giảm độ phức tạp cho ứng dụng trong giai đoạn ban đầu, đủ để Docker compose và kịch bản synthetic monitoring kiểm tra định kỳ tính sẵn sàng (`NFR-05`, `NFR-07`).
3. **Minh bạch hóa hiện trạng kỹ thuật:** Phân định rõ ràng giữa endpoint thực tế đã có mã nguồn (`GET /health` HTTP 200) và các endpoint mục tiêu (`/health/live`, `/health/ready` HTTP 503), ngăn chặn việc suy diễn sai lệch trong nghiệm thu kiến trúc.

## 4. Hệ Quả & Trade-off (Consequences)

**Ưu điểm:**
- Thống nhất hợp đồng giao tiếp giữa SRS, tài liệu kiến trúc, sơ đồ triển khai và mã nguồn thực tế.
- Hỗ trợ phát hiện sớm sự cố kết nối cơ sở dữ liệu và phục hồi container kịp thời.

**Hạn chế & Trade-off:**
- Do mã nguồn MVP trả HTTP 200 với `status: "degraded"` khi cơ sở dữ liệu lỗi, các công cụ giám sát HTTP đơn thuần chỉ kiểm tra HTTP status code sẽ coi dịch vụ là khả dụng; công cụ giám sát cần phân tích nội dung trường `status` hoặc `database` trong JSON payload để phát hiện sự cố chính xác.
- Nhóm chấp nhận giải pháp này cho phạm vi MVP và sẽ nâng cấp lên HTTP 503 chuẩn RESTful cùng `@nestjs/terminus` trong giai đoạn Task 5 (Delivery).
