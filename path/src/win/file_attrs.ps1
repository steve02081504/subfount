# Windows 资源管理器只在目录本身带系统属性时认 desktop.ini；文件本身须同时隐藏与系统。
$script:SubfDesktopIniAttributes = [IO.FileAttributes]::Hidden -bor [IO.FileAttributes]::System
# 运行时目录的友好图标：.git、data、node_modules 用 SHELL32 里的现成图标（索引见系统图标库）。
$script:SubfDesktopIniIcons = @{ '.git' = 14; data = 54; node_modules = 135 }

function script:Initialize-SubfountDesktopIni {
	if (-not $IsWindows) { return }
	foreach ($entry in $script:SubfDesktopIniIcons.GetEnumerator()) {
		$directory = Join-Path $SUBFOUNT_DIR $entry.Key
		if (-not (Test-Path -LiteralPath $directory -PathType Container)) { continue }
		$ini = Join-Path $directory 'desktop.ini'
		if (-not (Test-Path -LiteralPath $ini)) {
			[IO.File]::WriteAllText($ini, "[.ShellClassInfo]`nIconResource=%SystemRoot%\System32\SHELL32.dll,$($entry.Value)`n")
		}
	}
	Get-ChildItem -LiteralPath $SUBFOUNT_DIR -Recurse -Filter 'desktop.ini' -File -Force | ForEach-Object {
		# 目录只读是资源管理器给带图标目录打的标记，Windows 下不影响删除或写入内容。
		$directory = Get-Item -LiteralPath $_.DirectoryName -Force
		$directory.Attributes = $directory.Attributes -bor [IO.FileAttributes]::ReadOnly
		$_.Attributes = $_.Attributes -bor $script:SubfDesktopIniAttributes
	}
	# 仓库根的 .git 等点条目藏起来，免得用户在自己目录里看见一堆内部文件。
	Get-ChildItem -LiteralPath $SUBFOUNT_DIR -Force -Filter '.*' | ForEach-Object {
		$_.Attributes = $_.Attributes -bor [IO.FileAttributes]::Hidden
	}
}
