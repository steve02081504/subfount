# subfount

[![fount repo](https://steve02081504.github.io/fount/badges/fount_repo.svg)](https://github.com/steve02081504/fount)

**subfount** es un cliente ligero que conecta tu dispositivo a la red de [fount](https://github.com/steve02081504/fount).
Ejecuta la infraestructura de superposición (`infra`) de fount en tu máquina y, una vez conectado a un host, actúa como un nodo auxiliar que permite a los agentes inteligentes del host ejecutar código o comandos de shell en tu dispositivo.

## Instalación y Eliminación: Un Encuentro y Despedida Elegante

<a id="installation"></a>

### Instalación: Tejiendo subfount en tu Mundo – _Sin Esfuerzo_

Embárcate en tu viaje con subfount, una plataforma estable y confiable. Unos pocos clics o comandos simples, y el mundo de subfount se despliega.

> [!CAUTION]
>
> En el mundo de subfount, el host al que te conectas puede ejecutar código arbitrario y comandos de shell en tu dispositivo, lo que le otorga poderosas capacidades. Por lo tanto, conéctate solo a hosts en los que confíes, con el mismo cuidado que en la vida real, para garantizar la seguridad de tus archivos locales.

### Linux/macOS/Android: Los Susurros del Shell – _Una Línea, y Estás Dentro_

```bash
# Si es necesario, define la variable de entorno $SUBFOUNT_DIR para especificar el directorio de subfount
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash
. "$HOME/.profile"
```

Si deseas hacer una pausa, para reunir tus pensamientos antes de la gran aventura (una prueba en seco):

```bash
# BEGIN FOUNT_PKG_MGR
FOUNT_PKG_STATE_DIR="${FOUNT_PKG_STATE_DIR:-${TMPDIR:-${TEMP:-/tmp}}/fount/package}"; pkg_lock_acquire() { _manager="$1"; _pkg_lock_dir="$FOUNT_PKG_STATE_DIR/$_manager.lock"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; _retry_count=0; while ! mkdir "$_pkg_lock_dir" 2>/dev/null; do if [ -f "$_pkg_lock_dir/pid" ]; then _pid=$(cat "$_pkg_lock_dir/pid" 2>/dev/null); if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then rm -rf "$_pkg_lock_dir"; continue; fi; fi; _retry_count=$((_retry_count + 1)); [ "$_retry_count" -ge $(( ${FOUNT_PKG_LOCK_TIMEOUT:-300} * 10 )) ] && return 1; sleep 0.1 2>/dev/null || sleep 1; done; printf '%s\n' "$$" >"$_pkg_lock_dir/pid"; FOUNT_PKG_LOCK_DIR="$_pkg_lock_dir"; return 0; }; pkg_lock_release() { [ -n "$FOUNT_PKG_LOCK_DIR" ] || return 0; rm -rf "$FOUNT_PKG_LOCK_DIR"; FOUNT_PKG_LOCK_DIR=; }; pkg_with_lock() { _manager="$1"; shift; pkg_lock_acquire "$_manager" || return 1; "$@"; _exit_status=$?; pkg_lock_release; return $_exit_status; }; pkg_db_refresh_needed() { _manager="$1"; _refresh_file="$FOUNT_PKG_STATE_DIR/$_manager.refresh"; [ -f "$_refresh_file" ] || return 0; _now=$(date +%s 2>/dev/null) || return 0; _last=$(cat "$_refresh_file" 2>/dev/null); [ -n "$_last" ] || return 0; [ "$((_now - _last))" -ge "${FOUNT_PKG_REFRESH_INTERVAL:-600}" ]; }; pkg_db_refresh_mark() { _manager="$1"; mkdir -p "$FOUNT_PKG_STATE_DIR" 2>/dev/null || return 1; printf '%s\n' "$(date +%s 2>/dev/null)" >"$FOUNT_PKG_STATE_DIR/$_manager.refresh" 2>/dev/null; }; pkg_refresh() { _manager="$1"; shift; pkg_db_refresh_needed "$_manager" || return 0; pkg_lock_acquire "$_manager" || return 1; if pkg_db_refresh_needed "$_manager"; then if "$@"; then pkg_db_refresh_mark "$_manager"; _exit_status=0; else _exit_status=$?; fi; pkg_lock_release; return $_exit_status; fi; pkg_lock_release; return 0; }; install_package() { _command_name="$1"; _package_list=${2:-$_command_name}; _has_sudo=""; _installed_pkg_name=""; if command -v "$_command_name" >/dev/null 2>&1; then return 0; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then _has_sudo="sudo"; fi; for _package in $_package_list; do if command -v apt-get >/dev/null 2>&1; then pkg_refresh apt-get $_has_sudo apt-get update -y; pkg_with_lock apt-get $_has_sudo apt-get install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pacman >/dev/null 2>&1; then pkg_with_lock pacman $_has_sudo pacman -Syu --needed --noconfirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v dnf >/dev/null 2>&1; then pkg_refresh dnf $_has_sudo dnf makecache; pkg_with_lock dnf $_has_sudo dnf install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v yum >/dev/null 2>&1; then pkg_refresh yum $_has_sudo yum makecache fast; pkg_with_lock yum $_has_sudo yum install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v zypper >/dev/null 2>&1; then pkg_refresh zypper $_has_sudo zypper refresh; pkg_with_lock zypper $_has_sudo zypper install -y --no-confirm "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v apk >/dev/null 2>&1; then if [ "$(id -u)" -eq 0 ]; then pkg_with_lock apk apk add --update "$_package"; else pkg_with_lock apk $_has_sudo apk add --update "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v brew >/dev/null 2>&1; then if ! brew list --formula "$_package" >/dev/null 2>&1; then pkg_with_lock brew brew install "$_package"; fi; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v pkg >/dev/null 2>&1; then pkg_refresh pkg $_has_sudo pkg update -y; pkg_with_lock pkg $_has_sudo pkg install -y "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; if command -v snap >/dev/null 2>&1; then pkg_with_lock snap $_has_sudo snap install "$_package"; if command -v "$_command_name" >/dev/null 2>&1; then _installed_pkg_name="$_package"; break; fi; fi; done; if command -v "$_command_name" >/dev/null 2>&1; then case ";$FOUNT_AUTO_INSTALLED_PACKAGES;" in *";$_installed_pkg_name;"*) ;; *) if [ -z "$FOUNT_AUTO_INSTALLED_PACKAGES" ]; then FOUNT_AUTO_INSTALLED_PACKAGES="$_installed_pkg_name"; else FOUNT_AUTO_INSTALLED_PACKAGES="$FOUNT_AUTO_INSTALLED_PACKAGES;$_installed_pkg_name"; fi; ;; esac; export FOUNT_AUTO_INSTALLED_PACKAGES; return 0; else printf "%b\n" "${C_RED}Error: $_command_name installation failed.${C_RESET}" >&2; return 1; fi; }
# END FOUNT_PKG_MGR
install_package "bash" "bash gnu-bash"; install_package "curl"
export FOUNT_AUTO_INSTALLED_PACKAGES
curl -fsSL https://steve02081504.github.io/subfount/install.sh | bash -s init
. "$HOME/.profile"
```

### Windows: Una Elección de Caminos – _Simplicidad Misma_

- **Directo y sin Complicaciones (Recomendado):** Descarga el archivo `exe` desde [Releases](https://github.com/steve02081504/subfount/releases) y ejecútalo.

- **El Poder de PowerShell:**

  ```powershell
  # Si es necesario, define la variable de entorno $env:SUBFOUNT_DIR para especificar el directorio de subfount
  irm https://steve02081504.github.io/subfount/install.ps1 | iex
  ```

  Para una prueba en seco:

  ```powershell
  $scriptContent = Invoke-RestMethod https://steve02081504.github.io/subfount/install.ps1
  Invoke-Expression "function subfountInstaller { $scriptContent }"
  subfountInstaller init
  ```

### Instalación de Git: Para Aquellos que Prefieren un Toque de Magia

Si ya tienes Git instalado, abrazar subfount es tan simple como ejecutar un script.

- **Para Windows:** Abre tu símbolo del sistema o PowerShell y simplemente haz doble clic en `run.bat`.
- **Para Linux/macOS/Android:** Abre tu terminal y ejecuta `./run.sh`.

### Eliminación: Una Despedida Elegante

```bash
subfount remove
```

## Características

- **Participación en infra** — se une a la red de superposición de fount y participa en el reenvío de paquetes y buzones, ayudando a mantener la red saludable.
- **Nodo de trabajo del host** — tras conectarse a un host, se convierte en un nodo auxiliar: el host puede enviarle peticiones `run_code` (ejecutar un script arbitrario) y `shell_exec` (ejecutar comandos de shell).
- **Asistencia prioritaria al host** — obtiene la tabla de reputación del host, confía en sus nodos y da prioridad al host en el soporte infra.
- **Autónomo o asistido** — sin host configurado funciona como infra autónoma; con un host, ejecuta infra y además asiste al host.
- **Configuración en caliente** — editar `data/config.json` mientras se ejecuta surte efecto sin reiniciar (el daemon vigila el archivo).
- **Panel TUI** — un panel de configuración interactivo integrado para editar los ajustes de conexión, alternar infra y arrancar/parar el daemon.

## Requisitos

- [Deno](https://deno.com) (instalado automáticamente por el runner si falta)
- Node.js/bun (respaldo opcional)
- PowerShell (Windows) o bash (Linux/macOS) para los scripts runner

## Inicio rápido

Clona o descarga este repositorio y ejecuta el runner en la raíz del repositorio:

```sh
# Linux/macOS
./run.sh

# Windows (PowerShell)
.\run.bat
```

Ejecutarlo sin argumentos inicia el daemon en segundo plano con reinicio automático. Abre el panel de configuración con `subfount open` (o añade `open` después de `run.sh`) para configurar hosts.

## Uso

Los puntos de entrada principales son los scripts runner (`run`, `run.bat`, `run.cmd`, `run.sh`) y el lanzador de comandos en `path/` (`subfount`, `subfount.bat`, `subfount.ps1`, `subfount.mjs`).

### Panel de configuración

```sh
subfount open        # o: run.sh open
```

El panel te permite:

- Establecer el **ID de sala del host** y la **contraseña** (déjalo vacío para el modo solo infra)
- Establecer opcionalmente el **nodeHash** del host (desde la API del código de conexión)
- Alternar la **participación en infra** (retransmitir mientras no haya ningún host configurado; la política del propio host conectado tiene prioridad)
- Ver el estado del daemon (PID, nodeHash, modo, host conectado)
- **Arrancar** / **parar** el daemon

### Ejecutar el daemon directamente

```sh
subfount                                    # solo infra (desde data/config.json)
subfount <host-room-id> <password> [node-hash]
    # infra + nodo de trabajo del host / asistencia prioritaria (añade un host persistente; los demás hosts permanecen conectados)
```

### Otros comandos

| Comando | Descripción |
| --- | --- |
| `subfount open` / `subfount panel` | Abrir el panel de configuración |
| `subfount server` | Ejecutar el daemon en primer plano |
| `subfount background keepalive` | Ejecutar el daemon en segundo plano con reinicio automático |
| `subfount keepalive` | Ejecutar el daemon con reinicio / re-inicialización automática |
| `subfount shutdown` | Detener el daemon limpiamente |
| `subfount reboot` | Reiniciar el daemon |
| `subfount version` | Mostrar versión e información de git |
| `subfount update` | Actualizar subfount y Deno |
| `subfount clean` | Limpiar las cachés de Deno |
| `subfount remove` | Desinstalar subfount |
| `subfount debug` | Ejecutar con registros de depuración |

## Configuración

El daemon lee `data/config.json`. El panel lo edita por ti, y también puedes editarlo manualmente mientras el daemon está en marcha: el daemon vigila el archivo y aplica los cambios en segundos, sin reiniciar. Cada entrada de `hosts` es una sesión de host independiente; `infra` solo decide si el daemon sigue retransmitiendo cuando no hay ningún host configurado (la política del propio host conectado tiene prioridad).

```json
{
	"hosts": [
		{ "hostRoomId": "<host-room-id>", "password": "<password>", "hostNodeHash": "<node-hash>" }
	],
	"infra": true
}
```

## Archivos de estado

- `data/daemon.pid` — el PID del daemon
- `data/status.json` — estado en vivo escrito por el daemon (para la vista de solo lectura del panel)
- `data/daemon.log` / `data/daemon.err.log` — registros de salida del daemon

## Desarrollo

```sh
deno task start     # ejecutar el daemon
deno task panel     # abrir el panel
deno task test      # ejecutar las pruebas
deno task lint      # lint
deno task check     # verificación de tipos
```
