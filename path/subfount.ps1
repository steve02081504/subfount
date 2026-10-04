#!/usr/bin/env pwsh
echo " \`" > /dev/null # " | Out-Null <#
SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)
exec "$(command -v sh || echo /bin/sh)" "$SCRIPT_DIR/subfount" "$@"
exit $?
: << '__END_HEREDOC__'
#>
$SUBFOUNT_DIR = Split-Path -Parent $PSScriptRoot
# 首次安装（没有 data/config.json）先解除 .ps1 的 MOTW，否则脚本会被拦截。
if (-not (Test-Path -LiteralPath "$SUBFOUNT_DIR/data/config.json")) {
	Get-ChildItem -Path $PSScriptRoot -Recurse -File -Filter '*.ps1' | Unblock-File -ErrorAction SilentlyContinue
}
# Git 不保存隐藏/系统属性，克隆与更新后桌面图标会失效，此处按属性状态补回。
$desktopIni = Get-Item -LiteralPath "$SUBFOUNT_DIR/desktop.ini" -Force -ErrorAction Ignore
$desktopIniFlags = [IO.FileAttributes]::Hidden -bor [IO.FileAttributes]::System
if (($desktopIni.Attributes -band $desktopIniFlags) -ne $desktopIniFlags) {
	Get-ChildItem -LiteralPath $SUBFOUNT_DIR -Recurse -File -Force -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
	. $PSScriptRoot/src/env.ps1
	. $PSScriptRoot/src/win/file_attrs.ps1
	Initialize-SubfountDesktopIni
}
. $PSScriptRoot/src/index.ps1 @args
exit $LastExitCode
function __END_HEREDOC__() {}
__END_HEREDOC__
