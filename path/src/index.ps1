# Main CLI dispatcher (dot-sourced from path/subfount.ps1).

if (-not $script:SUBF_SRC) {
	$script:SUBF_SRC = $PSScriptRoot
}
if (-not $SUBF_DIR) {
	$SUBF_DIR = Split-Path -Parent (Split-Path -Parent $script:SUBF_SRC)
}

$env:SUBF_SESSION_START_TIME = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
if (-not $env:SUBF_START_TIME) {
	$env:SUBF_START_TIME = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
}

# 官方npm源，避免用户自定义源导致各种问题
if (-not $env:NPM_CONFIG_REGISTRY) {
	$env:NPM_CONFIG_REGISTRY = "https://registry.npmjs.org"
}

# 统一输出为 UTF-8（多语言文案）
$env:OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# MSYS/Cygwin bash 继承的 PATH 常缺 Windows User/Machine 项；先刷新再 require git 等。
if ($env:OSTYPE -match '^(msys|cygwin)') {
	. (Join-Path $script:SUBF_SRC 'win\refresh_path.ps1')
	MergePath
}

. (Join-Path $script:SUBF_SRC 'load.ps1')

# 剥离本轮新增的 NativeCommandError：stderr 被 2>&1 捕获后（如 deno 跳过的可选依赖警告）
# 会在 PowerShell 里生成 NativeCommandError 记录，属非致命信息，不应触发 $ErrorCount 差异退出。
function script:Pop-NativeCommandErrors([int]$SinceCount) {
	while ($Error.Count -gt $SinceCount -and $Error[0].FullyQualifiedErrorId -eq 'NativeCommandError') {
		$Error.RemoveAt(0)
	}
}

$script:SubfCallerErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
	require env i18n terminal temp_guard

	check_temp_guard $args[0]

	$ErrorCount = $Error.Count

	require passthrough
	handle_unix_passthrough @args

	$cmd = $args[0]
	if ($cmd -and $cmd -match '^[a-z]+$') {
		$commandFile = Join-Path $script:SUBF_SRC "cmd\$cmd.ps1"
		if (Test-Path -LiteralPath $commandFile) {
			. $commandFile
			& "cmd_$cmd" @args
			Pop-NativeCommandErrors $ErrorCount
			if ($ErrorCount -ne $Error.Count) { exit 1 }
			exit $LastExitCode
		}
	}

	require cmd/default
	cmd_default @args

	Pop-NativeCommandErrors $ErrorCount
	if ($ErrorCount -ne $Error.Count) { exit 1 }
	exit $LastExitCode
} finally {
	$ErrorActionPreference = $script:SubfCallerErrorActionPreference
}
