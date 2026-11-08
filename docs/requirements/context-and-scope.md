# Bối Cảnh, Các Bên Liên Quan và Phạm Vi Dự Án BrewLite
## (Context, Stakeholders & Scope Definition)

- **Tên dự án:** BrewLite – Nền tảng đặt cà phê không dùng tiền mặt (Cashless Coffee Ordering Platform)
- **Tài liệu tham chiếu:** Assignment 1 (BrewLite-CongNghePhanMem.pdf) & Assignment 2 (Assignment2-BrewLite.pdf)
- **Mã tài liệu:** `REQ-CTX-01`
- **Phiên bản:** 1.0.0
- **Trạng thái:** Chính thức (Approved Baseline)

---

## 1. Bối Cảnh Vấn Đề và Tuyên Bố Tầm Nhìn (Problem Context & Vision)

### 1.1 Bối cảnh thực tế và Vấn đề cần giải quyết
Tại các cửa hàng cà phê và chuỗi đồ uống hiện đại, khung giờ cao điểm (sáng từ 7:30 - 9:00 và trưa từ 11:30 - 13:30) luôn đối mặt với tình trạng quá tải nghiêm trọng tại quầy thu ngân:
1. **Ùn tắc và xếp hàng kéo dài:** Khách hàng phải mất từ 10 đến 15 phút chỉ để đứng xếp hàng gọi món và thanh toán tiền mặt/quẹt thẻ truyền thống.
2. **Sai sót trong tiếp nhận yêu cầu:** Nhân viên thu ngân phải ghi nhận thủ công các tùy chọn phức tạp của khách (size ly, mức đá, độ ngọt, loại topping), dẫn đến tỷ lệ nhầm lẫn cao trong quá trình pha chế.
3. **Chi phí và rủi ro quản lý tiền mặt:** Thao tác thối tiền lẻ, kiểm đếm tiền mặt cuối ca làm việc tốn thời gian, tiềm ẩn nguy cơ sai lệch sổ sách và thất thoát tài chính.
4. **Thiếu minh bạch trong khâu nhận đồ uống:** Khách hàng sau khi thanh toán phải đứng chờ tập trung trước quầy nhận đồ uống mà không biết chính xác đơn hàng của mình đang ở giai đoạn nào (đang pha chế hay đã sẵn sàng), gây hỗn loạn không gian quán.

### 1.2 Tuyên bố tầm nhìn sản phẩm (Product Vision Statement)
> *"BrewLite giúp khách hàng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy."*

BrewLite được định hướng là ứng dụng web hiện đại theo chuẩn **Mobile-First / PWA (Progressive Web App)**, cho phép khách hàng tự phục vụ (Self-service):
- Xem menu đồ uống trực quan kèm hình ảnh và giá niêm yết rõ ràng.
- Tự do tùy biến đồ uống (kích cỡ Size S/M/L, thêm Topping) với cơ chế tính giá tự động tức thì.
- Thực hiện thanh toán không tiền mặt (Cashless Payment) mô phỏng an toàn, có cơ chế chống trừ tiền trùng lặp (Idempotency).
- Nhận mã số đơn hàng điện tử độc nhất (`#xxxx`) và theo dõi trạng thái đơn hàng theo thời gian thực để chủ động tới quầy nhận nước (*"Mời tới quầy lấy nước"*).

---

## 2. Bảng Phân Tích Các Bên Liên Quan (Stakeholder Analysis)

Hệ thống BrewLite được thiết kế để phục vụ và thỏa mãn yêu cầu của 6 nhóm bên liên quan chủ chốt:

| Nhóm Stakeholder | Mô tả vai trò | Trách nhiệm chính | Mục tiêu & Kỳ vọng giá trị | Mức độ ảnh hưởng / Mối quan tâm |
| :--- | :--- | :--- | :--- | :--- |
| **Khách hàng (Customer)** | Người dùng cuối trực tiếp thao tác trên ứng dụng di động / web PWA. | - Duyệt danh mục đồ uống.<br>- Tùy chỉnh chi tiết món.<br>- Xác thực tài khoản.<br>- Đặt hàng và thực hiện thanh toán không tiền mặt.<br>- Nhận nước tại quầy theo mã đơn. | - Giao diện trực quan, mượt mà, phản hồi < 500ms.<br>- Không phải xếp hàng chờ đợi tại quầy thu ngân.<br>- Thông tin giá, khuyến mãi minh bạch.<br>- Thanh toán an toàn, không bị trừ tiền lặp lại.<br>- Lịch sử đơn hàng và tích lũy điểm thưởng rõ ràng. | **Tối cao (High Power / High Interest)** |
| **Nhân viên quầy / Barista** | Nhân viên tiếp nhận đơn hàng và thực hiện pha chế tại cửa hàng. | - Theo dõi danh sách đơn hàng đã thanh toán (`PAID`).<br>- Chuyển trạng thái đơn sang Đang pha chế (`PREPARING`).<br>- Chuyển trạng thái đơn sang Sẵn sàng (`READY`).<br>- Bàn giao thức uống cho khách và đóng đơn (`COMPLETED`). | - Nhận thông tin chi tiết từng món chính xác (size, topping).<br>- Giảm áp lực giao tiếp và thu tiền mặt trong giờ cao điểm.<br>- Quy trình chuyển trạng thái đơn hàng đơn giản, không thao tác thừa. | **Trung bình (Medium Power / High Interest)** *(Mở rộng ngoài core MVP)* |
| **Quản lý cửa hàng / Product Owner (PO)** | Người chịu trách nhiệm vận hành kinh doanh và định hướng sản phẩm. | - Quản lý danh mục sản phẩm, đơn giá và số lượng tồn kho.<br>- Cấu hình các chương trình khuyến mãi (voucher giảm giá).<br>- Quản lý tỷ lệ tích điểm khách hàng thân thiết (loyalty).<br>- Giám sát doanh thu và hiệu suất xử lý đơn hàng. | - Hệ thống vận hành ổn định, không thất thoát đơn hàng.<br>- Kiểm soát tồn kho chính xác, tuyệt đối không bị bán âm kho khi cao điểm.<br>- Tăng năng suất phục vụ và mức độ hài lòng của khách hàng. | **Cao (High Power / High Interest)** |
| **Giảng viên / Khách hàng nghiệm thu (Evaluator)** | Khách hàng đánh giá học phần Công nghệ Phần mềm (Trường Đại học Sài Gòn - SGU). | - Đánh giá tính chuẩn mực của quy trình kỹ nghệ phần mềm.<br>- Kiểm tra sự tuân thủ Definition of Done (DoD).<br>- Xác minh bằng chứng thực thi tự động (CI/CD, Unit/Integration/E2E test).<br>- Thẩm định phiên bản triển khai trực tiếp trên URL Production HTTPS. | - Bàn giao phần mềm chạy thật, không chỉ là bản mẫu giao diện tĩnh.<br>- Tính truy vết (Traceability) xuyên suốt: Yêu cầu $\rightarrow$ Thiết kế $\rightarrow$ Mã nguồn $\rightarrow$ Kiểm thử.<br>- Toàn bộ quyết định kỹ thuật (ADRs) được chứng minh và giải trình minh bạch. | **Quyết định (High Power / High Interest)** |
| **Đội ngũ phát triển (Dev Team)** | Nhóm kỹ sư phần mềm phụ trách thiết kế, lập trình, kiểm thử và vận hành. | - Xây dựng kiến trúc phân lớp sạch (Clean Architecture).<br>- Hiện thực hóa frontend Next.js và backend NestJS.<br>- Thiết kế cơ sở dữ liệu PostgreSQL qua Prisma ORM.<br>- Xây dựng bộ kiểm thử tự động đa tầng.<br>- Thiết lập tự động hóa CI/CD với GitHub Actions và Docker. | - Mã nguồn dễ đọc, có cấu trúc module hóa rõ ràng.<br>- Không có nợ kỹ thuật tiềm ẩn hoặc mã kiểm thử giả lập kết quả.<br>- Môi trường local và CI đồng nhất thông qua container hóa.<br>- Tài liệu kỹ thuật đầy đủ và bám sát thực tế triển khai. | **Cao (High Power / High Interest)** |
| **Đơn vị thanh toán (Payment Provider - Mock)** | Cổng thanh toán ví điện tử / thẻ ngân hàng (được mô phỏng trong hệ thống). | - Tiếp nhận yêu cầu thanh toán từ backend.<br>- Xử lý khóa Idempotency để chặn giao dịch trùng lặp.<br>- Trả về kết quả giao dịch (Thành công / Thất bại). | - Bảo đảm an toàn giao dịch, tính toàn vẹn tài chính.<br>- Chuẩn hóa giao thức kết nối qua REST API và HTTP Headers. | **Trung bình (Low Power / Medium Interest)** |

---

## 3. Ma Trận Phạm Vi Dự Án (Scope Matrix)

### 3.1 Trong phạm vi (In-Scope — Phiên bản MVP & Assignment 2)
1. **Giao diện người dùng Mobile-First / PWA:**
   - Xây dựng bằng Next.js (TypeScript, App Router, TailwindCSS).
   - Thiết kế tối ưu hiển thị trên màn hình di động, hỗ trợ Responsive đầy đủ trên tablet/desktop.
   - Thể hiện trọn vẹn 5 màn hình cốt lõi: Menu danh mục, Chi tiết tùy chọn món, Giỏ hàng, Thanh toán, và Xác nhận đặt hàng thành công.
2. **Hệ thống Backend REST API:**
   - Xây dựng bằng NestJS (TypeScript, kiến trúc module hóa).
   - Validation dữ liệu đầu vào tự động qua `class-validator` và `class-transformer`.
   - Cơ chế bảo mật và xác thực người dùng bằng JWT Bearer Token, băm mật khẩu bằng `bcrypt`.
3. **Cơ sở dữ liệu quan hệ PostgreSQL & Prisma ORM:**
   - Lược đồ dữ liệu chuẩn hóa gồm 7+ thực thể cốt lõi: `User`, `Product`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction`.
   - Quản lý phiên bản CSDL qua Prisma Migrations và seeder dữ liệu menu phong phú ban đầu.
4. **Luồng nghiệp vụ Đặt hàng & Thanh toán toàn trình:**
   - Duyệt menu $\rightarrow$ Chọn món $\rightarrow$ Tùy chọn size (S/M/L) & Topping $\rightarrow$ Giỏ hàng $\rightarrow$ Đăng nhập/Đăng ký $\rightarrow$ Tạo đơn (`PENDING`) $\rightarrow$ Thanh toán $\rightarrow$ Xác nhận (`PAID`) $\rightarrow$ Xem lịch sử đơn.
5. **Các giải pháp kỹ thuật nâng cao bắt buộc (Theo Task 10 Assignment 1 & Assignment 2):**
   - **Order State Machine:** Máy trạng thái hữu hạn kiểm soát chuyển đổi trạng thái đơn hàng thông qua hàm tập trung `assertTransition()`, chặn đứng các chuyển tiếp bất hợp lệ.
   - **Idempotent Payment:** Cơ chế chống trùng lặp thanh toán thông qua HTTP Header `Idempotency-Key` (chuẩn UUID-v4) và ràng buộc duy nhất trong CSDL.
   - **Concurrency Control & Optimistic Locking:** Kiểm soát tồn kho đồng thời bằng cơ chế khóa lạc quan (cột `version` trong bảng `Product`) kết hợp Transaction CSDL, đảm bảo không bao giờ xảy ra tình trạng bán âm kho (Overselling).
   - **Promotion & Loyalty:** Áp dụng mã voucher giảm giá hợp lệ và tự động cộng dồn điểm thưởng khách hàng thân thiết khi đơn hàng chuyển sang `PAID`.
6. **Kiểm thử tự động đa tầng (Automated Testing):**
   - Unit tests: Kiểm thử State Machine, thuật toán tính giá, logic giỏ hàng, xác thực JWT.
   - Integration tests: Kiểm thử luồng tạo đơn hàng, thanh toán và trừ kho.
   - Concurrency tests: Kiểm thử mô phỏng đa luồng đặt hàng đồng thời để kiểm chứng ngăn chặn bán vượt tồn kho.
   - End-to-End (E2E) tests: Kịch bản kiểm thử tự động toàn diện từ bước mở menu đến khi hoàn tất đơn hàng.
7. **Container hóa & DevOps:**
   - `docker-compose.yml` khởi chạy trọn gói hệ thống tại local gồm 3 dịch vụ: Frontend (`web`), Backend API (`api`), và Cơ sở dữ liệu (`db`).
   - Endpoint kiểm tra tình trạng dịch vụ `GET /health`.
   - CI Pipeline (GitHub Actions) kích hoạt tự động trên Pull Request: `Install -> Lint -> Unit Test -> Build`.
   - CD Pipeline hỗ trợ đóng gói Docker image, gắn tag phiên bản, smoke test và triển khai lên môi trường Production với URL HTTPS thật.

### 3.2 Ngoài phạm vi (Out-of-Scope & Tương lai)
1. **Thiết bị phần cứng tại cửa hàng:**
   - Không tích hợp máy bán hàng POS vật lý chuyên dụng.
   - Không tích hợp máy in bill nhiệt hoặc máy quét mã vạch chuyên dụng tại quầy.
2. **Phương thức thanh toán tiền mặt:**
   - Không hỗ trợ thanh toán tiền mặt tại quầy hoặc hình thức giao hàng thu tiền tận nơi (COD). BrewLite là nền tảng 100% không dùng tiền mặt (Cashless).
3. **Cổng thanh toán thực tế:**
   - Không ký kết hợp đồng thương mại với các tổ chức trung gian thanh toán thực tế (VNPAY, MoMo, ZaloPay, Stripe). Hệ thống sử dụng dịch vụ thanh toán mô phỏng (Mock Payment Service) tuân thủ đúng chuẩn giao thức nghiệp vụ.
4. **Ứng dụng Native di động chuyên biệt:**
   - Không phát hành app native riêng biệt trên Apple App Store hoặc Google Play Store. Trải nghiệm di động được giải quyết triệt để thông qua chuẩn Mobile-First / PWA.
5. **Dịch vụ giao nhận hàng tận nhà (Home Delivery):**
   - Không xây dựng phân hệ điều phối tài xế (shipper). Khách hàng nhận đồ uống trực tiếp tại quầy theo thông điệp *"Mời tới quầy lấy nước"*.

### 3.3 Các giả định (Assumptions)
1. Khách hàng sử dụng thiết bị thông minh (smartphone, tablet, laptop) có trình duyệt hiện đại (Chrome, Safari, Firefox, Edge) hỗ trợ JavaScript ES6+ và có kết nối Internet ổn định.
2. Dịch vụ thanh toán mô phỏng (Mock Payment Service) luôn phản hồi trong khoảng thời gian chấp nhận được (< 500ms) và cho phép giả lập cả hai trạng thái: Giao dịch thành công và Giao dịch thất bại.
3. Cửa hàng chỉ quản lý một chi nhánh đơn lẻ trong giai đoạn MVP, chưa mở rộng quản lý chuỗi đa chi nhánh (Multi-branch).
4. Tỷ lệ tích điểm mặc định là 10.000 VNĐ chi tiêu tương ứng với 1 điểm thưởng khách hàng thân thiết.

### 3.4 Các ràng buộc kỹ thuật (Constraints)
1. **Ràng buộc công nghệ (Technology Constraints):** Bắt buộc tuân thủ bộ công nghệ theo chỉ đạo: Frontend Next.js, Backend NestJS, Database PostgreSQL với Prisma ORM, và công cụ đóng gói Docker.
2. **Ràng buộc hiệu năng (Performance Constraints):** Thời gian phản hồi trung bình của các API nghiệp vụ chính (Menu, Chi tiết, Đặt đơn) phải đạt dưới 500ms trong điều kiện tải cơ bản.
3. **Ràng buộc an ninh (Security Constraints):**
   - Mật khẩu người dùng bắt buộc phải được mã hóa một chiều qua thuật toán bcrypt với salt factor $\ge 10$.
   - Tuyệt đối không để lộ thông tin nhạy cảm, JWT Secret hoặc mật khẩu kết nối cơ sở dữ liệu trên mã nguồn Git hoặc log CI/CD.
   - Cơ sở dữ liệu trên môi trường Production phải được cô lập trong mạng riêng ảo (Private Network/VPC), không mở cổng kết nối công khai ra ngoài Internet.
4. **Ràng buộc quy trình (Process Constraints):** Toàn bộ mã nguồn đưa vào nhánh chính (`main`) bắt buộc phải thông qua Pull Request, đáp ứng 100% tiêu chí Definition of Done (DoD) và vượt qua toàn bộ các bước kiểm tra tự động của CI pipeline.

---

## 4. Danh Mục Nhận Diện Rủi Ro Ban Đầu (Initial Risk Catalog)

| Mã Rủi Ro | Mô tả rủi ro | Xác suất (P) | Mức độ tác động (I) | Điểm rủi ro (P x I) | Biện pháp phòng ngừa & Giảm thiểu cụ thể | Kế hoạch dự phòng (Contingency Plan) |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **RSK-01** | **Bán vượt tồn kho khi đặt hàng đồng thời (Concurrency Overselling)**<br>Nhiều khách hàng cùng đặt ly cà phê cuối cùng trong kho tại cùng một thời điểm, dẫn đến số lượng tồn kho bị âm. | Cao (High) | Nghiêm trọng (Critical) | **Rất cao (P0)** | Áp dụng cơ chế **Optimistic Locking** thông qua cột `version` trong bảng `Product` kết hợp mệnh đề `UPDATE ... WHERE version = :v AND stock >= :qty` bên trong một Transaction CSDL tương tác. | Khi giao dịch phát hiện xung đột phiên bản (`InsufficientStockException`), hệ thống tự động rollback, báo lỗi HTTP 409 Conflict và cập nhật giao diện thông báo món đã hết hàng. |
| **RSK-02** | **Thanh toán trùng lặp do bấm nhiều lần hoặc retry mạng (Duplicate Payments)**<br>Khách hàng nhấn nút thanh toán nhiều lần do mạng chập chờn, dẫn đến việc bị trừ tiền hai lần cho cùng một đơn hàng. | Cao (High) | Nghiêm trọng (Critical) | **Rất cao (P0)** | Bắt buộc client gửi header `Idempotency-Key` (UUID-v4). Backend lưu key vào bảng `Payment` với ràng buộc duy nhất (`UNIQUE`), nếu nhận cùng key thì trả về ngay kết quả giao dịch trước đó. | Khóa bản ghi (Locking) trong quá trình xử lý; từ chối xử lý song song các request có cùng `Idempotency-Key` đang ở trạng thái `IN_PROGRESS`. |
| **RSK-03** | **Sai lệch vòng đời đơn hàng (Invalid State Transition)**<br>Đơn hàng nhảy cóc trạng thái (ví dụ từ `PENDING` sang thẳng `COMPLETED` mà chưa qua `PAID`, hoặc đơn đã hủy vẫn được thanh toán). | Trung bình (Med) | Nghiêm trọng (Critical) | **Cao (P1)** | Xây dựng máy trạng thái hữu hạn tập trung trong code (`OrderStateMachine`) với hàm bảo vệ `assertTransition(currentStatus, nextStatus)` kiểm tra danh sách chuyển tiếp hợp lệ. | Bất kỳ yêu cầu chuyển đổi trạng thái nào vi phạm quy tắc đều bị chặn đứng ngay lập tức và ném lỗi HTTP 400 `InvalidStateTransitionException`. |
| **RSK-04** | **Lỗ hổng kiểm soát truy cập đối tượng trực tiếp (IDOR Vulnerability)**<br>Người dùng thay đổi tham số `orderId` trên URL để xem hoặc can thiệp vào đơn hàng của khách hàng khác. | Trung bình (Med) | Cao (High) | **Cao (P1)** | Tại service xử lý `GET /orders/:id`, luôn kiểm tra `order.userId === requestUser.id`. Chỉ cho phép tài khoản có quyền `STAFF` hoặc `ADMIN` truy cập đơn hàng của người khác. | Trả về HTTP 403 Forbidden nếu phát hiện truy cập trái quyền, đồng thời ghi log cảnh báo an ninh. |
| **RSK-05** | **Môi trường máy trạm dừng Docker Daemon cục bộ**<br>Docker Desktop trên máy phát triển Windows không chạy, khiến không thể khởi động PostgreSQL và chạy integration tests. | Cao (High) | Trung bình (Med) | **Trung bình (P2)** | Cung cấp tài liệu hướng dẫn khởi động Docker Desktop, cấu hình fallback sang dịch vụ PostgreSQL cục bộ hoặc in-memory/testcontainers khi chạy test đơn vị. | Sử dụng script kiểm tra kết nối `docker ps` trước khi chạy các lệnh kiểm thử yêu cầu database thật. |
| **RSK-06** | **Suy giảm hiệu năng hệ thống khi lượng dữ liệu tăng (Performance Degradation)**<br>Thời gian phản hồi của API vượt quá ngưỡng 500ms do câu truy vấn chậm hoặc thiếu chỉ mục (index). | Thấp (Low) | Trung bình (Med) | **Trung bình (P2)** | Đánh chỉ mục (Index) đầy đủ trên các trường khóa ngoại (`userId`, `orderId`, `productId`) và trường tìm kiếm (`orderCode`, `idempotencyKey`). Tối ưu câu lệnh Prisma truy xuất dữ liệu tinh gọn. | Giám sát thời gian phản hồi thông qua log và bộ kiểm thử hiệu năng tự động. |

---

## 5. Kết Luận & Định Hướng Giai Đoạn Tiếp Theo
Tài liệu Bối cảnh, Các bên liên quan và Phạm vi dự án (`context-and-scope.md`) đã xác lập nền móng vững chắc cho dự án BrewLite. Toàn bộ các yêu cầu chức năng (FR) và phi chức năng (NFR) trong tài liệu Đặc tả Yêu cầu Phần mềm (`docs/requirements/srs.md`) cũng như kịch bản Use Case trọng tâm (`docs/requirements/use-cases.md`) sẽ bám sát tuyệt đối vào các ranh giới và quy tắc đã xác lập tại văn bản này.
