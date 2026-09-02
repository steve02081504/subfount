#!/usr/bin/env bash
cmd_panel() {
	require env deno
	shift
	install_deno
	run_deno run --allow-scripts --allow-all "$SUBF_DIR/src/panel.mjs" "$@"
	exit $?
}
