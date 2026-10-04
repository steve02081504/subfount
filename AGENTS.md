# subfount Architecture & AI Agent Guide

> **For agents:** the checks in `test/` are the gate, not advice — run `deno task test` before claiming a change is done. A red suite means a rule below was broken, not that the check is noisy.

## What this repository is

- **subfount** is a lightweight Deno client that plugs a device into the [fount](https://github.com/steve02081504/fount) network: it runs the fount overlay infra locally and, once a host is configured, becomes a helper node whose host may run code and shell commands on this device.
- Two modes: **infra only** (no host configured) and **host worker** (one session per configured host, kept in `config.json`'s `hosts` array; infra keeps running either way).
- Security stance: arbitrary code execution by the connected host is the product, not a bug — that is why the user-facing readme tells people to connect only to hosts they trust. Never add a path that lets a peer other than the authenticated host reach `run_code` / `shell_exec`.

## Layout

| Path | What it is |
| --- | --- |
| `src/index.mjs` | Kernel / daemon. Boots the p2p node (`data/p2p`), claims the loopback single-instance endpoint, reconciles one session per configured host, pushes `data/status.json` every 5 s, and shuts down gracefully when `data/stop.request` appears. |
| `src/config.mjs` | The only writer of `data/`: `config.json` (tab-indented JSON), `status.json` (atomic `.tmp` + rename), `daemon.pid`. A missing or corrupt file falls back to `DEFAULT_CONFIG` instead of throwing. |
| `src/host.mjs` | Per-host assist policy: device info and reputation pull every 15 min; `createHostPool` shares one infra across sessions so one host cannot take another host's infra down. |
| `src/handlers.mjs` | The `run_code` (async-eval) and `shell_exec` (exec) handlers. Both ignore any peer that is not the authenticated host. |
| `src/callback_sessions.mjs` | Generic long-lived callback producers: `callback_session` open/renew/cancel, ready/event/heartbeat/end frames, bounded ordered events, 30 s leases, cooperative abort and immediate resource disposal on disconnect. Initialization receives `callbackSession` with emit/onDispose/signal/close and must return without awaiting its long-running loop. |
| `src/device.mjs` | Stable device id (hash of host facts) plus soft-failing device-info collectors. |
| `src/local_service.mjs` | Loopback single-instance guard and CLI forwarding on `127.0.0.1:${SUBFOUNT_LOCAL_PORT:-8932}`. A second launch forwards its arguments to the running instance and exits 0. |
| `src/verification.mjs` | Bounded node-reachability proof (claim / receipt), bridged into fount-p2p until upstream publishes the entry point. |
| `src/process.mjs` | Pid liveness and process-tree kill. |
| `src/panel.mjs` | Standalone inquirer TUI that only edits config / pid / status and starts or stops the daemon through `path/subfount`. It never starts p2p itself. |
| `src/i18n.mjs`, `src/locales/` | Locale list in `src/locales/list.csv`, one `<code>.json` per locale with `panel` and `cli` trees; dot-path lookup with `${name}` substitution, and a missing key returns the key itself. |
| `src/runner/main.{ps1,sh}` | Installer and self-update source; the Pages workflow serves them as `install.ps1` / `install.sh`. The PowerShell one is compiled with ps12exe (`subfount geneexe`), so its `#_pragma` and `#_if PSEXE` comments are load-bearing. |
| `path/` | The CLI. `path/subfount` (POSIX) and `path/subfount.bat` / `path/subfount.ps1` (Windows) dispatch to `path/src/cmd/<name>.{sh,ps1}` with a `cmd/default` fallback; helper modules are `path/src/<module>.{sh,ps1}` twins. |
| `test/`, `tools/` | `deno test` suites and repo tooling. |
| `run`, `run.sh` | Identical thin shims that call `path/subfount` (default `background keepalive`). `run.bat` and `run.cmd` are identical polyglot sh+batch shims for Windows. |
| `.github/pages/` | The deployed site: `install.sh` / `install.ps1` are copied from `src/runner/main.{sh,ps1}` on push to `master`, and `readme/index.html` redirects to the localized readme for the browser language. |
| `data/` | Git-ignored runtime state: `config.json`, `status.json`, `daemon.pid`, `stop.request`, `p2p/`, `daemon.log`, `installer/`. |

## Running and testing

- `deno task test` — the full suite (`deno test --allow-all --allow-scripts`).
- `deno task lint` / `deno task check` — lint, and type-check the modules listed in `deno.json` (`src/scripts/**` is not in that list; type-check new files explicitly with `deno check <file>`).
- `deno task start` (or `deno task infra`) — run the kernel; `deno task panel` — run the config TUI.
- `deno run --allow-all tools/scan_jsdoc_no_english.mjs [under]` — list every JSDoc the `jsdoc_no_english` check would reject.
- `deno run --allow-all tools/sync-pkg-mgr.mjs` — re-sync the shell package-manager block (see Landmines).
- Users install through `install.sh` / `install.ps1` (see `README.md`), or from a checkout through `run.bat` / `run.sh`.

## Static checks (the standard)

`test/` holds unit tests plus repo-wide assertions; those assertions are the standard, so adding files means keeping them green.

| Checker | Assertion | Enforces |
| --- | --- | --- |
| `src/scripts/checks/text_lf.mjs` | `test/text_lf.test.mjs` | UTF-8 text (fatal decode, no NUL; empty files exempt) uses LF only and ends with exactly one LF; a single-line `.svg` must instead end without LF; no leading LF (a leading BOM is skipped). The suite auto-fixes the worktree before asserting. |
| `src/scripts/checks/jsdoc_no_english.mjs` | `test/jsdoc_no_english.test.mjs` | A JSDoc summary must be Chinese (CJK required): a pure-English summary fails, and an empty `/** */` stub fails unless the block is tag-only. A multi-line block must put `/**` alone on its first line and `*/` alone on its last line. |
| `src/scripts/checks/agents_md_english.mjs` | `test/agents_md_english.test.mjs` | `AGENTS.md` and the `.md` files it links (transitively) must be English (no Han / kana / Hangul); a linked `.md` that is not itself an `AGENTS.md` must live under a `docs/` path segment; `docs/design/`, `docs/review/`, `docs/issues/` and `docs/readme/` are the only places Chinese is allowed. |

- `walk.mjs` is the shared file lister (`git ls-files` plus untracked, gitignore-aware); `repo_root.mjs` exports `REPO_ROOT`.
- Never loosen an assertion to make a change pass — fix the file instead (translate it, move it under `docs/`, or fix its line endings).

## Conventions

- Tabs for indentation, single quotes, no semicolons; ESM `.mjs` only, one concern per module; `node:*` specifiers imported with a local name; heavy or optional dependencies (`async-eval`, `exec`, `node-os-utils`, fount-p2p subpaths) load through dynamic `await import()`.
- Comments and JSDoc summaries are written in Chinese — that is what the JSDoc check enforces. Agent-facing docs are English; user-facing readmes are localized.
- Commit messages are English Conventional Commits (`type(scope): summary`), one self-contained idea per commit.
- The `path/src/` shell/PowerShell twins keep the same basename and the same public function names, because both sides are dot-sourced through `load.{sh,ps1}` and reached through its idempotent `require` loader.

## Landmines

- **Do not hand-edit the `# BEGIN/END FOUNT_PKG_MGR` blocks** in `path/subfount`, `README.md`, or `docs/Readme.*.md`. `tools/sync-pkg-mgr.mjs` owns them: it takes the canonical block from a sibling fount checkout (`../fount/path/fount`) when one is present and otherwise from the copy already embedded in `path/subfount`, minifies it to one line, and rewrites every consumer. `src/runner/main.sh` carries its own bash-only package manager and is deliberately out of that sync.
- `src/runner/main.{ps1,sh}` are what users download as `install.ps1` / `install.sh`, so an edit there ships to every new install and to self-update.
- The package-manager logic intentionally exists in four variants (the POSIX launcher plus the readmes, the bash runner, the PowerShell runner, and `path/src/pkg_common.ps1` + `packages.sh`). No test compares the twins, so editing one side only is the classic failure.
- `run.bat` / `run.cmd` and `path/subfount.bat` / `path/subfount.ps1` are polyglot files: a sh header and a batch or PowerShell tail in one file. Keep each pair byte-identical and never "clean up" the quoting.
- The launchers restart the server while Deno exits with 131 (deno self-update — see `path/src/run.{sh,ps1}`); treat 131 as "restart me", not as a crash.
- Any test that touches `data/` must point `SUBFOUNT_DATA_DIR` (and `SUBFOUNT_INSTANCE_DIR` for the loopback service) at a temp directory, or it writes into the real `data/`.
- `test/text_lf.test.mjs` rewrites violating files as part of the run, so a failed suite can leave the worktree modified — that is the check working, not a stray edit.
- Only `127.0.0.1:8932` is listened on. The `9090` / `9097` requests in `path/src/env.{sh,ps1}` are best-effort outbound PATCHes to a local Clash config for the CN / KP / RU locales.
- `js/` is a leftover scaffold of empty directories (only its git-ignored `.deno/` and `node_modules/` hold files) and `subfount.exe` is a build artifact — neither is source.
