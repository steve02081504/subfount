function script:Get-SubfPs1ArgumentList {
	param([string[]]$Rest)
	$list = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $SUBF_DIR 'path/subfount.ps1'))
	$list += $Rest
	return $list
}

function script:cmd_background {
	require passthrough
	$env:SUBF_BACKGROUND = 1
	handle_docker_passthrough @args
	$cmdArgs = @($args | Select-Object -Skip 1)
	try {
		if (Test-Path -Path "$SUBF_DIR/.nobackground") {
			Start-Process -FilePath "cmd.exe" -ArgumentList @('/c', 'start', 'cmd', '/k', (Join-Path $SUBF_DIR 'path/subfount.bat') + ' ' + ($cmdArgs -join ' ')) -ErrorAction Stop
		}
		else {
			$pwshExe = (Get-Process -Id $PID).Path
			Start-Process -FilePath $pwshExe -ArgumentList (Get-SubfPs1ArgumentList @cmdArgs) -WindowStyle Hidden -ErrorAction Stop
		}
	}
	catch {
		exit 1
	}
	exit 0
}
