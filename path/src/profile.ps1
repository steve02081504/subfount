# 确保 $SUBF_DIR\path 在用户 PATH 中
# subfount 没有自带的 pwsh 模块，故不向 $Profile 注入任何 Import-Module。
$subfPathDir = Join-Path $SUBF_DIR 'path'
$UserPath = [System.Environment]::GetEnvironmentVariable('PATH', [System.EnvironmentVariableTarget]::User)
$userPathList = @($UserPath -split ';' | Where-Object { $_ })
if ($userPathList -notcontains $subfPathDir) {
	$userPathList += $subfPathDir
	[System.Environment]::SetEnvironmentVariable('PATH', ($userPathList -join ';'), [System.EnvironmentVariableTarget]::User)
}
$sessionPathList = @($env:PATH -split ';' | Where-Object { $_ })
if ($sessionPathList -notcontains $subfPathDir) {
	$env:PATH = ($sessionPathList + $subfPathDir) -join ';'
}
