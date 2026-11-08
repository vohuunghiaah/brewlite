# Biên Bản Cải Tiến Quy Trình Sprint 2 (Sprint 2 Retrospective)

**Dự án:** BrewLite Coffee & Tea Delivery System  
**Chu kỳ:** Sprint 2 (Hoàn tất MVP, Testing & Production Delivery)  
**Ngày họp:** 08/11/2026  
**Phương pháp áp dụng:** Agile / Scrum Retrospective (Mad - Sad - Glad / What went well - Challenges - Action Items)

---

## 1. Những Điểm Nhóm Làm Tốt (What Went Well)

1. **Tuân thủ thiết kế và kiến trúc ban đầu:**
   - Việc bám sát các tài liệu SRS, sơ đồ hoạt động, sơ đồ tuần tự và 5 quyết định kiến trúc (ADR-001 đến ADR-005) giúp quá trình viết code diễn ra nhanh chóng, ít phải sửa đổi ranh giới nghiệp vụ.
2. **Kỹ thuật phần mềm vững chắc (Defensive Engineering):**
   - Triển khai thành công cơ chế **Khóa lạc quan (OCC)** trên cột `version` giúp loại bỏ hoàn toàn rủi ro bán vượt tồn kho (over-selling) khi có nhiều yêu cầu đặt món đồng thời.
   - Ứng dụng chuẩn IETF cho header `Idempotency-Key` bảo vệ khách hàng khỏi bị trừ tiền 2 lần khi mạng chập chờn.
   - Áp dụng máy trạng thái hữu hạn (`order-state-machine.ts`) chặn đứng mọi lỗi nghiệp vụ trong quản lý vòng đời đơn.
3. **Chất lượng kiểm thử thực chất, không làm giả:**
   - Toàn bộ 68 ca kiểm thử (Unit + Integration) đều được thực thi tự động. Integration tests chạy trực tiếp với instance PostgreSQL thực tế thông qua Prisma ORM, kiểm chứng toàn diện từ logic nghiệp vụ đến dữ liệu vật lý.
4. **Tối ưu hóa Container hóa:**
   - Ứng dụng kỹ thuật Multi-stage build và Next.js `output: 'standalone'` giúp giảm dung lượng image của Frontend từ ~1.2GB xuống dưới ~150MB, tối ưu tốc độ triển khai và bảo mật.

---

## 2. Những Thách Thức Kỹ Thuật Đã Vượt Qua (Challenges & Learnings)

1. **Hiện tượng ngủ đông của dịch vụ WSL2 trên Windows:**
   - *Vấn đề:* Khi chạy kiểm thử không có terminal WSL tương tác, môi trường ảo WSL2 tự động chuyển sang chế độ ngủ, khiến cổng PostgreSQL `127.0.0.1:5432` tạm thời ngắt kết nối.
   - *Giải pháp:* Thiết lập tiến trình chạy ngầm daemon duy trì hoạt động liên tục (`IsDaemon: true`) cho cụm dịch vụ, đảm bảo cơ sở dữ liệu luôn sẵn sàng phản hồi.
2. **Cơ chế Prerender CSR Bailout của Next.js 14 App Router:**
   - *Vấn đề:* Khi biên dịch bản production (`next build`), việc các trang `/login` và `/order/confirmation` sử dụng hook `useSearchParams()` trực tiếp gây lỗi thiếu `<Suspense>` boundary.
   - *Giải pháp:* Tách cấu trúc trang thành Component nội dung và bọc trong `<Suspense fallback={...}>`, tuân thủ hoàn hảo đặc tả App Router của Next.js 14.
3. **Xung đột phiên bản npm peer dependencies:**
   - *Vấn đề:* npm phiên bản 10+ áp dụng thuật toán kiểm tra nghiêm ngặt gây kẹt tiến trình khi kết hợp đồng thời Next.js 14, NestJS 10 và ESLint 8 trong monorepo.
   - *Giải pháp:* Đồng bộ hóa cấu hình cài đặt với cờ `--legacy-peer-deps` cho cả môi trường cục bộ và GitHub Actions CI.

---

## 3. Kế Hoạch Hành Động Cải Tiến (Actionable Items)

| STT | Kế hoạch hành động | Người phụ trách | Thời hạn | Mục tiêu kỳ vọng |
|:---:|---|---|:---:|---|
| 1 | **Tích hợp Real-time Notifications** | Backend & Frontend | Sprint tiếp theo | Áp dụng WebSocket / Server-Sent Events (SSE) để đẩy trạng thái pha chế tức thì tới màn hình khách hàng mà không cần F5 |
| 2 | **Cấu hình APM & Observability** | DevOps | Sprint tiếp theo | Bổ sung OpenTelemetry hoặc Prometheus exporter tại endpoint `/metrics` để theo dõi tải hệ thống |
| 3 | **Cải tiến Cache Sản Phẩm** | Backend | Sprint tiếp theo | Ứng dụng Redis Cache cho endpoint `GET /products` giúp giảm tải cho cơ sở dữ liệu khi lượng truy cập tăng vọt |
