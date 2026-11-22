# BrewLite — đăng ký tên miền miễn phí

Ngày 22/11/2026 (giờ Việt Nam). **DuckDNS đã cấp `brewlite-swe.duckdns.org`. Trạng thái đăng ký REGISTERED, DNS ACTIVE, HTTPS trên tên mới BLOCKED trước Stage 1.** Trang quản trị xác nhận tên thuộc tài khoản và đã lưu IPv4. Chi phí đăng ký 0, dịch vụ hiện miễn phí, không có kỳ gia hạn thu tiền được công bố. Không phát sinh giao dịch thanh toán. [DuckDNS](https://www.duckdns.org/) · [FAQ](https://www.duckdns.org/faqs.jsp)

![DuckDNS xác nhận cập nhật hostname về IPv4 Lightsail](brewlite-swe-duckdns.jpg)

## Nhà cung cấp và quyền kiểm soát

| Ưu tiên | Kết quả | Đăng ký, DNS và duy trì |
|---|---|---|
| 1 · `brewlite-swe.eu.org` | **BLOCKED**. Trang quản trị yêu cầu handle và mật khẩu. Chưa có phiên quản trị DNS cho zone, chưa gửi đơn, chưa có mã xét duyệt. | EU.org miễn phí và chỉ ủy quyền NS cho tên trực tiếp. Chủ dự án cần xác thực email liên hệ (form cảnh báo Gmail có thể chặn thư), chuẩn bị DNS hosting miễn phí, rồi nộp đơn trên web. Registry xét duyệt thủ công. Chưa thấy lịch tái xác nhận hay phí gia hạn trong chính sách đã đọc. [Đăng ký](https://nic.eu.org/register.html) · [Chính sách](https://nic.eu.org/top-policy.html) · [Xác thực liên hệ](https://nic.eu.org/arf/en/contact/create/) |
| 2 · `brewlite-swe.duckdns.org` | **REGISTERED / ACTIVE (DNS)**. Sau khi chủ dự án đăng nhập, dashboard xác nhận thêm tên và bộ đếm chuyển từ 0/5 lên 1/5. | Đăng nhập qua nhà cung cấp danh tính. Dashboard tạo tên. API có token hỗ trợ cập nhật IPv4 và TXT. Tài liệu đề cập cập nhật DDNS định kỳ khi dùng IP động. Chưa thấy quy định xác nhận hàng tháng. Dịch vụ có quyền đình chỉ theo điều khoản. [API](https://www.duckdns.org/spec.jsp) · [DDNS](https://www.duckdns.org/why.jsp) · [Điều khoản](https://www.duckdns.org/tac.jsp) |
| 3 · `brewlite-swe.dynv6.net` | Dự phòng. Đã truy cập dịch vụ, dừng trước tạo zone vì DuckDNS đã cấp đúng tên. Khả năng cấp nhãn cụ thể chưa được xác minh. | Tài khoản email có xác nhận. Web và SSH hỗ trợ hostname, API cập nhật A. Nhà cung cấp dùng ví dụ `.dynv6.net`. Miễn phí, yêu cầu xác nhận lại email hằng năm và có thể xóa tài khoản không hoạt động, kể cả IP ít thay đổi. [API](https://dynv6.com/docs/apis) · [Điều khoản](https://dynv6.com/terms) · [Duy trì tài khoản](https://dynv6.com/data-privacy) |

Cả ba phương án có thể dùng Caddy và Let's Encrypt khi A trỏ đúng, 80/443 tiếp cận được và Caddy phục vụ hostname. Với EU.org, A thuộc zone do chủ dự án quản lý. Trạng thái **AVAILABLE** cần xác nhận từ nhà cung cấp. **PENDING APPROVAL** chỉ áp dụng sau khi có biên nhận. Các lần tra cứu NXDOMAIN trước đăng ký không xác lập hai trạng thái này. [Caddy Automatic HTTPS](https://caddyserver.com/docs/automatic-https)

## DNS và HTTPS đã đo

| Kiểm tra | Kết quả ngày 22/11 |
|---|---|
| A tại authoritative | `dig` từ Lightsail đến cả 9 máy chủ `ns1`–`ns9.duckdns.org` đều trả `54.255.241.1`, TTL 60 giây. |
| Resolver công cộng | `nslookup` từ Windows và `dig` từ Lightsail qua Cloudflare `1.1.1.1`, Google `8.8.8.8` cùng trả IPv4 trên. |
| IPv6 | Truy vấn AAAA tại `ns9.duckdns.org` trả NOERROR, 0 answer. Chỉ cập nhật IPv4. |
| HTTP / HTTPS mới | HTTP đến `54.255.241.1` trả 308. HTTPS cho SNI `brewlite-swe.duckdns.org` chưa bắt tay TLS thành công. URL mục tiêu sau Stage 1 là `https://brewlite-swe.duckdns.org`. |
| Phương thức cập nhật | Đã ghi IPv4 bằng dashboard chính thức. Kiểm soát thực thi đã chặn lệnh dùng token để xác nhận thêm qua API. Đã xóa vật liệu mã hóa tạm. Chưa cài tác vụ cập nhật tự động hay lưu token lâu dài. |
| EU.org, dynv6 | Trước lúc đăng ký DuckDNS, `dig +norecurse` trả NXDOMAIN với cờ AA từ `dns.elm.net` và `ns1.dynv6.com` cho hai tên dự phòng tương ứng. |

## Lightsail và release đang phục vụ

SSH dùng host key ED25519 đã ghim trong lần nghiệm thu trước. Lúc 20:54 giờ Việt Nam, metadata của instance trả AZ `ap-southeast-1a` và IPv4 `54.255.241.1`. Máy chạy Ubuntu 24.04.5 LTS. Biên bản console ngày 20/11 xác định tên instance `brewlite-production`, IPv4 động chưa gắn Static IP. Phiên AWS console hiện yêu cầu đăng nhập nên tình trạng gắn IP và toàn bộ firewall rule hôm nay chưa được đọc lại qua AWS. TCP 80 và 443 đều tiếp cận được từ bên ngoài, Docker chỉ publish hai cổng TCP đó cho stack. [Bằng chứng console gần nhất](production-verification-report.md) · [Lightsail Networking](https://ap-southeast-1.console.aws.amazon.com/lightsail/webapp/ap-southeast-1/instances/brewlite-production/networking)

| Dịch vụ | Bằng chứng runtime |
|---|---|
| Caddy | v2.11.9, container đang chạy, phục vụ HTTPS cho hai tên cũ. |
| Next.js | Container healthy. Digest `sha256:b7897885b00514cc013957afd272ac11ac7c019e21ef7ab2ff5018148003db59`. |
| NestJS | Container healthy. Digest `sha256:ed463cdf24f5507886707ceda9c89a489a68b3dd48c3658b97189059c813cf94`. |
| PostgreSQL | 16.16, container healthy, `pg_isready` trả accepting connections. |
| Backup | `db-backup-2026-11-22T09-44-29-761Z.sql`, 17.675 byte, mode 0600, có footer hoàn tất của pg_dump. SHA-256 `eaf7bb910a20255068f87a12c7aa742f62b67474d8f2f910cf6cf2ddc8a9045e`. Chưa thử restore riêng bản dump này. [Lần thử restore ngày 21/11](final-production-acceptance-2026-11-21.md) |

Hai digest từ image ID của container khớp manifest GHCR theo tag commit `8f616ce8707e0c6050883e8705d260790ee0e05d` và bằng chứng của lần deploy. [Job production](https://github.com/vohuunghiaah/brewlite/actions/runs/45007943166/job/137165507776) · [CI của release](https://github.com/vohuunghiaah/brewlite/actions/runs/45004996693)

**Chuyển Static IP cần phê duyệt riêng.** Trong giai đoạn tạm có thể dùng A hiện tại với TTL 60 giây, so lại public IPv4 sau stop/start và cập nhật DuckDNS bằng tài khoản chủ dự án. Nếu cần tự động hóa, quản lý token ở kho bí mật chỉ cấp cho trình cập nhật. Khi gắn Static IP khác, hai tên sslip.io mã hóa IP cũ sẽ tiếp tục phân giải về IP cũ. Lên lịch cửa sổ bảo trì, xác nhận IP mới và fingerprint qua console, cập nhật DuckDNS A, `LIGHTSAIL_HOST`, `LIGHTSAIL_SSH_KNOWN_HOSTS` và các alias phù hợp, rồi kiểm tra SSH/TLS. Việc gắn IP chưa được thực hiện. [Hướng dẫn AWS](https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-create-static-ip.html)

## Hai tên miền cũ

| Hostname | HTTP và TLS | GET qua Caddy |
|---|---|---|
| `brewlite.54-255-241-1.sslip.io` | 308 về HTTPS cùng host. Chứng chỉ Let's Encrypt có hiệu lực đến 18/02/2027. | `/`, `/menu`, `/api/health`, `/api/products` đều 200. |
| `swe-brewlite.54-255-241-1.sslip.io` | 308 về HTTPS cùng host. Chứng chỉ Let's Encrypt có hiệu lực đến 18/02/2027. | Bốn endpoint trên đều 200. |

Đã chạy `scripts/smoke-test.mjs` với `TARGET_ENV=production` riêng cho cả hai host. Cả hai đạt 4/4, health trả `status=ok`, `database=up`, catalog có 4 sản phẩm. Chưa chạy nghiệm thu giỏ hàng, đăng nhập, lịch sử đơn, nhãn QR mô phỏng và responsive qua tên mới vì chưa có HTTPS. Ảnh UI ứng dụng của lần kiểm tra trước có trong [bộ ảnh desktop và mobile](../ui/restoration-evidence/).

## Cấu hình hai giai đoạn và cổng phê duyệt

| Giá trị | Stage 1 — thêm alias | Stage 2 — sau nghiệm thu |
|---|---|---|
| GitHub `production.DOMAIN` | `brewlite.54-255-241-1.sslip.io` | `brewlite-swe.duckdns.org` |
| GitHub `production.CADDY_HOSTS` | `brewlite.54-255-241-1.sslip.io, swe-brewlite.54-255-241-1.sslip.io, brewlite-swe.duckdns.org` | Giữ đủ ba giá trị của Stage 1. |
| NestJS `FRONTEND_URL` và đích smoke | `https://brewlite.54-255-241-1.sslip.io` | `https://brewlite-swe.duckdns.org` |
| GitHub `production.ACME_EMAIL` | Chờ chủ dự án xác nhận một hộp thư đang quản lý. Caddy hiện lấy mặc định `admin@brewlite.vn`. | Dùng hộp thư đã xác nhận. |

**Đã thực hiện Stage 1 tại nguồn cấu hình:** đã ghi và đọc lại danh sách ba tên trong GitHub Environment sau khi DNS hội tụ. Máy chủ vẫn dùng cấu hình của release hiện tại. Compose tự suy `FRONTEND_URL` từ `DOMAIN`, smoke cũng lấy `DOMAIN`. Frontend gọi `/api` cùng origin nên giữ được các alias mà không cần mở rộng CORS, đổi routes hay chuyển hướng giữa các hostname.

PR sửa [deploy.yml](../../.github/workflows/deploy.yml) để chuyển `ACME_EMAIL` vào file môi trường qua serializer hiện có, từ chối email trống/sai định dạng và chạy `caddy validate` trước SSH. Các file còn lại là [hướng dẫn GitHub Environment](github-environment-setup.md), báo cáo này và ảnh xác nhận DuckDNS. Đã kiểm tra serializer thật, các trường hợp email, Compose của hai giai đoạn và `caddy validate` trong container cô lập với hai alias cũ cùng từng hostname ứng viên. `npm audit --omit=dev` của API, Web và scripts báo 0 lỗ hổng trong lần chạy. [PR #42](https://github.com/vohuunghiaah/brewlite/pull/42) · [CI cho thay đổi workflow](https://github.com/vohuunghiaah/brewlite/actions/runs/45030148541) · [Kiểm tra mới nhất của PR](https://github.com/vohuunghiaah/brewlite/pull/42/checks)

**Việc tiếp theo theo thứ tự**

1. Chủ dự án xác nhận hộp thư ACME. Đặt vào Environment `production`. Người có quyền review và merge PR sau CI. GitHub hiện giới hạn nhánh deploy `main` và cấu hình một Required Reviewer.
2. Khi commit đã có trên `main`, xác nhận lại A và AAAA, hai hostname cũ, backup, hai image rollback và cấu hình ba host. Dispatch `deploy.yml` với `target_env=production`, `confirm_production=DEPLOY_PRODUCTION`. Dừng ở **WAITING FOR REVIEW** cho reviewer phê duyệt. Chưa dispatch lần deploy tên miền nào.
3. Sau approval, đối chiếu digest mới và backup của đúng run, kiểm tra chứng chỉ khớp tên mới, chạy smoke riêng từng host. Trên tên mới, kiểm tra homepage, menu, cart, đăng nhập và lịch sử bằng tài khoản thử, QR có nhãn mô phỏng, desktop/mobile. Chỉ promote khi toàn bộ đạt. Kiểm tra lại ba host sau deployment Stage 2.
4. Để tiếp tục EU.org, chủ dự án cung cấp phiên đăng nhập EU.org với liên hệ đã xác thực và quyền quản trị DNS hosting miễn phí. Tạo zone `brewlite-swe.eu.org`, khai báo A tại apex, lấy NS thực từ nhà cung cấp. Đối chiếu SOA, NS và A trực tiếp tại từng NS trước khi nộp đơn. Lưu mã hồ sơ, chờ delegation và phân giải công khai trước khi thêm alias EU.org.

**Rollback tên miền.** Trước khi deploy Stage 1, có thể hoàn tác việc chuẩn bị bằng cách trả `production.CADDY_HOSTS` về `brewlite.54-255-241-1.sslip.io, swe-brewlite.54-255-241-1.sslip.io`. Sau Stage 2, nếu cần quay lui, đặt `DOMAIN=brewlite.54-255-241-1.sslip.io` ở GitHub, giữ các alias còn phục vụ được và deploy qua cùng approval gate. Chạy smoke trên từng hostname. Rollback image là bước riêng. Tại lần audit, `.deployment-state.json` và Docker đều có API `sha256:58123642d2498d27741624daf1b3901a9f9ea13b873c41d163c855930e1e27dc` cùng Web `sha256:73b59f8c07f0af6339373c6dbb1bcd5acae97df96529d790cb9bc174cde60095` của bản trước. Dùng cặp digest được ghi ngay trước lần rollout cần đảo. Đổi hostname không đòi phục hồi PostgreSQL. [Runbook rollback](rollback-guide.md)
