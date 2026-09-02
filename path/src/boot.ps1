function script:Register-SubfBootBackground {
	if (!$IsWindows -or (in_container)) { return }
	if (Test-Path "$SUBF_DIR/.noautoboot") { return }
	try {
		# wscript 是 GUI 子系统进程（不分配控制台），经 hidden_launch.vbs 以窗口样式 0
		# 隐藏拉起 powershell，开机自启不闪 PowerShell 蓝框。
		$shellExe = if (Get-Command powershell.exe -ErrorAction SilentlyContinue) {
			(Get-Command powershell.exe).Source
		}
		elseif (Test-Path -LiteralPath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe") {
			"$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
		}
		elseif (Get-Command pwsh -ErrorAction SilentlyContinue) {
			(Get-Command pwsh).Source
		}
		$subfPs1 = Join-Path $SUBF_DIR 'path\subfount.ps1'
		$vbsPath = Join-Path $SUBF_DIR 'path\src\win\hidden_launch.vbs'
		$backgroundCmd = "`"$shellExe`" -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$subfPs1`" background keepalive"
		$encodedCmd = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($backgroundCmd))
		$runValue = "`"$env:SystemRoot\System32\wscript.exe`" //nologo `"$vbsPath`" `"$encodedCmd`""
		$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
		if (-not (Test-Path $runKey)) {
			New-Item -Path $runKey -Force | Out-Null
		}
		Set-ItemProperty -Path $runKey -Name 'subfount' -Value $runValue -Type String -ErrorAction Stop
	}
	catch {
		Write-Warning $_.Exception.Message
	}
}
