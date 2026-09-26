# subfount test 防休眠：ES_SYSTEM_REQUIRED 挂 pwsh；AC 合盖经 keep_awake.json 引用计数，
# 末个活 holder 还原。硬杀后存档仍在，之后任意 subfount test finally / clean 顺手恢复。
$script:SubfTestLidSubButtonsGuid = '4f971e89-eebd-4455-a8de-9e59040e7347'
$script:SubfTestLidActionGuid = '5ca83367-6e45-459f-a27b-476b1d01c936'
$script:SubfTestKeepAwakeActive = $false
$script:SubfTestLidHolder = $false
function script:Get-SubfTestKeepAwakeStatePath { "$SUBFOUNT_DIR/data/test/state/keep_awake.json" }
function script:Get-SubfTestLidAc {
	# 读活动方案注册表，避免 powercfg 标签随系统语言变化
	$active = (Get-ItemProperty -LiteralPath 'HKLM:\SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes' -Name ActivePowerScheme -ErrorAction SilentlyContinue).ActivePowerScheme
	if (-not $active) { return $null }
	$lidPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes\$active\$($script:SubfTestLidSubButtonsGuid)\$($script:SubfTestLidActionGuid)"
	$ac = (Get-ItemProperty -LiteralPath $lidPath -Name ACSettingIndex -ErrorAction SilentlyContinue).ACSettingIndex
	if ($null -eq $ac) { return $null }
	return [int]$ac
}
function script:Set-SubfTestLidAc([int]$Index) {
	& powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS $script:SubfTestLidActionGuid $Index | Out-Null
	if ($LastExitCode) { throw "powercfg /setacvalueindex failed (exit $LastExitCode)" }
	& powercfg /setactive SCHEME_CURRENT | Out-Null
	if ($LastExitCode) { throw "powercfg /setactive failed (exit $LastExitCode)" }
}
function script:Invoke-SubfTestKeepAwakeLocked([scriptblock]$Body) {
	$mutex = [System.Threading.Mutex]::new($false, 'Local\SubfTestKeepAwake')
	try { [void]$mutex.WaitOne() }
	catch [System.Threading.AbandonedMutexException] { } # 前持有者崩溃：已获所有权，继续
	try { & $Body }
	finally {
		[void]$mutex.ReleaseMutex()
		$mutex.Dispose()
	}
}
function script:Read-SubfTestKeepAwakeState {
	$path = Get-SubfTestKeepAwakeStatePath
	if (-not (Test-Path -LiteralPath $path)) {
		return @{ lidAc = $null; holders = @() }
	}
	# 不可读/损坏时抛出，避免返回空默认态后被 Write 清掉唯一的 lidAc 存档
	$raw = Get-Content -LiteralPath $path -Raw -ErrorAction Stop | ConvertFrom-Json
	$holders = @(
		foreach ($h in @($raw.holders)) {
			if ($null -ne $h -and "$h" -ne '') { [int]$h }
		}
	)
	$lidAc = $null
	if ($null -ne $raw.lidAc -and "$($raw.lidAc)" -ne '') { $lidAc = [int]$raw.lidAc }
	return @{ lidAc = $lidAc; holders = $holders }
}
function script:Write-SubfTestKeepAwakeState($State) {
	$path = Get-SubfTestKeepAwakeStatePath
	$dir = Split-Path -Parent $path
	$holders = @($State.holders)
	if ($null -eq $State.lidAc -and $holders.Count -eq 0) {
		Remove-Item -LiteralPath $path -Force -ErrorAction Ignore
		return
	}
	New-Item -ItemType Directory -Force -Path $dir | Out-Null
	$payload = [ordered]@{
		lidAc   = $State.lidAc
		holders = $holders
	}
	$tmp = Join-Path $dir "keep_awake.$PID.tmp"
	($payload | ConvertTo-Json -Compress) + "`n" | Set-Content -LiteralPath $tmp -Encoding utf8 -NoNewline
	Move-Item -LiteralPath $tmp -Destination $path -Force
}
function script:Update-SubfTestKeepAwakeState([scriptblock]$Mutator) {
	Invoke-SubfTestKeepAwakeLocked {
		$state = Read-SubfTestKeepAwakeState
		$state.holders = @(
			foreach ($h in @($state.holders)) {
				if (Get-Process -Id $h -ErrorAction SilentlyContinue) { $h }
			}
		)
		# 外部已手动改回合盖且无 holder → 清掉过期存档
		if ($state.holders.Count -eq 0 -and $null -ne $state.lidAc) {
			$current = Get-SubfTestLidAc
			if ($null -ne $current -and $current -eq $state.lidAc) { $state.lidAc = $null }
		}
		& $Mutator $state
		Write-SubfTestKeepAwakeState $state
	}
}
function script:Enable-SubfTestKeepAwake {
	if (-not $IsWindows) { return }
	if (-not $env:SUBFOUNT_TEST_ALLOW_SLEEP) {
		if (-not ('SubfKeepAwake' -as [type])) {
			Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
public static class SubfKeepAwake {
	[DllImport("kernel32.dll")]
	public static extern uint SetThreadExecutionState(uint esFlags);
}
'@
		}
		# 0x80000001：PS 字面量先走 Int32 会溢出，必须按十六进制字符串转 UInt32
		[void][SubfKeepAwake]::SetThreadExecutionState([Convert]::ToUInt32('80000001', 16))
		$script:SubfTestKeepAwakeActive = $true
		Update-SubfTestKeepAwakeState {
			param($state)
			if ($state.holders.Count -eq 0) {
				if ($null -eq $state.lidAc) {
					$current = Get-SubfTestLidAc
					if ($null -ne $current -and $current -ne 0) {
						$state.lidAc = $current
						Set-SubfTestLidAc 0
					}
				}
				else {
					# 继承硬杀留下的存档；确保测试期间合盖仍是 Do nothing
					$current = Get-SubfTestLidAc
					if ($null -ne $current -and $current -ne 0) { Set-SubfTestLidAc 0 }
				}
			}
			if ($PID -notin $state.holders) { $state.holders = @($state.holders) + $PID }
			$script:SubfTestLidHolder = $true
		}
	}
}
function script:Disable-SubfTestKeepAwake {
	if ($script:SubfTestKeepAwakeActive) {
		try { [void][SubfKeepAwake]::SetThreadExecutionState([Convert]::ToUInt32('80000000', 16)) }
		catch { Write-Verbose "Disable-SubfTestKeepAwake SetThreadExecutionState: $($_.Exception.Message)" }
		$script:SubfTestKeepAwakeActive = $false
	}
	if (-not $IsWindows) { return }
	# 含 SUBFOUNT_TEST_ALLOW_SLEEP：无 holder 时仍清孤儿存档
	# 损坏态 Read 故意抛：此处吞掉，避免 test finally 冲掉 deno exit code
	try {
		Update-SubfTestKeepAwakeState {
			param($state)
			if ($script:SubfTestLidHolder) {
				$state.holders = @($state.holders | Where-Object { $_ -ne $PID })
				$script:SubfTestLidHolder = $false
			}
			if ($state.holders.Count -eq 0 -and $null -ne $state.lidAc) {
				try {
					Set-SubfTestLidAc $state.lidAc
					$state.lidAc = $null
				}
				catch { Write-Verbose "Disable-SubfTestKeepAwake Set-SubfTestLidAc: $($_.Exception.Message)" }
			}
		}
	}
	catch { Write-Verbose "Disable-SubfTestKeepAwake Update-SubfTestKeepAwakeState: $($_.Exception.Message)" }
}
function script:Restore-SubfTestKeepAwakeArchive {
	# clean 等：无视仍登记的死/活 holder，强制按存档还原后清文件
	if (-not $IsWindows) { return }
	try {
		Invoke-SubfTestKeepAwakeLocked {
			$state = Read-SubfTestKeepAwakeState
			if ($null -ne $state.lidAc) {
				try { Set-SubfTestLidAc $state.lidAc }
				catch {
					Write-Verbose "Restore-SubfTestKeepAwakeArchive Set-SubfTestLidAc: $($_.Exception.Message)"
					return
				}
			}
			Remove-Item -LiteralPath (Get-SubfTestKeepAwakeStatePath) -Force -ErrorAction Ignore
			$script:SubfTestLidHolder = $false
		}
	}
	catch { Write-Verbose "Restore-SubfTestKeepAwakeArchive: $($_.Exception.Message)" }
}
