# Bối cảnh, Stakeholder và Phạm vi Dự án BrewLite

## 1. Mục đích của tài liệu

Tài liệu mô tả bối cảnh kinh doanh, đối tượng liên quan, phạm vi triển khai và những điều kiện cần xem xét trước khi xây dựng hệ thống BrewLite. Nội dung được lập ra nhằm tạo một nền tảng thống nhất giữa các yêu cầu bài tập, thiết kế hệ thống và kế hoạch phát triển trong các giai đoạn tiếp theo.

Trong phạm vi đồ án, tài liệu này làm cơ sở cho việc phân tích yêu cầu ở Task 1, xây dựng mô hình nghiệp vụ ở Task 2, đề xuất kiến trúc ở Task 3, sau đó chuyển thành sản phẩm và kế hoạch thực hiện ở Task 4 với Task 5. Một số nội dung hiện vẫn mang tính giả định hoặc cần xác nhận với giảng viên hoặc bên đặt hàng. Những nội dung này chưa được xem là quyết định cuối cùng và sẽ được hoàn thiện trong tài liệu đặc tả yêu cầu phần mềm (SRS).

## 2. Bối cảnh và Vấn đề nghiệp vụ

BrewLite là ứng dụng đặt thức uống trực tuyến dành cho một cửa hàng cà phê hoặc trà. Quy trình đặt món của hệ thống được dự kiến diễn ra theo chuỗi: xem thực đơn, lựa chọn tùy chọn, thêm vào giỏ hàng, xác nhận đơn, thanh toán mô phỏng và theo dõi trạng thái đơn hàng.

Ở mô hình truyền thống, việc đặt món chủ yếu diễn ra trực tiếp tại quầy hoặc qua nhiều kênh trao đổi khác nhau. Cách làm này có thể khiến khách hàng khó kiểm tra đầy đủ thông tin món, tùy chọn và tổng tiền trước khi xác nhận. Nhân viên cũng có thể nhận thiếu thông tin hoặc ghi nhận nhầm đơn, nhất là trong giờ cao điểm. Đồng thời, khách hàng không có một kênh thuận tiện để biết đơn vừa được tiếp nhận, đang được pha chế hay đã sẵn sàng.

Hệ thống BrewLite nhằm tập trung quy trình đặt món trên một ứng dụng web, chuẩn hóa dữ liệu đơn hàng và hỗ trợ nhân viên tiếp nhận, xử lý cũng như cập nhật trạng thái. Khách hàng có thể xem menu, chọn size và topping, quản lý giỏ hàng, thanh toán bằng phương thức mô phỏng và theo dõi tiến trình đơn hàng. Nhân viên được hỗ trợ trong việc xem thông tin đơn và cập nhật trạng thái theo quyền truy cập của mình. Mức độ phổ biến của những khó khăn trên tại một cửa hàng cụ thể cần được xác nhận khi nhóm trao đổi với bên đặt hàng hoặc giảng viên.

## 3. Stakeholder

| Stakeholder | Vai trò và mối quan tâm | Mục tiêu, kỳ vọng | Mức độ ảnh hưởng |
|---|---|---|---|
| Khách hàng | Người sử dụng chính để xem thực đơn, tùy chỉnh đồ uống, đặt hàng và thanh toán. | Muốn tìm món nhanh, lựa chọn size hoặc topping rõ ràng, kiểm tra giá và tổng tiền chính xác trước khi thanh toán, đồng thời theo dõi đơn thuận tiện trên thiết bị di động. | Cao, khách hàng trực tiếp tham gia luồng đặt hàng. |
| Nhân viên quầy | Người tiếp nhận và xử lý đơn hàng, chuẩn bị thức uống theo yêu cầu khách hàng. | Cần nhận đầy đủ thông tin món và tùy chọn, cập nhật trạng thái xử lý thông qua API phù hợp để khách hàng có thể theo dõi. Giao diện quản lý dành cho nhân viên nằm ngoài MVP và sẽ xem xét sau. | Cao, nhân viên trực tiếp vận hành quy trình. |
| Quản lý cửa hàng | Người giám sát hoạt động, thực đơn và danh mục sản phẩm của cửa hàng. | Mong muốn tình hình đơn hàng và thông tin menu được cập nhật đúng, nhất quán. Chức năng quản trị menu và báo cáo doanh thu thuộc phạm vi phát triển mở rộng. | Cao, đại diện cho yêu cầu nghiệp vụ và vận hành. |
| Giảng viên và khách hàng nghiệm thu | Người đánh giá chất lượng sản phẩm cùng các tạo phẩm của đồ án. | Cần kiểm tra luồng nghiệp vụ đầu-cuối và đối chiếu sản phẩm với yêu cầu, SRS, use case, mô hình thiết kế, kết quả kiểm thử và tiêu chí chấm điểm. | Cao, có vai trò định hướng và đánh giá mức hoàn thành. |
| Nhóm phát triển | Nhóm phân tích, thiết kế, lập trình, kiểm thử và triển khai hệ thống. | Cần yêu cầu rõ ràng, kiến trúc phù hợp với Next.js, NestJS, PostgreSQL và Docker, đồng thời xây dựng mã nguồn có thể kiểm thử, bảo trì và trình diễn được. | Cao, chịu trách nhiệm thực hiện và bàn giao sản phẩm. |
| Dịch vụ thanh toán mô phỏng | Thành phần mô phỏng thanh toán ví hoặc thẻ trong hệ thống. | Cần trả về trạng thái giao dịch thành công, thất bại hoặc đang xử lý để backend lưu kết quả và cập nhật đơn hàng mà không phát sinh giao dịch tài chính thật. Việc tích hợp Sandbox của nhà cung cấp sẽ được xem xét riêng sau này. | Cao, cần thiết để thực hiện và kiểm thử luồng đặt hàng đầu-cuối. |

## 4. Phạm vi MVP

Phiên bản MVP tập trung vào một luồng đặt thức uống tối thiểu nhưng hoàn chỉnh, từ lúc khách hàng đăng nhập cho đến khi đơn được hoàn tất theo các chức năng sau.

Về tài khoản và xác thực, khách hàng có thể đăng ký, đăng nhập và sử dụng tài khoản để đặt hàng, theo dõi đơn thuộc về mình. Nhân viên cần được xác thực để gọi API có phân quyền. Backend sử dụng JWT cho các API cần bảo vệ, trong khi giao diện quản lý dành riêng cho nhân viên chưa nằm trong MVP.

Về menu, hệ thống hiển thị danh sách thức uống, danh mục và giá cơ bản theo giao diện ưu tiên thiết bị di động. Người dùng có thể xem chi tiết từng món, lựa chọn size, topping, lượng đường hoặc lượng đá phù hợp với từng sản phẩm. Trước khi thêm món vào giỏ, giao diện cần thể hiện rõ phần giá phát sinh từ các tùy chọn đã chọn.

Giỏ hàng cho phép khách hàng xem lại món đã chọn, thêm hoặc xóa sản phẩm, điều chỉnh số lượng và kiểm tra tạm tính cùng tổng thanh toán. Sau khi xác nhận, khách hàng sẽ tạo một đơn hàng gắn với tài khoản của mình và nhận mã hoặc thông tin xác nhận đơn.

Thanh toán được thực hiện thông qua dịch vụ mô phỏng ví hoặc thẻ điện tử do nhóm xây dựng. Hệ thống phải ghi nhận ba trạng thái chính: thành công, thất bại và đang chờ xử lý. Mức độ mô phỏng này chỉ nhằm hỗ trợ trình diễn và kiểm thử, không phát sinh giao dịch tài chính thật.

Backend chịu trách nhiệm tạo và lưu trạng thái đơn. Nhân viên đã xác thực có thể cập nhật đơn theo luồng tối thiểu Received → Preparing → Ready → Completed. Khách hàng đăng nhập có thể xem trạng thái hiện tại của đơn gắn với tài khoản mình. MVP không cung cấp giao diện riêng cho nhân viên; phần giao diện này có thể được xem xét trong phạm vi phát triển tiếp theo.

MVP hướng tới một cửa hàng duy nhất. Phương thức nhận hàng mặc định là nhận tại quầy. Các chính sách xác minh tài khoản, hủy đơn, hết món, chốt giá, thời hạn lưu dữ liệu và quy tắc thanh toán lỗi cần được hoàn thiện trong SRS trước khi triển khai.

## 5. Phạm vi mở rộng

Các chức năng sau đây là định hướng phát triển sau MVP. Nhóm sẽ xem xét chúng khi còn thời gian và nguồn lực, đồng thời phải có sự thống nhất với giảng viên hoặc stakeholder. Danh sách này không được coi là cam kết triển khai trong đồ án hiện tại.

Hệ thống có thể được bổ sung các chức năng quản lý hồ sơ khách hàng nâng cao, xác minh email, quên mật khẩu hoặc khôi phục tài khoản. Lịch sử đơn hàng cũng có thể có thêm bộ lọc thời gian, công cụ xuất PDF/Excel và giao diện dành riêng cho nhân viên quầy. Một trang quản trị có thể hỗ trợ cập nhật menu, giá, topping và tình trạng hết hàng.

Ở mức phát triển rộng hơn, hệ thống có thể quản lý tồn kho nguyên liệu, thống kê doanh thu, hỗ trợ nhiều chi nhánh và phân quyền tài khoản chi tiết. Việc tích hợp dịch vụ giao hàng, chương trình khách hàng thân thiết, điểm thưởng, mã giảm giá hoặc thông báo qua email, SMS và Web Push cũng là các hướng có thể xem xét sau khi MVP hoạt động ổn định. Tuy nhiên, trước khi đưa những nội dung này vào kế hoạch, nhóm cần đánh giá thời gian, nguồn lực và yêu cầu thực tế của người đặt hàng.

## 6. Ngoài phạm vi MVP

Một số nội dung sẽ không được thực hiện trong đồ án hiện tại. Khác với phạm vi mở rộng, đây là các yêu cầu hiện không thuộc định hướng hoặc luồng nghiệp vụ chính của BrewLite trong thời gian tiếp theo.

Hệ thống không nhằm vận hành chuỗi nhiều chi nhánh, quản lý nhượng quyền hoặc tích hợp ERP, CRM, kế toán doanh nghiệp và thiết bị POS tại quầy. BrewLite cũng không tự động điều khiển máy pha chế hoặc kiểm soát định lượng nguyên liệu.

MVP không xử lý giao dịch tài chính thật và không lưu trữ trực tiếp thông tin thẻ hoặc dữ liệu tài chính nhạy cảm. Các quyết định về xử lý thanh toán sẽ tuân thủ nguyên tắc mô phỏng, không yêu cầu tuân thủ PCI-DSS trong môi trường đồ án. Những tính năng nằm ngoài luồng đặt thức uống tối thiểu chỉ có thể được xem xét lại nếu bên đặt hàng đưa ra yêu cầu mới hoặc đề xuất một dự án riêng.

## 7. Giả định ban đầu

Trong giai đoạn MVP, hệ thống được giả định phục vụ một cửa hàng duy nhất. Menu, giá, size và topping được thiết lập trước bằng dữ liệu seed hoặc dữ liệu mẫu. Việc chỉnh sửa thông tin này qua trang quản trị không nằm trong phạm vi hiện tại.

Khách hàng cần đăng ký hoặc đăng nhập để đặt hàng và theo dõi các đơn gắn với tài khoản. Nhân viên phải được xác thực và có quyền phù hợp để gọi API cập nhật trạng thái đơn, dù giao diện dành cho nhân viên chưa được triển khai trong MVP. Phương thức nhận mặc định là nhận tại quầy.

Để mô phỏng thanh toán, hệ thống dự kiến xây dựng dịch vụ ví hoặc thẻ trong NestJS backend. Dịch vụ này chỉ ghi nhận kết quả giao dịch và không thực hiện thanh toán thật. Việc kết nối Sandbox của nhà cung cấp thanh toán chưa được chốt và chỉ được xem xét nếu phát sinh yêu cầu cụ thể.

Khách hàng được giả định truy cập bằng trình duyệt web hiện đại và có kết nối Internet. Các quy tắc về hủy đơn, hết món, chốt giá, trường hợp thanh toán lỗi và thời gian lưu dữ liệu sẽ được xác định trước khi triển khai những chức năng liên quan.

## 8. Ràng buộc

Theo yêu cầu của assignment, frontend sử dụng Next.js theo hướng mobile-first và có thể phát triển theo kiểu PWA. Backend sử dụng NestJS với kiến trúc module, PostgreSQL làm cơ sở dữ liệu quan hệ và schema phải được quản lý bằng migration. Nhóm có thể bổ sung công nghệ hỗ trợ, nhưng không được thay thế các thành phần bắt buộc này.

Dự án cần cung cấp Docker và Docker Compose để khởi chạy môi trường phát triển thống nhất. Repository được tổ chức theo dạng monorepo với các thư mục ứng dụng mục tiêu apps/web, apps/api và thư mục docs, phù hợp cấu trúc đã nêu trong yêu cầu triển khai của nhóm.

Quản lý mã nguồn thực hiện bằng Git. Mỗi thay đổi cần được rà soát thông qua Pull Request, trong khi quy trình CI phải tự động kiểm tra lint, test và build. Việc triển khai production theo yêu cầu assignment cần sử dụng HTTPS.

Việc thanh toán chỉ được thực hiện bằng dịch vụ ví hoặc thẻ mô phỏng. Mã nguồn tuyệt đối không được thực hiện giao dịch tiền thật hoặc lưu trữ thông tin thẻ, tài khoản ngân hàng và dữ liệu nhạy cảm tương tự trong cơ sở dữ liệu. Chuỗi kết nối, khóa API và thông tin xác thực cũng phải được đặt ngoài mã nguồn, còn dữ liệu demo cần được phân biệt với dữ liệu production.

Ưu tiên hàng đầu là hoàn thành và kiểm thử luồng nghiệp vụ MVP trước khi phát triển các tính năng mở rộng.

## 9. Rủi ro ban đầu

Thiết kế mô hình dữ liệu PostgreSQL chưa chắc đã đáp ứng đầy đủ nghiệp vụ. Nếu dữ liệu món, đơn hàng hoặc thanh toán không nhất quán, người dùng có thể gặp sai lệch trong luồng đặt và theo dõi đơn. Rủi ro này được giảm thiểu bằng cách xác định mô hình quan hệ từ yêu cầu và kiểm thử các thao tác đọc, ghi cùng các luồng chính trong môi trường phát triển và CI.

Mock Payment Service có thể không mô phỏng đủ các trạng thái giao dịch. Khi đó, nhóm khó kiểm thử hoặc trình diễn các nhánh thành công, thất bại và đang xử lý trong luồng đầu-cuối. Dịch vụ mô phỏng vì thế cần hỗ trợ đầy đủ ba trạng thái Success, Failed và Pending, đồng thời có kiểm thử cho từng nhánh mà không phụ thuộc vào giao dịch tiền thật.

Các quy tắc chuyển trạng thái đơn hoặc xử lý thanh toán lỗi chưa được chốt cũng có thể dẫn đến dữ liệu không nhất quán. Việc xác định rõ trạng thái, điều kiện chuyển tiếp và quyền thực hiện trong SRS, kết hợp với kiểm thử các trường hợp hợp lệ và không hợp lệ, sẽ giúp giảm nguy cơ này.

Nếu API backend cho đăng nhập, đặt đơn và theo dõi trạng thái chưa được hoàn thiện, đơn hàng có thể không gắn đúng người dùng hoặc trạng thái không được lưu và trả về nhất quán. Nhóm cần đặc tả rõ vai trò khách hàng, cơ chế xác thực và vòng đời đơn, đồng thời kiểm thử tích hợp từ đăng nhập đến truy vấn trạng thái của chính khách hàng.

Dữ liệu menu mẫu cũng có thể khác dữ liệu hoặc quy tắc thực tế, làm giá, tùy chọn hoặc tình trạng món hiển thị không chính xác. Nguồn dữ liệu và quy tắc hiển thị cần được xác nhận, đồng thời demo cần ghi rõ những dữ liệu minh họa được sử dụng.

Cuối cùng, lỗi mạng hoặc việc gửi lại yêu cầu đặt hàng có thể làm khách hàng không biết kết quả hoặc tạo ra đơn thanh toán trùng lặp. Cơ chế idempotency cho tạo đơn và thanh toán, thông báo lỗi rõ ràng cùng kiểm thử retry an toàn là các biện pháp cần được áp dụng để xử lý rủi ro này.

## 10. Các điểm cần xác nhận trước khi chốt SRS

Trước khi chốt tài liệu SRS, nhóm cần xác nhận chính sách tài khoản ngoài đăng ký và đăng nhập cơ bản, cụ thể là việc xác minh email hay hỗ trợ quên và đặt lại mật khẩu có thực sự cần thiết hay không. Các quy tắc chuyển trạng thái đơn cũng cần được làm rõ về điều kiện chuyển tiếp, người có quyền cập nhật và trường hợp thay đổi trái quy trình.

Ngoài ra, nhóm cần thống nhất các kịch bản thất bại của dịch vụ thanh toán mô phỏng để phục vụ kiểm thử và trình diễn, cùng quy tắc hủy đơn và cách xử lý khi món hết hàng. Đối với tùy chọn món, size và topping áp dụng cho từng loại đồ uống cần được xác định, bao gồm cách cộng giá cho từng lựa chọn.

Cuối cùng, danh sách chức năng mở rộng cần được ưu tiên lại nếu dự án còn thời gian và nguồn lực, tránh tình trạng phạm vi phát triển lan rộng ngoài yêu cầu thực tế của đồ án.
