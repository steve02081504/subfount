# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** est un client léger qui connecte votre appareil au réseau [fount](https://github.com/steve02081504/fount).
Il exécute l'infrastructure de recouvrement (`infra`) de fount sur votre machine et, une fois connecté à un hôte, agit comme un nœud auxiliaire qui permet aux agents intelligents de l'hôte d'exécuter du code ou des commandes shell sur votre appareil.

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
