function script:cmd_default {
	require terminal env run
	bootstrap_full @args
	$originalTitle = Get-Title
	try {
		if ($args[0]) {
			run @args
		}
		elseif (in_container) {
			& (Join-Path $SUBF_DIR 'path/subfount.ps1') keepalive @args
		}
		else {
			# 守护进程未运行时先拉起（后台 keepalive），随后打开配置面板。
			if (-not (test_subfount_running)) {
				Write-TaskbarProgress -Percent 25
				& (Join-Path $SUBF_DIR 'path/subfount.ps1') background keepalive @args
				Write-TaskbarProgress
			}
			& (Join-Path $SUBF_DIR 'path/subfount.ps1') open
		}
		exit $LastExitCode
	}
	finally {
		Set-Title $originalTitle
		Write-TaskbarProgressClear
	}
}

# 守护进程存活检测：读取 data/daemon.pid 并检查进程是否存在
function script:test_subfount_running {
	$pidFile = Join-Path $SUBF_DIR 'data/daemon.pid'
	if (-not (Test-Path $pidFile)) { return $false }
	$pidValue = (Get-Content $pidFile -Raw -ErrorAction SilentlyContinue).Trim()
	if (-not $pidValue) { return $false }
	return [bool](Get-Process -Id $pidValue -ErrorAction SilentlyContinue)
}
