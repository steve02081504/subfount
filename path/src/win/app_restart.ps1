Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class SubfRestart {
	[DllImport("kernel32.dll", SetLastError = false, CharSet = CharSet.Unicode)]
	public static extern int RegisterApplicationRestart(string pwzCommandline, uint dwFlags);
	[DllImport("kernel32.dll", SetLastError = false)]
	public static extern int UnregisterApplicationRestart();
}
'@ -ErrorAction SilentlyContinue | Out-Null

# 智能自启动：向 Windows 注册“系统重启/更新后恢复”
function script:Register-SubfApplicationRestart {
	if (!$IsWindows) { return }
	if ($script:SubfRestartRegistered) { return }
	$script:SubfRestartRegistered = $true
	$restartArgs = ''
	if ($env:SUBFOUNT_BACKGROUND) {
		$restartArgs += ' background'
	}
	if ($env:SUBFOUNT_KEEPALIVE) {
		$restartArgs += ' keepalive'
	}
	$restartCommandLine = " -NoProfile -ExecutionPolicy Bypass -Command `".{ .\`"$SUBFOUNT_DIR/path/subfount.ps1\`"$restartArgs }`""
	[SubfRestart]::RegisterApplicationRestart($restartCommandLine, 3) | Out-Null
}

# 程序正常或 Ctrl+C 退出时取消“系统重启后恢复”注册，避免被系统再次拉起
function script:Unregister-SubfApplicationRestart {
	if (!$IsWindows) { return }
	Remove-Item Env:\SUBFOUNT_RESTART_REGISTERED -Force -ErrorAction Ignore
	[SubfRestart]::UnregisterApplicationRestart() | Out-Null
}
