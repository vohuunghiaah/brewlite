# GAP và quyết định · 23/11/2026

| ID | Loại / mức | Yêu cầu, phát hiện và bằng chứng | Trạng thái / quyết định |
|---|---|---|---|
| C1 | C / cao | FR-05 từng nêu UUID và mã nhận món tại PENDING. OrdersService lưu integer id; PaymentsService sinh #BL- ở TX2. | FIXED. Project Leader duyệt giữ hợp đồng thực tế; SRS, UC, A/S đã sửa. |
| C2 | C / cao | FR-07/12 yêu cầu quản lý trạng thái. Có state machine thanh toán, thiếu endpoint/role Barista. | DEFERRED. Project Leader duyệt hoãn pha chế; FR-07 vẫn áp dụng cho thanh toán. |
| C3 | C / vừa | FR-10 Should. Không có Promotion/LoyaltyTransaction trong TypeORM. PDF §4.3 yêu cầu cả hai lớp domain. | DEFERRED. Project Leader duyệt hoãn triển khai; giữ lớp trên sơ đồ và nhãn trạng thái. |
| C4 | C / vừa | FR-11 ghi /order/confirmation. UI mở OrderConfirmation trong /menu; history dùng hash. | FIXED. Project Leader duyệt hợp đồng điều hướng hiện tại. |
| A1 | A / cao | UI xem mọi success=false là PAYMENT_FAILED, xóa key cả khi gateway còn PENDING. | FIXED. MenuPage giữ trạng thái và key khi đang đối soát; regression test gửi hai lần cùng khóa. Khi replay trả REFUNDED qua HTTP 201, UI cũng hiển thị hoàn tiền và đơn CANCELLED như trường hợp 409. |
| B1 | B / vừa | TX1, HTTP 400/201, key lookup, order detail, domain và deployment khác sơ đồ cũ. | FIXED các nhóm sai khác trong [đối chiếu](asm2-cross-layer-consistency.md); render lại nguồn. |
| B2 | B / vừa | 9 đường dẫn local trong report Task 5.3 thừa một cấp ../. | FIXED. Sửa đích tương đối. |
| A2 | A / vừa | 27.646 dependency files được Git theo dõi mặc dù đã có lockfile và npm ci; 16 file Nest starter không có caller. | FIXED trên audit branch. CI build cả hai app từ lockfile. |
| D1 | D / cao | NFR-01,03,05,07 thiếu benchmark theo profile, Lighthouse/cross-browser, thời gian cold boot và chuỗi uptime bảy ngày. | BLOCKED các tiêu chí thiếu bằng chứng; chủ sở hữu QA/operations. |
| D2 | D / cao | PDF §7.4 yêu cầu tag/release, review, retrospective và bàn giao. Chưa có Git tag/GitHub Release. PR #44 chứa release notes đề xuất. | BLOCKED release chờ Project Leader; review/retro và nghiệm thu độc lập chờ nhóm cung cấp biên bản thực. |
| D3 | D / vừa | Không có snapshot firewall/live container digest riêng tại thời điểm audit; cấu hình không publish DB. | BLOCKED xác minh trực tiếp host. Có log rollout và public probe. |
| D4 | D / vừa | Chưa có bằng chứng rà toàn bộ log CI từ mọi run. | BLOCKED phần lịch sử log; scan repo và PR #44 là bằng chứng riêng. |
| D5 | D / vừa | §7.4 video/live demo. | EXCLUDED BY USER — REQUIRED BY ORIGINAL ASSIGNMENT. Chỉ giảng viên có thể miễn yêu cầu gốc. |
| G5 | B / vừa | POST /orders thiếu idempotency. Sau COMMIT TX1 nhưng mất 201, client cần tra lịch sử trước khi tạo lại. | OPEN giới hạn đã ghi trong SRS GAP-05; PDF bắt buộc idempotency ở thanh toán. |
| D6 | D / vừa | Giao thức phục hồi chi tiết có nhiều nhánh mất ACK/COMMIT; chưa có fault injection cho từng nhánh. | OPEN bằng chứng bổ sung. PostgreSQL concurrency và restart đã kiểm thử. |

Phê duyệt riêng từ Project Leader cho 34 remote branch dòng Candidate trong baseline và sáu container rehearsal/PR38. Đã xóa đúng danh sách. Giữ toàn bộ local branch, image và volume cũ.
