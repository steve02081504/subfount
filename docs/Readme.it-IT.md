# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** è un client leggero che collega il tuo dispositivo alla rete di [fount](https://github.com/steve02081504/fount).
Esegue l'infrastruttura di overlay (`infra`) di fount sulla tua macchina e, una volta connesso a un host, agisce come nodo ausiliario che consente agli agenti intelligenti dell'host di eseguire codice o comandi shell sul tuo dispositivo.

## Installazione e Disinstallazione: Un Incontro e un Addio Eleganti

<a id="installation"></a>

### Installazione: Intrecciare subfount nel Tuo Mondo – _Senza Sforzo_

Inizia il tuo viaggio con subfount, una piattaforma stabile e affidabile. Pochi semplici clic o comandi, e il mondo di subfount si schiuderà davanti a te.

> [!CAUTION]
>
> Nel mondo di subfount, l'host a cui ti connetti può eseguire codice arbitrario e comandi shell sul tuo dispositivo, concedendogli capacità potenti. Pertanto, connettiti solo a host di cui ti fidi, con la stessa attenzione che avresti nella vita reale, per garantire la sicurezza dei tuoi file locali.

### Linux/macOS/Android: Il Sussurro della Shell – _Una Riga, e Sei Dentro_

```bash
# Se necessario, definisci la variabile d'ambiente $SUBF_DIR per specificare la directory di subfount
# BEGIN SUBF_PKG_MGR
SUBF_PKG_STATE_DIR="${SUBF_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/subfount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$SUBF_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$SUBF_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${SUBF_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; SUBF_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$SUBF_PKG_LOCK_DIR" ] || return 0; rm -rf "$SUBF_PKG_LOCK_DIR"; SUBF_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$SUBF_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${SUBF_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$SUBF_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$SUBF_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$SUBF_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$SUBF_AUTO_INSTALLED_PACKAGES" ]; then SUBF_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else SUBF_AUTO_INSTALLED_PACKAGES="$SUBF_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export SUBF_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END SUBF_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export SUBF_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash
. "$HOME/.profile"
```

Se desideri una pausa (una prova a secco):

```bash
# BEGIN SUBF_PKG_MGR
SUBF_PKG_STATE_DIR="${SUBF_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/subfount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$SUBF_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$SUBF_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${SUBF_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; SUBF_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$SUBF_PKG_LOCK_DIR" ] || return 0; rm -rf "$SUBF_PKG_LOCK_DIR"; SUBF_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$SUBF_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${SUBF_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$SUBF_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$SUBF_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$SUBF_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$SUBF_AUTO_INSTALLED_PACKAGES" ]; then SUBF_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else SUBF_AUTO_INSTALLED_PACKAGES="$SUBF_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export SUBF_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END SUBF_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export SUBF_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash -s init
. "$HOME/.profile"
```

### Windows: Una Scelta di Percorsi – _La Semplicità Stessa_

- **Diretto e Semplice (Raccomandato):** Scarica il file `.exe` dalle [Releases](https://github.com/steve02081504/subfount/releases) ed eseguilo.

- **La potenza di PowerShell:**

  ```powershell
  # Se necessario, definisci la variabile d'ambiente $env:SUBF_DIR per specificare la directory di subfount
  irm https://steve02081504.github.io/subfount/install.ps1 | iex
  ```

  Per una prova a secco:

  ```powershell
  $scriptContent = Invoke-RestMethod https://steve02081504.github.io/subfount/install.ps1
  Invoke-Expression "function subfountInstaller { $scriptContent }"
  subfountInstaller init
  ```

### Installazione Git: Per Coloro che Preferiscono un Tocco di Magia

Se hai già installato Git, abbracciare subfount è semplice come eseguire uno script.

- **Per Windows:** Apri il prompt dei comandi o PowerShell e fai semplicemente doppio clic su `run.bat`.
- **Per Linux/macOS/Android:** Apri il terminale ed esegui `./run.sh`.

### Disinstallazione: Un Addio Elegante

```bash
subfount remove
```

## Caratteristiche

- **Partecipazione all'infra** — si unisce alla rete di overlay di fount e partecipa all'inoltro dei pacchetti e alle caselle di posta, contribuendo a mantenere la rete in salute.
- **Nodo di lavoro dell'host** — dopo essersi connesso a un host, diventa un nodo ausiliario: l'host può inviargli richieste `run_code` (eseguire uno script arbitrario) e `shell_exec` (eseguire comandi shell).
- **Assistenza prioritaria all'host** — recupera la tabella di reputazione dall'host, si fida dei suoi nodi e dà all'host la priorità nel supporto all'infra.
- **Autonomo o assistito** — senza host configurato funziona come infra autonoma; con un host esegue l'infra e assiste l'host.
- **Configurazione a caldo** — modificare `data/config.json` durante l'esecuzione ha effetto senza riavvio (il daemon osserva il file).
- **Pannello TUI** — un pannello di configurazione interattivo integrato per modificare le impostazioni di connessione, attivare/disattivare l'infra e avviare/fermare il daemon.

## Requisiti

- [Deno](https://deno.com) (installato automaticamente dal runner se manca)
- Node.js/bun (fallback opzionale)
- PowerShell (Windows) o bash (Linux/macOS) per gli script del runner

## Avvio rapido

Clona o scarica questo repository, quindi esegui il runner nella radice del repository:

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

Eseguirlo senza argomenti apre il pannello di configurazione e avvia il daemon in background.

## Utilizzo

I principali punti di ingresso sono gli script del runner (`run`, `run.bat`, `run.cmd`, `run.sh`) e il lanciatore di comandi in `path/` (`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`).

### Pannello di configurazione

```sh
subfount open        # o: run.sh (senza argomenti)
```

Il pannello consente di:

- Impostare l'**ID della stanza dell'host** e la **password** (lasciare vuoto per la modalità solo infra)
- Impostare facoltativamente il **nodeHash** dell'host (dall'API del codice di connessione)
- Attivare/disattivare la **partecipazione all'infra**
- Visualizzare lo stato del daemon (PID, nodeHash, modalità, host connesso)
- **Avviare** / **fermare** il daemon

### Eseguire il daemon direttamente

```sh
subfount                                    # solo infra (da data/config.json)
subfount <host-room-id> <password> [node-hash]
    # infra + nodo di lavoro dell'host / assistenza prioritaria (una tantum, non persistente)
```

### Altri comandi

| Comando | Descrizione |
| --- | --- |
| `subfount open` / `subfount panel` | Aprire il pannello di configurazione |
| `subfount server` | Eseguire il daemon in primo piano |
| `subfount background keepalive` | Eseguire il daemon in background con riavvio automatico |
| `subfount keepalive` | Eseguire il daemon con riavvio / re-inizializzazione automatica |
| `subfount shutdown` | Fermare il daemon correttamente |
| `subfount reboot` | Riavviare il daemon |
| `subfount version` | Mostrare versione e informazioni git |
| `subfount update` | Aggiornare subfount e Deno |
| `subfount clean` | Pulire le cache di Deno |
| `subfount remove` | Disinstallare subfount |
| `subfount debug` | Eseguire con registrazione di debug |

## Configurazione

Il daemon legge `data/config.json`. Il pannello lo modifica per te e puoi anche modificarlo manualmente mentre il daemon è in esecuzione (viene applicato al prossimo tentativo di connessione).

```json
{
	"hostRoomId": null,
	"password": null,
	"hostNodeHash": null,
	"infra": true
}
```

## File di stato

- `data/daemon.pid` — il PID del daemon
- `data/status.json` — stato in tempo reale scritto dal daemon (per la vista di sola lettura del pannello)
- `data/daemon.log` / `data/daemon.err.log` — log di output del daemon

## Sviluppo

```sh
deno task start     # eseguire il daemon
deno task panel     # aprire il pannello
deno task test      # eseguire i test
deno task lint      # lint
deno task check     # verifica dei tipi
```
