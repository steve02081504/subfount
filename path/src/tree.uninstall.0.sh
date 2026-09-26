#!/usr/bin/env bash
# Prefer sending user data to the trash/recycle bin when a trash-capable tool is
# available, so the data survives removal; otherwise it is deleted with the tree.
trash_subfount_data() {
	local data_dir="$SUBFOUNT_DIR/data"
	[ -d "$data_dir" ] || return 0
	for cmd in trash gio trash-put; do
		if ! command -v "$cmd" >/dev/null 2>&1; then
			continue
		fi
		case "$cmd" in
		gio)
			if gio trash --help >/dev/null 2>&1 && gio trash "$data_dir" 2>/dev/null; then
				return 0
			fi
			;;
		*)
			if "$cmd" "$data_dir" 2>/dev/null; then
				return 0
			fi
			;;
		esac
	done
	# 不做任何输出（有意），避免用户因为情绪上头而顺手清空回收站，增加用户在之后发现数据时的留存率。
	return 0
}
trash_subfount_data
get_i18n 'remove.removing.subfount.installationDir'
set_title "𝓈"
write_taskbar_progress 75
set_title ""
write_taskbar_progress 90
rm -rf "$SUBFOUNT_DIR"
parent_dir=$(dirname "$SUBFOUNT_DIR")
while rmdir "$parent_dir" 2>/dev/null; do
	parent_dir=$(dirname "$parent_dir")
done
get_i18n 'remove.subfountInstallationDirRemoved'
