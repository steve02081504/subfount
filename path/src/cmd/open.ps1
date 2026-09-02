function script:cmd_open {
	require env win/refresh_path deno
	$rest = @($args | Select-Object -Skip 1)
	install_deno
	deno run --allow-scripts --allow-all (Join-Path $SUBF_DIR 'src/panel.mjs') @rest
	exit $LastExitCode
}
