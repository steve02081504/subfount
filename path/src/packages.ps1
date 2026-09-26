# 自动安装跟踪的 pwsh 模块（subfount 无自带 pwsh 模块，模块列表为空；保留机制以便将来使用）
$script:auto_installed_pwsh_modules = Get-Content "$SUBFOUNT_DIR/data/installer/auto_installed_pwsh_modules" -Raw -ErrorAction Ignore
if (!$script:auto_installed_pwsh_modules) { $script:auto_installed_pwsh_modules = '' }
$script:auto_installed_pwsh_modules = @($script:auto_installed_pwsh_modules.Split(';') | Where-Object { $_ })

function script:Test-PWSHModule([string]$ModuleName) {
	if (!(Get-Module $ModuleName -ListAvailable)) {
		if ($script:auto_installed_pwsh_modules -notcontains $ModuleName) {
			$script:auto_installed_pwsh_modules += $ModuleName
		}
		New-Item -Path "$SUBFOUNT_DIR/data/installer" -ItemType Directory -Force | Out-Null
		Set-Content "$SUBFOUNT_DIR/data/installer/auto_installed_pwsh_modules" ($script:auto_installed_pwsh_modules -join ';')
		Get-PackageProvider -Name "NuGet" -Force | Out-Null
		Install-Module -Name $ModuleName -Scope CurrentUser -Force
	}
}

# 新建一个背景job用于后台更新所需的pwsh模块（subfount 暂无需管理的 pwsh 模块，模块列表为空）
Start-Job -ScriptBlock {
	$SUBFOUNT_DIR = $args[0]
	@() | ForEach-Object {
		# 先获取本地模块的版本号，若是0.0.0则跳过更新（开发版本）
		$localVersion = [System.Version]::new(0, 0, 0)
		Get-Module $_ -ListAvailable | ForEach-Object { if ($_.Version -gt $localVersion) { $localVersion = $_.Version } }
		if ("$localVersion" -eq '0.0.0') { return }
		$latestVersion = (Find-Module $_).Version
		if ("$latestVersion" -ne "$localVersion") {
			if (!(Get-Module $_ -ListAvailable)) {
				$tracked = Get-Content "$SUBFOUNT_DIR/data/installer/auto_installed_pwsh_modules" -Raw -ErrorAction Ignore
				if (!$tracked) { $tracked = '' }
				$trackedList = @($tracked.Split(';') | Where-Object { $_ })
				if ($trackedList -notcontains $_) {
					$trackedList += $_
				}
				New-Item -Path "$SUBFOUNT_DIR/data/installer" -ItemType Directory -Force | Out-Null
				Set-Content "$SUBFOUNT_DIR/data/installer/auto_installed_pwsh_modules" ($trackedList -join ';')
			}
			Get-PackageProvider -Name "NuGet" -Force | Out-Null
			Uninstall-Module -Name $_ -Scope CurrentUser -AllVersions -Force -ErrorAction Ignore
			Install-Module -Name $_ -Scope CurrentUser -Force
		}
	}
} -ArgumentList $SUBFOUNT_DIR | Out-Null
