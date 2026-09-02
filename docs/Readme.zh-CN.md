# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** 是一个轻量级客户端，把你的设备接入 [fount](https://github.com/steve02081504/fount) 网络。
它会在你的机器上运行 fount 覆盖层基础设施（`infra`），一旦连接到主机，就会成为一个辅助节点，让主机上聪明伶俐的 agent 可以在你的设备上运行代码或执行 shell 命令。

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
