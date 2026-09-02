#!/usr/bin/env bash
cmd_reboot() {
	bootstrap_full "$@"
	trap_taskbar_clear
	"$0" shutdown
	"$0" background keepalive
	exit $?
}
