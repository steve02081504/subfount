function script:cmd_debug {
	bootstrap_full @args
	try {
		$rest = @($args | Select-Object -Skip 1)
		& (Join-Path $SUBFOUNT_DIR 'path/subfount.ps1') keepalive debug @rest
	}
	finally {
		Write-TaskbarProgressClear
	}
	exit $LastExitCode
}
