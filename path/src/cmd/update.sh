#!/usr/bin/env bash
cmd_update() {
	require_mid
	if [ -n "${2:-}" ]; then
		subfount_update_to_ref "$2"
	else
		update_subfount_and_deno
	fi
}
