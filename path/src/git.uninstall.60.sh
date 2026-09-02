#!/usr/bin/env bash
get_i18n 'remove.removing.subfount.fromGitSafeDir'
if command -v git &>/dev/null && git config --global --get-all safe.directory | grep -q -xF "$SUBF_DIR"; then
	git config --global --unset safe.directory "$SUBF_DIR"
fi

set_title "𝓈𝓊"
write_taskbar_progress 45
