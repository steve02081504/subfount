# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** 是一个轻量级客户端，把你的设备接入 [fount](https://github.com/steve02081504/fount) 网络。
它会在你的机器上运行 fount 覆盖层基础设施（`infra`），一旦连接到主机，就会成为一个辅助节点，让主机上聪明伶俐的 agent 可以在你的设备上运行代码或执行 shell 命令。

## 安装与卸除：一场优雅的相遇与告别

<a id="installation"></a>

### 安装：将 subfount 编织入你的世界 – _毫不费力_

以 subfount 开启你的旅程，这是一个稳定可靠的平台。只需几次简单的点击或命令，subfount 的世界便会徐徐展开。

> [!CAUTION]
>
> 在 subfount 的世界里，你所连接的主机可以在你的设备上运行任意代码和 shell 命令，这赋予了它强大的能力。因此，请像在现实生活中结交朋友一样谨慎选择你所信任的主机，以保障本地文件的安全。

### Linux/macOS/Android：Shell 的低语 – _一行命令，即刻启程_

```bash
# 若需要，定义环境变量 $SUBF_DIR 来指定 subfount 目录
# BEGIN SUBF_PKG_MGR
SUBF_PKG_STATE_DIR="${SUBF_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/subfount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$SUBF_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$SUBF_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${SUBF_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; SUBF_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$SUBF_PKG_LOCK_DIR" ] || return 0; rm -rf "$SUBF_PKG_LOCK_DIR"; SUBF_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$SUBF_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${SUBF_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$SUBF_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$SUBF_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$SUBF_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$SUBF_AUTO_INSTALLED_PACKAGES" ]; then SUBF_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else SUBF_AUTO_INSTALLED_PACKAGES="$SUBF_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export SUBF_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END SUBF_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export SUBF_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash
. "$HOME/.profile"
```

若你希望稍作停顿，在盛大冒险之前整理思绪（一次预演）：

```bash
# BEGIN SUBF_PKG_MGR
SUBF_PKG_STATE_DIR="${SUBF_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/subfount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$SUBF_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$SUBF_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${SUBF_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; SUBF_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$SUBF_PKG_LOCK_DIR" ] || return 0; rm -rf "$SUBF_PKG_LOCK_DIR"; SUBF_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$SUBF_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${SUBF_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$SUBF_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$SUBF_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$SUBF_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$SUBF_AUTO_INSTALLED_PACKAGES" ]; then SUBF_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else SUBF_AUTO_INSTALLED_PACKAGES="$SUBF_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export SUBF_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END SUBF_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export SUBF_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash -s init
. "$HOME/.profile"
```

### Windows：殊途同归 – _至简之道_

- **直接且纯粹（推荐）：** 从 [Releases](https://github.com/steve02081504/subfount/releases) 下载 `exe` 文件并运行。

- **PowerShell 的力量：**

  ```powershell
  # 若需要，定义环境变量 $env:SUBF_DIR 来指定 subfount 目录
  irm https://steve02081504.github.io/subfount/install.ps1 | iex
  ```

  若需预演：

  ```powershell
  $scriptContent = Invoke-RestMethod https://steve02081504.github.io/subfount/install.ps1
  Invoke-Expression "function subfountInstaller { $scriptContent }"
  subfountInstaller init
  ```

### Git 安装：为那些偏爱些许魔法的人

如果你已安装 Git，拥抱 subfount 就像运行一个脚本一样简单。

- **对于 Windows：** 打开命令提示符或 PowerShell，只需双击 `run.bat`。
- **对于 Linux/macOS/Android：** 打开终端并执行 `./run.sh`。

### 删除：优雅的告别

```bash
subfount remove
```

## 特性

- **参与 infra** — 加入 fount 覆盖网络，参与数据转发与 mailbox，帮助维护网络健康。
- **主机工作节点** — 连接到主机后成为辅助节点：主机可以向它发送 `run_code`（执行任意脚本）和 `shell_exec`（执行 shell 命令）请求。
- **主机优先帮扶** — 从主机拉取信誉表、信任其节点，并让主机在 infra 帮扶上获得优先。
- **独立或协助** — 未配置主机时作为独立 infra 运行；配置主机后既运行 infra 又协助主机。
- **热更新配置** — 运行中修改 `data/config.json` 无需重启即可生效（守护进程监听该文件）。
- **TUI 面板** — 内置交互式配置面板，可编辑连接设置、切换 infra、启动/停止守护进程。

## 环境要求

- [Deno](https://deno.com)（缺失时由 runner 自动安装）
- Node.js/bun（可选回退）
- PowerShell（Windows）或 bash（Linux/macOS）用于 runner 脚本

## 快速开始

克隆或下载本仓库，然后在仓库根目录运行 runner：

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

不带参数运行会打开配置面板并在后台启动守护进程。

## 用法

主要入口是 runner 脚本（`run`、`run.bat`、`run.cmd`、`run.sh`）以及 `path/` 下的命令启动器（`subfount`、`subfount.bat`、`subfount.ps1`、`subfount.mjs`）。

### 配置面板

```sh
subfount open        # 或：run.sh（不带参数）
```

面板支持：

- 设置**主机房间 ID** 和**密码**（留空则为纯 infra 模式）
- 可选设置主机 **nodeHash**（来自连接码 API）
- 切换**infra 参与**
- 查看守护进程状态（PID、nodeHash、模式、已连接主机）
- **启动** / **停止**守护进程

### 直接运行守护进程

```sh
subfount                                    # 仅 infra（从 data/config.json 读取）
subfount <host-room-id> <password> [node-hash]
    # infra + 主机工作/优先帮扶（一次性，不持久化）
```

### 其他命令

| 命令 | 说明 |
| --- | --- |
| `subfount open` / `subfount panel` | 打开配置面板 |
| `subfount server` | 前台运行守护进程 |
| `subfount background keepalive` | 后台运行守护进程并自动重启 |
| `subfount keepalive` | 带自动重启 / 自动重初始化运行守护进程 |
| `subfount shutdown` | 优雅停止守护进程 |
| `subfount reboot` | 重启守护进程 |
| `subfount version` | 显示版本与 git 信息 |
| `subfount update` | 更新 subfount 与 Deno |
| `subfount clean` | 清理 Deno 缓存 |
| `subfount remove` | 卸载 subfount |
| `subfount debug` | 带调试日志运行 |

## 配置

守护进程读取 `data/config.json`。面板会为你编辑它，你也可以在守护进程运行期间手动编辑（将在下次连接尝试时生效）。

```json
{
	"hostRoomId": null,
	"password": null,
	"hostNodeHash": null,
	"infra": true
}
```

## 状态文件

- `data/daemon.pid` — 守护进程 PID
- `data/status.json` — 守护进程写入的实时状态（供面板只读展示）
- `data/daemon.log` / `data/daemon.err.log` — 守护进程输出日志

## 开发

```sh
deno task start     # 运行守护进程
deno task panel     # 打开面板
deno task test      # 运行测试
deno task lint      # 代码检查
deno task check     # 类型检查
```
