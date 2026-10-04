#!/usr/bin/env bash
# Login autostart for background keepalive

register_boot_background() {
	if in_docker; then
		return 0
	fi
	if [ -f "$SUBFOUNT_DIR/.noautoboot" ]; then
		return 0
	fi
	local launcher="$SUBFOUNT_DIR/path/subfount"
	if in_termux; then
		# Termux:Boot 会在开机时执行 ~/.termux/boot/ 下的脚本。
		mkdir -p "$HOME/.termux/boot"
		cat >"$HOME/.termux/boot/subfount" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock 2>/dev/null || true
exec "$launcher" background keepalive
EOF
		chmod +x "$HOME/.termux/boot/subfount"
		return 0
	fi
	case "$OS_TYPE" in
	Linux)
		if command -v crontab >/dev/null 2>&1; then
			# 无图形界面的机器靠 @reboot 拉起；标记注释保证重复注册只留一条。
			local quoted_launcher
			quoted_launcher=$(printf '%s' "$launcher" | sed "s/'/'\\''/g")
			# shellcheck disable=SC2016
			{ crontab -l 2>/dev/null | sed '/# subfount-autostart$/d'; printf "@reboot '%s' background keepalive # subfount-autostart\n" "$quoted_launcher"; } | crontab -
		fi
		mkdir -p "$HOME/.config/autostart"
		local desk="$HOME/.config/autostart/subfount-background.desktop"
		cat >"$desk" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=subfount background
Comment=subfount background keepalive at login
Exec=/bin/bash -l -c "exec '$launcher' background keepalive"
Terminal=false
Categories=Utility;
X-GNOME-Autostart-enabled=true
EOF
		chmod +x "$desk"
		;;
	Darwin)
		local plist="$HOME/Library/LaunchAgents/com.steve02081504.subfount.background.plist"
		mkdir -p "$HOME/Library/LaunchAgents"
		local shell_cmd shell_cmd_esc
		shell_cmd=$(printf "exec '%s' background keepalive" "$launcher")
		shell_cmd_esc=$(printf '%s' "$shell_cmd" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g')
		launchctl bootout "gui/$(id -u)" "$plist" 2>/dev/null || true
		cat >"$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>com.steve02081504.subfount.background</string>
	<key>ProgramArguments</key>
	<array>
		<string>/bin/bash</string>
		<string>-l</string>
		<string>-c</string>
		<string>$shell_cmd_esc</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
</dict>
</plist>
EOF
		if ! launchctl bootstrap "gui/$(id -u)" "$plist"; then
			echo -e "${C_YELLOW}Warning: launchctl bootstrap failed for ${plist}${C_RESET}" >&2
			return 1
		fi
		;;
	esac
}
