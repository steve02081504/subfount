#!/usr/bin/env bash
cmd_shutdown() {
	require i18n terminal
	trap_taskbar_clear
	local pid_file="$SUBFOUNT_DIR/data/daemon.pid"
	local stop_file="$SUBFOUNT_DIR/data/stop.request"
	local pid i
	pid=$(cat "$pid_file" 2>/dev/null)
	if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
		get_i18n 'shutdown.stoppingDaemon'
		mkdir -p "$(dirname "$stop_file")"
		touch "$stop_file"
		i=0
		while kill -0 "$pid" 2>/dev/null && [ "$i" -lt 100 ]; do
			sleep 0.1
			i=$((i + 1))
		done
		kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
	fi
	rm -f "$pid_file" "$stop_file"
	get_i18n 'shutdown.complete'
}
