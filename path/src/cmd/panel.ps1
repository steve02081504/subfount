function script:cmd_panel {
	require env win/refresh_path deno
	$rest = @($args | Select-Object -Skip 1)
	install_deno
	deno run --allow-scripts --allow-all (Join-Path $SUBFOUNT_DIR 'src/panel.mjs') @rest
	exit $LastExitCode
}
