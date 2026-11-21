# KẾ HOẠCH KHÔI PHỤC GIAO DIỆN FIGMA MAKE (TASK 5.4.3 / FIGMA RESTORATION PLAN)

**Dự án:** Hệ Thống Đặt Đồ Uống Trực Tuyến BrewLite (Assignment 2)  
**Nhánh:** `feat/figma-ui-restoration`  
**Baseline Commit:** `7d8084087678bdcae864e49d964315083c091107` (Head of `main`)  
**Tài liệu tham chiếu:** Figma Make Export ZIP (`BrewLite Coffee Ordering App (1).zip` giải nén tại `tmp/figma-ref/`)  
**Mục tiêu chính:** Tái hiện trung thực nhất ngôn ngữ thiết kế, màu sắc, bố cục, hiệu ứng và trải nghiệm tương tác từ Figma Make vào ứng dụng Next.js hiện tại, đồng thời bảo toàn 100% logic nghiệp vụ backend, bảo mật xác thực JWT, tính bất biến giỏ hàng, thanh toán idempotency, kiểm soát tồn kho OCC và các bài kiểm thử E2E đã nghiệm thu.

---

## 1. KHẢO SÁT KIẾN TRÚC FRONTEND HIỆN TẠI

### 1.1 Cấu Trúc Mã Nguồn & Định Tuyến (Routing)
- **Framework & Công nghệ:** Next.js 16.4.5 (Turbopack, Standalone output), React 19.3.0, TypeScript 5.
- **Font chữ:** `Plus Jakarta Sans` cấu hình qua `next/font/google` tại `apps/web/src/app/layout.tsx`.
- **Hệ thống Styling:**
  - `apps/web/src/app/globals.css`: Reset CSS, font variable `--font-plus-jakarta-sans`.
  - `apps/web/src/app/menu/menu.module.css`: CSS Modules chứa các class scoped.
  - Bổ sung: Tailwind CSS v4 (`@tailwindcss/postcss`, `postcss`, `tailwindcss`) tương thích hoàn toàn với Next.js Turbopack.
- **Cấu trúc Định Tuyến:**
  - `/` (`apps/web/src/app/page.tsx`): Tái sử dụng `MenuPage` với view ban đầu là `home` (`#top`).
  - `/menu` (`apps/web/src/app/menu/page.tsx`): Giao diện danh mục thực đơn, đặt món và toàn bộ luồng tương tác.
  - `#top` (Trang chủ), `#menu` (Menu), `#history` (Lịch sử đơn hàng), `#account` (Tài khoản người dùng): Được điều hướng mượt mà qua state kết hợp Browser History URL hash, đảm bảo F5/reload không mất trạng thái.

### 1.2 Quản Lý State & Tích Hợp API
- **Danh mục Sản phẩm:** Fetch từ NestJS API endpoint `GET /products` và `GET /products/:id` qua `products.mjs`.
- **Giỏ hàng Session Cart:** Quản lý bằng `useSessionCart()` (`session-cart.ts`) kết hợp `useSyncExternalStore` và `sessionStorage` key `brewlite_cart_v1`. Đảm bảo không bị hydration mismatch, đồng bộ real-time giữa các tab và cô lập theo phiên duyệt.
- **Xác thực Người dùng (Auth JWT):** Quản lý qua `createAuthController()` (`menu-controller.mjs`). Lưu trữ token tại `localStorage.getItem("brewlite_access_token")` và user profile tại `localStorage.getItem("brewlite_user")`. Tự động đính kèm header `Authorization: Bearer <token>`.
- **Tạo Đơn & Thanh Toán (UC-04 & UC-10):**
  - Bước 1: POST `/orders` tạo đơn hàng trạng thái `PENDING`.
  - Bước 2: POST `/payments` với `idempotencyKey`, `orderId`, `method`, `amount`, xử lý giao dịch và cập nhật trạng thái `PAID` (hoặc `FAILED` nếu số dư không đủ).
  - Không bao giờ set `PAID` qua local state mà luôn đợi xác nhận từ backend.
- **Lịch sử Đơn Hàng:** Fetch từ `GET /orders/me` với Bearer JWT. Hỗ trợ đặt lại đơn hàng (`handleReorder`) có kiểm tra tồn kho mới nhất.

---

## 2. SO SÁNH GIAO DIỆN THAM CHIẾU FIGMA VỚI HIỆN TRẠNG

| Hạng Mục | Giao Diện Tham Chiếu Figma (`tmp/figma-ref/`) | Ứng Dụng Next.js Hiện Tại (`apps/web/`) | Khoảng Trống (Gap) Cần Khôi Phục |
|---|---|---|---|
| **Design Tokens & Theme** | Bảng màu cà phê ấm: Espresso `#3D261D`, Caramel `#C28D58`, Cream `#FAF6F0`, Cream Dark `#EFE8DF`, Brew BG `#FDFCFA`. | CSS Modules với một số màu cơ bản, chưa đồng bộ hóa toàn diện design tokens của Figma. | Cấu hình `@theme` Tailwind CSS v4 với các biến chuẩn và class tiện ích. |
| **Screen 01: Header** | Logo BrewLite cách điệu ly cà phê, Nav desktop pills (Trang chủ, Menu, Lịch sử có dot cam, Tài khoản), Nav mobile icons, nút Giỏ hàng nổi bật với badge số lượng và tổng tiền VND. | Header thanh ngang với text đơn giản, chưa có icon Lucide, chưa có badge tổng tiền trên nút giỏ hàng. | Khôi phục logo SVG chuẩn, nav desktop/mobile responsive, cart pill có badge đếm và format tiền. |
| **Screen 02: Menu** | Hero banner bo góc 3xl màu Espresso `#3D261D`, họa tiết vòng tròn trang trí, search bar bo tròn lớn với nút clear '×', category pills dạng viên thuốc, thẻ sản phẩm bo tròn 2xl đổ bóng nhẹ có badge 'Yêu thích' / 'Món mới', nút Tùy chỉnh và nút '+' quick-add. | Danh sách sản phẩm dạng thẻ cơ bản, hero banner đơn giản, thiếu nút quick-add trực tiếp trên thẻ. | Tái tạo chính xác Hero Banner với stat counters, Search Bar bo tròn, Category Pills, thẻ sản phẩm có nút Quick Add và Tùy chỉnh. |
| **Screen 03: Product Modal** | Bottom sheet (mobile) / Center modal (desktop) bo góc 3xl, ảnh kèm gradient, chọn Size S/M/L dạng lưới 3 cột, checkbox Topping phong cách cà phê, mức đá 3 nấc, mức đường 4 nấc, bộ đếm số lượng (-) (+) và nút 'Thêm vào đơn — [Giá]'. | Modal tùy chỉnh đã có đầy đủ logic nhưng giao diện còn thô, chưa có các pill bo tròn và bộ chọn đẹp mắt như Figma. | Thay thế giao diện modal bằng cấu trúc Figma Make, giữ nguyên binding vào DTO NestJS (SMALL/MEDIUM/LARGE, tên topping, combineItemNote). |
| **Screen 04: Cart Drawer** | Slide-over drawer trượt từ phải sang (`animate-slide-in-right`), hàng món có ảnh nhỏ, tóm tắt tùy biến (Size · Topping · Đá · Đường), bộ đếm số lượng (-) (+), nút xóa có bước xác nhận inline 'Xóa / Giữ lại', ô nhập voucher, nút thanh toán lớn. | Drawer hiện tại hoạt động đúng logic nhưng hiệu ứng trượt và bố cục thẻ món chưa mượt mà bằng Figma. | Tái cấu trúc giao diện Cart Drawer chuẩn Figma, tích hợp xóa có xác nhận inline, giữ nguyên `useSessionCart()`. |
| **Screen 05: Auth Modal** | Header tối màu Espresso `#3D261D`, tab Đăng nhập/Đăng ký chuyển đổi mượt mà, thanh đo độ mạnh mật khẩu 3 nấc (Yếu/Trung bình/Mạnh), input bo tròn 2xl, icon ẩn/hiện mật khẩu. | Auth modal đã kết nối API thật nhưng visual dạng form truyền thống, thiếu password strength meter. | Khôi phục thiết kế visual của Auth Modal, tích hợp vào `authController` gọi API `/auth/login` và `/auth/register` thật. |
| **Screen 06: Checkout** | Nút quay lại menu, chọn nhận hàng 'Tại quầy' vs 'Giao tận bàn' (nhập số bàn), chọn thanh toán (MoMo, VietQR, Thẻ quốc tế), hiển thị tóm tắt đơn. | Modal thanh toán hiện tại có 2 phương thức và chọn bàn nhưng visual chưa đạt độ hoàn thiện cao. | Khôi phục layout Checkout với các thẻ chọn phương thức có icon đẹp mắt, kết nối luồng POST `/orders` và POST `/payments`. |
| **Screen 07: Order Confirmation** | Hoạt ảnh pháo hoa Confetti, icon tích xanh tròn lớn, vé chuông điện tử (Pickup Ticket) màu Espresso xé răng cưa nét đứt, mã chuông `#BL-XXXX` khổ lớn, thanh tiến trình trạng thái. | Có dialog vé chuông điện tử hiển thị mã `#BL-XXXX`, nhưng chưa có phong cách vé xé răng cưa sang trọng và hiệu ứng thành công. | Tái hiện Pickup Ticket với nét đứt răng cưa, mã chuông nổi bật, hiển thị trạng thái thực tế từ backend. |
| **Screen 08: Order History** | Bộ 3 tabs (Đang xử lý, Hoàn tất, Đã hủy) có badge số lượng đơn, danh sách thẻ đơn hàng có preview ảnh món, nút 'Đặt lại' có icon xoay, nút 'Xem vé xác nhận'. | Có danh sách đơn và reorder nhưng giao diện dạng bảng/danh sách đơn thuần. | Khôi phục OrderCard chuẩn Figma, preview ảnh món cuộn ngang, trạng thái màu sắc trực quan, kết nối API `GET /orders/me`. |
| **Screen 09: Account Screen** | Card hồ sơ người dùng Espresso sang trọng, avatar chữ cái đầu, thông tin email, danh sách cài đặt, nút đăng xuất, trạng thái khách (Guest State). | Chưa có màn hình Tài khoản riêng biệt (chỉ có nút đăng xuất trên topbar). | Bổ sung view Tài khoản (`#account`), hiển thị thông tin thực tế của user, các mục cài đặt và trạng thái khách khi chưa đăng nhập. |
| **Toast & Feedback** | Hệ thống Toast nổi góc dưới/trên, bo tròn 2xl, icon Lucide (CheckCircle, XCircle, Info), tự biến mất sau 3.2s. | Dùng `alert()` và thông báo nhúng cục bộ. | Triển khai Toast notification đồng bộ trên toàn ứng dụng. |

---

## 3. XỬ LÝ XUNG ĐỘT GIỮA FIGMA MOCK VÀ BACKEND THẬT

1. **Sản phẩm (Products):**
   - *Figma Mock:* File `src/data.ts` chứa mảng tĩnh `PRODUCTS` với id kiểu string (`"1"`, `"2"`).
   - *Quy tắc:* Tuyệt đối không dùng dữ liệu giả. Sử dụng 100% dữ liệu động từ API `GET /products` của NestJS. Ảnh sản phẩm ưu tiên `imageUrl` của backend, nếu không có mới dùng ảnh fallback theo danh mục.
2. **Quy trình Thanh Toán (Payment Workflow):**
   - *Figma Mock:* Mô phỏng bằng `setTimeout(1800)` và toggle `paymentTestMode` (success/failure) trong UI người dùng.
   - *Quy tắc:* Thực hiện đúng quy trình 2 bước chuẩn:
     1. Khách bấm Xác nhận đặt hàng $\rightarrow$ Gọi `POST /orders` tạo đơn `PENDING`.
     2. Khách chọn phương thức $\rightarrow$ Gọi `POST /payments` gửi kèm `idempotencyKey` và `orderId`. Trạng thái `PAID` phải được backend trả về trong response.
     3. Loại bỏ hoàn toàn các nút chuyển đổi trạng thái giả lập trên giao diện người dùng chính.
3. **Tiến Trình Trạng Thái Đơn Hàng (Order Status Progression):**
   - *Figma Mock:* Cho phép người dùng bấm các nút `PAID`, `PREPARING`, `READY`, `COMPLETED` để tự đổi trạng thái.
   - *Quy tắc:* Loại bỏ các nút can thiệp trạng thái này. Trạng thái hiển thị là **Read-Only**, phản ánh đúng giá trị từ PostgreSQL database.
4. **Điểm Thưởng & Cấp Độ Thành Viên (Loyalty Points / Tiers):**
   - *Figma Mock:* Hiển thị `1,250 Beans`, `Gold Member`, thanh tiến trình đổi cà phê miễn phí.
   - *Quy tắc:* Backend Assignment 2 chưa có bảng `loyalty_points` hoặc module điểm thưởng. Do đó, trên giao diện Account Screen:
     - Hiển thị thông tin thực tế: Email, Ngày tham gia, Số lượng đơn đã đặt thực tế từ `/orders/me`.
     - Khu vực BrewPoints hiển thị nhãn minh bạch: *"Chương trình tích điểm hội viên đang được chuẩn bị (Phiên bản kế tiếp)"*, không bịa đặt số điểm giả mạo gây hiểu lầm cho người dùng và QA auditor.

---

## 4. BẢNG ÁNH XẠ LINH KIỆN (COMPONENT MAPPING TABLE)

| Reference Component (`tmp/figma-ref/`) | Existing Implementation (`apps/web/`) | Target Component (`apps/web/src/components/`) | Required Changes | API Dependencies |
|---|---|---|---|---|
| `src/components/Header.tsx` | Thanh header inline trong `apps/web/src/app/menu/page.tsx` | `apps/web/src/components/Header.tsx` | Tách component độc lập; tích hợp logo ly cà phê BrewLite, desktop navigation pills (Trang chủ, Menu, Lịch sử, Tài khoản), mobile icon nav, nút giỏ hàng có badge và format giá tiền. | None (Props từ controller) |
| `src/components/MenuScreen.tsx` | Phần render danh mục & card inline trong `page.tsx` | `apps/web/src/components/MenuScreen.tsx` | Tách component; render Hero Banner với stat counter, Search Bar có nút xóa, Category Pills lọc nhanh, lưới ProductCard có nút Tùy chỉnh và '+' Quick-Add, xử lý loading/skeleton/empty/error. | `GET /products` |
| `src/components/ProductModal.tsx` | Modal tùy chỉnh inline trong `page.tsx` | `apps/web/src/components/ProductModal.tsx` | Tách component; thiết kế bottom-sheet trên mobile và modal trung tâm trên desktop, chọn Size S/M/L, Topping checkboxes, Đá, Đường, Ghi chú `customNote`, Stepper số lượng, ánh xạ đúng DTO backend. | `GET /products/:id` |
| `src/components/CartDrawer.tsx` | Drawer giỏ hàng inline trong `page.tsx` | `apps/web/src/components/CartDrawer.tsx` | Tách component; slide-over animation `animate-slide-in-right`, render thẻ món có tùy biến, bộ tăng giảm số lượng, xác nhận xóa inline, ô nhập mã giảm giá (UI preview), nút tiếp tục thanh toán. | `useSessionCart` (`sessionStorage`) |
| `src/components/AuthModal.tsx` | Modal đăng nhập inline trong `page.tsx` | `apps/web/src/components/AuthModal.tsx` | Tách component; chuyển đổi tab Đăng nhập/Đăng ký, thanh đánh giá độ mạnh mật khẩu, validation email/mật khẩu, kết nối `authController` lưu trữ JWT vào `localStorage`. | `POST /auth/login`<br>`POST /auth/register` |
| `src/components/CheckoutScreen.tsx` | Modal thanh toán inline trong `page.tsx` | `apps/web/src/components/CheckoutScreen.tsx` | Tách component; lựa chọn Nhận tại quầy vs Giao tận bàn (nhập số bàn), chọn VietQR/MoMo/Card, kiểm tra tính hợp lệ giỏ hàng, thực thi `POST /orders` và `POST /payments`. | `POST /orders`<br>`POST /payments` |
| `src/components/OrderConfirmation.tsx` | Dialog vé chuông `#BL-XXXX` inline trong `page.tsx` | `apps/web/src/components/OrderConfirmation.tsx` | Tách component; hiệu ứng Confetti, icon check tròn, Pickup Ticket xé răng cưa với mã chuông lớn, tóm tắt món, nút Đóng/Tiếp tục mua sắm/Xem lịch sử, trạng thái Read-Only. | None (Props từ order response) |
| `src/components/OrderHistory.tsx` | Phần lịch sử đơn inline trong `page.tsx` | `apps/web/src/components/OrderHistory.tsx` | Tách component; 3 tabs Đang xử lý / Hoàn tất / Đã hủy, thẻ đơn hàng có ảnh preview cuộn ngang, nút Đặt lại (Reorder) có kiểm tra tồn kho, nút Xem lại vé chuông. | `GET /orders/me`<br>`GET /products` (cho reorder) |
| `src/components/AccountScreen.tsx` | Chưa có (chỉ có profile popup tối giản) | `apps/web/src/components/AccountScreen.tsx` | Xây dựng mới; Profile card màu Espresso, email người dùng, thống kê đơn hàng thật từ `orders`, các menu cài đặt và trạng thái Guest State khi chưa đăng nhập. | `localStorage` (user session), `GET /orders/me` |
| `src/components/Toast.tsx` | `alert()` hoặc state notice tạm | `apps/web/src/components/Toast.tsx` | Tách component; hiển thị thông báo góc màn hình với icon CheckCircle/XCircle/Info, nền màu chuẩn Tailwind, tự ẩn sau 3.2s. | None (Local state) |

---

## 5. KẾ HOẠCH BẢO VỆ CÁC BÀI KIỂM THỬ ĐÃ PASS

1. **Bảo đảm thuộc tính ARIA và Role cho E2E (`scripts/e2e-mvp-acceptance.mjs`):**
   - Header phải có `nav` với role `navigation` và `aria-label="Điều hướng chính"`.
   - Các liên kết điều hướng phải có tên `Trang chủ`, `Menu`, `Lịch sử` và thuộc tính `aria-current="page"` khi active.
   - Nút giỏ hàng phải có class hoặc selector khớp `button[class*="cartSummary"]` với `aria-label` chứa định dạng `"X món - Y đ"`.
   - Drawer giỏ hàng phải có id `id="cart"`.
   - Nút mở chi tiết món phải có nhãn text chứa `"Chi tiết"`.
   - Nút thêm vào giỏ trong modal phải có text `"Thêm vào giỏ"`.
   - Form đăng ký phải có các input `#auth-email`, `#auth-password`.
   - Checkout drawer phải có các input `#customerName`, `#customerPhone`.
   - Dialog thanh toán có text `"Thanh toán đơn #"` và input `#table-number-input`.
   - Dialog vé chuông có text `"Digital Buzzer"` hoặc mã `#BL-` và nút đóng `aria-label="Đóng vé chuông"`.
   - Lịch sử đơn hàng phải có thẻ `article` với tên là mã đơn `#BL-XXXX` và nút `Xem vé xác nhận #BL-XXXX`.
2. **Kiểm tra Unit & Component Tests (`apps/web/tests/`):**
   - Chạy kiểm thử tự động sau mỗi giai đoạn triển khai: `npm run test` (bao gồm 14 node unit tests và 30 Jest component tests).
3. **Kiểm thử E2E Full-Stack với Chromium & PostgreSQL:**
   - Chạy `node scripts/e2e-mvp-acceptance.mjs` xác nhận toàn bộ 14/14 bước đều PASS 100%.
   - Chạy `node scripts/e2e-security-exceptions.mjs` xác nhận 11/11 bài kiểm thử bảo mật ngoại lệ đều PASS 100%.

---

## 6. KẾT LUẬN & BƯỚC TIẾP THEO

Kế hoạch đã xác định rõ ràng phạm vi, thiết kế, quy tắc nghiệp vụ và các chốt chặn kỹ thuật. Chúng ta sẽ tiến hành **Phase B (Cấu hình Design Tokens & CSS)** và **Phase C (Khôi phục và mô-đun hóa các màn hình)** theo đúng trình tự.
