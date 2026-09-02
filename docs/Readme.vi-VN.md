# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** là một máy khách nhẹ kết nối thiết bị của bạn với mạng [fount](https://github.com/steve02081504/fount).
Nó chạy hạ tầng lớp phủ (`infra`) của fount trên máy của bạn và, khi đã kết nối với máy chủ, sẽ trở thành một nút trợ giúp cho phép các tác nhân thông minh của máy chủ chạy mã hoặc thực thi lệnh shell trên thiết bị của bạn.

## Tính năng

- **Tham gia infra** — tham gia mạng lớp phủ fount và tham gia chuyển tiếp gói tin cùng hòm thư, giúp giữ cho mạng hoạt động ổn định.
- **Nút công việc của máy chủ** — sau khi kết nối với máy chủ, trở thành nút trợ giúp: máy chủ có thể gửi yêu cầu `run_code` (chạy tập lệnh bất kỳ) và `shell_exec` (thực thi lệnh shell).
- **Hỗ trợ ưu tiên máy chủ** — kéo bảng uy tín từ máy chủ, tin cậy các nút của nó và dành ưu tiên cho máy chủ trong hỗ trợ infra.
- **Độc lập hoặc được hỗ trợ** — nếu không có máy chủ được cấu hình, chạy như infra độc lập; nếu có máy chủ, vừa chạy infra vừa hỗ trợ máy chủ.
- **Cấu hình nóng** — chỉnh sửa `data/config.json` khi đang chạy sẽ có hiệu lực mà không cần khởi động lại (daemon theo dõi tệp).
- **Bảng TUI** — bảng cấu hình tương tác tích hợp để chỉnh cài đặt kết nối, bật/tắt infra và khởi động/dừng daemon.

## Yêu cầu

- [Deno](https://deno.com) (được runner tự động cài nếu thiếu)
- Node.js/bun (phương án dự phòng tùy chọn)
- PowerShell (Windows) hoặc bash (Linux/macOS) cho các tập lệnh runner

## Bắt đầu nhanh

Nhân bản hoặc tải xuống kho lưu trữ này, rồi chạy runner ở thư mục gốc của kho:

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

Chạy không có đối số sẽ mở bảng cấu hình và khởi động daemon ở chế độ nền.

## Sử dụng

Điểm vào chính là các tập lệnh runner (`run`, `run.bat`, `run.cmd`, `run.sh`) và bộ khởi chạy lệnh trong `path/` (`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`).

### Bảng cấu hình

```sh
subfount open        # hoặc: run.sh (không đối số)
```

Bảng cho phép bạn:

- Đặt **ID phòng của máy chủ** và **mật khẩu** (để trống cho chế độ chỉ infra)
- Tùy chọn đặt **nodeHash** của máy chủ (từ API mã kết nối)
- Bật/tắt **tham gia infra**
- Xem trạng thái daemon (PID, nodeHash, chế độ, máy chủ đã kết nối)
- **Khởi động** / **dừng** daemon

### Chạy daemon trực tiếp

```sh
subfount                                    # chỉ infra (từ data/config.json)
subfount <host-room-id> <password> [node-hash]
    # infra + nút công việc máy chủ / hỗ trợ ưu tiên (một lần, không lưu trữ)
```

### Các lệnh khác

| Lệnh | Mô tả |
| --- | --- |
| `subfount open` / `subfount panel` | Mở bảng cấu hình |
| `subfount server` | Chạy daemon ở tiền cảnh |
| `subfount background keepalive` | Chạy daemon ở nền với tự động khởi động lại |
| `subfount keepalive` | Chạy daemon với tự động khởi động lại / tự khởi tạo lại |
| `subfount shutdown` | Dừng daemon một cách gọn gàng |
| `subfount reboot` | Khởi động lại daemon |
| `subfount version` | Hiển thị phiên bản và thông tin git |
| `subfount update` | Cập nhật subfount và Deno |
| `subfount clean` | Dọn bộ nhớ đệm của Deno |
| `subfount remove` | Gỡ cài đặt subfount |
| `subfount debug` | Chạy với nhật ký gỡ lỗi |

## Cấu hình

Daemon đọc `data/config.json`. Bảng cấu hình sẽ chỉnh sửa cho bạn và bạn cũng có thể chỉnh sửa thủ công khi daemon đang chạy (áp dụng ở lần thử kết nối tiếp theo).

```json
{
	"hostRoomId": null,
	"password": null,
	"hostNodeHash": null,
	"infra": true
}
```

## Tệp trạng thái

- `data/daemon.pid` — PID của daemon
- `data/status.json` — trạng thái trực tiếp do daemon ghi (cho chế độ xem chỉ đọc của bảng)
- `data/daemon.log` / `data/daemon.err.log` — nhật ký đầu ra của daemon

## Phát triển

```sh
deno task start     # chạy daemon
deno task panel     # mở bảng
deno task test      # chạy kiểm thử
deno task lint      # lint
deno task check     # kiểm tra kiểu
```
