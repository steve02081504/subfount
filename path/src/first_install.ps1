function script:subfount_first_install_if_needed {
	if (!(Test-Path -Path "$SUBFOUNT_DIR/node_modules") -or $args[0] -eq 'init') {
		require_mid
		Enable-SubfClashTunBackground
		Get-ChildItem -Path $SUBFOUNT_DIR -Recurse -File -Filter '*.ps1' -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
		if (Test-Path -Path "$SUBFOUNT_DIR/node_modules") {
			run shutdown
		}
		if (!(Test-Path -Path "$SUBFOUNT_DIR/.noupdate")) {
			if ((Get-Command git -ErrorAction Ignore) -and (Test-Path -Path "$SUBFOUNT_DIR/.git")) {
				invoke_repo_git config core.autocrlf false
				invoke_repo_git pull --rebase --autostash 2>$null
			}
		}
		Write-TaskbarProgress -Percent 70
		Write-Host (Get-I18n -key 'install.installingDependencies')
		# 仓库 pin 了 deno 版本（.deno-version）时先按其升级，避免首装用到错误的 deno 版本导致依赖解析失败
		if (deno_pinned_spec) {
			deno_upgrade
		}
		deno install --allow-scripts --allow-all -c "$SUBFOUNT_DIR/deno.json" --entrypoint "$SUBFOUNT_DIR/src/index.mjs"
		$global:LastExitCode = 0
		Write-TaskbarProgress -Percent 85
		Write-Host "======================================================" -ForegroundColor Green
		Write-Warning (Get-I18n -key 'install.untrustedPartsWarning')
		Write-Host "======================================================" -ForegroundColor Green
		Write-TaskbarProgressClear

		require win/file_attrs
		Initialize-SubfountDesktopIni
		Register-SubfBootBackground
	}
}
