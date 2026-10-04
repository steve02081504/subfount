function script:cmd_keepalive {
	require win/app_restart terminal i18n run
	bootstrap_server @args
	$commandArguments = @($args | Select-Object -Skip 1)

	$env:SUBFOUNT_KEEPALIVE = 1
	try {
		Register-SubfApplicationRestart
		$startTime = Get-Date
		$initAttempted = $false
		$restart_timestamps = New-Object System.Collections.Generic.List[datetime]

		run_server @commandArguments
		while ($LastExitCode) {
			if ($LastExitCode -eq 130) { exit 130 } # ctrl+c
			if ($LastExitCode -ne 131) {
				$elapsedTime = (Get-Date) - $startTime
				if ($elapsedTime.TotalMinutes -lt 3 -and $initAttempted) {
					Write-Error (Get-I18n -key 'keepalive.failedToStart')
					exit 1
				}
				else { $initAttempted = $false }

				$current_time = Get-Date
				$restart_timestamps.Add($current_time)

				$three_minutes_ago = $current_time.AddMinutes(-3)
				for ($index = $restart_timestamps.Count - 1; $index -ge 0; $index--) {
					if ($restart_timestamps[$index] -lt $three_minutes_ago) {
						$restart_timestamps.RemoveAt($index)
					}
				}

				if ($restart_timestamps.Count -ge 7) {
					if (Test-Path -Path "$SUBFOUNT_DIR/.noautoinit") {
						Write-Warning (Get-I18n -key 'keepalive.autoInitDisabled')
						exit 1
					}
					Write-Warning (Get-I18n -key 'keepalive.restartingTooFast')
					$restart_timestamps.Clear()

					& (Join-Path $SUBFOUNT_DIR 'path/subfount.ps1') init
					if ($LastExitCode -ne 0) {
						Write-Error (Get-I18n -key 'keepalive.initFailed')
						exit 1
					}
					$initAttempted = $true
					$startTime = Get-Date
					Write-Host (Get-I18n -key 'keepalive.initComplete')
				}
			}
			# Failed once: foreground-upgrade subfount+deno before the next start.
			update_subfount_and_deno
			run_server
		}
	}
	finally {
		Remove-Item Env:\SUBFOUNT_KEEPALIVE -Force -ErrorAction Ignore
		Unregister-SubfApplicationRestart
		Write-TaskbarProgressClear
	}
}
