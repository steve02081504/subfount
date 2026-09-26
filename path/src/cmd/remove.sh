#!/usr/bin/env bash

# Warn + confirm before removing, unless `--force` is passed. Detect paths that
# live on an external/shared mount (symlink or VM shared folder) so the user is
# reminded that `rm -rf` will also delete the real machine's copy.
remove_external_target() {
	if [ -L "$SUBFOUNT_DIR" ]; then
		readlink -f "$SUBFOUNT_DIR" 2>/dev/null || printf '%s' "$SUBFOUNT_DIR"
		return 0
	fi
	if command -v findmnt >/dev/null 2>&1; then
		local fstype
		fstype=$(findmnt -T "$SUBFOUNT_DIR" -o FSTYPE -n 2>/dev/null | head -1)
		case "$fstype" in
		vboxsf | vmhgfs | virtiofs | 9p) printf '%s' "$fstype" ; return 0 ;;
		esac
	fi
	return 1
}

cmd_remove() {
	require_mid
	trap_terminal_teardown
	local force=0 arg
	for arg in "$@"; do
		[ "$arg" = "--force" ] && force=1
	done
	if target=$(remove_external_target); then
		print_i18n_red 'remove.externalMountWarning' 'path' "$SUBFOUNT_DIR" 'target' "$target"
	fi
	if [ "$force" != 1 ]; then
		if ! open_controlling_tty; then
			print_i18n_red 'remove.nonInteractiveRequiresForce' 'path' "$SUBFOUNT_DIR" >&2
			exit 1
		fi
		print_i18n_yellow 'remove.confirmPrompt' 'path' "$SUBFOUNT_DIR"
		printf '%s' "$(get_i18n 'remove.yn')"
		local reply
		read -r -n 1 -s reply <&9
		exec 9<&-
		printf '\n'
		case "$reply" in
		y | Y) ;;
		*)
			get_i18n 'remove.aborted'
			exit 1
			;;
		esac
	fi
	source_uninstall_hooks
	get_i18n 'remove.subfountUninstallationComplete'
	exit 0
}
