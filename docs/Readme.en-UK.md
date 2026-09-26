# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** is a lightweight client that plugs your device into the [fount](https://github.com/steve02081504/fount) network.
It runs the fount overlay infrastructure (`infra`) on your machine and, once connected to a host, acts as a helper node that lets the host's clever agents run code or shell commands on your device.

## Installation & Removal: An Elegant Encounter and Farewell

<a id="installation"></a>

### Installation: Weaving subfount Into Your World – _Effortlessly_

Embark on your journey with subfount, a stable and reliable platform. A few simple clicks or commands, and the world of subfount unfolds.

> [!CAUTION]
>
> In the world of subfount, the host you connect to can run arbitrary code and shell commands on your device, granting it powerful capabilities. Therefore, please only connect to hosts you trust, with the same care you would in real life, to ensure the safety of your local files.

### Linux/macOS/Android: The Whispers of the Shell – _One Line, and You're In_

```bash
# If needed, define the environment variable $SUBFOUNT_DIR to specify the subfount directory
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash
. "$HOME/.profile"
```

Should you wish to pause, to gather your thoughts before the grand adventure (a dry run):

```bash
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash -s init
. "$HOME/.profile"
```

### Windows: All Roads Lead to Rome – _Simplicity Itself_

- **Direct and Uncomplicated (Recommended):** Download the `exe` file from [Releases](https://github.com/steve02081504/subfount/releases) and run it.

- **The Power of PowerShell:**

  ```powershell
  # If needed, define the environment variable $env:SUBFOUNT_DIR to specify the subfount directory
  irm https://steve02081504.github.io/subfount/install.ps1 | iex
  ```

  For a dry run:

  ```powershell
  $scriptContent = Invoke-RestMethod https://steve02081504.github.io/subfount/install.ps1
  Invoke-Expression "function subfountInstaller { $scriptContent }"
  subfountInstaller init
  ```

### Git Installation: For those who prefer a touch of magic

If you already have Git installed, embracing subfount is as simple as running a script.

- **For Windows:** Open your command prompt or PowerShell and simply double-click `run.bat`.
- **For Linux/macOS/Android:** Open your terminal and execute `./run.sh`.

### Removal: A Graceful Farewell

```bash
subfount remove
```

## Features

- **Infra participation** — joins the fount overlay network and participates in packet forwarding and mailboxes, helping keep the network healthy.
- **Host worker** — after connecting to a host, it becomes a helper node: the host can send it `run_code` (execute arbitrary script) and `shell_exec` (run shell commands) requests.
- **Host priority assist** — pulls the reputation table from the host, trusts its nodes, and gives the host priority for infra support.
- **Standalone or assisted** — without a host configured it runs as standalone infra; with a host it both runs infra and assists the host.
- **Hot configuration** — editing `data/config.json` while running takes effect without restarting (the daemon watches the file).
- **TUI panel** — a built-in interactive configuration panel to edit connection settings, toggle infra, and start/stop the daemon.

## Requirements

- [Deno](https://deno.com) (auto-installed by the runner if missing)
- Node.js/bun (optional fallback)
- PowerShell (Windows) or bash (Linux/macOS) for the runner scripts

## Quick Start

Clone or download this repository, then run the runner in the repo root:

```sh
# On Linux/macOS
./run.sh

# On Windows (PowerShell)
.\run.bat
```

Running with no arguments opens the configuration panel and starts the daemon in the background.

## Usage

The main entry points are the runner scripts (`run`, `run.bat`, `run.cmd`, `run.sh`) and the command launcher in `path/` (`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`).

### Configuration panel

```sh
subfount open        # or: run.sh (no arguments)
```

The panel lets you:

- Set the **host room ID** and **password** (leave empty for infra-only mode)
- Optionally set the host **nodeHash** (from the connection-code API)
- Toggle **infra participation**
- View the daemon status (PID, nodeHash, mode, connected host)
- **Start** / **Stop** the daemon

### Run the daemon directly

```sh
subfount                                    # infra only (from data/config.json)
subfount <host-room-id> <password> [node-hash]
    # infra + host worker / priority assist (one-off, does not persist)
```

### Other commands

| Command | Description |
| --- | --- |
| `subfount open` / `subfount panel` | Open the configuration panel |
| `subfount server` | Run the daemon in the foreground |
| `subfount background keepalive` | Run the daemon in the background with auto-restart |
| `subfount keepalive` | Run the daemon with auto-restart / auto re-init |
| `subfount shutdown` | Stop the daemon gracefully |
| `subfount reboot` | Restart the daemon |
| `subfount version` | Show version and git info |
| `subfount update` | Update subfount and Deno |
| `subfount clean` | Clean Deno caches |
| `subfount remove` | Uninstall subfount |
| `subfount debug` | Run with debug logging |

## Configuration

The daemon reads `data/config.json`. The panel edits it for you, and you can also edit it manually while the daemon is running (it is applied on the next connection attempt).

```json
{
	"hostRoomId": null,
	"password": null,
	"hostNodeHash": null,
	"infra": true
}
```

## Status files

- `data/daemon.pid` — the daemon PID
- `data/status.json` — live status written by the daemon (for the panel's read-only view)
- `data/daemon.log` / `data/daemon.err.log` — daemon output logs

## Development

```sh
deno task start     # run the daemon
deno task panel     # open the panel
deno task test      # run tests
deno task lint      # lint
deno task check     # typecheck
```
