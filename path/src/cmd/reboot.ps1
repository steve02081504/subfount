function script:cmd_reboot {
	require terminal run
	bootstrap_full @args
	try {
		& (Join-Path $SUBFOUNT_DIR 'path/subfount.ps1') shutdown
		& (Join-Path $SUBFOUNT_DIR 'path/subfount.ps1') background keepalive
	}
	finally {
		Write-TaskbarProgressClear
	}
	exit $LastExitCode
}
