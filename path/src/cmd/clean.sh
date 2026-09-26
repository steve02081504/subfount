#!/usr/bin/env bash
cmd_clean() {
	bootstrap_full "$@"
	if [ -d "$SUBFOUNT_DIR/node_modules" ]; then
		"$0" shutdown
		if [ "${2:-}" = 'force' ]; then
			find "$SUBFOUNT_DIR" -name "*_cache.json" -type f -delete
		fi
	fi
	rm -rf "$SUBFOUNT_DIR/data/test"
	get_i18n 'clean.cleaningDenoCaches'
	run_deno clean -e "$SUBFOUNT_DIR/src/index.mjs"
	write_taskbar_progress_clear
}
