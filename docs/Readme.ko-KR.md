# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount**는 사용자 기기를 [fount](https://github.com/steve02081504/fount) 네트워크에 연결하는 경량 클라이언트입니다.
사용자 머신에서 fount 오버레이 인프라(`infra`)를 실행하고, 호스트에 연결되면 보조 노드가 되어 호스트의 영리한 에이전트가 사용자 기기에서 코드를 실행하거나 셸 명령을 실행할 수 있게 합니다.

## 설치와 제거: 우아한 만남과 작별

<a id="installation"></a>

### 설치: subfount를 당신의 세계에 엮어 넣기 – _손쉽게_

안정적이고 신뢰할 수 있는 플랫폼, subfount와 함께 여정을 시작하세요. 몇 번의 간단한 클릭이나 명령만으로 subfount의 세계가 펼쳐집니다.

> [!CAUTION]
>
> subfount의 세계에서 연결한 호스트는 사용자의 기기에서 임의의 코드와 셸 명령을 실행할 수 있어 강력한 능력을 갖게 됩니다. 따라서 실제 생활에서 친구를 사귀듯 신뢰하는 호스트에만 연결하여 로컬 파일의 안전을 지키세요.

### Linux/macOS/Android: 셸의 속삭임 – _한 줄이면 충분합니다_

```bash
# 필요한 경우, subfount 디렉토리를 지정하기 위해 환경 변수 $SUBFOUNT_DIR를 정의합니다.
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash
. "$HOME/.profile"
```

만약 잠시 멈추고 싶다면 (드라이 런):

```bash
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash -s init
. "$HOME/.profile"
```

### Windows: 경로의 선택 – _단순함 그 자체_

- **직접적이고 간단하게 (권장):** [릴리스](https://github.com/steve02081504/subfount/releases)에서 `.exe` 파일을 다운로드하여 실행하세요.

- **PowerShell의 힘:**

  ```powershell
  # 필요한 경우, subfount 디렉토리를 지정하기 위해 환경 변수 $env:SUBFOUNT_DIR를 정의합니다.
  irm https://steve02081504.github.io/subfount/install.ps1 | iex
  ```

  드라이 런의 경우:

  ```powershell
  $scriptContent = Invoke-RestMethod https://steve02081504.github.io/subfount/install.ps1
  Invoke-Expression "function subfountInstaller { $scriptContent }"
  subfountInstaller init
  ```

### Git 설치: 약간의 마법을 선호하는 이들을 위해

Git이 이미 설치되어 있다면, subfount를 받아들이는 것은 스크립트를 실행하는 것만큼 간단합니다.

- **Windows의 경우:** 명령 프롬프트나 PowerShell을 열고 `run.bat`를 더블 클릭하세요.
- **Linux/macOS/Android의 경우:** 터미널을 열고 `./run.sh`를 실행하세요.

### 제거: 우아한 작별

```bash
subfount remove
```

## 기능

- **infra 참여** — fount 오버레이 네트워크에 참여하고 패킷 전달 및 메일박스에 참여하여 네트워크를 건강하게 유지합니다.
- **호스트 워커** — 호스트에 연결되면 보조 노드가 됩니다. 호스트는 `run_code`(임의 스크립트 실행) 및 `shell_exec`(셸 명령 실행) 요청을 보낼 수 있습니다.
- **호스트 우선 지원** — 호스트에서 평판 테이블을 가져와 그 노드를 신뢰하고 infra 지원에서 호스트에 우선권을 부여합니다.
- **독립 또는 지원** — 호스트가 구성되지 않으면 독립 infra로 실행되고, 호스트가 있으면 infra를 실행하면서 호스트를 지원합니다.
- **핫 리로드 구성** — 실행 중 `data/config.json`을 편집하면 재시작 없이 적용됩니다(데몬이 파일을 감시).
- **TUI 패널** — 연결 설정 편집, infra 전환, 데몬 시작/중지를 위한 내장 대화형 구성 패널.

## 요구 사항

- [Deno](https://deno.com)(없으면 runner가 자동 설치)
- Node.js/bun(선택적 폴백)
- runner 스크립트용 PowerShell(Windows) 또는 bash(Linux/macOS)

## 빠른 시작

이 저장소를 클론하거나 다운로드한 후 저장소 루트에서 runner를 실행합니다:

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

인수 없이 실행하면 구성 패널이 열리고 데몬이 백그라운드에서 시작됩니다.

## 사용법

주요 진입점은 runner 스크립트(`run`, `run.bat`, `run.cmd`, `run.sh`)와 `path/`의 명령 실행기(`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`)입니다.

### 구성 패널

```sh
subfount open        # 또는: run.sh (인수 없음)
```

패널에서 할 수 있는 작업:

- **호스트 룸 ID** 및 **비밀번호** 설정(infra 전용 모드는 비워 둠)
- 선택적으로 호스트 **nodeHash** 설정(연결 코드 API에서)
- **infra 참여** 전환
- 데몬 상태 보기(PID, nodeHash, 모드, 연결된 호스트)
- 데몬 **시작** / **중지**

### 데몬 직접 실행

```sh
subfount                                    # infra 전용 (data/config.json에서)
subfount <host-room-id> <password> [node-hash]
    # infra + 호스트 워커 / 우선 지원 (일회성, 유지되지 않음)
```

### 기타 명령

| 명령 | 설명 |
| --- | --- |
| `subfount open` / `subfount panel` | 구성 패널 열기 |
| `subfount server` | 포그라운드에서 데몬 실행 |
| `subfount background keepalive` | 백그라운드에서 자동 재시작과 함께 데몬 실행 |
| `subfount keepalive` | 자동 재시작 / 자동 재초기화와 함께 데몬 실행 |
| `subfount shutdown` | 데몬을 정상적으로 중지 |
| `subfount reboot` | 데몬 재시작 |
| `subfount version` | 버전 및 git 정보 표시 |
| `subfount update` | subfount와 Deno 업데이트 |
| `subfount clean` | Deno 캐시 정리 |
| `subfount remove` | subfount 제거 |
| `subfount debug` | 디버그 로깅으로 실행 |

## 구성

데몬은 `data/config.json`을 읽습니다. 패널이 대신 편집하며, 데몬이 실행 중일 때 수동으로 편집할 수도 있습니다(다음 연결 시도 시 적용됨).

```json
{
	"hostRoomId": null,
	"password": null,
	"hostNodeHash": null,
	"infra": true
}
```

## 상태 파일

- `data/daemon.pid` — 데몬 PID
- `data/status.json` — 데몬이 쓰는 실시간 상태(패널의 읽기 전용 보기용)
- `data/daemon.log` / `data/daemon.err.log` — 데몬 출력 로그

## 개발

```sh
deno task start     # 데몬 실행
deno task panel     # 패널 열기
deno task test      # 테스트 실행
deno task lint      # 린트
deno task check     # 타입 검사
```
