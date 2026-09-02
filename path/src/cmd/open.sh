#!/usr/bin/env bash
cmd_open() {
	require env deno
	shift
	install_deno
	run_deno run --allow-scripts --allow-all "$SUBF_DIR/src/panel.mjs" "$@"
	exit $?
}
