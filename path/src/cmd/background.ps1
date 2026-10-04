# Single string for Start-Process -ArgumentList (array form nests/empties and blows up on bind).
function script:Get-SubfPs1ArgumentList {
	# Per-arg Windows CommandLineToArgvW escaping, then join into one -ArgumentList string.
	"-noprofile -nologo -ExecutionPolicy Bypass -File `"$SUBFOUNT_DIR\path\subfount.ps1`" $(($args | ForEach-Object {
		$a = "$_"
		if ($a -notmatch '[\s"]' -and $a.Length) { $a }
		else { '"' + ($a -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"' }
	}) -join ' ')"
}

function script:cmd_background {
	require passthrough
	$env:SUBFOUNT_BACKGROUND = 1
	handle_docker_passthrough @args
	$cmdArgs = @($args | Select-Object -Skip 1)
	try {
		if (Test-Path -Path "$SUBFOUNT_DIR/.nobackground") {
			Start-Process -FilePath (Get-Process -Id $PID).Path -ArgumentList (Get-SubfPs1ArgumentList @cmdArgs) -ErrorAction Stop
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
