# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount**는 사용자 기기를 [fount](https://github.com/steve02081504/fount) 네트워크에 연결하는 경량 클라이언트입니다.
사용자 머신에서 fount 오버레이 인프라(`infra`)를 실행하고, 호스트에 연결되면 보조 노드가 되어 호스트의 영리한 에이전트가 사용자 기기에서 코드를 실행하거나 셸 명령을 실행할 수 있게 합니다.

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
