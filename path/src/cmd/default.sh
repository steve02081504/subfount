#!/usr/bin/env bash
cmd_default() {
	bootstrap_full "$@"
	trap_terminal_teardown
	if [ "$1" ]; then
		run "$@"
		exit $?
	elif in_container; then
		"$0" keepalive "$@"
		exit $?
	fi
	# 守护进程未运行时先拉起（后台 keepalive），随后打开配置面板。
	require unix/ipc
	if ! test_subfount_running; then
		write_taskbar_progress 25
		"$0" background keepalive "$@"
		write_taskbar_progress
	fi
	"$0" open
	exit $?
}
