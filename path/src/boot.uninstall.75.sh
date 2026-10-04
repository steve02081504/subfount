#!/usr/bin/env bash
if in_termux; then
	rm -f "$HOME/.termux/boot/subfount"
fi
case "$OS_TYPE" in
Linux)
	if command -v crontab >/dev/null 2>&1; then
		# shellcheck disable=SC2016
		(crontab -l 2>/dev/null | sed '/# subfount-autostart$/d') | crontab -
	fi
	rm -f "$HOME/.config/autostart/subfount-background.desktop"
	;;
Darwin)
	plist="$HOME/Library/LaunchAgents/com.steve02081504.subfount.background.plist"
	if [ -f "$plist" ]; then
		launchctl bootout "gui/$(id -u)" "$plist" 2>/dev/null || true
		rm -f "$plist"
	fi
	;;
esac
