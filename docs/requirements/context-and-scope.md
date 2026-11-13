# Bối Cảnh, Các Bên Liên Quan và Phạm Vi Dự Án BrewLite
## (Context, Stakeholders & Scope Definition)

- **Tên dự án:** BrewLite – Nền tảng đặt cà phê không dùng tiền mặt (Cashless Coffee Ordering Platform)
- **Tài liệu tham chiếu:** Assignment 1 (BrewLite-CongNghePhanMem.pdf) & Assignment 2 (Assignment2-BrewLite.pdf)
- **Mã tài liệu:** `REQ-CTX-01`
- **Phiên bản:** 1.3.0 (Post-Merge Audit & GAP Synchronization)
- **Trạng thái:** Đề xuất nghiệm thu Task 1 (Proposed Baseline for Task 1 Review)

---

## 1. Bối Cảnh Vấn Đề và Tuyên Bố Tầm Nhìn (Problem Context & Vision)

### 1.1 Bối cảnh thực tế và Vấn đề cần giải quyết
Tại các cửa hàng cà phê và chuỗi đồ uống hiện đại, khung giờ cao điểm (sáng từ 7:30 - 9:00 và trưa từ 11:30 - 13:30) luôn đối mặt với tình trạng quá tải nghiêm trọng tại quầy thu ngân:
1. **Ùn tắc và xếp hàng kéo dài (Giả định bối cảnh - Business Assumption):** Trong các khung giờ cao điểm, ước tính khách hàng mất từ 10 đến 15 phút chỉ để đứng xếp hàng gọi món và thanh toán tiền mặt/quẹt thẻ truyền thống.
2. **Sai sót trong tiếp nhận yêu cầu:** Nhân viên thu ngân phải ghi nhận thủ công các tùy chọn phức tạp của khách (size ly, mức đá, độ ngọt, loại topping), dẫn đến tỷ lệ nhầm lẫn trong quá trình pha chế.
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
| **Khách hàng (Customer)** | Người dùng cuối trực tiếp thao tác trên ứng dụng di động / web PWA. | - Duyệt danh mục đồ uống.<br>- Tùy chỉnh chi tiết món.<br>- Xác thực tài khoản (JWT).<br>- Đặt hàng và thực hiện thanh toán không tiền mặt.<br>- Nhận nước tại quầy theo mã đơn. | - Giao diện trực quan, mượt mà, phản hồi nhanh (mục tiêu kỹ thuật: độ trễ API < 500ms).<br>- Không phải xếp hàng chờ đợi tại quầy thu ngân.<br>- Thông tin giá, khuyến mãi minh bạch.<br>- Thanh toán an toàn, không bị trừ tiền lặp lại.<br>- Lịch sử đơn hàng và tích lũy điểm thưởng rõ ràng. | **Tối cao (High Power / High Interest)** |
| **Nhân viên quầy / Barista (Counter Staff)** | Nhân viên tiếp nhận đơn hàng và thực hiện pha chế tại cửa hàng. | - Theo dõi danh sách đơn hàng đã thanh toán (`PAID`).<br>- Chuyển trạng thái đơn sang Đang pha chế (`PREPARING`).<br>- Chuyển trạng thái đơn sang Sẵn sàng (`READY`).<br>- Bàn giao thức uống cho khách và đóng đơn (`COMPLETED`). | - Nhận thông tin chi tiết từng món chính xác (size, topping, ghi chú).<br>- Giảm áp lực giao tiếp và thu tiền mặt trong giờ cao điểm.<br>- Quy trình chuyển trạng thái đơn hàng đơn giản, không thao tác thừa. | **Trung bình (Medium Power / High Interest)** *(Phạm vi mở rộng ngoài core MVP)* |
| **Quản lý cửa hàng / Product Owner (Store Manager)** | Người chịu trách nhiệm vận hành kinh doanh và định hướng sản phẩm. | - Quản lý danh mục sản phẩm, đơn giá và số lượng tồn kho.<br>- Cấu hình các chương trình khuyến mãi (voucher giảm giá).<br>- Quản lý tỷ lệ tích điểm khách hàng thân thiết (loyalty).<br>- Giám sát doanh thu và hiệu suất xử lý đơn hàng. | - Hệ thống vận hành ổn định, không thất thoát đơn hàng.<br>- Kiểm soát tồn kho chính xác, tuyệt đối không bị bán âm kho khi cao điểm.<br>- Tăng năng suất phục vụ và mức độ hài lòng của khách hàng. | **Cao (High Power / High Interest)** *(Giám sát & Đánh giá nghiệp vụ)* |
| **Giảng viên / Khách hàng nghiệm thu (Academic Evaluator)** | Giảng viên đánh giá học phần Công nghệ Phần mềm (Trường Đại học Sài Gòn - SGU). | - Đánh giá tính chuẩn mực của quy trình kỹ nghệ phần mềm.<br>- Kiểm tra sự tuân thủ Definition of Done (DoD).<br>- Xác minh bằng chứng thực thi tự động (CI/CD, Unit/Integration/E2E test).<br>- Thẩm định phiên bản triển khai trực tiếp trên URL Production HTTPS. | - Bàn giao phần mềm chạy thật, không chỉ là bản mẫu giao diện tĩnh.<br>- Tính truy vết (Traceability) xuyên suốt: Yêu cầu $\rightarrow$ Thiết kế $\rightarrow$ Mã nguồn $\rightarrow$ Kiểm thử.<br>- Toàn bộ quyết định kỹ thuật (ADRs) được chứng minh và giải trình minh bạch. | **Quyết định (High Power / High Interest)** |
| **Đội ngũ phát triển (Dev Team)** | Nhóm kỹ sư phần mềm phụ trách thiết kế, lập trình, kiểm thử và vận hành. | - Xây dựng kiến trúc phân lớp sạch (Clean Architecture).<br>- Hiện thực hóa frontend Next.js và backend NestJS.<br>- Thiết kế cơ sở dữ liệu PostgreSQL qua Prisma ORM.<br>- Xây dựng bộ kiểm thử tự động đa tầng.<br>- Thiết lập tự động hóa CI/CD với GitHub Actions và Docker. | - Mã nguồn dễ đọc, có cấu trúc module hóa rõ ràng.<br>- Không có nợ kỹ thuật tiềm ẩn hoặc mã kiểm thử giả lập kết quả.<br>- Môi trường local và CI đồng nhất thông qua container hóa.<br>- Tài liệu kỹ thuật đầy đủ và bám sát thực tế triển khai. | **Cao (High Power / High Interest)** |
| **Đơn vị thanh toán (Payment Provider - Mock)** | Cổng thanh toán ví điện tử / thẻ ngân hàng (được mô phỏng trong hệ thống). | - Tiếp nhận yêu cầu thanh toán từ backend.<br>- Xử lý khóa Idempotency để chặn giao dịch trùng lặp.<br>- Trả về kết quả giao dịch (Thành công / Thất bại). | - Bảo đảm an toàn giao dịch, tính toàn vẹn tài chính.<br>- Chuẩn hóa giao thức kết nối qua REST API và HTTP Headers. | **Trung bình (Low Power / Medium Interest)** |

### Phân định Stakeholder so với Actor trong Use Case
- **Stakeholder (Bên liên quan):** Là tất cả cá nhân hoặc nhóm có lợi ích, quyền hạn hoặc bị tác động bởi sự thành bại của dự án (bao gồm cả Quản lý cửa hàng, Giảng viên đánh giá và Đội ngũ phát triển).
- **Actor (Tác nhân hệ thống):** Là thực thể (người dùng hoặc hệ thống ngoài) trực tiếp tương tác vật lý/logic với phần mềm qua giao diện UI hoặc API:
  1. *Khách hàng (Customer)* — Primary Actor tương tác qua ứng dụng web/PWA.
  2. *Nhân viên quầy (Barista)* — Secondary Actor tương tác qua API cập nhật trạng thái đơn hàng.
  3. *Cổng thanh toán mô phỏng (Mock Payment Service)* — Secondary System Actor tương tác qua giao thức HTTP mock.
  4. *Hệ thống giám sát (Monitoring System)* — System Actor gọi endpoint kiểm tra sức khỏe `/health`.

---

## 3. Ma Trận Phạm Vi Dự Án (Scope Matrix)

### 3.1 Phân định các tầng phạm vi (Scope Hierarchy)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TỔNG THỂ DỰ ÁN BREWLITE                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 MVP BẮT BUỘC (ASSIGNMENT 2 CORE)               │   │
│   │                 Nghiệp vụ: ĐẶT ĐỒ UỐNG (Order Flow)            │   │
│   │                                                                │   │
│   │   ┌───────────────────────────┐    ┌───────────────────────┐   │   │
│   │   │     SPRINT 1 (FOUNDATION) │    │  SPRINT 2 (DELIVERY)  │   │   │
│   │   │  • Menu Products API      │ ──►│  • Cart & Checkout    │   │   │
│   │   │  • UI Menu Mobile-First   │    │  • Mock Payment       │   │   │
│   │   │  • Seed Data & CI Basic   │    │  • State Machine      │   │   │
│   │   │                           │    │  • Idempotency & OCC  │   │   │
│   │   │                           │    │  • Docker & CD Deploy │   │   │
│   │   └───────────────────────────┘    └───────────────────────┘   │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │        PHẠM VI MỞ RỘNG (EXTENSIONS / SHOULD & COULD HAVE)      │   │
│   │  • FR-10: Voucher giảm giá & Tích điểm Loyalty                 │   │
│   │  • FR-12: Giao diện nhân viên Barista cập nhật pha chế        │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │        NGOÀI PHẠM VI (OUT-OF-SCOPE) & TƯƠNG LAI                │   │
│   │  • Thanh toán tiền mặt / COD    • Cổng thanh toán thật VNPAY   │   │
│   │  • Máy POS / Máy in nhiệt       • Giao hàng tận nơi (Shipper)  │   │
│   │  • Quản lý chuỗi đa chi nhánh   • Quản lý tồn kho nguyên liệu  │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Trong phạm vi MVP (In-Scope — Nghiệp vụ Đặt đồ uống)
1. **Giao diện người dùng Mobile-First / PWA:**
   - Xây dựng bằng Next.js (TypeScript, App Router, TailwindCSS / CSS Modules).
   - Thiết kế tối ưu hiển thị trên màn hình di động, hỗ trợ Responsive đầy đủ trên tablet/desktop.
   - Thể hiện các màn hình cốt lõi: Menu danh mục, Chi tiết tùy chọn món, Giỏ hàng, Thanh toán, và Xác nhận đặt hàng thành công.
2. **Hệ thống Backend REST API:**
   - Xây dựng bằng NestJS (TypeScript, kiến trúc module hóa).
   - Validation dữ liệu đầu vào tự động qua `ValidationPipe` (`class-validator`, `class-transformer`).
   - Cơ chế bảo mật và xác thực người dùng bằng JWT Bearer Token, băm mật khẩu bằng `bcrypt`.
3. **Cơ sở dữ liệu quan hệ PostgreSQL:**
   - Lược đồ dữ liệu chuẩn hóa gồm các thực thể cốt lõi: `User`, `Product`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction`.
   - Quản lý phiên bản CSDL qua Migrations và seeder dữ liệu menu ban đầu.
4. **Luồng nghiệp vụ Đặt hàng & Thanh toán toàn trình:**
   - Duyệt menu $\rightarrow$ Xem chi tiết và tùy chỉnh size/topping $\rightarrow$ Giỏ hàng $\rightarrow$ Đăng nhập/Đăng ký $\rightarrow$ Tạo đơn (`PENDING`) $\rightarrow$ Thanh toán mô phỏng $\rightarrow$ Xác nhận (`PAID`) $\rightarrow$ Xem lịch sử đơn.
5. **Kiểm soát tồn kho thành phẩm (Product Stock Control):**
   - Tồn kho được quản lý ở cấp **Sản phẩm hoàn chỉnh (Product Stock)**: Lưu trong cột `Product.stock`.
   - Khi đơn hàng thanh toán thành công, hệ thống khấu trừ số lượng sản phẩm khả dụng theo số lượng đặt mua bằng cơ chế Optimistic Concurrency Control (OCC) với cột `version`, đảm bảo `stock >= 0`.
6. **Các giải pháp kỹ thuật bắt buộc:**
   - **Order State Machine:** Máy trạng thái hữu hạn kiểm soát chuyển đổi trạng thái đơn hàng thông qua hàm tập trung `assertTransition()`, chặn đứng các chuyển tiếp bất hợp lệ.
   - **Idempotent Payment:** Cơ chế chống trùng lặp thanh toán thông qua HTTP Header `Idempotency-Key` (chuẩn UUID-v4) và ràng buộc duy nhất trong CSDL (Lưu ý: Khoảng trống lưu trữ key phía client được ghi nhận tại GAP-02).
7. **Kiểm thử tự động đa tầng (Automated Testing):**
   - Unit tests: Kiểm thử State Machine, thuật toán tính giá, logic giỏ hàng, xác thực JWT.
   - Integration tests: Kiểm thử luồng tạo đơn hàng, thanh toán và trừ kho.
   - End-to-End (E2E) tests: Kịch bản kiểm thử tự động toàn diện từ bước mở menu đến khi hoàn tất đơn hàng.
8. **Container hóa & DevOps:**
   - `docker-compose.yml` khởi chạy trọn gói hệ thống tại local gồm 3 dịch vụ: Frontend (`web`), Backend API (`api`), và Cơ sở dữ liệu (`db`).
   - Endpoint kiểm tra tình trạng dịch vụ `GET /health` (Lưu ý: Endpoint này hiện diện trên nhánh feature Prisma nhưng chưa có trên baseline `main` TypeORM, được ghi nhận tại GAP-04).
   - CI Pipeline (GitHub Actions) kích hoạt tự động trên Pull Request: `Install -> Lint -> Unit Test -> Build`.
   - CD Pipeline hỗ trợ đóng gói Docker image, gắn tag phiên bản, smoke test và triển khai lên môi trường Production với URL HTTPS thật.

### 3.3 Phạm vi mở rộng (Extensions / Should Have & Could Have)
1. **FR-10: Khuyến mãi (Promotion) & Tích lũy điểm Loyalty:**
   - Áp dụng mã giảm giá hợp lệ (`BREW20`) tại bước checkout dựa trên model `Promotion`.
   - Tự động tích lũy điểm thưởng thành viên khi đơn hàng chuyển sang trạng thái `PAID`.
   > [!NOTE]
   > Khuyến mãi (Promotion) và Loyalty là tính năng giá trị gia tăng, xếp loại **Should Have / Could Have**. Nếu người dùng không áp mã khuyến mãi hoặc không tích điểm, luồng cốt lõi Đặt đồ uống vẫn thực thi hoàn tất.
2. **FR-12: Quản lý trạng thái pha chế cho Barista:**
   - Cung cấp API nội bộ cho nhân viên quầy chuyển trạng thái đơn hàng: `PAID -> PREPARING -> READY -> COMPLETED`. Giao diện chuyên biệt Barista Portal là tính năng nâng cao.

### 3.4 Ngoài phạm vi (Out-of-Scope)
1. **Thiết bị phần cứng tại cửa hàng:**
   - Không tích hợp máy bán hàng POS vật lý chuyên dụng.
   - Không tích hợp máy in bill nhiệt hoặc máy quét mã vạch chuyên dụng tại quầy.
2. **Phương thức thanh toán tiền mặt:**
   - Không hỗ trợ thanh toán tiền mặt tại quầy hoặc hình thức giao hàng thu tiền tận nơi (COD). BrewLite là nền tảng 100% không dùng tiền mặt (Cashless).
3. **Cổng thanh toán thực tế:**
   - Không ký kết hợp đồng thương mại với các tổ chức trung gian thanh toán thực tế (VNPAY, MoMo, ZaloPay, Stripe). Hệ thống sử dụng dịch vụ thanh toán mô phỏng (Mock Payment Service) tuân thủ đúng chuẩn giao thức nghiệp vụ.
4. **Quản lý tồn kho nguyên vật liệu chi tiết (Raw Material Inventory):**
   - Hệ thống **KHÔNG** quản lý tồn kho nguyên liệu chi tiết (định lượng gam hạt cà phê, mililít sữa tươi, lượng đường, đá vụn, số lượng ly nhựa/ống hút). Size và Topping chỉ dùng để tính đơn giá và gửi ghi chú cho Barista pha chế.
5. **Ứng dụng Native di động chuyên biệt:**
   - Không phát hành app native riêng biệt trên Apple App Store hoặc Google Play Store. Trải nghiệm di động được giải quyết triệt để thông qua chuẩn Mobile-First / PWA.
6. **Dịch vụ giao nhận hàng tận nhà (Home Delivery):**
   - Không xây dựng phân hệ điều phối tài xế (shipper). Khách hàng nhận đồ uống trực tiếp tại quầy theo thông điệp *"Mời tới quầy lấy nước"*.
7. **Quản lý chuỗi đa chi nhánh (Multi-branch / Franchise):**
   - Không hỗ trợ điều phối đa cửa hàng; phiên bản hiện tại phục vụ mô hình một cửa hàng duy nhất.

### 3.5 Chức năng mở rộng tương lai (Future Enhancements)
1. **Quản lý định lượng nguyên vật liệu & tự động cảnh báo tồn kho (Inventory BOM):** Tự động trừ nguyên liệu theo công thức pha chế (Bill of Materials).
2. **Hệ thống thông báo đẩy (Web Push Notifications / WebSocket):** Cập nhật trạng thái đơn hàng theo thời gian thực tới màn hình khách hàng mà không cần polling.
3. **Gợi ý món thông minh (AI Recommendation Engine):** Đề xuất đồ uống dựa trên lịch sử mua sắm và thời tiết.
4. **Phân hệ quản trị nâng cao cho Quản lý cửa hàng (Store Manager Dashboard):** Quản lý ca làm việc, chấm công nhân viên, quản lý nhà cung cấp nguyên vật liệu và báo cáo tài chính kế toán chuyên sâu.

---

## 4. Chuẩn Hóa Thuật Ngữ và Giải Quyết Mâu Thuẫn Nghiệp Vụ

### 4.1 Thống nhất thuật ngữ cốt lõi
Để tránh mâu thuẫn giữa tài liệu phân tích và mã nguồn, các thuật ngữ sau được định nghĩa chuẩn xác:
- **Product (Sản phẩm):** Đồ uống hoặc món ăn được niêm yết trong thực đơn của quán. Mỗi sản phẩm có tên, mô tả, giá gốc (base price), hình ảnh đại diện và số lượng tồn kho thành phẩm khả dụng (`stock`).
- **Cart / CartItem (Giỏ hàng / Món giỏ hàng):** Cấu trúc dữ liệu lưu trữ tạm thời phía client (Zustand store hoặc localStorage) chứa danh sách các món khách đã chọn kèm tùy chọn kích cỡ, topping, số lượng và tổng tiền tạm tính.
- **Order / OrderItem (Đơn hàng / Dòng đơn hàng):** Thực thể nghiệp vụ được lưu trữ bền vững trong cơ sở dữ liệu sau khi khách hàng xác nhận đặt đơn. `Order` có mã định danh duy nhất (`id`), mã hiển thị (`orderCode`), trạng thái (`status`), tổng tiền (`totalAmount`); `OrderItem` lưu snapshot tên món, đơn giá niêm yết tại thời điểm mua, kích cỡ, topping và số lượng.
- **Payment (Giao dịch thanh toán):** Bản ghi lưu trữ kết quả xử lý thanh toán điện tử cho một đơn hàng, liên kết chặt chẽ với phương thức thanh toán (`method`), số tiền (`amount`), trạng thái (`status`) và khóa chống trùng lặp (`idempotencyKey`).

### 4.2 Chuẩn hóa Vòng đời Đơn hàng & Máy trạng thái (Order State Machine)
Tuyệt đối loại bỏ thuật ngữ gây mơ hồ `Received`. Vòng đời đơn hàng trong toàn bộ hệ thống được kiểm soát nghiêm ngặt theo các trạng thái chính thức sau:

```
                  ┌────────────────────────┐
                  │        PENDING         │ (Đơn vừa tạo, chờ thanh toán)
                  └───────────┬────────────┘
                              │
          ┌───────────────────┼────────────────────┐
          │ (Thanh toán lỗi)  │ (Thanh toán OK)   │ (Hủy trước trả tiền)
          ▼                   ▼                    ▼
┌──────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│  PAYMENT_FAILED  │ │      PAID       │ │    CANCELLED     │
└────────┬─────────┘ └────────┬────────┘ └──────────────────┘
         │ (Thử lại)          │
         └────────────────────┼────────────────────┐
                              ▼                    │ (Hủy sự cố / Hoàn tiền*)
                     ┌─────────────────┐           │
                     │    PREPARING    │           │
                     └────────┬────────┘           │
                              │ (Pha chế xong)     │
                              ▼                    ▼
                     ┌─────────────────┐ ┌──────────────────┐
                     │      READY      │ │    CANCELLED     │
                     └────────┬────────┘ └──────────────────┘
                              │ (Khách nhận nước tại quầy)
                              ▼
                     ┌─────────────────┐
                     │    COMPLETED    │ (Đơn hoàn tất)
                     └─────────────────┘
```

- **`PENDING`:** Đơn hàng được tạo thành công từ giỏ hàng, đang chờ thực hiện giao dịch thanh toán.
- **`PAID`:** Giao dịch thanh toán mô phỏng thành công, hệ thống đã trừ tồn kho an toàn và cấp mã nhận nước.
- **`PREPARING`:** Nhân viên quầy/Barista tiếp nhận đơn và bắt đầu pha chế.
- **`READY`:** Đồ uống đã hoàn tất, sẵn sàng tại quầy đón khách.
- **`COMPLETED`:** Khách hàng đã nhận đồ uống tại quầy, chu trình đơn hàng kết thúc viên mãn.
- **`PAYMENT_FAILED`:** Cổng thanh toán từ chối giao dịch; giỏ hàng được giữ nguyên để khách hàng chọn lại hoặc thử lại.
- **`CANCELLED`:** Đơn hàng bị hủy.
  - *Lưu ý về quy tắc hoàn tiền (`BR-REFUND-01`):* Xem chi tiết tại Mục 4.5.

### 4.3 Chuẩn hóa tùy chỉnh Size/Topping so với Mức đường/đá
- **Size (SMALL, MEDIUM, LARGE) và Topping:** Là **thuộc tính cấu hình đơn giá (Pricing Modifiers)**. Các tùy chọn này can thiệp trực tiếp vào thuật toán tính giá (`lineTotal`), làm thay đổi đơn giá bán ra, nhưng **KHÔNG** can thiệp vào trừ tồn kho nguyên vật liệu chi tiết trong CSDL (hệ thống chỉ trừ `Product.stock` theo số ly).
- **Mức đường (0%, 30%, 50%, 70%, 100%) và Mức đá (Không đá, Ít đá, Đá riêng):** Là **ghi chú pha chế định tính (Customization Notes)**. Các tùy chọn này không làm thay đổi giá tiền của sản phẩm, được lưu trữ trong trường ghi chú (`note`) của đơn hàng để phục vụ Barista khi pha chế.

### 4.4 Quy tắc nghiệp vụ về tỷ lệ tích điểm Loyalty (BR-LOYALTY-01)
> [!NOTE]
> **Business Rule cần Product Owner phê duyệt (BR-LOYALTY-01):**
> - *Tài liệu đề xuất ban đầu (Context & Scope v1.0):* 10.000 VNĐ chi tiêu = 1 điểm thưởng khách hàng thân thiết.
> - *Mã nguồn triển khai thực tế trên nhánh Sprint 1 (`payments.service.ts`):* `Math.floor(amount / 1000)` (tương đương 1.000 VNĐ chi tiêu = 1 điểm thưởng).
> - **Trạng thái:** `PROPOSED / PENDING APPROVAL from PO`.
> - **Khoảng trống triển khai (GAP-03):** Công thức tích điểm có sự không nhất quán giữa đề bài và mã nguồn thử nghiệm, cần quyết định chính thức từ PO. Trong giai đoạn kiểm thử hiện tại, hệ thống tuân theo cài đặt của mã nguồn (1.000 VNĐ = 1 điểm) để đảm bảo toàn bộ kiểm thử tự động (Unit/Integration Test) đạt kết quả nhất quán.

### 4.5 Quy tắc hoàn tiền khi hủy đơn (BR-REFUND-01)
> [!NOTE]
> **Business Rule đề xuất về Hoàn tiền (BR-REFUND-01):**
> - **Hành vi nghiệp vụ mong muốn:** Nếu đơn hàng đã ở trạng thái `PAID` mà bị hủy do sự cố kỹ thuật hoặc hết nguyên liệu tại quầy, hệ thống cần thực hiện hoàn tiền tự động 100% cho khách hàng và hoàn lại số lượng tồn kho thành phẩm.
> - **Trạng thái hiện tại:** `PROPOSED / PENDING APPROVAL` (Đề xuất nghiệp vụ, **CHƯA ĐƯỢC TRIỂN KHAI TRONG MÃ NGUỒN**).
> - **Khoảng trống triển khai (GAP-01):** Cả trên nhánh `main` và nhánh `feature/sprint1-mvp-foundation`, phương thức `mockPaymentService.refund()` và endpoint `PATCH /orders/:id/cancel` chưa tồn tại trong mã nguồn backend; `PaymentStatus` enum chỉ gồm `PENDING`, `SUCCESS`, `FAILED` (chưa có `REFUNDED`). Do đó, tài liệu không khẳng định hoàn tiền tự động là tính năng đang hoạt động mà ghi nhận đây là yêu cầu cần triển khai bổ sung trong các Task tiếp theo.

### 4.6 Danh mục Khoảng hở Triển khai Đồng bộ (Synchronized Implementation Gaps)
Hệ thống tài liệu BrewLite thống nhất 4 mã định danh khoảng hở kỹ thuật (GAPs) xuyên suốt các văn bản:
1. **`GAP-01` (Cơ chế Hoàn tiền - Refund):** Chưa có API `POST /payments/:id/refund` hay `PATCH /orders/:id/cancel`; quy tắc `BR-REFUND-01` ở trạng thái đề xuất, việc hủy đơn hợp lệ xử lý thủ công ngoại tuyến.
2. **`GAP-02` (Lưu trữ Idempotency Key phía Client):** Backend đã có cơ chế Unique Index chống thanh toán trùng, nhưng giao diện Client Next.js chưa lưu key vào `sessionStorage` để tái sử dụng khi reload hoặc thử lại.
3. **`GAP-03` (Công thức tích điểm thành viên - Loyalty Formula):** Mâu thuẫn giữa đề bài Assignment 2 (10.000 VNĐ = 1 điểm) và mã nguồn thử nghiệm (1.000 VNĐ = 1 điểm), đang chờ PO phê duyệt.
4. **`GAP-04` (Endpoint Health Check trên baseline `main`):** Nhánh `main` (TypeORM) chưa có endpoint `GET /health` (chỉ có `AppController` trả về 'Hello World!'). Endpoint `/health` đầy đủ chỉ mới hiện diện trên nhánh feature Prisma.

---

## 5. Giả Định, Ràng Buộc và Danh Mục Rủi Ro Ban Đầu

### 5.1 Các giả định (Assumptions)
1. **[Assumption-01]** Khách hàng sử dụng thiết bị thông minh (smartphone, tablet, laptop) có trình duyệt hiện đại (Chrome, Safari, Firefox, Edge) hỗ trợ JavaScript ES6+ và có kết nối Internet ổn định.
2. **[Assumption-02]** Dịch vụ thanh toán mô phỏng (Mock Payment Service) phản hồi ổn định trong khoảng thời gian chấp nhận được (< 500ms) và hỗ trợ giả lập cả kịch bản thành công lẫn thất bại.
3. **[Assumption-03]** Cửa hàng chỉ quản lý một chi nhánh đơn lẻ trong giai đoạn MVP, chưa mở rộng quản lý chuỗi đa chi nhánh.
4. **[Assumption-04]** Số liệu về thời gian chờ xếp hàng (10-15 phút) tại mục 1.1 là giả định bối cảnh nghiên cứu ban đầu của dự án, làm cơ sở định hướng xây dựng ứng dụng không tiền mặt.

### 5.2 Các ràng buộc kỹ thuật (Constraints)
1. **Ràng buộc công nghệ (Technology Constraints):** Bắt buộc tuân thủ bộ công nghệ theo Assignment 2: Frontend Next.js (TypeScript), Backend NestJS (TypeScript), Database PostgreSQL với cơ chế migration an toàn, đóng gói và triển khai qua Docker.
2. **Ràng buộc hiệu năng (Performance Constraints):** Thời gian phản hồi trung bình của các API nghiệp vụ chính (Menu, Chi tiết, Đặt đơn) phải đạt mục tiêu dưới 500ms trong điều kiện tải cơ bản.
3. **Ràng buộc an ninh (Security Constraints):**
   - Mật khẩu người dùng bắt buộc phải được mã hóa một chiều qua thuật toán bcrypt với salt factor $\ge 10$.
   - Tuyệt đối không để lộ thông tin nhạy cảm, JWT Secret hoặc mật khẩu kết nối cơ sở dữ liệu trên mã nguồn Git hoặc log CI/CD.
   - Cơ sở dữ liệu trên môi trường Production phải được cô lập trong mạng riêng ảo (Private Network/VPC), không mở cổng kết nối công khai ra ngoài Internet.
4. **Ràng buộc quy trình (Process Constraints):** Toàn bộ mã nguồn đưa vào nhánh chính (`main`) bắt buộc phải thông qua Pull Request, đáp ứng 100% tiêu chí Definition of Done (DoD) và vượt qua toàn bộ các bước kiểm tra tự động của CI pipeline.

### 5.3 Danh mục nhận diện rủi ro ban đầu (Initial Risk Catalog)

| Mã Rủi Ro | Mô tả rủi ro | Xác suất (P) | Mức độ tác động (I) | Điểm rủi ro (P x I) | Biện pháp phòng ngừa & Giảm thiểu cụ thể | Kế hoạch dự phòng (Contingency Plan) |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **RSK-01** | **Bán vượt tồn kho khi đặt hàng đồng thời (Concurrency Overselling)**<br>Nhiều khách hàng cùng đặt ly cà phê cuối cùng trong kho tại cùng một thời điểm, dẫn đến số lượng tồn kho bị âm. | Cao (High) | Nghiêm trọng (Critical) | **Rất cao (P0)** | Áp dụng cơ chế **Optimistic Locking** thông qua cột `version` trong bảng `Product` kết hợp mệnh đề `UPDATE ... WHERE version = :v AND stock >= :qty` bên trong một Transaction CSDL tương tác. | Khi giao dịch phát hiện xung đột phiên bản (`InsufficientStockException`), hệ thống tự động rollback, báo lỗi HTTP 409 Conflict và cập nhật giao diện thông báo món đã hết hàng. |
| **RSK-02** | **Thanh toán trùng lặp do bấm nhiều lần hoặc retry mạng (Duplicate Payments)**<br>Khách hàng nhấn nút thanh toán nhiều lần do mạng chập chờn, dẫn đến việc bị trừ tiền hai lần cho cùng một đơn hàng. | Cao (High) | Nghiêm trọng (Critical) | **Rất cao (P0)** | Bắt buộc client gửi header `Idempotency-Key` (UUID-v4). Backend lưu key vào bảng `Payment` với ràng buộc duy nhất (`UNIQUE`), nếu nhận cùng key thì trả về ngay kết quả giao dịch trước đó. | Khóa bản ghi (Locking) trong quá trình xử lý; từ chối xử lý song song các request có cùng `Idempotency-Key` đang ở trạng thái `IN_PROGRESS`. |
| **RSK-03** | **Sai lệch vòng đời đơn hàng (Invalid State Transition)**<br>Đơn hàng nhảy cóc trạng thái (ví dụ từ `PENDING` sang thẳng `COMPLETED` mà chưa qua `PAID`, hoặc đơn đã hủy vẫn được thanh toán). | Trung bình (Med) | Nghiêm trọng (Critical) | **Cao (P1)** | Xây dựng máy trạng thái hữu hạn tập trung trong code (`OrderStateMachine`) với hàm bảo vệ `assertTransition(currentStatus, nextStatus)` kiểm tra danh sách chuyển tiếp hợp lệ. | Bất kỳ yêu cầu chuyển đổi trạng thái nào vi phạm quy tắc đều bị chặn đứng ngay lập tức và ném lỗi HTTP 400 `InvalidStateTransitionException`. |
| **RSK-04** | **Lỗ hổng kiểm soát truy cập đối tượng trực tiếp (IDOR Vulnerability)**<br>Người dùng thay đổi tham số `orderId` trên URL để xem hoặc can thiệp vào đơn hàng của khách hàng khác. | Trung bình (Med) | Cao (High) | **Cao (P1)** | Tại service xử lý `GET /orders/:id`, luôn kiểm tra `order.userId === requestUser.id`. Chỉ cho phép tài khoản có quyền `STAFF` hoặc `ADMIN` truy cập đơn hàng của người khác. | Trả về HTTP 403 Forbidden nếu phát hiện truy cập trái quyền, đồng thời ghi log cảnh báo an ninh. |
| **RSK-05** | **Môi trường máy trạm dừng Docker Daemon cục bộ**<br>Docker Desktop trên máy phát triển Windows không chạy, khiến không thể khởi động PostgreSQL và chạy integration tests. | Cao (High) | Trung bình (Med) | **Trung bình (P2)** | Cung cấp tài liệu hướng dẫn khởi động Docker Desktop, cấu hình fallback sang dịch vụ PostgreSQL cục bộ hoặc in-memory/testcontainers khi chạy test đơn vị. | Sử dụng script kiểm tra kết nối `docker ps` trước khi chạy các lệnh kiểm thử yêu cầu database thật. |
| **RSK-06** | **Suy giảm hiệu năng hệ thống khi lượng dữ liệu tăng (Performance Degradation)**<br>Thời gian phản hồi của API vượt quá ngưỡng 500ms do câu truy vấn chậm hoặc thiếu chỉ mục (index). | Thấp (Low) | Trung bình (Med) | **Trung bình (P2)** | Đánh chỉ mục (Index) đầy đủ trên các trường khóa ngoại (`userId`, `orderId`, `productId`) và trường tìm kiếm (`orderCode`, `idempotencyKey`). Tối ưu câu lệnh truy xuất dữ liệu tinh gọn. | Giám sát thời gian phản hồi thông qua log và bộ kiểm thử hiệu năng tự động. |

---

## 6. Kết Luận & Định Hướng Giai Đoạn Tiếp Theo
Tài liệu Bối cảnh, Các bên liên quan và Phạm vi dự án (`context-and-scope.md`) phiên bản 1.2.0 đã chuẩn hóa ranh giới quản lý tồn kho thành phẩm (loại bỏ nhầm lẫn tồn kho nguyên liệu), phân định minh bạch các Business Rules đề xuất và các khoảng trống triển khai (Implementation Gaps). Toàn bộ các yêu cầu chức năng (FR) và phi chức năng (NFR) trong `docs/requirements/srs.md` cũng như kịch bản Use Case trọng tâm `docs/requirements/use-cases.md` sẽ bám sát tuyệt đối vào các ranh giới đã chuẩn hóa tại văn bản này.
