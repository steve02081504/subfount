import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { bash_exec } from 'npm:@steve02081504/exec'

const gitShPath = fileURLToPath(new URL('../path/src/git.sh', import.meta.url)).replaceAll('\\', '/')
const updateShPath = fileURLToPath(new URL('../path/src/update.sh', import.meta.url)).replaceAll('\\', '/')

Deno.test('subfount_upgrade force-resets unrelated local history to origin', async () => {
	const result = await bash_exec(`
		set -euo pipefail
		temporaryDirectory=$(mktemp -d)
		cleanup() { rm -rf "$temporaryDirectory"; }
		trap cleanup EXIT

		# 隔离 global config，避免污染开发机的 safe.directory。
		export GIT_CONFIG_GLOBAL="$temporaryDirectory/gitconfig"
		export HOME="$temporaryDirectory"

		git init --bare -b master "$temporaryDirectory/remote.git" >/dev/null
		git clone "$temporaryDirectory/remote.git" "$temporaryDirectory/seed" >/dev/null 2>&1
		cd "$temporaryDirectory/seed"
		git config user.email t@t
		git config user.name t
		echo upstream > f.txt
		git add f.txt && git commit -m upstream >/dev/null
		git push origin master >/dev/null
		upstream_tip=$(git rev-parse master)

		mkdir -p "$temporaryDirectory/app"
		cd "$temporaryDirectory/app"
		git init -b master >/dev/null
		git config user.email t@t
		git config user.name t
		# 独立历史：本地 root 提交与上游无共同祖先（模拟历史重写窗口内安装）。
		echo local > f.txt
		git add f.txt && git commit -m local >/dev/null
		git remote add origin "$temporaryDirectory/remote.git"

		SUBFOUNT_DIR="$temporaryDirectory/app"
		install_package() { :; }
		get_i18n() { printf '%s' "$1"; shift; while [ $# -gt 0 ]; do printf ' %s=%s' "$1" "$2"; shift 2; done; printf '\\n'; }
		print_i18n_green() { get_i18n "$@"; }
		print_i18n_yellow() { get_i18n "$@" >&2; }
		. ${JSON.stringify(gitShPath)}
		. ${JSON.stringify(updateShPath)}

		upgrade_output=$(subfount_upgrade 2>&1)

		[ "$(git rev-parse HEAD)" = "$upstream_tip" ] || { echo "HEAD not reset: $(git rev-parse HEAD) != $upstream_tip" >&2; exit 1; }
		[ "$(cat f.txt)" = upstream ] || { echo "working tree not synced" >&2; exit 1; }
		printf '%s\\n' "$upgrade_output" | grep -q 'git.unrelatedHistories' || { echo "missing unrelatedHistories notice:" >&2; printf '%s\\n' "$upgrade_output" >&2; exit 1; }
		if printf '%s\\n' "$upgrade_output" | grep -q 'git.fetchFailedSkippingUpdate'; then
			echo "misreported as fetch failure:" >&2
			printf '%s\\n' "$upgrade_output" >&2
			exit 1
		fi
		echo ok
	`)
	assert.equal(result.code, 0, result.stderr || result.stdout)
	assert.equal(result.stdout.trim(), 'ok')
})

Deno.test('PowerShell update, desktop attributes, marker and argument round trip', async () => {
	const temporaryDirectory = await Deno.makeTempDir({ prefix: 'subfount-path-' })
	const root = fileURLToPath(new URL('../', import.meta.url)).replaceAll('\\', '/')
	const quote = value => "'" + value.replaceAll("'", "''") + "'"
	const script = `
$ErrorActionPreference = 'Stop'
$temporaryDirectory = ${quote(temporaryDirectory)}
$env:GIT_CONFIG_GLOBAL = Join-Path $temporaryDirectory 'gitconfig'
$env:TEMP = $temporaryDirectory
$SUBFOUNT_DIR = Join-Path $temporaryDirectory 'app with spaces'
New-Item $SUBFOUNT_DIR -ItemType Directory | Out-Null
function Get-I18n($key, $params) { $key }
function RefreshPath {}
. ${quote(root + 'path/src/git.ps1')}
git init --bare -b master "$temporaryDirectory/remote.git" | Out-Null
git init -b master $SUBFOUNT_DIR | Out-Null
invoke_repo_git config user.email t@t
invoke_repo_git config user.name t
[IO.File]::WriteAllText("$SUBFOUNT_DIR/file.txt", 'upstream')
invoke_repo_git add file.txt
invoke_repo_git commit -m upstream | Out-Null
invoke_repo_git remote add origin "$temporaryDirectory/remote.git"
invoke_repo_git push origin master
$upstream = invoke_repo_git rev-parse HEAD
invoke_repo_git checkout --orphan independent
invoke_repo_git rm -rf . | Out-Null
[IO.File]::WriteAllText("$SUBFOUNT_DIR/local.txt", 'local')
invoke_repo_git add local.txt
invoke_repo_git commit -m local | Out-Null
invoke_repo_git branch -M master
[IO.File]::WriteAllText("$SUBFOUNT_DIR/local.txt", 'dirty')
$output = subfount_upgrade 6>&1 | Out-String
if ($LastExitCode -ne 0 -or (invoke_repo_git rev-parse HEAD) -ne $upstream) { throw 'update failed' }
if ($output -notmatch 'git.unrelatedHistories') { throw 'missing notice' }
if ((Get-Content "$temporaryDirectory/subfount-local-changes-diff_*.diff" -Raw | Out-String) -notmatch '[+]dirty') { throw 'dirty changes lost' }
foreach ($name in @('data', 'node_modules', 'path')) { New-Item "$SUBFOUNT_DIR/$name" -ItemType Directory | Out-Null }
Set-Content "$SUBFOUNT_DIR/.gitignore" 'ignored'
[IO.File]::WriteAllText("$SUBFOUNT_DIR/desktop.ini", '[.ShellClassInfo]')
. ${quote(root + 'path/src/win/file_attrs.ps1')}
Initialize-SubfountDesktopIni
if ($IsWindows) {
	$flags = [IO.FileAttributes]::Hidden -bor [IO.FileAttributes]::System
	foreach ($name in @('', 'data/', 'node_modules/', '.git/')) {
		$ini = Get-Item -Force "$SUBFOUNT_DIR/$($name)desktop.ini"
		if (($ini.Attributes -band $flags) -ne $flags) { throw "ini attributes missing: $name" }
	}
	if (((Get-Item -Force "$SUBFOUNT_DIR/.gitignore").Attributes -band [IO.FileAttributes]::Hidden) -ne [IO.FileAttributes]::Hidden) { throw 'dotfile not hidden' }
}
. ${quote(root + 'path/src/deno.ps1')}
mark_deno_upgraded
if ([IO.File]::ReadAllText("$SUBFOUNT_DIR/data/installer/deno_upgraded") -ne '1') { throw 'marker missing' }
. ${quote(root + 'path/src/cmd/background.ps1')}
$argumentList = Get-SubfPs1ArgumentList 'two words' '' 'a"b' 'trailing slash\\'
[IO.File]::WriteAllText("$SUBFOUNT_DIR/path/subfount.ps1", '[IO.File]::WriteAllText("$PSScriptRoot/args.json", (ConvertTo-Json -InputObject @($args) -Compress))')
$child = Start-Process -FilePath (Get-Process -Id $PID).Path -ArgumentList $argumentList -Wait -PassThru
if ($child.ExitCode -ne 0) { throw 'argument child failed' }
$actual = Get-Content "$SUBFOUNT_DIR/path/args.json" -Raw | ConvertFrom-Json
if ($actual.Count -ne 4 -or $actual[0] -ne 'two words' -or $actual[1] -ne '' -or $actual[2] -ne 'a"b' -or $actual[3] -ne 'trailing slash\\') { throw 'argument mismatch' }
`
	try {
		// UTF-16LE 是 pwsh -EncodedCommand 唯一接受的编码（脚本里有中文注释，不能按 UTF-8 送）。
		const encoded = btoa(String.fromCharCode(...new Uint8Array(new Uint16Array(Array.from(script, c => c.charCodeAt(0))).buffer)))
		const result = await new Deno.Command('pwsh', { args: ['-NoProfile', '-EncodedCommand', encoded], stdout: 'piped', stderr: 'piped' }).output()
		assert.equal(result.code, 0, new TextDecoder().decode(result.stderr) + new TextDecoder().decode(result.stdout))
	} finally {
		await Deno.remove(temporaryDirectory, { recursive: true })
	}
})
