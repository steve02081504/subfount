#!/usr/bin/env bash
# First-time dependency install (node_modules via deno install)

subfount_first_install_if_needed() {
	if [[ ! -d "$SUBFOUNT_DIR/node_modules" || "${1:-}" = 'init' ]]; then
		if [ ! -f "$SUBFOUNT_DIR/.noupdate" ]; then
			install_package "git" "git git-core" || true
		fi
		if [[ -d "$SUBFOUNT_DIR/node_modules" ]]; then run shutdown || true; fi
		if [ ! -f "$SUBFOUNT_DIR/.noupdate" ] && [ -d "$SUBFOUNT_DIR/.git" ]; then
			invoke_repo_git pull --rebase --autostash || true
		fi
		write_taskbar_progress 70
		get_i18n 'install.installingDependencies'
		if [ -n "$(deno_pinned_spec)" ]; then
			deno_upgrade
		fi
		run_deno install --allow-scripts --allow-all -c "$SUBFOUNT_DIR/deno.json" --entrypoint "$SUBFOUNT_DIR/src/index.mjs" || true
		write_taskbar_progress 85
		if ! in_container; then
			register_boot_background || true
		fi
		ensure_subfount_path || true
		echo -e "${C_GREEN}======================================================${C_RESET}"
		print_i18n_yellow 'install.untrustedPartsWarning'
		echo -e "${C_GREEN}======================================================${C_RESET}"
		write_taskbar_progress_clear
	fi
}
