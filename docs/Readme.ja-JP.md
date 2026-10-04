# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** は、お使いのデバイスを [fount](https://github.com/steve02081504/fount) ネットワークに接続する軽量クライアントです。
お使いのマシン上で fount オーバーレイ基盤（`infra`）を実行し、ホストに接続するとヘルパーノードとなり、ホストの賢いエージェントがお使いのデバイス上でコードを実行したり、シェルコマンドを実行したりできるようになります。

## インストールと削除：優雅な出会いと別れ

<a id="installation"></a>

### インストール：subfountをあなたの世界に織り込む – _楽々と_

安定性と信頼性に優れたプラットフォームであるsubfountで旅を始めましょう。数回の簡単なクリックまたはコマンドで、subfountの世界が広がります。

> [!CAUTION]
>
> subfount の世界では、接続先のホストはあなたのデバイス上で任意のコードやシェルコマンドを実行でき、強力な能力を持ちます。そのため、現実の生活で友人を選ぶのと同じように、信頼できるホストにのみ接続し、ローカルファイルの安全を守ってください。

### Linux/macOS/Android：シェルの囁き – _一行で、準備完了_

```bash
# 必要に応じて、subfountディレクトリを指定するために環境変数$SUBFOUNT_DIRを定義します
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash
. "$HOME/.profile"
```

インストールの内容を確認したい場合（ドライラン）：

```bash
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash -s init
. "$HOME/.profile"
```

### Windows：どの道もシンプルに – _至簡_

- **直接的で簡単（推奨）：** [リリース](https://github.com/steve02081504/subfount/releases)から`.exe`ファイルをダウンロードして実行します。

- **PowerShellの力：**

  ```powershell
  # 必要に応じて、subfountディレクトリを指定するために環境変数$env:SUBFOUNT_DIRを定義します
  irm https://steve02081504.github.io/subfount/install.ps1 | iex
  ```

  ドライランの場合：

  ```powershell
  $scriptContent = Invoke-RestMethod https://steve02081504.github.io/subfount/install.ps1
  Invoke-Expression "function subfountInstaller { $scriptContent }"
  subfountInstaller init
  ```

### Gitインストール：魔法のタッチを好む人のために

Gitが既にインストールされていれば、subfountを受け入れるのはスクリプトを実行するのと同じくらい簡単です。

- **Windowsの場合：** コマンドプロンプトまたはPowerShellを開き、`run.bat`をダブルクリックするだけです。
- **Linux/macOS/Androidの場合：** ターミナルを開き、`./run.sh`を実行します。

### 削除：優雅な別れ

```bash
subfount remove
```

## 特徴

- **infra 参加** — fount オーバーレイネットワークに参加し、パケット転送やメールボックスに参加して、ネットワークの健全性を維持します。
- **ホストワーカー** — ホストに接続するとヘルパーノードになります。ホストは `run_code`（任意のスクリプト実行）や `shell_exec`（シェルコマンド実行）のリクエストを送信できます。
- **ホスト優先アシスト** — ホストから評判テーブルを取得し、そのノードを信頼して、infra 支援でホストに優先権を与えます。
- **スタンドアロンまたはアシスト** — ホストが未設定の場合はスタンドアロンの infra として動作し、設定済みの場合は infra を実行しつつホストを支援します。
- **ホットリロード設定** — 実行中に `data/config.json` を編集すると再起動せずに反映されます（デーモンがファイルを監視）。
- **TUI パネル** — 接続設定の編集、infra の切り替え、デーモンの起動・停止ができる対話型設定パネルが組み込まれています。

## 必要環境

- [Deno](https://deno.com)（不足している場合は runner が自動インストール）
- Node.js/bun（任意のフォールバック）
- runner スクリプト用に PowerShell（Windows）または bash（Linux/macOS）

## クイックスタート

このリポジトリをクローンまたはダウンロードし、リポジトリのルートで runner を実行します。

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

引数なしで実行すると、デーモンがバックグラウンドで自動再起動付きで起動します。ホストを設定するには、`subfount open`（または `run.sh` の後に `open` を追加）で設定パネルを開いてください。

## 使い方

主なエントリポイントは runner スクリプト（`run`、`run.bat`、`run.cmd`、`run.sh`）と、`path/` 配下のコマンドランチャー（`subfount`、`subfount.bat`、`subfount.ps1`、`subfount.mjs`）です。

### 設定パネル

```sh
subfount open        # または：run.sh open
```

パネルでできること：

- **ホストのルーム ID** と**パスワード**の設定（空欄の場合は infra のみのモード）
- ホストの **nodeHash** のオプション設定（接続コード API から取得）
- **infra 参加**の切り替え（ホストが未設定のときはリレーするかどうか。接続中のホスト自身のポリシーが優先）
- デーモンの状態確認（PID、nodeHash、モード、接続中のホスト）
- デーモンの**起動** / **停止**

### デーモンを直接実行

```sh
subfount                                    # infra のみ（data/config.json から読み込み）
subfount <host-room-id> <password> [node-hash]
    # infra + ホストワーカー / 優先アシスト（永続ホストを書き込み、他のホストは接続を維持）
```

### その他のコマンド

| コマンド | 説明 |
| --- | --- |
| `subfount open` / `subfount panel` | 設定パネルを開く |
| `subfount server` | デーモンをフォアグラウンドで実行 |
| `subfount background keepalive` | デーモンをバックグラウンドで自動再起動付きで実行 |
| `subfount keepalive` | 自動再起動 / 自動再初期化付きでデーモンを実行 |
| `subfount shutdown` | デーモンをグレースフルに停止 |
| `subfount reboot` | デーモンを再起動 |
| `subfount version` | バージョンと git 情報を表示 |
| `subfount update` | subfount と Deno を更新 |
| `subfount clean` | Deno キャッシュをクリーンアップ |
| `subfount remove` | subfount をアンインストール |
| `subfount debug` | デバッグログ付きで実行 |

## 設定

デーモンは `data/config.json` を読み取ります。パネルが編集してくれますが、デーモン実行中に手動で編集することもできます：デーモンはファイルを監視し、再起動なしで数秒以内に変更を反映します。`hosts` の各項目は独立したホストセッションであり、`infra` は、ホストが未設定のときにデーモンがリレーを続けるかどうかだけを決めます（接続中のホスト自身のポリシーが優先）。

```json
{
	"hosts": [
		{ "hostRoomId": "<host-room-id>", "password": "<password>", "hostNodeHash": "<node-hash>" }
	],
	"infra": true
}
```

## ステータスファイル

- `data/daemon.pid` — デーモンの PID
- `data/status.json` — デーモンが書き込むリアルタイム状態（パネルの読み取り専用表示用）
- `data/daemon.log` / `data/daemon.err.log` — デーモンの出力ログ

## 開発

```sh
deno task start     # デーモンを実行
deno task panel     # パネルを開く
deno task test      # テストを実行
deno task lint      # lint
deno task check     # 型チェック
```
