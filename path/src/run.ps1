function script:run {
	if (isRoot) {
		Write-Warning (Get-I18n -key 'install.rootWarningAsRoot')
		Write-Warning (Get-I18n -key 'install.rootWarningPreferUser')
	}
	Write-TaskbarProgress -Percent 5
	$originalTitle = Get-Title
	Set-Title ""
	$v8Flags = ""
	if ($env:SUBFOUNT_V8_FLAGS) {
		$v8Flags = $env:SUBFOUNT_V8_FLAGS
	}
	$heapSizeMB = 100 # Default to 100MB
	$configPath = Join-Path $SUBFOUNT_DIR 'data/config.json'
	if (Test-Path $configPath) {
		try {
			$subfConfig = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
			$heapSizeBytes = $subfConfig.prelaunch.heapSize
			$calculatedMB = [math]::Round($heapSizeBytes / 1024 / 1024)
			if ($calculatedMB -gt 0) {
				$heapSizeMB = $calculatedMB
			}
		}
		catch {
			# Could not read or parse, will use the default 100MB.
		}
	}
	Write-TaskbarProgress -Percent 10
	if ($v8Flags) { $v8Flags += ",--initial-heap-size=${heapSizeMB}" }
	else { $v8Flags = "--initial-heap-size=${heapSizeMB}" }

	if (-not $env:SUBFOUNT_START_TIME) {
		$env:SUBFOUNT_START_TIME = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
	}
	$env:SUBFOUNT_DENO_START_TIME = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
	Write-TaskbarProgress -Percent 25
	Set-Title "𝓯"
	$proc = [System.Diagnostics.Process]::GetCurrentProcess()
	$prevPriority = $proc.PriorityClass
	$env:SUBFOUNT_STARTUP_PRIORITY_BOOST = '1'
	try { $proc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::AboveNormal } catch { <# ignore #> }
	try {
		if ($env:SUBFOUNT_DEBUG) {
			deno run --allow-scripts --allow-all --inspect-brk -c "$SUBFOUNT_DIR/deno.json" --v8-flags="$v8Flags" "$SUBFOUNT_DIR/src/index.mjs" @args
		}
		else {
			deno run --allow-scripts --allow-all -c "$SUBFOUNT_DIR/deno.json" --v8-flags="$v8Flags" "$SUBFOUNT_DIR/src/index.mjs" @args
		}
	}
	finally {
		try { $proc.PriorityClass = $prevPriority } catch { <# ignore #> }
		Remove-Item Env:\SUBFOUNT_STARTUP_PRIORITY_BOOST -Force -ErrorAction Ignore
		Set-Title $originalTitle
		Remove-Item Env:\SUBFOUNT_START_TIME -Force -ErrorAction Ignore
		Remove-Item Env:\SUBFOUNT_DENO_START_TIME -Force -ErrorAction Ignore
		if ($LastExitCode -and $LastExitCode -ne 130) { Write-TaskbarProgressError }
	}
}

function script:run_server {
	$commandArguments = @($args)
	if ($commandArguments.Count -gt 0 -and $commandArguments[0] -eq 'debug') {
		$commandArguments = @($commandArguments | Select-Object -Skip 1)
		debug_on
	}
	run_with_updates @commandArguments
}

function script:run_with_updates {
	run @args
	# Self-update restart runs bare server — not @args. e.g. `subfount run shell/install x`
	# must not re-run install after crash recovery.
	while ($LastExitCode -eq 131) {
		update_subfount_and_deno
		run
	}
}
