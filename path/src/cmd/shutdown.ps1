function script:cmd_shutdown {
	require i18n terminal
	$pidFile = Join-Path $SUBF_DIR 'data/daemon.pid'
	$stopFile = Join-Path $SUBF_DIR 'data/stop.request'
	if (Test-Path $pidFile) {
		$pidValue = (Get-Content $pidFile -Raw -ErrorAction SilentlyContinue).Trim()
		if ($pidValue -and (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) {
			Write-Host (Get-I18n -key 'shutdown.stoppingDaemon')
			New-Item -Path (Split-Path $stopFile) -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null
			Set-Content $stopFile '1'
			for ($i = 0; $i -lt 100 -and (Get-Process -Id $pidValue -ErrorAction SilentlyContinue); $i++) {
				Start-Sleep -Milliseconds 100
			}
			if (Get-Process -Id $pidValue -ErrorAction SilentlyContinue) {
				Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
			}
		}
		Remove-Item $pidFile,$stopFile -Force -ErrorAction Ignore
	}
	Write-Host (Get-I18n -key 'shutdown.complete')
}
