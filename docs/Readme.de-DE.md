# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** ist ein leichtgewichtiger Client, der Ihr Gerät mit dem [fount](https://github.com/steve02081504/fount)-Netzwerk verbindet.
Es führt die fount-Overlay-Infrastruktur (`infra`) auf Ihrer Maschine aus und wird, sobald es mit einem Host verbunden ist, zu einem Hilfsknoten, über den die klugen Agenten des Hosts Code oder Shell-Befehle auf Ihrem Gerät ausführen können.

## Funktionen

- **Infra-Teilnahme** — tritt dem fount-Overlay-Netzwerk bei und nimmt an der Paketweiterleitung und Mailboxen teil, um das Netzwerk gesund zu halten.
- **Host-Worker** — wird nach der Verbindung zu einem Host zu einem Hilfsknoten: Der Host kann `run_code`- (beliebiges Skript ausführen) und `shell_exec`- (Shell-Befehle ausführen) Anfragen senden.
- **Priorisierte Host-Unterstützung** — zieht die Reputations-Tabelle vom Host, vertraut dessen Knoten und gibt dem Host Priorität bei der Infra-Unterstützung.
- **Standalone oder assistiert** — ohne konfigurierten Host läuft es als eigenständige Infra; mit Host läuft es sowohl als Infra als auch als Assistent.
- **Hot-Reload-Konfiguration** — die Bearbeitung von `data/config.json` während des Betriebs wird ohne Neustart wirksam (der Daemon überwacht die Datei).
- **TUI-Panel** — ein integriertes interaktives Konfigurationspanel zum Bearbeiten der Verbindungseinstellungen, Umschalten von Infra und Starten/Stoppen des Daemons.

## Voraussetzungen

- [Deno](https://deno.com) (wird bei Bedarf automatisch vom Runner installiert)
- Node.js/bun (optionaler Fallback)
- PowerShell (Windows) oder bash (Linux/macOS) für die Runner-Skripte

## Schnellstart

Klonen oder laden Sie dieses Repository herunter und führen Sie den Runner im Repository-Stammverzeichnis aus:

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

Das Ausführen ohne Argumente öffnet das Konfigurationspanel und startet den Daemon im Hintergrund.

## Verwendung

Die Haupteinstiegspunkte sind die Runner-Skripte (`run`, `run.bat`, `run.cmd`, `run.sh`) und der Befehlslauncher in `path/` (`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`).

### Konfigurationspanel

```sh
subfount open        # oder: run.sh (ohne Argumente)
```

Das Panel ermöglicht Ihnen:

- Die **Host-Raum-ID** und das **Passwort** festzulegen (leer lassen für den Nur-Infra-Modus)
- Optional den **nodeHash** des Hosts festzulegen (aus der Verbindungscode-API)
- Die **Infra-Teilnahme** umzuschalten
- Den Daemon-Status anzuzeigen (PID, nodeHash, Modus, verbundener Host)
- Den Daemon zu **starten** / **stoppen**

### Daemon direkt ausführen

```sh
subfount                                    # nur Infra (aus data/config.json)
subfount <host-room-id> <password> [node-hash]
    # Infra + Host-Worker / prioritäre Unterstützung (einmalig, nicht dauerhaft)
```

### Weitere Befehle

| Befehl | Beschreibung |
| --- | --- |
| `subfount open` / `subfount panel` | Konfigurationspanel öffnen |
| `subfount server` | Daemon im Vordergrund ausführen |
| `subfount background keepalive` | Daemon im Hintergrund mit Auto-Neustart ausführen |
| `subfount keepalive` | Daemon mit Auto-Neustart / Auto-Reinitialisierung ausführen |
| `subfount shutdown` | Daemon sauber beenden |
| `subfount reboot` | Daemon neu starten |
| `subfount version` | Version und git-Informationen anzeigen |
| `subfount update` | subfount und Deno aktualisieren |
| `subfount clean` | Deno-Caches bereinigen |
| `subfount remove` | subfount deinstallieren |
| `subfount debug` | Mit Debug-Logging ausführen |

## Konfiguration

Der Daemon liest `data/config.json`. Das Panel bearbeitet es für Sie, und Sie können es auch manuell bearbeiten, während der Daemon läuft (es wird beim nächsten Verbindungsversuch angewendet).

```json
{
	"hostRoomId": null,
	"password": null,
	"hostNodeHash": null,
	"infra": true
}
```

## Statusdateien

- `data/daemon.pid` — die PID des Daemons
- `data/status.json` — vom Daemon geschriebener Live-Status (für die schreibgeschützte Ansicht des Panels)
- `data/daemon.log` / `data/daemon.err.log` — Ausgabeprotokolle des Daemons

## Entwicklung

```sh
deno task start     # Daemon ausführen
deno task panel     # Panel öffnen
deno task test      # Tests ausführen
deno task lint      # Lint
deno task check     # Typprüfung
```
