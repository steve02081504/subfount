function script:cmd_clean {
	require i18n run terminal deno
	bootstrap_full clean
	if (Test-Path -Path "$SUBF_DIR/node_modules") {
		& (Join-Path $SUBF_DIR 'path/subfount.ps1') shutdown
		if ($args[1] -eq 'force') {
			Write-Host (Get-I18n -key 'clean.removingCaches')
			Get-ChildItem -Path "$SUBF_DIR" -Filter "*_cache.json" -Recurse | Remove-Item -Force -ErrorAction Ignore
		}
	}
	Remove-Item -Path "$SUBF_DIR/data/test" -Recurse -Force -ErrorAction Ignore
	Write-Host (Get-I18n -key 'clean.cleaningDenoCaches')
	deno clean -e "$SUBF_DIR/src/index.mjs"
	Write-TaskbarProgressClear
}
