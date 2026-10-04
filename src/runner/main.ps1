#!pwsh
#_pragma Resources.Title "subfount"
# subfount irm|iex 引导器
# 用法: irm <url> | iex
# 安装 subfount 到 SUBFOUNT_DIR，自更新引导器后转发给 run.bat。

if (!$env:SUBFOUNT_BRANCH) {
	$env:SUBFOUNT_BRANCH = "master"
}

# 任务栏进度
$script:TaskbarProgressEnabled = $Host.UI.SupportsVirtualTerminal -and -not [System.Console]::IsOutputRedirected
$script:TaskbarProgressEsc = [char]27
$script:TaskbarProgressBel = [char]7
function Write-TaskbarProgress([int]$Percent) {
	if (-not $script:TaskbarProgressEnabled) { return }
	if ($PSBoundParameters.ContainsKey('Percent')) {
		$p = [Math]::Max(0, [Math]::Min(100, $Percent))
		Write-Host -NoNewline ($script:TaskbarProgressEsc + "]9;4;1;$p" + $script:TaskbarProgressBel)
	}
	else {
		Write-Host -NoNewline ($script:TaskbarProgressEsc + "]9;4;3" + $script:TaskbarProgressBel)
	}
}
function Write-TaskbarProgressClear {
	if ($script:TaskbarProgressEnabled) {
		Write-Host -NoNewline ($script:TaskbarProgressEsc + "]9;4;0" + $script:TaskbarProgressBel)
	}
}
function Write-TaskbarProgressError {
	if ($script:TaskbarProgressEnabled) {
		Write-Host -NoNewline ($script:TaskbarProgressEsc + "]9;4;2;100" + $script:TaskbarProgressBel)
	}
}

Write-TaskbarProgress -Percent 0

if ((Get-Culture).Name -match '-(CN|KP|RU)$') {
	Start-Job {
		# 随手之劳之经验医学之clash的tun没开
		if ((Test-Connection "github.com", "cdn.jsdelivr.net" -Count 1 -Quiet -ErrorAction SilentlyContinue) -contains $false) {
			Invoke-RestMethod http://127.0.0.1:9090/configs -Method Patch -Body '{"tun":{"enable":true}}' -ErrorAction SilentlyContinue
			Invoke-RestMethod http://127.0.0.1:9097/configs -Method Patch -Body '{"tun":{"enable":true}}' -ErrorAction SilentlyContinue
		}
	} | Out-Null
}

function Set-MissingVariablesForWindowsPowershell {
	[System.Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidAssignmentToAutomaticVariable', '', Justification = 'all assignments to "automatic" variables are safe in this function')]
	param()
	if ($PSEdition -eq "Desktop") {
		try { $global:IsWindows = $true } catch {}
	}
}
Set-MissingVariablesForWindowsPowershell

if (!$IsWindows) {
	$script:SubfPkgStateDir = $env:SUBFOUNT_PKG_STATE_DIR
	if (-not $script:SubfPkgStateDir) {
		$base = if ($env:TMPDIR) { $env:TMPDIR } elseif ($env:TEMP) { $env:TEMP } else { '/tmp' }
		$script:SubfPkgStateDir = Join-Path $base (Join-Path 'subfount' 'package')
	}
	function Test-SubfPkgRefreshNeeded([string]$Manager) {
		$file = Join-Path $script:SubfPkgStateDir "$Manager.refresh"
		if (-not (Test-Path -LiteralPath $file)) { return $true }
		$last = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue
		$last = if ($last) { try { [long]$last.Trim() } catch { 0 } } else { 0 }
		$refreshInterval = if ($env:SUBFOUNT_PKG_REFRESH_INTERVAL) { [long]$env:SUBFOUNT_PKG_REFRESH_INTERVAL } else { 600 }
		return (([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - $last) -ge $refreshInterval)
	}
	function Set-SubfPkgRefresh([string]$Manager) {
		New-Item -Path $script:SubfPkgStateDir -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null
		Set-Content -LiteralPath (Join-Path $script:SubfPkgStateDir "$Manager.refresh") -Value ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) -Encoding ascii
	}
	function Enter-SubfPkgLock([string]$Manager) {
		New-Item -Path $script:SubfPkgStateDir -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null
		$lockDir = Join-Path $script:SubfPkgStateDir "$Manager.lock"
		$pidFile = Join-Path $lockDir 'pid'
		$timeoutMs = if ($env:SUBFOUNT_PKG_LOCK_TIMEOUT) { [int]$env:SUBFOUNT_PKG_LOCK_TIMEOUT * 1000 } else { 300000 }
		$sw = [System.Diagnostics.Stopwatch]::StartNew()
		while ($true) {
			try {
				New-Item -Path $lockDir -ItemType Directory -ErrorAction Stop | Out-Null
				Set-Content -LiteralPath $pidFile -Value $PID -Encoding ascii
				$script:SubfPkgLockDir = $lockDir
				return $true
			}
			catch {
				if (Test-Path -LiteralPath $pidFile) {
					$heldPid = (Get-Content -LiteralPath $pidFile -Raw -ErrorAction SilentlyContinue).Trim()
					if ($heldPid -and -not (Get-Process -Id $heldPid -ErrorAction SilentlyContinue)) {
						Remove-Item -LiteralPath $lockDir -Force -Recurse -ErrorAction SilentlyContinue
						continue
					}
				}
				if ($sw.ElapsedMilliseconds -ge $timeoutMs) { return $false }
				Start-Sleep -Milliseconds 100
			}
		}
	}
	function Exit-SubfPkgLock {
		if ($script:SubfPkgLockDir) {
			Remove-Item -LiteralPath $script:SubfPkgLockDir -Force -Recurse -ErrorAction SilentlyContinue
			$script:SubfPkgLockDir = $null
		}
	}
	function install_package {
		param(
			[string]$CommandName,
			[string[]]$PackageNames
		)
		if ((Get-Command -Name $CommandName -ErrorAction Ignore)) { return $true }

		$hasSudo = (Get-Command -Name "sudo" -ErrorAction Ignore)

		foreach ($package in $PackageNames) {
			if (Get-Command -Name "apt-get" -ErrorAction Ignore) {
				if (Enter-SubfPkgLock "apt-get") {
					try {
						if (Test-SubfPkgRefreshNeeded "apt-get") {
							if ($hasSudo) { sudo apt-get update -y > $null } else { apt-get update -y > $null }
							if ($LASTEXITCODE -eq 0) { Set-SubfPkgRefresh "apt-get" }
						}
						if ($hasSudo) { sudo apt-get install -y $package } else { apt-get install -y $package }
					}
					finally { Exit-SubfPkgLock }
				}
				if (Get-Command -Name $CommandName -ErrorAction Ignore) { break }
			}
			if (Get-Command -Name "pacman" -ErrorAction Ignore) {
				if (Enter-SubfPkgLock "pacman") {
					try {
						if ($hasSudo) { sudo pacman -Syu --needed --noconfirm $package }
						else { pacman -Syu --needed --noconfirm $package }
					}
					finally { Exit-SubfPkgLock }
				}
				if (Get-Command -Name $CommandName -ErrorAction Ignore) { break }
			}
			if (Get-Command -Name "dnf" -ErrorAction Ignore) {
				if (Enter-SubfPkgLock "dnf") {
					try {
						if ($hasSudo) { sudo dnf install -y $package } else { dnf install -y $package }
					}
					finally { Exit-SubfPkgLock }
				}
				if (Get-Command -Name $CommandName -ErrorAction Ignore) { break }
			}
			if (Get-Command -Name "yum" -ErrorAction Ignore) {
				if (Enter-SubfPkgLock "yum") {
					try {
						if ($hasSudo) { sudo yum install -y $package } else { yum install -y $package }
					}
					finally { Exit-SubfPkgLock }
				}
				if (Get-Command -Name $CommandName -ErrorAction Ignore) { break }
			}
			if (Get-Command -Name "zypper" -ErrorAction Ignore) {
				if (Enter-SubfPkgLock "zypper") {
					try {
						if ($hasSudo) { sudo zypper install -y --no-confirm $package } else { zypper install -y --no-confirm $package }
					}
					finally { Exit-SubfPkgLock }
				}
				if (Get-Command -Name $CommandName -ErrorAction Ignore) { break }
			}
			if (Get-Command -Name "apk" -ErrorAction Ignore) {
				if (Enter-SubfPkgLock "apk") {
					try {
						if ($hasSudo) { sudo apk add --update $package } else { apk add --update $package }
					}
					finally { Exit-SubfPkgLock }
				}
				if (Get-Command -Name $CommandName -ErrorAction Ignore) { break }
			}
			if (Get-Command -Name "brew" -ErrorAction Ignore) {
				if (Enter-SubfPkgLock "brew") {
					try {
						if (-not (brew list --formula $package 2>$null)) {
							brew install $package
						}
					}
					finally { Exit-SubfPkgLock }
				}
				if (Get-Command -Name $CommandName -ErrorAction Ignore) { break }
			}
			if (Get-Command -Name "pkg" -ErrorAction Ignore) {
				if (Enter-SubfPkgLock "pkg") {
					try {
						if ($hasSudo) { sudo pkg install -y $package } else { pkg install -y $package }
					}
					finally { Exit-SubfPkgLock }
				}
				if (Get-Command -Name $CommandName -ErrorAction Ignore) { break }
			}
			if (Get-Command -Name "snap" -ErrorAction Ignore) {
				if (Enter-SubfPkgLock "snap") {
					try {
						if ($hasSudo) { sudo snap install $package } else { snap install $package }
					}
					finally { Exit-SubfPkgLock }
				}
				if (Get-Command -Name $CommandName -ErrorAction Ignore) { break }
			}
		}

		if (Get-Command -Name $CommandName -ErrorAction Ignore) {
			$currentPackages = $env:FOUNT_AUTO_INSTALLED_PACKAGES -split ';' | Where-Object { $_ }
			if ($package -notin $currentPackages) {
				$env:FOUNT_AUTO_INSTALLED_PACKAGES = ($currentPackages + $package) -join ';'
			}
			return $true
		}
		else {
			Write-Error "Error: $package installation failed."
			return $false
		}
	}
	install_package "bash" @("bash", "gnu-bash")
	Write-TaskbarProgress -Percent 5
	Invoke-RestMethod https://raw.githubusercontent.com/steve02081504/subfount/refs/heads/$env:SUBFOUNT_BRANCH/src/runner/main.sh | bash -s -- $args
	exit $LastExitCode
}

if (!$env:SUBFOUNT_DIR) {
	$env:SUBFOUNT_DIR = "$env:LOCALAPPDATA/subfount"
}

$forwardedArgs = @($args)
if ($forwardedArgs.Count -eq 0) {
	$forwardedArgs = @("background", "keepalive")
}

function RefreshPath {
	$env:PATH = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Install-SubfountTree {
	param([string]$Dir, [string]$Branch)
	Remove-Item $Dir -Force -ErrorAction Ignore -Recurse
	if (Get-Command git -ErrorAction Ignore) {
		$cloneUrls = @("https://github.com/steve02081504/subfount")
		if ((Get-Culture).Name -match '-(CN|KP|RU)$') {
			$cloneUrls += "https://gh-proxy.org/github.com/steve02081504/subfount"
			$cloneUrls += "https://gitclone.com/github.com/steve02081504/subfount.git"
		}
		foreach ($url in $cloneUrls) {
			git clone -c core.autocrlf=false -c http.lowSpeedLimit=1 -c http.lowSpeedTime=30 $url $Dir --depth 1 --single-branch --branch $Branch
			if ($LastExitCode -eq 0) { break }
			Remove-Item $Dir -Force -ErrorAction Ignore -Recurse
		}
	}
	$installFlag = Join-Path $Dir 'path/subfount.ps1'
	if (!(Test-Path $installFlag)) {
		Remove-Item "$env:TEMP/subfount-$Branch" -Force -ErrorAction Ignore -Recurse
		$zipUrls = @("https://github.com/steve02081504/subfount/archive/refs/heads/$Branch.zip")
		if ((Get-Culture).Name -match '-(CN|KP|RU)$') {
			$zipUrls += "https://gh-proxy.org/https://github.com/steve02081504/subfount/archive/refs/heads/$Branch.zip"
		}
		$lastError = $null
		foreach ($zipUrl in $zipUrls) {
			try {
				Invoke-WebRequest $zipUrl -OutFile $env:TEMP/subfount.zip
				break
			}
			catch {
				$lastError = $_.Exception.Message
				Remove-Item $env:TEMP/subfount.zip -Force -ErrorAction Ignore
			}
		}
		if (-not (Test-Path $env:TEMP/subfount.zip)) {
			throw "Failed to download subfount: $lastError"
		}
		Expand-Archive $env:TEMP/subfount.zip $env:TEMP -Force
		Remove-Item $env:TEMP/subfount.zip -Force
		New-Item $(Split-Path -Parent $Dir) -ItemType Directory -Force -ErrorAction Ignore | Out-Null
		Move-Item "$env:TEMP/subfount-$Branch" $Dir -Force
	}
	if (!(Test-Path $installFlag)) {
		throw "Failed to install subfount"
	}
	Get-ChildItem -Path $Dir -Recurse -File -Filter '*.ps1' -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
}

function Import-SubfountLocale([string]$Dir) {
	$script:SUBFOUNT_DIR = $Dir
	. (Join-Path $Dir 'path/src/i18n.ps1')
}

$subfountExitCode = 1
$canSelfModify = $PSCommandPath -and (Test-Path -LiteralPath $PSCommandPath -PathType Leaf)
try {
	if (!(Get-Command subfount.ps1 -ErrorAction Ignore)) {
		Write-TaskbarProgress -Percent 0
		Install-SubfountTree -Dir $env:SUBFOUNT_DIR -Branch $env:SUBFOUNT_BRANCH
		Write-TaskbarProgress -Percent 50
		if (!(Test-Path $env:SUBFOUNT_DIR)) {
			Write-TaskbarProgressError
			$Host.UI.WriteErrorLine("Failed to install subfount")
			exit 1
		}
		$Script:subfountDir = $env:SUBFOUNT_DIR
		Import-SubfountLocale $env:SUBFOUNT_DIR
		Write-TaskbarProgress -Percent 70
	}
	else {
		$Script:subfountDir = (Get-Command subfount.ps1).Path | Split-Path -Parent | Split-Path -Parent
		Import-SubfountLocale $Script:subfountDir
	}

	try {
		$subfCurrentPolicy = (Get-ItemProperty -Path 'HKCU:\Software\Microsoft\PowerShell\1\ShellIds\Microsoft.PowerShell' -Name ExecutionPolicy -ErrorAction Ignore).ExecutionPolicy
		if ($subfCurrentPolicy -ne 'Unrestricted') {
			Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope CurrentUser -Force -ErrorAction Ignore
		}
	}
	catch { <# ignore #> }

	#_if PSEXE
		#_!! if (Test-Path "${PSCommandPath}.old") {
			#_!! Remove-Item "${PSCommandPath}.old"
		#_!! }
		#_!! $(if ((Get-Command ps12exe -ErrorAction Ignore) -and ($PSEXEscript -ne (ps12exe -inputFile "$Script:subfountDir/src/runner/main.ps1" -PreprocessOnly))) {
			#_!! Write-Host (Get-I18n -key 'install.runnerUpdating')
			#_!! Move-Item "$PSCommandPath" "${PSCommandPath}.old"
			#_!! & "$Script:subfountDir/run.bat" geneexe "$PSCommandPath"
		#_!! }) 6> $null
	#_else
		# 仅当脚本来自可写文件时才执行自更新；例如 IEX/curl 管道执行时 $PSCommandPath 可能为空。
		if ($canSelfModify) {
			$sourceFile = "$Script:subfountDir/src/runner/main.ps1"
			if ((Get-FileHash -LiteralPath $PSCommandPath).Hash -ne (Get-FileHash -LiteralPath $sourceFile).Hash) {
				Write-Host (Get-I18n -key 'install.runnerUpdating')
				try { Copy-Item -LiteralPath $sourceFile -Destination $PSCommandPath -Force }
				catch { <# 文件无写权限时静默跳过 #> }
			}
		}
	#_endif
	$OutputEncoding = [console]::OutputEncoding = [System.Text.Encoding]::UTF8
	& "$Script:subfountDir/run.bat" @forwardedArgs
	$subfountExitCode = $LastExitCode
}
finally {
	Write-TaskbarProgressClear
}

#_if PSEXE
	#_!! if (Test-Path "${PSCommandPath}.old") {
		#_!! Start-Process powerShell @("-NoProfile";"-c";"sleep 1;Remove-Item `"${PSCommandPath}.old`"") -WindowStyle Hidden
	#_!! }
	#_!! if ($args[0] -eq 'remove') {
		#_balus $subfountExitCode
	#_!! }
#_else
	if (($args[0] -eq 'remove') -and $canSelfModify) {
		Remove-Item -LiteralPath $PSCommandPath -Force
	}
#_endif
exit $subfountExitCode
