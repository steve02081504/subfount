# require: idempotent dot-source loader (maps 'cmd/foo' → path/src/cmd/foo.ps1).
# path/src/*.ps1 exports use `function script:` so lazy loads from handlers stay visible.
$script:SubfLoaded = @{}
function script:require {
	foreach ($Module in $args) {
		if (-not $Module) { continue }
		if ($script:SubfLoaded[$Module]) { continue }
		$relativePath = $Module -replace '/', [IO.Path]::DirectorySeparatorChar
		$path = Join-Path $script:SUBF_SRC "$relativePath.ps1"
		if (-not (Test-Path -LiteralPath $path)) {
			Write-Error "require: missing $path"
			exit 1
		}
		. $path
		$script:SubfLoaded[$Module] = $true
	}
}

function script:require_mid {
	require env win/refresh_path win/winget
	require pkg_common packages browser passthrough profile
	require git deno fs update run debug boot
	require win/app_restart win/keep_awake first_install
	install_deno
}

function script:bootstrap_full {
	require_mid
	subfount_first_install_if_needed @args
}

function script:bootstrap_server {
	bootstrap_full @args
	assert_dir_writable $SUBF_DIR
	update_subfount_and_deno_background
	deno -V
}

function script:source_uninstall_hooks {
	Get-ChildItem -Path $script:SUBF_SRC -Recurse -Filter '*.uninstall.*.ps1' -File |
		ForEach-Object {
			if ($_.Name -match '\.uninstall\.(\d+)\.ps1$') {
				[PSCustomObject]@{
					Path         = $_.FullName
					Level        = [int]$Matches[1]
					RelativePath = $_.FullName.Substring($script:SUBF_SRC.Length).TrimStart('\', '/')
				}
			}
		} |
		Sort-Object -Property @{ Expression = 'Level'; Descending = $true }, @{ Expression = 'RelativePath'; Descending = $false } |
		ForEach-Object { . $_.Path }
}
