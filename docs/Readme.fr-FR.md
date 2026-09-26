# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** est un client léger qui connecte votre appareil au réseau [fount](https://github.com/steve02081504/fount).
Il exécute l'infrastructure de recouvrement (`infra`) de fount sur votre machine et, une fois connecté à un hôte, agit comme un nœud auxiliaire qui permet aux agents intelligents de l'hôte d'exécuter du code ou des commandes shell sur votre appareil.

## Installation & Suppression : Une Rencontre et un Adieu Élégants

<a id="installation"></a>

### Installation : Intégrer subfount à votre monde – _Sans Effort_

Embarquez pour votre voyage avec subfount, une plateforme stable et fiable. Quelques clics ou commandes simples, et le monde de subfount se dévoile.

> [!CAUTION]
>
> Dans le monde de subfount, l'hôte auquel vous vous connectez peut exécuter du code arbitraire et des commandes shell sur votre appareil, ce qui lui confère de puissantes capacités. Connectez-vous donc uniquement à des hôtes de confiance, avec la même prudence que dans la vraie vie, pour protéger vos fichiers locaux.

### Linux/macOS/Android : Les Murmures du Shell – _Une Ligne, et Vous êtes Dedans_

```bash
# Si nécessaire, définissez la variable d'environnement $SUBFOUNT_DIR pour spécifier le répertoire subfount
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash
. "$HOME/.profile"
```

Si vous souhaitez faire une pause (une simulation) :

```bash
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash -s init
. "$HOME/.profile"
```

### Windows : Un Choix de Chemins – _La Simplicité Même_

- **Direct et Simple (Recommandé) :** Téléchargez le fichier `.exe` depuis les [Releases](https://github.com/steve02081504/subfount/releases) et exécutez-le.

- **La Puissance de PowerShell :**

  ```powershell
  # Si nécessaire, définissez la variable d'environnement $env:SUBFOUNT_DIR pour spécifier le répertoire subfount
  irm https://steve02081504.github.io/subfount/install.ps1 | iex
  ```

  Pour une simulation :

  ```powershell
  $scriptContent = Invoke-RestMethod https://steve02081504.github.io/subfount/install.ps1
  Invoke-Expression "function subfountInstaller { $scriptContent }"
  subfountInstaller init
  ```

### Installation Git : Pour Ceux qui Préfèrent une Touche de Magie

Si Git est déjà installé, adopter subfount est aussi simple que d'exécuter un script.

- **Pour Windows :** Ouvrez votre invite de commandes ou PowerShell et double-cliquez simplement sur `run.bat`.
- **Pour Linux/macOS/Android :** Ouvrez votre terminal et exécutez `./run.sh`.

### Suppression : Un Adieu Gracieux

```bash
subfount remove
```

## Fonctionnalités

- **Participation à l'infra** — rejoint le réseau de recouvrement fount et participe au relais de paquets et aux boîtes aux lettres, contribuant ainsi à la santé du réseau.
- **Nœud de travail hôte** — après connexion à un hôte, devient un nœud auxiliaire : l'hôte peut lui envoyer des requêtes `run_code` (exécuter un script arbitraire) et `shell_exec` (exécuter des commandes shell).
- **Assistance prioritaire de l'hôte** — récupère la table de réputation de l'hôte, fait confiance à ses nœuds et donne à l'hôte la priorité pour le support infra.
- **Autonome ou assisté** — sans hôte configuré, fonctionne en infra autonome ; avec un hôte, il exécute l'infra et assiste l'hôte.
- **Configuration à chaud** — modifier `data/config.json` en cours d'exécution prend effet sans redémarrage (le démon surveille le fichier).
- **Panneau TUI** — un panneau de configuration interactif intégré pour modifier les paramètres de connexion, activer/désactiver l'infra et démarrer/arrêter le démon.

## Prérequis

- [Deno](https://deno.com) (installé automatiquement par le runner s'il manque)
- Node.js/bun (repli optionnel)
- PowerShell (Windows) ou bash (Linux/macOS) pour les scripts runner

## Démarrage rapide

Clonez ou téléchargez ce dépôt, puis exécutez le runner à la racine du dépôt :

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

Sans arguments, cela ouvre le panneau de configuration et démarre le démon en arrière-plan.

## Utilisation

Les principaux points d'entrée sont les scripts runner (`run`, `run.bat`, `run.cmd`, `run.sh`) et le lanceur de commandes dans `path/` (`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`).

### Panneau de configuration

```sh
subfount open        # ou : run.sh (sans argument)
```

Le panneau vous permet de :

- Définir l'**ID de salle de l'hôte** et le **mot de passe** (laisser vide pour le mode infra seul)
- Définir éventuellement le **nodeHash** de l'hôte (via l'API du code de connexion)
- Activer/désactiver la **participation infra**
- Consulter l'état du démon (PID, nodeHash, mode, hôte connecté)
- **Démarrer** / **arrêter** le démon

### Exécuter le démon directement

```sh
subfount                                    # infra seule (depuis data/config.json)
subfount <host-room-id> <password> [node-hash]
    # infra + nœud de travail hôte / assistance prioritaire (ponctuel, non persistant)
```

### Autres commandes

| Commande | Description |
| --- | --- |
| `subfount open` / `subfount panel` | Ouvrir le panneau de configuration |
| `subfount server` | Exécuter le démon au premier plan |
| `subfount background keepalive` | Exécuter le démon en arrière-plan avec redémarrage automatique |
| `subfount keepalive` | Exécuter le démon avec redémarrage / réinitialisation automatique |
| `subfount shutdown` | Arrêter le démon proprement |
| `subfount reboot` | Redémarrer le démon |
| `subfount version` | Afficher la version et les informations git |
| `subfount update` | Mettre à jour subfount et Deno |
| `subfount clean` | Nettoyer les caches Deno |
| `subfount remove` | Désinstaller subfount |
| `subfount debug` | Exécuter avec les journaux de débogage |

## Configuration

Le démon lit `data/config.json`. Le panneau le modifie pour vous, et vous pouvez aussi le modifier manuellement pendant que le démon tourne (il est appliqué à la prochaine tentative de connexion).

```json
{
	"hostRoomId": null,
	"password": null,
	"hostNodeHash": null,
	"infra": true
}
```

## Fichiers d'état

- `data/daemon.pid` — le PID du démon
- `data/status.json` — état en direct écrit par le démon (pour la vue en lecture seule du panneau)
- `data/daemon.log` / `data/daemon.err.log` — journaux de sortie du démon

## Développement

```sh
deno task start     # exécuter le démon
deno task panel     # ouvrir le panneau
deno task test      # exécuter les tests
deno task lint      # lint
deno task check     # vérification de types
```
