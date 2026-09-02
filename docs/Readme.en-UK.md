# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** is a lightweight client that plugs your device into the [fount](https://github.com/steve02081504/fount) network.
It runs the fount overlay infrastructure (`infra`) on your machine and, once connected to a host, acts as a helper node that lets the host's clever agents run code or shell commands on your device.

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
