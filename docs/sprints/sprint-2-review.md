# Biên Bản Đánh Giá Sprint 2 (Sprint 2 Review)

**Dự án:** BrewLite Coffee & Tea Delivery System  
**Chu kỳ Sprint:** Sprint 2 — MVP Full Flow, Testing & CI/CD Delivery  
**Ngày họp đánh giá:** 08/11/2026  
**Người tham dự:** Toàn bộ Nhóm Kỹ sư Phần mềm Cấp cao (Architect, Frontend, Backend, Database, QA, DevOps) & Product Owner  
**Trạng thái mục tiêu Sprint:** **HOÀN THÀNH 100% (GOAL ACHIEVED)**

---

## 1. Mục Tiêu Cốt Lõi Của Sprint 2 (Sprint Goal)

> *"Hoàn tất toàn bộ luồng nghiệp vụ MVP từ Menu đến Lịch sử đơn hàng, triển khai cơ chế chống thanh toán trùng lặp và khóa lạc quan, bảo đảm an toàn dữ liệu, đạt kiểm thử tự động toàn diện và thiết lập pipeline CI/CD sẵn sàng vận hành trên môi trường production."*

---

## 2. Kết Quả Nghiệm Thu Các Hạng Mục Công Việc (Backlog Items Review)

| STT | Mã PBI | Tên hạng mục công việc | Tiêu chí chấp nhận (Acceptance Criteria) | Kết quả kiểm chứng thực tế | Đánh giá |
|:---:|---|---|---|---|:---:|
| 1 | **PBI-01** | Tùy biến món (Chi tiết đồ uống) | Cho phép chọn Size S/M/L, nhiều Topping, số lượng; giá thay đổi ngay trên giao diện; không cho đặt khi hết hàng | Trực tiếp tại `/products/[id]`, validate phía frontend & backend | **CHẤP NHẬN (PASS)** |
| 2 | **PBI-02** | Giỏ hàng & lưu trữ trạng thái | Tự động gộp món trùng tùy chọn; tăng/giảm số lượng; tính tổng tiền; lưu LocalStorage chống mất dữ liệu khi F5 | `apps/web/src/lib/store.ts`, 7 unit tests passed | **CHẤP NHẬN (PASS)** |
| 3 | **PBI-03** | Xác thực & Quản lý phiên JWT | Đăng ký, đăng nhập tài khoản; băm mật khẩu Bcrypt; cấp phát JWT token an toàn; bảo vệ private routes | Module `AuthModule`, Guard `JwtAuthGuard`, 5 unit tests + E2E integration test passed | **CHẤP NHẬN (PASS)** |
| 4 | **PBI-04** | Khởi tạo đơn hàng & Transaction | Kiểm tra giỏ hàng, server tự tính toán lại toàn bộ đơn giá, áp mã giảm giá `BREW20`, lưu snapshot trong 1 Transaction | `$transaction` trong `OrdersService`, sinh mã `#BL-xxxx`, trạng thái ban đầu `PENDING` | **CHẤP NHẬN (PASS)** |
| 5 | **PBI-05** | Thanh toán mô phỏng & Idempotency | Hỗ trợ Mock Payment (`SUCCESS`, `FAILED`, `PENDING`), chống gửi đúp bằng `Idempotency-Key`, trừ kho qua OCC | Unique constraint index trên `idempotencyKey`, OCC `version + 1`, 20 tests E2E passed | **CHẤP NHẬN (PASS)** |
| 6 | **PBI-06** | Máy trạng thái đơn hàng | Chặn đứng các bước nhảy trạng thái phi lý, áp dụng `assertTransition` cho toàn bộ vòng đời đơn | File `order-state-machine.ts`, 6 unit tests passed | **CHẤP NHẬN (PASS)** |
| 7 | **PBI-07** | Xác nhận đơn & Lịch sử cá nhân | Hiển thị mã nhận món, thời gian dự kiến; xem danh sách đơn hàng cá nhân; ngăn chặn tuyệt đối truy cập chéo (Anti-IDOR) | Endpoint `/orders/me` và `/orders/:id`, trả về HTTP 403 Forbidden khi người lạ truy cập | **CHẤP NHẬN (PASS)** |
| 8 | **PBI-08** | Kiểm thử tự động đa tầng | Toàn bộ Unit test và E2E test với database thực thi thành công không làm giả kết quả | 68/68 ca kiểm thử PASS (34 backend unit, 14 web unit, 20 E2E integration) | **CHẤP NHẬN (PASS)** |
| 9 | **PBI-09** | Container hóa & CI/CD Pipeline | Docker multi-stage images cho Web và API; `docker-compose.yml` điều phối cụm; CI Quality Gate và CD GHCR | `docker-compose.yml`, `.github/workflows/ci.yml`, `.github/workflows/cd.yml` | **CHẤP NHẬN (PASS)** |

---

## 3. Trình Diễn Hệ Thống Thực Tế (Live Demo Summary)

Tại buổi đánh giá Sprint 2, nhóm đã trình diễn trực tiếp kịch bản người dùng hoàn chỉnh:
1. **Khách hàng duyệt menu:** Chọn món "Trà Đào Cam Sả" có sẵn trong thực đơn.
2. **Tùy biến món:** Nâng cấp ly từ Size M lên Size L (+12.000đ), tích chọn thêm "Thạch Trà Xanh" (+7.000đ). Giá hiển thị trên màn hình tự động cập nhật từ 45.000đ lên 64.000đ.
3. **Giỏ hàng:** Thêm vào giỏ hàng và đặt số lượng 2 ly (Tổng cộng: 128.000đ).
4. **Đăng nhập:** Bấm đặt món, hệ thống phát hiện chưa có phiên đăng nhập và chuyển hướng sang `/login`. Đăng nhập thành công với tài khoản demo `customer@brewlite.com`.
5. **Thanh toán:** Tại màn hình `/checkout`, nhập mã ưu đãi `BREW20` (giảm 20% tương đương 25.600đ, tổng tiền còn 102.400đ). Hệ thống tự sinh header `Idempotency-Key` và gọi `POST /payments`.
6. **Mô phỏng Idempotency:** Gửi lặp lại cùng request thanh toán, hệ thống nhận diện khóa trùng và trả về ngay kết quả giao dịch trước đó, không trừ kho lần thứ 2 và không nhân đôi điểm thưởng.
7. **Xác nhận & Lịch sử:** Nhận mã đơn hàng `#BL-7824`, trạng thái `PAID`, thông báo tích lũy +102 điểm thưởng. Truy cập `/orders` thấy đơn hàng xuất hiện ở đầu danh sách.

---

## 4. Đánh Giá Khả Năng Sẵn Sàng Bàn Giao (Release Readiness)

- **Độ tin cậy mã nguồn:** Không còn bất kỳ cảnh báo ESLint nào (`0 errors, 0 warnings`).
- **Khả năng triển khai:** Toàn bộ hệ thống chạy độc lập chỉ với một câu lệnh `docker compose up -d`.
- **Hồ sơ tài liệu:** Đã hoàn thiện kiến trúc, 5 quyết định ADR, RTM ma trận truy vết và hướng dẫn demo.
- **Quyết định của Product Owner:** **CHẤP THUẬN NGHIỆM THU VÀ PHÁT HÀNH BẢN V1.0.0.**

