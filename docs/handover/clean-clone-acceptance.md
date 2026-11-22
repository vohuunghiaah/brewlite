# Bàn giao và nghiệm thu độc lập

**Trạng thái: Chờ người ngoài nhóm thực hiện.** Auditor đã chạy từ clean clone ở cc700d6f; run CI của PR #45 dựng stack với database trống, migration/seed, Chromium và PostgreSQL. [Bằng chứng kỹ thuật](../audits/ASM2-FINAL-ACCEPTANCE-REPORT.md) · [CI](https://github.com/vohuunghiaah/brewlite/actions/runs/45059911560)

## Phiếu thực hiện của người nhận

Người nhận: ______ · Ngày/giờ và múi giờ: ______ · SHA được giao: ______ · OS / Node / Docker Compose: ______

| Việc cần làm trên máy người nhận | Kết quả quan sát và link bằng chứng |
|---|---|
| Clone repository, checkout SHA được giao, ghi kết quả git rev-parse HEAD | |
| Theo [hướng dẫn LOCAL](../testing/postman-local-guide.md), tạo cấu hình riêng và khởi động ba service healthy | |
| Kiểm tra menu, health và products tại localhost | |
| Import collection/environment, chạy một iteration, ghi số request và assertion đạt/lỗi | |
| Chạy test-compose --quality từ [README](../../README.md), ghi run/log và lỗi nếu có | |
| Mở menu và API health trên production qua HTTPS | |
| Dừng LOCAL có bảo toàn dữ liệu | |

Vướng mắc và hướng xử lý: ______

Kết luận của người nhận (đạt / đạt có điều kiện / cần sửa): ______

Người nhận xác nhận: ______ · Đại diện nhóm ghi nhận: ______
