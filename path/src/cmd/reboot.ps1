function script:cmd_reboot {
	require terminal run
	bootstrap_full @args
	try {
		& (Join-Path $SUBF_DIR 'path/subfount.ps1') shutdown
		& (Join-Path $SUBF_DIR 'path/subfount.ps1') background keepalive
	}
	finally {
		Write-TaskbarProgressClear
	}
	exit $LastExitCode
}
