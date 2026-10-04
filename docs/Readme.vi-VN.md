# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** là một máy khách nhẹ kết nối thiết bị của bạn với mạng [fount](https://github.com/steve02081504/fount).
Nó chạy hạ tầng lớp phủ (`infra`) của fount trên máy của bạn và, khi đã kết nối với máy chủ, sẽ trở thành một nút trợ giúp cho phép các tác nhân thông minh của máy chủ chạy mã hoặc thực thi lệnh shell trên thiết bị của bạn.

## Cài đặt và Gỡ bỏ: Một cuộc gặp gỡ và chia tay thanh lịch

<a id="installation"></a>

### Cài đặt: Dệt subfount vào thế giới của bạn – _Thật nhẹ nhàng_

Hãy bắt đầu hành trình của bạn với subfount, một nền tảng ổn định và đáng tin cậy. Chỉ với vài cú nhấp chuột hoặc lệnh đơn giản, thế giới của subfount sẽ từ từ mở ra.

> [!CAUTION]
>
> Trong thế giới subfount, host bạn kết nối có thể chạy mã tùy ý và lệnh shell trên thiết bị của bạn, mang lại cho nó khả năng mạnh mẽ. Vì vậy, chỉ kết nối với những host bạn tin tưởng, cẩn thận như khi kết bạn ngoài đời, để đảm bảo an toàn cho các tệp cục bộ của bạn.

### Linux/macOS/Android: Lời thì thầm của Shell – _Một dòng lệnh, và bạn đã sẵn sàng_

```bash
# Nếu cần, hãy định nghĩa biến môi trường $SUBFOUNT_DIR để chỉ định thư mục subfount
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash
. "$HOME/.profile"
```

Nếu bạn muốn tạm dừng (chạy thử):

```bash
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash -s init
. "$HOME/.profile"
```

### Windows: Lựa chọn con đường – _Đơn giản là chính nó_

- **Trực tiếp và không phức tạp (Khuyến nghị):** Tải tệp `.exe` từ [Releases](https://github.com/steve02081504/subfount/releases) và chạy nó.

- **Sức mạnh của PowerShell:**

  ```powershell
  # Nếu cần, hãy định nghĩa biến môi trường $env:SUBFOUNT_DIR để chỉ định thư mục subfount
  irm https://steve02081504.github.io/subfount/install.ps1 | iex
  ```

  Để chạy thử:

  ```powershell
  $scriptContent = Invoke-RestMethod https://steve02081504.github.io/subfount/install.ps1
  Invoke-Expression "function subfountInstaller { $scriptContent }"
  subfountInstaller init
  ```

### Cài đặt Git: Dành cho những ai yêu thích một chút phép thuật

Nếu bạn đã cài đặt Git, việc đón nhận subfount cũng đơn giản như chạy một tập lệnh.

- **Đối với Windows:** Mở Command Prompt hoặc PowerShell của bạn và chỉ cần nhấp đúp vào `run.bat`.
- **Đối với Linux/macOS/Android:** Mở terminal của bạn và thực thi `./run.sh`.

### Gỡ bỏ: Một lời từ biệt thanh lịch

```bash
subfount remove
```

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

Chạy không có đối số sẽ khởi động daemon ở chế độ nền với tự động khởi động lại. Mở bảng cấu hình bằng `subfount open` (hoặc thêm `open` sau `run.sh`) để thiết lập máy chủ.

## Sử dụng

Điểm vào chính là các tập lệnh runner (`run`, `run.bat`, `run.cmd`, `run.sh`) và bộ khởi chạy lệnh trong `path/` (`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`).

### Bảng cấu hình

```sh
subfount open        # hoặc: run.sh open
```

Bảng cho phép bạn:

- Đặt **ID phòng của máy chủ** và **mật khẩu** (để trống cho chế độ chỉ infra)
- Tùy chọn đặt **nodeHash** của máy chủ (từ API mã kết nối)
- Bật/tắt **tham gia infra** (chuyển tiếp khi chưa cấu hình máy chủ nào; chính sách của máy chủ đã kết nối được ưu tiên)
- Xem trạng thái daemon (PID, nodeHash, chế độ, máy chủ đã kết nối)
- **Khởi động** / **dừng** daemon

### Chạy daemon trực tiếp

```sh
subfount                                    # chỉ infra (từ data/config.json)
subfount <host-room-id> <password> [node-hash]
    # infra + nút công việc máy chủ / hỗ trợ ưu tiên (ghi một máy chủ lâu dài; các máy chủ khác vẫn kết nối)
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

Daemon đọc `data/config.json`. Bảng cấu hình sẽ chỉnh sửa cho bạn và bạn cũng có thể chỉnh sửa thủ công khi daemon đang chạy: daemon theo dõi tệp và áp dụng thay đổi trong vài giây, không cần khởi động lại. Mỗi mục trong `hosts` là một phiên máy chủ độc lập; `infra` chỉ quyết định liệu daemon có tiếp tục chuyển tiếp khi chưa cấu hình máy chủ nào hay không (chính sách của máy chủ đã kết nối được ưu tiên).

```json
{
	"hosts": [
		{ "hostRoomId": "<host-room-id>", "password": "<password>", "hostNodeHash": "<node-hash>" }
	],
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
