#!/usr/bin/env bash
# require: idempotent module loader
# Assumes SUBFOUNT_SRC is set to "$SUBFOUNT_DIR/path/src" by the entry script.
require() {
	local moduleName path marker
	for moduleName in "$@"; do
		marker=$(printf '%s' "$moduleName" | tr '/.-' '___')
		eval "[ \"\${SUBFOUNT_LOADED_${marker}:-}\" = 1 ]" && continue
		path="$SUBFOUNT_SRC/${moduleName}.sh"
		if [ ! -f "$path" ]; then
			echo "require: missing $path" >&2
			return 1
		fi
		# shellcheck disable=SC1090
		. "$path"
		eval "SUBFOUNT_LOADED_${marker}=1"
	done
}

# Runtime modules: git, update, fs, run, debug, boot, deno, first_install, … (no first-install pass)
require_mid() {
	require unix/sed git update fs run debug boot deno first_install
	install_deno
}

bootstrap_full() {
	require_mid
	subfount_first_install_if_needed "$@"
}

bootstrap_server() {
	bootstrap_full "$@"
	assert_dir_writable "$SUBFOUNT_DIR"
	update_subfount_and_deno_background
	run_deno -V
}

# Source uninstall hooks under SUBFOUNT_SRC, highest level first
source_uninstall_hooks() {
	local hook level
	while IFS= read -r hook; do
		# shellcheck disable=SC1090
		. "$hook"
	done < <(
		find "$SUBFOUNT_SRC" -name '*.uninstall.*.sh' -print0 2>/dev/null |
			while IFS= read -r -d '' hookPath; do
				level=$(basename "$hookPath")
				level=${level##*.uninstall.}
				level=${level%.sh}
				printf '%s\t%s\n' "$level" "$hookPath"
			done | sort -t "$(printf '\t')" -k1,1nr -k2,2 | cut -f2-
	)
}
