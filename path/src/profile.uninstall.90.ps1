# Remove subfount from PATH
Write-Host (Get-I18n -key 'remove.removing.subfount.fromPath')
$path = $env:PATH -split ';'
$path = $path | Where-Object { !$_.StartsWith("$SUBF_DIR") }
$env:Path = $path -join ';'
$UserPath = [System.Environment]::GetEnvironmentVariable('PATH', [System.EnvironmentVariableTarget]::User)
$UserPath = $UserPath -split ';'
$UserPath = $UserPath | Where-Object { !$_.StartsWith("$SUBF_DIR") }
$UserPath = $UserPath -join ';'
[System.Environment]::SetEnvironmentVariable('PATH', $UserPath, [System.EnvironmentVariableTarget]::User)
Set-Title "𝓈𝓊"
Write-TaskbarProgress -Percent 25
