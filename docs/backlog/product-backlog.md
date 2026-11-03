# Product Backlog

Nguồn: yêu cầu Task 4.1 và kiểm tra repository trống ngày 03/11/2026. Không có căn cứ để khẳng định chức năng bán hàng, đăng nhập hoặc thanh toán. BL-01–BL-04 là đề xuất nền tảng, chờ nhóm xác nhận. Ước lượng là tạm tính, không phải cam kết; chưa có người phụ trách hoặc hạn hoàn thành.

| Mã | Công việc | Ưu tiên | Ước lượng | Sprint | Trạng thái | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| BL-00 | Hoàn tất Task 4.1 — thiết lập repository | P0 | 3 điểm (tạm tính) | 1 | In Review; chờ review của nhóm | [#1](https://github.com/vohuunghiaah/brewlite/issues/1) |
| BL-01 | Xác nhận phạm vi nghiệp vụ BrewLite | P0 | 2 điểm (tạm tính) | 1 | Backlog — đề xuất chưa xác nhận | [#2](https://github.com/vohuunghiaah/brewlite/issues/2) |
| BL-02 | Ghi quyết định kiến trúc và công nghệ | P1 | 2 điểm (tạm tính) | 1 | Backlog — đề xuất chưa xác nhận | [#3](https://github.com/vohuunghiaah/brewlite/issues/3) |
| BL-03 | Thiết lập ứng dụng theo kiến trúc được duyệt | P1 | Chưa ước lượng; phụ thuộc BL-02 | 2 | Backlog — đề xuất chưa xác nhận | [#4](https://github.com/vohuunghiaah/brewlite/issues/4) |
| BL-04 | Xác minh tích hợp và thiết lập kiểm tra tự động | P1 | Chưa ước lượng; phụ thuộc BL-03 | 2 | Backlog — đề xuất chưa xác nhận | [#5](https://github.com/vohuunghiaah/brewlite/issues/5) |

## BL-00

**Hoàn tất Task 4.1 — thiết lập repository**

Thiết lập cấu trúc, quy trình, backlog và GitHub theo yêu cầu Task 4.1.

- Tiêu chí chấp nhận: Cấu trúc và tài liệu được quản lý trong Git; Issues có nhãn Sprint; Project có 5 trạng thái và liên kết Issues; PR được review; không mất dữ liệu hoặc lộ bí mật.
- Phụ thuộc: Không

## BL-01

**Xác nhận phạm vi nghiệp vụ BrewLite**

Thu thập yêu cầu sản phẩm vì repository hiện chưa có tài liệu nghiệp vụ.

- Tiêu chí chấp nhận: Có tài liệu mục tiêu, người dùng, phạm vi trong/ngoài và ít nhất một luồng ưu tiên; chủ sản phẩm xác nhận tiêu chí chấp nhận.
- Phụ thuộc: BL-00 cung cấp nơi lưu tài liệu

## BL-02

**Ghi quyết định kiến trúc và công nghệ**

Chọn công nghệ theo yêu cầu đã xác nhận, ghi lý do và cách chạy dự kiến.

- Tiêu chí chấp nhận: Có quyết định được review về frontend/backend, runtime, package manager và lưu trữ nếu cần; xác định vị trí apps/web, apps/api và chiến lược kiểm thử.
- Phụ thuộc: BL-01

## BL-03

**Thiết lập ứng dụng theo kiến trúc được duyệt**

Tạo nền tảng chạy được sau khi chọn stack; không tạo ứng dụng giả ở Task 4.1.

- Tiêu chí chấp nhận: Các ứng dụng cần thiết theo quyết định BL-02 chạy được từ checkout sạch; README có lệnh đúng; mẫu môi trường và ignore khớp mã nguồn; có kiểm tra smoke phù hợp.
- Phụ thuộc: BL-02 và BL-00

## BL-04

**Xác minh tích hợp và thiết lập kiểm tra tự động**

Định nghĩa và kiểm tra tích hợp tối thiểu phù hợp với kiến trúc; tự động hóa các kiểm tra thực tế.

- Tiêu chí chấp nhận: Có hợp đồng tích hợp nếu kiến trúc cần; kiểm tra luồng tối thiểu đã xác nhận; CI chạy các lệnh thực sự tồn tại; ghi kết quả và hướng dẫn tái hiện.
- Phụ thuộc: BL-01, BL-02, BL-03

Xem [Sprint 1](sprint-1.md), [Sprint 2](sprint-2.md) và [Project Board](https://github.com/users/vohuunghiaah/projects/2). Project đã có đủ năm Issues và năm trạng thái. Không chuyển BL-00 sang Done trước khi hoàn tất review. Sau merge PR, cập nhật liên kết backlog trong Issues sang main hoặc permalink commit.
