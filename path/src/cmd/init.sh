#!/usr/bin/env bash
cmd_init() {
	bootstrap_full "$@"
	local exit_code=$?
	write_taskbar_progress_clear
	exit $exit_code
}
