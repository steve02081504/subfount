#!/usr/bin/env bash
# subfount daemon 是否在运行：读取 $SUBFOUNT_DIR/data/daemon.pid，并用 kill -0 验证 pid 存活。
# 等价 pwsh 的 Test-SubfRunning。pid 文件不存在或进程已死时返回 1（调用方按“未运行”处理）。
test_subfount_running() {
	local pid_file="$SUBFOUNT_DIR/data/daemon.pid"
	[ -f "$pid_file" ] || return 1
	local pid
	pid=$(cat "$pid_file" 2>/dev/null) || return 1
	[ -n "$pid" ] || return 1
	kill -0 "$pid" 2>/dev/null
}
