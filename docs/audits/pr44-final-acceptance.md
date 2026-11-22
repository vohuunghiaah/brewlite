# Nghiệm thu PR #44 sau PR #45 · 23/11/2026

| Hạng mục | Đối chiếu |
|---|---|
| Main và phạm vi diff | Baseline `5fb799132b5e1e637ec76f95cd89eff108daf103`. Nhánh #44 đã hợp nhất baseline. Kiểm tra git diff với main cho apps, scripts, Compose, Postman, SRS, UML, RTM và GAP register. Phần mã ứng dụng và cấu hình triển khai giữ nguyên tree đã nghiệm thu. |
| README và Postman | Dẫn đúng collection/environment đang tracked, guide tạo secret riêng, project brewlite-local, localhost:3001 và prefix production. Tách TX1/TX2, pending/refund replay và C1–C4. |
| Security | Quét PR, các ref được fetch và merge diff. Kiểm tra positive control và ngoại lệ theo fingerprint. [Phương pháp và giới hạn](../security/final-secrets-audit.md). |
| CI | Dùng run phát sinh **sau** đồng bộ main. Điều kiện nghiệm thu nội dung PR là cả bốn job xanh tại đúng HEAD. SHA và run được ghi trong [biên bản PR](https://github.com/vohuunghiaah/brewlite/pull/44). |
| Release notes | Tên và giá của cả 15 sản phẩm trong seed khớp GET public tại lần kiểm tra. Menu trả 200, health trả status=ok và database=up. Loại các mô tả guest checkout, ký giao dịch, vé rung khi READY và tổng test gộp. |
| Triển khai | Run push main [45062000496](https://github.com/vohuunghiaah/brewlite/actions/runs/45062000496) có job deploy Lightsail skipped. Rollout production thành công gần nhất được xác minh là [45049566612](https://github.com/vohuunghiaah/brewlite/actions/runs/45049566612), SHA 4e47d14c. HTTPS health xác nhận dịch vụ tại thời điểm đọc; SHA runtime lấy từ log rollout. |
| Tag dự kiến | v1.0.0. Candidate được chốt bằng SHA trong biên bản PR. Đích tag là merge commit #44 sau khi Project Leader duyệt merge và đối chiếu tree. [Release notes](../releases/v1.0.0.md). |
| Sprint và bàn giao | Backlog hai sprint đã có. Chưa tìm thấy biên bản họp có phản hồi/người tham gia hoặc xác nhận clone/run từ người ngoài nhóm. Đã cung cấp [mẫu review/retro](../handover/sprint-review-retrospective.md) và [phiếu bàn giao](../handover/clean-clone-acceptance.md). |

Phạm vi PR là chất lượng bộ tài liệu, khả năng tái tạo và cổng kiểm tra. Nghiệm thu toàn bộ ASM2 vẫn **PARTIAL**. Việc tổ chức họp, ký nhận độc lập, thu đủ số liệu NFR và phê duyệt phát hành cần bằng chứng sau đó. Video/demo trực tiếp Task 5.4: **EXCLUDED BY USER — REQUIRED BY ORIGINAL ASSIGNMENT**.
