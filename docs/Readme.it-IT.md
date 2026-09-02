# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** è un client leggero che collega il tuo dispositivo alla rete di [fount](https://github.com/steve02081504/fount).
Esegue l'infrastruttura di overlay (`infra`) di fount sulla tua macchina e, una volta connesso a un host, agisce come nodo ausiliario che consente agli agenti intelligenti dell'host di eseguire codice o comandi shell sul tuo dispositivo.

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
