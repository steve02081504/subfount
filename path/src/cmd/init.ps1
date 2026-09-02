function script:cmd_init {
	bootstrap_full init
	$exitCode = $LastExitCode
	Write-TaskbarProgressClear
	exit $exitCode
}
